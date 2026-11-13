mod grants;
mod mcp;

use axum::{
    body::Body,
    extract::{DefaultBodyLimit, Path as RoutePath, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use coinbox_finance::{
    inspect_statement, BillInput, Confirmation, FinanceError, Statement, Vault, MAX_BACKUP_BYTES,
};
use grants::{Grants, Scope};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tower_http::services::{ServeDir, ServeFile};
use zeroize::Zeroizing;

type ServerError = Box<dyn Error + Send + Sync>;
type ApiResult = Result<Response, ApiError>;

struct ApiError(StatusCode, String);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({ "error": self.1 }))).into_response()
    }
}

impl From<FinanceError> for ApiError {
    fn from(error: FinanceError) -> Self {
        let status = if matches!(error, FinanceError::Input(_)) {
            StatusCode::BAD_REQUEST
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        };
        Self(status, error.to_string())
    }
}

struct Server {
    vault: Mutex<Vault>,
    grants: Mutex<Grants>,
    admin: [u8; 32],
}

#[tokio::main]
async fn main() -> Result<(), ServerError> {
    let dir = env_path("COINBOX_SERVER_DIR")?;
    let path = dir.join("vault.sqlite3");
    let key = read_secret("COINBOX_SERVER_PASSPHRASE_FILE")?;
    match std::env::args().skip(1).collect::<Vec<_>>().as_slice() {
        [command] if command == "init" => {
            Vault::create(&path, &key)?;
            return Ok(());
        }
        [command, backup] if command == "restore" => {
            if fs::metadata(backup)?.len() > MAX_BACKUP_BYTES as u64 {
                return Err("Backup exceeds 32 MiB.".into());
            }
            Vault::restore(&path, &key, &fs::read(backup)?)?;
            return Ok(());
        }
        [] => {}
        _ => return Err("Usage: coinbox-finance-server [init | restore <backup>]".into()),
    }

    let admin = read_secret("COINBOX_SERVER_ADMIN_TOKEN_FILE")?;
    if !grants::valid_token(&admin) {
        return Err("The admin token must be 32 random bytes encoded as 64 lowercase hexadecimal characters.".into());
    }
    let web = env_path("COINBOX_WEB_DIST")?;
    if !web.join("index.html").is_file() {
        return Err("Build the Coinbox web assets before starting the server.".into());
    }
    let server = Arc::new(Server {
        vault: Mutex::new(Vault::open(&path, &key)?),
        grants: Mutex::new(Grants::open(dir.join("grants.json"))?),
        admin: grants::digest(&admin),
    });
    drop(key);
    drop(admin);

    let listener = tokio::net::TcpListener::bind(
        std::env::var("COINBOX_SERVER_BIND").unwrap_or_else(|_| "127.0.0.1:8787".into()),
    )
    .await?;
    eprintln!("Coinbox listening on {}", listener.local_addr()?);
    axum::serve(listener, router(server, &web)).await?;
    Ok(())
}

fn env_path(name: &str) -> Result<PathBuf, ServerError> {
    std::env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .ok_or_else(|| format!("Set {name}.").into())
}

fn read_secret(name: &str) -> Result<Zeroizing<String>, ServerError> {
    let raw = Zeroizing::new(fs::read_to_string(env_path(name)?)?);
    Ok(Zeroizing::new(
        raw.trim_end_matches(['\r', '\n']).to_owned(),
    ))
}

fn router(server: Arc<Server>, web: &Path) -> Router {
    let api = Router::new()
        .route(
            "/status",
            post(|| async { Json(json!({ "exists": true, "unlocked": true })) }),
        )
        .route("/books", post(books))
        .route("/admin/grants", post(manage_grants))
        .route("/admin/backup", post(backup))
        .route("/mcp", post(mcp::request))
        .route("/books/{book}/{operation}", post(book_operation))
        .fallback(|| async { StatusCode::NOT_FOUND })
        .layer(DefaultBodyLimit::max(5 * 1024 * 1024))
        .layer(middleware::from_fn(no_store))
        .with_state(server);

    Router::new()
        .route("/health", get(|| async { StatusCode::NO_CONTENT }))
        .nest("/api", api)
        .fallback_service(ServeDir::new(web).fallback(ServeFile::new(web.join("index.html"))))
}

async fn no_store(request: axum::extract::Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        header::CACHE_CONTROL,
        header::HeaderValue::from_static("no-store"),
    );
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        header::HeaderValue::from_static("nosniff"),
    );
    response
}

fn token(headers: &HeaderMap) -> Result<&str, ApiError> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .filter(|value| grants::valid_token(value))
        .ok_or_else(|| {
            ApiError(
                StatusCode::UNAUTHORIZED,
                "Enter a valid access code.".into(),
            )
        })
}

fn is_admin(server: &Server, token: &str) -> bool {
    grants::matches(&server.admin, token)
}

fn expired() -> ApiError {
    ApiError(
        StatusCode::UNAUTHORIZED,
        "This access code is invalid or has been removed. Check it or ask for a new code.".into(),
    )
}

fn forbidden() -> ApiError {
    ApiError(
        StatusCode::FORBIDDEN,
        "You don’t have access to do this in this book.".into(),
    )
}

fn internal() -> ApiError {
    ApiError(
        StatusCode::INTERNAL_SERVER_ERROR,
        "Coinbox couldn’t complete this action. Try again.".into(),
    )
}

async fn blocking(operation: impl FnOnce() -> ApiResult + Send + 'static) -> ApiResult {
    tokio::task::spawn_blocking(operation)
        .await
        .map_err(|_| internal())?
}

async fn books(State(server): State<Arc<Server>>, headers: HeaderMap) -> ApiResult {
    blocking(move || {
        let token = token(&headers)?;
        let admin = is_admin(&server, token);
        let grants = server.grants.lock().map_err(|_| internal())?;
        let grant = if admin {
            None
        } else {
            Some(grants.find(token).ok_or_else(expired)?)
        };
        if grant.is_some_and(|grant| grant.scope != Scope::Device) {
            return Err(forbidden());
        }
        let vault = server.vault.lock().map_err(|_| internal())?;
        let books = vault
            .books()?
            .into_iter()
            .filter(|book| admin || grant.is_some_and(|grant| grant.book == book.id))
            .collect::<Vec<_>>();
        Ok(Json(books).into_response())
    })
    .await
}

#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum GrantAction {
    List,
    Create {
        book: String,
        name: String,
        scope: Scope,
    },
    Revoke {
        id: String,
    },
}

async fn manage_grants(
    State(server): State<Arc<Server>>,
    headers: HeaderMap,
    Json(action): Json<GrantAction>,
) -> ApiResult {
    blocking(move || {
        if !is_admin(&server, token(&headers)?) {
            return Err(forbidden());
        }
        let mut grants = server.grants.lock().map_err(|_| internal())?;
        match action {
            GrantAction::List => Ok(Json(grants.list()).into_response()),
            GrantAction::Create { book, name, scope } => {
                if !server
                    .vault
                    .lock()
                    .map_err(|_| internal())?
                    .books()?
                    .iter()
                    .any(|item| item.id == book)
                    || name.trim().is_empty()
                    || name.chars().count() > 80
                    || name.chars().any(char::is_control)
                {
                    return Err(ApiError(
                        StatusCode::BAD_REQUEST,
                        "Choose a book and enter a name up to 80 characters.".into(),
                    ));
                }
                let (grant, token) = grants
                    .create(book, name.trim().to_owned(), scope)
                    .map_err(|_| internal())?;
                Ok(Json(json!({ "grant": grant, "token": token })).into_response())
            }
            GrantAction::Revoke { id } => {
                grants.revoke(&id).map_err(|_| internal())?;
                Ok(Json(Value::Null).into_response())
            }
        }
    })
    .await
}

async fn backup(State(server): State<Arc<Server>>, headers: HeaderMap) -> ApiResult {
    blocking(move || {
        if !is_admin(&server, token(&headers)?) {
            return Err(forbidden());
        }
        let bytes = server.vault.lock().map_err(|_| internal())?.backup()?;
        Ok(download(
            "coinbox-finance-backup.sqlite3",
            "application/octet-stream",
            bytes,
        ))
    })
    .await
}

fn download(name: &str, content_type: &'static str, bytes: impl Into<Body>) -> Response {
    Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{name}\""),
        )
        .body(bytes.into())
        .expect("known response headers")
}

fn decode<T: serde::de::DeserializeOwned>(body: Value) -> Result<T, ApiError> {
    serde_json::from_value(body)
        .map_err(|_| ApiError(StatusCode::BAD_REQUEST, "Check the information you entered and try again.".into()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Input {
    #[serde(default)]
    id: Option<i64>,
    #[serde(default)]
    row_id: Option<i64>,
    #[serde(default)]
    source_id: Option<i64>,
    #[serde(default)]
    start_year: Option<i32>,
    #[serde(default)]
    evidence: bool,
    #[serde(default)]
    name: String,
    #[serde(default)]
    kind: String,
}

async fn book_operation(
    State(server): State<Arc<Server>>,
    RoutePath((book, operation)): RoutePath<(String, String)>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> ApiResult {
    blocking(move || {
        let token = token(&headers)?;
        let admin = is_admin(&server, token);
        // Hold the grant lock through the operation so a completed revocation also fences in-flight requests.
        let grants = server.grants.lock().map_err(|_| internal())?;
        if !admin {
            let grant = grants.find(token).ok_or_else(expired)?;
            if grant.book != book || grant.scope != Scope::Device {
                return Err(forbidden());
            }
        }
        let mut vault = server.vault.lock().map_err(|_| internal())?;
        if !vault.books()?.iter().any(|item| item.id == book) {
            return Err(forbidden());
        }
        let csv = "text/csv; charset=utf-8";
        let result = match operation.as_str() {
            "report" => json!(vault.report(&book)?),
            "review" => json!(vault.review(&book)?),
            "bills" => json!(vault.bills(&book)?),
            "inspect" => json!(inspect_statement(
                body["name"].as_str().unwrap_or_default(),
                &decode::<Vec<u8>>(body["bytes"].clone())?
            )?),
            "stage" => json!(vault.stage(&book, &decode::<Statement>(body)?)?),
            "confirm" => json!(vault.confirm(&book, &decode::<Confirmation>(body)?)?),
            "save_bill" => json!(vault.save_bill(
                &book,
                decode::<Input>(body.clone())?.id,
                &decode::<BillInput>(body["input"].clone())?
            )?),
            "add_account" => {
                let input: Input = decode(body)?;
                json!(vault.add_account(&book, &input.name, &input.kind)?)
            }
            "remove_bill" => {
                vault.remove_bill(&book, required(decode::<Input>(body)?.id)?)?;
                Value::Null
            }
            "discard" => {
                vault.discard(&book, required(decode::<Input>(body)?.source_id)?)?;
                Value::Null
            }
            "source_row" => {
                json!(vault.source_row(&book, required(decode::<Input>(body)?.row_id)?)?)
            }
            "source_file" => {
                let id = required(decode::<Input>(body)?.source_id)?;
                let extension = vault.source_extension(&book, id)?;
                return Ok(download(
                    &format!("coinbox-source-{id}.{extension}"),
                    if extension == "csv" {
                        csv
                    } else {
                        "application/octet-stream"
                    },
                    vault.source_file(&book, id)?,
                ));
            }
            "export" => {
                return Ok(download(
                    &format!("coinbox-{book}-ledger.csv"),
                    csv,
                    vault.export_csv(&book)?,
                ))
            }
            "export_fiscal_year" => {
                let input: Input = decode(body)?;
                let year = required(input.start_year)?;
                let (kind, contents) = if input.evidence {
                    ("evidence", vault.export_evidence(&book, year)?)
                } else {
                    ("ledger", vault.export_fiscal_year(&book, year)?)
                };
                return Ok(download(
                    &format!("coinbox-{book}-{year}-{kind}.csv"),
                    csv,
                    contents,
                ));
            }
            _ => return Ok(StatusCode::NOT_FOUND.into_response()),
        };
        Ok(Json(result).into_response())
    })
    .await
}

fn required<T>(value: Option<T>) -> Result<T, ApiError> {
    value.ok_or_else(|| {
        ApiError(
            StatusCode::BAD_REQUEST,
            "A required field is missing.".into(),
        )
    })
}
