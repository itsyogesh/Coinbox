//! Chain Registry for dynamic chain dispatch
//!
//! This module provides a registry of all supported blockchain chains.
//! It enables dynamic dispatch to chain-specific implementations for:
//! - Address derivation
//! - Address validation
//! - Chain metadata queries
//!
//! # Extensibility
//!
//! To add a new chain:
//! 1. Create a new module in `chains/` implementing `ChainModule`
//! 2. Register it in `ChainRegistry::new()`
//!
//! No changes needed to WalletManager, commands, or frontend!

use std::collections::HashMap;
use std::sync::Arc;

use crate::wallet::chains::{BitcoinModule, ChainModule, EthereumModule, SolanaModule};
use crate::wallet::error::{WalletError, WalletResult};
use crate::wallet::types::{ChainFamily, DerivedAddress};

/// Information about a supported chain
#[derive(Debug, Clone, serde::Serialize)]
pub struct ChainInfo {
    /// Unique chain identifier (e.g., "ethereum", "bitcoin")
    pub id: String,
    /// Human-readable display name
    pub name: String,
    /// Token symbol (e.g., "ETH", "BTC")
    pub symbol: String,
    /// Cryptographic family (secp256k1, ed25519, etc.)
    pub family: ChainFamily,
    /// SLIP-44 coin type
    pub coin_type: u32,
    /// Whether this is a testnet
    pub is_testnet: bool,
    /// Icon name for frontend
    pub icon_name: String,
}

/// Registry of all supported blockchain chains
///
/// Provides dynamic dispatch to chain-specific implementations.
pub struct ChainRegistry {
    /// Registered chain modules by chain_id
    modules: HashMap<String, Arc<dyn ChainModule>>,
}

impl Default for ChainRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl ChainRegistry {
    /// Create a new registry with all supported chains
    pub fn new() -> Self {
        let mut registry = Self {
            modules: HashMap::new(),
        };

        // =========================================================================
        // Secp256k1 Family (Bitcoin, Ethereum, EVMs)
        // =========================================================================

        // Bitcoin
        registry.register(Arc::new(BitcoinModule::new()));

        // Ethereum and EVM-compatible chains
        registry.register(Arc::new(EthereumModule::ethereum()));
        registry.register(Arc::new(EthereumModule::arbitrum()));
        registry.register(Arc::new(EthereumModule::optimism()));
        registry.register(Arc::new(EthereumModule::base()));
        registry.register(Arc::new(EthereumModule::polygon()));

        // =========================================================================
        // Ed25519 Family (Solana, NEAR)
        // =========================================================================

        // Solana
        registry.register(Arc::new(SolanaModule::new()));

        // TODO: Add more chains as needed
        // registry.register(Arc::new(CosmosModule::new()));
        // registry.register(Arc::new(NearModule::new()));

        registry
    }

    /// Register a chain module
    fn register(&mut self, module: Arc<dyn ChainModule>) {
        self.modules.insert(module.chain_id().to_string(), module);
    }

    /// Get a chain module by ID
    pub fn get(&self, chain_id: &str) -> Option<&Arc<dyn ChainModule>> {
        self.modules.get(chain_id)
    }

    /// Get all registered chain IDs
    pub fn chain_ids(&self) -> Vec<String> {
        self.modules.keys().cloned().collect()
    }

    /// Get info about all supported chains
    pub fn all_chains(&self) -> Vec<ChainInfo> {
        self.modules
            .values()
            .map(|m| ChainInfo {
                id: m.chain_id().to_string(),
                name: m.display_name().to_string(),
                symbol: m.symbol().to_string(),
                family: m.chain_family(),
                coin_type: m.coin_type(),
                is_testnet: m.is_testnet(),
                icon_name: m.icon_name().to_string(),
            })
            .collect()
    }

    /// Get chains by family
    pub fn chains_by_family(&self, family: ChainFamily) -> Vec<ChainInfo> {
        self.all_chains()
            .into_iter()
            .filter(|c| c.family == family)
            .collect()
    }

    /// Get mainnet chains only
    pub fn mainnet_chains(&self) -> Vec<ChainInfo> {
        self.all_chains()
            .into_iter()
            .filter(|c| !c.is_testnet)
            .collect()
    }

    /// Check if a chain is supported
    pub fn is_supported(&self, chain_id: &str) -> bool {
        self.modules.contains_key(chain_id)
    }

    /// Validate an address for a specific chain
    pub fn validate_address(&self, chain_id: &str, address: &str) -> WalletResult<bool> {
        let module = self
            .modules
            .get(chain_id)
            .ok_or_else(|| WalletError::UnsupportedChain(chain_id.to_string()))?;

        Ok(module.validate_address(address))
    }

    /// Derive an address for a specific chain
    pub fn derive_address(
        &self,
        chain_id: &str,
        seed: &[u8; 64],
        account: u32,
        index: u32,
    ) -> WalletResult<DerivedAddress> {
        let module = self
            .modules
            .get(chain_id)
            .ok_or_else(|| WalletError::UnsupportedChain(chain_id.to_string()))?;

        module.derive_address(seed, account, index)
    }

    /// Derive addresses for multiple chains at once
    pub fn derive_addresses(
        &self,
        chain_ids: &[String],
        seed: &[u8; 64],
        account: u32,
    ) -> WalletResult<Vec<DerivedAddress>> {
        chain_ids
            .iter()
            .map(|chain_id| self.derive_address(chain_id, seed, account, 0))
            .collect()
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn test_seed() -> [u8; 64] {
        let seed_hex = "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4";
        let mut seed = [0u8; 64];
        hex::decode_to_slice(seed_hex, &mut seed).unwrap();
        seed
    }

    #[test]
    fn test_registry_new() {
        let registry = ChainRegistry::new();

        // Should have common chains registered
        assert!(registry.is_supported("bitcoin"));
        assert!(registry.is_supported("ethereum"));
        assert!(registry.is_supported("solana"));
        assert!(registry.is_supported("arbitrum"));
        assert!(registry.is_supported("optimism"));
        assert!(registry.is_supported("base"));
        assert!(registry.is_supported("polygon"));

        // Unknown chain should not be supported
        assert!(!registry.is_supported("unknown"));
    }

    #[test]
    fn test_registry_get() {
        let registry = ChainRegistry::new();

        let eth = registry.get("ethereum").unwrap();
        assert_eq!(eth.chain_id(), "ethereum");
        assert_eq!(eth.chain_family(), ChainFamily::Secp256k1);

        let sol = registry.get("solana").unwrap();
        assert_eq!(sol.chain_id(), "solana");
        assert_eq!(sol.chain_family(), ChainFamily::Ed25519);
    }

    #[test]
    fn test_registry_chain_ids() {
        let registry = ChainRegistry::new();
        let ids = registry.chain_ids();

        assert!(ids.contains(&"bitcoin".to_string()));
        assert!(ids.contains(&"ethereum".to_string()));
        assert!(ids.contains(&"solana".to_string()));
    }

    #[test]
    fn test_registry_all_chains() {
        let registry = ChainRegistry::new();
        let chains = registry.all_chains();

        // Should have multiple chains
        assert!(chains.len() >= 7);

        // Check bitcoin
        let btc = chains.iter().find(|c| c.id == "bitcoin").unwrap();
        assert_eq!(btc.name, "Bitcoin");
        assert_eq!(btc.symbol, "BTC");
        assert_eq!(btc.family, ChainFamily::Secp256k1);
        assert!(!btc.is_testnet);

        // Check solana
        let sol = chains.iter().find(|c| c.id == "solana").unwrap();
        assert_eq!(sol.name, "Solana");
        assert_eq!(sol.symbol, "SOL");
        assert_eq!(sol.family, ChainFamily::Ed25519);
    }

    #[test]
    fn test_registry_chains_by_family() {
        let registry = ChainRegistry::new();

        let secp_chains = registry.chains_by_family(ChainFamily::Secp256k1);
        assert!(secp_chains.len() >= 6); // Bitcoin + EVMs

        let ed_chains = registry.chains_by_family(ChainFamily::Ed25519);
        assert!(!ed_chains.is_empty()); // At least Solana
    }

    #[test]
    fn test_registry_mainnet_chains() {
        let registry = ChainRegistry::new();
        let mainnets = registry.mainnet_chains();

        // All should be mainnets
        for chain in &mainnets {
            assert!(!chain.is_testnet, "{} should be mainnet", chain.id);
        }
    }

    #[test]
    fn test_registry_validate_address() {
        let registry = ChainRegistry::new();

        // Valid Bitcoin address
        assert!(registry
            .validate_address("bitcoin", "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu")
            .unwrap());

        // Valid Ethereum address
        assert!(registry
            .validate_address("ethereum", "0x9858EfFD232B4033E47d90003D41EC34EcaEda94")
            .unwrap());

        // Invalid for chain
        assert!(!registry
            .validate_address("bitcoin", "0x9858EfFD232B4033E47d90003D41EC34EcaEda94")
            .unwrap());

        // Unsupported chain
        assert!(registry.validate_address("unknown", "whatever").is_err());
    }

    #[test]
    fn test_registry_derive_address() {
        let registry = ChainRegistry::new();
        let seed = test_seed();

        // Derive Bitcoin
        let btc = registry.derive_address("bitcoin", &seed, 0, 0).unwrap();
        assert_eq!(btc.chain, "bitcoin");
        assert!(btc.address.starts_with("bc1"));

        // Derive Ethereum
        let eth = registry.derive_address("ethereum", &seed, 0, 0).unwrap();
        assert_eq!(eth.chain, "ethereum");
        assert!(eth.address.starts_with("0x"));

        // Derive Solana
        let sol = registry.derive_address("solana", &seed, 0, 0).unwrap();
        assert_eq!(sol.chain, "solana");
        assert!(!sol.address.is_empty());
    }

    #[test]
    fn test_registry_derive_addresses() {
        let registry = ChainRegistry::new();
        let seed = test_seed();

        let chains = vec![
            "bitcoin".to_string(),
            "ethereum".to_string(),
            "solana".to_string(),
        ];

        let addresses = registry.derive_addresses(&chains, &seed, 0).unwrap();

        assert_eq!(addresses.len(), 3);
        assert_eq!(addresses[0].chain, "bitcoin");
        assert_eq!(addresses[1].chain, "ethereum");
        assert_eq!(addresses[2].chain, "solana");
    }

    #[test]
    fn test_registry_derive_unsupported_chain() {
        let registry = ChainRegistry::new();
        let seed = test_seed();

        let result = registry.derive_address("unknown", &seed, 0, 0);
        assert!(matches!(result, Err(WalletError::UnsupportedChain(_))));
    }

    #[test]
    fn test_evm_chains_same_address() {
        let registry = ChainRegistry::new();
        let seed = test_seed();

        // All EVM chains should produce the same address
        let eth = registry.derive_address("ethereum", &seed, 0, 0).unwrap();
        let arb = registry.derive_address("arbitrum", &seed, 0, 0).unwrap();
        let opt = registry.derive_address("optimism", &seed, 0, 0).unwrap();
        let base = registry.derive_address("base", &seed, 0, 0).unwrap();
        let poly = registry.derive_address("polygon", &seed, 0, 0).unwrap();

        assert_eq!(eth.address, arb.address);
        assert_eq!(eth.address, opt.address);
        assert_eq!(eth.address, base.address);
        assert_eq!(eth.address, poly.address);
    }
}
