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
    #[error("The finance vault could not be read or written.")]
    Database(#[from] rusqlite::Error),
    #[error("The finance vault file could not be read or written.")]
    Io(#[from] std::io::Error),
    #[error("The finance vault data could not be read.")]
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
