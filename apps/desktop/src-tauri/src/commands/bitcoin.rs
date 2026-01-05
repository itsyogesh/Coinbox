//! Bitcoin-specific Tauri commands
//!
//! Exposes BDK wallet functionality to the frontend.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tracing::{debug, error, info};

use crate::error::{Error, Result};
use crate::wallet::bitcoin::{
    BitcoinAdapter, BitcoinBalance, BitcoinConfig, BitcoinNetwork, BitcoinTransaction, FeeEstimate,
    SendTransactionResult, SyncProgress, UtxoInfo,
};
use super::wallet::get_wallet_manager;

/// Bitcoin adapter state for Tauri
pub struct BitcoinState {
    adapter: Arc<BitcoinAdapter>,
}

impl BitcoinState {
    /// Create a new Bitcoin state with mainnet configuration
    pub fn new(data_dir: PathBuf) -> Self {
        let bitcoin_db_dir = data_dir.join("bitcoin");
        std::fs::create_dir_all(&bitcoin_db_dir).ok();

        Self {
            adapter: Arc::new(BitcoinAdapter::mainnet(bitcoin_db_dir)),
        }
    }

    /// Create with custom configuration
    pub fn with_config(config: BitcoinConfig, data_dir: PathBuf) -> Self {
        let bitcoin_db_dir = data_dir.join("bitcoin");
        std::fs::create_dir_all(&bitcoin_db_dir).ok();

        Self {
            adapter: Arc::new(BitcoinAdapter::new(config, bitcoin_db_dir)),
        }
    }

    /// Get reference to the adapter
    pub fn adapter(&self) -> &BitcoinAdapter {
        &self.adapter
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateBitcoinWalletRequest {
    pub wallet_id: String,
    pub seed: Vec<u8>,
    pub account: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWatchWalletRequest {
    pub wallet_id: String,
    pub xpub: String,
}

#[derive(Debug, Serialize)]
pub struct BitcoinWalletInfo {
    pub wallet_id: String,
    pub network: BitcoinNetwork,
    pub balance: BitcoinBalance,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Create a Bitcoin wallet from seed
#[tauri::command]
pub async fn bitcoin_create_wallet(
    state: State<'_, BitcoinState>,
    wallet_id: String,
    seed: Vec<u8>,
    account: Option<u32>,
) -> Result<String> {
    info!("Creating Bitcoin wallet: {}", wallet_id);

    if seed.len() != 64 {
        return Err(Error::Bitcoin(format!(
            "Invalid seed length: expected 64 bytes, got {}",
            seed.len()
        )));
    }

    let seed_array: [u8; 64] = seed.try_into().map_err(|_| {
        Error::Bitcoin("Failed to convert seed to fixed array".to_string())
    })?;

    state
        .adapter()
        .create_wallet_from_seed(&seed_array, &wallet_id, account.unwrap_or(0))?;

    Ok(wallet_id)
}

/// Create a watch-only Bitcoin wallet from xpub
#[tauri::command]
pub async fn bitcoin_create_watch_wallet(
    state: State<'_, BitcoinState>,
    wallet_id: String,
    xpub: String,
) -> Result<String> {
    info!("Creating watch-only Bitcoin wallet: {}", wallet_id);

    state.adapter().create_watch_wallet(&xpub, &wallet_id)?;

    Ok(wallet_id)
}

/// Sync a Bitcoin wallet with the blockchain
#[tauri::command]
pub async fn bitcoin_sync_wallet(
    state: State<'_, BitcoinState>,
    wallet_id: String,
) -> Result<SyncProgress> {
    info!("Syncing Bitcoin wallet: {}", wallet_id);

    let mut wallet = state.adapter().load_wallet(&wallet_id)?;
    let progress = state.adapter().sync_wallet(&mut wallet)?;

    Ok(progress)
}

/// Get Bitcoin wallet balance
#[tauri::command]
pub async fn bitcoin_get_balance(
    state: State<'_, BitcoinState>,
    wallet_id: String,
) -> Result<BitcoinBalance> {
    debug!("Getting balance for wallet: {}", wallet_id);

    let wallet = state.adapter().load_wallet(&wallet_id)?;
    let balance = state.adapter().get_balance(&wallet)?;

    Ok(balance)
}

/// Get Bitcoin transaction history
#[tauri::command]
pub async fn bitcoin_get_transactions(
    state: State<'_, BitcoinState>,
    wallet_id: String,
) -> Result<Vec<BitcoinTransaction>> {
    debug!("Getting transactions for wallet: {}", wallet_id);

    let wallet = state.adapter().load_wallet(&wallet_id)?;
    let transactions = state.adapter().get_transactions(&wallet)?;

    Ok(transactions)
}

/// Get Bitcoin UTXOs
#[tauri::command]
pub async fn bitcoin_get_utxos(
    state: State<'_, BitcoinState>,
    wallet_id: String,
) -> Result<Vec<UtxoInfo>> {
    debug!("Getting UTXOs for wallet: {}", wallet_id);

    let wallet = state.adapter().load_wallet(&wallet_id)?;
    let utxos = state.adapter().get_utxos(&wallet)?;

    Ok(utxos)
}

/// Estimate fee for Bitcoin transaction
#[tauri::command]
pub async fn bitcoin_estimate_fee(
    state: State<'_, BitcoinState>,
    target_blocks: Option<u32>,
) -> Result<FeeEstimate> {
    debug!("Estimating fee for {} blocks", target_blocks.unwrap_or(6));

    let estimate = state
        .adapter()
        .estimate_fee(target_blocks.unwrap_or(6))?;

    Ok(estimate)
}

/// Get a new Bitcoin receiving address
#[tauri::command]
pub async fn bitcoin_get_new_address(
    state: State<'_, BitcoinState>,
    wallet_id: String,
) -> Result<String> {
    debug!("Getting new address for wallet: {}", wallet_id);

    let mut wallet = state.adapter().load_wallet(&wallet_id)?;
    let address = state.adapter().get_new_address(&mut wallet)?;

    Ok(address)
}

/// Get current Bitcoin network
#[tauri::command]
pub async fn bitcoin_get_network(state: State<'_, BitcoinState>) -> Result<BitcoinNetwork> {
    Ok(state.adapter().network())
}

/// Check if a Bitcoin wallet exists
#[tauri::command]
pub async fn bitcoin_wallet_exists(
    state: State<'_, BitcoinState>,
    wallet_id: String,
) -> Result<bool> {
    match state.adapter().load_wallet(&wallet_id) {
        Ok(_) => Ok(true),
        Err(Error::Bitcoin(msg)) if msg.contains("not found") => Ok(false),
        Err(e) => Err(e),
    }
}

/// Initialize a Bitcoin wallet from the cached seed in WalletManager
///
/// This should be called after create_hd_wallet or import_hd_wallet
/// to initialize the BDK wallet for Bitcoin syncing.
#[tauri::command]
pub async fn bitcoin_init_from_cached_seed(
    state: State<'_, BitcoinState>,
    wallet_id: String,
    account: Option<u32>,
) -> Result<String> {
    info!("Initializing Bitcoin wallet from cached seed: {}", wallet_id);

    // Get the cached seed from WalletManager
    let wallet_manager = get_wallet_manager();
    let seed = wallet_manager
        .storage()
        .get_seed(&wallet_id)
        .map_err(|e| Error::Bitcoin(format!("Failed to get cached seed: {}", e)))?;

    // Create the BDK wallet
    state
        .adapter()
        .create_wallet_from_seed(&seed, &wallet_id, account.unwrap_or(0))?;

    info!("Bitcoin wallet initialized: {}", wallet_id);
    Ok(wallet_id)
}

/// Get balance for a single Bitcoin address (direct Electrum query)
///
/// Use this for watch-only single addresses instead of bitcoin_get_balance
#[tauri::command]
pub async fn bitcoin_get_address_balance(
    state: State<'_, BitcoinState>,
    address: String,
) -> Result<BitcoinBalance> {
    info!("Getting balance for address: {}", address);

    let balance = state.adapter().get_address_balance(&address)?;

    Ok(balance)
}

/// Get transaction history for a single Bitcoin address (direct Electrum query)
///
/// Use this for watch-only single addresses instead of bitcoin_get_transactions
#[tauri::command]
pub async fn bitcoin_get_address_transactions(
    state: State<'_, BitcoinState>,
    address: String,
) -> Result<Vec<BitcoinTransaction>> {
    info!("Getting transactions for address: {}", address);

    let transactions = state.adapter().get_address_transactions(&address)?;

    Ok(transactions)
}

/// Send Bitcoin to a recipient address
///
/// Creates, signs, and broadcasts a Bitcoin transaction.
/// Only works with HD wallets that have signing capability.
#[tauri::command]
pub async fn bitcoin_send_transaction(
    state: State<'_, BitcoinState>,
    wallet_id: String,
    recipient_address: String,
    amount_sats: u64,
    fee_rate: f32,
    broadcast: Option<bool>,
) -> Result<SendTransactionResult> {
    info!(
        "Sending {} sats from {} to {} at {} sat/vB",
        amount_sats, wallet_id, recipient_address, fee_rate
    );

    let mut wallet = state.adapter().load_wallet(&wallet_id)?;

    let result = state.adapter().create_and_send_transaction(
        &mut wallet,
        &recipient_address,
        amount_sats,
        fee_rate,
        broadcast.unwrap_or(true),
    )?;

    Ok(result)
}

/// Validate a Bitcoin address for the current network
#[tauri::command]
pub async fn bitcoin_validate_address(
    state: State<'_, BitcoinState>,
    address: String,
) -> Result<bool> {
    use bitcoin::Address;

    // Parse address
    let parsed = address.parse::<Address<bitcoin::address::NetworkUnchecked>>();

    if parsed.is_err() {
        return Ok(false);
    }

    // Check network
    let network: bitcoin::Network = state.adapter().network().into();
    let is_valid = parsed.unwrap().is_valid_for_network(network);

    Ok(is_valid)
}
