mod commands;
mod db;
mod error;
mod wallet;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
