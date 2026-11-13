use crate::finance::save_download;
use reqwest::{header, Client, Url};
use serde_json::{json, Value};
use std::{net::IpAddr, time::Duration};
use tauri::AppHandle;
use zeroize::Zeroizing;

fn server() -> Option<Url> {
    let mut url = Url::parse(&std::env::var("COINBOX_REMOTE_SERVER").ok()?).ok()?;
    let loopback = url
        .host_str()?
        .trim_matches(['[', ']'])
        .parse::<IpAddr>()
        .is_ok_and(|ip| ip.is_loopback());
    if !(url.scheme() == "https" || url.scheme() == "http" && loopback)
        || !url.username().is_empty()
        || url.password().is_some()
        || !matches!(url.path(), "" | "/")
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return None;
    }
    url.set_path("/api/");
    Some(url)
}

#[tauri::command]
pub fn finance_remote_available() -> Result<bool, String> {
    if std::env::var_os("COINBOX_REMOTE_SERVER").is_none() {
        return Ok(false);
    }
    server()
        .map(|_| true)
        .ok_or_else(|| "COINBOX_REMOTE_SERVER must be the private server’s HTTPS origin.".into())
}

#[tauri::command]
pub async fn finance_remote_request(
    app: AppHandle,
    path: String,
    token: String,
    body: Value,
) -> Result<Value, String> {
    let token = Zeroizing::new(token);
    let base = server().ok_or("Set COINBOX_REMOTE_SERVER to the private server’s HTTPS origin.")?;
    let parts = path.split('/').collect::<Vec<_>>();
    let download = match parts.as_slice() {
        ["books"] | ["admin", "grants"] => false,
        ["admin", "backup"] => true,
        ["books", "personal" | "droidsize", operation] => match *operation {
            "source_file" | "export" | "export_fiscal_year" => true,
            "bills" | "save_bill" | "remove_bill" | "add_account" | "inspect" | "stage"
            | "review" | "discard" | "confirm" | "report" | "source_row" => false,
            _ => return Err("Unknown Coinbox operation.".into()),
        },
        _ => return Err("Unknown Coinbox operation.".into()),
    };
    let url = base.join(&path).map_err(|_| "Invalid server endpoint.")?;
    let mut response = Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|_| "Could not create the private server connection.")?
        .post(url)
        .bearer_auth(token.as_str())
        .json(&body)
        .send()
        .await
        .map_err(|_| "Could not reach the private Coinbox server.")?;
    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("COINBOX_REMOTE_UNAUTHORIZED".into());
    }
    let filename = response
        .headers()
        .get(header::CONTENT_DISPOSITION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("attachment; filename=\""))
        .and_then(|value| value.strip_suffix('"'))
        .filter(|value| {
            value.len() <= 100
                && value.starts_with("coinbox-")
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"-_.".contains(&byte))
        })
        .map(str::to_owned);
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Could not read the server response.")?
    {
        if bytes.len().saturating_add(chunk.len()) > coinbox_finance::MAX_BACKUP_BYTES {
            return Err("The server response exceeds 32 MiB.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    if !status.is_success() {
        let error = serde_json::from_slice::<Value>(&bytes).ok();
        return Err(error
            .as_ref()
            .and_then(|value| value["error"].as_str())
            .map(str::to_owned)
            .unwrap_or_else(|| format!("Coinbox server returned HTTP {}.", status.as_u16())));
    }
    if download {
        let filename = filename.ok_or("The server returned an invalid download filename.")?;
        let (stem, extension) = filename
            .rsplit_once('.')
            .ok_or("The download has no file extension.")?;
        if !matches!(extension, "csv" | "xls" | "xlsx" | "pdf" | "sqlite3") {
            return Err("The server returned an unsupported file type.".into());
        }
        return Ok(json!(save_download(&app, stem, extension, &bytes)?));
    }
    serde_json::from_slice(&bytes).map_err(|_| "The server returned an invalid response.".into())
}
