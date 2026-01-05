//! Bitcoin-specific types for BDK integration
//!
//! Defines the data structures used for Bitcoin wallet operations,
//! balance tracking, and transaction history.

use serde::{Deserialize, Serialize};

/// Bitcoin network configuration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BitcoinNetwork {
    /// Bitcoin mainnet
    Mainnet,
    /// Bitcoin testnet
    Testnet,
    /// Bitcoin signet (testing network)
    Signet,
    /// Bitcoin regtest (local testing)
    Regtest,
}

impl Default for BitcoinNetwork {
    fn default() -> Self {
        Self::Mainnet
    }
}

impl From<BitcoinNetwork> for bitcoin::Network {
    fn from(network: BitcoinNetwork) -> Self {
        match network {
            BitcoinNetwork::Mainnet => bitcoin::Network::Bitcoin,
            BitcoinNetwork::Testnet => bitcoin::Network::Testnet,
            BitcoinNetwork::Signet => bitcoin::Network::Signet,
            BitcoinNetwork::Regtest => bitcoin::Network::Regtest,
        }
    }
}

impl From<bitcoin::Network> for BitcoinNetwork {
    fn from(network: bitcoin::Network) -> Self {
        match network {
            bitcoin::Network::Bitcoin => BitcoinNetwork::Mainnet,
            bitcoin::Network::Testnet => BitcoinNetwork::Testnet,
            bitcoin::Network::Signet => BitcoinNetwork::Signet,
            bitcoin::Network::Regtest => BitcoinNetwork::Regtest,
            _ => BitcoinNetwork::Mainnet,
        }
    }
}

/// Backend type for blockchain synchronization
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BlockchainBackend {
    /// Electrum server (lightweight, common)
    Electrum {
        url: String,
    },
    /// Esplora HTTP API (blockstream.info compatible)
    Esplora {
        url: String,
    },
}

impl Default for BlockchainBackend {
    fn default() -> Self {
        // Default to Blockstream's mainnet Electrum server
        Self::Electrum {
            url: "ssl://electrum.blockstream.info:50002".to_string(),
        }
    }
}

/// Bitcoin balance breakdown
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BitcoinBalance {
    /// Confirmed balance in satoshis
    pub confirmed: u64,
    /// Unconfirmed balance (pending transactions) in satoshis
    pub unconfirmed: u64,
    /// Immature balance (coinbase rewards not yet spendable) in satoshis
    pub immature: u64,
    /// Total trusted balance (confirmed + trusted pending) in satoshis
    pub trusted_spendable: u64,
}

impl BitcoinBalance {
    /// Get total balance including unconfirmed
    pub fn total(&self) -> u64 {
        self.confirmed.saturating_add(self.unconfirmed)
    }

    /// Format balance as BTC string
    pub fn as_btc(&self) -> f64 {
        self.total() as f64 / 100_000_000.0
    }

    /// Format confirmed balance as BTC string
    pub fn confirmed_btc(&self) -> f64 {
        self.confirmed as f64 / 100_000_000.0
    }
}

/// Transaction direction relative to wallet
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionDirection {
    /// Incoming transaction (received funds)
    Received,
    /// Outgoing transaction (sent funds)
    Sent,
    /// Internal transaction (self-transfer, consolidation)
    Internal,
}

/// Confirmation status of a transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ConfirmationStatus {
    /// Transaction is confirmed in a block
    Confirmed {
        /// Block height where transaction was confirmed
        block_height: u32,
        /// Block timestamp (Unix timestamp)
        block_time: u64,
        /// Number of confirmations
        confirmations: u32,
    },
    /// Transaction is in the mempool (unconfirmed)
    Unconfirmed,
}

/// Bitcoin transaction information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BitcoinTransaction {
    /// Transaction ID (txid)
    pub txid: String,
    /// Transaction direction
    pub direction: TransactionDirection,
    /// Amount transferred in satoshis (positive for received, negative for sent)
    pub amount_sats: i64,
    /// Transaction fee in satoshis (only for sent transactions)
    pub fee_sats: Option<u64>,
    /// Confirmation status
    pub status: ConfirmationStatus,
    /// Transaction timestamp (block time if confirmed, first seen if unconfirmed)
    pub timestamp: Option<u64>,
    /// Addresses involved (receiving addresses for sent, our addresses for received)
    pub addresses: Vec<String>,
    /// Raw transaction size in bytes
    pub size: Option<u32>,
    /// Virtual size in vbytes (for fee calculation)
    pub vsize: Option<u32>,
}

impl BitcoinTransaction {
    /// Get amount in BTC (positive for received, negative for sent)
    pub fn amount_btc(&self) -> f64 {
        self.amount_sats as f64 / 100_000_000.0
    }

    /// Get fee in BTC
    pub fn fee_btc(&self) -> Option<f64> {
        self.fee_sats.map(|f| f as f64 / 100_000_000.0)
    }

    /// Check if transaction is confirmed
    pub fn is_confirmed(&self) -> bool {
        matches!(self.status, ConfirmationStatus::Confirmed { .. })
    }

    /// Get number of confirmations (0 if unconfirmed)
    pub fn confirmations(&self) -> u32 {
        match &self.status {
            ConfirmationStatus::Confirmed { confirmations, .. } => *confirmations,
            ConfirmationStatus::Unconfirmed => 0,
        }
    }
}

/// UTXO (Unspent Transaction Output) information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UtxoInfo {
    /// Transaction ID containing this UTXO
    pub txid: String,
    /// Output index within the transaction
    pub vout: u32,
    /// Amount in satoshis
    pub amount_sats: u64,
    /// Address that owns this UTXO
    pub address: String,
    /// Whether this UTXO is confirmed
    pub is_confirmed: bool,
    /// Block height if confirmed
    pub block_height: Option<u32>,
}

/// Sync progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProgress {
    /// Current sync stage
    pub stage: SyncStage,
    /// Progress percentage (0.0 - 100.0)
    pub progress: f32,
    /// Optional message describing current operation
    pub message: Option<String>,
}

/// Sync stage enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStage {
    /// Connecting to backend
    Connecting,
    /// Scanning for transactions
    Scanning,
    /// Updating local database
    Updating,
    /// Sync complete
    Complete,
    /// Sync failed
    Failed,
}

/// Fee rate estimation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeEstimate {
    /// Fee rate in satoshis per vbyte
    pub sat_per_vbyte: f32,
    /// Target confirmation blocks
    pub target_blocks: u32,
}

/// Result of a send transaction operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendTransactionResult {
    /// Transaction ID
    pub txid: String,
    /// Raw signed transaction hex
    pub tx_hex: String,
    /// Fee paid in satoshis
    pub fee_sats: Option<u64>,
    /// Virtual size in vbytes
    pub vsize: u32,
    /// Whether the transaction was broadcast
    pub broadcast: bool,
}

/// Configuration for Bitcoin adapter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BitcoinConfig {
    /// Network to use
    pub network: BitcoinNetwork,
    /// Blockchain backend configuration
    pub backend: BlockchainBackend,
    /// Gap limit for address discovery
    pub gap_limit: u32,
}

impl Default for BitcoinConfig {
    fn default() -> Self {
        Self {
            network: BitcoinNetwork::Mainnet,
            backend: BlockchainBackend::default(),
            gap_limit: 20,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_balance_conversion() {
        let balance = BitcoinBalance {
            confirmed: 100_000_000, // 1 BTC
            unconfirmed: 50_000_000, // 0.5 BTC
            immature: 0,
            trusted_spendable: 100_000_000,
        };

        assert_eq!(balance.total(), 150_000_000);
        assert!((balance.as_btc() - 1.5).abs() < 0.0001);
        assert!((balance.confirmed_btc() - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_transaction_conversion() {
        let tx = BitcoinTransaction {
            txid: "abc123".to_string(),
            direction: TransactionDirection::Received,
            amount_sats: 100_000_000,
            fee_sats: Some(1000),
            status: ConfirmationStatus::Confirmed {
                block_height: 800000,
                block_time: 1700000000,
                confirmations: 6,
            },
            timestamp: Some(1700000000),
            addresses: vec!["bc1q...".to_string()],
            size: Some(250),
            vsize: Some(140),
        };

        assert!((tx.amount_btc() - 1.0).abs() < 0.0001);
        assert!(tx.is_confirmed());
        assert_eq!(tx.confirmations(), 6);
    }

    #[test]
    fn test_network_conversion() {
        assert_eq!(
            bitcoin::Network::from(BitcoinNetwork::Mainnet),
            bitcoin::Network::Bitcoin
        );
        assert_eq!(
            BitcoinNetwork::from(bitcoin::Network::Testnet),
            BitcoinNetwork::Testnet
        );
    }
}
