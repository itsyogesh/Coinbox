mod bills;
mod csv;
mod document;
mod imports;
mod ledger;
mod spreadsheet;
mod vault;

pub use bills::*;
pub use csv::{inspect_csv, CsvMapping, CsvPreview};
pub use imports::*;
pub use ledger::*;
pub use vault::{Vault, MAX_BACKUP_BYTES};

use sha2::{Digest, Sha256};

pub type Result<T> = std::result::Result<T, FinanceError>;

#[derive(Debug, thiserror::Error)]
pub enum FinanceError {
    #[error("{0}")]
    Input(String),
    #[error("Coinbox couldn’t read or save your changes.")]
    Database(#[from] rusqlite::Error),
    #[error("Coinbox couldn’t read or save your changes.")]
    Io(#[from] std::io::Error),
    #[error("Coinbox couldn’t read your workspace.")]
    Format(#[from] serde_json::Error),
}

fn invalid(message: impl Into<String>) -> FinanceError {
    FinanceError::Input(message.into())
}

fn digest(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

pub fn inspect_statement(name: &str, bytes: &[u8]) -> Result<CsvPreview> {
    let normalized = document::normalize(name, bytes)?;
    inspect_csv(normalized.as_deref().unwrap_or(bytes))
}
