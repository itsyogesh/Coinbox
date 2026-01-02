//! Ed25519 chain implementations (Solana, NEAR)
//!
//! All chains in this module use the Ed25519 elliptic curve with EdDSA signatures.
//! Key derivation follows SLIP-0010 standard (all hardened paths).

pub mod solana;

use ed25519_dalek::SigningKey;
use sha2::{Digest, Sha512};

use crate::wallet::error::{WalletError, WalletResult};

/// SLIP-0010 master key derivation for Ed25519
///
/// Unlike BIP32, Ed25519 uses a different algorithm for key derivation
/// as specified in SLIP-0010.
///
/// # Arguments
/// * `seed` - 64-byte master seed from BIP39
///
/// # Returns
/// Tuple of (key, chain_code)
pub fn slip10_master_key(seed: &[u8; 64]) -> WalletResult<([u8; 32], [u8; 32])> {
    use hmac::{Hmac, Mac};

    // SLIP-0010 uses HMAC-SHA512 with key "ed25519 seed"
    let mut mac = Hmac::<Sha512>::new_from_slice(b"ed25519 seed")
        .map_err(|e| WalletError::DerivationError(format!("HMAC init failed: {}", e)))?;

    mac.update(seed);
    let result = mac.finalize().into_bytes();

    let mut key = [0u8; 32];
    let mut chain_code = [0u8; 32];

    key.copy_from_slice(&result[..32]);
    chain_code.copy_from_slice(&result[32..]);

    Ok((key, chain_code))
}

/// SLIP-0010 hardened child key derivation for Ed25519
///
/// Ed25519 ONLY supports hardened derivation. Non-hardened derivation is not possible
/// due to the curve's mathematical properties.
///
/// # Arguments
/// * `parent_key` - 32-byte parent private key
/// * `parent_chain_code` - 32-byte parent chain code
/// * `index` - Child index (will be ORed with 0x80000000 for hardened)
///
/// # Returns
/// Tuple of (child_key, child_chain_code)
pub fn slip10_derive_child(
    parent_key: &[u8; 32],
    parent_chain_code: &[u8; 32],
    index: u32,
) -> WalletResult<([u8; 32], [u8; 32])> {
    use hmac::{Hmac, Mac};

    // For hardened derivation: 0x00 || parent_key || index (big endian)
    // Index must be >= 0x80000000 for hardened
    let hardened_index = index | 0x80000000;

    let mut data = Vec::with_capacity(37);
    data.push(0x00); // Prefix for hardened derivation
    data.extend_from_slice(parent_key);
    data.extend_from_slice(&hardened_index.to_be_bytes());

    let mut mac = Hmac::<Sha512>::new_from_slice(parent_chain_code)
        .map_err(|e| WalletError::DerivationError(format!("HMAC init failed: {}", e)))?;

    mac.update(&data);
    let result = mac.finalize().into_bytes();

    let mut child_key = [0u8; 32];
    let mut child_chain_code = [0u8; 32];

    child_key.copy_from_slice(&result[..32]);
    child_chain_code.copy_from_slice(&result[32..]);

    Ok((child_key, child_chain_code))
}

/// Derive Ed25519 key from seed using SLIP-0010 path
///
/// # Arguments
/// * `seed` - 64-byte master seed
/// * `path` - Array of path indices (without hardening bit, will be added)
///
/// # Returns
/// The derived 32-byte private key
pub fn slip10_derive_path(seed: &[u8; 64], path: &[u32]) -> WalletResult<[u8; 32]> {
    let (mut key, mut chain_code) = slip10_master_key(seed)?;

    for &index in path {
        let (new_key, new_chain_code) = slip10_derive_child(&key, &chain_code, index)?;
        key = new_key;
        chain_code = new_chain_code;
    }

    Ok(key)
}

/// Create Ed25519 signing key from derived private key
pub fn create_signing_key(private_key: &[u8; 32]) -> WalletResult<SigningKey> {
    // ed25519-dalek 2.x: from_bytes returns SigningKey directly (infallible for 32 bytes)
    Ok(SigningKey::from_bytes(private_key))
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
    fn test_slip10_master_key() {
        let seed = test_seed();
        let (key, chain_code) = slip10_master_key(&seed).unwrap();

        // Verify lengths
        assert_eq!(key.len(), 32);
        assert_eq!(chain_code.len(), 32);

        // Key should be usable
        let signing_key = create_signing_key(&key).unwrap();
        let _public_key = signing_key.verifying_key();
    }

    #[test]
    fn test_slip10_derive_child() {
        let seed = test_seed();
        let (master_key, master_chain_code) = slip10_master_key(&seed).unwrap();

        let (child_key, child_chain_code) =
            slip10_derive_child(&master_key, &master_chain_code, 44).unwrap();

        // Child should be different from master
        assert_ne!(child_key, master_key);
        assert_ne!(child_chain_code, master_chain_code);
    }

    #[test]
    fn test_slip10_derive_path() {
        let seed = test_seed();

        // Solana path: m/44'/501'/0'/0'
        let path = [44, 501, 0, 0];
        let derived_key = slip10_derive_path(&seed, &path).unwrap();

        // Key should be 32 bytes
        assert_eq!(derived_key.len(), 32);

        // Should create valid signing key
        let signing_key = create_signing_key(&derived_key).unwrap();
        let public_key = signing_key.verifying_key();
        assert_eq!(public_key.as_bytes().len(), 32);
    }

    #[test]
    fn test_slip10_deterministic() {
        let seed = test_seed();
        let path = [44, 501, 0, 0];

        // Same seed + path should always produce same key
        let key1 = slip10_derive_path(&seed, &path).unwrap();
        let key2 = slip10_derive_path(&seed, &path).unwrap();

        assert_eq!(key1, key2);
    }

    #[test]
    fn test_slip10_different_paths() {
        let seed = test_seed();

        let key1 = slip10_derive_path(&seed, &[44, 501, 0, 0]).unwrap();
        let key2 = slip10_derive_path(&seed, &[44, 501, 0, 1]).unwrap();
        let key3 = slip10_derive_path(&seed, &[44, 501, 1, 0]).unwrap();

        // Different paths should produce different keys
        assert_ne!(key1, key2);
        assert_ne!(key2, key3);
        assert_ne!(key1, key3);
    }
}
