//! Tauri wallet commands
//!
//! These commands are exposed to the frontend via Tauri IPC.
//! All commands use the global WalletManager instance.

use std::sync::OnceLock;

use tauri::State;

use crate::wallet::core::WalletManager;
use crate::wallet::registry::ChainInfo;
use crate::wallet::types::{
    CreateHDWalletRequest, CreateHDWalletResponse, DerivedAddress,
    ImportHDWalletRequest, ValidateMnemonicResponse,
};

/// Global wallet manager instance
static WALLET_MANAGER: OnceLock<WalletManager> = OnceLock::new();

/// Get or initialize the global wallet manager
pub fn get_wallet_manager() -> &'static WalletManager {
    WALLET_MANAGER.get_or_init(WalletManager::new)
}

// =============================================================================
// Chain Information Commands
// =============================================================================

/// Get all supported blockchain chains
#[tauri::command]
pub fn get_supported_chains() -> Vec<ChainInfo> {
    get_wallet_manager().get_supported_chains()
}

/// Get only mainnet chains
#[tauri::command]
pub fn get_mainnet_chains() -> Vec<ChainInfo> {
    get_wallet_manager().get_mainnet_chains()
}

/// Validate an address for a specific chain
#[tauri::command]
pub fn validate_chain_address(chain_id: String, address: String) -> Result<bool, String> {
    get_wallet_manager()
        .validate_address(&chain_id, &address)
        .map_err(|e| e.to_string())
}

// =============================================================================
// Mnemonic Commands
// =============================================================================

/// Generate a new random mnemonic
#[tauri::command]
pub fn generate_mnemonic(word_count: usize) -> Result<String, String> {
    get_wallet_manager()
        .generate_mnemonic(word_count)
        .map(|m| m.as_str().to_string())
        .map_err(|e| e.to_string())
}

/// Validate an existing mnemonic phrase
#[tauri::command]
pub fn validate_mnemonic(phrase: String) -> ValidateMnemonicResponse {
    get_wallet_manager().validate_mnemonic(&phrase)
}

// =============================================================================
// Wallet Creation Commands
// =============================================================================

/// Create a new HD wallet
///
/// Generates a new mnemonic, derives addresses for specified chains,
/// and returns the mnemonic (for backup) along with the addresses.
///
/// # Security Note
/// The mnemonic is returned ONCE for backup purposes.
/// The frontend should display it for user to write down,
/// then prompt to verify backup before proceeding.
#[tauri::command]
pub fn create_hd_wallet(
    name: String,
    chains: Vec<String>,
    word_count: Option<usize>,
    password: String,
) -> Result<CreateHDWalletResponse, String> {
    let request = CreateHDWalletRequest {
        name,
        chains,
        word_count: word_count.unwrap_or(12),
    };

    get_wallet_manager()
        .create_hd_wallet(&request, &password)
        .map_err(|e| e.to_string())
}

/// Import an existing HD wallet from mnemonic
#[tauri::command]
pub fn import_hd_wallet(
    name: String,
    mnemonic: String,
    chains: Vec<String>,
    password: String,
) -> Result<CreateHDWalletResponse, String> {
    get_wallet_manager()
        .import_hd_wallet(&name, &mnemonic, &chains, &password)
        .map_err(|e| e.to_string())
}

// =============================================================================
// Address Derivation Commands
// =============================================================================

/// Derive a new address for an existing wallet
#[tauri::command]
pub fn derive_wallet_address(
    wallet_id: String,
    chain_id: String,
    account: Option<u32>,
    index: u32,
) -> Result<DerivedAddress, String> {
    get_wallet_manager()
        .derive_address(&wallet_id, &chain_id, account.unwrap_or(0), index)
        .map_err(|e| e.to_string())
}

// =============================================================================
// Session Management Commands
// =============================================================================

/// Check if the wallet session is unlocked
#[tauri::command]
pub fn is_wallet_unlocked() -> bool {
    get_wallet_manager().is_unlocked()
}

/// Lock the wallet (clear cached secrets)
#[tauri::command]
pub fn lock_wallet() {
    get_wallet_manager().lock();
}

/// Unlock a wallet with password
#[tauri::command]
pub fn unlock_wallet(wallet_id: String, password: String) -> Result<(), String> {
    get_wallet_manager()
        .unlock(&wallet_id, &password)
        .map_err(|e| e.to_string())
}
