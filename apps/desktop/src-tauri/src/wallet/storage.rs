//! Secure wallet storage using IOTA Stronghold
//!
//! This module provides encrypted storage for sensitive wallet data:
//! - Mnemonics
//! - Seeds
//! - Private keys
//!
//! All secrets are encrypted using XChaCha20-Poly1305 with Argon2 key derivation.
//!
//! # Architecture
//!
//! Stronghold uses a vault-based architecture:
//! - Each wallet gets its own vault
//! - Secrets are stored in "records" within vaults
//! - The master password protects access to all vaults
//!
//! # Usage Notes
//!
//! This module is designed to work with the tauri-plugin-stronghold.
//! The plugin must be initialized in the Tauri app before use.

use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use zeroize::Zeroizing;

use crate::wallet::error::{WalletError, WalletResult};
use crate::wallet::types::{SecretMnemonic, SecretSeed};

/// Record keys for different secret types
pub mod record_keys {
    /// The mnemonic phrase for an HD wallet
    pub const MNEMONIC: &str = "mnemonic";
    /// The master seed derived from mnemonic
    pub const SEED: &str = "seed";
    /// A private key (for imported wallets)
    pub const PRIVATE_KEY: &str = "private_key";
}

/// In-memory session cache for decrypted secrets
///
/// This allows the app to use secrets without repeated password prompts.
/// The cache is cleared on lock or timeout.
pub struct SessionCache {
    /// Cached seeds by wallet ID
    seeds: RwLock<HashMap<String, Zeroizing<[u8; 64]>>>,
    /// Whether a session is active
    is_unlocked: RwLock<bool>,
}

impl Default for SessionCache {
    fn default() -> Self {
        Self::new()
    }
}

impl SessionCache {
    /// Create a new empty session cache
    pub fn new() -> Self {
        Self {
            seeds: RwLock::new(HashMap::new()),
            is_unlocked: RwLock::new(false),
        }
    }

    /// Check if the session is unlocked
    pub fn is_unlocked(&self) -> bool {
        *self.is_unlocked.read()
    }

    /// Set the unlock state
    pub fn set_unlocked(&self, unlocked: bool) {
        *self.is_unlocked.write() = unlocked;
    }

    /// Cache a seed for a wallet
    pub fn cache_seed(&self, wallet_id: &str, seed: [u8; 64]) {
        self.seeds.write().insert(wallet_id.to_string(), Zeroizing::new(seed));
    }

    /// Get a cached seed
    pub fn get_seed(&self, wallet_id: &str) -> Option<[u8; 64]> {
        self.seeds.read().get(wallet_id).map(|s| **s)
    }

    /// Check if a seed is cached
    pub fn has_seed(&self, wallet_id: &str) -> bool {
        self.seeds.read().contains_key(wallet_id)
    }

    /// Remove a cached seed
    pub fn remove_seed(&self, wallet_id: &str) {
        self.seeds.write().remove(wallet_id);
    }

    /// Clear all cached secrets (on lock)
    pub fn clear(&self) {
        self.seeds.write().clear();
        *self.is_unlocked.write() = false;
    }
}

/// Storage manager for wallet secrets
///
/// This struct manages access to the Stronghold vault and session cache.
/// In a Tauri app, this would integrate with tauri-plugin-stronghold.
pub struct SecureStorage {
    /// In-memory session cache for unlocked secrets
    session_cache: Arc<SessionCache>,
    /// Path to the Stronghold file (set when initialized)
    stronghold_path: RwLock<Option<std::path::PathBuf>>,
}

impl Default for SecureStorage {
    fn default() -> Self {
        Self::new()
    }
}

impl SecureStorage {
    /// Create a new SecureStorage instance
    pub fn new() -> Self {
        Self {
            session_cache: Arc::new(SessionCache::new()),
            stronghold_path: RwLock::new(None),
        }
    }

    /// Get the session cache
    pub fn session(&self) -> Arc<SessionCache> {
        Arc::clone(&self.session_cache)
    }

    /// Set the Stronghold file path
    pub fn set_stronghold_path(&self, path: std::path::PathBuf) {
        *self.stronghold_path.write() = Some(path);
    }

    /// Get the Stronghold file path
    pub fn stronghold_path(&self) -> Option<std::path::PathBuf> {
        self.stronghold_path.read().clone()
    }

    /// Check if storage is initialized
    pub fn is_initialized(&self) -> bool {
        self.stronghold_path.read().is_some()
    }

    /// Check if a session is active (wallet is unlocked)
    pub fn is_unlocked(&self) -> bool {
        self.session_cache.is_unlocked()
    }

    /// Get a seed from cache or return error if locked
    pub fn get_seed(&self, wallet_id: &str) -> WalletResult<[u8; 64]> {
        if !self.is_unlocked() {
            return Err(WalletError::WalletLocked);
        }

        self.session_cache
            .get_seed(wallet_id)
            .ok_or_else(|| WalletError::WalletNotFound(wallet_id.to_string()))
    }

    /// Cache a seed in the session
    pub fn cache_seed(&self, wallet_id: &str, seed: [u8; 64]) {
        self.session_cache.set_unlocked(true);
        self.session_cache.cache_seed(wallet_id, seed);
    }

    /// Lock the wallet (clear all cached secrets)
    pub fn lock(&self) {
        self.session_cache.clear();
    }

    /// Unlock the wallet (sets unlocked state)
    pub fn unlock(&self) {
        self.session_cache.set_unlocked(true);
    }
}

/// Helper to generate the vault path for a wallet
pub fn vault_path(wallet_id: &str) -> String {
    format!("wallet:{}", wallet_id)
}

/// Helper to generate the record path within a vault
pub fn record_path(secret_type: &str) -> String {
    format!("secret:{}", secret_type)
}

// =============================================================================
// Stronghold Integration Types
// =============================================================================

/// Represents a secret to be stored in Stronghold
#[derive(Debug)]
pub enum SecretData {
    /// A BIP39 mnemonic phrase
    Mnemonic(SecretMnemonic),
    /// A 64-byte seed derived from mnemonic
    Seed(SecretSeed),
    /// A 32-byte private key
    PrivateKey([u8; 32]),
}

impl SecretData {
    /// Get the record key for this secret type
    pub fn record_key(&self) -> &'static str {
        match self {
            SecretData::Mnemonic(_) => record_keys::MNEMONIC,
            SecretData::Seed(_) => record_keys::SEED,
            SecretData::PrivateKey(_) => record_keys::PRIVATE_KEY,
        }
    }

    /// Convert to bytes for storage
    pub fn to_bytes(&self) -> Vec<u8> {
        match self {
            SecretData::Mnemonic(m) => m.as_str().as_bytes().to_vec(),
            SecretData::Seed(s) => s.as_bytes().to_vec(),
            SecretData::PrivateKey(k) => k.to_vec(),
        }
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_cache_new() {
        let cache = SessionCache::new();
        assert!(!cache.is_unlocked());
    }

    #[test]
    fn test_session_cache_unlock() {
        let cache = SessionCache::new();
        cache.set_unlocked(true);
        assert!(cache.is_unlocked());
    }

    #[test]
    fn test_session_cache_seed() {
        let cache = SessionCache::new();
        let wallet_id = "test-wallet";
        let seed = [42u8; 64];

        // Initially no seed
        assert!(!cache.has_seed(wallet_id));
        assert!(cache.get_seed(wallet_id).is_none());

        // Cache seed
        cache.cache_seed(wallet_id, seed);

        // Now should have seed
        assert!(cache.has_seed(wallet_id));
        let retrieved = cache.get_seed(wallet_id).unwrap();
        assert_eq!(retrieved, seed);
    }

    #[test]
    fn test_session_cache_remove_seed() {
        let cache = SessionCache::new();
        let wallet_id = "test-wallet";
        let seed = [42u8; 64];

        cache.cache_seed(wallet_id, seed);
        assert!(cache.has_seed(wallet_id));

        cache.remove_seed(wallet_id);
        assert!(!cache.has_seed(wallet_id));
    }

    #[test]
    fn test_session_cache_clear() {
        let cache = SessionCache::new();

        // Cache multiple seeds
        cache.set_unlocked(true);
        cache.cache_seed("wallet1", [1u8; 64]);
        cache.cache_seed("wallet2", [2u8; 64]);

        assert!(cache.is_unlocked());
        assert!(cache.has_seed("wallet1"));
        assert!(cache.has_seed("wallet2"));

        // Clear all
        cache.clear();

        assert!(!cache.is_unlocked());
        assert!(!cache.has_seed("wallet1"));
        assert!(!cache.has_seed("wallet2"));
    }

    #[test]
    fn test_secure_storage_new() {
        let storage = SecureStorage::new();
        assert!(!storage.is_initialized());
        assert!(!storage.is_unlocked());
    }

    #[test]
    fn test_secure_storage_path() {
        let storage = SecureStorage::new();
        assert!(storage.stronghold_path().is_none());

        storage.set_stronghold_path("/tmp/test.stronghold".into());
        assert!(storage.is_initialized());
        assert_eq!(
            storage.stronghold_path().unwrap().to_str().unwrap(),
            "/tmp/test.stronghold"
        );
    }

    #[test]
    fn test_secure_storage_lock_unlock() {
        let storage = SecureStorage::new();
        let seed = [42u8; 64];

        // Cache and unlock
        storage.cache_seed("wallet1", seed);
        assert!(storage.is_unlocked());

        // Get seed works when unlocked
        let retrieved = storage.get_seed("wallet1").unwrap();
        assert_eq!(retrieved, seed);

        // Lock
        storage.lock();
        assert!(!storage.is_unlocked());

        // Get seed fails when locked
        let result = storage.get_seed("wallet1");
        assert!(matches!(result, Err(WalletError::WalletLocked)));
    }

    #[test]
    fn test_vault_path() {
        assert_eq!(vault_path("abc123"), "wallet:abc123");
    }

    #[test]
    fn test_record_path() {
        assert_eq!(record_path("mnemonic"), "secret:mnemonic");
    }

    #[test]
    fn test_secret_data_record_key() {
        let mnemonic = SecretData::Mnemonic(SecretMnemonic::new("test".to_string()));
        assert_eq!(mnemonic.record_key(), record_keys::MNEMONIC);

        let seed = SecretData::Seed(SecretSeed::new([0u8; 64]));
        assert_eq!(seed.record_key(), record_keys::SEED);

        let key = SecretData::PrivateKey([0u8; 32]);
        assert_eq!(key.record_key(), record_keys::PRIVATE_KEY);
    }

    #[test]
    fn test_secret_data_to_bytes() {
        let mnemonic = SecretData::Mnemonic(SecretMnemonic::new("hello world".to_string()));
        assert_eq!(mnemonic.to_bytes(), b"hello world");

        let seed = SecretData::Seed(SecretSeed::new([42u8; 64]));
        assert_eq!(seed.to_bytes(), vec![42u8; 64]);

        let key = SecretData::PrivateKey([7u8; 32]);
        assert_eq!(key.to_bytes(), vec![7u8; 32]);
    }
}
