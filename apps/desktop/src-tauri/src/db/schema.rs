use crate::Result;
use rusqlite::Connection;

/// Current schema version
const SCHEMA_VERSION: i32 = 1;

pub fn run_migrations(conn: &Connection) -> Result<()> {
    // Create migrations table if not exists
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // Get current version
    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    tracing::info!("Current schema version: {}, target: {}", current_version, SCHEMA_VERSION);

    // Apply migrations
    if current_version < 1 {
        migrate_v1(conn)?;
    }

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<()> {
    tracing::info!("Applying migration v1");

    conn.execute_batch(
        r#"
        -- =======================================================================
        -- Settings
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO settings (key, value) VALUES
            ('theme', '"system"'),
            ('currency', '"USD"'),
            ('tax_jurisdiction', '"US"'),
            ('cost_basis_method', '"FIFO"');

        -- =======================================================================
        -- Legacy Wallets (for backwards compatibility - will be deprecated)
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            chain TEXT NOT NULL,
            address TEXT NOT NULL,
            is_watch_only INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(chain, address)
        );

        -- =======================================================================
        -- HD Wallets (master wallet info - secrets stored in Stronghold)
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS hd_wallets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            wallet_type TEXT NOT NULL,          -- 'hd', 'private_key', 'watch_only'
            fingerprint TEXT,                   -- Master key fingerprint for HD wallets
            supported_families TEXT,            -- JSON: ["secp256k1", "ed25519"]
            has_backup_verified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- =======================================================================
        -- Wallet Addresses (derived addresses across chains)
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS wallet_addresses (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            chain TEXT NOT NULL,                -- "bitcoin", "ethereum", "solana", etc.
            chain_family TEXT NOT NULL,         -- "secp256k1", "ed25519"
            address TEXT NOT NULL,
            derivation_path TEXT,               -- e.g., "m/44'/60'/0'/0/0"
            account_index INTEGER NOT NULL DEFAULT 0,
            address_index INTEGER NOT NULL DEFAULT 0,
            is_primary INTEGER NOT NULL DEFAULT 1,
            label TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (wallet_id) REFERENCES hd_wallets(id) ON DELETE CASCADE,
            UNIQUE(chain, address)
        );

        CREATE INDEX IF NOT EXISTS idx_wallet_addresses_wallet ON wallet_addresses(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_wallet_addresses_chain ON wallet_addresses(chain);

        -- =======================================================================
        -- Transactions
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            chain TEXT NOT NULL,
            tx_hash TEXT NOT NULL,
            block_number INTEGER,
            timestamp TEXT NOT NULL,
            tx_type TEXT NOT NULL,
            amount TEXT NOT NULL,
            fee TEXT,
            asset_symbol TEXT NOT NULL,
            asset_contract TEXT,
            from_address TEXT NOT NULL,
            to_address TEXT,
            category TEXT,
            category_confidence REAL,
            user_category TEXT,
            notes TEXT,
            cost_basis TEXT,
            gain_loss TEXT,
            is_taxable INTEGER,
            raw_data TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(chain, tx_hash)
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

        -- =======================================================================
        -- Price Cache
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS price_cache (
            asset_id TEXT NOT NULL,
            currency TEXT NOT NULL,
            price TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL,
            PRIMARY KEY (asset_id, currency, timestamp)
        );

        -- =======================================================================
        -- Tax Lots (for cost basis tracking)
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS tax_lots (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            asset_symbol TEXT NOT NULL,
            amount TEXT NOT NULL,
            cost_basis TEXT NOT NULL,
            acquired_at TEXT NOT NULL,
            disposed_at TEXT,
            disposed_amount TEXT,
            transaction_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_tax_lots_wallet ON tax_lots(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_tax_lots_asset ON tax_lots(asset_symbol);

        -- =======================================================================
        -- Balances Cache (unified for all chains)
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS balances (
            wallet_id TEXT NOT NULL,
            chain TEXT NOT NULL,
            asset TEXT NOT NULL,
            confirmed TEXT NOT NULL DEFAULT '0',
            unconfirmed TEXT NOT NULL DEFAULT '0',
            last_synced TEXT,
            PRIMARY KEY (wallet_id, chain, asset)
        );

        CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_balances_chain ON balances(chain);

        -- =======================================================================
        -- Prices (latest price per asset)
        -- =======================================================================

        CREATE TABLE IF NOT EXISTS prices (
            asset TEXT PRIMARY KEY,
            price_usd REAL NOT NULL,
            last_updated TEXT NOT NULL
        );

        -- Record migration
        INSERT INTO migrations (version) VALUES (1);
        "#,
    )?;

    Ok(())
}

