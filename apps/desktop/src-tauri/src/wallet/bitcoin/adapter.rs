//! Bitcoin Adapter - BDK integration for Bitcoin wallet operations
//!
//! Provides high-level wallet functionality using Bitcoin Dev Kit (BDK):
//! - Wallet creation from descriptors
//! - Blockchain synchronization via Electrum/Esplora
//! - Balance fetching
//! - Transaction history
//! - UTXO management
//!
//! For single-address watch-only wallets, uses direct Electrum queries
//! since BDK descriptors don't support arbitrary addresses.

use std::path::PathBuf;

use bdk_electrum::electrum_client::{self, ElectrumApi};
use bdk_electrum::BdkElectrumClient;
use bdk_wallet::bitcoin::bip32::{DerivationPath, Xpriv};
use bdk_wallet::bitcoin::secp256k1::Secp256k1;
use bdk_wallet::bitcoin::Network;
use bdk_wallet::chain::ChainPosition;
use bdk_wallet::rusqlite::Connection;
use bdk_wallet::{KeychainKind, PersistedWallet, Wallet};
use bitcoin::Address;
use tracing::{debug, error, info, warn};

use super::types::*;
use crate::error::{Error, Result};

/// Bitcoin wallet adapter for BDK integration
pub struct BitcoinAdapter {
    /// Network configuration
    network: Network,
    /// Electrum server URL
    electrum_url: String,
    /// Gap limit for address discovery
    gap_limit: u32,
    /// Database path for wallet persistence
    db_path: PathBuf,
}

impl BitcoinAdapter {
    /// Create a new Bitcoin adapter with configuration
    pub fn new(config: BitcoinConfig, db_path: PathBuf) -> Self {
        let (network, electrum_url) = match config.backend {
            BlockchainBackend::Electrum { url } => (config.network.into(), url),
            BlockchainBackend::Esplora { url: _ } => {
                // For Esplora, we'll still use Electrum as primary
                // Esplora support can be added as fallback later
                warn!("Esplora backend requested but using Electrum - Esplora support coming soon");
                (
                    config.network.into(),
                    get_default_electrum_url(config.network),
                )
            }
        };

        Self {
            network,
            electrum_url,
            gap_limit: config.gap_limit,
            db_path,
        }
    }

    /// Create adapter with default mainnet configuration
    pub fn mainnet(db_path: PathBuf) -> Self {
        Self::new(BitcoinConfig::default(), db_path)
    }

    /// Create adapter for testnet
    pub fn testnet(db_path: PathBuf) -> Self {
        Self::new(
            BitcoinConfig {
                network: BitcoinNetwork::Testnet,
                backend: BlockchainBackend::Electrum {
                    url: "ssl://electrum.blockstream.info:60002".to_string(),
                },
                gap_limit: 20,
            },
            db_path,
        )
    }

    /// Create a new Electrum client connection
    fn create_electrum_client(&self) -> Result<BdkElectrumClient<electrum_client::Client>> {
        info!("Connecting to Electrum server: {}", self.electrum_url);
        let client = electrum_client::Client::new(&self.electrum_url).map_err(|e| {
            error!("Failed to connect to Electrum: {}", e);
            Error::Bitcoin(format!("Electrum connection failed: {}", e))
        })?;

        Ok(BdkElectrumClient::new(client))
    }

    /// Check if input is a single address (vs xpub)
    pub fn is_single_address(address_or_xpub: &str) -> bool {
        address_or_xpub.starts_with("bc1")
            || address_or_xpub.starts_with("tb1")
            || address_or_xpub.starts_with("1")
            || address_or_xpub.starts_with("3")
            || address_or_xpub.starts_with("m")
            || address_or_xpub.starts_with("n")
            || address_or_xpub.starts_with("2")
    }

    /// Create a watch-only wallet from an xpub
    ///
    /// For xpub: Uses BIP84 (Native SegWit) descriptors with BDK
    /// For single addresses: Use get_address_balance/get_address_transactions directly
    pub fn create_watch_wallet(&self, address_or_xpub: &str, wallet_id: &str) -> Result<()> {
        // Single addresses don't need a BDK wallet - query Electrum directly
        if Self::is_single_address(address_or_xpub) {
            info!("Single address watch wallet created for: {} (no BDK wallet needed)", address_or_xpub);
            // Validate the address format
            address_or_xpub.parse::<Address<bitcoin::address::NetworkUnchecked>>()
                .map_err(|e| Error::Bitcoin(format!("Invalid address: {}", e)))?;
            return Ok(());
        }

        // xpub - use BDK with wpkh descriptor
        let db_path = self.db_path.join(format!("{}.sqlite", wallet_id));
        let descriptor = format!("wpkh({}/<0;1>/*)", address_or_xpub);

        info!("Creating xpub watch wallet");
        debug!("Creating watch wallet with descriptor: {}", descriptor);

        // Create database connection
        let mut conn = Connection::open(&db_path).map_err(|e| {
            Error::Bitcoin(format!("Failed to open wallet database: {}", e))
        })?;

        // Create wallet with descriptor
        let wallet = Wallet::create_single(descriptor.clone())
            .network(self.network)
            .create_wallet(&mut conn)
            .map_err(|e| {
                error!("Failed to create wallet: {}", e);
                Error::Bitcoin(format!("Wallet creation failed: {}", e))
            })?;

        info!(
            "Created watch wallet {} with {} addresses pre-derived",
            wallet_id,
            wallet.spk_index().last_revealed_indices().len()
        );

        Ok(())
    }

    /// Get balance for a single address directly from Electrum
    pub fn get_address_balance(&self, address: &str) -> Result<BitcoinBalance> {
        info!("Fetching balance for address: {}", address);

        // Parse address
        let addr = address.parse::<Address<bitcoin::address::NetworkUnchecked>>()
            .map_err(|e| Error::Bitcoin(format!("Invalid address: {}", e)))?
            .assume_checked();

        let script = addr.script_pubkey();

        // Connect to Electrum
        let client = electrum_client::Client::new(&self.electrum_url).map_err(|e| {
            error!("Failed to connect to Electrum: {}", e);
            Error::Bitcoin(format!("Electrum connection failed: {}", e))
        })?;

        // Query balance
        let balance = client.script_get_balance(&script).map_err(|e| {
            error!("Failed to get balance: {}", e);
            Error::Bitcoin(format!("Balance query failed: {}", e))
        })?;

        info!("Balance for {}: confirmed={}, unconfirmed={}",
              address, balance.confirmed, balance.unconfirmed);

        Ok(BitcoinBalance {
            confirmed: balance.confirmed,
            unconfirmed: balance.unconfirmed as u64,
            immature: 0,
            trusted_spendable: balance.confirmed,
        })
    }

    /// Get transaction history for a single address directly from Electrum
    pub fn get_address_transactions(&self, address: &str) -> Result<Vec<BitcoinTransaction>> {
        info!("Fetching transactions for address: {}", address);

        // Parse address
        let addr = address.parse::<Address<bitcoin::address::NetworkUnchecked>>()
            .map_err(|e| Error::Bitcoin(format!("Invalid address: {}", e)))?
            .assume_checked();

        let script = addr.script_pubkey();

        // Connect to Electrum
        let client = electrum_client::Client::new(&self.electrum_url).map_err(|e| {
            error!("Failed to connect to Electrum: {}", e);
            Error::Bitcoin(format!("Electrum connection failed: {}", e))
        })?;

        // Get current tip height for confirmation count
        let tip_height = client.block_headers_subscribe()
            .map(|h| h.height as u32)
            .unwrap_or(0);

        // Get transaction history
        let history = client.script_get_history(&script).map_err(|e| {
            error!("Failed to get history: {}", e);
            Error::Bitcoin(format!("History query failed: {}", e))
        })?;

        info!("Found {} transactions for {}", history.len(), address);

        // Cache block timestamps to avoid redundant fetches
        let mut block_timestamps: std::collections::HashMap<usize, u64> = std::collections::HashMap::new();

        let mut transactions = Vec::new();

        for item in history {
            let txid = item.tx_hash.to_string();

            // Get full transaction to calculate amount
            let tx = client.transaction_get(&item.tx_hash).map_err(|e| {
                warn!("Failed to get transaction {}: {}", txid, e);
                Error::Bitcoin(format!("Transaction fetch failed: {}", e))
            })?;

            // Calculate received amount for this address
            let mut received: i64 = 0;
            for output in &tx.output {
                if output.script_pubkey == script {
                    received += output.value.to_sat() as i64;
                }
            }

            // Check if any inputs are from this address (sent)
            // This requires fetching previous transactions, which is expensive
            // For simplicity, we'll just track receives for now
            let direction = if received > 0 {
                TransactionDirection::Received
            } else {
                TransactionDirection::Sent
            };

            let (status, timestamp) = if item.height > 0 {
                let height = item.height as u32;
                let height_usize = item.height as usize;
                let confirmations = if tip_height > height {
                    tip_height - height + 1
                } else {
                    1
                };

                // Get block timestamp (cached)
                let block_time = if let Some(&cached_time) = block_timestamps.get(&height_usize) {
                    cached_time
                } else {
                    // Fetch block header to get timestamp
                    let block_time = client.block_header(height_usize)
                        .map(|header| header.time as u64)
                        .unwrap_or(0);
                    block_timestamps.insert(height_usize, block_time);
                    block_time
                };

                (
                    ConfirmationStatus::Confirmed {
                        block_height: height,
                        block_time,
                        confirmations,
                    },
                    Some(block_time),
                )
            } else {
                (ConfirmationStatus::Unconfirmed, None)
            };

            transactions.push(BitcoinTransaction {
                txid,
                direction,
                amount_sats: received,
                fee_sats: None,
                status,
                timestamp,
                addresses: vec![address.to_string()],
                size: Some(tx.total_size() as u32),
                vsize: Some(tx.vsize() as u32),
            });
        }

        // Sort by timestamp (most recent first), then by block height
        transactions.sort_by(|a, b| {
            match (&b.timestamp, &a.timestamp) {
                (Some(t_b), Some(t_a)) => t_b.cmp(t_a),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
        });

        debug!("Retrieved {} transactions for {}", transactions.len(), address);
        Ok(transactions)
    }

    /// Create a full wallet from master seed
    ///
    /// Derives BIP84 keys from the seed:
    /// - External: m/84'/0'/0'/0/*
    /// - Internal: m/84'/0'/0'/1/*
    pub fn create_wallet_from_seed(
        &self,
        seed: &[u8; 64],
        wallet_id: &str,
        account: u32,
    ) -> Result<()> {
        let db_path = self.db_path.join(format!("{}.sqlite", wallet_id));

        let secp = Secp256k1::new();

        // Derive master key from seed
        let master_xpriv = Xpriv::new_master(self.network, seed).map_err(|e| {
            Error::Bitcoin(format!("Failed to derive master key: {}", e))
        })?;

        // BIP84 derivation path for account
        let coin_type = match self.network {
            Network::Bitcoin => 0,
            _ => 1, // Testnet uses coin type 1
        };
        let account_path: DerivationPath = format!("m/84'/{}'/{}'", coin_type, account)
            .parse()
            .map_err(|e| Error::Bitcoin(format!("Invalid derivation path: {}", e)))?;

        let account_xpriv = master_xpriv
            .derive_priv(&secp, &account_path)
            .map_err(|e| Error::Bitcoin(format!("Failed to derive account key: {}", e)))?;

        // Create descriptors with private keys
        let external_desc = format!(
            "wpkh({}/0/*)",
            account_xpriv
        );
        let internal_desc = format!(
            "wpkh({}/1/*)",
            account_xpriv
        );

        debug!("Creating full wallet for account {}", account);

        // Create database connection
        let mut conn = Connection::open(&db_path).map_err(|e| {
            Error::Bitcoin(format!("Failed to open wallet database: {}", e))
        })?;

        // Create wallet with both descriptors
        let _wallet = Wallet::create(external_desc, internal_desc)
            .network(self.network)
            .create_wallet(&mut conn)
            .map_err(|e| {
                error!("Failed to create wallet: {}", e);
                Error::Bitcoin(format!("Wallet creation failed: {}", e))
            })?;

        info!(
            "Created full wallet {} for account {}",
            wallet_id, account
        );

        Ok(())
    }

    /// Load an existing wallet from database
    pub fn load_wallet(&self, wallet_id: &str) -> Result<PersistedWallet<Connection>> {
        let db_path = self.db_path.join(format!("{}.sqlite", wallet_id));

        if !db_path.exists() {
            return Err(Error::Bitcoin(format!(
                "Wallet database not found: {}",
                wallet_id
            )));
        }

        let mut conn = Connection::open(&db_path).map_err(|e| {
            Error::Bitcoin(format!("Failed to open wallet database: {}", e))
        })?;

        let wallet = Wallet::load()
            .load_wallet(&mut conn)
            .map_err(|e| {
                error!("Failed to load wallet: {}", e);
                Error::Bitcoin(format!("Wallet load failed: {}", e))
            })?
            .ok_or_else(|| Error::Bitcoin("Wallet not found in database".to_string()))?;

        debug!("Loaded wallet {}", wallet_id);
        Ok(wallet)
    }

    /// Sync wallet with blockchain
    pub fn sync_wallet(&self, wallet: &mut PersistedWallet<Connection>) -> Result<SyncProgress> {
        info!("Starting wallet sync...");

        let client = self.create_electrum_client()?;

        // Get the sync request from wallet
        let request = wallet.start_full_scan().inspect({
            let mut count = 0;
            move |_keychain, _spk_i, _script| {
                count += 1;
                if count % 10 == 0 {
                    debug!("Scanned {} scripts", count);
                }
            }
        });

        // Perform the sync
        let update = client
            .full_scan(request, 5, self.gap_limit as usize, false)
            .map_err(|e| {
                error!("Sync failed: {}", e);
                Error::Bitcoin(format!("Blockchain sync failed: {}", e))
            })?;

        // Apply the update to wallet
        wallet.apply_update(update).map_err(|e| {
            error!("Failed to apply sync update: {}", e);
            Error::Bitcoin(format!("Failed to apply sync: {}", e))
        })?;

        info!("Wallet sync complete");

        Ok(SyncProgress {
            stage: SyncStage::Complete,
            progress: 100.0,
            message: Some("Sync complete".to_string()),
        })
    }

    /// Get wallet balance
    pub fn get_balance(&self, wallet: &PersistedWallet<Connection>) -> Result<BitcoinBalance> {
        let balance = wallet.balance();

        Ok(BitcoinBalance {
            confirmed: balance.confirmed.to_sat(),
            unconfirmed: balance.untrusted_pending.to_sat(),
            immature: balance.immature.to_sat(),
            trusted_spendable: balance.trusted_spendable().to_sat(),
        })
    }

    /// Get transaction history
    pub fn get_transactions(&self, wallet: &PersistedWallet<Connection>) -> Result<Vec<BitcoinTransaction>> {
        let mut transactions = Vec::new();

        // Get all transactions from wallet
        for tx in wallet.transactions() {
            let txid = tx.tx_node.txid.to_string();

            // Calculate amount (positive = received, negative = sent)
            let mut received: i64 = 0;
            let sent: i64 = 0;

            for output in tx.tx_node.tx.output.iter() {
                if wallet.is_mine(output.script_pubkey.clone()) {
                    received += output.value.to_sat() as i64;
                }
            }

            // For sent transactions, we need to check inputs
            // This is a simplified calculation
            let amount_sats = received - sent;

            let direction = if amount_sats > 0 {
                TransactionDirection::Received
            } else if amount_sats < 0 {
                TransactionDirection::Sent
            } else {
                TransactionDirection::Internal
            };

            // Get confirmation status using struct pattern matching
            let status = match &tx.chain_position {
                ChainPosition::Confirmed { anchor, .. } => {
                    ConfirmationStatus::Confirmed {
                        block_height: anchor.block_id.height,
                        block_time: anchor.confirmation_time,
                        confirmations: 0, // Would need current height to calculate
                    }
                }
                ChainPosition::Unconfirmed { .. } => {
                    ConfirmationStatus::Unconfirmed
                }
            };

            let timestamp = match &status {
                ConfirmationStatus::Confirmed { block_time, .. } => Some(*block_time),
                ConfirmationStatus::Unconfirmed => None,
            };

            // Collect addresses
            let addresses: Vec<String> = tx
                .tx_node
                .tx
                .output
                .iter()
                .filter_map(|o| {
                    bitcoin::Address::from_script(&o.script_pubkey, self.network)
                        .ok()
                        .map(|a| a.to_string())
                })
                .collect();

            let fee_sats = wallet.calculate_fee(&tx.tx_node.tx).ok().map(|f| f.to_sat());

            transactions.push(BitcoinTransaction {
                txid,
                direction,
                amount_sats,
                fee_sats,
                status,
                timestamp,
                addresses,
                size: Some(tx.tx_node.tx.total_size() as u32),
                vsize: Some(tx.tx_node.tx.vsize() as u32),
            });
        }

        // Sort by timestamp (most recent first)
        transactions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        debug!("Retrieved {} transactions", transactions.len());
        Ok(transactions)
    }

    /// Get list of UTXOs
    pub fn get_utxos(&self, wallet: &PersistedWallet<Connection>) -> Result<Vec<UtxoInfo>> {
        let utxos = wallet
            .list_unspent()
            .map(|utxo| {
                let address = bitcoin::Address::from_script(
                    &utxo.txout.script_pubkey,
                    self.network,
                )
                .map(|a| a.to_string())
                .unwrap_or_else(|_| "unknown".to_string());

                let (is_confirmed, block_height) = match &utxo.chain_position {
                    ChainPosition::Confirmed { anchor, .. } => {
                        (true, Some(anchor.block_id.height))
                    }
                    ChainPosition::Unconfirmed { .. } => (false, None),
                };

                UtxoInfo {
                    txid: utxo.outpoint.txid.to_string(),
                    vout: utxo.outpoint.vout,
                    amount_sats: utxo.txout.value.to_sat(),
                    address,
                    is_confirmed,
                    block_height,
                }
            })
            .collect();

        Ok(utxos)
    }

    /// Get fee estimate for target confirmation blocks
    pub fn estimate_fee(&self, target_blocks: u32) -> Result<FeeEstimate> {
        let client = self.create_electrum_client()?;

        let fee_rate = client
            .inner
            .estimate_fee(target_blocks as usize)
            .map_err(|e| Error::Bitcoin(format!("Fee estimation failed: {}", e)))?;

        // Convert from BTC/kB to sat/vB
        let sat_per_vbyte = (fee_rate * 100_000.0) as f32;

        Ok(FeeEstimate {
            sat_per_vbyte,
            target_blocks,
        })
    }

    /// Get a new receiving address
    pub fn get_new_address(&self, wallet: &mut PersistedWallet<Connection>) -> Result<String> {
        let address = wallet.reveal_next_address(KeychainKind::External);
        Ok(address.address.to_string())
    }

    /// Get current network
    pub fn network(&self) -> BitcoinNetwork {
        self.network.into()
    }

    /// Create, sign, and optionally broadcast a Bitcoin transaction
    ///
    /// Returns the signed transaction hex and txid
    pub fn create_and_send_transaction(
        &self,
        wallet: &mut PersistedWallet<Connection>,
        recipient_address: &str,
        amount_sats: u64,
        fee_rate: f32, // sat/vB
        broadcast: bool,
    ) -> Result<SendTransactionResult> {
        use bdk_wallet::bitcoin::Amount;
        use bdk_wallet::SignOptions;

        info!(
            "Creating transaction: {} sats to {} at {} sat/vB",
            amount_sats, recipient_address, fee_rate
        );

        // Parse recipient address
        let address = recipient_address
            .parse::<Address<bitcoin::address::NetworkUnchecked>>()
            .map_err(|e| Error::Bitcoin(format!("Invalid recipient address: {}", e)))?
            .require_network(self.network)
            .map_err(|e| Error::Bitcoin(format!("Address network mismatch: {}", e)))?;

        // Build the transaction
        let mut tx_builder = wallet.build_tx();
        tx_builder
            .add_recipient(address.script_pubkey(), Amount::from_sat(amount_sats))
            .fee_rate(bdk_wallet::bitcoin::FeeRate::from_sat_per_vb(fee_rate as u64).unwrap());

        let mut psbt = tx_builder.finish().map_err(|e| {
            error!("Failed to build transaction: {}", e);
            Error::Bitcoin(format!("Transaction build failed: {}", e))
        })?;

        // Sign the transaction
        let finalized = wallet.sign(&mut psbt, SignOptions::default()).map_err(|e| {
            error!("Failed to sign transaction: {}", e);
            Error::Bitcoin(format!("Transaction signing failed: {}", e))
        })?;

        if !finalized {
            return Err(Error::Bitcoin(
                "Transaction not fully signed - missing keys".to_string(),
            ));
        }

        // Extract the signed transaction
        let tx = psbt.extract_tx().map_err(|e| {
            Error::Bitcoin(format!("Failed to extract transaction: {}", e))
        })?;

        let txid = tx.compute_txid().to_string();
        let tx_hex = bitcoin::consensus::encode::serialize_hex(&tx);
        let fee_sats = wallet.calculate_fee(&tx).ok().map(|f| f.to_sat());
        let vsize = tx.vsize() as u32;

        info!("Transaction created: {} (fee: {:?} sats, vsize: {})", txid, fee_sats, vsize);

        // Optionally broadcast
        if broadcast {
            let client = self.create_electrum_client()?;
            client.inner.transaction_broadcast(&tx).map_err(|e| {
                error!("Failed to broadcast transaction: {}", e);
                Error::Bitcoin(format!("Transaction broadcast failed: {}", e))
            })?;
            info!("Transaction broadcast: {}", txid);
        }

        Ok(SendTransactionResult {
            txid,
            tx_hex,
            fee_sats,
            vsize,
            broadcast,
        })
    }
}

/// Get default Electrum URL for a network
fn get_default_electrum_url(network: BitcoinNetwork) -> String {
    match network {
        BitcoinNetwork::Mainnet => "ssl://electrum.blockstream.info:50002".to_string(),
        BitcoinNetwork::Testnet => "ssl://electrum.blockstream.info:60002".to_string(),
        BitcoinNetwork::Signet => "ssl://mempool.space:60602".to_string(),
        BitcoinNetwork::Regtest => "tcp://127.0.0.1:50001".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_adapter_creation() {
        let temp_dir = TempDir::new().unwrap();
        let adapter = BitcoinAdapter::mainnet(temp_dir.path().to_path_buf());
        assert_eq!(adapter.network, Network::Bitcoin);
    }

    #[test]
    fn test_testnet_adapter() {
        let temp_dir = TempDir::new().unwrap();
        let adapter = BitcoinAdapter::testnet(temp_dir.path().to_path_buf());
        assert_eq!(adapter.network, Network::Testnet);
    }
}
