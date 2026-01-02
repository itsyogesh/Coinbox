//! Bitcoin chain module (BIP84 Native SegWit)
//!
//! Generates bc1... addresses using BIP84 derivation (Native SegWit / P2WPKH).
//! Path: m/84'/0'/account'/0/index

use bitcoin::secp256k1::{PublicKey, Secp256k1};
use bitcoin::{Address, CompressedPublicKey, Network};

use crate::wallet::chains::{coin_types, ChainModule};
use crate::wallet::error::{WalletError, WalletResult};
use crate::wallet::types::{ChainFamily, DerivedAddress};

use super::derive_key_from_seed;

/// Bitcoin chain module for mainnet
pub struct BitcoinModule {
    network: Network,
}

impl BitcoinModule {
    /// Create a new Bitcoin mainnet module
    pub fn new() -> Self {
        Self {
            network: Network::Bitcoin,
        }
    }

    /// Create a Bitcoin testnet module
    pub fn testnet() -> Self {
        Self {
            network: Network::Testnet,
        }
    }
}

impl Default for BitcoinModule {
    fn default() -> Self {
        Self::new()
    }
}

impl ChainModule for BitcoinModule {
    fn chain_id(&self) -> &str {
        match self.network {
            Network::Bitcoin => "bitcoin",
            Network::Testnet | Network::Signet => "bitcoin_testnet",
            Network::Regtest => "bitcoin_regtest",
            _ => "bitcoin",
        }
    }

    fn display_name(&self) -> &str {
        match self.network {
            Network::Bitcoin => "Bitcoin",
            Network::Testnet | Network::Signet => "Bitcoin Testnet",
            Network::Regtest => "Bitcoin Regtest",
            _ => "Bitcoin",
        }
    }

    fn chain_family(&self) -> ChainFamily {
        ChainFamily::Secp256k1
    }

    fn coin_type(&self) -> u32 {
        coin_types::BITCOIN
    }

    fn is_testnet(&self) -> bool {
        matches!(self.network, Network::Testnet | Network::Signet | Network::Regtest)
    }

    fn derive_address(
        &self,
        seed: &[u8; 64],
        account: u32,
        index: u32,
    ) -> WalletResult<DerivedAddress> {
        // BIP84 path for Native SegWit: m/84'/0'/account'/0/index
        let path = self.derivation_path(account, index);
        let derived_key = derive_key_from_seed(seed, &path)?;

        // Get the private key bytes
        let private_key_bytes = derived_key.private_key().to_bytes();

        // Create secp256k1 context and derive public key
        let secp = Secp256k1::new();
        let secret_key = bitcoin::secp256k1::SecretKey::from_slice(&private_key_bytes)
            .map_err(|e| WalletError::DerivationError(format!("Invalid private key: {}", e)))?;
        let public_key = PublicKey::from_secret_key(&secp, &secret_key);

        // Create compressed public key for address generation
        let compressed_pk = CompressedPublicKey(public_key);

        // Generate P2WPKH (Native SegWit) address
        let address = Address::p2wpkh(&compressed_pk, self.network);

        Ok(DerivedAddress {
            chain: self.chain_id().to_string(),
            chain_family: self.chain_family(),
            address: address.to_string(),
            derivation_path: path,
            public_key: public_key.serialize().to_vec(),
        })
    }

    fn validate_address(&self, address: &str) -> bool {
        // Try to parse as a Bitcoin address
        match address.parse::<Address<_>>() {
            Ok(_) => {
                // Check network matches by prefix
                match self.network {
                    Network::Bitcoin => {
                        // Mainnet addresses start with 1, 3, or bc1
                        address.starts_with('1')
                            || address.starts_with('3')
                            || address.starts_with("bc1")
                    }
                    Network::Testnet | Network::Signet => {
                        // Testnet addresses start with m, n, 2, or tb1
                        address.starts_with('m')
                            || address.starts_with('n')
                            || address.starts_with('2')
                            || address.starts_with("tb1")
                    }
                    _ => true, // Allow if parsed successfully
                }
            }
            Err(_) => false,
        }
    }

    fn derivation_path(&self, account: u32, index: u32) -> String {
        // BIP84 for Native SegWit
        // Note: All levels except the last two are hardened (')
        format!("m/84'/{}'/{account}'/0/{index}", self.coin_type())
    }

    fn address_prefix(&self) -> Option<&str> {
        match self.network {
            Network::Bitcoin => Some("bc1"),
            Network::Testnet | Network::Signet => Some("tb1"),
            _ => None,
        }
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
    fn test_bitcoin_module_chain_id() {
        let module = BitcoinModule::new();
        assert_eq!(module.chain_id(), "bitcoin");
        assert_eq!(module.chain_family(), ChainFamily::Secp256k1);
        assert_eq!(module.coin_type(), 0);
        assert!(!module.is_testnet());
    }

    #[test]
    fn test_bitcoin_testnet_module() {
        let module = BitcoinModule::testnet();
        assert_eq!(module.chain_id(), "bitcoin_testnet");
        assert!(module.is_testnet());
    }

    #[test]
    fn test_bitcoin_derivation_path() {
        let module = BitcoinModule::new();
        assert_eq!(module.derivation_path(0, 0), "m/84'/0'/0'/0/0");
        assert_eq!(module.derivation_path(0, 5), "m/84'/0'/0'/0/5");
        assert_eq!(module.derivation_path(1, 0), "m/84'/0'/1'/0/0");
    }

    #[test]
    fn test_bitcoin_derive_address() {
        let module = BitcoinModule::new();
        let seed = test_seed();

        let derived = module.derive_address(&seed, 0, 0).unwrap();

        // Verify the result
        assert_eq!(derived.chain, "bitcoin");
        assert_eq!(derived.chain_family, ChainFamily::Secp256k1);
        assert_eq!(derived.derivation_path, "m/84'/0'/0'/0/0");
        assert!(derived.address.starts_with("bc1"));
        assert_eq!(derived.public_key.len(), 33); // Compressed public key

        // Known test vector for this seed (BIP84)
        // First address should be: bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu
        assert_eq!(derived.address, "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
    }

    #[test]
    fn test_bitcoin_derive_multiple_addresses() {
        let module = BitcoinModule::new();
        let seed = test_seed();

        let addr0 = module.derive_address(&seed, 0, 0).unwrap();
        let addr1 = module.derive_address(&seed, 0, 1).unwrap();
        let addr2 = module.derive_address(&seed, 0, 2).unwrap();

        // Each address should be unique
        assert_ne!(addr0.address, addr1.address);
        assert_ne!(addr1.address, addr2.address);
        assert_ne!(addr0.address, addr2.address);

        // All should be bc1 addresses
        assert!(addr0.address.starts_with("bc1"));
        assert!(addr1.address.starts_with("bc1"));
        assert!(addr2.address.starts_with("bc1"));
    }

    #[test]
    fn test_bitcoin_validate_address_valid() {
        let module = BitcoinModule::new();

        // Native SegWit (bc1...)
        assert!(module.validate_address("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"));

        // Legacy P2PKH (1...)
        assert!(module.validate_address("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"));

        // P2SH (3...)
        assert!(module.validate_address("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"));
    }

    #[test]
    fn test_bitcoin_validate_address_invalid() {
        let module = BitcoinModule::new();

        // Invalid addresses
        assert!(!module.validate_address(""));
        assert!(!module.validate_address("not-an-address"));
        assert!(!module.validate_address("0x1234567890abcdef")); // Ethereum format

        // Testnet address on mainnet
        assert!(!module.validate_address("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"));
    }

    #[test]
    fn test_bitcoin_deterministic() {
        let module = BitcoinModule::new();
        let seed = test_seed();

        // Same seed + path should always produce same address
        let addr1 = module.derive_address(&seed, 0, 0).unwrap();
        let addr2 = module.derive_address(&seed, 0, 0).unwrap();

        assert_eq!(addr1.address, addr2.address);
        assert_eq!(addr1.public_key, addr2.public_key);
    }
}
