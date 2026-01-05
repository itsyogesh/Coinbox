# Tauri + SQLite + Zustand Plugin

> Internal implementation for Coinbox, designed for future extraction as open-source library.

## Problem Statement

Current Tauri state persistence options:
- **tauri-plugin-zustand**: Persists to JSON files
- **tauri-plugin-store**: Key-value JSON storage
- **tauri-plugin-sql**: Raw SQL access, no Zustand integration

**Gap**: No library combines Zustand's ergonomic state management with SQLite's relational power.

### Why SQLite > JSON Files

| Feature | JSON Files | SQLite |
|---------|------------|--------|
| Relational queries | No | Yes |
| Rust-side access | Parse JSON | Native queries |
| Large datasets | Slow | Fast |
| ACID transactions | No | Yes |
| Partial updates | Rewrite entire file | Update single row |
| Indexing | No | Yes |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   const useStore = create(                                          │
│     sqliteStorage({ table: 'balances' })((set) => ({               │
│       items: [],                                                    │
│       add: (item) => set((s) => ({ items: [...s.items, item] })),  │
│     }))                                                             │
│   );                                                                │
│                                                                     │
│   // Zustand store with SQLite persistence                          │
│   // - Hydrates from SQLite on init                                 │
│   // - Syncs changes to SQLite automatically                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Tauri IPC
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Rust)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   tauri_plugin_sqlite_zustand::init()                              │
│                                                                     │
│   Commands:                                                         │
│   - sqlite_zustand_get(table) -> JSON state                        │
│   - sqlite_zustand_set(table, state)                               │
│   - sqlite_zustand_patch(table, partial)                           │
│   - sqlite_zustand_delete(table)                                   │
│                                                                     │
│   Storage: SQLite with JSON columns for flexible state              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SQLite Database                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   -- Auto-created table for each store                              │
│   CREATE TABLE zustand_stores (                                     │
│     name TEXT PRIMARY KEY,                                          │
│     state TEXT NOT NULL,        -- JSON blob                        │
│     updated_at TEXT NOT NULL                                        │
│   );                                                                │
│                                                                     │
│   -- OR structured tables (advanced mode)                           │
│   CREATE TABLE balances (                                           │
│     wallet_id TEXT PRIMARY KEY,                                     │
│     chain TEXT,                                                     │
│     confirmed INTEGER,                                              │
│     ...                                                             │
│   );                                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### Frontend (TypeScript)

```typescript
import { create } from 'zustand';
import { sqliteStorage } from '@tauri-sqlite-zustand/react';

// Simple mode: JSON blob storage
const useSettingsStore = create(
  sqliteStorage({
    name: 'settings',
  })((set) => ({
    theme: 'dark',
    currency: 'USD',
    setTheme: (theme) => set({ theme }),
  }))
);

// Advanced mode: Structured table with schema
const useBalancesStore = create(
  sqliteStorage({
    name: 'balances',
    schema: {
      wallet_id: 'TEXT PRIMARY KEY',
      chain: 'TEXT',
      asset: 'TEXT',
      confirmed: 'INTEGER',
      unconfirmed: 'INTEGER',
      last_synced: 'TEXT',
    },
    key: 'wallet_id', // Primary key for partial updates
  })((set) => ({
    balances: [],
    setBalance: (walletId, balance) =>
      set((s) => ({
        balances: s.balances.map(b =>
          b.wallet_id === walletId ? { ...b, ...balance } : b
        ),
      })),
  }))
);
```

### Configuration Options

```typescript
interface SqliteStorageOptions {
  // Required
  name: string;                    // Table/store name

  // Optional
  schema?: Record<string, string>; // Column definitions (advanced mode)
  key?: string;                    // Primary key column

  // Persistence behavior
  saveOnChange?: boolean;          // Auto-save on every change (default: true)
  saveStrategy?: 'debounce' | 'throttle';
  saveInterval?: number;           // ms (default: 100)

  // Lifecycle hooks
  onHydrate?: (state) => void;
  onSave?: (state) => void;
  onError?: (error) => void;
}
```

### Backend (Rust)

```rust
// In lib.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sqlite_zustand::Builder::new()
            .db_path("app.db")           // Custom DB path
            .auto_migrate(true)           // Auto-create tables
            .build()
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Storage Modes

### Mode 1: JSON Blob (Simple)

Best for: Settings, preferences, small state

```sql
CREATE TABLE zustand_stores (
  name TEXT PRIMARY KEY,
  state TEXT NOT NULL,  -- Full state as JSON
  updated_at TEXT NOT NULL
);
```

```typescript
// Frontend just works with normal Zustand
const useStore = create(sqliteStorage({ name: 'settings' })(...));
```

### Mode 2: Structured Tables (Advanced)

Best for: Relational data, large lists, queryable state

```sql
-- Auto-generated from schema option
CREATE TABLE balances (
  wallet_id TEXT PRIMARY KEY,
  chain TEXT,
  asset TEXT,
  confirmed INTEGER,
  unconfirmed INTEGER,
  last_synced TEXT
);
```

```typescript
const useStore = create(sqliteStorage({
  name: 'balances',
  schema: { ... },
  key: 'wallet_id',
})(...));
```

---

## Implementation Plan

### Phase 1: Internal Coinbox Implementation

Build directly in Coinbox, tightly coupled to our needs.

#### 1.1 SQLite Schema (in existing schema.rs)

```sql
-- Unified balances table
CREATE TABLE balances (
  wallet_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  confirmed TEXT NOT NULL DEFAULT '0',
  unconfirmed TEXT NOT NULL DEFAULT '0',
  last_synced TEXT,
  PRIMARY KEY (wallet_id, chain, asset),
  FOREIGN KEY (wallet_id) REFERENCES hd_wallets(id) ON DELETE CASCADE
);

-- Prices table
CREATE TABLE prices (
  asset TEXT PRIMARY KEY,
  price_usd REAL NOT NULL,
  last_updated TEXT NOT NULL
);

-- Use existing transactions table (already in v1)
```

#### 1.2 Rust Commands (new file: commands/store_sync.rs)

```rust
#[tauri::command]
pub async fn load_balances(db: State<'_, DbConnection>) -> Result<Vec<Balance>> {
    // Load all balances from SQLite
}

#[tauri::command]
pub async fn save_balance(db: State<'_, DbConnection>, balance: Balance) -> Result<()> {
    // Upsert balance to SQLite
}

#[tauri::command]
pub async fn load_prices(db: State<'_, DbConnection>) -> Result<Vec<Price>> {
    // Load all prices
}

#[tauri::command]
pub async fn save_price(db: State<'_, DbConnection>, price: Price) -> Result<()> {
    // Upsert price
}

#[tauri::command]
pub async fn load_transactions(db: State<'_, DbConnection>, wallet_id: String) -> Result<Vec<Transaction>> {
    // Load transactions for wallet
}

#[tauri::command]
pub async fn save_transactions(db: State<'_, DbConnection>, wallet_id: String, txs: Vec<Transaction>) -> Result<()> {
    // Bulk upsert transactions
}
```

#### 1.3 TypeScript Layer (lib/tauri/storeSync.ts)

```typescript
// Tauri command wrappers
export async function loadBalances(): Promise<Balance[]> {
  return invoke('load_balances');
}

export async function saveBalance(balance: Balance): Promise<void> {
  return invoke('save_balance', { balance });
}

// ... etc
```

#### 1.4 Zustand Integration (stores/chainStore.ts)

```typescript
interface ChainStoreState {
  // State
  balances: Record<string, Balance>;  // keyed by `${walletId}:${chain}:${asset}`
  transactions: Record<string, Transaction[]>;  // keyed by walletId
  prices: Record<string, Price>;  // keyed by asset

  // Status
  isHydrated: boolean;
  isSyncing: Record<string, boolean>;
  lastSynced: Record<string, string>;

  // Actions
  hydrate: () => Promise<void>;
  syncWallet: (walletId: string, chain: string) => Promise<void>;
  syncAllWallets: () => Promise<void>;
  syncPrices: () => Promise<void>;
}

export const useChainStore = create<ChainStoreState>()(
  devtools((set, get) => ({
    balances: {},
    transactions: {},
    prices: {},
    isHydrated: false,
    isSyncing: {},
    lastSynced: {},

    // Load from SQLite on app start
    hydrate: async () => {
      const [balances, prices] = await Promise.all([
        loadBalances(),
        loadPrices(),
      ]);

      set({
        balances: keyBy(balances, b => `${b.wallet_id}:${b.chain}:${b.asset}`),
        prices: keyBy(prices, 'asset'),
        isHydrated: true,
      });
    },

    // Sync single wallet: Network -> SQLite -> Zustand
    syncWallet: async (walletId, chain) => {
      set(s => ({ isSyncing: { ...s.isSyncing, [walletId]: true } }));

      try {
        // Fetch from network
        const balance = await fetchBalanceFromNetwork(walletId, chain);
        const txs = await fetchTransactionsFromNetwork(walletId, chain);

        // Save to SQLite
        await saveBalance(balance);
        await saveTransactions(walletId, txs);

        // Update Zustand
        set(s => ({
          balances: { ...s.balances, [`${walletId}:${chain}:${balance.asset}`]: balance },
          transactions: { ...s.transactions, [walletId]: txs },
          lastSynced: { ...s.lastSynced, [walletId]: new Date().toISOString() },
        }));
      } finally {
        set(s => ({ isSyncing: { ...s.isSyncing, [walletId]: false } }));
      }
    },

    syncAllWallets: async () => {
      const wallets = useWalletStore.getState().wallets;
      await Promise.all(
        wallets.flatMap(w =>
          w.addresses.map(a => get().syncWallet(w.id, a.chain))
        )
      );
    },

    syncPrices: async () => {
      const prices = await fetchPricesFromNetwork();
      await Promise.all(prices.map(p => savePrice(p)));
      set({ prices: keyBy(prices, 'asset') });
    },
  }), { name: 'ChainStore' })
);
```

#### 1.5 App Initialization (components/AppInitializer.tsx)

```typescript
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { hydrate, syncAllWallets, syncPrices, isHydrated } = useChainStore();
  const { loadWallets, wallets } = useWalletStore();

  useEffect(() => {
    async function init() {
      // 1. Load wallets from SQLite
      await loadWallets();

      // 2. Hydrate chain data from SQLite cache
      await hydrate();

      // 3. Start background sync
      syncAllWallets();  // Don't await - runs in background
      syncPrices();
    }

    init();
  }, []);

  // Show loading until hydrated
  if (!isHydrated) {
    return <SplashScreen />;
  }

  return children;
}
```

### Phase 2: Refactor & Extract

Once working in Coinbox, extract to standalone library.

#### Directory Structure (Future Repo)

```
tauri-plugin-sqlite-zustand/
├── packages/
│   ├── core/                    # Rust plugin
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── commands.rs
│   │   │   └── storage.rs
│   │   └── Cargo.toml
│   │
│   ├── js/                      # JS bindings
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware.ts    # Zustand middleware
│   │   │   └── storage.ts       # Storage adapter
│   │   └── package.json
│   │
│   └── react/                   # React-specific (optional)
│       └── ...
│
├── examples/
│   ├── basic/
│   └── advanced/
│
└── docs/
```

---

## Coinbox-Specific Implementation Details

### Schema Changes (Add to existing v1 migration)

Since we're in build mode with no breaking changes, add these tables to the existing v1 migration:

```sql
-- Add to migrate_v1() in schema.rs

-- Balances cache (unified for all chains)
CREATE TABLE IF NOT EXISTS balances (
  wallet_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  confirmed TEXT NOT NULL DEFAULT '0',
  unconfirmed TEXT NOT NULL DEFAULT '0',
  last_synced TEXT,
  PRIMARY KEY (wallet_id, chain, asset),
  FOREIGN KEY (wallet_id) REFERENCES hd_wallets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet_id);

-- Prices (simple)
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price_usd REAL NOT NULL,
  last_updated TEXT NOT NULL
);
```

### Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                        APP LIFECYCLE                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  APP START                                                       │
│  ─────────                                                       │
│  1. Load wallets from SQLite (hd_wallets, wallet_addresses)     │
│  2. Load cached balances/prices from SQLite                      │
│  3. Populate Zustand stores (instant UI)                         │
│  4. Start background sync for all wallets                        │
│  5. As sync completes: Update SQLite → Update Zustand            │
│                                                                  │
│  ADD WALLET                                                      │
│  ──────────                                                      │
│  1. Save wallet to SQLite                                        │
│  2. Update walletStore                                           │
│  3. Trigger sync for new wallet (background)                     │
│  4. Sync complete → SQLite → Zustand → UI updates                │
│                                                                  │
│  MANUAL REFRESH                                                  │
│  ──────────────                                                  │
│  1. User clicks refresh                                          │
│  2. Fetch from network                                           │
│  3. Update SQLite                                                │
│  4. Update Zustand                                               │
│                                                                  │
│  OFFLINE MODE                                                    │
│  ────────────                                                    │
│  1. SQLite has cached data                                       │
│  2. UI shows cached balances/transactions                        │
│  3. Show "last synced: X ago" indicator                          │
│  4. Network requests fail gracefully                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/db/schema.rs` | Modify | Add balances, prices tables to v1 |
| `src-tauri/src/commands/store_sync.rs` | Create | CRUD commands for cache |
| `src-tauri/src/commands/mod.rs` | Modify | Export new commands |
| `src-tauri/src/lib.rs` | Modify | Register new commands |
| `src/lib/tauri/storeSync.ts` | Create | TS wrappers for commands |
| `src/stores/chainStore.ts` | Create | Unified chain data store |
| `src/stores/bitcoinStore.ts` | Modify | Migrate to use chainStore |
| `src/components/AppInitializer.tsx` | Create | Hydration + background sync |
| `src/App.tsx` | Modify | Wrap with AppInitializer |

---

## Testing Checklist

- [ ] App start shows cached data immediately
- [ ] Background sync updates UI without user action
- [ ] Adding wallet auto-syncs
- [ ] Dashboard shows aggregated balances
- [ ] Transactions page shows all transactions
- [ ] Wallet detail page shows correct data
- [ ] Offline mode works with cached data
- [ ] "Last synced" indicators show correct time
- [ ] Refresh button triggers re-sync
- [ ] Data persists across app restarts

---

## Future: Open Source Extraction

### GitHub Issues to Create (for future repo)

1. **Core Plugin**
   - [ ] Rust plugin structure
   - [ ] SQLite storage backend
   - [ ] JSON blob mode
   - [ ] Structured table mode
   - [ ] Auto-migration support

2. **JS Package**
   - [ ] Zustand middleware
   - [ ] TypeScript types
   - [ ] Async hydration handling

3. **Documentation**
   - [ ] Getting started guide
   - [ ] API reference
   - [ ] Migration from localStorage
   - [ ] Examples

4. **Features**
   - [ ] Multi-window sync
   - [ ] Encryption support
   - [ ] Selective persistence (partialize)
   - [ ] Version migrations

---

## References

- [Zustand Persist Docs](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [tauri-plugin-zustand](https://crates.io/crates/tauri-plugin-zustand) - Inspiration for API
- [tauri-plugin-sql](https://v2.tauri.app/plugin/sql/) - Official SQL plugin
- [Tauri Store Plugin](https://github.com/ferreira-tb/tauri-store) - Multi-framework approach
