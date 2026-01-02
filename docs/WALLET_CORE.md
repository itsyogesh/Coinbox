# Wallet Core Architecture

A comprehensive technical guide to the Coinbox wallet core implementation, covering HD wallet generation, multi-chain key derivation, and secure storage.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
   - [BIP39 - Mnemonic Phrases](#bip39---mnemonic-phrases)
   - [BIP32 - Hierarchical Deterministic Wallets](#bip32---hierarchical-deterministic-wallets)
   - [BIP44 - Multi-Account Hierarchy](#bip44---multi-account-hierarchy)
   - [SLIP-0044 - Coin Type Registry](#slip-0044---coin-type-registry)
   - [SLIP-0010 - Ed25519 Key Derivation](#slip-0010---ed25519-key-derivation)
3. [Cryptographic Algorithms](#cryptographic-algorithms)
   - [Secp256k1 (Bitcoin, Ethereum)](#secp256k1-bitcoin-ethereum)
   - [Ed25519 (Solana, NEAR)](#ed25519-solana-near)
   - [SR25519 (Polkadot)](#sr25519-polkadot---future)
4. [Architecture Design](#architecture-design)
   - [Chain Module Trait](#chain-module-trait)
   - [Chain Registry](#chain-registry)
   - [Data Flow](#data-flow)
5. [Secure Storage](#secure-storage)
   - [IOTA Stronghold](#iota-stronghold)
   - [Encryption Details](#encryption-details)
6. [Derivation Paths](#derivation-paths)
7. [Implementation Details](#implementation-details)
8. [Adding New Chains](#adding-new-chains)
9. [Security Considerations](#security-considerations)
10. [References](#references)

---

## Overview

Coinbox uses a **single mnemonic phrase** to generate keys for all supported blockchains. This is the industry standard approach used by hardware wallets (Ledger, Trezor) and software wallets (MetaMask, Phantom, Trust Wallet).

### Supported Chain Families

| Family | Curve | Algorithm | Chains |
|--------|-------|-----------|--------|
| **Secp256k1** | secp256k1 | ECDSA | Bitcoin, Ethereum, EVMs, Cosmos, Avalanche |
| **Ed25519** | Curve25519 | EdDSA | Solana, NEAR |
| **SR25519** | Ristretto | Schnorr | Polkadot, Kusama (future) |

---

## Key Concepts

### BIP39 - Mnemonic Phrases

**What it is:** A standard for generating human-readable backup phrases (12 or 24 words) that can be used to recover a wallet.

**How it works:**
1. Generate 128 bits (12 words) or 256 bits (24 words) of entropy
2. Add a checksum (first bits of SHA256 hash)
3. Split into 11-bit groups → each maps to a word from the [2048-word list](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)
4. Convert mnemonic + optional passphrase → 512-bit seed using PBKDF2

```
Entropy (128/256 bits) → Checksum → Words → PBKDF2 → 512-bit Seed
```

**Example:**
```
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```

**Learn more:**
- [BIP39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP39 Wordlist](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)
- [Interactive BIP39 Tool](https://iancoleman.io/bip39/)

---

### BIP32 - Hierarchical Deterministic Wallets

**What it is:** A standard for deriving unlimited child keys from a single master seed in a tree structure.

**How it works:**
1. Master seed (512 bits) → HMAC-SHA512 → Master private key + Chain code
2. Each child key is derived from parent key + chain code + index
3. **Hardened derivation** (index ≥ 2³¹): Uses private key, more secure
4. **Normal derivation** (index < 2³¹): Uses public key, allows xpub sharing

```
Master Seed
    └── m (master)
        ├── m/0  (child 0)
        │   ├── m/0/0
        │   └── m/0/1
        └── m/1  (child 1)
            └── m/1/0
```

**Why it matters:**
- One backup (mnemonic) → infinite addresses
- Privacy: Use fresh address for each transaction
- Organization: Different accounts for different purposes

**Learn more:**
- [BIP32 Specification](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [LearnMeABitcoin - HD Wallets](https://learnmeabitcoin.com/technical/hd-wallets)

---

### BIP44 - Multi-Account Hierarchy

**What it is:** A standard path structure for organizing keys across different cryptocurrencies.

**Path format:**
```
m / purpose' / coin_type' / account' / change / address_index
```

| Level | Description | Example |
|-------|-------------|---------|
| `purpose'` | Always 44' for BIP44 (84' for SegWit) | `44'` |
| `coin_type'` | Which cryptocurrency (see SLIP-0044) | `60'` = Ethereum |
| `account'` | Separate accounts (like bank accounts) | `0'` = first account |
| `change` | 0 = receiving, 1 = change addresses | `0` |
| `address_index` | Sequential address number | `0`, `1`, `2`... |

**Note:** The apostrophe (`'`) indicates hardened derivation.

**Examples:**
- First Bitcoin address: `m/84'/0'/0'/0/0`
- First Ethereum address: `m/44'/60'/0'/0/0`
- Second Solana address: `m/44'/501'/0'/0/1`

**Learn more:**
- [BIP44 Specification](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [Ledger - Understanding Derivation Paths](https://www.ledger.com/blog/understanding-crypto-addresses-and-derivation-paths)

---

### SLIP-0044 - Coin Type Registry

**What it is:** A registry that assigns unique numbers to each cryptocurrency for BIP44's `coin_type` field.

**Key coin types we use:**

| Coin | Symbol | Coin Type | Hex |
|------|--------|-----------|-----|
| Bitcoin | BTC | 0 | 0x80000000 |
| Ethereum | ETH | 60 | 0x8000003c |
| Cosmos | ATOM | 118 | 0x80000076 |
| Polkadot | DOT | 354 | 0x80000162 |
| NEAR | NEAR | 397 | 0x8000018d |
| Solana | SOL | 501 | 0x800001f5 |
| Avalanche | AVAX | 9000 | 0x80002328 |

**Why it matters:** Ensures different wallets derive the same addresses from the same mnemonic.

**Learn more:**
- [SLIP-0044 Registry (GitHub)](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
- [Full coin type list](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)

---

### SLIP-0010 - Ed25519 Key Derivation

**What it is:** A modified version of BIP32 for curves that don't support non-hardened derivation (like Ed25519).

**Key difference from BIP32:**
- **BIP32 (secp256k1):** Supports both hardened and non-hardened derivation
- **SLIP-0010 (Ed25519):** Only supports **hardened** derivation

```
BIP32:  m/44'/60'/0'/0/0    ← Normal (0) works
SLIP10: m/44'/501'/0'/0'    ← ALL must be hardened (')
```

**Why hardened only?** Ed25519's curve properties don't allow deriving child public keys from parent public keys (no xpub-style watching).

**Learn more:**
- [SLIP-0010 Specification](https://github.com/satoshilabs/slips/blob/master/slip-0010.md)
- [Ed25519 and BIP32 Compatibility](https://github.com/solana-labs/solana/issues/6301)

---

## Cryptographic Algorithms

### Secp256k1 (Bitcoin, Ethereum)

**What it is:** An elliptic curve used for digital signatures in Bitcoin, Ethereum, and many other blockchains.

**Properties:**
- **Curve:** y² = x³ + 7 (over prime field)
- **Key size:** 256 bits (32 bytes)
- **Signature algorithm:** ECDSA (Elliptic Curve Digital Signature Algorithm)
- **Security:** ~128 bits

**Used by:**
- Bitcoin (BTC)
- Ethereum (ETH) and all EVMs (Arbitrum, Optimism, Base, Polygon)
- Cosmos (ATOM)
- Avalanche (AVAX)

**Address generation (Ethereum example):**
```
Private Key (32 bytes)
    ↓ Elliptic curve multiplication
Public Key (64 bytes, uncompressed)
    ↓ Keccak256 hash
Hash (32 bytes)
    ↓ Take last 20 bytes
Address (20 bytes) = 0x...
```

**Learn more:**
- [Secp256k1 Parameters](https://en.bitcoin.it/wiki/Secp256k1)
- [ECDSA Explained](https://blog.cloudflare.com/ecdsa-the-digital-signature-algorithm-of-a-better-internet/)

---

### Ed25519 (Solana, NEAR)

**What it is:** A modern elliptic curve algorithm known for speed, security, and resistance to side-channel attacks.

**Properties:**
- **Curve:** Curve25519 (Edwards curve)
- **Key size:** 256 bits (32 bytes)
- **Signature algorithm:** EdDSA (Edwards-curve Digital Signature Algorithm)
- **Signature size:** 64 bytes
- **Security:** ~128 bits

**Advantages over secp256k1:**
- Faster signature generation and verification
- Deterministic signatures (no random nonce needed)
- Better resistance to side-channel attacks
- Smaller code, harder to implement incorrectly

**Used by:**
- Solana (SOL)
- NEAR Protocol
- Cardano
- Stellar
- TON

**Address generation (Solana example):**
```
Private Key (32 bytes)
    ↓ Ed25519 derivation
Public Key (32 bytes)
    ↓ Base58 encode
Address (44 chars) = "DRpb..."
```

**Learn more:**
- [Ed25519 Paper](https://ed25519.cr.yp.to/)
- [Curve25519 Explained](https://cr.yp.to/ecdh/curve25519-20060209.pdf)
- [ed25519-dalek Rust crate](https://docs.rs/ed25519-dalek)

---

### SR25519 (Polkadot) - Future

**What it is:** A Schnorr-based signature scheme used by Polkadot and Kusama.

**Properties:**
- **Curve:** Ristretto (compressed Ed25519 points)
- **Algorithm:** Schnorr signatures (more efficient than ECDSA)
- **Key size:** 256 bits
- **Features:** Native support for threshold signatures

**Why Polkadot uses it:**
- Schnorr signatures are more efficient
- Better support for multi-signatures
- Designed for the Substrate blockchain framework

**Key difference:** Polkadot doesn't use standard BIP44 derivation. It uses [Substrate's derivation](https://wiki.polkadot.network/docs/learn-account-advanced) with paths like `//polkadot//0`.

**Learn more:**
- [Polkadot Account Model](https://wiki.polkadot.network/docs/learn-account-advanced)
- [Schnorrkel (Rust crate)](https://docs.rs/schnorrkel)
- [Why Polkadot uses SR25519](https://wiki.polkadot.network/docs/learn-cryptography)

---

## Architecture Design

### Chain Module Trait

Every blockchain implements a common interface:

```rust
/// Core trait for all chain implementations
pub trait ChainModule: Send + Sync {
    /// Which cryptographic family does this chain use?
    fn chain_family(&self) -> ChainFamily;

    /// Unique identifier ("bitcoin", "solana", etc.)
    fn chain_id(&self) -> &str;

    /// SLIP-44 coin type number
    fn coin_type(&self) -> u32;

    /// Derive an address from the master seed
    fn derive_address(
        &self,
        seed: &[u8; 64],      // 512-bit master seed from BIP39
        account: u32,          // Account index (0, 1, 2...)
        index: u32,            // Address index (0, 1, 2...)
    ) -> Result<DerivedAddress, DerivationError>;

    /// Validate if an address string is correctly formatted
    fn validate_address(&self, address: &str) -> bool;
}
```

### Chain Registry

Dynamic dispatch allows adding new chains without modifying core code:

```rust
pub struct ChainRegistry {
    modules: HashMap<String, Arc<dyn ChainModule>>,
}

impl ChainRegistry {
    pub fn new() -> Self {
        let mut registry = Self::default();

        // Secp256k1 family
        registry.register(Arc::new(BitcoinModule));
        registry.register(Arc::new(EthereumModule::new("ethereum")));
        registry.register(Arc::new(EthereumModule::new("arbitrum")));
        // ... more chains

        // Ed25519 family
        registry.register(Arc::new(SolanaModule));
        registry.register(Arc::new(NearModule));

        registry
    }
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Input                                │
│                    (Create/Import Wallet)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BIP39 Processing                             │
│                                                                   │
│   Mnemonic (12/24 words)                                         │
│         │                                                         │
│         ▼                                                         │
│   PBKDF2-HMAC-SHA512 (2048 iterations)                           │
│         │                                                         │
│         ▼                                                         │
│   Master Seed (512 bits / 64 bytes)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│    Secp256k1      │ │     Ed25519       │ │     SR25519       │
│    Derivation     │ │    Derivation     │ │    Derivation     │
│     (BIP32)       │ │    (SLIP-0010)    │ │   (Substrate)     │
└───────────────────┘ └───────────────────┘ └───────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ Bitcoin: bc1q...  │ │ Solana: DRpb...   │ │ Polkadot: 1...    │
│ Ethereum: 0x...   │ │ NEAR: alice.near  │ │ (Future)          │
│ Cosmos: cosmos1...│ │                   │ │                   │
│ Avalanche: 0x...  │ │                   │ │                   │
└───────────────────┘ └───────────────────┘ └───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                               │
│                                                                   │
│   ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│   │    IOTA Stronghold      │  │         SQLite              │  │
│   │   (Encrypted Secrets)   │  │   (Public Addresses)        │  │
│   │                         │  │                             │  │
│   │ • Master Seed           │  │ • Wallet metadata           │  │
│   │ • Derived Private Keys  │  │ • Address list              │  │
│   │                         │  │ • Derivation paths          │  │
│   └─────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Secure Storage

### IOTA Stronghold

**What it is:** A secure secret management library developed by the IOTA Foundation, specifically designed for protecting cryptographic secrets.

**Why we use it:**
1. **Memory protection:** Secrets are encrypted even in RAM
2. **Zeroization:** Secrets are securely erased when no longer needed
3. **Tauri integration:** Official plugin for Tauri apps
4. **Battle-tested:** Used by IOTA's production wallets

**How it works:**
```
┌────────────────────────────────────────────┐
│              User Password                  │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│   Argon2 Key Derivation Function           │
│   (Memory-hard, resistant to GPU attacks)  │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│           Encryption Key                    │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│         XChaCha20-Poly1305                 │
│   (Authenticated encryption)               │
│                                            │
│   Encrypted Data:                          │
│   • Mnemonic phrase                        │
│   • Derived private keys                   │
│   • Master seed                            │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│        coinbox.stronghold file             │
│   (Encrypted snapshot on disk)             │
└────────────────────────────────────────────┘
```

**Learn more:**
- [IOTA Stronghold GitHub](https://github.com/iotaledger/stronghold.rs)
- [Tauri Stronghold Plugin](https://tauri.app/plugin/stronghold/)
- [Stronghold Architecture](https://wiki.iota.org/stronghold/explanations/stronghold-architecture/)

### Encryption Details

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| Key derivation | Argon2id | Password → encryption key |
| Encryption | XChaCha20-Poly1305 | Authenticated encryption |
| Memory protection | mlock + mprotect | Prevent memory dumps |
| Zeroization | Zeroize trait | Secure memory clearing |

**Why XChaCha20-Poly1305?**
- 24-byte nonce (safer than AES-GCM's 12-byte)
- No timing attacks (constant-time operations)
- Widely audited and trusted

**Learn more:**
- [Argon2 Password Hashing](https://www.password-hashing.net/)
- [ChaCha20-Poly1305](https://datatracker.ietf.org/doc/html/rfc8439)

---

## Derivation Paths

### Complete Path Reference

| Chain | Coin Type | Family | Default Path | Address Format |
|-------|-----------|--------|--------------|----------------|
| Bitcoin | 0 | secp256k1 | `m/84'/0'/0'/0/0` | bc1q... (Bech32) |
| Ethereum | 60 | secp256k1 | `m/44'/60'/0'/0/0` | 0x... (Hex) |
| Arbitrum | 60* | secp256k1 | `m/44'/60'/0'/0/0` | 0x... (same as ETH) |
| Optimism | 60* | secp256k1 | `m/44'/60'/0'/0/0` | 0x... (same as ETH) |
| Base | 60* | secp256k1 | `m/44'/60'/0'/0/0` | 0x... (same as ETH) |
| Polygon | 60* | secp256k1 | `m/44'/60'/0'/0/0` | 0x... (same as ETH) |
| Cosmos | 118 | secp256k1 | `m/44'/118'/0'/0/0` | cosmos1... (Bech32) |
| Avalanche C-Chain | 9000 | secp256k1 | `m/44'/9000'/0'/0/0` | 0x... (Hex) |
| **Solana** | **501** | **ed25519** | `m/44'/501'/0'/0'` | Base58 |
| **NEAR** | **397** | **ed25519** | `m/44'/397'/0'/0'` | name.near |
| Polkadot | 354 | sr25519 | `//polkadot//0` | 1... (SS58) |

*EVMs share Ethereum's coin type because they're compatible networks

### Why BIP84 for Bitcoin?

Bitcoin has multiple address types:

| BIP | Purpose | Path | Address Prefix | Usage |
|-----|---------|------|----------------|-------|
| BIP44 | Legacy | m/44'/0'/... | 1... | Old, high fees |
| BIP49 | SegWit-compatible | m/49'/0'/... | 3... | Backward compatible |
| **BIP84** | **Native SegWit** | **m/84'/0'/...** | **bc1q...** | Modern, low fees |

We use **BIP84** because:
- Lower transaction fees (smaller transactions)
- Better security
- Industry standard for modern wallets

---

## Implementation Details

### Rust Crates Used

| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri-plugin-stronghold` | 2 | Secure storage integration |
| `bip39` | 2 | Mnemonic generation/validation |
| `bip32` | 0.5 | Secp256k1 key derivation |
| `coins-bip32` | 0.11 | Extended key derivation |
| `k256` | 0.13 | Secp256k1 elliptic curve |
| `bitcoin` | 0.31 | Bitcoin address generation |
| `ed25519-dalek` | 2 | Ed25519 signatures |
| `slip10` | 0.4 | SLIP-0010 derivation |
| `bs58` | 0.5 | Base58 encoding (Solana) |
| `sha2` | 0.10 | SHA256 hashing |
| `sha3` | 0.10 | Keccak256 (Ethereum) |
| `zeroize` | 1 | Secure memory clearing |

### Module Structure

```
wallet/
├── mod.rs                    # Public exports
├── types.rs                  # DerivedAddress, SecretSeed, etc.
├── mnemonic.rs               # generate(), validate(), to_seed()
├── storage.rs                # SecureStorage (Stronghold wrapper)
├── core.rs                   # WalletManager (main API)
├── registry.rs               # ChainRegistry
│
└── chains/
    ├── mod.rs                # ChainModule trait
    │
    ├── secp256k1/
    │   ├── mod.rs            # Secp256k1 base derivation
    │   ├── bitcoin.rs        # BIP84 Native SegWit
    │   ├── ethereum.rs       # EVM address generation
    │   ├── cosmos.rs         # Bech32 with cosmos prefix
    │   └── avalanche.rs      # Same as Ethereum
    │
    └── ed25519/
        ├── mod.rs            # SLIP-0010 base derivation
        ├── solana.rs         # Base58 addresses
        └── near.rs           # .near account IDs
```

---

## Adding New Chains

### Step-by-Step Example: Adding Polkadot

**1. Add dependencies to Cargo.toml:**
```toml
schnorrkel = "0.11"
sp-core = "28"
ss58-registry = "1.44"
```

**2. Create the module:**
```rust
// wallet/chains/sr25519/polkadot.rs

use crate::wallet::chains::{ChainModule, ChainFamily, DerivedAddress};
use schnorrkel::keys::{MiniSecretKey, PublicKey};
use sp_core::crypto::Ss58Codec;

pub struct PolkadotModule {
    network: &'static str,
    prefix: u16,  // SS58 prefix
}

impl PolkadotModule {
    pub fn new() -> Self {
        Self {
            network: "polkadot",
            prefix: 0,  // 0 = Polkadot, 2 = Kusama
        }
    }
}

impl ChainModule for PolkadotModule {
    fn chain_family(&self) -> ChainFamily {
        ChainFamily::Sr25519
    }

    fn chain_id(&self) -> &str {
        self.network
    }

    fn coin_type(&self) -> u32 {
        354  // SLIP-44 for Polkadot
    }

    fn derive_address(
        &self,
        seed: &[u8; 64],
        account: u32,
        index: u32,
    ) -> Result<DerivedAddress, DerivationError> {
        // Substrate uses different derivation than BIP44
        // Path: //polkadot//account//index

        let mini_secret = MiniSecretKey::from_bytes(&seed[..32])?;
        let keypair = mini_secret.expand_to_keypair();

        // Derive using Substrate's hard derivation
        let derived = keypair
            .derived_key_simple(ChainCode::from(b"polkadot"))
            .0
            .derived_key_simple(ChainCode::from(account.to_be_bytes()))
            .0;

        let public = derived.public;
        let address = public.to_ss58check_with_version(self.prefix.into());

        Ok(DerivedAddress {
            chain: self.network.to_string(),
            address,
            derivation_path: format!("//polkadot//{}//{}", account, index),
            public_key: public.to_bytes().to_vec(),
        })
    }

    fn validate_address(&self, address: &str) -> bool {
        // Check SS58 format with correct prefix
        sp_core::crypto::AccountId32::from_ss58check(address)
            .map(|_| true)
            .unwrap_or(false)
    }
}
```

**3. Register in ChainRegistry:**
```rust
// wallet/registry.rs

impl ChainRegistry {
    pub fn new() -> Self {
        let mut registry = Self::default();

        // ... existing chains ...

        // SR25519 family
        registry.register(Arc::new(PolkadotModule::new()));
        registry.register(Arc::new(KusamaModule::new()));

        registry
    }
}
```

**4. Update frontend:**
```tsx
// Add to CHAIN_OPTIONS
{ id: 'polkadot', name: 'Polkadot', family: 'sr25519', icon: 'DOT' },
```

**That's it!** No changes to WalletManager, commands, or database schema.

---

## Security Considerations

### Memory Security

```rust
use zeroize::{Zeroize, ZeroizeOnDrop};

// Secrets are automatically cleared when dropped
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretSeed([u8; 64]);

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretPrivateKey([u8; 32]);
```

### Mnemonic Exposure

- Mnemonic is only returned **once** upon wallet creation
- After backup verification, mnemonic is locked in Stronghold
- Export requires password verification
- Never stored in SQLite (only Stronghold)

### Session Management

```rust
pub struct WalletSession {
    wallet_id: String,
    unlocked_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,  // Auto-lock after 15 minutes
}
```

### IPC Security

- All Tauri commands validate inputs
- Passwords never stored, only used for unlock
- Rate limiting on unlock attempts (3 per minute)

---

## References

### Standards

| Standard | Description | Link |
|----------|-------------|------|
| BIP39 | Mnemonic code for generating deterministic keys | [GitHub](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) |
| BIP32 | Hierarchical Deterministic Wallets | [GitHub](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) |
| BIP44 | Multi-Account Hierarchy for Deterministic Wallets | [GitHub](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) |
| BIP84 | Derivation scheme for P2WPKH based accounts | [GitHub](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) |
| SLIP-0044 | Registered coin types for BIP-0044 | [GitHub](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) |
| SLIP-0010 | Universal private key derivation from master private key | [GitHub](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) |

### Libraries

| Library | Language | Purpose | Link |
|---------|----------|---------|------|
| IOTA Stronghold | Rust | Secure secret storage | [GitHub](https://github.com/iotaledger/stronghold.rs) |
| bip39 | Rust | Mnemonic generation | [crates.io](https://crates.io/crates/bip39) |
| bip32 | Rust | HD key derivation | [crates.io](https://crates.io/crates/bip32) |
| k256 | Rust | Secp256k1 curve | [crates.io](https://crates.io/crates/k256) |
| ed25519-dalek | Rust | Ed25519 signatures | [crates.io](https://crates.io/crates/ed25519-dalek) |
| bitcoin | Rust | Bitcoin primitives | [crates.io](https://crates.io/crates/bitcoin) |

### Educational Resources

| Resource | Description | Link |
|----------|-------------|------|
| Learn Me a Bitcoin | HD Wallets explained | [Link](https://learnmeabitcoin.com/technical/hd-wallets) |
| Ledger - Derivation Paths | Understanding crypto addresses | [Link](https://www.ledger.com/blog/understanding-crypto-addresses-and-derivation-paths) |
| Polkadot Wiki - Accounts | Advanced account management | [Link](https://wiki.polkadot.network/docs/learn-account-advanced) |
| Solana Docs - Paper Wallets | Key derivation | [Link](https://docs.solanalabs.com/cli/wallets/paper) |
| Ian Coleman BIP39 Tool | Interactive mnemonic tool | [Link](https://iancoleman.io/bip39/) |

### Security

| Resource | Description | Link |
|----------|-------------|------|
| Argon2 | Password hashing winner | [Link](https://www.password-hashing.net/) |
| ChaCha20-Poly1305 | AEAD cipher | [RFC 8439](https://datatracker.ietf.org/doc/html/rfc8439) |
| Zeroize | Secure memory erasure | [crates.io](https://crates.io/crates/zeroize) |

---

*Last updated: January 2026*
*Part of the Coinbox 2.0 Wallet Core implementation*
