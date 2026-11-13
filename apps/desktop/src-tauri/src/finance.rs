use coinbox_finance::{
    inspect_statement, Book, Confirmation, ConfirmationResult, CsvPreview, Report, Review,
    SourceRow, StageResult, Statement, Vault,
};
use serde::Serialize;
use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Manager, State};
use zeroize::Zeroizing;

pub struct FinanceState {
    path: PathBuf,
    vault: Mutex<Option<Vault>>,
}

impl FinanceState {
    pub(crate) fn path(&self) -> &Path {
        &self.path
    }

    pub fn new(app_data_dir: PathBuf) -> Self {
        let dir = std::env::var_os("COINBOX_FINANCE_DIR")
            .filter(|path| !path.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| app_data_dir.join("finance"));
        Self {
            path: dir.join("vault.sqlite3"),
            vault: Mutex::new(None),
        }
    }

    pub(crate) fn with_vault<T>(
        &self,
        operation: impl FnOnce(&mut Vault) -> coinbox_finance::Result<T>,
    ) -> Result<T, String> {
        let mut vault = self
            .vault
            .lock()
            .map_err(|_| "Couldn’t open your workspace.")?;
        operation(vault.as_mut().ok_or("Unlock Coinbox and try again.")?).map_err(message)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    exists: bool,
    unlocked: bool,
}

fn message(error: coinbox_finance::FinanceError) -> String {
    error.to_string()
}

#[tauri::command]
pub async fn finance_status(state: State<'_, FinanceState>) -> Result<VaultStatus, String> {
    let vault = state
        .vault
        .lock()
        .map_err(|_| "Couldn’t open your workspace.")?;
    let exists = state
        .path
        .try_exists()
        .map_err(|_| "Couldn’t open your workspace.")?;
    Ok(VaultStatus {
        exists,
        unlocked: vault.is_some(),
    })
}

#[tauri::command]
pub async fn finance_unlock(
    state: State<'_, FinanceState>,
    passphrase: String,
    create: bool,
) -> Result<(), String> {
    let passphrase = Zeroizing::new(passphrase);
    let mut active = state
        .vault
        .lock()
        .map_err(|_| "Couldn’t open your workspace.")?;
    if active.is_some() {
        return Err("Lock Coinbox and try again.".into());
    }
    let vault = if create {
        Vault::create(&state.path, &passphrase)
    } else {
        Vault::open(&state.path, &passphrase)
    };
    *active = Some(vault.map_err(message)?);
    Ok(())
}

#[tauri::command]
pub async fn finance_lock(state: State<'_, FinanceState>) -> Result<(), String> {
    let mut active = state
        .vault
        .lock()
        .map_err(|_| "Couldn’t open your workspace.")?;
    *active = None;
    Ok(())
}

#[tauri::command]
pub async fn finance_restore(
    state: State<'_, FinanceState>,
    passphrase: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let passphrase = Zeroizing::new(passphrase);
    let mut active = state
        .vault
        .lock()
        .map_err(|_| "Couldn’t open your workspace.")?;
    if active.is_some() {
        return Err("Restore your backup in a new Coinbox workspace.".into());
    }
    *active = Some(Vault::restore(&state.path, &passphrase, &bytes).map_err(message)?);
    Ok(())
}

#[tauri::command]
pub async fn finance_backup(
    app: AppHandle,
    state: State<'_, FinanceState>,
) -> Result<String, String> {
    let bytes = state.with_vault(Vault::backup)?;
    save_download(&app, "coinbox-finance-backup", "sqlite3", &bytes)
}

#[tauri::command]
pub async fn finance_books(state: State<'_, FinanceState>) -> Result<Vec<Book>, String> {
    state.with_vault(|vault| vault.books())
}

#[tauri::command]
pub async fn finance_add_account(
    state: State<'_, FinanceState>,
    book: String,
    name: String,
    kind: String,
) -> Result<i64, String> {
    state.with_vault(|vault| vault.add_account(&book, &name, &kind))
}

#[tauri::command]
pub async fn finance_inspect_csv(name: String, bytes: Vec<u8>) -> Result<CsvPreview, String> {
    inspect_statement(&name, &bytes).map_err(message)
}

#[tauri::command]
pub async fn finance_stage(
    state: State<'_, FinanceState>,
    book: String,
    statement: Statement,
) -> Result<StageResult, String> {
    state.with_vault(|vault| vault.stage(&book, &statement))
}

#[tauri::command]
pub async fn finance_review(
    state: State<'_, FinanceState>,
    book: String,
) -> Result<Review, String> {
    state.with_vault(|vault| vault.review(&book))
}

#[tauri::command]
pub async fn finance_discard(
    state: State<'_, FinanceState>,
    book: String,
    source_id: i64,
) -> Result<(), String> {
    state.with_vault(|vault| vault.discard(&book, source_id))
}

#[tauri::command]
pub async fn finance_confirm(
    state: State<'_, FinanceState>,
    book: String,
    choices: Confirmation,
) -> Result<ConfirmationResult, String> {
    state.with_vault(|vault| vault.confirm(&book, &choices))
}

#[tauri::command]
pub async fn finance_report(
    state: State<'_, FinanceState>,
    book: String,
) -> Result<Report, String> {
    state.with_vault(|vault| vault.report(&book))
}

#[tauri::command]
pub async fn finance_source_row(
    state: State<'_, FinanceState>,
    book: String,
    row_id: i64,
) -> Result<SourceRow, String> {
    state.with_vault(|vault| vault.source_row(&book, row_id))
}

#[tauri::command]
pub async fn finance_source_file(
    app: AppHandle,
    state: State<'_, FinanceState>,
    book: String,
    source_id: i64,
) -> Result<String, String> {
    let (bytes, extension) = state.with_vault(|vault| {
        Ok((
            vault.source_file(&book, source_id)?,
            vault.source_extension(&book, source_id)?,
        ))
    })?;
    save_download(
        &app,
        &format!("coinbox-source-{source_id}"),
        extension,
        &bytes,
    )
}

#[tauri::command]
pub async fn finance_export(
    app: AppHandle,
    state: State<'_, FinanceState>,
    book: String,
) -> Result<String, String> {
    let csv = state.with_vault(|vault| vault.export_csv(&book))?;
    save_download(
        &app,
        &format!("coinbox-{book}-ledger"),
        "csv",
        csv.as_bytes(),
    )
}

#[tauri::command]
pub async fn finance_bills(
    state: State<'_, FinanceState>,
    book: String,
) -> Result<Vec<coinbox_finance::Bill>, String> {
    state.with_vault(|vault| vault.bills(&book))
}

#[tauri::command]
pub async fn finance_save_bill(
    state: State<'_, FinanceState>,
    book: String,
    id: Option<i64>,
    input: coinbox_finance::BillInput,
) -> Result<i64, String> {
    state.with_vault(|vault| vault.save_bill(&book, id, &input))
}

#[tauri::command]
pub async fn finance_remove_bill(
    state: State<'_, FinanceState>,
    book: String,
    id: i64,
) -> Result<(), String> {
    state.with_vault(|vault| vault.remove_bill(&book, id))
}

#[tauri::command]
pub async fn finance_export_fiscal_year(
    app: AppHandle,
    state: State<'_, FinanceState>,
    book: String,
    start_year: i32,
    evidence: bool,
) -> Result<String, String> {
    let csv = state.with_vault(|vault| {
        if evidence {
            vault.export_evidence(&book, start_year)
        } else {
            vault.export_fiscal_year(&book, start_year)
        }
    })?;
    let report = if evidence { "evidence" } else { "ledger" };
    save_download(
        &app,
        &format!("coinbox-{book}-{start_year}-{report}"),
        "csv",
        csv.as_bytes(),
    )
}

pub(crate) fn save_download(
    app: &AppHandle,
    stem: &str,
    extension: &str,
    bytes: &[u8],
) -> Result<String, String> {
    let dir = app
        .path()
        .download_dir()
        .map_err(|_| "The Downloads folder is unavailable.")?;
    write_download(&dir, stem, extension, bytes)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|_| "Could not save to Downloads. Check that the folder is writable and try again.".into())
}

fn write_download(dir: &Path, stem: &str, extension: &str, bytes: &[u8]) -> io::Result<PathBuf> {
    fs::create_dir_all(dir)?;
    let mut file = tempfile::NamedTempFile::new_in(dir)?;
    file.write_all(bytes)?;
    file.as_file().sync_all()?;

    for index in 1..=1000 {
        let name = if index == 1 {
            format!("{stem}.{extension}")
        } else {
            format!("{stem}-{index}.{extension}")
        };
        let path = dir.join(name);
        match file.persist_noclobber(&path) {
            Ok(_) => return Ok(path),
            Err(err) if err.error.kind() == io::ErrorKind::AlreadyExists => file = err.file,
            Err(err) => return Err(err.error),
        }
    }
    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "All export filenames are in use.",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saves_exports_without_replacing_previous_files() {
        let downloads = tempfile::tempdir().unwrap();
        let dir = downloads.path();
        let first = write_download(dir, "coinbox-personal-ledger", "csv", b"original").unwrap();
        let second = write_download(dir, "coinbox-personal-ledger", "csv", b"new").unwrap();

        assert_eq!(first, dir.join("coinbox-personal-ledger.csv"));
        assert_eq!(second, dir.join("coinbox-personal-ledger-2.csv"));
        assert_eq!(fs::read(first).unwrap(), b"original");
        assert_eq!(fs::read(second).unwrap(), b"new");
    }
}
