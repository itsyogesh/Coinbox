//! Solana chain module (SLIP-0010 Ed25519)
//!
//! Generates Base58 addresses using SLIP-0010 derivation.
//! Path: m/44'/501'/account'/index' (all hardened)
//!
//! Solana addresses are the Base58-encoded Ed25519 public key (32 bytes).

use crate::wallet::chains::{coin_types, ChainModule};
use crate::wallet::error::WalletResult;
use crate::wallet::types::{ChainFamily, DerivedAddress};

use super::{create_signing_key, slip10_derive_path};

/// Solana chain module
pub struct SolanaModule {
    is_devnet: bool,
}

impl SolanaModule {
    /// Create a new Solana mainnet module
    pub fn new() -> Self {
        Self { is_devnet: false }
    }

    /// Create a Solana devnet module
    pub fn devnet() -> Self {
        Self { is_devnet: true }
    }

    /// Validate Base58 string
    fn is_valid_base58(s: &str) -> bool {
        // Base58 alphabet (Bitcoin variant, used by Solana)
        const BASE58_CHARS: &str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

        s.chars().all(|c| BASE58_CHARS.contains(c))
    }
}

impl Default for SolanaModule {
    fn default() -> Self {
        Self::new()
    }
}

impl ChainModule for SolanaModule {
    fn chain_id(&self) -> &str {
        if self.is_devnet {
            "solana_devnet"
        } else {
            "solana"
        }
    }

    fn display_name(&self) -> &str {
        if self.is_devnet {
            "Solana Devnet"
        } else {
            "Solana"
        }
    }

    fn chain_family(&self) -> ChainFamily {
        ChainFamily::Ed25519
    }

    fn coin_type(&self) -> u32 {
        coin_types::SOLANA
    }

    fn is_testnet(&self) -> bool {
        self.is_devnet
    }

    fn symbol(&self) -> &str {
        "SOL"
    }

    fn derive_address(
        &self,
        seed: &[u8; 64],
        account: u32,
        index: u32,
    ) -> WalletResult<DerivedAddress> {
        // SLIP-0010 path for Solana: m/44'/501'/account'/index'
        // Note: All components are hardened in SLIP-0010 Ed25519
        let path = [44, coin_types::SOLANA, account, index];
        let derivation_path = self.derivation_path(account, index);

        // Derive private key using SLIP-0010
        let private_key = slip10_derive_path(seed, &path)?;

        // Create signing key and get public key
        let signing_key = create_signing_key(&private_key)?;
        let public_key = signing_key.verifying_key();
        let public_key_bytes = public_key.as_bytes();

        // Solana address is Base58-encoded public key
        let address = bs58::encode(public_key_bytes).into_string();

        Ok(DerivedAddress {
            chain: self.chain_id().to_string(),
            chain_family: self.chain_family(),
            address,
            derivation_path,
            public_key: public_key_bytes.to_vec(),
        })
    }

    fn validate_address(&self, address: &str) -> bool {
        // Solana addresses are Base58-encoded 32-byte public keys
        // Valid length is typically 32-44 characters

        // Check length
        if address.len() < 32 || address.len() > 44 {
            return false;
        }

        // Check Base58 validity
        if !Self::is_valid_base58(address) {
            return false;
        }

        // Try to decode and check length
        match bs58::decode(address).into_vec() {
            Ok(bytes) => bytes.len() == 32,
            Err(_) => false,
        }
    }

    fn derivation_path(&self, account: u32, index: u32) -> String {
        // SLIP-0010 Ed25519 uses all hardened paths
        format!("m/44'/{}'/{}'/{}'" , self.coin_type(), account, index)
    }

    fn address_prefix(&self) -> Option<&str> {
        None // Solana addresses don't have a prefix
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
    fn test_solana_module_chain_id() {
        let module = SolanaModule::new();
        assert_eq!(module.chain_id(), "solana");
        assert_eq!(module.display_name(), "Solana");
        assert_eq!(module.chain_family(), ChainFamily::Ed25519);
        assert_eq!(module.coin_type(), 501);
        assert!(!module.is_testnet());
    }

    #[test]
    fn test_solana_devnet_module() {
        let module = SolanaModule::devnet();
        assert_eq!(module.chain_id(), "solana_devnet");
        assert!(module.is_testnet());
    }

    #[test]
    fn test_solana_derivation_path() {
        let module = SolanaModule::new();
        // Note: All components hardened in SLIP-0010
        assert_eq!(module.derivation_path(0, 0), "m/44'/501'/0'/0'");
        assert_eq!(module.derivation_path(0, 5), "m/44'/501'/0'/5'");
        assert_eq!(module.derivation_path(1, 0), "m/44'/501'/1'/0'");
    }

    #[test]
    fn test_solana_derive_address() {
        let module = SolanaModule::new();
        let seed = test_seed();

        let derived = module.derive_address(&seed, 0, 0).unwrap();

        // Verify the result
        assert_eq!(derived.chain, "solana");
        assert_eq!(derived.chain_family, ChainFamily::Ed25519);
        assert_eq!(derived.derivation_path, "m/44'/501'/0'/0'");
        assert_eq!(derived.public_key.len(), 32); // Ed25519 public key

        // Address should be Base58 encoded
        assert!(SolanaModule::is_valid_base58(&derived.address));
        assert!(derived.address.len() >= 32 && derived.address.len() <= 44);

        // Decode and verify it matches public key
        let decoded = bs58::decode(&derived.address).into_vec().unwrap();
        assert_eq!(decoded, derived.public_key);
    }

    #[test]
    fn test_solana_derive_multiple_addresses() {
        let module = SolanaModule::new();
        let seed = test_seed();

        let addr0 = module.derive_address(&seed, 0, 0).unwrap();
        let addr1 = module.derive_address(&seed, 0, 1).unwrap();
        let addr2 = module.derive_address(&seed, 0, 2).unwrap();

        // Each address should be unique
        assert_ne!(addr0.address, addr1.address);
        assert_ne!(addr1.address, addr2.address);
        assert_ne!(addr0.address, addr2.address);

        // All should be valid Base58
        assert!(SolanaModule::is_valid_base58(&addr0.address));
        assert!(SolanaModule::is_valid_base58(&addr1.address));
        assert!(SolanaModule::is_valid_base58(&addr2.address));
    }

    #[test]
    fn test_solana_validate_address_valid() {
        let module = SolanaModule::new();

        // Valid Solana addresses (32 bytes, Base58)
        assert!(module.validate_address("11111111111111111111111111111111")); // System program
        assert!(module.validate_address("So11111111111111111111111111111111111111112")); // SOL mint

        // Generate a real address and validate it
        let seed = test_seed();
        let derived = module.derive_address(&seed, 0, 0).unwrap();
        assert!(module.validate_address(&derived.address));
    }

    #[test]
    fn test_solana_validate_address_invalid() {
        let module = SolanaModule::new();

        // Invalid addresses
        assert!(!module.validate_address(""));
        assert!(!module.validate_address("not-an-address"));
        assert!(!module.validate_address("0x1234567890abcdef")); // Ethereum format
        assert!(!module.validate_address("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu")); // Bitcoin
        assert!(!module.validate_address("abc")); // Too short

        // Invalid Base58 characters (0, O, I, l are not in Base58)
        assert!(!module.validate_address("0lllllllllllllllllllllllllllllll"));
        assert!(!module.validate_address("OOOOOOOOOOOOOOOOOOOOOOOOOOoooooo"));
    }

    #[test]
    fn test_solana_deterministic() {
        let module = SolanaModule::new();
        let seed = test_seed();

        // Same seed + path should always produce same address
        let addr1 = module.derive_address(&seed, 0, 0).unwrap();
        let addr2 = module.derive_address(&seed, 0, 0).unwrap();

        assert_eq!(addr1.address, addr2.address);
        assert_eq!(addr1.public_key, addr2.public_key);
    }

    #[test]
    fn test_base58_validation() {
        // Valid Base58
        assert!(SolanaModule::is_valid_base58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"));

        // Invalid (contains 0, O, I, l)
        assert!(!SolanaModule::is_valid_base58("0"));
        assert!(!SolanaModule::is_valid_base58("O"));
        assert!(!SolanaModule::is_valid_base58("I"));
        assert!(!SolanaModule::is_valid_base58("l"));
    }
}
