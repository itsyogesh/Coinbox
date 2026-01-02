//! Wallet error types

use thiserror::Error;

/// Wallet-related errors
#[derive(Debug, Error)]
pub enum WalletError {
    /// Invalid mnemonic phrase
    #[error("Invalid mnemonic: {0}")]
    InvalidMnemonic(String),

    /// Invalid word in mnemonic
    #[error("Invalid word in mnemonic: '{0}' at position {1}")]
    InvalidMnemonicWord(String, usize),

    /// Wrong number of words in mnemonic
    #[error("Invalid mnemonic length: expected 12 or 24 words, got {0}")]
    InvalidMnemonicLength(usize),

    /// Invalid password
    #[error("Invalid password")]
    InvalidPassword,

    /// Wallet not found
    #[error("Wallet not found: {0}")]
    WalletNotFound(String),

    /// Wallet is locked (requires unlock)
    #[error("Wallet is locked")]
    WalletLocked,

    /// Session expired
    #[error("Session expired")]
    SessionExpired,

    /// Unsupported blockchain
    #[error("Unsupported chain: {0}")]
    UnsupportedChain(String),

    /// Invalid address format
    #[error("Invalid address for {chain}: {address}")]
    InvalidAddress { chain: String, address: String },

    /// Key derivation failed
    #[error("Key derivation failed: {0}")]
    DerivationError(String),

    /// Storage error
    #[error("Storage error: {0}")]
    StorageError(String),

    /// Database error
    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    /// Wallet already exists
    #[error("Wallet with this name already exists: {0}")]
    WalletAlreadyExists(String),

    /// Address already exists
    #[error("Address already tracked: {0}")]
    AddressAlreadyExists(String),

    /// Backup not verified
    #[error("Wallet backup has not been verified")]
    BackupNotVerified,

    /// Internal error
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Result type for wallet operations
pub type WalletResult<T> = std::result::Result<T, WalletError>;

impl From<bip39::Error> for WalletError {
    fn from(e: bip39::Error) -> Self {
        WalletError::InvalidMnemonic(e.to_string())
    }
}

impl From<bip32::Error> for WalletError {
    fn from(e: bip32::Error) -> Self {
        WalletError::DerivationError(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = WalletError::InvalidMnemonic("bad checksum".to_string());
        assert_eq!(err.to_string(), "Invalid mnemonic: bad checksum");

        let err = WalletError::UnsupportedChain("dogecoin".to_string());
        assert_eq!(err.to_string(), "Unsupported chain: dogecoin");

        let err = WalletError::InvalidAddress {
            chain: "bitcoin".to_string(),
            address: "invalid".to_string(),
        };
        assert_eq!(err.to_string(), "Invalid address for bitcoin: invalid");
    }
}
