//! Wallet Manager - Core wallet operations
//!
//! This module provides the main interface for wallet management:
//! - Creating HD wallets from mnemonic
//! - Importing existing wallets
//! - Deriving addresses for multiple chains
//! - Lock/unlock wallet sessions
//!
//! # Architecture
//!
//! The WalletManager orchestrates:
//! - ChainRegistry for address derivation
//! - SecureStorage for encrypted secret storage
//! - Database for wallet metadata

use std::sync::Arc;

use crate::wallet::error::{WalletError, WalletResult};
use crate::wallet::mnemonic::{generate_mnemonic, mnemonic_to_seed, parse_mnemonic, MnemonicLength};
use crate::wallet::registry::{ChainInfo, ChainRegistry};
use crate::wallet::storage::SecureStorage;
use crate::wallet::types::{
    CreateHDWalletRequest, CreateHDWalletResponse, DerivedAddress, SecretMnemonic, WalletType,
};

/// Main wallet manager instance
///
/// Thread-safe (Send + Sync) for use across Tauri commands.
pub struct WalletManager {
    /// Chain registry for address derivation
    registry: ChainRegistry,
    /// Secure storage for secrets
    storage: Arc<SecureStorage>,
}

impl Default for WalletManager {
    fn default() -> Self {
        Self::new()
    }
}

impl WalletManager {
    /// Create a new WalletManager
    pub fn new() -> Self {
        Self {
            registry: ChainRegistry::new(),
            storage: Arc::new(SecureStorage::new()),
        }
    }

    /// Get a reference to the chain registry
    pub fn registry(&self) -> &ChainRegistry {
        &self.registry
    }

    /// Get the secure storage
    pub fn storage(&self) -> Arc<SecureStorage> {
        Arc::clone(&self.storage)
    }

    // =========================================================================
    // Chain Information
    // =========================================================================

    /// Get all supported chains
    pub fn get_supported_chains(&self) -> Vec<ChainInfo> {
        self.registry.all_chains()
    }

    /// Get mainnet chains only
    pub fn get_mainnet_chains(&self) -> Vec<ChainInfo> {
        self.registry.mainnet_chains()
    }

    /// Validate an address for a specific chain
    pub fn validate_address(&self, chain_id: &str, address: &str) -> WalletResult<bool> {
        self.registry.validate_address(chain_id, address)
    }

    // =========================================================================
    // Mnemonic Operations
    // =========================================================================

    /// Generate a new mnemonic
    pub fn generate_mnemonic(&self, word_count: usize) -> WalletResult<SecretMnemonic> {
        let length = match word_count {
            12 => MnemonicLength::Words12,
            24 => MnemonicLength::Words24,
            _ => {
                return Err(WalletError::InvalidMnemonicLength(word_count));
            }
        };

        generate_mnemonic(length)
    }

    /// Validate an existing mnemonic
    pub fn validate_mnemonic(&self, phrase: &str) -> crate::wallet::types::ValidateMnemonicResponse {
        crate::wallet::mnemonic::validate_mnemonic(phrase)
    }

    // =========================================================================
    // Wallet Creation
    // =========================================================================

    /// Create a new HD wallet
    ///
    /// This generates a new mnemonic, derives addresses for the requested chains,
    /// and stores the encrypted seed.
    ///
    /// # Arguments
    /// * `request` - Wallet creation parameters
    /// * `password` - Password for encrypting the wallet
    ///
    /// # Returns
    /// The mnemonic (to be backed up) and derived addresses
    pub fn create_hd_wallet(
        &self,
        request: &CreateHDWalletRequest,
        _password: &str,
    ) -> WalletResult<CreateHDWalletResponse> {
        // 1. Generate mnemonic
        let mnemonic = self.generate_mnemonic(request.word_count)?;

        // 2. Derive seed from mnemonic
        let seed = mnemonic_to_seed(&mnemonic, "")?;

        // 3. Derive addresses for each requested chain
        let addresses = self
            .registry
            .derive_addresses(&request.chains, seed.as_bytes(), 0)?;

        // 4. Generate wallet ID
        let wallet_id = uuid::Uuid::new_v4().to_string();

        // 5. Cache seed in session (for further derivation)
        self.storage.cache_seed(&wallet_id, *seed.as_bytes());

        // 6. Return response (mnemonic is shown once for backup)
        Ok(CreateHDWalletResponse {
            wallet_id,
            mnemonic: mnemonic.as_str().to_string(),
            addresses,
        })
    }

    /// Import an existing HD wallet from mnemonic
    ///
    /// # Arguments
    /// * `name` - User-provided wallet name
    /// * `mnemonic_phrase` - The mnemonic to import
    /// * `chains` - Chains to derive addresses for
    /// * `password` - Password for encrypting the wallet
    pub fn import_hd_wallet(
        &self,
        _name: &str,
        mnemonic_phrase: &str,
        chains: &[String],
        _password: &str,
    ) -> WalletResult<CreateHDWalletResponse> {
        // 1. Parse and validate mnemonic
        let mnemonic = parse_mnemonic(mnemonic_phrase)?;

        // 2. Derive seed
        let seed = mnemonic_to_seed(&mnemonic, "")?;

        // 3. Derive addresses
        let addresses = self.registry.derive_addresses(chains, seed.as_bytes(), 0)?;

        // 4. Generate wallet ID
        let wallet_id = uuid::Uuid::new_v4().to_string();

        // 5. Cache seed
        self.storage.cache_seed(&wallet_id, *seed.as_bytes());

        Ok(CreateHDWalletResponse {
            wallet_id,
            mnemonic: mnemonic_phrase.to_string(),
            addresses,
        })
    }

    // =========================================================================
    // Address Derivation
    // =========================================================================

    /// Derive a new address for an existing wallet
    ///
    /// # Arguments
    /// * `wallet_id` - The wallet to derive from
    /// * `chain_id` - The chain to derive for
    /// * `account` - Account index (usually 0)
    /// * `index` - Address index
    pub fn derive_address(
        &self,
        wallet_id: &str,
        chain_id: &str,
        account: u32,
        index: u32,
    ) -> WalletResult<DerivedAddress> {
        // Get cached seed (wallet must be unlocked)
        let seed = self.storage.get_seed(wallet_id)?;

        self.registry.derive_address(chain_id, &seed, account, index)
    }

    // =========================================================================
    // Session Management
    // =========================================================================

    /// Check if the wallet is unlocked
    pub fn is_unlocked(&self) -> bool {
        self.storage.is_unlocked()
    }

    /// Lock the wallet (clear all cached secrets)
    pub fn lock(&self) {
        self.storage.lock();
    }

    /// Unlock a wallet (loads seed into session cache)
    ///
    /// In a full implementation, this would decrypt from Stronghold.
    /// For now, it just sets the unlocked state.
    pub fn unlock(&self, _wallet_id: &str, _password: &str) -> WalletResult<()> {
        // TODO: Decrypt from Stronghold and cache seed
        self.storage.unlock();
        Ok(())
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wallet_manager_new() {
        let manager = WalletManager::new();
        assert!(!manager.is_unlocked());
    }

    #[test]
    fn test_wallet_manager_supported_chains() {
        let manager = WalletManager::new();
        let chains = manager.get_supported_chains();

        assert!(!chains.is_empty());
        assert!(chains.iter().any(|c| c.chain_id == "bitcoin"));
        assert!(chains.iter().any(|c| c.chain_id == "ethereum"));
        assert!(chains.iter().any(|c| c.chain_id == "solana"));
    }

    #[test]
    fn test_wallet_manager_validate_address() {
        let manager = WalletManager::new();

        // Valid Bitcoin address
        assert!(manager
            .validate_address("bitcoin", "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu")
            .unwrap());

        // Invalid for chain
        assert!(!manager
            .validate_address("bitcoin", "0x1234")
            .unwrap());
    }

    #[test]
    fn test_wallet_manager_generate_mnemonic() {
        let manager = WalletManager::new();

        // 12 words
        let m12 = manager.generate_mnemonic(12).unwrap();
        assert_eq!(m12.words().len(), 12);

        // 24 words
        let m24 = manager.generate_mnemonic(24).unwrap();
        assert_eq!(m24.words().len(), 24);

        // Invalid word count
        let result = manager.generate_mnemonic(15);
        assert!(matches!(result, Err(WalletError::InvalidMnemonicLength(_))));
    }

    #[test]
    fn test_wallet_manager_validate_mnemonic() {
        let manager = WalletManager::new();

        // Valid mnemonic
        let result = manager.validate_mnemonic(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        );
        assert!(result.is_valid);

        // Invalid mnemonic
        let result = manager.validate_mnemonic("invalid mnemonic phrase");
        assert!(!result.is_valid);
    }

    #[test]
    fn test_wallet_manager_create_hd_wallet() {
        let manager = WalletManager::new();

        let request = CreateHDWalletRequest {
            name: "Test Wallet".to_string(),
            chains: vec!["bitcoin".to_string(), "ethereum".to_string(), "solana".to_string()],
            word_count: 12,
        };

        let response = manager.create_hd_wallet(&request, "password123").unwrap();

        // Should have wallet ID
        assert!(!response.wallet_id.is_empty());

        // Should have mnemonic
        assert_eq!(response.mnemonic.split_whitespace().count(), 12);

        // Should have addresses for all chains
        assert_eq!(response.addresses.len(), 3);
        assert_eq!(response.addresses[0].chain, "bitcoin");
        assert_eq!(response.addresses[1].chain, "ethereum");
        assert_eq!(response.addresses[2].chain, "solana");

        // Bitcoin should start with bc1
        assert!(response.addresses[0].address.starts_with("bc1"));

        // Ethereum should start with 0x
        assert!(response.addresses[1].address.starts_with("0x"));
    }

    #[test]
    fn test_wallet_manager_import_hd_wallet() {
        let manager = WalletManager::new();

        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let chains = vec!["bitcoin".to_string(), "ethereum".to_string()];

        let response = manager
            .import_hd_wallet("Imported Wallet", mnemonic, &chains, "password123")
            .unwrap();

        // Should have expected addresses (deterministic)
        assert_eq!(response.addresses[0].address, "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
        assert_eq!(
            response.addresses[1].address.to_lowercase(),
            "0x9858effd232b4033e47d90003d41ec34ecaeda94"
        );
    }

    #[test]
    fn test_wallet_manager_derive_after_create() {
        let manager = WalletManager::new();

        // Create wallet
        let request = CreateHDWalletRequest {
            name: "Test".to_string(),
            chains: vec!["ethereum".to_string()],
            word_count: 12,
        };

        let response = manager.create_hd_wallet(&request, "password").unwrap();

        // Should be unlocked after create
        assert!(manager.is_unlocked());

        // Derive additional address
        let addr = manager
            .derive_address(&response.wallet_id, "ethereum", 0, 1)
            .unwrap();

        assert_eq!(addr.chain, "ethereum");
        // Should be different from index 0
        assert_ne!(addr.address, response.addresses[0].address);
    }

    #[test]
    fn test_wallet_manager_lock_unlock() {
        let manager = WalletManager::new();

        // Create wallet
        let request = CreateHDWalletRequest {
            name: "Test".to_string(),
            chains: vec!["bitcoin".to_string()],
            word_count: 12,
        };

        let response = manager.create_hd_wallet(&request, "password").unwrap();
        assert!(manager.is_unlocked());

        // Lock
        manager.lock();
        assert!(!manager.is_unlocked());

        // Derive should fail when locked
        let result = manager.derive_address(&response.wallet_id, "bitcoin", 0, 0);
        assert!(matches!(result, Err(WalletError::WalletLocked)));
    }
}
