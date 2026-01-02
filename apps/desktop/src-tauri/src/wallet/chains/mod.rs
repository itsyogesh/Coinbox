//! Chain modules for multi-chain key derivation
//!
//! This module defines the `ChainModule` trait which provides a common interface
//! for deriving addresses across different blockchains. Each chain family
//! (secp256k1, ed25519, sr25519) has its own sub-module with specific implementations.
//!
//! # Architecture
//!
//! ```text
//!                    ┌─────────────────────────────────┐
//!                    │          ChainModule            │
//!                    │           (trait)               │
//!                    └─────────────────────────────────┘
//!                                   │
//!            ┌──────────────────────┼──────────────────────┐
//!            │                      │                      │
//!            ▼                      ▼                      ▼
//!     ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
//!     │ Secp256k1   │        │   Ed25519   │        │   Sr25519   │
//!     │   Module    │        │   Module    │        │   Module    │
//!     └─────────────┘        └─────────────┘        └─────────────┘
//!            │                      │                      │
//!     ┌──────┼──────┐          ┌────┴────┐           (future)
//!     ▼      ▼      ▼          ▼         ▼
//!  Bitcoin  ETH   Cosmos    Solana    NEAR
//! ```

pub mod secp256k1;
pub mod ed25519;

use async_trait::async_trait;

use crate::wallet::error::WalletResult;
use crate::wallet::types::{ChainFamily, DerivedAddress};

/// SLIP-0044 coin types for BIP44 derivation
pub mod coin_types {
    /// Bitcoin
    pub const BITCOIN: u32 = 0;
    /// Ethereum (and all EVM chains)
    pub const ETHEREUM: u32 = 60;
    /// Cosmos Hub
    pub const COSMOS: u32 = 118;
    /// NEAR Protocol
    pub const NEAR: u32 = 397;
    /// Polkadot
    pub const POLKADOT: u32 = 354;
    /// Solana
    pub const SOLANA: u32 = 501;
    /// Avalanche
    pub const AVALANCHE: u32 = 9000;
}

/// Trait for chain-specific key derivation and address generation
///
/// Each blockchain implements this trait to provide:
/// - Address derivation from a master seed
/// - Address validation
/// - Chain metadata
///
/// # Example Implementation
///
/// ```ignore
/// pub struct BitcoinModule;
///
/// impl ChainModule for BitcoinModule {
///     fn chain_id(&self) -> &str { "bitcoin" }
///     fn chain_family(&self) -> ChainFamily { ChainFamily::Secp256k1 }
///     fn coin_type(&self) -> u32 { 0 }
///
///     fn derive_address(&self, seed: &[u8; 64], account: u32, index: u32)
///         -> WalletResult<DerivedAddress> {
///         // BIP84 derivation for Native SegWit
///     }
/// }
/// ```
#[async_trait]
pub trait ChainModule: Send + Sync {
    /// Unique identifier for this chain (e.g., "bitcoin", "ethereum", "solana")
    fn chain_id(&self) -> &str;

    /// Display name for the chain
    fn display_name(&self) -> &str {
        self.chain_id()
    }

    /// Which cryptographic family this chain uses
    fn chain_family(&self) -> ChainFamily;

    /// SLIP-0044 coin type for BIP44 derivation
    fn coin_type(&self) -> u32;

    /// Whether this chain is a testnet
    fn is_testnet(&self) -> bool {
        false
    }

    /// Derive an address from a master seed
    ///
    /// # Arguments
    /// * `seed` - 64-byte master seed from BIP39
    /// * `account` - Account index (0, 1, 2...)
    /// * `index` - Address index within the account
    ///
    /// # Returns
    /// `DerivedAddress` containing the address and derivation info
    fn derive_address(
        &self,
        seed: &[u8; 64],
        account: u32,
        index: u32,
    ) -> WalletResult<DerivedAddress>;

    /// Validate an address string for this chain
    ///
    /// # Arguments
    /// * `address` - The address string to validate
    ///
    /// # Returns
    /// `true` if the address is valid for this chain
    fn validate_address(&self, address: &str) -> bool;

    /// Get the derivation path for this chain
    ///
    /// # Arguments
    /// * `account` - Account index
    /// * `index` - Address index
    ///
    /// # Returns
    /// The full derivation path string (e.g., "m/44'/60'/0'/0/0")
    fn derivation_path(&self, account: u32, index: u32) -> String;

    /// Get the address prefix or format hint for display
    fn address_prefix(&self) -> Option<&str> {
        None
    }
}

// Re-export specific chain modules
pub use secp256k1::bitcoin::BitcoinModule;
pub use secp256k1::ethereum::EthereumModule;
pub use ed25519::solana::SolanaModule;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_coin_types() {
        assert_eq!(coin_types::BITCOIN, 0);
        assert_eq!(coin_types::ETHEREUM, 60);
        assert_eq!(coin_types::SOLANA, 501);
    }
}
