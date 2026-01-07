pub mod bitcoin;
pub mod ethereum;
pub mod store_sync;
pub mod wallet;

use crate::db::Database;
use crate::Result;
use serde::{Deserialize, Serialize};
use tauri::State;

// Re-export wallet commands
pub use wallet::*;

// Re-export bitcoin commands and state
pub use bitcoin::*;

// Re-export ethereum commands and state
pub use ethereum::*;

// Re-export store sync commands
pub use store_sync::*;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub currency: String,
    pub tax_jurisdiction: String,
    pub cost_basis_method: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub chain: String,
    pub address: String,
    pub is_watch_only: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub wallet_id: String,
    pub chain: String,
    pub tx_hash: String,
    pub timestamp: String,
    pub tx_type: String,
    pub amount: String,
    pub asset_symbol: String,
    pub from_address: String,
    pub to_address: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddWalletRequest {
    pub name: String,
    pub chain: String,
    pub address: String,
    pub is_watch_only: bool,
}

// ============================================================================
// Commands
// ============================================================================

#[tauri::command]
pub async fn health_check() -> Result<String> {
    Ok("Coinbox backend is running".to_string())
}

#[tauri::command]
pub async fn get_settings(db: State<'_, Database>) -> Result<Settings> {
    db.execute(|conn| {
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let mut rows = stmt.query([])?;

        let mut settings = Settings {
            theme: "system".to_string(),
            currency: "USD".to_string(),
            tax_jurisdiction: "US".to_string(),
            cost_basis_method: "FIFO".to_string(),
        };

        while let Some(row) = rows.next()? {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;

            // Parse JSON string value
            let parsed: String = serde_json::from_str(&value).unwrap_or(value);

            match key.as_str() {
                "theme" => settings.theme = parsed,
                "currency" => settings.currency = parsed,
                "tax_jurisdiction" => settings.tax_jurisdiction = parsed,
                "cost_basis_method" => settings.cost_basis_method = parsed,
                _ => {}
            }
        }

        Ok(settings)
    })
}

#[tauri::command]
pub async fn save_settings(db: State<'_, Database>, settings: Settings) -> Result<()> {
    db.execute(|conn| {
        let updates = [
            ("theme", &settings.theme),
            ("currency", &settings.currency),
            ("tax_jurisdiction", &settings.tax_jurisdiction),
            ("cost_basis_method", &settings.cost_basis_method),
        ];

        for (key, value) in updates {
            let json_value = serde_json::to_string(value)?;
            conn.execute(
                "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?",
                [&json_value, key],
            )?;
        }

        Ok(())
    })
}

#[tauri::command]
pub async fn get_wallets(db: State<'_, Database>) -> Result<Vec<Wallet>> {
    db.execute(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, chain, address, is_watch_only, created_at FROM wallets ORDER BY created_at DESC"
        )?;

        let wallets = stmt.query_map([], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                name: row.get(1)?,
                chain: row.get(2)?,
                address: row.get(3)?,
                is_watch_only: row.get::<_, i32>(4)? == 1,
                created_at: row.get(5)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(wallets)
    })
}

#[tauri::command]
pub async fn add_wallet(db: State<'_, Database>, request: AddWalletRequest) -> Result<Wallet> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.execute(|conn| {
        conn.execute(
            "INSERT INTO wallets (id, name, chain, address, is_watch_only, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            rusqlite::params![
                id,
                request.name,
                request.chain,
                request.address,
                if request.is_watch_only { 1 } else { 0 },
                now,
            ],
        )?;

        Ok(Wallet {
            id,
            name: request.name,
            chain: request.chain,
            address: request.address,
            is_watch_only: request.is_watch_only,
            created_at: now,
        })
    })
}

#[tauri::command]
pub async fn remove_wallet(db: State<'_, Database>, wallet_id: String) -> Result<()> {
    db.execute(|conn| {
        conn.execute("DELETE FROM wallets WHERE id = ?", [&wallet_id])?;
        Ok(())
    })
}

#[tauri::command]
pub async fn get_transactions(
    db: State<'_, Database>,
    wallet_id: Option<String>,
    limit: Option<i32>,
) -> Result<Vec<Transaction>> {
    db.execute(|conn| {
        let limit = limit.unwrap_or(100);

        let (query, params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(ref wid) = wallet_id {
            (
                "SELECT id, wallet_id, chain, tx_hash, timestamp, tx_type, amount, asset_symbol,
                        from_address, to_address, category
                 FROM transactions
                 WHERE wallet_id = ?1
                 ORDER BY timestamp DESC
                 LIMIT ?2",
                vec![wid as &dyn rusqlite::ToSql, &limit as &dyn rusqlite::ToSql],
            )
        } else {
            (
                "SELECT id, wallet_id, chain, tx_hash, timestamp, tx_type, amount, asset_symbol,
                        from_address, to_address, category
                 FROM transactions
                 ORDER BY timestamp DESC
                 LIMIT ?1",
                vec![&limit as &dyn rusqlite::ToSql],
            )
        };

        let mut stmt = conn.prepare(query)?;
        let transactions = stmt.query_map(params.as_slice(), |row| {
            Ok(Transaction {
                id: row.get(0)?,
                wallet_id: row.get(1)?,
                chain: row.get(2)?,
                tx_hash: row.get(3)?,
                timestamp: row.get(4)?,
                tx_type: row.get(5)?,
                amount: row.get(6)?,
                asset_symbol: row.get(7)?,
                from_address: row.get(8)?,
                to_address: row.get(9)?,
                category: row.get(10)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(transactions)
    })
}
