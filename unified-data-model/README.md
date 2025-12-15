# Unified Multi-Chain Data Model

A comprehensive, production-ready data model for representing blockchain transactions across UTXO-based chains (Bitcoin), account-based EVM chains (Ethereum, L2s), Solana, and future blockchains.

## 🎯 Features

- **Universal Transaction Format**: Single data structure works across all chains
- **Tax-Ready**: Built-in cost basis tracking, gain/loss calculation, and categorization
- **Chain-Agnostic Core**: Works with Bitcoin UTXO, Ethereum logs, Solana instructions
- **Extensible**: Add new chains without schema changes
- **NFT Support**: First-class support for NFTs across all chains
- **Type-Safe**: Full TypeScript and Rust type definitions

## 📁 Project Structure

```
unified-data-model/
├── README.md                          # This file
├── DESIGN_DOCUMENT.md                 # Architecture & design decisions
├── typescript/
│   └── types.ts                       # TypeScript type definitions
├── rust/
│   ├── types.rs                       # Rust struct definitions
│   └── chain_adapters.rs              # Chain adapter implementations
└── examples/
    └── transformation_examples.md     # Real-world examples
```

## 🚀 Quick Start

### TypeScript

```typescript
import { UnifiedTransaction, Chain, Asset, Amount } from './types';

// Create a unified transaction
const tx: UnifiedTransaction = {
  id: "0xabc123...",
  chain: Chain.Ethereum,
  hash: "0xabc123...",
  timestamp: Date.now(),
  status: TransactionStatus.Confirmed,
  direction: TransactionDirection.Outgoing,

  transfers: [{
    from: "0xalice...",
    to: "0xbob...",
    amount: {
      asset: {
        chain: Chain.Ethereum,
        type: AssetType.Token,
        symbol: "USDC",
        decimals: 6,
        contractAddress: "0xA0b86991..."
      },
      raw: "1000000000",
      formatted: "1000.000000"
    }
  }],

  // ... rest of fields
};
```

### Rust

```rust
use crate::types::*;

// Transform Bitcoin transaction
let unified_tx = bitcoin_adapter.transform_transaction(
    "a1b2c3d4e5f6...",
    &user_addresses
).await?;

// Works the same for Ethereum
let unified_tx = ethereum_adapter.transform_transaction(
    "0xabc123...",
    &user_addresses
).await?;

// Tax engine works with unified format
let cost_basis = tax_engine.calculate_cost_basis(&unified_tx)?;
```

## 📊 Core Concepts

### 1. Transfer-Based Model

Instead of trying to force different blockchain models into one concept, we use **transfers** as the universal primitive:

- **Bitcoin**: Each output = one transfer
- **Ethereum**: Native ETH + each ERC-20 Transfer event = separate transfers
- **Solana**: Each token balance change = one transfer

### 2. Asset Uniformity

All assets (native currency, tokens, NFTs) use the same interface:

```typescript
interface Asset {
  chain: Chain;
  type: AssetType;        // native | token | nft | lp
  symbol: string;         // "BTC", "USDC", "BAYC"
  decimals: number;       // 8, 6, 0
  contractAddress: string | null;  // null for native
  tokenId?: string;       // for NFTs
}
```

### 3. Chain-Specific Extensions

Core model is chain-agnostic, with chain-specific data stored separately:

```typescript
interface UnifiedTransaction {
  // Universal fields
  id: string;
  chain: Chain;
  transfers: Transfer[];
  fee: Fee;

  // Chain-specific data (doesn't break abstraction)
  chainSpecific: ChainSpecificData;  // Bitcoin | Ethereum | Solana
}
```

## 🔧 Chain Adapters

Each blockchain has an adapter that transforms raw blockchain data into the unified format:

```rust
#[async_trait]
pub trait ChainAdapter {
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
}
```

### Implemented Adapters

- ✅ **Bitcoin**: UTXO model, multiple inputs/outputs
- ✅ **Ethereum**: Account model, ERC-20 logs, internal txs
- ✅ **Solana**: Instruction-based, SPL tokens
- 🔜 **Cosmos**: Coming soon
- 🔜 **Sui/Aptos**: Coming soon

## 💰 Tax Calculation

Built-in support for tax calculations:

### Cost Basis Tracking

```typescript
interface CostBasisInfo {
  asset: Asset;
  amount: string;
  costBasisFiat: string;      // What you paid
  proceedsFiat: string;       // What you sold for
  gainLoss: string;           // Profit/loss
  holdingPeriod: "short" | "long";  // >1 year = long-term
  method: "fifo" | "lifo" | "hifo" | "specific";
}
```

### Tax Categories

Automatic categorization of transactions:

- **Capital Gains**: `sale`, `swap`, `nft_sale`, `payment_sent`
- **Income**: `airdrop`, `staking_reward`, `mining_reward`, `defi_yield`
- **Non-Taxable**: `transfer`, `purchase`, `gift_received`

### Example: Swap Tax Treatment

```typescript
// Alice swaps 1000 USDC (cost basis: $1000) for 0.4 ETH (worth $840)

{
  taxCategory: TaxCategory.Swap,
  costBasis: [{
    asset: { symbol: "USDC" },
    amount: "1000",
    costBasisFiat: "1000.00",
    proceedsFiat: "840.00",
    gainLoss: "-160.00",        // $160 loss
    holdingPeriod: "short",
    method: "fifo"
  }]
}
```

## 📝 Examples

### Bitcoin: Multi-Output Transaction

```json
{
  "chain": "bitcoin",
  "transfers": [
    { "to": "bc1qbob...", "amount": "0.1 BTC" },
    { "to": "bc1qcarol...", "amount": "0.15 BTC" },
    { "to": "bc1qalice2...", "amount": "0.25 BTC" }  // Change
  ],
  "fee": { "amount": "0.00005 BTC" },
  "direction": "outgoing"
}
```

### Ethereum: Uniswap Swap

```json
{
  "chain": "ethereum",
  "transfers": [
    { "asset": "USDC", "from": "alice", "to": "pool", "amount": "1000" },
    { "asset": "WETH", "from": "pool", "to": "alice", "amount": "0.4" }
  ],
  "contractInteractions": [{
    "address": "0xUniswapRouter...",
    "method": "swapExactTokensForTokens"
  }],
  "direction": "swap"
}
```

### Solana: SPL Token Transfer

```json
{
  "chain": "solana",
  "transfers": [{
    "asset": { "symbol": "USDC", "contractAddress": "EPjFWdd5..." },
    "from": "Alice...",
    "to": "Bob...",
    "amount": "50.000000"
  }],
  "fee": { "amount": "0.000005 SOL" },
  "direction": "outgoing"
}
```

See [transformation_examples.md](examples/transformation_examples.md) for detailed examples.

## 🎨 Design Decisions

### Why Transfer-Based?

Different blockchains have fundamentally different transaction models:
- Bitcoin: UTXO with multiple inputs/outputs
- Ethereum: Account-based with logs
- Solana: Account-based with instructions

Rather than forcing these into a single "transaction" concept, we use **transfers** as the universal primitive. A transaction can have multiple transfers, which naturally handles:
- Bitcoin with 10 outputs = 10 transfers
- Ethereum swap = 2 transfers (token out, token in)
- Complex DeFi = many transfers

### Why Separate Chain-Specific Data?

Storing chain-specific data separately (in `chainSpecific` field) means:
- ✅ Core model remains simple and universal
- ✅ Tax engine doesn't need to know about Solana instructions
- ✅ UI can show chain-specific details when needed
- ✅ Easy to add new chains without breaking existing code

### Why String for Amounts?

```typescript
raw: string;  // Not number
```

Blockchain amounts are often larger than JavaScript's `Number.MAX_SAFE_INTEGER`:
- Bitcoin: 21 million × 100 million = 2.1 × 10^15 sats
- Ethereum: 18 decimals = 10^18 wei

Using strings avoids precision loss and works with bigint libraries.

## 🔮 Future Extensions

### Adding a New Chain

1. Add to `Chain` enum:
```typescript
enum Chain {
  // ... existing
  Cosmos,  // ← New
}
```

2. Create adapter:
```rust
pub struct CosmosAdapter { ... }

impl ChainAdapter for CosmosAdapter {
  async fn transform_transaction(...) -> UnifiedTransaction {
    // Transform Cosmos tx → UnifiedTransaction
  }
}
```

3. Add chain-specific data type:
```rust
enum ChainSpecificData {
  // ... existing
  Cosmos(CosmosData),
}
```

**No changes needed** to core model, database schema, or tax engine!

### Adding New Asset Types

```typescript
enum AssetType {
  // ... existing
  LiquidStaking,  // ← New type for stETH, rETH, etc.
}
```

All existing code continues to work because assets are handled uniformly.

## 📚 Documentation

- [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md) - Architecture and design principles
- [transformation_examples.md](examples/transformation_examples.md) - Real-world examples
- [types.ts](typescript/types.ts) - TypeScript type definitions
- [types.rs](rust/types.rs) - Rust struct definitions
- [chain_adapters.rs](rust/chain_adapters.rs) - Adapter implementations

## 🤝 Integration Guide

### For UI Developers

```typescript
import { UnifiedTransaction } from './types';

function TransactionRow({ tx }: { tx: UnifiedTransaction }) {
  return (
    <div>
      <ChainIcon chain={tx.chain} />
      <span>{tx.direction}</span>
      {tx.transfers.map(transfer => (
        <TransferDisplay transfer={transfer} />
      ))}
      <FeeDisplay fee={tx.fee} />
    </div>
  );
}
```

No need to know about Bitcoin UTXOs or Ethereum logs!

### For Tax Engine Developers

```rust
fn calculate_gains(tx: &UnifiedTransaction) -> Vec<TaxEvent> {
    match tx.tax_category {
        Some(TaxCategory::Swap) => {
            // Calculate capital gain/loss
            calculate_swap_gains(tx)
        },
        Some(TaxCategory::StakingReward) => {
            // Calculate ordinary income
            calculate_income(tx)
        },
        _ => vec![]
    }
}
```

Works across all chains uniformly!

### For Blockchain Developers

Implement the `ChainAdapter` trait and you're done:

```rust
pub struct MyChainAdapter;

#[async_trait]
impl ChainAdapter for MyChainAdapter {
    fn chain(&self) -> Chain { Chain::MyChain }

    async fn transform_transaction(...) -> UnifiedTransaction {
        // Your chain-specific logic here
        // Return unified format
    }
}
```

## 📊 Performance

- **Memory efficient**: Only store what's needed, chain data as JSON
- **Query optimized**: Indexed by chain, timestamp, tax category
- **Cached prices**: Historical prices cached permanently
- **Batch processing**: Parallel transaction fetching and processing

## 🔒 Privacy & Security

- **Local-first**: All data stored locally, encrypted
- **No server**: Direct blockchain RPC communication
- **Private keys**: Never leave device, stored in OS keychain
- **Encrypted backup**: Export wallet data encrypted

## 📄 License

This data model is part of the Coinbox 2.0 project.

---

Built with ❤️ for the crypto community
