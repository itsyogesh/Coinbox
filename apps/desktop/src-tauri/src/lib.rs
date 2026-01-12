mod commands;
mod db;
mod error;
mod wallet;

use tauri::Manager;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub use error::{Error, Result};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "coinbox=debug,tauri=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Coinbox v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                if let Err(e) = db::init_database(&app_handle).await {
                    tracing::error!("Failed to initialize database: {}", e);
                }
            });

            // Initialize Bitcoin state
            let data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let bitcoin_state = commands::BitcoinState::new(data_dir);
            app.manage(bitcoin_state);

            // Initialize Ethereum state (uses WalletManager for signing)
            let ethereum_state = commands::EthereumState::new(wallet::WalletManager::new());
            app.manage(ethereum_state);

            // Open devtools in debug builds
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Settings commands
            commands::get_settings,
            commands::save_settings,
            // Legacy wallet commands (to be deprecated)
            commands::get_wallets,
            commands::add_wallet,
            commands::remove_wallet,
            commands::get_transactions,
            // Health check
            commands::health_check,
            // Wallet core commands (new)
            commands::get_supported_chains,
            commands::get_mainnet_chains,
            commands::validate_chain_address,
            commands::generate_mnemonic,
            commands::validate_mnemonic,
            commands::create_hd_wallet,
            commands::import_hd_wallet,
            commands::derive_wallet_address,
            commands::is_wallet_unlocked,
            commands::lock_wallet,
            commands::unlock_wallet,
            // Bitcoin commands (Sprint 5-6)
            commands::bitcoin_create_wallet,
            commands::bitcoin_create_watch_wallet,
            commands::bitcoin_init_from_cached_seed,
            commands::bitcoin_sync_wallet,
            commands::bitcoin_get_balance,
            commands::bitcoin_get_transactions,
            commands::bitcoin_get_utxos,
            commands::bitcoin_estimate_fee,
            commands::bitcoin_get_new_address,
            commands::bitcoin_get_network,
            commands::bitcoin_wallet_exists,
            // Bitcoin single-address commands (for watch-only addresses)
            commands::bitcoin_get_address_balance,
            commands::bitcoin_get_address_transactions,
            // Bitcoin transaction commands
            commands::bitcoin_send_transaction,
            commands::bitcoin_validate_address,
            // Store sync commands (SQLite persistence)
            commands::load_balances,
            commands::load_wallet_balances,
            commands::save_balance,
            commands::delete_wallet_balances,
            commands::load_prices,
            commands::load_price,
            commands::save_price,
            commands::save_prices,
            commands::load_cached_transactions,
            commands::load_all_transactions,
            commands::save_transaction,
            commands::save_transactions,
            commands::delete_wallet_transactions,
            // Ethereum commands (Sprint 7-8)
            commands::ethereum_sign_message,
            commands::ethereum_sign_typed_data,
            commands::ethereum_sign_transaction_hash,
            commands::ethereum_get_address,
            commands::ethereum_validate_address,
            // Etherscan API proxy (bypasses CORS)
            commands::fetch_etherscan_transactions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
