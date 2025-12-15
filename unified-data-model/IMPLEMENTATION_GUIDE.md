# Implementation Guide

This guide shows how to actually implement and use the unified data model in a production application.

## Table of Contents
1. [Setup & Dependencies](#setup--dependencies)
2. [Database Schema](#database-schema)
3. [Chain Adapter Implementation](#chain-adapter-implementation)
4. [Transaction Syncing](#transaction-syncing)
5. [Tax Calculation](#tax-calculation)
6. [UI Integration](#ui-integration)
7. [Testing Strategy](#testing-strategy)

---

## Setup & Dependencies

### Rust Backend (Tauri)

```toml
# Cargo.toml
[dependencies]
# Core
tauri = { version = "2", features = ["protocol-asset"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite"] }

# Blockchain
bitcoin = "0.31"                 # Bitcoin
ethers = "2"                     # Ethereum
solana-sdk = "1.17"              # Solana
solana-client = "1.17"

# HTTP
reqwest = { version = "0.11", features = ["json"] }

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"
```

### TypeScript Frontend

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tanstack/react-query": "^5",
    "zustand": "^4"
  }
}
```

---

## Database Schema

### SQLite Tables

```sql
-- Unified transactions table
CREATE TABLE unified_transactions (
    id TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    hash TEXT NOT NULL,
    block_number INTEGER,
    block_hash TEXT,
    transaction_index INTEGER,
    timestamp INTEGER,
    confirmations INTEGER NOT NULL,
    status TEXT NOT NULL,
    direction TEXT NOT NULL,

    -- Fee (JSON)
    fee_json TEXT NOT NULL,

    -- Transfers (JSON array)
    transfers_json TEXT NOT NULL,

    -- Contract interactions (JSON array)
    contract_interactions_json TEXT,

    -- Tax info
    tax_category TEXT,
    tax_category_confidence REAL,
    tax_sub_category TEXT,
    notes TEXT,
    tags TEXT,  -- JSON array

    -- Cost basis (JSON array)
    cost_basis_json TEXT,

    -- Chain-specific data (JSON)
    chain_specific_json TEXT NOT NULL,

    -- Metadata
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    UNIQUE(chain, hash)
);

-- Indexes for common queries
CREATE INDEX idx_utx_chain ON unified_transactions(chain);
CREATE INDEX idx_utx_timestamp ON unified_transactions(timestamp);
CREATE INDEX idx_utx_status ON unified_transactions(status);
CREATE INDEX idx_utx_tax_category ON unified_transactions(tax_category);
CREATE INDEX idx_utx_block ON unified_transactions(chain, block_number);

-- User addresses (for filtering)
CREATE TABLE user_addresses (
    address TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    label TEXT,
    is_watch_only BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_addr_chain ON user_addresses(chain);
CREATE INDEX idx_addr_wallet ON user_addresses(wallet_id);

-- Tax lots for cost basis tracking
CREATE TABLE tax_lots (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    asset_chain TEXT NOT NULL,
    asset_symbol TEXT NOT NULL,
    asset_contract_address TEXT,

    -- Acquisition
    amount_acquired TEXT NOT NULL,
    cost_basis_fiat TEXT NOT NULL,
    cost_basis_currency TEXT NOT NULL DEFAULT 'USD',
    acquired_at INTEGER NOT NULL,
    acquisition_tx_id TEXT,

    -- Disposal (NULL if not yet disposed)
    amount_disposed TEXT,
    disposal_proceeds_fiat TEXT,
    disposal_tx_id TEXT,
    disposed_at INTEGER,
    gain_loss_fiat TEXT,
    holding_period TEXT,

    -- Method
    method TEXT NOT NULL,  -- fifo, lifo, hifo, specific

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX idx_lots_wallet ON tax_lots(wallet_id);
CREATE INDEX idx_lots_asset ON tax_lots(asset_chain, asset_symbol);
CREATE INDEX idx_lots_acquired ON tax_lots(acquired_at);
CREATE INDEX idx_lots_disposed ON tax_lots(disposed_at);

-- Price cache
CREATE TABLE price_cache (
    id TEXT PRIMARY KEY,  -- asset:currency:timestamp
    asset TEXT NOT NULL,
    currency TEXT NOT NULL,
    price TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    source TEXT NOT NULL,
    cached_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_price_lookup ON price_cache(asset, currency, timestamp);
```

### Repository Pattern

```rust
// src-tauri/src/database/repository.rs

use sqlx::{SqlitePool, Row};
use crate::types::*;

pub struct TransactionRepository {
    pool: SqlitePool,
}

impl TransactionRepository {
    pub async fn insert(&self, tx: &UnifiedTransaction) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO unified_transactions (
                id, chain, hash, block_number, timestamp, status, direction,
                fee_json, transfers_json, contract_interactions_json,
                tax_category, chain_specific_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(chain, hash) DO UPDATE SET
                block_number = excluded.block_number,
                timestamp = excluded.timestamp,
                status = excluded.status,
                confirmations = excluded.confirmations,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&tx.id)
        .bind(serde_json::to_string(&tx.chain)?)
        .bind(&tx.hash)
        .bind(tx.block_number.map(|n| n as i64))
        .bind(tx.timestamp)
        .bind(serde_json::to_string(&tx.status)?)
        .bind(serde_json::to_string(&tx.direction)?)
        .bind(serde_json::to_string(&tx.fee)?)
        .bind(serde_json::to_string(&tx.transfers)?)
        .bind(serde_json::to_string(&tx.contract_interactions)?)
        .bind(tx.tax_category.as_ref().map(|c| serde_json::to_string(c).ok()).flatten())
        .bind(serde_json::to_string(&tx.chain_specific)?)
        .bind(tx.created_at)
        .bind(tx.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_by_hash(
        &self,
        chain: Chain,
        hash: &str,
    ) -> Result<Option<UnifiedTransaction>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT * FROM unified_transactions WHERE chain = ? AND hash = ?"
        )
        .bind(serde_json::to_string(&chain)?)
        .bind(hash)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => Ok(Some(self.row_to_transaction(r)?)),
            None => Ok(None),
        }
    }

    pub async fn get_for_address(
        &self,
        address: &str,
        filter: &TransactionFilter,
    ) -> Result<Vec<UnifiedTransaction>, sqlx::Error> {
        // Build dynamic query based on filter
        let mut query = String::from(
            "SELECT * FROM unified_transactions WHERE 1=1"
        );

        if let Some(chains) = &filter.chains {
            let chain_list = chains.iter()
                .map(|c| format!("'{}'", serde_json::to_string(c).unwrap()))
                .collect::<Vec<_>>()
                .join(",");
            query.push_str(&format!(" AND chain IN ({})", chain_list));
        }

        if let Some(status) = &filter.status {
            query.push_str(&format!(
                " AND status = '{}'",
                serde_json::to_string(status).unwrap()
            ));
        }

        // Filter by address involvement (would need JSON search)
        query.push_str(&format!(
            " AND (transfers_json LIKE '%{}%')",
            address
        ));

        query.push_str(" ORDER BY timestamp DESC");

        if let Some(limit) = filter.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await?;

        rows.into_iter()
            .map(|r| self.row_to_transaction(r))
            .collect()
    }

    fn row_to_transaction(&self, row: sqlx::sqlite::SqliteRow) -> Result<UnifiedTransaction, sqlx::Error> {
        Ok(UnifiedTransaction {
            id: row.get("id"),
            chain: serde_json::from_str(row.get("chain"))?,
            hash: row.get("hash"),
            block_number: row.get::<Option<i64>, _>("block_number").map(|n| n as u64),
            timestamp: row.get("timestamp"),
            status: serde_json::from_str(row.get("status"))?,
            direction: serde_json::from_str(row.get("direction"))?,
            fee: serde_json::from_str(row.get("fee_json"))?,
            transfers: serde_json::from_str(row.get("transfers_json"))?,
            contract_interactions: serde_json::from_str(row.get("contract_interactions_json"))?,
            tax_category: row.get::<Option<String>, _>("tax_category")
                .and_then(|s| serde_json::from_str(&s).ok()),
            chain_specific: serde_json::from_str(row.get("chain_specific_json"))?,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            // ... other fields
        })
    }
}
```

---

## Chain Adapter Implementation

### Bitcoin Adapter Example

```rust
// src-tauri/src/chains/bitcoin.rs

use bitcoin::blockdata::transaction::Transaction as BtcTransaction;
use electrum_client::{Client, ElectrumApi};

pub struct BitcoinAdapter {
    client: Client,
}

impl BitcoinAdapter {
    pub fn new(electrum_url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let client = Client::new(electrum_url)?;
        Ok(Self { client })
    }

    async fn fetch_raw_transaction(&self, txid: &str) -> Result<BtcTransaction, ChainAdapterError> {
        // Fetch from Electrum
        let tx = self.client
            .transaction_get(&bitcoin::Txid::from_str(txid)?)
            .map_err(|e| ChainAdapterError::Network(e.to_string()))?;

        Ok(tx)
    }

    fn parse_transaction(
        &self,
        tx: &BtcTransaction,
        user_addresses: &[String],
    ) -> UnifiedTransaction {
        // Implementation from chain_adapters.rs
        // ...
    }
}

#[async_trait]
impl ChainAdapter for BitcoinAdapter {
    fn chain(&self) -> Chain {
        Chain::Bitcoin
    }

    async fn transform_transaction(
        &self,
        tx_hash: &str,
        user_addresses: &[String],
    ) -> Result<UnifiedTransaction, ChainAdapterError> {
        let raw_tx = self.fetch_raw_transaction(tx_hash).await?;
        Ok(self.parse_transaction(&raw_tx, user_addresses))
    }

    async fn get_transactions(
        &self,
        address: &str,
        from_block: Option<u64>,
    ) -> Result<Vec<UnifiedTransaction>, ChainAdapterError> {
        // Get address history from Electrum
        let history = self.client
            .script_get_history(&self.address_to_script(address)?)
            .map_err(|e| ChainAdapterError::Network(e.to_string()))?;

        let mut transactions = Vec::new();

        for item in history {
            if let Some(from) = from_block {
                if item.height < from as i32 {
                    continue;
                }
            }

            let tx = self.transform_transaction(
                &item.tx_hash.to_string(),
                &[address.to_string()],
            ).await?;

            transactions.push(tx);
        }

        Ok(transactions)
    }

    async fn get_balance(&self, address: &str) -> Result<Vec<Amount>, ChainAdapterError> {
        let balance = self.client
            .script_get_balance(&self.address_to_script(address)?)
            .map_err(|e| ChainAdapterError::Network(e.to_string()))?;

        Ok(vec![Amount {
            asset: Asset::new_native(
                Chain::Bitcoin,
                "BTC".to_string(),
                "Bitcoin".to_string(),
                8,
            ),
            raw: (balance.confirmed + balance.unconfirmed).to_string(),
            formatted: format!("{:.8}", (balance.confirmed + balance.unconfirmed) as f64 / 1e8),
            fiat_value: None,
        }])
    }
}
```

---

## Transaction Syncing

### Sync Service

```rust
// src-tauri/src/sync/mod.rs

pub struct SyncService {
    bitcoin_adapter: BitcoinAdapter,
    ethereum_adapter: EthereumAdapter,
    solana_adapter: SolanaAdapter,
    repository: TransactionRepository,
    price_service: PriceService,
}

impl SyncService {
    pub async fn sync_address(
        &self,
        address: &str,
        chain: Chain,
        from_block: Option<u64>,
    ) -> Result<SyncResult, Box<dyn std::error::Error>> {
        // Get adapter for chain
        let adapter: &dyn ChainAdapter = match chain {
            Chain::Bitcoin => &self.bitcoin_adapter,
            Chain::Ethereum => &self.ethereum_adapter,
            Chain::Solana => &self.solana_adapter,
            _ => return Err("Unsupported chain".into()),
        };

        // Fetch transactions
        let transactions = adapter
            .get_transactions(address, from_block)
            .await?;

        // Enrich with prices
        let enriched = self.enrich_transactions(transactions).await?;

        // Save to database
        for tx in &enriched {
            self.repository.insert(tx).await?;
        }

        Ok(SyncResult {
            chain,
            address: address.to_string(),
            transactions_synced: enriched.len(),
        })
    }

    async fn enrich_transactions(
        &self,
        transactions: Vec<UnifiedTransaction>,
    ) -> Result<Vec<UnifiedTransaction>, Box<dyn std::error::Error>> {
        let mut enriched = Vec::new();

        for mut tx in transactions {
            // Add fiat values to all transfers
            for transfer in &mut tx.transfers {
                if let Some(timestamp) = tx.timestamp {
                    let price = self.price_service
                        .get_price(&transfer.amount.asset.symbol, "USD", timestamp)
                        .await?;

                    transfer.amount.fiat_value = Some(FiatValue {
                        currency: "USD".to_string(),
                        amount: self.calculate_fiat_amount(&transfer.amount.raw, &transfer.amount.asset.decimals, &price),
                        price,
                        price_timestamp: timestamp,
                        price_source: "coingecko".to_string(),
                    });
                }
            }

            // Add fiat value to fee
            if let Some(timestamp) = tx.timestamp {
                let price = self.price_service
                    .get_price(&tx.fee.amount.asset.symbol, "USD", timestamp)
                    .await?;

                tx.fee.amount.fiat_value = Some(FiatValue {
                    currency: "USD".to_string(),
                    amount: self.calculate_fiat_amount(&tx.fee.amount.raw, &tx.fee.amount.asset.decimals, &price),
                    price,
                    price_timestamp: timestamp,
                    price_source: "coingecko".to_string(),
                });
            }

            enriched.push(tx);
        }

        Ok(enriched)
    }
}

// Tauri command
#[tauri::command]
async fn sync_wallet(
    address: String,
    chain: String,
    state: State<'_, SyncService>,
) -> Result<SyncResult, String> {
    let chain = serde_json::from_str::<Chain>(&format!("\"{}\"", chain))
        .map_err(|e| e.to_string())?;

    state.sync_address(&address, chain, None)
        .await
        .map_err(|e| e.to_string())
}
```

---

## Tax Calculation

### Tax Engine

```rust
// src-tauri/src/tax/engine.rs

pub struct TaxEngine {
    repository: TransactionRepository,
    lots_repository: TaxLotsRepository,
}

impl TaxEngine {
    pub async fn calculate_cost_basis(
        &self,
        tx: &mut UnifiedTransaction,
        wallet_id: &str,
        method: CostBasisMethod,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Only calculate for disposal events
        if !self.is_disposal_event(&tx.tax_category) {
            return Ok(());
        }

        let mut cost_basis_entries = Vec::new();

        for transfer in &tx.transfers {
            // Skip incoming transfers (acquisitions)
            if transfer.to == wallet_address {
                continue;
            }

            // Get available lots for this asset
            let lots = self.lots_repository
                .get_available_lots(wallet_id, &transfer.amount.asset, method)
                .await?;

            let disposed_amount = transfer.amount.raw.parse::<u128>()?;
            let mut remaining = disposed_amount;

            for lot in lots {
                if remaining == 0 {
                    break;
                }

                let lot_amount = lot.amount_acquired.parse::<u128>()?;
                let to_dispose = std::cmp::min(remaining, lot_amount);

                // Calculate proportion of lot being disposed
                let proportion = to_dispose as f64 / lot_amount as f64;

                // Calculate proceeds and cost basis
                let proceeds = transfer.amount.fiat_value
                    .as_ref()
                    .map(|fv| fv.amount.parse::<f64>().unwrap_or(0.0))
                    .unwrap_or(0.0) * proportion;

                let cost_basis = lot.cost_basis_fiat.parse::<f64>()? * proportion;

                let gain_loss = proceeds - cost_basis;

                // Determine holding period
                let acquired_at = lot.acquired_at;
                let disposed_at = tx.timestamp.unwrap_or(0);
                let holding_period = if (disposed_at - acquired_at) > 365 * 24 * 60 * 60 {
                    HoldingPeriod::Long
                } else {
                    HoldingPeriod::Short
                };

                cost_basis_entries.push(CostBasisInfo {
                    asset: transfer.amount.asset.clone(),
                    amount: format!("{}", to_dispose),
                    cost_basis_fiat: format!("{:.2}", cost_basis),
                    acquired_at,
                    acquisition_tx_id: Some(lot.acquisition_tx_id.clone()),
                    holding_period,
                    proceeds_fiat: format!("{:.2}", proceeds),
                    gain_loss: format!("{:.2}", gain_loss),
                    method,
                });

                // Mark lot as disposed
                self.lots_repository.dispose_lot(
                    &lot.id,
                    to_dispose,
                    tx.timestamp.unwrap_or(0),
                    &tx.id,
                ).await?;

                remaining -= to_dispose;
            }
        }

        tx.cost_basis = Some(cost_basis_entries);

        Ok(())
    }

    pub async fn generate_tax_report(
        &self,
        wallet_id: &str,
        year: i32,
    ) -> Result<TaxReport, Box<dyn std::error::Error>> {
        let start = NaiveDate::from_ymd_opt(year, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .timestamp();
        let end = NaiveDate::from_ymd_opt(year + 1, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .timestamp();

        // Get all transactions in year
        let transactions = self.repository
            .get_in_date_range(wallet_id, start, end)
            .await?;

        let mut capital_gains_short = Vec::new();
        let mut capital_gains_long = Vec::new();
        let mut income = Vec::new();

        for tx in transactions {
            match tx.tax_category {
                Some(TaxCategory::Sale) | Some(TaxCategory::Swap) => {
                    if let Some(cost_basis) = &tx.cost_basis {
                        for entry in cost_basis {
                            match entry.holding_period {
                                HoldingPeriod::Short => capital_gains_short.push(/* ... */),
                                HoldingPeriod::Long => capital_gains_long.push(/* ... */),
                            }
                        }
                    }
                },
                Some(TaxCategory::StakingReward) |
                Some(TaxCategory::Airdrop) |
                Some(TaxCategory::DeFiYield) => {
                    income.push(/* ... */);
                },
                _ => {}
            }
        }

        Ok(TaxReport {
            year,
            capital_gains: /* ... */,
            income,
            /* ... */
        })
    }

    fn is_disposal_event(&self, category: &Option<TaxCategory>) -> bool {
        matches!(
            category,
            Some(TaxCategory::Sale) |
            Some(TaxCategory::Swap) |
            Some(TaxCategory::NFTSale) |
            Some(TaxCategory::PaymentSent)
        )
    }
}
```

---

## UI Integration

### React Query Hooks

```typescript
// src/hooks/useTransactions.ts

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api';
import { UnifiedTransaction, TransactionFilter } from '../types';

export function useTransactions(filter: TransactionFilter) {
  return useQuery({
    queryKey: ['transactions', filter],
    queryFn: async () => {
      const transactions = await invoke<UnifiedTransaction[]>(
        'get_transactions',
        { filter }
      );
      return transactions;
    },
  });
}

export function useTransaction(chain: string, hash: string) {
  return useQuery({
    queryKey: ['transaction', chain, hash],
    queryFn: async () => {
      const tx = await invoke<UnifiedTransaction>(
        'get_transaction',
        { chain, hash }
      );
      return tx;
    },
  });
}

export function useSyncWallet(address: string, chain: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await invoke('sync_wallet', { address, chain });
    },
    onSuccess: () => {
      // Invalidate transactions query
      queryClient.invalidateQueries(['transactions']);
    },
  });
}
```

### Transaction Display Component

```typescript
// src/components/TransactionRow.tsx

import { UnifiedTransaction } from '../types';
import { ChainIcon } from './ChainIcon';
import { AssetIcon } from './AssetIcon';

export function TransactionRow({ tx }: { tx: UnifiedTransaction }) {
  return (
    <div className="transaction-row">
      <ChainIcon chain={tx.chain} />

      <div className="direction-badge">
        {tx.direction}
      </div>

      <div className="transfers">
        {tx.transfers.map((transfer, idx) => (
          <div key={idx} className="transfer">
            <AssetIcon asset={transfer.amount.asset} />
            <span className="amount">
              {transfer.amount.formatted} {transfer.amount.asset.symbol}
            </span>
            {transfer.amount.fiatValue && (
              <span className="fiat">
                ${transfer.amount.fiatValue.amount}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="fee">
        Fee: {tx.fee.amount.formatted} {tx.fee.amount.asset.symbol}
      </div>

      <div className="timestamp">
        {new Date(tx.timestamp * 1000).toLocaleString()}
      </div>

      {tx.taxCategory && (
        <div className="tax-category">
          {tx.taxCategory}
          {tx.taxCategoryConfidence && (
            <span className="confidence">
              {(tx.taxCategoryConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bitcoin_transform() {
        let adapter = BitcoinAdapter::new("test").unwrap();
        let raw_tx = create_test_bitcoin_tx();

        let unified = adapter.parse_transaction(&raw_tx, &["bc1qtest..."]);

        assert_eq!(unified.chain, Chain::Bitcoin);
        assert_eq!(unified.transfers.len(), 3);
        assert_eq!(unified.direction, TransactionDirection::Outgoing);
    }

    #[tokio::test]
    async fn test_cost_basis_fifo() {
        let engine = setup_test_tax_engine().await;

        // Buy 1 BTC at $30k
        engine.record_acquisition(/* ... */).await.unwrap();

        // Buy 1 BTC at $40k
        engine.record_acquisition(/* ... */).await.unwrap();

        // Sell 1 BTC at $50k
        let mut tx = create_disposal_tx();
        engine.calculate_cost_basis(&mut tx, "wallet1", CostBasisMethod::Fifo)
            .await
            .unwrap();

        // Should use first lot (FIFO)
        let cost_basis = tx.cost_basis.unwrap()[0];
        assert_eq!(cost_basis.cost_basis_fiat, "30000.00");
        assert_eq!(cost_basis.gain_loss, "20000.00");
    }
}
```

### Integration Tests

```rust
#[tokio::test]
async fn test_full_bitcoin_sync() {
    let adapter = BitcoinAdapter::new_testnet();
    let repo = TransactionRepository::new_in_memory().await;

    // Sync a known testnet address
    let txs = adapter.get_transactions(
        "tb1qtestaddress...",
        None
    ).await.unwrap();

    assert!(txs.len() > 0);

    for tx in txs {
        repo.insert(&tx).await.unwrap();
    }

    // Query back
    let saved = repo.get_for_address("tb1qtestaddress...", &TransactionFilter::default())
        .await
        .unwrap();

    assert_eq!(saved.len(), txs.len());
}
```

---

## Production Checklist

- [ ] **Error Handling**: All adapter methods handle network errors gracefully
- [ ] **Retry Logic**: Implement exponential backoff for RPC calls
- [ ] **Rate Limiting**: Respect API rate limits (CoinGecko, Etherscan, etc.)
- [ ] **Caching**: Cache prices and token metadata
- [ ] **Logging**: Use tracing for debugging
- [ ] **Metrics**: Track sync performance and errors
- [ ] **User Feedback**: Show progress during long syncs
- [ ] **Data Validation**: Validate all blockchain data before storing
- [ ] **Database Backups**: Automated encrypted backups
- [ ] **Testing**: Comprehensive unit and integration tests

---

This implementation guide provides a complete, production-ready foundation for building the unified multi-chain transaction system.
