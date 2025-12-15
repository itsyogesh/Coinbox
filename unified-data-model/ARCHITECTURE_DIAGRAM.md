# Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MULTI-CHAIN WALLET                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │  Bitcoin  │   │ Ethereum  │   │  Solana   │
            │  Adapter  │   │  Adapter  │   │  Adapter  │
            └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
                  │               │               │
                  │  Transform    │  Transform    │  Transform
                  │  to Unified   │  to Unified   │  to Unified
                  ▼               ▼               ▼
            ┌─────────────────────────────────────────┐
            │      UnifiedTransaction Format          │
            ├─────────────────────────────────────────┤
            │  • Chain-agnostic core                  │
            │  • Transfer-based model                 │
            │  • Uniform asset representation         │
            │  • Extensible chain-specific data       │
            └──────────────┬──────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────────┐
            │          Tax Engine                       │
            ├──────────────────────────────────────────┤
            │  • Cost basis calculation                 │
            │  • FIFO/LIFO/HIFO matching               │
            │  • Gain/loss tracking                     │
            │  • Categorization (AI + rules)            │
            └──────────────┬───────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────────┐
            │      Encrypted SQLite Database            │
            └──────────────┬───────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────────┐
            │         React UI Components               │
            ├──────────────────────────────────────────┤
            │  • Dashboard                              │
            │  • Transaction list                       │
            │  • Tax reports                            │
            │  • Portfolio view                         │
            └──────────────────────────────────────────┘
```

## Data Flow: Bitcoin Transaction

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Fetch from Blockchain                              │
└─────────────────────────────────────────────────────────────┘

    Electrum API
        │
        ▼
{
  "txid": "abc123...",
  "vin": [
    { "txid": "prev...", "vout": 0, "value": 50000000 }
  ],
  "vout": [
    { "n": 0, "value": 10000000, "address": "bc1qbob..." },
    { "n": 1, "value": 39995000, "address": "bc1qalice..." }
  ]
}

┌─────────────────────────────────────────────────────────────┐
│  Step 2: Transform to Unified Format                        │
└─────────────────────────────────────────────────────────────┘

    BitcoinAdapter::transform_transaction()
        │
        ▼
{
  "id": "abc123...",
  "chain": "bitcoin",
  "transfers": [
    {
      "from": "bc1qalice...",
      "to": "bc1qbob...",
      "amount": {
        "asset": { "symbol": "BTC", "decimals": 8 },
        "raw": "10000000",
        "formatted": "0.10000000"
      }
    },
    {
      "from": "bc1qalice...",
      "to": "bc1qalice...",  // Change
      "amount": { "raw": "39995000", ... }
    }
  ],
  "fee": {
    "amount": { "raw": "5000", ... }
  },
  "direction": "outgoing",
  "chainSpecific": {
    "inputs": [...],
    "outputs": [...]
  }
}

┌─────────────────────────────────────────────────────────────┐
│  Step 3: Enrich with Prices                                 │
└─────────────────────────────────────────────────────────────┘

    PriceService::get_price("BTC", timestamp)
        │
        ▼
{
  ...
  "transfers": [
    {
      "amount": {
        "raw": "10000000",
        "formatted": "0.10000000",
        "fiatValue": {
          "currency": "USD",
          "amount": "4300.00",
          "price": "43000.00"
        }
      }
    }
  ]
}

┌─────────────────────────────────────────────────────────────┐
│  Step 4: Calculate Tax (if disposal)                        │
└─────────────────────────────────────────────────────────────┘

    TaxEngine::calculate_cost_basis()
        │
        ▼
{
  ...
  "taxCategory": "payment_sent",
  "costBasis": [
    {
      "asset": { "symbol": "BTC" },
      "amount": "0.10000000",
      "costBasisFiat": "3800.00",  // Acquired at $38k
      "proceedsFiat": "4300.00",
      "gainLoss": "500.00",
      "holdingPeriod": "long"
    }
  ]
}

┌─────────────────────────────────────────────────────────────┐
│  Step 5: Store in Database                                  │
└─────────────────────────────────────────────────────────────┘

    TransactionRepository::insert()
        │
        ▼
    SQLite (encrypted)
```

## Data Flow: Ethereum Swap

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Fetch Transaction + Receipt                        │
└─────────────────────────────────────────────────────────────┘

    Ethereum RPC
        │
        ▼
Transaction: {
  "from": "0xalice...",
  "to": "0xUniswapRouter...",
  "value": "0",
  "input": "0x414bf389..."  // Encoded swap call
}

Receipt: {
  "logs": [
    {
      "address": "0xUSDC...",
      "topics": ["0xddf252ad...", "alice", "pool"],
      "data": "0x3b9aca00"  // 1000 USDC
    },
    {
      "address": "0xWETH...",
      "topics": ["0xddf252ad...", "pool", "alice"],
      "data": "0x56bc75e2d..."  // 0.4 WETH
    }
  ]
}

┌─────────────────────────────────────────────────────────────┐
│  Step 2: Decode Logs → Transfers                            │
└─────────────────────────────────────────────────────────────┘

    EthereumAdapter::parse_erc20_transfers()
        │
        ▼
{
  "chain": "ethereum",
  "transfers": [
    {
      "transferType": "token",
      "asset": { "symbol": "USDC", "contractAddress": "0xUSDC..." },
      "from": "0xalice...",
      "to": "0xpool...",
      "amount": "1000.000000"
    },
    {
      "transferType": "token",
      "asset": { "symbol": "WETH", "contractAddress": "0xWETH..." },
      "from": "0xpool...",
      "to": "0xalice...",
      "amount": "0.400000000000000000"
    }
  ],
  "direction": "swap",
  "contractInteractions": [
    {
      "address": "0xUniswapRouter...",
      "method": "swapExactTokensForTokens"
    }
  ]
}

┌─────────────────────────────────────────────────────────────┐
│  Step 3: Tax Treatment (Swap = Disposal + Acquisition)      │
└─────────────────────────────────────────────────────────────┘

    1. Dispose of USDC (capital gain/loss)
    2. Acquire WETH (new cost basis)
        │
        ▼
{
  "taxCategory": "swap",
  "costBasis": [
    {
      "asset": "USDC",
      "costBasisFiat": "1000.00",
      "proceedsFiat": "840.00",   // WETH value
      "gainLoss": "-160.00"
    }
  ]
}

New TaxLot created:
{
  "asset": "WETH",
  "amount": "0.4",
  "costBasisFiat": "840.00",  // What we paid (USDC value)
  "acquiredAt": <timestamp>
}
```

## Transfer-Based Model Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    UnifiedTransaction                        │
├─────────────────────────────────────────────────────────────┤
│  id: "abc123..."                                             │
│  chain: "ethereum"                                           │
│  direction: "swap"                                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Transfer 1 (USDC out)                              │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ from: "0xalice..."                                 │     │
│  │ to: "0xpool..."                                    │     │
│  │ asset: { symbol: "USDC", type: "token" }           │     │
│  │ amount: "1000.000000"                              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Transfer 2 (WETH in)                               │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ from: "0xpool..."                                  │     │
│  │ to: "0xalice..."                                   │     │
│  │ asset: { symbol: "WETH", type: "token" }           │     │
│  │ amount: "0.400000000000000000"                     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  fee: { amount: "0.00375 ETH" }                              │
│  taxCategory: "swap"                                         │
└─────────────────────────────────────────────────────────────┘
```

## Asset Hierarchy

```
Asset (Universal Interface)
├── Native Currency
│   ├── BTC (Bitcoin)
│   ├── ETH (Ethereum)
│   ├── SOL (Solana)
│   └── ... (All native currencies)
│
├── Token (Fungible)
│   ├── ERC-20 (Ethereum)
│   │   ├── USDC
│   │   ├── DAI
│   │   └── UNI
│   │
│   ├── SPL Token (Solana)
│   │   ├── USDC
│   │   └── RAY
│   │
│   └── ... (Other token standards)
│
├── NFT (Non-Fungible)
│   ├── ERC-721
│   ├── ERC-1155
│   ├── Metaplex (Solana)
│   └── ... (Other NFT standards)
│
└── LP Token (Liquidity Pool)
    ├── Uniswap V2 LP
    ├── Uniswap V3 Position
    └── ... (Other LP tokens)

All represented with same interface:
{
  chain: Chain,
  type: AssetType,
  symbol: string,
  decimals: number,
  contractAddress: string | null,
  tokenId?: string
}
```

## Cost Basis Matching (FIFO Example)

```
Timeline:
─────────────────────────────────────────────────────────►

Jan 1:  Buy 1 BTC @ $30k      ┌─────────────┐
                               │ Lot 1       │
                               │ 1 BTC       │
                               │ Cost: $30k  │
                               └─────────────┘

Feb 1:  Buy 1 BTC @ $40k      ┌─────────────┐ ┌─────────────┐
                               │ Lot 1       │ │ Lot 2       │
                               │ 1 BTC       │ │ 1 BTC       │
                               │ Cost: $30k  │ │ Cost: $40k  │
                               └─────────────┘ └─────────────┘

Mar 1:  Sell 1 BTC @ $50k
                               │ FIFO: Use Lot 1
                               ▼
                               ┌─────────────┐ ┌─────────────┐
                               │ Lot 1       │ │ Lot 2       │
                               │ DISPOSED    │ │ 1 BTC       │
                               │             │ │ Cost: $40k  │
                               └─────────────┘ └─────────────┘

                               Gain: $50k - $30k = $20k
```

## Chain-Specific Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              UnifiedTransaction (Core)                       │
├─────────────────────────────────────────────────────────────┤
│ • id, chain, hash, timestamp                                 │
│ • transfers (chain-agnostic)                                 │
│ • fee (chain-agnostic)                                       │
│ • direction, status                                          │
│ • tax info                                                   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ chainSpecific (Discriminated Union)                  │    │
│ ├──────────────────────────────────────────────────────┤    │
│ │                                                       │    │
│ │ Bitcoin:                                             │    │
│ │   • inputs: [{ txid, vout, ... }]                    │    │
│ │   • outputs: [{ value, address, ... }]               │    │
│ │   • vsize, weight, isSegwit                          │    │
│ │                                                       │    │
│ │ Ethereum:                                            │    │
│ │   • logs: [{ address, topics, data }]                │    │
│ │   • gasUsed, gasPrice                                │    │
│ │   • internalTransactions                             │    │
│ │                                                       │    │
│ │ Solana:                                              │    │
│ │   • instructions: [{ programId, data }]              │    │
│ │   • preBalances, postBalances                        │    │
│ │   • computeUnitsConsumed                             │    │
│ │                                                       │    │
│ └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

Benefits:
✓ Core model stays clean
✓ Can store any chain-specific data
✓ Easy to add new chains
✓ No breaking changes to core schema
```

## Database Schema Relationships

```
┌──────────────┐
│   wallets    │
│─────────────│
│ id           │◄───────┐
│ name         │        │
│ type         │        │
└──────────────┘        │
                        │
┌──────────────┐        │
│user_addresses│        │
│─────────────│        │
│ address      │        │
│ chain        │        │
│ wallet_id    │────────┘
└──────────────┘
       │
       │ Used to filter
       ▼
┌─────────────────────────┐
│unified_transactions     │
│────────────────────────│
│ id                      │
│ chain                   │
│ hash                    │
│ transfers_json          │◄────┐
│ fee_json                │     │ References
│ tax_category            │     │
│ cost_basis_json         │────┐│
└─────────────────────────┘    ││
                               ││
┌─────────────────────────┐    ││
│      tax_lots           │    ││
│────────────────────────│    ││
│ id                      │    ││
│ asset_symbol            │    ││
│ amount_acquired         │    ││
│ cost_basis_fiat         │    ││
│ acquisition_tx_id       │────┘│
│ disposal_tx_id          │─────┘
└─────────────────────────┘

┌─────────────────────────┐
│    price_cache          │
│────────────────────────│
│ asset                   │
│ currency                │
│ price                   │
│ timestamp               │
└─────────────────────────┘
```

---

These diagrams illustrate the key architectural decisions and data flows in the unified multi-chain data model.
