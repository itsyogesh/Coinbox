//! Secp256k1 chain implementations (Bitcoin, Ethereum, Cosmos, Avalanche)
//!
//! All chains in this module use the secp256k1 elliptic curve with ECDSA signatures.
//! Key derivation follows BIP32/BIP44 standards.

pub mod bitcoin;
pub mod ethereum;

// Common utilities for secp256k1 chains

use bip32::{ChildNumber, DerivationPath, XPrv};

use crate::wallet::error::{WalletError, WalletResult};

/// Derive a child extended private key from seed using BIP32
///
/// # Arguments
/// * `seed` - 64-byte master seed
/// * `path` - Derivation path string (e.g., "m/44'/60'/0'/0/0")
///
/// # Returns
/// The derived extended private key
pub fn derive_key_from_seed(seed: &[u8; 64], path: &str) -> WalletResult<XPrv> {
    let path: DerivationPath = path
        .parse()
        .map_err(|e| WalletError::DerivationError(format!("Invalid path '{}': {}", path, e)))?;

    let master = XPrv::new(seed)
        .map_err(|e| WalletError::DerivationError(format!("Failed to create master key: {}", e)))?;

    // Derive through each path component
    let mut derived = master;
    for child_number in path.as_ref() {
        derived = derived
            .derive_child(*child_number)
            .map_err(|e| WalletError::DerivationError(format!("Derivation failed: {}", e)))?;
    }

    Ok(derived)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    // Seed (hex): 5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4
    fn test_seed() -> [u8; 64] {
        let seed_hex = "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4";
        let mut seed = [0u8; 64];
        hex::decode_to_slice(seed_hex, &mut seed).unwrap();
        seed
    }

    #[test]
    fn test_derive_key_from_seed() {
        let seed = test_seed();
        let key = derive_key_from_seed(&seed, "m/44'/60'/0'/0/0").unwrap();
        assert!(key.private_key().to_bytes().len() == 32);
    }

    #[test]
    fn test_derive_key_invalid_path() {
        let seed = test_seed();
        let result = derive_key_from_seed(&seed, "invalid/path");
        assert!(result.is_err());
    }
}
