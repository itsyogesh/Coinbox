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

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COINBOX 2.0                                   │
│                    Tauri Desktop Application                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND (React 18 + TypeScript)          │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐│   │
│  │  │ Dashboard │ │  Wallets  │ │Transactions│ │   Tax Reports    ││   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘│   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐│   │
│  │  │  Settings │ │ AI Chat   │ │  Watch    │ │   DeFi Positions ││   │
│  │  │           │ │ (optional)│ │  List     │ │                   ││   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     TAURI BRIDGE (IPC)                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      RUST BACKEND CORE                           │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │Wallet Core  │  │ Chain       │  │    AI Service           │  │   │
│  │  │             │  │ Adapters    │  │    (Optional)           │  │   │
│  │  │• Key Gen    │  │             │  │                         │  │   │
│  │  │• Signing    │  │• Bitcoin    │  │• API Key Storage        │  │   │
│  │  │• Addresses  │  │• Ethereum   │  │• Provider Abstraction   │  │   │
│  │  │• HD Wallets │  │• Solana     │  │• Transaction Categorize │  │   │
│  │  │• Import     │  │• Polygon    │  │• Natural Language Query │  │   │
│  │  │• Watch-Only │  │• Arbitrum   │  │• Tax Suggestions        │  │   │
│  │  └─────────────┘  │• Base       │  └─────────────────────────┘  │   │
│  │                   │• (Plugin)   │                                │   │
│  │  ┌─────────────┐  └─────────────┘  ┌─────────────────────────┐  │   │
│  │  │Tax Engine   │                   │   Price Service         │  │   │
│  │  │             │  ┌─────────────┐  │                         │  │   │
│  │  │• Cost Basis │  │ Database    │  │• CoinGecko API          │  │   │
│  │  │• Categories │  │ (SQLite)    │  │• Historical prices      │  │   │
│  │  │• FIFO/LIFO  │  │             │  │• Multi-currency         │  │   │
│  │  │• Reports    │  │• Encrypted  │  │• Caching                │  │   │
│  │  │• Export     │  │• Local-only │  └─────────────────────────┘  │   │
│  │  └─────────────┘  └─────────────┘                                │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Core Desktop App)

### 1.1 Project Setup & Infrastructure

**Goal:** Set up modern Tauri + React project structure, removing old backend.

**Tasks:**
- [ ] Initialize new Tauri 2.0 project with React 18 + TypeScript + Vite
- [ ] Set up project structure:
  ```
  coinbox/
  ├── src-tauri/           # Rust backend
  │   ├── src/
  │   │   ├── main.rs
  │   │   ├── lib.rs
  │   │   ├── wallet/      # Wallet core module
  │   │   ├── chains/      # Chain adapters
  │   │   ├── database/    # SQLite + encryption
  │   │   ├── tax/         # Tax engine
  │   │   ├── ai/          # AI service abstraction
  │   │   └── commands/    # Tauri IPC commands
  │   └── Cargo.toml
  ├── src/                 # React frontend
  │   ├── components/
  │   ├── pages/
  │   ├── hooks/
  │   ├── stores/          # Zustand state
  │   ├── lib/
  │   └── types/
  ├── package.json
  └── tauri.conf.json
  ```
- [ ] Configure Tailwind CSS + shadcn/ui components
- [ ] Set up SQLite with SQLCipher encryption for local database
- [ ] Implement secure key storage using OS keychain (keyring crate)
- [ ] Create basic app shell with navigation

**Dependencies (Rust):**
```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite"] }
tokio = { version = "1", features = ["full"] }
keyring = "2"                    # OS keychain
argon2 = "0.5"                   # Password hashing
aes-gcm = "0.10"                 # Encryption
bip39 = "2"                      # Mnemonic generation
bitcoin = "0.31"                 # Bitcoin support
ethers = "2"                     # Ethereum support
solana-sdk = "1.17"              # Solana support
reqwest = { version = "0.11", features = ["json"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"
tracing = "0.1"
```

**Dependencies (Frontend):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "@tauri-apps/api": "^2",
    "@tanstack/react-query": "^5",
    "zustand": "^4",
    "react-router-dom": "^6",
    "recharts": "^2",
    "date-fns": "^3",
    "lucide-react": "^0.300",
    "class-variance-authority": "^0.7",
    "tailwind-merge": "^2"
  }
}
```

### 1.2 Database Schema Design

**Goal:** Design comprehensive local database for all app data.

```sql
-- Core tables
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    wallet_type TEXT NOT NULL,  -- 'hd', 'imported', 'watch_only'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    chain TEXT NOT NULL,        -- 'bitcoin', 'ethereum', 'solana', etc.
    address TEXT NOT NULL,
    derivation_path TEXT,       -- NULL for watch-only
    account_index INTEGER,
    label TEXT,
    is_watch_only BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL,
    UNIQUE(chain, address)
);

-- Encrypted separately, referenced by wallet_id
CREATE TABLE wallet_secrets (
    wallet_id TEXT PRIMARY KEY REFERENCES wallets(id),
    encrypted_seed BLOB,        -- AES-GCM encrypted mnemonic/private key
    encryption_nonce BLOB
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    chain TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number INTEGER,
    timestamp INTEGER NOT NULL,
    from_address TEXT,
    to_address TEXT,
    value TEXT NOT NULL,        -- String to handle big numbers
    fee TEXT,
    fee_currency TEXT,
    status TEXT NOT NULL,       -- 'pending', 'confirmed', 'failed'
    raw_data TEXT,              -- JSON blob of chain-specific data
    created_at INTEGER NOT NULL,
    UNIQUE(chain, tx_hash)
);

CREATE TABLE transaction_categories (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    category TEXT NOT NULL,     -- 'transfer', 'swap', 'stake', 'unstake',
                                -- 'airdrop', 'nft_purchase', 'nft_sale',
                                -- 'defi_deposit', 'defi_withdrawal', 'fee',
                                -- 'income', 'gift', 'payment', 'unknown'
    sub_category TEXT,
    confidence REAL,            -- AI confidence score (0-1)
    source TEXT NOT NULL,       -- 'manual', 'rule', 'ai'
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE tax_lots (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    asset TEXT NOT NULL,        -- 'BTC', 'ETH', etc.
    amount TEXT NOT NULL,
    cost_basis_usd TEXT NOT NULL,
    acquired_at INTEGER NOT NULL,
    acquisition_tx_id TEXT REFERENCES transactions(id),
    disposed_at INTEGER,
    disposal_tx_id TEXT REFERENCES transactions(id),
    disposal_proceeds_usd TEXT,
    gain_loss_usd TEXT,
    holding_period TEXT,        -- 'short', 'long'
    cost_basis_method TEXT,     -- 'fifo', 'lifo', 'hifo', 'specific'
    created_at INTEGER NOT NULL
);

CREATE TABLE balances (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    asset TEXT NOT NULL,
    balance TEXT NOT NULL,
    last_updated INTEGER NOT NULL,
    UNIQUE(account_id, asset)
);

CREATE TABLE price_cache (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    currency TEXT NOT NULL,     -- 'USD', 'EUR', etc.
    price TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    source TEXT NOT NULL,
    UNIQUE(asset, currency, timestamp)
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Settings include:
-- 'default_currency': 'USD'
-- 'cost_basis_method': 'fifo'
-- 'ai_provider': 'anthropic' | 'openai' | 'none'
-- 'ai_api_key_encrypted': <encrypted key>
-- 'theme': 'light' | 'dark' | 'system'

CREATE TABLE ai_chat_history (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,         -- 'user', 'assistant'
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_accounts_wallet ON accounts(wallet_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_tax_lots_account ON tax_lots(account_id);
CREATE INDEX idx_tax_lots_asset ON tax_lots(asset);
CREATE INDEX idx_balances_account ON balances(account_id);
```

### 1.3 Wallet Core Module

**Goal:** Implement secure wallet generation, import, and management.

**Features:**
- [ ] HD wallet generation (BIP39/BIP44)
- [ ] Mnemonic phrase generation and validation (12/24 words)
- [ ] Multi-chain derivation paths:
  - Bitcoin: m/84'/0'/0' (Native SegWit)
  - Ethereum/EVM: m/44'/60'/0'/0
  - Solana: m/44'/501'/0'/0'
- [ ] Private key import (single key)
- [ ] Watch-only address import (no keys)
- [ ] Secure storage with OS keychain + AES-GCM encryption
- [ ] Password protection with Argon2 key derivation
- [ ] Wallet backup/export (encrypted JSON)

**API (Tauri Commands):**
```rust
#[tauri::command]
async fn create_wallet(name: String, password: String) -> Result<WalletInfo, Error>;

#[tauri::command]
async fn import_wallet_mnemonic(name: String, mnemonic: String, password: String) -> Result<WalletInfo, Error>;

#[tauri::command]
async fn import_private_key(name: String, chain: Chain, private_key: String, password: String) -> Result<WalletInfo, Error>;

#[tauri::command]
async fn add_watch_address(name: String, chain: Chain, address: String) -> Result<AccountInfo, Error>;

#[tauri::command]
async fn get_wallets() -> Result<Vec<WalletInfo>, Error>;

#[tauri::command]
async fn delete_wallet(wallet_id: String, password: String) -> Result<(), Error>;

#[tauri::command]
async fn export_wallet(wallet_id: String, password: String) -> Result<EncryptedBackup, Error>;

#[tauri::command]
async fn unlock_wallet(wallet_id: String, password: String) -> Result<UnlockToken, Error>;
```

---

## Phase 2: Chain Integration

### 2.1 Chain Adapter Architecture

**Goal:** Create pluggable chain adapter system for easy multi-chain support.

```rust
// src-tauri/src/chains/mod.rs

#[async_trait]
pub trait ChainAdapter: Send + Sync {
    fn chain(&self) -> Chain;

    async fn get_balance(&self, address: &str) -> Result<Balance, ChainError>;

    async fn get_transactions(
        &self,
        address: &str,
        from_block: Option<u64>,
        limit: Option<u32>
    ) -> Result<Vec<ChainTransaction>, ChainError>;

    async fn get_transaction(&self, tx_hash: &str) -> Result<ChainTransaction, ChainError>;

    async fn estimate_fee(&self, tx: &UnsignedTransaction) -> Result<Fee, ChainError>;

    async fn broadcast_transaction(&self, signed_tx: &[u8]) -> Result<String, ChainError>;

    fn derive_address(&self, public_key: &[u8]) -> Result<String, ChainError>;

    fn validate_address(&self, address: &str) -> bool;

    async fn get_token_balances(&self, address: &str) -> Result<Vec<TokenBalance>, ChainError>;
}
```

### 2.2 Bitcoin Adapter

**Goal:** Implement Bitcoin support using Electrum protocol.

**Features:**
- [ ] Connect to public Electrum servers (with fallbacks)
- [ ] Native SegWit (bech32) addresses
- [ ] Balance fetching (confirmed + unconfirmed)
- [ ] Transaction history with full details
- [ ] UTXO management
- [ ] Fee estimation (sat/vB)
- [ ] Transaction creation and signing
- [ ] Transaction broadcasting

**RPC Endpoints:**
- Blockstream Electrum: electrum.blockstream.info:50002
- Mempool.space API (fallback): mempool.space/api

### 2.3 Ethereum Adapter

**Goal:** Implement Ethereum + EVM L2 support.

**Features:**
- [ ] Connect to public RPC endpoints (with fallbacks)
- [ ] ETH balance fetching
- [ ] ERC-20 token detection and balances
- [ ] Transaction history via Etherscan-like APIs
- [ ] EIP-1559 fee estimation
- [ ] Transaction creation and signing
- [ ] NFT detection (ERC-721, ERC-1155)
- [ ] Support for L2s (same adapter, different RPC):
  - Arbitrum One
  - Optimism
  - Base
  - Polygon

**RPC Endpoints:**
- Ethereum: Infura, Alchemy, or public endpoints
- Arbitrum: arb1.arbitrum.io/rpc
- Optimism: mainnet.optimism.io
- Base: mainnet.base.org
- Polygon: polygon-rpc.com

### 2.4 Solana Adapter

**Goal:** Implement Solana support.

**Features:**
- [ ] Connect to Solana RPC endpoints
- [ ] SOL balance fetching
- [ ] SPL token detection and balances
- [ ] Transaction history
- [ ] Fee estimation
- [ ] Transaction creation and signing
- [ ] NFT detection (Metaplex)

**RPC Endpoints:**
- Helius, QuickNode, or public endpoints

### 2.5 Price Service

**Goal:** Fetch and cache cryptocurrency prices.

**Features:**
- [ ] Current prices from CoinGecko API (free tier)
- [ ] Historical prices for cost basis calculation
- [ ] Multi-currency support (USD, EUR, GBP, etc.)
- [ ] Intelligent caching (current: 60s, historical: permanent)
- [ ] Rate limiting compliance
- [ ] Fallback to CoinMarketCap if needed

**API (Tauri Commands):**
```rust
#[tauri::command]
async fn get_current_price(asset: String, currency: String) -> Result<Price, Error>;

#[tauri::command]
async fn get_historical_price(asset: String, currency: String, timestamp: i64) -> Result<Price, Error>;

#[tauri::command]
async fn get_portfolio_value(currency: String) -> Result<PortfolioValue, Error>;
```

---

## Phase 3: Core Features

### 3.1 Dashboard

**Goal:** Create comprehensive portfolio overview.

**Components:**
- [ ] Total portfolio value (with 24h change)
- [ ] Asset allocation pie/donut chart
- [ ] Portfolio performance line chart (7d, 30d, 90d, 1y, all)
- [ ] Top holdings list with values and changes
- [ ] Recent transactions feed
- [ ] Quick actions (Send, Receive, Add Wallet)

### 3.2 Wallets & Accounts View

**Goal:** Manage wallets and view account details.

**Components:**
- [ ] Wallet list with total values
- [ ] Account cards showing:
  - Address (truncated with copy)
  - Chain icon
  - Balance in native + fiat
  - Token list
  - Watch-only badge if applicable
- [ ] Add wallet modal (create/import/watch)
- [ ] Wallet settings (rename, delete, backup)
- [ ] Address QR code display for receiving

### 3.3 Transactions View

**Goal:** Display and manage transaction history.

**Components:**
- [ ] Transaction list with filters:
  - By wallet/account
  - By chain
  - By category
  - By date range
  - By status
- [ ] Transaction details modal:
  - Full tx hash with explorer link
  - From/To addresses
  - Value + fee
  - Timestamp
  - Category (editable)
  - Notes (editable)
  - Cost basis info
- [ ] Bulk categorization
- [ ] Export to CSV

### 3.4 Watch List

**Goal:** Track addresses without owning keys.

**Components:**
- [ ] Add watch address (any chain)
- [ ] Label/nickname addresses
- [ ] Group addresses by tag
- [ ] View balances and transactions
- [ ] "Whale watching" - track notable addresses
- [ ] Price alerts (future)

---

## Phase 4: Tax Engine

### 4.1 Cost Basis Tracking

**Goal:** Implement IRS-compliant cost basis calculation.

**Features:**
- [ ] Automatic cost basis assignment on acquisition
- [ ] Support multiple accounting methods:
  - FIFO (First In, First Out) - default
  - LIFO (Last In, First Out)
  - HIFO (Highest In, First Out)
  - Specific Identification
- [ ] Per-wallet cost basis tracking (2025 IRS requirement)
- [ ] Transfer detection (not taxable events)
- [ ] Handle chain-specific events:
  - Airdrops (income at FMV)
  - Staking rewards (income at FMV)
  - Hard forks (income at FMV)
  - NFT sales (capital gains)
  - DeFi yields (income)

### 4.2 Transaction Categorization

**Goal:** Automatically categorize transactions for tax purposes.

**Categories:**
```
TAXABLE EVENTS:
- sale              → Capital gain/loss
- swap              → Capital gain/loss (disposal + acquisition)
- nft_sale          → Capital gain/loss
- payment_sent      → Capital gain/loss if appreciated

INCOME EVENTS:
- airdrop           → Ordinary income at FMV
- staking_reward    → Ordinary income at FMV
- mining_reward     → Ordinary income at FMV
- defi_yield        → Ordinary income at FMV
- gift_received     → No tax (but track basis)

NON-TAXABLE:
- transfer          → Between own wallets
- gift_sent         → May have gift tax implications
- purchase          → Acquisition (sets cost basis)

NEEDS REVIEW:
- unknown           → Requires manual categorization
```

**Rule Engine:**
- [ ] Pattern matching for common transaction types
- [ ] Smart contract interaction detection
- [ ] DEX swap detection (Uniswap, etc.)
- [ ] Bridge transaction detection
- [ ] Staking contract detection

### 4.3 Tax Reports

**Goal:** Generate tax-ready reports.

**Report Types:**
- [ ] Capital Gains Summary
  - Short-term gains/losses
  - Long-term gains/losses
  - Total realized gains/losses
- [ ] Income Summary
  - Staking rewards
  - Airdrops
  - DeFi yields
  - Other income
- [ ] Transaction History (IRS Form 8949 format)
- [ ] Cost Basis Report (per asset)
- [ ] Unrealized Gains Report

**Export Formats:**
- [ ] CSV (for accountants)
- [ ] PDF summary report
- [ ] TurboTax compatible format
- [ ] TaxAct compatible format

**API (Tauri Commands):**
```rust
#[tauri::command]
async fn generate_tax_report(
    year: i32,
    report_type: TaxReportType,
    cost_basis_method: CostBasisMethod
) -> Result<TaxReport, Error>;

#[tauri::command]
async fn export_tax_report(
    report: TaxReport,
    format: ExportFormat
) -> Result<Vec<u8>, Error>;

#[tauri::command]
async fn get_tax_summary(year: i32) -> Result<TaxSummary, Error>;
```

---

## Phase 5: AI Integration

### 5.1 AI Provider Abstraction

**Goal:** Create pluggable AI provider system.

```rust
// src-tauri/src/ai/mod.rs

#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn complete(&self, prompt: &str, context: &str) -> Result<String, AIError>;

    async fn categorize_transaction(
        &self,
        tx: &Transaction,
        context: &TransactionContext
    ) -> Result<CategorySuggestion, AIError>;

    async fn chat(&self, messages: &[ChatMessage]) -> Result<String, AIError>;
}

pub struct AnthropicProvider {
    api_key: String,
    model: String,  // claude-3-5-sonnet-20241022
}

pub struct OpenAIProvider {
    api_key: String,
    model: String,  // gpt-4o
}

// Factory function
pub fn create_provider(provider: &str, api_key: &str) -> Box<dyn AIProvider> {
    match provider {
        "anthropic" => Box::new(AnthropicProvider::new(api_key)),
        "openai" => Box::new(OpenAIProvider::new(api_key)),
        _ => panic!("Unknown provider"),
    }
}
```

### 5.2 Transaction Categorization AI

**Goal:** Use AI to intelligently categorize transactions.

**Prompt Template:**
```
You are a cryptocurrency tax assistant. Analyze this transaction and categorize it.

Transaction Details:
- Chain: {chain}
- From: {from_address}
- To: {to_address}
- Value: {value} {asset}
- Contract Interaction: {contract_name or "None"}
- Method Called: {method_name or "None"}
- Timestamp: {timestamp}

Known Context:
- User's addresses: {user_addresses}
- Known exchange addresses: {exchange_addresses}
- Known DEX routers: {dex_addresses}

Respond with JSON:
{
  "category": "<category>",
  "sub_category": "<sub_category or null>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}

Categories: transfer, swap, sale, purchase, airdrop, staking_reward,
defi_deposit, defi_withdrawal, nft_purchase, nft_sale, bridge,
payment_sent, payment_received, gift_sent, gift_received, fee, unknown
```

### 5.3 Natural Language Query

**Goal:** Allow users to query their portfolio in natural language.

**Example Queries:**
- "How much ETH did I spend on gas this year?"
- "What's my total profit on Bitcoin?"
- "Show me all my airdrop income"
- "Which tokens have I held for over a year?"
- "What would my tax be if I sold all my SOL?"

**Implementation:**
- [ ] Parse user query with AI
- [ ] Generate appropriate database queries
- [ ] Format response in natural language
- [ ] Support follow-up questions with context

### 5.4 AI Chat Interface

**Goal:** Conversational interface for portfolio insights.

**Components:**
- [ ] Chat panel (collapsible sidebar or modal)
- [ ] Message history (stored locally)
- [ ] Suggested prompts for new users
- [ ] Context-aware suggestions based on current view
- [ ] Export chat history

**Features:**
- [ ] Portfolio analysis: "Analyze my portfolio allocation"
- [ ] Tax planning: "What are my unrealized gains?"
- [ ] Transaction help: "Why was this categorized as income?"
- [ ] Education: "Explain what impermanent loss is"

---

## Phase 6: UI/UX Implementation

### 6.1 Design System

**Goal:** Create consistent, modern UI.

**Stack:**
- Tailwind CSS for styling
- shadcn/ui for components
- Lucide for icons
- Recharts for charts
- Framer Motion for animations

**Theme:**
- Light/Dark mode with system preference detection
- Color palette:
  ```
  Primary: Blue (#3B82F6)
  Success: Green (#22C55E)
  Warning: Amber (#F59E0B)
  Danger: Red (#EF4444)

  Dark mode background: #0F172A
  Light mode background: #F8FAFC
  ```

### 6.2 Page Structure

```
/                       → Dashboard
/wallets                → Wallet list
/wallets/:id            → Wallet detail
/transactions           → All transactions
/transactions/:id       → Transaction detail
/watch                  → Watch list
/tax                    → Tax overview
/tax/reports            → Generate reports
/settings               → App settings
/settings/ai            → AI provider config
```

### 6.3 Component Library

**Core Components:**
- [ ] AppShell (layout with sidebar)
- [ ] Navbar (top bar with search)
- [ ] Sidebar (navigation)
- [ ] Card (content container)
- [ ] Table (data display)
- [ ] Modal (dialogs)
- [ ] Toast (notifications)
- [ ] Tooltip (help text)
- [ ] Badge (status indicators)
- [ ] Button (actions)
- [ ] Input (forms)
- [ ] Select (dropdowns)
- [ ] Tabs (section switching)

**Crypto-Specific Components:**
- [ ] AddressDisplay (truncated with copy)
- [ ] AssetIcon (chain/token logos)
- [ ] PriceDisplay (with change indicator)
- [ ] TransactionRow (list item)
- [ ] WalletCard (wallet summary)
- [ ] ChainBadge (network indicator)
- [ ] QRCode (address display)
- [ ] AmountInput (with asset selector)

---

## Phase 7: Security Hardening

### 7.1 Encryption & Key Management

- [ ] Master password with Argon2id KDF (memory=64MB, iterations=3)
- [ ] AES-256-GCM for data encryption
- [ ] Secure random number generation (ring or getrandom)
- [ ] Memory zeroization for sensitive data
- [ ] Auto-lock after inactivity timeout
- [ ] Biometric unlock (where supported)

### 7.2 Application Security

- [ ] CSP headers in Tauri config
- [ ] No external script loading
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting on API calls
- [ ] Secure IPC (no exposed globals)

### 7.3 Backup & Recovery

- [ ] Encrypted backup file export
- [ ] Mnemonic phrase backup (one-time display)
- [ ] Backup verification prompts
- [ ] Import from backup file
- [ ] Clear data / factory reset option

---

## Phase 8: Testing & Quality

### 8.1 Testing Strategy

**Rust Backend:**
- [ ] Unit tests for all modules
- [ ] Integration tests for chain adapters
- [ ] Property-based testing for crypto operations
- [ ] Fuzzing for parser code

**React Frontend:**
- [ ] Component tests with React Testing Library
- [ ] Integration tests with MSW for API mocking
- [ ] E2E tests with Playwright

### 8.2 CI/CD Pipeline

- [ ] GitHub Actions workflow
- [ ] Rust: cargo test, clippy, fmt
- [ ] TypeScript: vitest, eslint, prettier
- [ ] Build artifacts for Windows, macOS, Linux
- [ ] Code signing for releases
- [ ] Auto-update mechanism

---

## Implementation Order

### Sprint 1: Foundation (Weeks 1-2)
1. Tauri + React project setup
2. Database schema + SQLite integration
3. Basic app shell with routing
4. Settings page (theme, currency)

### Sprint 2: Wallet Core (Weeks 3-4)
1. HD wallet generation
2. Mnemonic import
3. Watch-only address import
4. Encrypted storage
5. Wallet management UI

### Sprint 3: Bitcoin Integration (Weeks 5-6)
1. Bitcoin chain adapter
2. Balance fetching
3. Transaction history
4. Basic dashboard

### Sprint 4: Ethereum Integration (Weeks 7-8)
1. Ethereum chain adapter
2. ERC-20 token support
3. L2 support (Arbitrum, Optimism, Base)
4. Multi-chain UI updates

### Sprint 5: Solana Integration (Week 9)
1. Solana chain adapter
2. SPL token support
3. UI updates

### Sprint 6: Tax Engine (Weeks 10-11)
1. Cost basis tracking
2. Rule-based categorization
3. Tax calculations
4. Report generation
5. Tax UI pages

### Sprint 7: AI Integration (Week 12)
1. AI provider abstraction
2. API key management
3. Transaction categorization
4. Basic chat interface

### Sprint 8: Polish & Security (Weeks 13-14)
1. Security hardening
2. Error handling
3. Performance optimization
4. Testing
5. Documentation

---

## Success Metrics

**Launch Criteria:**
- [ ] Create/import wallet for BTC, ETH, SOL
- [ ] Watch-only address support
- [ ] View balances and transaction history
- [ ] Manual transaction categorization
- [ ] Generate basic tax report (CSV)
- [ ] AI categorization (with API key)
- [ ] Encrypted local storage
- [ ] Windows + macOS builds

**Post-Launch:**
- [ ] More chains (Polygon, Cosmos ecosystem)
- [ ] DeFi position tracking
- [ ] NFT gallery
- [ ] Mobile companion app
- [ ] Cloud sync (optional, E2E encrypted)
- [ ] Price alerts
- [ ] Portfolio rebalancing suggestions

---

## Open Questions for Discussion

1. **Chain Priority:** Should we launch with BTC+ETH only, or include Solana from day one?

2. **Tax Jurisdiction:** Start with US tax rules only, or support UK/EU from the start?

3. **AI Default:** Should Anthropic be the default/recommended provider?

4. **Pricing Model:** Free with donations? Freemium with premium AI features? One-time purchase?

5. **Open Source:** Should this be open source? Could build trust but also invite forks.

---

## Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chain API rate limits | High | Multiple fallback endpoints, aggressive caching |
| Historical price data gaps | Medium | Multiple price sources, interpolation |
| AI categorization errors | Medium | Always allow manual override, confidence scores |
| Cross-platform build issues | Medium | CI matrix testing, Tauri community support |
| SQLCipher licensing | Low | Use public domain SQLite + separate encryption |

---

## Appendix: Migration from Current Codebase

**What to Keep:**
- Nothing (complete rewrite is cleaner)

**What to Reference:**
- User flow patterns (signup → dashboard → wallet)
- API patterns for fiat rates (BitPay API)
- Basic UI layout concepts

**What to Archive:**
- Move current `app/` and `server/` to `_legacy/` branch
- Document for reference, do not maintain

---

*Plan Version: 1.0*
*Created: December 2024*
*Status: Ready for Review*
