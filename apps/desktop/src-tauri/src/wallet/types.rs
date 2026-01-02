//! Core wallet types with secure memory handling

use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

// =============================================================================
// Chain Family
// =============================================================================

/// Cryptographic family for key derivation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChainFamily {
    /// ECDSA on secp256k1 curve (Bitcoin, Ethereum, Cosmos, Avalanche)
    Secp256k1,
    /// EdDSA on Curve25519 (Solana, NEAR)
    Ed25519,
    /// Schnorr on Ristretto (Polkadot, Kusama) - future
    Sr25519,
}

impl std::fmt::Display for ChainFamily {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ChainFamily::Secp256k1 => write!(f, "secp256k1"),
            ChainFamily::Ed25519 => write!(f, "ed25519"),
            ChainFamily::Sr25519 => write!(f, "sr25519"),
        }
    }
}

impl std::str::FromStr for ChainFamily {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "secp256k1" => Ok(ChainFamily::Secp256k1),
            "ed25519" => Ok(ChainFamily::Ed25519),
            "sr25519" => Ok(ChainFamily::Sr25519),
            _ => Err(format!("Unknown chain family: {}", s)),
        }
    }
}

// =============================================================================
// Wallet Types
// =============================================================================

/// Type of wallet
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WalletType {
    /// HD wallet from mnemonic (BIP39/BIP44)
    Hd,
    /// Single private key import
    PrivateKey,
    /// Watch-only (no signing capability)
    WatchOnly,
    /// Hardware wallet (Ledger, Trezor)
    Hardware,
}

impl std::fmt::Display for WalletType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WalletType::Hd => write!(f, "hd"),
            WalletType::PrivateKey => write!(f, "private_key"),
            WalletType::WatchOnly => write!(f, "watch_only"),
            WalletType::Hardware => write!(f, "hardware"),
        }
    }
}

impl std::str::FromStr for WalletType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "hd" => Ok(WalletType::Hd),
            "private_key" => Ok(WalletType::PrivateKey),
            "watch_only" => Ok(WalletType::WatchOnly),
            "hardware" => Ok(WalletType::Hardware),
            _ => Err(format!("Unknown wallet type: {}", s)),
        }
    }
}

// =============================================================================
// Secret Types (Zeroize on drop)
// =============================================================================

/// Mnemonic phrase (securely zeroized on drop)
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretMnemonic(pub String);

impl SecretMnemonic {
    pub fn new(mnemonic: String) -> Self {
        Self(mnemonic)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn words(&self) -> Vec<&str> {
        self.0.split_whitespace().collect()
    }
}

impl std::fmt::Debug for SecretMnemonic {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SecretMnemonic([REDACTED])")
    }
}

/// 512-bit seed derived from mnemonic (securely zeroized on drop)
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretSeed(pub [u8; 64]);

impl SecretSeed {
    pub fn new(seed: [u8; 64]) -> Self {
        Self(seed)
    }

    pub fn as_bytes(&self) -> &[u8; 64] {
        &self.0
    }
}

impl std::fmt::Debug for SecretSeed {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SecretSeed([REDACTED 64 bytes])")
    }
}

/// 256-bit private key (securely zeroized on drop)
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretPrivateKey(pub [u8; 32]);

impl SecretPrivateKey {
    pub fn new(key: [u8; 32]) -> Self {
        Self(key)
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

impl std::fmt::Debug for SecretPrivateKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SecretPrivateKey([REDACTED 32 bytes])")
    }
}

// =============================================================================
// Derived Address
// =============================================================================

/// Result of address derivation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DerivedAddress {
    /// Chain identifier (e.g., "bitcoin", "ethereum", "solana")
    pub chain: String,
    /// Chain family used for derivation
    pub chain_family: ChainFamily,
    /// The derived address string
    pub address: String,
    /// BIP44/SLIP10 derivation path
    pub derivation_path: String,
    /// Public key bytes (for verification)
    #[serde(with = "hex_bytes")]
    pub public_key: Vec<u8>,
}

/// Hex serialization for byte arrays
mod hex_bytes {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&hex::encode(bytes))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        hex::decode(&s).map_err(serde::de::Error::custom)
    }
}

// =============================================================================
// Wallet Info (Public metadata)
// =============================================================================

/// Public wallet information (stored in SQLite)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletInfo {
    pub id: String,
    pub name: String,
    pub wallet_type: WalletType,
    pub fingerprint: Option<String>,
    pub has_backup_verified: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Wallet address entry (stored in SQLite)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletAddress {
    pub id: String,
    pub wallet_id: String,
    pub chain: String,
    pub chain_family: ChainFamily,
    pub address: String,
    pub derivation_path: Option<String>,
    pub account_index: u32,
    pub address_index: u32,
    pub is_primary: bool,
    pub label: Option<String>,
    pub created_at: String,
}

/// Wallet with all its addresses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletWithAddresses {
    pub wallet: WalletInfo,
    pub addresses: Vec<WalletAddress>,
}

// =============================================================================
// Request/Response Types (for Tauri commands)
// =============================================================================

/// Request to create a new HD wallet
#[derive(Debug, Deserialize)]
pub struct CreateHDWalletRequest {
    pub name: String,
    /// Chains to derive addresses for
    pub chains: Vec<String>,
    /// Number of words for the mnemonic (12 or 24), defaults to 12
    #[serde(default = "default_word_count")]
    pub word_count: usize,
}

fn default_word_count() -> usize {
    12
}

/// Request to import an existing mnemonic
#[derive(Debug, Deserialize)]
pub struct ImportHDWalletRequest {
    pub name: String,
    /// The mnemonic phrase to import
    pub mnemonic: String,
    /// Chains to derive addresses for
    pub chains: Vec<String>,
}

/// Response from creating an HD wallet
#[derive(Debug, Serialize)]
pub struct CreateHDWalletResponse {
    pub wallet_id: String,
    /// The mnemonic phrase (ONLY returned once for backup!)
    pub mnemonic: String,
    pub addresses: Vec<DerivedAddress>,
}

/// Request to add a watch-only address
#[derive(Debug, Deserialize)]
pub struct AddWatchOnlyRequest {
    pub name: String,
    pub chain: String,
    pub address: String,
}

/// Request to unlock a wallet
#[derive(Debug, Deserialize)]
pub struct UnlockWalletRequest {
    pub wallet_id: String,
    pub password: String,
}

/// Request to derive a new address
#[derive(Debug, Deserialize)]
pub struct DeriveAddressRequest {
    pub wallet_id: String,
    pub chain: String,
    pub account_index: Option<u32>,
}

/// Request to export mnemonic
#[derive(Debug, Deserialize)]
pub struct ExportMnemonicRequest {
    pub wallet_id: String,
    pub password: String,
}

/// Mnemonic validation result
#[derive(Debug, Serialize)]
pub struct ValidateMnemonicResponse {
    pub is_valid: bool,
    pub word_count: usize,
    pub error: Option<String>,
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chain_family_display() {
        assert_eq!(ChainFamily::Secp256k1.to_string(), "secp256k1");
        assert_eq!(ChainFamily::Ed25519.to_string(), "ed25519");
        assert_eq!(ChainFamily::Sr25519.to_string(), "sr25519");
    }

    #[test]
    fn test_chain_family_parse() {
        assert_eq!(
            "secp256k1".parse::<ChainFamily>().unwrap(),
            ChainFamily::Secp256k1
        );
        assert_eq!(
            "ED25519".parse::<ChainFamily>().unwrap(),
            ChainFamily::Ed25519
        );
        assert!("unknown".parse::<ChainFamily>().is_err());
    }

    #[test]
    fn test_wallet_type_display() {
        assert_eq!(WalletType::Hd.to_string(), "hd");
        assert_eq!(WalletType::WatchOnly.to_string(), "watch_only");
    }

    #[test]
    fn test_secret_mnemonic_debug_redacted() {
        let mnemonic = SecretMnemonic::new("abandon abandon abandon".to_string());
        let debug_str = format!("{:?}", mnemonic);
        assert!(debug_str.contains("REDACTED"));
        assert!(!debug_str.contains("abandon"));
    }

    #[test]
    fn test_secret_seed_debug_redacted() {
        let seed = SecretSeed::new([0u8; 64]);
        let debug_str = format!("{:?}", seed);
        assert!(debug_str.contains("REDACTED"));
    }

    #[test]
    fn test_secret_private_key_debug_redacted() {
        let key = SecretPrivateKey::new([0u8; 32]);
        let debug_str = format!("{:?}", key);
        assert!(debug_str.contains("REDACTED"));
    }

    #[test]
    fn test_derived_address_serialization() {
        let addr = DerivedAddress {
            chain: "ethereum".to_string(),
            chain_family: ChainFamily::Secp256k1,
            address: "0x1234567890abcdef".to_string(),
            derivation_path: "m/44'/60'/0'/0/0".to_string(),
            public_key: vec![0x04, 0x01, 0x02, 0x03],
        };

        let json = serde_json::to_string(&addr).unwrap();
        assert!(json.contains("\"chain\":\"ethereum\""));
        assert!(json.contains("\"chain_family\":\"secp256k1\""));
        assert!(json.contains("\"public_key\":\"04010203\""));

        let parsed: DerivedAddress = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.chain, "ethereum");
        assert_eq!(parsed.public_key, vec![0x04, 0x01, 0x02, 0x03]);
    }
}
