# Coinbox

> **Portfolio Intelligence, Not Just Tracking**

A local-first, multi-chain cryptocurrency portfolio tracker with AI-powered transaction categorization and comprehensive tax reporting.

![Version](https://img.shields.io/badge/version-2.0.0--alpha-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

---

## What is Coinbox?

Coinbox is a **desktop application** that helps you:

- **Track** your crypto portfolio across Bitcoin and Ethereum/L2s
- **Categorize** transactions automatically using AI
- **Generate** tax reports for US, Europe, and India
- **Own your data** - everything stays on your machine

Unlike cloud-based trackers, Coinbox runs entirely on your computer. Your private keys, transaction history, and financial data never leave your device.

---

## Current Status

### Sprint 1-2: Foundation ✅ COMPLETE

| Task | Status | Issue |
|------|--------|-------|
| Tauri 2.0 + React + Vite + TypeScript setup | ✅ Done | [#6](https://github.com/itsyogesh/Coinbox/issues/6) |
| Tailwind CSS + shadcn/ui components | ✅ Done | [#7](https://github.com/itsyogesh/Coinbox/issues/7) |
| App shell with sidebar navigation | ✅ Done | [#4](https://github.com/itsyogesh/Coinbox/issues/4) |
| Premium UI redesign (Sora/Inter/JetBrains fonts, violet brand) | ✅ Done | [#3](https://github.com/itsyogesh/Coinbox/issues/3) |
| SQLite database with SQLCipher encryption | ✅ Done | [#5](https://github.com/itsyogesh/Coinbox/issues/5) |
| Settings page (theme toggle, currency, API keys) | ✅ Done | [#8](https://github.com/itsyogesh/Coinbox/issues/8) |
| Framer Motion animations | ✅ Done | — |
| All pages: Dashboard, Wallets, Transactions, Tax, Settings | ✅ Done | — |

### Sprint 3-4: Wallet Core ✅ COMPLETE

| Task | Status | Issue |
|------|--------|-------|
| HD wallet generation (BIP39/BIP44) | ✅ Done | [#10](https://github.com/itsyogesh/Coinbox/issues/10) |
| Encrypted storage (Stronghold + Argon2) | ✅ Done | [#11](https://github.com/itsyogesh/Coinbox/issues/11) |
| Wallet management UI | ✅ Done | [#12](https://github.com/itsyogesh/Coinbox/issues/12) |
| Mnemonic import/export + download backup | ✅ Done | [#13](https://github.com/itsyogesh/Coinbox/issues/13) |
| Watch-only address import | ✅ Done | [#14](https://github.com/itsyogesh/Coinbox/issues/14) |

**Architecture highlights:**
- Extensible `ChainModule` trait for multi-chain support
- Secp256k1 (BIP32): Bitcoin, Ethereum, Arbitrum, Optimism, Base, Polygon
- Ed25519 (SLIP-0010): Solana
- 95 Rust tests passing

### Sprint 5-6: Bitcoin Integration ✅ COMPLETE ([Epic #15](https://github.com/itsyogesh/Coinbox/issues/15))

| Task | Status | Issue |
|------|--------|-------|
| BDK adapter implementation | ✅ Done | [#17](https://github.com/itsyogesh/Coinbox/issues/17) |
| Electrum/Esplora sync | ✅ Done | [#19](https://github.com/itsyogesh/Coinbox/issues/19) |
| Bitcoin balance fetching | ✅ Done | [#18](https://github.com/itsyogesh/Coinbox/issues/18) |
| Bitcoin transaction history | ✅ Done | [#16](https://github.com/itsyogesh/Coinbox/issues/16) |
| Send Bitcoin transaction | ⏳ Pending | [#20](https://github.com/itsyogesh/Coinbox/issues/20) |

**Architecture highlights:**
- `BitcoinAdapter` with BDK 1.2 + bdk_electrum 0.21
- Electrum server sync (Blockstream defaults, configurable)
- Full/watch-only wallet support via descriptors
- UTXO management and fee estimation
- Tauri commands + TypeScript bindings

### Up Next: Sprint 7-8 - Ethereum Integration

---

## Features

### Supported Chains

| Chain | Status | Features |
|-------|--------|----------|
| **Bitcoin** | 🔜 Sprint 3 | Full wallet, watch-only, UTXO tracking |
| **Ethereum** | 🔜 Sprint 4 | ERC-20 tokens, transaction history |
| **Arbitrum** | 🔜 Sprint 4 | Full L2 support |
| **Optimism** | 🔜 Sprint 4 | Full L2 support |
| **Base** | 🔜 Sprint 4 | Full L2 support |
| **Polygon** | 🔜 Sprint 4 | Full L2 support |

### Tax Reporting

| Jurisdiction | Cost Basis Methods | Status |
|--------------|-------------------|--------|
| **United States** | FIFO, LIFO, HIFO, Specific ID | 🔜 Sprint 5 |
| **United Kingdom** | Section 104 pool | 🔜 Sprint 5 |
| **Germany** | FIFO (1-year tax-free) | 🔜 Sprint 5 |
| **France** | Average cost | 🔜 Sprint 5 |
| **India** | FIFO (30% flat) | 🔜 Sprint 5 |

### AI Features

- **Transaction Categorization**: Automatically classify transactions (swap, airdrop, staking, etc.)
- **Natural Language Queries**: Ask questions about your portfolio in plain English
- **BYOK (Bring Your Own Key)**: Use your own Anthropic or OpenAI API key

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           COINBOX 2.0                                │
│                      Tauri Desktop Application                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 FRONTEND (React 18 + TypeScript)              │  │
│  │                                                               │  │
│  │  • Viem for Ethereum RPC calls                               │  │
│  │  • Zustand for state management                              │  │
│  │  • TanStack Query for data fetching                          │  │
│  │  • Framer Motion for animations                              │  │
│  │  • Tailwind CSS + shadcn/ui for styling                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                │                                     │
│                          Tauri IPC                                   │
│                                │                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    RUST BACKEND                               │  │
│  │                                                               │  │
│  │  • BDK (Bitcoin Dev Kit) for Bitcoin wallet                  │  │
│  │  • SQLite + SQLCipher for encrypted storage                  │  │
│  │  • Tax engine with multi-jurisdiction support                │  │
│  │  • AI provider abstraction (Anthropic, OpenAI)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** 1.70+
- **System dependencies** (Linux only):
  ```bash
  sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```

### Installation

```bash
# Clone the repository
git clone https://github.com/itsyogesh/Coinbox
cd Coinbox

# Install dependencies (requires pnpm)
pnpm install

# Run in development mode
pnpm tauri:dev

# Build for production
pnpm tauri:build

# Type check all packages
pnpm typecheck
```

---

## Project Structure

```
coinbox/                         # pnpm workspace root
├── apps/
│   ├── desktop/                 # Tauri desktop app (@coinbox/desktop)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/     # AppLayout, navigation
│   │   │   │   └── ui/         # shadcn/ui components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities, animations
│   │   │   ├── pages/          # Page components
│   │   │   └── stores/         # Zustand stores (future)
│   │   ├── src-tauri/
│   │   │   └── src/
│   │   │       ├── commands/   # Tauri IPC commands
│   │   │       ├── db/         # SQLite database
│   │   │       └── error.rs    # Error handling
│   │   └── package.json
│   └── mobile/                  # Future: React Native or Tauri Mobile
├── packages/
│   └── core/                    # Shared types & business logic (@coinbox/core)
│       └── src/
│           └── types/           # Chain, Wallet, Transaction, Tax types
├── .claude/
│   └── skills/                  # AI design guidelines
├── pnpm-workspace.yaml
├── tsconfig.base.json           # Shared TypeScript config
├── MODERNIZATION_PLAN.md        # Detailed technical plan
└── README.md                    # This file (live product doc)
```

---

## Design System

### Brand Colors

| Color | Value | Usage |
|-------|-------|-------|
| **Primary (Violet)** | `#A78BFA` → `#7C3AED` | CTAs, active states, brand accent |
| **Accent (Teal)** | `#2DD4BF` | Highlights, secondary CTAs |
| **Success** | `#10B981` | Positive gains, confirmations |
| **Destructive** | `#EF4444` | Losses, errors, warnings |
| **Background** | `#0f0e17` | Deep layered dark theme |

### Typography

- **Headings**: Sora (geometric, modern)
- **Body**: Inter (clean, readable)
- **Numbers/Mono**: JetBrains Mono (for addresses, amounts, tabular data)

### Chain Colors

| Chain | Color |
|-------|-------|
| Bitcoin | `#F7931A` |
| Ethereum | `#627EEA` |
| Arbitrum | `#28A0F0` |
| Optimism | `#FF0420` |
| Base | `#0052FF` |
| Polygon | `#8247E5` |

---

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Tauri + React project setup
- [x] Database schema + SQLite integration
- [x] Basic app shell with navigation
- [x] Settings page structure
- [x] Design system (Tailwind, shadcn/ui, Framer Motion)
- [x] Brand guidelines and skills

### Phase 2: Wallet Core ✅
- [x] HD wallet generation (BIP39/BIP44/SLIP-0010)
- [x] Mnemonic import/export with download backup
- [x] Watch-only address import with validation
- [x] Encrypted storage (Stronghold + Argon2)
- [x] Wallet management UI (create, import, details, delete)
- [x] Multi-chain support (Bitcoin, Ethereum, L2s, Solana)

### Phase 3: Bitcoin Integration ✅
- [x] BDK adapter implementation
- [x] Electrum/Esplora sync
- [x] Balance fetching
- [x] Transaction history
- [x] Tauri commands + TypeScript bindings
- [ ] Send Bitcoin transaction
- [ ] Bitcoin UI components

### Phase 4: Ethereum Integration
- [ ] Viem setup + Tauri signing bridge
- [ ] ERC-20 token support
- [ ] Transaction history
- [ ] L2 support (Arbitrum, Optimism, Base, Polygon)
- [ ] Chain provider settings

### Phase 5: Tax Engine
- [ ] Cost basis tracking (FIFO/LIFO/HIFO)
- [ ] Rule-based categorization
- [ ] Tax calculations (multi-jurisdiction)
- [ ] Report generation (CSV, Form 8949, TurboTax)
- [ ] Tax UI pages

### Phase 6: AI Integration
- [ ] AI provider abstraction (Anthropic, OpenAI)
- [ ] API key management UI
- [ ] Transaction categorization
- [ ] Natural language queries
- [ ] Chat interface

### Phase 7: Polish
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Testing (Rust + React)
- [ ] Documentation

---

## Contributing

We welcome contributions! Please see our [contribution guidelines](CONTRIBUTING.md) (coming soon).

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test` (coming soon)
5. Submit a pull request

### Code Style

- **TypeScript**: Strict mode enabled
- **Rust**: Standard Rust formatting (`cargo fmt`)
- **CSS**: Tailwind utility classes, avoid custom CSS
- **Components**: shadcn/ui patterns with Framer Motion animations

---

## Technical Decisions

### Why Tauri over Electron?

| Aspect | Tauri | Electron |
|--------|-------|----------|
| Bundle size | ~5-10 MB | ~150+ MB |
| Memory usage | Lower | Higher |
| Security | Rust backend | Node.js |
| Native feel | Better | Variable |

### Why BDK for Bitcoin?

- Full wallet functionality out of the box
- Native watch-only support via descriptors
- Multiple backend options (Electrum, Esplora, Core RPC)
- Active development and community

### Why Viem over Wagmi?

- Smaller bundle (~27KB vs ~130KB)
- Better fit for desktop wallets (direct control)
- Easier custom signing integration with Tauri

### Why Local-First?

- **Privacy**: Your financial data stays on your device
- **Security**: No cloud servers to hack
- **Reliability**: Works offline
- **Ownership**: Export your data anytime

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [BDK](https://bitcoindevkit.org/) - Bitcoin Dev Kit
- [Viem](https://viem.sh/) - TypeScript Ethereum library
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

## Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/itsyogesh/Coinbox/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/itsyogesh/Coinbox/discussions)

---

*Last Updated: January 2026*
*Version: 2.0.0-alpha*
