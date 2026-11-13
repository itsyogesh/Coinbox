use crate::finance::FinanceState;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::{rngs::OsRng, RngCore};
use reqwest::{Client, Url};
use security_framework::passwords::{
    delete_generic_password, get_generic_password, set_generic_password,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{net::Ipv4Addr, time::Duration};
use tauri::{ipc::Response, AppHandle, State};
use tauri_plugin_shell::ShellExt;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    time::timeout,
};
use zeroize::Zeroizing;

const KEYCHAIN: &str = "com.coinbox.app.gmail";
const KEYCHAIN_NOT_FOUND: i32 = -25300;
const SCOPE: &str = "https://www.googleapis.com/auth/gmail.readonly";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GMAIL: &str = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAX_EMAIL_BYTES: usize = 20 * 1024 * 1024;

#[derive(Deserialize)]
struct Config {
    installed: InstalledClient,
}

#[derive(Deserialize)]
struct InstalledClient {
    client_id: String,
    client_secret: String,
}

#[derive(Deserialize)]
struct Token {
    access_token: String,
    refresh_token: Option<String>,
    scope: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailStatus {
    configured: bool,
    connected: bool,
}

#[derive(Deserialize)]
struct MessageList {
    #[serde(default)]
    messages: Vec<MessageId>,
}

#[derive(Deserialize)]
struct MessageId {
    id: String,
}

#[derive(Deserialize)]
struct Metadata {
    payload: Option<Payload>,
}

#[derive(Deserialize)]
struct Payload {
    #[serde(default)]
    headers: Vec<Header>,
}

#[derive(Deserialize)]
struct Header {
    name: String,
    value: String,
}

#[derive(Serialize)]
pub struct MessageSummary {
    id: String,
    subject: String,
    sender: String,
    date: String,
}

#[derive(Deserialize)]
struct RawMessage {
    raw: String,
}

fn config() -> Result<InstalledClient, String> {
    let path = std::env::var_os("COINBOX_GMAIL_CLIENT_FILE")
        .ok_or("Set COINBOX_GMAIL_CLIENT_FILE to your Google Desktop OAuth client JSON.")?;
    let bytes = Zeroizing::new(
        std::fs::read(path).map_err(|_| "Could not read the Gmail OAuth client file.")?,
    );
    let config: Config = serde_json::from_slice(&bytes)
        .map_err(|_| "Use the downloaded Google Desktop OAuth client JSON.")?;
    if config.installed.client_id.is_empty() || config.installed.client_secret.is_empty() {
        return Err("The Gmail OAuth client file is missing required values.".into());
    }
    Ok(config.installed)
}

fn account(state: &FinanceState, book: &str) -> Result<String, String> {
    state.with_vault(|vault| {
        if !vault.books()?.iter().any(|item| item.id == book) {
            return Err(coinbox_finance::FinanceError::Input(
                "Choose a finance book.".into(),
            ));
        }
        Ok(())
    })?;
    let path = state
        .path()
        .canonicalize()
        .map_err(|_| "Could not resolve the active finance vault.")?;
    Ok(format!(
        "{:x}:{book}",
        Sha256::digest(path.as_os_str().as_encoded_bytes())
    ))
}

fn stored(account: &str) -> Result<Option<Zeroizing<String>>, String> {
    match get_generic_password(KEYCHAIN, account) {
        Ok(bytes) => String::from_utf8(bytes)
            .map(Zeroizing::new)
            .map(Some)
            .map_err(|_| "Reconnect the Gmail account.".into()),
        Err(error) if error.code() == KEYCHAIN_NOT_FOUND => Ok(None),
        Err(_) => Err("Coinbox could not read the macOS Keychain.".into()),
    }
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Could not create the Gmail connection.".into())
}

async fn json_response<T: serde::de::DeserializeOwned>(
    response: reqwest::Response,
    limit: usize,
) -> Result<T, String> {
    let status = response.status();
    if !status.is_success() {
        return Err(format!(
            "Google returned HTTP {}. Check your Google account and reconnect if needed.",
            status.as_u16()
        ));
    }
    let mut response = response;
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Could not read the Gmail response.")?
    {
        if bytes.len().saturating_add(chunk.len()) > limit {
            return Err("The Gmail response exceeds the size limit.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|_| "Google returned an invalid Gmail response.".into())
}

async fn access(http: &Client, account: &str) -> Result<Zeroizing<String>, String> {
    let refresh = stored(account)?.ok_or("Connect Gmail for this book first.")?;
    let cfg = config()?;
    let response = http
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", &refresh),
            ("client_id", &cfg.client_id),
            ("client_secret", &cfg.client_secret),
        ])
        .send()
        .await
        .map_err(|_| "Could not reach the Google token endpoint.")?;
    let token: Token = json_response(response, 64 * 1024).await?;
    Ok(Zeroizing::new(token.access_token))
}

fn random() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

#[tauri::command]
pub async fn gmail_status(
    state: State<'_, FinanceState>,
    book: String,
) -> Result<GmailStatus, String> {
    let account = account(&state, &book)?;
    let configured = config().is_ok();
    Ok(GmailStatus {
        configured,
        connected: configured && stored(&account)?.is_some(),
    })
}

#[tauri::command]
pub async fn gmail_connect(
    app: AppHandle,
    state: State<'_, FinanceState>,
    book: String,
) -> Result<(), String> {
    let keychain_account = account(&state, &book)?;
    let cfg = config()?;
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
        .await
        .map_err(|_| "Could not start the Gmail sign-in callback.")?;
    let port = listener
        .local_addr()
        .map_err(|_| "Could not read the callback port.")?
        .port();
    let redirect = format!("http://127.0.0.1:{port}/");
    let verifier = Zeroizing::new(random());
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let expected_state = random();
    let mut authorization =
        Url::parse("https://accounts.google.com/o/oauth2/v2/auth").expect("constant URL");
    authorization.query_pairs_mut().extend_pairs([
        ("client_id", cfg.client_id.as_str()),
        ("redirect_uri", &redirect),
        ("response_type", "code"),
        ("scope", SCOPE),
        ("access_type", "offline"),
        ("prompt", "consent select_account"),
        ("state", &expected_state),
        ("code_challenge", &challenge),
        ("code_challenge_method", "S256"),
    ]);
    #[allow(deprecated)]
    app.shell()
        .open(authorization.as_str(), None)
        .map_err(|_| "Could not open your browser for Gmail sign-in.")?;
    let code = timeout(
        Duration::from_secs(180),
        callback(listener, &redirect, &expected_state),
    )
    .await
    .map_err(|_| "Gmail sign-in timed out.")??;
    let response = client()?
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", &code),
            ("redirect_uri", &redirect),
            ("client_id", &cfg.client_id),
            ("client_secret", &cfg.client_secret),
            ("code_verifier", &verifier),
        ])
        .send()
        .await
        .map_err(|_| "Could not reach the Google token endpoint.")?;
    let token: Token = json_response(response, 64 * 1024).await?;
    if !token
        .scope
        .as_deref()
        .is_some_and(|scope| scope.split_whitespace().any(|value| value == SCOPE))
    {
        return Err("Google did not grant Gmail read-only access.".into());
    }
    let refresh = Zeroizing::new(
        token
            .refresh_token
            .ok_or("Google did not return a refresh token. Reconnect Gmail.")?,
    );
    account(&state, &book)?;
    set_generic_password(KEYCHAIN, &keychain_account, refresh.as_bytes())
        .map_err(|_| "Coinbox could not save the Gmail connection in macOS Keychain.".into())
}

async fn callback(
    listener: TcpListener,
    redirect: &str,
    expected_state: &str,
) -> Result<Zeroizing<String>, String> {
    let base = Url::parse(redirect).map_err(|_| "Invalid callback URL.")?;
    loop {
        let (mut stream, _) = listener
            .accept()
            .await
            .map_err(|_| "Gmail sign-in callback failed.")?;
        let request = timeout(Duration::from_secs(4), async {
            let mut bytes = Vec::new();
            while bytes.len() < 8192 {
                let byte = stream.read_u8().await.ok()?;
                if byte == b'\n' {
                    return String::from_utf8(bytes).ok();
                }
                bytes.push(byte);
            }
            None
        })
        .await
        .ok()
        .flatten();
        let Some(request) = request else { continue };
        let mut parts = request.split_whitespace();
        let target = parts
            .next()
            .filter(|verb| *verb == "GET")
            .and_then(|_| parts.next());
        let Some(url) = target
            .filter(|path| path.starts_with("/?"))
            .and_then(|path| base.join(path).ok())
        else {
            continue;
        };
        let query = url
            .query_pairs()
            .collect::<std::collections::HashMap<_, _>>();
        if query.get("state").map(|value| value.as_ref()) != Some(expected_state) {
            continue;
        }
        let code = query
            .get("code")
            .filter(|code| !code.is_empty())
            .map(|code| Zeroizing::new(code.to_string()));
        let message = if code.is_some() {
            "Return to Coinbox to finish connecting Gmail."
        } else {
            "Gmail access was not granted. Return to Coinbox."
        };
        let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{message}", message.len());
        let _ = stream.write_all(response.as_bytes()).await;
        return code.ok_or_else(|| "Gmail access was not granted.".into());
    }
}

#[tauri::command]
pub async fn gmail_disconnect(state: State<'_, FinanceState>, book: String) -> Result<(), String> {
    let account = account(&state, &book)?;
    let refresh = stored(&account)?;
    match delete_generic_password(KEYCHAIN, &account) {
        Ok(()) => {}
        Err(error) if error.code() == KEYCHAIN_NOT_FOUND => {}
        Err(_) => {
            return Err("Coinbox could not remove the Gmail connection from Keychain.".into())
        }
    }
    if let Some(refresh) = refresh {
        let result = client()?
            .post("https://oauth2.googleapis.com/revoke")
            .form(&[("token", refresh.as_str())])
            .send()
            .await;
        if !result.is_ok_and(|response| response.status().is_success()) {
            return Err(
                "Coinbox removed the connection locally. Google could not confirm revocation."
                    .into(),
            );
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn gmail_search(
    state: State<'_, FinanceState>,
    book: String,
    label: String,
    sender: String,
) -> Result<Vec<MessageSummary>, String> {
    let keychain_account = account(&state, &book)?;
    let label = label.trim();
    let sender = sender.trim();
    if label.is_empty()
        || label.len() > 80
        || label
            .chars()
            .any(|ch| ch.is_control() || matches!(ch, '"' | '\\'))
        || sender.len() > 180
        || !sender
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"@._+-".contains(&byte))
    {
        return Err("Enter a Gmail label and an optional sender address.".into());
    }
    let query = format!(
        "label:\"{label}\" has:attachment{}",
        if sender.is_empty() {
            String::new()
        } else {
            format!(" from:{sender}")
        }
    );
    let http = client()?;
    let access = access(&http, &keychain_account).await?;
    let response = http
        .get(format!("{GMAIL}/messages"))
        .bearer_auth(access.as_str())
        .query(&[("q", query.as_str()), ("maxResults", "12")])
        .send()
        .await
        .map_err(|_| "Could not search Gmail.")?;
    let list: MessageList = json_response(response, 64 * 1024).await?;
    let mut results = Vec::new();
    for message in list.messages {
        if !valid_id(&message.id) {
            continue;
        }
        let response = http
            .get(format!("{GMAIL}/messages/{}", message.id))
            .bearer_auth(access.as_str())
            .query(&[
                ("format", "metadata"),
                ("metadataHeaders", "Subject"),
                ("metadataHeaders", "From"),
                ("metadataHeaders", "Date"),
            ])
            .send()
            .await
            .map_err(|_| "Could not read Gmail message metadata.")?;
        let metadata: Metadata = json_response(response, 256 * 1024).await?;
        let headers = metadata
            .payload
            .map(|payload| payload.headers)
            .unwrap_or_default();
        let field = |name: &str| {
            headers
                .iter()
                .find(|header| header.name.eq_ignore_ascii_case(name))
                .map(|header| header.value.chars().take(240).collect())
                .unwrap_or_default()
        };
        results.push(MessageSummary {
            id: message.id,
            subject: field("Subject"),
            sender: field("From"),
            date: field("Date"),
        });
    }
    account(&state, &book)?;
    Ok(results)
}

fn valid_id(id: &str) -> bool {
    (1..=64).contains(&id.len()) && id.bytes().all(|byte| byte.is_ascii_hexdigit())
}

#[tauri::command]
pub async fn gmail_message(
    state: State<'_, FinanceState>,
    book: String,
    id: String,
) -> Result<Response, String> {
    if !valid_id(&id) {
        return Err("Choose a Gmail message from the search results.".into());
    }
    let keychain_account = account(&state, &book)?;
    let http = client()?;
    let access = access(&http, &keychain_account).await?;
    let response = http
        .get(format!("{GMAIL}/messages/{id}"))
        .bearer_auth(access.as_str())
        .query(&[("format", "raw"), ("fields", "raw")])
        .send()
        .await
        .map_err(|_| "Could not read the selected Gmail message.")?;
    let raw: RawMessage = json_response(response, (MAX_EMAIL_BYTES * 4 / 3) + 4096).await?;
    let bytes = URL_SAFE_NO_PAD
        .decode(raw.raw.trim_end_matches('='))
        .map_err(|_| "Could not decode the Gmail message.")?;
    if bytes.len() > MAX_EMAIL_BYTES {
        return Err("The selected Gmail message exceeds 20 MiB.".into());
    }
    account(&state, &book)?;
    Ok(Response::new(bytes))
}
