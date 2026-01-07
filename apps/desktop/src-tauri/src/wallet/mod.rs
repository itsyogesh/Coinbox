//! Wallet core module
//!
//! This module provides the core wallet functionality for Coinbox:
//! - BIP39 mnemonic generation and validation
//! - Multi-chain key derivation (secp256k1 + ed25519)
//! - Secure storage (via Stronghold)
//! - Chain registry for extensibility
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                        wallet module                             │
//! ├─────────────────────────────────────────────────────────────────┤
//! │                                                                  │
//! │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
//! │  │  mnemonic   │  │   chains    │  │        storage           │ │
//! │  │             │  │             │  │                          │ │
//! │  │ - generate  │  │ - secp256k1 │  │ - Stronghold integration │ │
//! │  │ - validate  │  │   - bitcoin │  │ - encrypt/decrypt        │ │
//! │  │ - to_seed   │  │   - ethereum│  │ - session management     │ │
//! │  │             │  │ - ed25519   │  │                          │ │
//! │  └─────────────┘  │   - solana  │  └──────────────────────────┘ │
//! │                   │             │                                │
//! │  ┌─────────────┐  └─────────────┘  ┌──────────────────────────┐ │
//! │  │   types     │                   │        registry          │ │
//! │  │             │                   │                          │ │
//! │  │ - Secret*   │                   │ - ChainRegistry          │ │
//! │  │ - Derived*  │                   │ - dynamic dispatch       │ │
//! │  │ - Wallet*   │                   │                          │ │
//! │  └─────────────┘                   └──────────────────────────┘ │
//! │                                                                  │
//! └─────────────────────────────────────────────────────────────────┘
//! ```

pub mod bitcoin;
pub mod chains;
pub mod core;
pub mod error;
pub mod mnemonic;
pub mod registry;
pub mod storage;
pub mod types;

// Re-export commonly used items
pub use bitcoin::{BitcoinAdapter, BitcoinBalance, BitcoinConfig, BitcoinNetwork, BitcoinTransaction};
pub use chains::{BitcoinModule, ChainModule, EthereumModule, SolanaModule};
pub use core::WalletManager;
pub use error::{WalletError, WalletResult};
pub use mnemonic::{generate_mnemonic, mnemonic_to_seed, parse_mnemonic, validate_mnemonic, MnemonicLength};
pub use types::{
    ChainFamily, CreateHDWalletRequest, CreateHDWalletResponse, DerivedAddress, SecretMnemonic,
    SecretPrivateKey, SecretSeed, ValidateMnemonicResponse, WalletAddress, WalletInfo, WalletType,
    WalletWithAddresses,
};

#[cfg(test)]
mod tests {
    use super::*;

    /// Integration test: Generate mnemonic → derive addresses for all chains
    #[test]
    fn test_full_wallet_creation_flow() {
        // 1. Generate mnemonic
        let mnemonic = generate_mnemonic(MnemonicLength::Words12).unwrap();
        assert_eq!(mnemonic.words().len(), 12);

        // 2. Validate mnemonic
        let validation = validate_mnemonic(mnemonic.as_str());
        assert!(validation.is_valid);

        // 3. Convert to seed
        let seed = mnemonic_to_seed(&mnemonic, "").unwrap();
        assert_eq!(seed.as_bytes().len(), 64);

        // 4. Derive Bitcoin address
        let bitcoin = BitcoinModule::new();
        let btc_addr = bitcoin.derive_address(seed.as_bytes(), 0, 0).unwrap();
        assert!(btc_addr.address.starts_with("bc1"));
        assert_eq!(btc_addr.chain_family, ChainFamily::Secp256k1);

        // 5. Derive Ethereum address
        let ethereum = EthereumModule::ethereum();
        let eth_addr = ethereum.derive_address(seed.as_bytes(), 0, 0).unwrap();
        assert!(eth_addr.address.starts_with("0x"));
        assert_eq!(eth_addr.chain_family, ChainFamily::Secp256k1);

        // 6. Derive Solana address
        let solana = SolanaModule::new();
        let sol_addr = solana.derive_address(seed.as_bytes(), 0, 0).unwrap();
        assert!(sol_addr.address.len() >= 32);
        assert_eq!(sol_addr.chain_family, ChainFamily::Ed25519);

        // 7. Verify all addresses are different
        assert_ne!(btc_addr.address, eth_addr.address);
        assert_ne!(eth_addr.address, sol_addr.address);
    }

    /// Test that the same mnemonic always produces the same addresses
    #[test]
    fn test_deterministic_derivation() {
        let test_mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

        let mnemonic = parse_mnemonic(test_mnemonic).unwrap();
        let seed = mnemonic_to_seed(&mnemonic, "").unwrap();

        // Expected addresses for this mnemonic
        let btc = BitcoinModule::new().derive_address(seed.as_bytes(), 0, 0).unwrap();
        let eth = EthereumModule::ethereum().derive_address(seed.as_bytes(), 0, 0).unwrap();
        let sol = SolanaModule::new().derive_address(seed.as_bytes(), 0, 0).unwrap();

        // Known test vectors
        assert_eq!(btc.address, "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
        assert_eq!(eth.address.to_lowercase(), "0x9858effd232b4033e47d90003d41ec34ecaeda94");
        // Solana address for this seed (verify manually once)
        assert!(!sol.address.is_empty());
    }

    /// Test that EVM chains share the same address
    #[test]
    fn test_evm_chains_share_address() {
        let mnemonic = parse_mnemonic(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        ).unwrap();
        let seed = mnemonic_to_seed(&mnemonic, "").unwrap();

        let eth = EthereumModule::ethereum().derive_address(seed.as_bytes(), 0, 0).unwrap();
        let arb = EthereumModule::arbitrum().derive_address(seed.as_bytes(), 0, 0).unwrap();
        let opt = EthereumModule::optimism().derive_address(seed.as_bytes(), 0, 0).unwrap();
        let base = EthereumModule::base().derive_address(seed.as_bytes(), 0, 0).unwrap();
        let poly = EthereumModule::polygon().derive_address(seed.as_bytes(), 0, 0).unwrap();

        // All EVM chains should have the same address
        assert_eq!(eth.address, arb.address);
        assert_eq!(eth.address, opt.address);
        assert_eq!(eth.address, base.address);
        assert_eq!(eth.address, poly.address);
    }

    /// Test address validation
    #[test]
    fn test_address_validation() {
        let bitcoin = BitcoinModule::new();
        let ethereum = EthereumModule::ethereum();
        let solana = SolanaModule::new();

        // Valid addresses for each chain
        assert!(bitcoin.validate_address("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"));
        assert!(ethereum.validate_address("0x9858EfFD232B4033E47d90003D41EC34EcaEda94"));
        assert!(solana.validate_address("11111111111111111111111111111111"));

        // Invalid: wrong format for chain
        assert!(!bitcoin.validate_address("0x9858EfFD232B4033E47d90003D41EC34EcaEda94"));
        assert!(!ethereum.validate_address("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"));
        assert!(!solana.validate_address("0x9858EfFD232B4033E47d90003D41EC34EcaEda94"));
    }
}
