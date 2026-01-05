//! Store synchronization commands
//!
//! CRUD operations for SQLite-backed state persistence.
//! Used by frontend Zustand stores to persist data.

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{debug, info};

use crate::db::Database;
use crate::error::Result;

// =============================================================================
// Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub wallet_id: String,
    pub chain: String,
    pub asset: String,
    pub confirmed: String,
    pub unconfirmed: String,
    pub last_synced: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Price {
    pub asset: String,
    pub price_usd: f64,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedTransaction {
    pub id: String,
    pub wallet_id: String,
    pub chain: String,
    pub tx_hash: String,
    pub block_number: Option<i64>,
    pub timestamp: String,
    pub tx_type: String, // "sent", "received", "internal"
    pub amount: String,
    pub fee: Option<String>,
    pub asset_symbol: String,
    pub from_address: String,
    pub to_address: Option<String>,
    pub raw_data: Option<String>,
}

// =============================================================================
// Balance Commands
// =============================================================================

/// Load all balances from SQLite
#[tauri::command]
pub async fn load_balances(db: State<'_, Database>) -> Result<Vec<Balance>> {
    debug!("Loading all balances from SQLite");

    db.execute(|conn| {
        let mut stmt = conn.prepare(
            "SELECT wallet_id, chain, asset, confirmed, unconfirmed, last_synced
             FROM balances"
        )?;

        let balances = stmt
            .query_map([], |row| {
                Ok(Balance {
                    wallet_id: row.get(0)?,
                    chain: row.get(1)?,
                    asset: row.get(2)?,
                    confirmed: row.get(3)?,
                    unconfirmed: row.get(4)?,
                    last_synced: row.get(5)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(balances)
    })
}

/// Load balances for a specific wallet
#[tauri::command]
pub async fn load_wallet_balances(
    db: State<'_, Database>,
    wallet_id: String,
) -> Result<Vec<Balance>> {
    debug!("Loading balances for wallet: {}", wallet_id);

    db.execute(|conn| {
        let mut stmt = conn.prepare(
            "SELECT wallet_id, chain, asset, confirmed, unconfirmed, last_synced
             FROM balances
             WHERE wallet_id = ?1"
        )?;

        let balances = stmt
            .query_map([&wallet_id], |row| {
                Ok(Balance {
                    wallet_id: row.get(0)?,
                    chain: row.get(1)?,
                    asset: row.get(2)?,
                    confirmed: row.get(3)?,
                    unconfirmed: row.get(4)?,
                    last_synced: row.get(5)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(balances)
    })
}

/// Save or update a balance
#[tauri::command]
pub async fn save_balance(db: State<'_, Database>, balance: Balance) -> Result<()> {
    debug!(
        "Saving balance for wallet: {}, chain: {}, asset: {}",
        balance.wallet_id, balance.chain, balance.asset
    );

    db.execute(|conn| {
        conn.execute(
            "INSERT INTO balances (wallet_id, chain, asset, confirmed, unconfirmed, last_synced)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(wallet_id, chain, asset) DO UPDATE SET
                confirmed = excluded.confirmed,
                unconfirmed = excluded.unconfirmed,
                last_synced = excluded.last_synced",
            params![
                balance.wallet_id,
                balance.chain,
                balance.asset,
                balance.confirmed,
                balance.unconfirmed,
                balance.last_synced,
            ],
        )?;
        Ok(())
    })
}

/// Delete balances for a wallet
#[tauri::command]
pub async fn delete_wallet_balances(db: State<'_, Database>, wallet_id: String) -> Result<()> {
    info!("Deleting balances for wallet: {}", wallet_id);

    db.execute(|conn| {
        conn.execute("DELETE FROM balances WHERE wallet_id = ?1", [&wallet_id])?;
        Ok(())
    })
}

// =============================================================================
// Price Commands
// =============================================================================

/// Load all prices from SQLite
#[tauri::command]
pub async fn load_prices(db: State<'_, Database>) -> Result<Vec<Price>> {
    debug!("Loading all prices from SQLite");

    db.execute(|conn| {
        let mut stmt = conn.prepare("SELECT asset, price_usd, last_updated FROM prices")?;

        let prices = stmt
            .query_map([], |row| {
                Ok(Price {
                    asset: row.get(0)?,
                    price_usd: row.get(1)?,
                    last_updated: row.get(2)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(prices)
    })
}

/// Load price for a specific asset
#[tauri::command]
pub async fn load_price(db: State<'_, Database>, asset: String) -> Result<Option<Price>> {
    debug!("Loading price for asset: {}", asset);

    db.execute(|conn| {
        let mut stmt =
            conn.prepare("SELECT asset, price_usd, last_updated FROM prices WHERE asset = ?1")?;

        let price = stmt
            .query_row([&asset], |row| {
                Ok(Price {
                    asset: row.get(0)?,
                    price_usd: row.get(1)?,
                    last_updated: row.get(2)?,
                })
            })
            .ok();

        Ok(price)
    })
}

/// Save or update a price
#[tauri::command]
pub async fn save_price(db: State<'_, Database>, price: Price) -> Result<()> {
    debug!("Saving price for asset: {}", price.asset);

    db.execute(|conn| {
        conn.execute(
            "INSERT INTO prices (asset, price_usd, last_updated)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(asset) DO UPDATE SET
                price_usd = excluded.price_usd,
                last_updated = excluded.last_updated",
            params![price.asset, price.price_usd, price.last_updated,],
        )?;
        Ok(())
    })
}

/// Save multiple prices at once
#[tauri::command]
pub async fn save_prices(db: State<'_, Database>, prices: Vec<Price>) -> Result<()> {
    debug!("Saving {} prices", prices.len());

    db.execute(|conn| {
        let tx = conn.unchecked_transaction()?;

        for price in prices {
            tx.execute(
                "INSERT INTO prices (asset, price_usd, last_updated)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(asset) DO UPDATE SET
                    price_usd = excluded.price_usd,
                    last_updated = excluded.last_updated",
                params![price.asset, price.price_usd, price.last_updated,],
            )?;
        }

        tx.commit()?;
        Ok(())
    })
}

// =============================================================================
// Transaction Commands (using existing transactions table)
// =============================================================================

/// Load transactions for a wallet
#[tauri::command]
pub async fn load_cached_transactions(
    db: State<'_, Database>,
    wallet_id: String,
) -> Result<Vec<CachedTransaction>> {
    debug!("Loading transactions for wallet: {}", wallet_id);

    db.execute(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, wallet_id, chain, tx_hash, block_number, timestamp,
                    tx_type, amount, fee, asset_symbol, from_address, to_address, raw_data
             FROM transactions
             WHERE wallet_id = ?1
             ORDER BY timestamp DESC"
        )?;

        let transactions = stmt
            .query_map([&wallet_id], |row| {
                Ok(CachedTransaction {
                    id: row.get(0)?,
                    wallet_id: row.get(1)?,
                    chain: row.get(2)?,
                    tx_hash: row.get(3)?,
                    block_number: row.get(4)?,
                    timestamp: row.get(5)?,
                    tx_type: row.get(6)?,
                    amount: row.get(7)?,
                    fee: row.get(8)?,
                    asset_symbol: row.get(9)?,
                    from_address: row.get(10)?,
                    to_address: row.get(11)?,
                    raw_data: row.get(12)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(transactions)
    })
}

/// Load all transactions (for Transactions page)
#[tauri::command]
pub async fn load_all_transactions(db: State<'_, Database>) -> Result<Vec<CachedTransaction>> {
    debug!("Loading all transactions from SQLite");

    db.execute(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, wallet_id, chain, tx_hash, block_number, timestamp,
                    tx_type, amount, fee, asset_symbol, from_address, to_address, raw_data
             FROM transactions
             ORDER BY timestamp DESC
             LIMIT 1000"
        )?;

        let transactions = stmt
            .query_map([], |row| {
                Ok(CachedTransaction {
                    id: row.get(0)?,
                    wallet_id: row.get(1)?,
                    chain: row.get(2)?,
                    tx_hash: row.get(3)?,
                    block_number: row.get(4)?,
                    timestamp: row.get(5)?,
                    tx_type: row.get(6)?,
                    amount: row.get(7)?,
                    fee: row.get(8)?,
                    asset_symbol: row.get(9)?,
                    from_address: row.get(10)?,
                    to_address: row.get(11)?,
                    raw_data: row.get(12)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(transactions)
    })
}

/// Save a single transaction
#[tauri::command]
pub async fn save_transaction(db: State<'_, Database>, tx: CachedTransaction) -> Result<()> {
    debug!("Saving transaction: {}", tx.tx_hash);

    db.execute(|conn| {
        conn.execute(
            "INSERT INTO transactions (id, wallet_id, chain, tx_hash, block_number, timestamp,
                                       tx_type, amount, fee, asset_symbol, from_address, to_address, raw_data)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
             ON CONFLICT(chain, tx_hash) DO UPDATE SET
                block_number = excluded.block_number,
                timestamp = excluded.timestamp,
                tx_type = excluded.tx_type,
                amount = excluded.amount,
                fee = excluded.fee,
                updated_at = datetime('now')",
            params![
                tx.id,
                tx.wallet_id,
                tx.chain,
                tx.tx_hash,
                tx.block_number,
                tx.timestamp,
                tx.tx_type,
                tx.amount,
                tx.fee,
                tx.asset_symbol,
                tx.from_address,
                tx.to_address,
                tx.raw_data,
            ],
        )?;
        Ok(())
    })
}

/// Save multiple transactions at once (bulk upsert)
#[tauri::command]
pub async fn save_transactions(
    db: State<'_, Database>,
    transactions: Vec<CachedTransaction>,
) -> Result<()> {
    info!("Saving {} transactions", transactions.len());

    db.execute(|conn| {
        let tx = conn.unchecked_transaction()?;

        for t in transactions {
            tx.execute(
                "INSERT INTO transactions (id, wallet_id, chain, tx_hash, block_number, timestamp,
                                           tx_type, amount, fee, asset_symbol, from_address, to_address, raw_data)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                 ON CONFLICT(chain, tx_hash) DO UPDATE SET
                    block_number = excluded.block_number,
                    timestamp = excluded.timestamp,
                    tx_type = excluded.tx_type,
                    amount = excluded.amount,
                    fee = excluded.fee,
                    updated_at = datetime('now')",
                params![
                    t.id,
                    t.wallet_id,
                    t.chain,
                    t.tx_hash,
                    t.block_number,
                    t.timestamp,
                    t.tx_type,
                    t.amount,
                    t.fee,
                    t.asset_symbol,
                    t.from_address,
                    t.to_address,
                    t.raw_data,
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    })
}

/// Delete transactions for a wallet
#[tauri::command]
pub async fn delete_wallet_transactions(db: State<'_, Database>, wallet_id: String) -> Result<()> {
    info!("Deleting transactions for wallet: {}", wallet_id);

    db.execute(|conn| {
        conn.execute(
            "DELETE FROM transactions WHERE wallet_id = ?1",
            [&wallet_id],
        )?;
        Ok(())
    })
}
