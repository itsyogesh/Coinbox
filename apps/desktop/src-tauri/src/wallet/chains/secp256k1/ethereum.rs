//! Ethereum chain module (BIP44)
//!
//! Generates 0x... addresses using BIP44 derivation.
//! Path: m/44'/60'/account'/0/index
//!
//! This module is used for Ethereum mainnet and all EVM-compatible chains
//! (Arbitrum, Optimism, Base, Polygon, etc.) since they all share the same
//! address format and derivation.

use k256::ecdsa::SigningKey;
use sha3::{Digest, Keccak256};

use crate::wallet::chains::{coin_types, ChainModule};
use crate::wallet::error::{WalletError, WalletResult};
use crate::wallet::types::{ChainFamily, DerivedAddress};

use super::derive_key_from_seed;

/// Ethereum/EVM chain module
///
/// Works for Ethereum mainnet and all EVM-compatible L2s:
/// - Arbitrum
/// - Optimism
/// - Base
/// - Polygon
/// - etc.
pub struct EthereumModule {
    chain_id: String,
    display_name: String,
    is_testnet: bool,
}

impl EthereumModule {
    /// Create a new Ethereum mainnet module
    pub fn new(chain_id: &str) -> Self {
        let display_name = match chain_id {
            "ethereum" => "Ethereum",
            "arbitrum" => "Arbitrum One",
            "optimism" => "Optimism",
            "base" => "Base",
            "polygon" => "Polygon",
            "avalanche" => "Avalanche C-Chain",
            _ => chain_id,
        };

        Self {
            chain_id: chain_id.to_string(),
            display_name: display_name.to_string(),
            is_testnet: false,
        }
    }

    /// Create a testnet module
    pub fn testnet(chain_id: &str, display_name: &str) -> Self {
        Self {
            chain_id: chain_id.to_string(),
            display_name: display_name.to_string(),
            is_testnet: true,
        }
    }

    /// Ethereum mainnet
    pub fn ethereum() -> Self {
        Self::new("ethereum")
    }

    /// Arbitrum One
    pub fn arbitrum() -> Self {
        Self::new("arbitrum")
    }

    /// Optimism
    pub fn optimism() -> Self {
        Self::new("optimism")
    }

    /// Base
    pub fn base() -> Self {
        Self::new("base")
    }

    /// Polygon
    pub fn polygon() -> Self {
        Self::new("polygon")
    }

    /// Avalanche C-Chain
    pub fn avalanche() -> Self {
        Self::new("avalanche")
    }

    /// Convert address to EIP-55 checksum format
    fn to_checksum_address(address: &str) -> String {
        let address_lower = address.trim_start_matches("0x").to_lowercase();

        // Hash the lowercase address
        let mut hasher = Keccak256::new();
        hasher.update(address_lower.as_bytes());
        let hash = hasher.finalize();
        let hash_hex = hex::encode(hash);

        // Apply checksum
        let mut result = String::with_capacity(42);
        result.push_str("0x");

        for (i, c) in address_lower.chars().enumerate() {
            if c.is_ascii_hexdigit() && !c.is_ascii_digit() {
                // Get the corresponding nibble from the hash
                let hash_char = hash_hex.chars().nth(i).unwrap();
                if hash_char.to_digit(16).unwrap() >= 8 {
                    result.push(c.to_ascii_uppercase());
                } else {
                    result.push(c);
                }
            } else {
                result.push(c);
            }
        }

        result
    }

    /// Validate EIP-55 checksum
    fn is_valid_checksum(address: &str) -> bool {
        if !address.starts_with("0x") || address.len() != 42 {
            return false;
        }

        let addr_without_prefix = &address[2..];

        // If all lowercase or all uppercase, skip checksum validation
        if addr_without_prefix == addr_without_prefix.to_lowercase()
            || addr_without_prefix == addr_without_prefix.to_uppercase()
        {
            return true;
        }

        // Validate checksum
        Self::to_checksum_address(address) == address
    }
}

impl Default for EthereumModule {
    fn default() -> Self {
        Self::ethereum()
    }
}

impl ChainModule for EthereumModule {
    fn chain_id(&self) -> &str {
        &self.chain_id
    }

    fn display_name(&self) -> &str {
        &self.display_name
    }

    fn chain_family(&self) -> ChainFamily {
        ChainFamily::Secp256k1
    }

    fn coin_type(&self) -> u32 {
        coin_types::ETHEREUM
    }

    fn is_testnet(&self) -> bool {
        self.is_testnet
    }

    fn derive_address(
        &self,
        seed: &[u8; 64],
        account: u32,
        index: u32,
    ) -> WalletResult<DerivedAddress> {
        // BIP44 path for Ethereum: m/44'/60'/account'/0/index
        let path = self.derivation_path(account, index);
        let derived_key = derive_key_from_seed(seed, &path)?;

        // Get the private key bytes
        let private_key_bytes = derived_key.private_key().to_bytes();

        // Create signing key
        let signing_key = SigningKey::from_bytes((&private_key_bytes).into())
            .map_err(|e| WalletError::DerivationError(format!("Invalid private key: {}", e)))?;

        // Get the public key (uncompressed)
        let verifying_key = signing_key.verifying_key();
        let public_key_point = verifying_key.to_encoded_point(false);
        let public_key_bytes = public_key_point.as_bytes();

        // Ethereum uses uncompressed public key without the 0x04 prefix
        // Address = last 20 bytes of Keccak256(public_key[1..])
        let public_key_no_prefix = &public_key_bytes[1..]; // Remove 0x04 prefix

        let mut hasher = Keccak256::new();
        hasher.update(public_key_no_prefix);
        let hash = hasher.finalize();

        // Take last 20 bytes
        let address_bytes = &hash[12..];
        let address = format!("0x{}", hex::encode(address_bytes));

        // Apply EIP-55 checksum
        let checksum_address = Self::to_checksum_address(&address);

        Ok(DerivedAddress {
            chain: self.chain_id.clone(),
            chain_family: self.chain_family(),
            address: checksum_address,
            derivation_path: path,
            public_key: public_key_bytes.to_vec(),
        })
    }

    fn validate_address(&self, address: &str) -> bool {
        // Check basic format: 0x followed by 40 hex characters
        if !address.starts_with("0x") || address.len() != 42 {
            return false;
        }

        // Check all characters after 0x are hex
        let addr_without_prefix = &address[2..];
        if !addr_without_prefix.chars().all(|c| c.is_ascii_hexdigit()) {
            return false;
        }

        // Validate checksum if mixed case
        Self::is_valid_checksum(address)
    }

    fn derivation_path(&self, account: u32, index: u32) -> String {
        // Standard BIP44 for Ethereum
        format!("m/44'/{}'/{account}'/0/{index}", self.coin_type())
    }

    fn address_prefix(&self) -> Option<&str> {
        Some("0x")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test seed from mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    fn test_seed() -> [u8; 64] {
        let seed_hex = "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4";
        let mut seed = [0u8; 64];
        hex::decode_to_slice(seed_hex, &mut seed).unwrap();
        seed
    }

    #[test]
    fn test_ethereum_module_chain_id() {
        let module = EthereumModule::ethereum();
        assert_eq!(module.chain_id(), "ethereum");
        assert_eq!(module.display_name(), "Ethereum");
        assert_eq!(module.chain_family(), ChainFamily::Secp256k1);
        assert_eq!(module.coin_type(), 60);
        assert!(!module.is_testnet());
    }

    #[test]
    fn test_evm_chains() {
        let arbitrum = EthereumModule::arbitrum();
        assert_eq!(arbitrum.chain_id(), "arbitrum");
        assert_eq!(arbitrum.display_name(), "Arbitrum One");

        let optimism = EthereumModule::optimism();
        assert_eq!(optimism.chain_id(), "optimism");

        let base = EthereumModule::base();
        assert_eq!(base.chain_id(), "base");

        let polygon = EthereumModule::polygon();
        assert_eq!(polygon.chain_id(), "polygon");
    }

    #[test]
    fn test_ethereum_derivation_path() {
        let module = EthereumModule::ethereum();
        assert_eq!(module.derivation_path(0, 0), "m/44'/60'/0'/0/0");
        assert_eq!(module.derivation_path(0, 5), "m/44'/60'/0'/0/5");
        assert_eq!(module.derivation_path(1, 0), "m/44'/60'/1'/0/0");
    }

    #[test]
    fn test_ethereum_derive_address() {
        let module = EthereumModule::ethereum();
        let seed = test_seed();

        let derived = module.derive_address(&seed, 0, 0).unwrap();

        // Verify the result
        assert_eq!(derived.chain, "ethereum");
        assert_eq!(derived.chain_family, ChainFamily::Secp256k1);
        assert_eq!(derived.derivation_path, "m/44'/60'/0'/0/0");
        assert!(derived.address.starts_with("0x"));
        assert_eq!(derived.address.len(), 42);
        assert_eq!(derived.public_key.len(), 65); // Uncompressed public key (04 + 64 bytes)

        // Known test vector for this seed
        // First Ethereum address should be: 0x9858EfFD232B4033E47d90003D41EC34EcaEda94
        assert_eq!(
            derived.address.to_lowercase(),
            "0x9858effd232b4033e47d90003d41ec34ecaeda94"
        );
    }

    #[test]
    fn test_ethereum_derive_multiple_addresses() {
        let module = EthereumModule::ethereum();
        let seed = test_seed();

        let addr0 = module.derive_address(&seed, 0, 0).unwrap();
        let addr1 = module.derive_address(&seed, 0, 1).unwrap();
        let addr2 = module.derive_address(&seed, 0, 2).unwrap();

        // Each address should be unique
        assert_ne!(addr0.address.to_lowercase(), addr1.address.to_lowercase());
        assert_ne!(addr1.address.to_lowercase(), addr2.address.to_lowercase());
        assert_ne!(addr0.address.to_lowercase(), addr2.address.to_lowercase());

        // All should be 0x addresses
        assert!(addr0.address.starts_with("0x"));
        assert!(addr1.address.starts_with("0x"));
        assert!(addr2.address.starts_with("0x"));
    }

    #[test]
    fn test_eip55_checksum() {
        // Test known checksummed addresses
        let valid_checksum = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
        assert_eq!(
            EthereumModule::to_checksum_address(&valid_checksum.to_lowercase()),
            valid_checksum
        );

        let another_valid = "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359";
        assert_eq!(
            EthereumModule::to_checksum_address(&another_valid.to_lowercase()),
            another_valid
        );
    }

    #[test]
    fn test_ethereum_validate_address_valid() {
        let module = EthereumModule::ethereum();

        // Valid checksummed address
        assert!(module.validate_address("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"));

        // All lowercase (valid - no checksum)
        assert!(module.validate_address("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed"));

        // All uppercase (valid - no checksum)
        assert!(module.validate_address("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED"));
    }

    #[test]
    fn test_ethereum_validate_address_invalid() {
        let module = EthereumModule::ethereum();

        // Invalid addresses
        assert!(!module.validate_address(""));
        assert!(!module.validate_address("not-an-address"));
        assert!(!module.validate_address("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")); // Missing 0x
        assert!(!module.validate_address("0x5aaeb6053f3e94c9b9a09f33669435e7ef1bea")); // Too short
        assert!(!module.validate_address("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaedaa")); // Too long
        assert!(!module.validate_address("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu")); // Bitcoin

        // Invalid checksum (mixed case with wrong checksum)
        assert!(!module.validate_address("0x5AAEB6053F3E94C9b9A09f33669435E7Ef1BeAed"));
    }

    #[test]
    fn test_ethereum_deterministic() {
        let module = EthereumModule::ethereum();
        let seed = test_seed();

        // Same seed + path should always produce same address
        let addr1 = module.derive_address(&seed, 0, 0).unwrap();
        let addr2 = module.derive_address(&seed, 0, 0).unwrap();

        assert_eq!(addr1.address, addr2.address);
        assert_eq!(addr1.public_key, addr2.public_key);
    }

    #[test]
    fn test_evm_same_addresses() {
        let seed = test_seed();

        // All EVM chains should derive the same address from the same seed
        let eth = EthereumModule::ethereum().derive_address(&seed, 0, 0).unwrap();
        let arb = EthereumModule::arbitrum().derive_address(&seed, 0, 0).unwrap();
        let opt = EthereumModule::optimism().derive_address(&seed, 0, 0).unwrap();
        let base = EthereumModule::base().derive_address(&seed, 0, 0).unwrap();
        let poly = EthereumModule::polygon().derive_address(&seed, 0, 0).unwrap();

        // All addresses should be the same (just different chain labels)
        assert_eq!(eth.address, arb.address);
        assert_eq!(eth.address, opt.address);
        assert_eq!(eth.address, base.address);
        assert_eq!(eth.address, poly.address);

        // But chain IDs should differ
        assert_eq!(eth.chain, "ethereum");
        assert_eq!(arb.chain, "arbitrum");
        assert_eq!(opt.chain, "optimism");
    }
}
