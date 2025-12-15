# Unified Multi-Chain Data Model - Design Document

## Table of Contents
1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Core Architecture](#core-architecture)
4. [Chain Adapter Pattern](#chain-adapter-pattern)
5. [Handling Chain-Specific Quirks](#handling-chain-specific-quirks)
6. [Tax Calculation Support](#tax-calculation-support)
7. [Extensibility Strategy](#extensibility-strategy)
8. [Performance Considerations](#performance-considerations)
9. [Migration & Evolution](#migration--evolution)

---

## Overview

This unified data model provides a **chain-agnostic representation** of blockchain transactions that works across:
- **UTXO-based chains**: Bitcoin, Litecoin, Dogecoin
- **Account-based EVM chains**: Ethereum, Arbitrum, Optimism, Base, Polygon
- **Solana**: Account-based with unique instruction model
- **Future chains**: Cosmos, Sui, Aptos, and others

### Key Goals
1. **Single data structure** for all transactions regardless of chain
2. **Tax-ready**: Capture cost basis, gains/losses, holding periods
3. **Chain-specific support**: Handle unique features without breaking abstraction
4. **Future-proof**: Add new chains without schema changes
5. **NFT support**: Treat NFTs as first-class assets

---

## Design Principles

### 1. Separation of Concerns

```
┌─────────────────────────────────────┐
│   Core Unified Model (Universal)    │  ← Chain-agnostic
├─────────────────────────────────────┤
│   Chain-Specific Extensions         │  ← Chain quirks
└─────────────────────────────────────┘
```

- **Core fields** work for all chains (hash, timestamp, fee, transfers)
- **Chain-specific data** stored separately but accessible
- UI/tax engine only needs to understand core model

### 2. Asset Uniformity

All assets (native currency, tokens, NFTs) share the same `Asset` interface:

```typescript
interface Asset {
  chain: Chain;
  type: AssetType;  // native | token | nft | lp
  symbol: string;
  decimals: number;
  contractAddress: string | null;  // null for native
  tokenId?: string;  // for NFTs
}
```

This allows uniform handling:
- BTC, ETH, SOL are all `type: "native"`
- USDC on Ethereum and Solana both `type: "token"`
- NFTs are `type: "nft"` with `tokenId`

### 3. Transfer-Based Model

Instead of trying to map different transaction models to a single concept, we use **transfers** as the atomic unit:

- **Bitcoin**: Each output is a transfer
- **Ethereum**: Native ETH + each ERC-20 log event is a transfer
- **Solana**: Each token balance change is a transfer

This handles complex scenarios:
- Bitcoin with 10 outputs = 10 transfers
- Ethereum swap = 2 transfers (USDC out, WETH in)
- Multi-asset transactions = multiple transfers

### 4. Direction Detection

Transaction direction is from the **user's perspective**:

```typescript
enum TransactionDirection {
  Incoming,     // Received funds
  Outgoing,     // Sent funds
  SelfTransfer, // Between own addresses
  Swap,         // Exchange within same tx
  Contract,     // Contract interaction
}
```

Direction is **computed** based on user's wallet addresses, not stored in raw transaction data.

### 5. Extensibility Through Composition

```typescript
chainSpecific: ChainSpecificData  // Discriminated union
```

The `chainSpecific` field is a **discriminated union** that can hold any chain's unique data without modifying the core schema:

```rust
enum ChainSpecificData {
    Bitcoin(BitcoinData),
    Ethereum(EthereumData),
    Solana(SolanaData),
    Generic(GenericChainData),  // For new chains
}
```

---

## Core Architecture

### Transaction Lifecycle

```
┌──────────────┐
│ Blockchain   │
│ RPC/API      │
└──────┬───────┘
       │
       │ Chain-specific raw data
       ▼
┌──────────────────┐
│ Chain Adapter    │ ← Transform to unified model
│ (Bitcoin)        │
│ (Ethereum)       │
│ (Solana)         │
└──────┬───────────┘
       │
       │ UnifiedTransaction
       ▼
┌──────────────────┐
│ Tax Engine       │ ← Calculate cost basis
└──────┬───────────┘
       │
       │ UnifiedTransaction + cost basis
       ▼
┌──────────────────┐
│ Local Database   │ ← Store + index
└──────────────────┘
```

### Data Flow

1. **Fetch**: Chain adapter fetches raw transaction from blockchain
2. **Transform**: Adapter converts to `UnifiedTransaction`
3. **Enrich**: Add user context (direction, categorization)
4. **Calculate**: Tax engine computes cost basis
5. **Store**: Save to local encrypted database
6. **Query**: UI queries unified format

---

## Chain Adapter Pattern

### Interface

Every chain implements the same adapter interface:

```rust
#[async_trait]
pub trait ChainAdapter: Send + Sync {
    fn chain(&self) -> Chain;

    async fn transform_transaction(
        &self,
        tx_hash: &str,
        user_addresses: &[String],
    ) -> Result<UnifiedTransaction, ChainAdapterError>;

    async fn get_transactions(
        &self,
        address: &str,
        from_block: Option<u64>,
    ) -> Result<Vec<UnifiedTransaction>, ChainAdapterError>;

    async fn get_balance(&self, address: &str)
        -> Result<Vec<Amount>, ChainAdapterError>;
}
```

### Adapter Responsibilities

1. **Fetch** raw blockchain data (via RPC or API)
2. **Parse** chain-specific formats
3. **Detect** transfers (outputs, logs, balance changes)
4. **Decode** contract/program interactions
5. **Calculate** fees in chain-specific way
6. **Map** to unified model

### Example: Bitcoin Adapter Logic

```rust
// 1. Fetch raw transaction
let raw_tx = electrum_client.get_transaction(tx_hash)?;

// 2. Extract transfers (one per output)
let mut transfers = Vec::new();
for output in raw_tx.vout {
    transfers.push(Transfer {
        from: determine_input_addresses(&raw_tx.vin),
        to: output.address,
        amount: Amount { raw: output.value, ... },
        ...
    });
}

// 3. Calculate fee
let total_in: u64 = raw_tx.vin.iter().map(|i| i.value).sum();
let total_out: u64 = raw_tx.vout.iter().map(|o| o.value).sum();
let fee = total_in - total_out;

// 4. Determine direction
let direction = if user_sent && !user_received {
    TransactionDirection::Outgoing
} else if !user_sent && user_received {
    TransactionDirection::Incoming
} else {
    TransactionDirection::SelfTransfer
};

// 5. Build unified transaction
UnifiedTransaction {
    chain: Chain::Bitcoin,
    transfers,
    fee,
    direction,
    chain_specific: ChainSpecificData::Bitcoin(BitcoinData { ... }),
    ...
}
```

---

## Handling Chain-Specific Quirks

### Bitcoin: UTXO Model

**Challenge**: Multiple inputs and outputs per transaction

**Solution**:
- Each **output** becomes a separate `Transfer`
- Fee calculated as `Σinputs - Σoutputs`
- Change detection: outputs to user's own addresses

```typescript
transfers: [
  { to: "recipient1", amount: "0.1 BTC" },
  { to: "recipient2", amount: "0.2 BTC" },
  { to: "myChangeAddress", amount: "0.65 BTC" },  // Change
]
```

### Ethereum: Logs and Internal Transactions

**Challenge**:
- Native ETH transfer in transaction body
- ERC-20 transfers in logs
- Internal ETH transfers from contract calls

**Solution**:
- Parse transaction value for native ETH
- Decode `Transfer` event logs for ERC-20
- Fetch internal transactions from trace API
- All become separate `Transfer` objects

```typescript
transfers: [
  { type: "native", amount: "1 ETH" },           // Transaction value
  { type: "token", amount: "100 USDC" },         // From log
  { type: "internal", amount: "0.5 ETH" },       // From trace
]
```

### Ethereum: Gas Fees

**Challenge**: EIP-1559 with base fee + priority fee

**Solution**: Store all fee components
```typescript
fee: {
  amount: { raw: "gasUsed × effectiveGasPrice" },
  feeRate: {
    gasUsed: "150000",
    effectiveGasPrice: "25 gwei",
    maxFeePerGas: "30 gwei",         // User's max
    maxPriorityFeePerGas: "2 gwei",  // Tip
    baseFeePerGas: "23 gwei",        // Network base
  }
}
```

### Solana: Instructions and Balance Changes

**Challenge**:
- Multiple instructions per transaction
- Token transfers via program calls, not explicit transfers
- Need to track balance deltas

**Solution**:
- Parse `preTokenBalances` and `postTokenBalances`
- Calculate delta for each token account
- Each delta becomes a `Transfer`

```typescript
// SPL Token transfer detected from balance change
preTokenBalances: [{ mint: "USDC", amount: "1000" }]
postTokenBalances: [{ mint: "USDC", amount: "950" }]

// Becomes
transfers: [
  { amount: "50 USDC", from: "alice", to: "bob" }
]
```

### Solana: Fee Model

**Challenge**: Fixed fee per transaction (5000 lamports typical)

**Solution**: Store compute units consumed
```typescript
fee: {
  amount: { raw: "5000 lamports" },
  feeRate: {
    computeUnits: 2100  // Computational cost
  }
}
```

---

## Tax Calculation Support

### Requirements for Tax Reporting

1. **Cost Basis Tracking**: What did I pay for this asset?
2. **Disposal Tracking**: What did I receive when I sold it?
3. **Holding Period**: Long-term (>1 year) vs short-term
4. **Categorization**: Income vs capital gains

### Cost Basis Flow

```
┌─────────────────┐
│ Acquisition     │
│ (buy, receive)  │ → Store cost basis
└─────────────────┘   in tax_lots table

┌─────────────────┐
│ Disposal        │
│ (sell, swap)    │ → Match against tax_lots
└─────────────────┘   Calculate gain/loss
```

### Tax Lot Matching

When user disposes of an asset, match against acquisition lots using chosen method:

- **FIFO**: First In, First Out (default)
- **LIFO**: Last In, First Out
- **HIFO**: Highest In, First Out (minimize gains)
- **Specific ID**: User selects specific lot

```typescript
// When swapping 1000 USDC for ETH
costBasis: [
  {
    asset: { symbol: "USDC", ... },
    amount: "1000",
    costBasisFiat: "1000",      // Bought for $1000
    proceedsFiat: "1020",       // Sold for $1020
    gainLoss: "+20",            // $20 gain
    acquiredAt: timestamp1,
    holdingPeriod: "long",      // > 1 year
    method: "fifo"
  }
]
```

### Tax Categories

Each transaction assigned a category:

**Capital Gains Events** (disposal of property):
- `sale`: Direct sale for fiat
- `swap`: Crypto-to-crypto swap (both disposal + acquisition)
- `nft_sale`: NFT sale
- `payment_sent`: Using crypto to pay for goods/services

**Income Events** (ordinary income):
- `airdrop`: Tokens received for free
- `staking_reward`: Staking/yield income
- `mining_reward`: Mining rewards
- `defi_yield`: DeFi protocol earnings
- `salary`: Paid in crypto

**Non-Taxable**:
- `transfer`: Between own wallets
- `purchase`: Buying crypto (sets cost basis)
- `gift_received`: Received as gift

### Automatic Categorization

**Rule-Based**:
```typescript
// Simple transfer detection
if (from === userAddress && to === userAddress) {
  category = TaxCategory.Transfer;
}

// DEX swap detection
if (contractAddress === UNISWAP_ROUTER && transfers.length === 2) {
  category = TaxCategory.Swap;
}
```

**AI-Based**:
```typescript
// Use LLM to categorize complex transactions
const suggestion = await ai.categorizeTransaction({
  tx: unifiedTx,
  userAddresses,
  knownContracts: ["Uniswap", "Aave", "Compound"]
});

tx.taxCategory = suggestion.category;
tx.taxCategoryConfidence = suggestion.confidence;
```

### Multi-Asset Cost Basis

For swaps involving multiple assets:

```typescript
// Swap 1000 USDC for 0.4 ETH

// 1. Disposal of USDC (capital gain/loss)
costBasis: [
  {
    asset: "USDC",
    amount: "1000",
    costBasisFiat: "1000",
    proceedsFiat: "840",  // 0.4 ETH × $2100
    gainLoss: "-160"      // Loss
  }
]

// 2. Acquisition of ETH (sets new cost basis)
// Stored in tax_lots table:
{
  asset: "ETH",
  amount: "0.4",
  costBasisFiat: "840",  // What we paid (USDC value)
  acquiredAt: timestamp
}
```

---

## Extensibility Strategy

### Adding New Chains

To add a new chain (e.g., Cosmos):

1. **Create adapter**:
```rust
pub struct CosmosAdapter { ... }

impl ChainAdapter for CosmosAdapter {
    fn chain(&self) -> Chain { Chain::Cosmos }

    async fn transform_transaction(...) -> UnifiedTransaction {
        // Convert Cosmos tx to unified format
    }
}
```

2. **Add chain to enum**:
```rust
enum Chain {
    // ... existing chains
    Cosmos,  // ← Add this
}
```

3. **Add chain-specific data**:
```rust
enum ChainSpecificData {
    // ... existing variants
    Cosmos(CosmosData),  // ← Add this
}

struct CosmosData {
    // Cosmos-specific fields
}
```

**No changes required** to:
- Core `UnifiedTransaction` structure
- Database schema (stores JSON)
- Tax engine
- UI components

### Adding New Asset Types

To support new asset types (e.g., liquid staking tokens):

```rust
enum AssetType {
    // ... existing types
    LiquidStaking,  // ← Add this
}
```

All existing code continues to work because:
- Assets are handled uniformly
- Type-specific logic only in UI display

### Adding New Tax Categories

```rust
enum TaxCategory {
    // ... existing categories
    LiquidStakingReward,  // ← Add this
}
```

Tax engine can handle new categories without code changes (just configuration).

---

## Performance Considerations

### Database Indexing

For efficient queries:

```sql
-- Transaction lookup
CREATE INDEX idx_tx_chain_hash ON transactions(chain, hash);
CREATE INDEX idx_tx_timestamp ON transactions(timestamp);

-- User's transactions
CREATE INDEX idx_tx_addresses ON transactions
  USING GIN (all_addresses);  -- Array of addresses

-- Tax queries
CREATE INDEX idx_tx_tax_category ON transactions(tax_category);
CREATE INDEX idx_tx_year ON transactions(
  EXTRACT(year FROM to_timestamp(timestamp))
);
```

### Caching Strategy

```
┌─────────────────────────────────────┐
│ Memory Cache                        │
│ - Recent transactions (1000)        │
│ - Active address balances           │
│ - Token metadata (symbols, decimals)│
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ SQLite Database                     │
│ - All transactions                  │
│ - Historical balances               │
│ - Tax lots                          │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Blockchain RPC                      │
│ - Fetch new transactions            │
│ - Get current balances              │
└─────────────────────────────────────┘
```

### Price Lookup Optimization

```typescript
// Cache prices aggressively
const priceCache = new Map<string, Price>();

async function getPrice(asset: string, timestamp: number): Promise<Price> {
  const cacheKey = `${asset}:${timestamp}`;

  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey);
  }

  // Fetch from API
  const price = await coinGeckoAPI.getHistoricalPrice(asset, timestamp);

  // Cache forever (historical prices don't change)
  priceCache.set(cacheKey, price);

  return price;
}
```

### Batch Processing

When syncing a new wallet:

```rust
// Fetch all transactions in parallel
let futures: Vec<_> = addresses
    .iter()
    .map(|addr| adapter.get_transactions(addr, None))
    .collect();

let all_txs: Vec<UnifiedTransaction> = futures::future::join_all(futures)
    .await
    .into_iter()
    .flatten()
    .collect();

// Deduplicate by hash
let unique_txs = deduplicate_by_hash(all_txs);

// Enrich in parallel
let enriched = futures::future::join_all(
    unique_txs.iter().map(|tx| enrich_transaction(tx))
).await;

// Bulk insert to database
database.insert_batch(&enriched).await?;
```

---

## Migration & Evolution

### Schema Versioning

Include version in each transaction:

```typescript
interface UnifiedTransaction {
  __version: "1.0",  // Schema version
  id: string,
  // ... rest of fields
}
```

When schema evolves:
1. Increment version: `"1.1"`
2. Add migration function
3. Lazily migrate on read

```rust
fn migrate_transaction(tx: &mut UnifiedTransaction) {
    match tx.__version.as_str() {
        "1.0" => {
            // Migrate 1.0 → 1.1
            tx.add_new_field();
            tx.__version = "1.1".to_string();
        },
        _ => {} // Already current
    }
}
```

### Backward Compatibility

When adding new fields, always make them **optional**:

```typescript
interface UnifiedTransaction {
  // ... existing fields

  // New in v1.1 (optional)
  l2BatchNumber?: number;  // ← Add as optional
}
```

This ensures old transactions still deserialize correctly.

### Data Reprocessing

If adapter logic improves, reprocess historical data:

```rust
async fn reprocess_chain(chain: Chain, from_date: i64) {
    let old_txs = db.get_transactions(chain, from_date).await?;

    for tx in old_txs {
        // Re-fetch from blockchain
        let fresh = adapter.transform_transaction(&tx.hash, user_addresses).await?;

        // Update in database
        db.update_transaction(fresh).await?;
    }
}
```

---

## Summary

This unified data model provides:

✅ **Chain-agnostic core** that works across all blockchain types
✅ **Tax-ready** with cost basis tracking and categorization
✅ **Handles complexity** (multi-output, logs, instructions)
✅ **Extensible** without breaking changes
✅ **NFT support** as first-class assets
✅ **Performance** through caching and indexing
✅ **Future-proof** with versioning and migration

The key insight is using **transfers as the atomic unit** and **composition for chain-specific data**, allowing a single data structure to represent Bitcoin UTXOs, Ethereum logs, and Solana instructions uniformly.
