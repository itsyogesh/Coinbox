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
        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Insert default settings
        INSERT OR IGNORE INTO settings (key, value) VALUES
            ('theme', '"system"'),
            ('currency', '"USD"'),
            ('tax_jurisdiction', '"US"'),
            ('cost_basis_method', '"FIFO"');

        -- Wallets table
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

        -- Transactions table
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            chain TEXT NOT NULL,
            tx_hash TEXT NOT NULL,
            block_number INTEGER,
            timestamp TEXT NOT NULL,

            -- Transaction type
            tx_type TEXT NOT NULL,

            -- Amounts (stored as TEXT to preserve precision)
            amount TEXT NOT NULL,
            fee TEXT,

            -- Asset info
            asset_symbol TEXT NOT NULL,
            asset_contract TEXT,

            -- Addresses
            from_address TEXT NOT NULL,
            to_address TEXT,

            -- Categorization
            category TEXT,
            category_confidence REAL,
            user_category TEXT,
            notes TEXT,

            -- Tax info
            cost_basis TEXT,
            gain_loss TEXT,
            is_taxable INTEGER,

            -- Metadata
            raw_data TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),

            FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
            UNIQUE(chain, tx_hash)
        );

        -- Create indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

        -- Price cache table
        CREATE TABLE IF NOT EXISTS price_cache (
            asset_id TEXT NOT NULL,
            currency TEXT NOT NULL,
            price TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL,
            PRIMARY KEY (asset_id, currency, timestamp)
        );

        -- Tax lots for cost basis tracking
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
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id)
        );

        CREATE INDEX IF NOT EXISTS idx_tax_lots_wallet ON tax_lots(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_tax_lots_asset ON tax_lots(asset_symbol);

        -- Record migration
        INSERT INTO migrations (version) VALUES (1);
        "#,
    )?;

    Ok(())
}
