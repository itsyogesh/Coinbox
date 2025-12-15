# Coinbox 2.0: Portfolio Intelligence Platform
## Complete Modernization Plan

---

## Executive Summary

Transform Coinbox from a dated Bitcoin-only web app into a modern, local-first multi-chain portfolio intelligence platform with AI-powered transaction categorization and tax reporting.

**Core Value Proposition:**
> "Finally understand your crypto. Track everything, categorize automatically, export tax-ready reports."

**Target Users:**
- Crypto holders with assets across multiple chains
- DeFi users struggling to track complex positions
- Anyone dreading crypto tax season
- Privacy-conscious users who want local-first software

**Key Decisions:**
- **Open Source**: Yes - community-driven development
- **Chains**: Bitcoin + Ethereum/EVM L2s (Arbitrum, Optimism, Base, Polygon)
- **Tax Jurisdictions**: US, Europe (UK, Germany, France), India
- **Bitcoin Library**: BDK (Bitcoin Dev Kit) - full wallet functionality
- **Ethereum Library**: Viem (not Wagmi) - direct control for self-custody
- **AI Provider**: User brings their own API key (Anthropic first, then OpenAI)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COINBOX 2.0                                    │
│                       Tauri Desktop Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    FRONTEND (React 18 + TypeScript + Vite)            │ │
│  │                                                                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌───────────────────────┐  │ │
│  │  │Dashboard │ │ Wallets  │ │Transactions │ │    Tax Reports        │  │ │
│  │  └──────────┘ └──────────┘ └─────────────┘ └───────────────────────┘  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌───────────────────────┐  │ │
│  │  │ Settings │ │ AI Chat  │ │ Watch List  │ │   DeFi Positions      │  │ │
│  │  └──────────┘ └──────────┘ └─────────────┘ └───────────────────────┘  │ │
│  │                                                                        │ │
│  │  Libraries: Viem, Zustand, TanStack Query, Framer Motion, Recharts    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        TAURI BRIDGE (IPC)                              │ │
│  │              Secure communication between Frontend & Rust              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         RUST BACKEND CORE                              │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │ │
│  │  │  Wallet Core    │  │ Chain Adapters  │  │    AI Service          │  │ │
│  │  │                 │  │                 │  │    (Optional)          │  │ │
│  │  │ • HD Derivation │  │ • Bitcoin (BDK) │  │                        │  │ │
│  │  │ • Key Storage   │  │ • Ethereum      │  │ • API Key Management   │  │ │
│  │  │ • Signing       │  │ • Arbitrum      │  │ • Provider Abstraction │  │ │
│  │  │ • Watch-Only    │  │ • Optimism      │  │ • Tx Categorization    │  │ │
│  │  │ • Import/Export │  │ • Base          │  │ • NL Queries           │  │ │
│  │  └─────────────────┘  │ • Polygon       │  └────────────────────────┘  │ │
│  │                       └─────────────────┘                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │ │
│  │  │  Tax Engine     │  │  Database       │  │   Price Service        │  │ │
│  │  │                 │  │  (SQLite)       │  │                        │  │ │
│  │  │ • Cost Basis    │  │                 │  │ • CoinGecko API        │  │ │
│  │  │ • Categories    │  │ • SQLCipher     │  │ • Historical Prices    │  │ │
│  │  │ • FIFO/LIFO/HIFO│  │ • Encrypted     │  │ • Multi-Currency       │  │ │
│  │  │ • Multi-Juris.  │  │ • Local-Only    │  │ • Aggressive Caching   │  │ │
│  │  │ • Report Export │  │                 │  │                        │  │ │
│  │  └─────────────────┘  └─────────────────┘  └────────────────────────┘  │ │
│  │                                                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Bitcoin: BDK (Bitcoin Dev Kit)

**Why BDK over alternatives:**

| Feature | BDK | rust-bitcoin | electrum-client |
|---------|-----|--------------|-----------------|
| Wallet Logic | Full | None | None |
| UTXO Management | Built-in | Manual | Manual |
| Watch-Only Support | Native | Build yourself | Build yourself |
| Blockchain Sync | Multiple backends | Build yourself | Direct protocol |
| Persistence | SQLite built-in | Build yourself | None |

**BDK Features:**
- Descriptor-based wallet architecture (BIP84 Native SegWit)
- Multiple backends: Electrum, Esplora, Bitcoin Core RPC
- Built-in SQLite persistence
- Full watch-only wallet support via xpub descriptors
- Transaction history with timestamps
- UTXO management and coin selection

**Dependencies:**
```toml
bdk_wallet = { version = "2.2.0", features = ["rusqlite"] }
bdk_electrum = "0.19.0"
bdk_esplora = "0.19.0"
```

### Ethereum: Viem (Not Wagmi)

**Why Viem over Wagmi:**

| Aspect | Viem | Wagmi |
|--------|------|-------|
| Bundle size | ~27 KB | ~130 KB+ |
| Control | Direct | Connector abstraction |
| Desktop wallet fit | Excellent | Designed for external wallets |
| Custom signing | Easy via custom account | Requires connector hacking |

**Our Pattern:**
- Viem `createPublicClient` for read operations (balances, transactions)
- Custom `TauriAccount` that routes signing to Rust backend
- All private keys stay in Rust - never exposed to JavaScript

```typescript
// Frontend: Custom Tauri-backed account
export function createTauriAccount(address: Hex, accountId: string): Account {
  return {
    address,
    async signMessage({ message }) {
      return await invoke<Hex>('sign_message', { accountId, message });
    },
    async signTransaction(transaction) {
      return await invoke<Hex>('sign_transaction', { accountId, transaction });
    },
  };
}
```

### Chain Provider Settings

Users can configure RPC endpoints per chain in Advanced Settings:

```typescript
interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;           // User-configurable
  explorerUrl: string;
  isCustom: boolean;
}

// Default public endpoints with fallbacks
const defaults = {
  1: 'https://eth.llamarpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  137: 'https://polygon-rpc.com',
};
```

**Features:**
- Test RPC connection before saving
- Fallback to default if custom fails
- Support for Alchemy/Infura API keys
- Per-chain block explorer configuration

---

## Unified Data Model

The unified data model provides chain-agnostic transaction representation. Full types in `/unified-data-model/`.

### Core Principle: Transfers as Atomic Units

```typescript
// Every transaction has one or more transfers
interface UnifiedTransaction {
  id: string;
  chain: Chain;
  hash: string;
  timestamp: number;
  status: TransactionStatus;
  direction: TransactionDirection;
  fee: Fee;
  transfers: Transfer[];           // ← All value movements
  chainSpecific: ChainSpecificData; // ← Chain quirks
  taxCategory?: TaxCategory;
  costBasis?: CostBasisInfo[];
}

interface Transfer {
  from: string;
  to: string;
  amount: Amount;
  transferType: 'native' | 'token' | 'nft' | 'internal';
}
```

### Chain-Specific Handling

| Chain | Model | Transfer Detection |
|-------|-------|-------------------|
| Bitcoin | UTXO | Each output = 1 transfer |
| Ethereum | Account | Native ETH + each ERC-20 log = transfers |
| Solana | Account | Token balance deltas = transfers |

### Example Transformations

**Bitcoin (3 outputs):**
```typescript
transfers: [
  { to: "bob", amount: "0.1 BTC" },
  { to: "carol", amount: "0.2 BTC" },
  { to: "alice_change", amount: "0.65 BTC" },  // Change
]
```

**Ethereum Uniswap Swap:**
```typescript
transfers: [
  { from: "alice", to: "pool", asset: "USDC", amount: "1000" },
  { from: "pool", to: "alice", asset: "WETH", amount: "0.4" },
]
direction: "swap"
taxCategory: "swap"
```

---

## Phase 1: Foundation

### 1.1 Project Setup

```
coinbox/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── wallet/          # BDK integration
│   │   ├── chains/
│   │   │   ├── mod.rs
│   │   │   ├── adapter.rs   # ChainAdapter trait
│   │   │   ├── bitcoin.rs   # BDK adapter
│   │   │   └── ethereum.rs  # Viem backend support
│   │   ├── database/
│   │   ├── tax/
│   │   ├── ai/
│   │   ├── settings/        # Chain provider configs
│   │   └── commands/
│   └── Cargo.toml
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── wallet/          # Wallet-specific components
│   │   ├── transactions/
│   │   └── charts/
│   ├── pages/
│   ├── hooks/
│   ├── stores/              # Zustand
│   ├── lib/
│   │   ├── viem/            # Viem setup
│   │   ├── tauri/           # Tauri IPC wrappers
│   │   └── animations.ts    # Framer Motion utilities
│   └── types/
├── package.json
└── tauri.conf.json
```

### 1.2 Dependencies

**Rust (Cargo.toml):**
```toml
[dependencies]
# Tauri
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-store = "2"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite"] }

# Async
tokio = { version = "1", features = ["full"] }

# Security
keyring = "2"
argon2 = "0.5"
aes-gcm = "0.10"
zeroize = "1"

# Bitcoin (BDK)
bdk_wallet = { version = "2.2.0", features = ["rusqlite"] }
bdk_electrum = "0.19.0"
bdk_esplora = "0.19.0"

# Ethereum signing
ethers-core = "2"
secp256k1 = "0.28"

# Crypto primitives
bip39 = "2"
tiny-bip39 = "1"
hdpath = "0.6"

# Utilities
reqwest = { version = "0.11", features = ["json"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"
tracing = "0.1"
anyhow = "1"
```

**Frontend (package.json):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6",
    "@tauri-apps/api": "^2",
    "viem": "^2",
    "@tanstack/react-query": "^5",
    "zustand": "^4",
    "framer-motion": "^11",
    "recharts": "^2",
    "date-fns": "^3",
    "lucide-react": "^0.300",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "class-variance-authority": "^0.7",
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-dropdown-menu": "^2",
    "@radix-ui/react-tabs": "^1",
    "@radix-ui/react-toast": "^1"
  },
  "devDependencies": {
    "@types/react": "^18",
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

### 1.3 Database Schema

```sql
-- Wallets
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    wallet_type TEXT NOT NULL,  -- 'hd', 'imported', 'watch_only'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Accounts (addresses per chain)
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    derivation_path TEXT,
    account_index INTEGER,
    label TEXT,
    is_watch_only BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL,
    UNIQUE(chain, address)
);

-- Encrypted wallet secrets (separate table for security)
CREATE TABLE wallet_secrets (
    wallet_id TEXT PRIMARY KEY REFERENCES wallets(id),
    encrypted_seed BLOB,
    encryption_nonce BLOB
);

-- Unified transactions (stores full JSON)
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    hash TEXT NOT NULL,
    block_number INTEGER,
    timestamp INTEGER,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    data JSON NOT NULL,  -- Full UnifiedTransaction
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(chain, hash)
);

-- Tax lots for cost basis
CREATE TABLE tax_lots (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    asset TEXT NOT NULL,
    amount TEXT NOT NULL,
    cost_basis_usd TEXT NOT NULL,
    acquired_at INTEGER NOT NULL,
    acquisition_tx_id TEXT,
    disposed_at INTEGER,
    disposal_tx_id TEXT,
    disposal_proceeds_usd TEXT,
    gain_loss_usd TEXT,
    holding_period TEXT,
    method TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- User settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Chain RPC configurations
CREATE TABLE chain_configs (
    chain_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    rpc_url TEXT NOT NULL,
    explorer_url TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    updated_at INTEGER NOT NULL
);

-- Price cache
CREATE TABLE price_cache (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    currency TEXT NOT NULL,
    price TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    source TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_transactions_chain ON transactions(chain);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_tax_lots_asset ON tax_lots(asset);
CREATE INDEX idx_tax_lots_account ON tax_lots(account_id);
```

---

## Phase 2: Chain Integration

### 2.1 Chain Adapter Trait

```rust
#[async_trait]
pub trait ChainAdapter: Send + Sync {
    fn chain(&self) -> Chain;

    async fn get_balance(&self, address: &str) -> Result<Vec<Balance>>;

    async fn get_transactions(
        &self,
        address: &str,
        from_block: Option<u64>,
    ) -> Result<Vec<UnifiedTransaction>>;

    async fn estimate_fee(&self, tx: &UnsignedTx) -> Result<Fee>;

    async fn broadcast(&self, signed_tx: &[u8]) -> Result<String>;

    fn validate_address(&self, address: &str) -> bool;
}
```

### 2.2 Bitcoin Adapter (BDK)

```rust
pub struct BitcoinAdapter {
    network: Network,
    electrum_url: String,
}

impl BitcoinAdapter {
    pub async fn create_watch_wallet(
        &self,
        xpub: &str,
        db_path: &str,
    ) -> Result<Wallet> {
        let descriptor = format!("wpkh({}/0/*)", xpub);
        let change_descriptor = format!("wpkh({}/1/*)", xpub);

        let mut conn = rusqlite::Connection::open(db_path)?;

        let wallet = Wallet::create(&descriptor, &change_descriptor)
            .network(self.network)
            .create_wallet(&mut conn)?;

        Ok(wallet)
    }

    pub async fn sync_wallet(&self, wallet: &mut Wallet) -> Result<()> {
        let client = BdkElectrumClient::new(
            electrum_client::Client::new(&self.electrum_url)?
        );

        let request = wallet.start_sync_with_revealed_spks();
        let update = client.sync(request, 1, false)?;
        wallet.apply_update(update)?;

        Ok(())
    }

    pub async fn get_transactions(&self, wallet: &Wallet) -> Vec<UnifiedTransaction> {
        wallet.transactions()
            .map(|tx| self.transform_to_unified(tx))
            .collect()
    }
}
```

### 2.3 Ethereum Adapter (Viem Backend)

The Ethereum adapter handles EVM chains. Frontend uses Viem for RPC calls, backend handles signing.

```rust
// Backend: Signing only
#[tauri::command]
pub async fn sign_eth_transaction(
    account_id: String,
    transaction: serde_json::Value,
    wallet_manager: State<'_, WalletManager>,
) -> Result<String, String> {
    let private_key = wallet_manager
        .get_private_key(&account_id)
        .await
        .map_err(|e| e.to_string())?;

    // Sign using secp256k1
    let signature = sign_transaction(&private_key, &transaction)?;

    Ok(hex::encode(signature))
}
```

```typescript
// Frontend: Viem public client for reads
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(userRpcUrl),
});

// Balance
const balance = await publicClient.getBalance({ address });

// ERC-20 tokens via multicall
const tokenBalances = await publicClient.multicall({
  contracts: tokenAddresses.map(addr => ({
    address: addr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  })),
});
```

---

## Phase 3: Tax Engine

### 3.1 Supported Jurisdictions

| Jurisdiction | Cost Basis Methods | Special Rules |
|--------------|-------------------|---------------|
| **US** | FIFO, LIFO, HIFO, Specific ID | Per-wallet tracking (2025 IRS), Form 8949 |
| **UK** | Section 104 pool, Same-day, 30-day | Bed and breakfasting rules |
| **Germany** | FIFO only | 1-year holding = tax free |
| **France** | Average cost | Flat 30% tax (PFU) |
| **India** | FIFO | 30% flat rate, 1% TDS |

### 3.2 Tax Categories

```typescript
enum TaxCategory {
  // Capital Gains (disposal)
  Sale = 'sale',
  Swap = 'swap',
  NFTSale = 'nft_sale',
  PaymentSent = 'payment_sent',

  // Income (acquisition at FMV)
  Airdrop = 'airdrop',
  StakingReward = 'staking_reward',
  MiningReward = 'mining_reward',
  DeFiYield = 'defi_yield',

  // Non-Taxable
  Transfer = 'transfer',      // Between own wallets
  Purchase = 'purchase',      // Buying crypto
  GiftReceived = 'gift_received',

  // Special
  Bridge = 'bridge',
  Unknown = 'unknown',
}
```

### 3.3 Cost Basis Calculation

```rust
pub struct TaxEngine {
    method: CostBasisMethod,
    jurisdiction: Jurisdiction,
}

impl TaxEngine {
    pub fn calculate_gain_loss(
        &self,
        disposal: &Disposal,
        lots: &[TaxLot],
    ) -> Result<GainLoss> {
        let matched_lots = match self.method {
            CostBasisMethod::Fifo => self.match_fifo(disposal, lots),
            CostBasisMethod::Lifo => self.match_lifo(disposal, lots),
            CostBasisMethod::Hifo => self.match_hifo(disposal, lots),
            CostBasisMethod::SpecificId => self.match_specific(disposal, lots),
        };

        let total_cost_basis = matched_lots.iter()
            .map(|l| l.cost_basis)
            .sum();

        let gain_loss = disposal.proceeds - total_cost_basis;

        let holding_period = self.determine_holding_period(
            &matched_lots,
            disposal.timestamp,
        );

        Ok(GainLoss {
            amount: gain_loss,
            holding_period,
            lots: matched_lots,
        })
    }
}
```

### 3.4 Report Generation

```typescript
interface TaxReport {
  year: number;
  jurisdiction: Jurisdiction;
  currency: string;

  capitalGains: {
    shortTerm: CapitalGainsEntry[];
    longTerm: CapitalGainsEntry[];
    totalShortTermGain: string;
    totalLongTermGain: string;
  };

  income: IncomeEntry[];
  totalIncome: string;
}

// Export formats
type ExportFormat =
  | 'csv'
  | 'pdf'
  | 'form_8949'     // US
  | 'turbotax'      // US
  | 'hmrc_csv'      // UK
  | 'wiso'          // Germany
  | 'koinly';       // Universal
```

---

## Phase 4: AI Integration

### 4.1 Provider Abstraction

```rust
#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn categorize_transaction(
        &self,
        tx: &UnifiedTransaction,
        context: &TxContext,
    ) -> Result<CategorySuggestion>;

    async fn chat(
        &self,
        messages: &[ChatMessage],
        portfolio_context: &PortfolioContext,
    ) -> Result<String>;
}

pub struct AnthropicProvider {
    api_key: String,
    model: String,  // claude-3-5-sonnet-20241022
}

pub struct OpenAIProvider {
    api_key: String,
    model: String,  // gpt-4o
}

// Factory
pub fn create_provider(provider: &str, api_key: &str) -> Box<dyn AIProvider> {
    match provider {
        "anthropic" => Box::new(AnthropicProvider::new(api_key)),
        "openai" => Box::new(OpenAIProvider::new(api_key)),
        _ => panic!("Unknown provider"),
    }
}
```

### 4.2 Transaction Categorization

```typescript
// Prompt template
const categorizationPrompt = `
You are a cryptocurrency tax assistant. Categorize this transaction.

Transaction:
- Chain: ${chain}
- From: ${from}
- To: ${to}
- Value: ${value}
- Contract: ${contractName || "None"}
- Method: ${methodName || "None"}

User's Addresses: ${userAddresses.join(', ')}
Known DEXes: ${knownDexes.join(', ')}

Respond with JSON:
{
  "category": "<category>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}

Categories: transfer, swap, sale, purchase, airdrop, staking_reward,
defi_deposit, defi_withdrawal, nft_purchase, nft_sale, bridge, unknown
`;
```

### 4.3 Natural Language Queries

Example queries the AI can answer:
- "How much ETH did I spend on gas this year?"
- "What's my total profit on Bitcoin?"
- "Show me all airdrop income"
- "Which tokens have I held for over a year?"
- "What's my unrealized gain on SOL?"

---

## Phase 5: UX Design System

### 5.1 Color Palette

```css
/* Light Theme */
--background: 248 250 252;      /* #F8FAFC */
--foreground: 15 23 42;         /* #0F172A */
--card: 255 255 255;
--card-foreground: 15 23 42;
--primary: 59 130 246;          /* #3B82F6 - Trust Blue */
--success: 34 197 94;           /* #22C55E - Green */
--warning: 245 158 11;          /* #F59E0B - Amber */
--danger: 239 68 68;            /* #EF4444 - Red */
--muted: 241 245 249;
--border: 226 232 240;

/* Dark Theme */
--background: 15 23 42;         /* #0F172A */
--foreground: 248 250 252;
--card: 30 41 59;               /* #1E293B */
--primary: 96 165 250;          /* #60A5FA - Brighter blue */
--success: 74 222 128;
--warning: 251 191 36;
--danger: 248 113 113;
```

### 5.2 Typography

```css
/* Inter with tabular numbers for financial data */
font-family: 'Inter', system-ui, sans-serif;
font-variant-numeric: lining-nums tabular-nums;

/* Type scale */
--text-display-lg: 3rem;      /* 48px - Portfolio total */
--text-display-md: 2.25rem;   /* 36px - Page titles */
--text-xl: 1.25rem;           /* 20px - Section headers */
--text-base: 1rem;            /* 16px - Body */
--text-sm: 0.875rem;          /* 14px - Secondary */
--text-xs: 0.75rem;           /* 12px - Captions */
```

### 5.3 Animation Patterns (Framer Motion)

```typescript
// Animation utilities
export const transitions = {
  fast: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
  normal: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  spring: { type: "spring", stiffness: 400, damping: 24 },
  bouncy: { type: "spring", stiffness: 260, damping: 20 },
};

// Animated balance counter
function AnimatedBalance({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (v) =>
    Math.round(v).toLocaleString()
  );

  useEffect(() => { spring.set(value); }, [value]);

  return <motion.span>${display}</motion.span>;
}

// Card interactions
<motion.div
  whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
  whileTap={{ scale: 0.98 }}
  transition={transitions.spring}
>

// Staggered list
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};
```

### 5.4 Loading States

**Use skeleton screens, not spinners:**

```tsx
function TransactionSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-4 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

### 5.5 Key Components

**Phase 1 (Critical):**
1. `AnimatedBalance` - Smooth number counting
2. `SkeletonLoader` - Loading states for all views
3. `TransactionRow` - Hover animations, quick actions
4. `WalletCard` - Spring animations, interactions
5. `PageTransition` - Smooth navigation

**Phase 2 (Important):**
6. `SendFlow` - Multi-step modal with preview
7. `ReceiveModal` - QR code display
8. `CategoryBadge` - Tax category indicators
9. `Toast` - Success/error notifications
10. `ChartCard` - Recharts with custom tooltips

---

## Implementation Schedule

### Sprint 1-2: Foundation
- [ ] Tauri + React + Vite project setup
- [ ] Database schema + SQLite integration
- [ ] Basic app shell with navigation
- [ ] Settings page (theme, currency)
- [ ] Design system setup (Tailwind, shadcn/ui)

### Sprint 3-4: Wallet Core
- [ ] HD wallet generation (BIP39/BIP44)
- [ ] Mnemonic import/export
- [ ] Watch-only address import
- [ ] Encrypted storage (keyring + AES-GCM)
- [ ] Wallet management UI

### Sprint 5-6: Bitcoin Integration
- [ ] BDK adapter implementation
- [ ] Electrum/Esplora sync
- [ ] Balance fetching
- [ ] Transaction history
- [ ] Basic dashboard

### Sprint 7-8: Ethereum Integration
- [ ] Viem setup + Tauri signing bridge
- [ ] ERC-20 token support
- [ ] Transaction history (Etherscan API)
- [ ] L2 support (Arbitrum, Optimism, Base, Polygon)
- [ ] Chain provider settings UI

### Sprint 9-10: Tax Engine
- [ ] Cost basis tracking (FIFO/LIFO/HIFO)
- [ ] Rule-based categorization
- [ ] Tax calculations (US, UK, Germany, France, India)
- [ ] Report generation
- [ ] Tax UI pages

### Sprint 11-12: AI Integration
- [ ] AI provider abstraction
- [ ] API key management UI
- [ ] Transaction categorization
- [ ] Natural language queries
- [ ] Chat interface

### Sprint 13-14: Polish & Security
- [ ] Security hardening
- [ ] Error handling & logging
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Testing (Rust + React)

---

## Open Source Strategy

### License
- **MIT License** - Maximum adoption, community contributions

### Repository Structure
```
coinbox/
├── apps/
│   └── desktop/          # Tauri app
├── packages/
│   ├── data-model/       # Unified types (shared)
│   ├── tax-engine/       # Tax calculations (Rust)
│   └── chain-adapters/   # Chain integrations (Rust)
├── docs/
├── .github/
│   └── workflows/        # CI/CD
└── README.md
```

### Contribution Guidelines
- Feature requests via GitHub Issues
- PRs require tests + documentation
- Chain adapter contributions welcome
- Tax jurisdiction plugins encouraged

---

## Success Metrics

**Launch Criteria (MVP):**
- [ ] Create/import wallet (BTC, ETH)
- [ ] Watch-only address support
- [ ] View balances and transaction history
- [ ] Manual + AI transaction categorization
- [ ] Generate tax report (CSV, US Form 8949)
- [ ] Encrypted local storage
- [ ] Windows + macOS + Linux builds

**Post-Launch:**
- [ ] More L2s (zkSync, Scroll)
- [ ] Solana support
- [ ] DeFi position tracking
- [ ] NFT gallery
- [ ] Mobile companion app
- [ ] Cloud sync (optional, E2E encrypted)
- [ ] Price alerts

---

*Plan Version: 2.0*
*Updated: December 2024*
*Status: Ready for Implementation*
