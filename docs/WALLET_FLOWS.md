# Wallet Core - End-to-End Flows

Detailed documentation of how each wallet action flows from UI → Tauri IPC → Rust Core, including data structures at each layer.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layer Responsibilities](#layer-responsibilities)
3. [Flows](#flows)
   - [Create HD Wallet](#1-create-hd-wallet)
   - [Import Wallet from Mnemonic](#2-import-wallet-from-mnemonic)
   - [Add Watch-Only Address](#3-add-watch-only-address)
   - [Unlock Wallet](#4-unlock-wallet)
   - [Lock Wallet](#5-lock-wallet)
   - [Derive New Address](#6-derive-new-address)
   - [Export Mnemonic](#7-export-mnemonic-backup)
   - [Delete Wallet](#8-delete-wallet)
   - [Get All Wallets](#9-get-all-wallets)
4. [Data Structures](#data-structures)
5. [Error Handling](#error-handling)
6. [Mobile App Considerations](#mobile-app-considerations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND LAYER                                │
│                         (React + TypeScript)                             │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐  │
│  │   React Pages   │    │   Zustand Store │    │   Tauri Wrappers    │  │
│  │                 │◄───┤                 │◄───┤                     │  │
│  │  - WalletsPage  │    │  walletStore.ts │    │  lib/tauri/wallet   │  │
│  │  - Dashboard    │    │                 │    │                     │  │
│  └─────────────────┘    └─────────────────┘    └──────────┬──────────┘  │
│                                                            │             │
└────────────────────────────────────────────────────────────┼─────────────┘
                                                             │
                               invoke('command', { params }) │
                                                             │
                         ════════════════════════════════════╪═════════════
                                     TAURI IPC BRIDGE        │
                         ════════════════════════════════════╪═════════════
                                                             │
┌────────────────────────────────────────────────────────────┼─────────────┐
│                            RUST BACKEND                    │             │
│                           (Tauri + Rust)                   ▼             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Tauri Commands Layer                          │    │
│  │                   (commands/wallet.rs)                           │    │
│  │                                                                  │    │
│  │  #[tauri::command]                                               │    │
│  │  pub async fn create_hd_wallet(                                  │    │
│  │      request: CreateHDWalletRequest,                             │    │
│  │      wallet_manager: State<'_, WalletManager>,                   │    │
│  │  ) -> Result<CreateHDWalletResponse, Error>                      │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 │                                        │
│                                 ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Wallet Manager Layer                          │    │
│  │                     (wallet/core.rs)                             │    │
│  │                                                                  │    │
│  │  pub struct WalletManager {                                      │    │
│  │      storage: Arc<SecureStorage>,                                │    │
│  │      registry: Arc<ChainRegistry>,                               │    │
│  │      db: Arc<Database>,                                          │    │
│  │  }                                                               │    │
│  └───────┬─────────────────────┬───────────────────────┬────────────┘    │
│          │                     │                       │                 │
│          ▼                     ▼                       ▼                 │
│  ┌───────────────┐    ┌───────────────┐    ┌──────────────────────┐     │
│  │   Storage     │    │   Registry    │    │      Database        │     │
│  │               │    │               │    │                      │     │
│  │ Stronghold    │    │ ChainModules  │    │  SQLite              │     │
│  │ (Secrets)     │    │ (Derivation)  │    │  (Metadata)          │     │
│  └───────────────┘    └───────────────┘    └──────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Frontend Layer

| Component | Responsibility |
|-----------|---------------|
| **React Pages** | UI rendering, user interactions, form handling |
| **Zustand Store** | Client-side state, caching, optimistic updates |
| **Tauri Wrappers** | Type-safe IPC calls, error mapping |

### Tauri IPC Bridge

- Serializes/deserializes JSON between JS and Rust
- Handles async command execution
- Provides type safety via serde

### Rust Backend

| Component | Responsibility |
|-----------|---------------|
| **Commands** | Input validation, request/response mapping |
| **WalletManager** | Business logic orchestration |
| **Storage** | Encrypted secret management (Stronghold) |
| **Registry** | Chain-specific key derivation |
| **Database** | Persistent metadata storage (SQLite) |

---

## Flows

### 1. Create HD Wallet

The most complex flow - generates a new wallet with mnemonic.

#### User Journey
```
User clicks "Create New Wallet"
    → Enters wallet name
    → Selects chains (Bitcoin, Ethereum, Solana...)
    → Sees 12/24 word mnemonic
    → Verifies backup (3 random words)
    → Sets encryption password
    → Wallet created!
```

#### Sequence Diagram

```
┌──────────┐     ┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    UI    │     │ walletStore   │     │  Tauri Wrapper   │     │   Rust Backend  │
└────┬─────┘     └───────┬───────┘     └────────┬─────────┘     └────────┬────────┘
     │                   │                      │                        │
     │ Click "Create"    │                      │                        │
     │──────────────────►│                      │                        │
     │                   │                      │                        │
     │                   │ startCreationFlow()  │                        │
     │                   │─────────────────────►│                        │
     │                   │                      │                        │
     │◄──────────────────│ Show mnemonic screen │                        │
     │                   │                      │                        │
     │ Enter name,       │                      │                        │
     │ select chains,    │                      │                        │
     │ set password      │                      │                        │
     │──────────────────►│                      │                        │
     │                   │                      │                        │
     │                   │ createHDWallet()     │                        │
     │                   │─────────────────────►│                        │
     │                   │                      │                        │
     │                   │                      │ invoke('create_hd_wallet', req)
     │                   │                      │───────────────────────►│
     │                   │                      │                        │
     │                   │                      │                        │ ┌───────────────────┐
     │                   │                      │                        │ │ 1. Generate       │
     │                   │                      │                        │ │    mnemonic       │
     │                   │                      │                        │ │                   │
     │                   │                      │                        │ │ 2. Derive seed    │
     │                   │                      │                        │ │                   │
     │                   │                      │                        │ │ 3. Encrypt &      │
     │                   │                      │                        │ │    store in       │
     │                   │                      │                        │ │    Stronghold     │
     │                   │                      │                        │ │                   │
     │                   │                      │                        │ │ 4. Derive         │
     │                   │                      │                        │ │    addresses      │
     │                   │                      │                        │ │    per chain      │
     │                   │                      │                        │ │                   │
     │                   │                      │                        │ │ 5. Save to        │
     │                   │                      │                        │ │    SQLite         │
     │                   │                      │                        │ └───────────────────┘
     │                   │                      │                        │
     │                   │                      │◄───────────────────────│
     │                   │                      │  CreateHDWalletResponse│
     │                   │◄─────────────────────│                        │
     │                   │                      │                        │
     │                   │ Update store state   │                        │
     │                   │ (add wallet, clear   │                        │
     │                   │  creation flow)      │                        │
     │                   │                      │                        │
     │◄──────────────────│ Show success screen  │                        │
     │                   │ with addresses       │                        │
     │                   │                      │                        │
```

#### Data Structures

**Step 1: Frontend Request**
```typescript
// src/lib/tauri/wallet.ts

interface CreateHDWalletRequest {
  name: string;
  password: string;
  mnemonic?: string;        // undefined = generate new
  chains: string[];         // ["bitcoin", "ethereum", "solana"]
}

// Called from UI
const response = await createHDWallet({
  name: "My Main Wallet",
  password: "user_password_123",
  mnemonic: undefined,      // Generate new
  chains: ["bitcoin", "ethereum", "solana"]
});
```

**Step 2: Tauri IPC Serialization**
```json
// JSON over IPC
{
  "name": "My Main Wallet",
  "password": "user_password_123",
  "mnemonic": null,
  "chains": ["bitcoin", "ethereum", "solana"]
}
```

**Step 3: Rust Command Handler**
```rust
// src-tauri/src/commands/wallet.rs

#[derive(Debug, Deserialize)]
pub struct CreateHDWalletRequest {
    pub name: String,
    pub password: String,
    pub mnemonic: Option<String>,
    pub chains: Vec<String>,
}

#[tauri::command]
pub async fn create_hd_wallet(
    request: CreateHDWalletRequest,
    wallet_manager: State<'_, WalletManager>,
) -> Result<CreateHDWalletResponse, Error> {
    wallet_manager.create_hd_wallet(request).await
}
```

**Step 4: WalletManager Business Logic**
```rust
// src-tauri/src/wallet/core.rs

impl WalletManager {
    pub async fn create_hd_wallet(
        &self,
        request: CreateHDWalletRequest,
    ) -> Result<CreateHDWalletResponse, Error> {
        // 1. Generate or use provided mnemonic
        let mnemonic = match request.mnemonic {
            Some(m) => {
                Mnemonic::validate(&m)?;
                m
            }
            None => Mnemonic::generate(12)?,  // 12 words
        };

        // 2. Convert to seed
        let seed = Mnemonic::to_seed(&mnemonic, "")?;

        // 3. Generate wallet ID
        let wallet_id = Uuid::new_v4().to_string();

        // 4. Store encrypted in Stronghold
        self.storage.store_mnemonic(
            &wallet_id,
            &mnemonic,
            &request.password
        ).await?;

        // 5. Derive addresses for each chain
        let addresses = self.registry
            .derive_addresses(&seed, &request.chains, 0)?;

        // 6. Save wallet metadata to SQLite
        self.db.execute(|conn| {
            conn.execute(
                "INSERT INTO hd_wallets (id, name, wallet_type, created_at, updated_at)
                 VALUES (?1, ?2, 'hd', datetime('now'), datetime('now'))",
                params![&wallet_id, &request.name],
            )?;

            for addr in &addresses {
                conn.execute(
                    "INSERT INTO wallet_addresses
                     (id, wallet_id, chain, chain_family, address, derivation_path, is_primary, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, datetime('now'))",
                    params![
                        Uuid::new_v4().to_string(),
                        &wallet_id,
                        &addr.chain,
                        &addr.chain_family.to_string(),
                        &addr.address,
                        &addr.derivation_path,
                    ],
                )?;
            }
            Ok(())
        })?;

        // 7. Return response (mnemonic ONLY returned here, once!)
        Ok(CreateHDWalletResponse {
            wallet_id,
            mnemonic,  // ⚠️ Only time mnemonic leaves Rust!
            addresses: addresses.into_iter().map(|a| ChainAddressResponse {
                chain: a.chain,
                address: a.address,
                derivation_path: a.derivation_path,
            }).collect(),
        })
    }
}
```

**Step 5: Response to Frontend**
```typescript
// src/lib/tauri/wallet.ts

interface CreateHDWalletResponse {
  wallet_id: string;
  mnemonic: string;           // Only returned once!
  addresses: ChainAddressResponse[];
}

interface ChainAddressResponse {
  chain: string;
  address: string;
  derivation_path: string;
}

// Example response:
{
  wallet_id: "550e8400-e29b-41d4-a716-446655440000",
  mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  addresses: [
    { chain: "bitcoin", address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", derivation_path: "m/84'/0'/0'/0/0" },
    { chain: "ethereum", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", derivation_path: "m/44'/60'/0'/0/0" },
    { chain: "solana", address: "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy", derivation_path: "m/44'/501'/0'/0'" }
  ]
}
```

**Step 6: Zustand Store Update**
```typescript
// src/stores/walletStore.ts

interface WalletState {
  wallets: WalletWithAddresses[];
  creationFlow: {
    isOpen: boolean;
    step: WalletFlowStep;
    generatedMnemonic: string[] | null;
  };
}

// After successful creation:
set((state) => ({
  wallets: [...state.wallets, newWallet],
  creationFlow: {
    isOpen: false,
    step: 'select-type',
    generatedMnemonic: null,  // Clear mnemonic from memory!
  }
}));
```

---

### 2. Import Wallet from Mnemonic

#### User Journey
```
User clicks "Import Wallet"
    → Enters 12/24 word mnemonic
    → Validates words exist in BIP39 wordlist
    → Selects chains to import
    → Sets encryption password
    → Wallet imported!
```

#### Flow

```
┌──────────┐     ┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    UI    │     │ walletStore   │     │  Tauri Wrapper   │     │   Rust Backend  │
└────┬─────┘     └───────┬───────┘     └────────┬─────────┘     └────────┬────────┘
     │                   │                      │                        │
     │ Enter mnemonic    │                      │                        │
     │──────────────────►│                      │                        │
     │                   │                      │                        │
     │                   │ validateMnemonic()   │                        │
     │                   │─────────────────────►│                        │
     │                   │                      │ invoke('validate_mnemonic')
     │                   │                      │───────────────────────►│
     │                   │                      │                        │
     │                   │                      │                        │ Check each word
     │                   │                      │                        │ against BIP39 list
     │                   │                      │                        │
     │                   │                      │◄───────────────────────│
     │                   │◄─────────────────────│ { is_valid: true }     │
     │                   │                      │                        │
     │ Valid! Continue   │                      │                        │
     │ Select chains +   │                      │                        │
     │ set password      │                      │                        │
     │──────────────────►│                      │                        │
     │                   │                      │                        │
     │                   │ importHDWallet()     │                        │
     │                   │─────────────────────►│                        │
     │                   │                      │ invoke('import_hd_wallet')
     │                   │                      │───────────────────────►│
     │                   │                      │                        │
     │                   │                      │                        │ Same as create,
     │                   │                      │                        │ but uses provided
     │                   │                      │                        │ mnemonic
     │                   │                      │                        │
     │                   │                      │◄───────────────────────│
     │                   │◄─────────────────────│ ImportResponse         │
     │                   │                      │                        │
     │◄──────────────────│ Show imported wallet │                        │
```

#### Key Difference from Create

```rust
// In create_hd_wallet:
let mnemonic = Mnemonic::generate(12)?;  // New random

// In import_hd_wallet:
let mnemonic = request.mnemonic
    .ok_or(Error::MnemonicRequired)?;     // Must be provided
Mnemonic::validate(&mnemonic)?;            // Validate it
```

---

### 3. Add Watch-Only Address

Watch-only wallets track balances without private keys.

#### User Journey
```
User clicks "Watch Address"
    → Selects chain (Bitcoin, Ethereum, etc.)
    → Enters public address
    → Address validated
    → Wallet added!
```

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐
│    UI    │     │  Tauri Wrapper  │     │   Rust Backend  │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘
     │                    │                       │
     │ Enter address      │                       │
     │ "bc1qar0..."       │                       │
     │───────────────────►│                       │
     │                    │                       │
     │                    │ invoke('add_watch_only_address')
     │                    │──────────────────────►│
     │                    │                       │
     │                    │                       │ 1. Get chain module
     │                    │                       │    from registry
     │                    │                       │
     │                    │                       │ 2. Validate address
     │                    │                       │    format
     │                    │                       │
     │                    │                       │ 3. Insert into SQLite
     │                    │                       │    (NO Stronghold -
     │                    │                       │     no secrets!)
     │                    │                       │
     │                    │◄──────────────────────│
     │◄───────────────────│ WalletWithAddresses   │
     │                    │                       │
```

#### Rust Implementation

```rust
// src-tauri/src/commands/wallet.rs

#[tauri::command]
pub async fn add_watch_only_address(
    request: AddWatchOnlyRequest,
    wallet_manager: State<'_, WalletManager>,
) -> Result<WalletWithAddresses, Error> {
    wallet_manager.add_watch_only(request).await
}

// src-tauri/src/wallet/core.rs

impl WalletManager {
    pub async fn add_watch_only(
        &self,
        request: AddWatchOnlyRequest,
    ) -> Result<WalletWithAddresses, Error> {
        // 1. Get chain module
        let chain_module = self.registry
            .get(&request.chain)
            .ok_or(Error::UnsupportedChain(request.chain.clone()))?;

        // 2. Validate address format
        if !chain_module.validate_address(&request.address) {
            return Err(Error::InvalidAddress(request.address));
        }

        // 3. Create wallet (NO Stronghold interaction!)
        let wallet_id = Uuid::new_v4().to_string();

        self.db.execute(|conn| {
            conn.execute(
                "INSERT INTO hd_wallets (id, name, wallet_type, created_at, updated_at)
                 VALUES (?1, ?2, 'watch_only', datetime('now'), datetime('now'))",
                params![&wallet_id, &request.name],
            )?;

            conn.execute(
                "INSERT INTO wallet_addresses
                 (id, wallet_id, chain, chain_family, address, is_primary, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'))",
                params![
                    Uuid::new_v4().to_string(),
                    &wallet_id,
                    &request.chain,
                    chain_module.chain_family().to_string(),
                    &request.address,
                ],
            )?;

            Ok(())
        })?;

        // 4. Return wallet (note: no derivation_path for watch-only)
        Ok(WalletWithAddresses {
            wallet: WalletInfo {
                id: wallet_id,
                name: request.name,
                wallet_type: WalletType::WatchOnly,
                ..Default::default()
            },
            addresses: vec![ChainAddress {
                chain: request.chain,
                address: request.address,
                derivation_path: None,  // No derivation for watch-only
                is_primary: true,
            }],
        })
    }
}
```

---

### 4. Unlock Wallet

Required before signing transactions or exporting mnemonic.

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│    UI    │     │  Tauri Wrapper  │     │   WalletManager │     │  Stronghold  │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘     └──────┬───────┘
     │                    │                       │                     │
     │ Enter password     │                       │                     │
     │───────────────────►│                       │                     │
     │                    │                       │                     │
     │                    │ invoke('unlock_wallet')                     │
     │                    │──────────────────────►│                     │
     │                    │                       │                     │
     │                    │                       │ Try to read         │
     │                    │                       │ mnemonic with pwd   │
     │                    │                       │────────────────────►│
     │                    │                       │                     │
     │                    │                       │                     │ Decrypt with
     │                    │                       │                     │ Argon2 + XChaCha20
     │                    │                       │                     │
     │                    │                       │◄────────────────────│
     │                    │                       │ Success / Failure   │
     │                    │                       │                     │
     │                    │                       │ If success:         │
     │                    │                       │ Cache session       │
     │                    │                       │ (expires in 15min)  │
     │                    │                       │                     │
     │                    │◄──────────────────────│                     │
     │◄───────────────────│ { unlocked: true }    │                     │
     │                    │                       │                     │
```

#### Session Management

```rust
// src-tauri/src/wallet/core.rs

pub struct WalletManager {
    sessions: RwLock<HashMap<String, WalletSession>>,
    // ...
}

pub struct WalletSession {
    wallet_id: String,
    seed: SecretSeed,           // Cached for signing
    unlocked_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,  // 15 minutes
}

impl WalletManager {
    pub async fn unlock_wallet(
        &self,
        wallet_id: &str,
        password: &str,
    ) -> Result<bool, Error> {
        // 1. Try to decrypt mnemonic
        let mnemonic = self.storage
            .get_mnemonic(wallet_id, password)
            .await
            .map_err(|_| Error::InvalidPassword)?;

        // 2. Derive seed
        let seed = Mnemonic::to_seed(&mnemonic, "")?;

        // 3. Cache session
        let session = WalletSession {
            wallet_id: wallet_id.to_string(),
            seed: SecretSeed(seed),
            unlocked_at: Utc::now(),
            expires_at: Utc::now() + Duration::minutes(15),
        };

        self.sessions
            .write()
            .await
            .insert(wallet_id.to_string(), session);

        Ok(true)
    }

    pub async fn is_unlocked(&self, wallet_id: &str) -> Result<bool, Error> {
        let sessions = self.sessions.read().await;

        match sessions.get(wallet_id) {
            Some(session) if session.expires_at > Utc::now() => Ok(true),
            Some(_) => {
                // Session expired, remove it
                drop(sessions);
                self.sessions.write().await.remove(wallet_id);
                Ok(false)
            }
            None => Ok(false),
        }
    }
}
```

---

### 5. Lock Wallet

Clears cached session and secrets from memory.

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐
│    UI    │     │  Tauri Wrapper  │     │   WalletManager │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘
     │                    │                       │
     │ Click Lock         │                       │
     │───────────────────►│                       │
     │                    │                       │
     │                    │ invoke('lock_wallet') │
     │                    │──────────────────────►│
     │                    │                       │
     │                    │                       │ Remove session
     │                    │                       │ from HashMap
     │                    │                       │
     │                    │                       │ SecretSeed is
     │                    │                       │ Zeroized on drop
     │                    │                       │
     │                    │◄──────────────────────│
     │◄───────────────────│ { success: true }     │
     │                    │                       │
```

#### Implementation

```rust
impl WalletManager {
    pub async fn lock_wallet(&self, wallet_id: &str) -> Result<(), Error> {
        // Remove session - SecretSeed implements ZeroizeOnDrop
        // so the seed bytes are securely cleared from memory
        self.sessions.write().await.remove(wallet_id);
        Ok(())
    }
}
```

---

### 6. Derive New Address

Generate additional addresses for an HD wallet.

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│    UI    │     │  Tauri Wrapper  │     │   WalletManager │     │  ChainModule │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘     └──────┬───────┘
     │                    │                       │                     │
     │ Request new        │                       │                     │
     │ Ethereum address   │                       │                     │
     │───────────────────►│                       │                     │
     │                    │                       │                     │
     │                    │ invoke('derive_new_address')                │
     │                    │──────────────────────►│                     │
     │                    │                       │                     │
     │                    │                       │ Check wallet        │
     │                    │                       │ is unlocked         │
     │                    │                       │                     │
     │                    │                       │ Get cached seed     │
     │                    │                       │                     │
     │                    │                       │ Get next index      │
     │                    │                       │ from SQLite         │
     │                    │                       │                     │
     │                    │                       │ derive_address()    │
     │                    │                       │────────────────────►│
     │                    │                       │                     │
     │                    │                       │                     │ BIP32/SLIP10
     │                    │                       │                     │ derivation
     │                    │                       │                     │
     │                    │                       │◄────────────────────│
     │                    │                       │ DerivedAddress      │
     │                    │                       │                     │
     │                    │                       │ Save to SQLite      │
     │                    │                       │                     │
     │                    │◄──────────────────────│                     │
     │◄───────────────────│ ChainAddressResponse  │                     │
     │                    │                       │                     │
```

#### Implementation

```rust
impl WalletManager {
    pub async fn derive_address(
        &self,
        request: DeriveAddressRequest,
    ) -> Result<ChainAddressResponse, Error> {
        // 1. Check unlocked
        let sessions = self.sessions.read().await;
        let session = sessions
            .get(&request.wallet_id)
            .ok_or(Error::WalletLocked)?;

        if session.expires_at < Utc::now() {
            return Err(Error::SessionExpired);
        }

        // 2. Get next address index from DB
        let next_index = self.db.execute(|conn| {
            conn.query_row(
                "SELECT COALESCE(MAX(address_index), -1) + 1
                 FROM wallet_addresses
                 WHERE wallet_id = ?1 AND chain = ?2",
                params![&request.wallet_id, &request.chain],
                |row| row.get::<_, u32>(0),
            )
        })?;

        // 3. Derive new address
        let chain_module = self.registry
            .get(&request.chain)
            .ok_or(Error::UnsupportedChain(request.chain.clone()))?;

        let account = request.account_index.unwrap_or(0);
        let derived = chain_module.derive_address(
            &session.seed.0,
            account,
            next_index,
        )?;

        // 4. Save to database
        self.db.execute(|conn| {
            conn.execute(
                "INSERT INTO wallet_addresses
                 (id, wallet_id, chain, chain_family, address, derivation_path,
                  account_index, address_index, is_primary, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, datetime('now'))",
                params![
                    Uuid::new_v4().to_string(),
                    &request.wallet_id,
                    &derived.chain,
                    chain_module.chain_family().to_string(),
                    &derived.address,
                    &derived.derivation_path,
                    account,
                    next_index,
                ],
            )
        })?;

        Ok(ChainAddressResponse {
            chain: derived.chain,
            address: derived.address,
            derivation_path: derived.derivation_path,
        })
    }
}
```

---

### 7. Export Mnemonic (Backup)

Retrieve the mnemonic for backup purposes.

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│    UI    │     │  Tauri Wrapper  │     │   WalletManager │     │  Stronghold  │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘     └──────┬───────┘
     │                    │                       │                     │
     │ Enter password     │                       │                     │
     │ to export          │                       │                     │
     │───────────────────►│                       │                     │
     │                    │                       │                     │
     │                    │ invoke('export_mnemonic')                   │
     │                    │──────────────────────►│                     │
     │                    │                       │                     │
     │                    │                       │ Read mnemonic       │
     │                    │                       │────────────────────►│
     │                    │                       │                     │
     │                    │                       │                     │ Decrypt
     │                    │                       │                     │
     │                    │                       │◄────────────────────│
     │                    │                       │ mnemonic string     │
     │                    │                       │                     │
     │                    │◄──────────────────────│                     │
     │◄───────────────────│ mnemonic (SENSITIVE!) │                     │
     │                    │                       │                     │
     │ Display mnemonic   │                       │                     │
     │ with blur/reveal   │                       │                     │
     │                    │                       │                     │
     │ User copies and    │                       │                     │
     │ closes modal       │                       │                     │
     │                    │                       │                     │
     │ Clear mnemonic     │                       │                     │
     │ from JS memory     │                       │                     │
```

#### Security Note

```typescript
// Frontend must clear mnemonic after display
const [mnemonic, setMnemonic] = useState<string | null>(null);

// When modal closes:
const handleClose = () => {
  setMnemonic(null);  // Clear from React state
  // Note: JS can't truly "zero" memory, but this removes reference
};
```

---

### 8. Delete Wallet

Remove wallet and all associated data.

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│    UI    │     │  Tauri Wrapper  │     │   WalletManager │     │  Stronghold  │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘     └──────┬───────┘
     │                    │                       │                     │
     │ Confirm delete     │                       │                     │
     │───────────────────►│                       │                     │
     │                    │                       │                     │
     │                    │ invoke('delete_wallet')                     │
     │                    │──────────────────────►│                     │
     │                    │                       │                     │
     │                    │                       │ 1. Lock wallet      │
     │                    │                       │    (clear session)  │
     │                    │                       │                     │
     │                    │                       │ 2. Delete from      │
     │                    │                       │    Stronghold       │
     │                    │                       │────────────────────►│
     │                    │                       │                     │
     │                    │                       │                     │ Remove client
     │                    │                       │                     │
     │                    │                       │◄────────────────────│
     │                    │                       │                     │
     │                    │                       │ 3. Delete from      │
     │                    │                       │    SQLite           │
     │                    │                       │    (CASCADE)        │
     │                    │                       │                     │
     │                    │◄──────────────────────│                     │
     │◄───────────────────│ { success: true }     │                     │
     │                    │                       │                     │
```

---

### 9. Get All Wallets

Load wallet list on app startup.

#### Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│    UI    │     │   walletStore   │     │   WalletManager │     │    SQLite    │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘     └──────┬───────┘
     │                    │                       │                     │
     │ Page mounts        │                       │                     │
     │───────────────────►│                       │                     │
     │                    │                       │                     │
     │                    │ fetchWallets()        │                     │
     │                    │──────────────────────►│                     │
     │                    │                       │                     │
     │                    │                       │ SELECT wallets      │
     │                    │                       │ JOIN addresses      │
     │                    │                       │────────────────────►│
     │                    │                       │                     │
     │                    │                       │◄────────────────────│
     │                    │                       │ Rows                │
     │                    │                       │                     │
     │                    │                       │ Group by wallet     │
     │                    │                       │                     │
     │                    │◄──────────────────────│                     │
     │                    │ Vec<WalletWithAddresses>                    │
     │                    │                       │                     │
     │                    │ Update store          │                     │
     │◄───────────────────│ Trigger re-render     │                     │
```

---

## Data Structures

### Shared Between Layers

```typescript
// Frontend (TypeScript)
export interface WalletWithAddresses {
  wallet: WalletInfo;
  addresses: ChainAddress[];
}

export interface WalletInfo {
  id: string;
  name: string;
  wallet_type: 'hd' | 'private_key' | 'watch_only' | 'hardware';
  has_backup_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChainAddress {
  chain: string;
  address: string;
  chain_family: 'secp256k1' | 'ed25519' | 'sr25519';
  derivation_path?: string;  // undefined for watch-only
  is_primary: boolean;
}
```

```rust
// Backend (Rust)
#[derive(Debug, Serialize, Deserialize)]
pub struct WalletWithAddresses {
    pub wallet: WalletInfo,
    pub addresses: Vec<ChainAddress>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WalletInfo {
    pub id: String,
    pub name: String,
    pub wallet_type: WalletType,
    pub has_backup_verified: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChainAddress {
    pub chain: String,
    pub address: String,
    pub chain_family: String,
    pub derivation_path: Option<String>,
    pub is_primary: bool,
}
```

---

## Error Handling

### Error Types

```rust
// src-tauri/src/wallet/error.rs

#[derive(Debug, thiserror::Error)]
pub enum WalletError {
    #[error("Invalid mnemonic: {0}")]
    InvalidMnemonic(String),

    #[error("Invalid password")]
    InvalidPassword,

    #[error("Wallet not found: {0}")]
    WalletNotFound(String),

    #[error("Wallet is locked")]
    WalletLocked,

    #[error("Session expired")]
    SessionExpired,

    #[error("Unsupported chain: {0}")]
    UnsupportedChain(String),

    #[error("Invalid address: {0}")]
    InvalidAddress(String),

    #[error("Derivation error: {0}")]
    Derivation(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
}

// Convert to Tauri-compatible error
impl From<WalletError> for tauri::Error {
    fn from(e: WalletError) -> Self {
        tauri::Error::from(e.to_string())
    }
}
```

### Frontend Error Handling

```typescript
// src/lib/tauri/wallet.ts

export class WalletError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function createHDWallet(
  request: CreateHDWalletRequest
): Promise<CreateHDWalletResponse> {
  try {
    return await invoke('create_hd_wallet', { request });
  } catch (error) {
    // Map Rust errors to frontend errors
    if (error.includes('Invalid mnemonic')) {
      throw new WalletError('INVALID_MNEMONIC', error);
    }
    if (error.includes('Invalid password')) {
      throw new WalletError('INVALID_PASSWORD', error);
    }
    throw new WalletError('UNKNOWN', error);
  }
}

// Usage in component
try {
  await createHDWallet(request);
} catch (error) {
  if (error instanceof WalletError) {
    if (error.code === 'INVALID_PASSWORD') {
      toast.error('Incorrect password');
    }
  }
}
```

---

## Mobile App Considerations

### Architecture Comparison

| Aspect | Desktop (Tauri) | Mobile (React Native) |
|--------|-----------------|----------------------|
| **Rust Integration** | Tauri commands | rust-module (Turbo Modules) |
| **IPC** | `invoke()` | Native Modules |
| **Storage** | Stronghold | Platform Keychain + Stronghold |
| **UI Framework** | React | React Native |

### Shared Code

```
packages/
├── core/                    # Shared TypeScript types
│   └── src/types/
│       ├── wallet.ts        # ✅ Reusable
│       ├── chain.ts         # ✅ Reusable
│       └── transaction.ts   # ✅ Reusable
│
├── wallet-core/             # NEW - Shared Rust library
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── mnemonic.rs      # ✅ Reusable
│       ├── chains/          # ✅ Reusable
│       └── storage.rs       # Platform-specific

apps/
├── desktop/                 # Tauri app
│   └── src-tauri/
│       └── src/
│           ├── commands/    # Tauri-specific
│           └── wallet/      # Uses wallet-core
│
└── mobile/                  # React Native app (future)
    └── native-modules/
        └── wallet/          # Uses wallet-core
```

### Mobile-Specific Considerations

1. **Secure Storage:**
   - iOS: Use Keychain Services
   - Android: Use KeyStore + EncryptedSharedPreferences

2. **Background Processing:**
   - Mobile OSes kill background apps
   - Auto-lock on app background
   - Clear sensitive data on background

3. **Biometric Auth:**
   - Touch ID / Face ID (iOS)
   - Fingerprint / Face Unlock (Android)
   - Can unlock wallet without password

4. **Platform Keychain:**
```rust
// Mobile might use platform keychain instead of Stronghold
#[cfg(target_os = "ios")]
use security_framework::keychain;

#[cfg(target_os = "android")]
use android_keystore;
```

---

*Last updated: January 2026*
*Part of the Coinbox 2.0 Wallet Core implementation*
