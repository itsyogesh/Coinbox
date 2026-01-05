//! Bitcoin module - BDK integration for Bitcoin wallet operations
//!
//! This module provides full Bitcoin wallet functionality using BDK:
//! - Wallet creation and management
//! - Blockchain synchronization (Electrum/Esplora)
//! - Balance fetching
//! - Transaction history
//! - UTXO management
//! - Fee estimation

mod adapter;
mod types;

pub use adapter::BitcoinAdapter;
pub use types::*;
