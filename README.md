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

### Sprint 1: Foundation ✅ COMPLETE

| Task | Status |
|------|--------|
| Tauri 2.0 + React + Vite + TypeScript setup | ✅ Done |
| Tailwind CSS + shadcn/ui components | ✅ Done |
| App shell with sidebar navigation | ✅ Done |
| Placeholder pages (Dashboard, Wallets, Transactions, Tax, Settings) | ✅ Done |
| SQLite database with SQLCipher encryption | ✅ Done |
| Database schema with migrations | ✅ Done |
| Framer Motion animations | ✅ Done |
| Design skills (frontend-design, coinbox-brand) | ✅ Done |
| Brand system (Geist font, Indigo primary color) | ✅ Done |

### Up Next: Sprint 2 - Wallet Core

| Task | Status |
|------|--------|
| HD wallet generation (BIP39/BIP44) | ⏳ Pending |
| Mnemonic import/export | ⏳ Pending |
| Watch-only address import | ⏳ Pending |
| Encrypted key storage | ⏳ Pending |
| Wallet management UI | ⏳ Pending |

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
cd Coinbox/desktop

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

---

## Project Structure

```
Coinbox/
├── .claude/
│   └── skills/
│       ├── frontend-design/     # UI design guidelines
│       └── coinbox-brand/       # Brand system & colors
├── desktop/                     # Tauri desktop app
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, navigation
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities, animations
│   │   ├── pages/              # Page components
│   │   └── stores/             # Zustand stores (future)
│   ├── src-tauri/
│   │   └── src/
│   │       ├── commands/       # Tauri IPC commands
│   │       ├── db/             # SQLite database
│   │       └── error.rs        # Error handling
│   ├── package.json
│   └── tauri.conf.json
├── unified-data-model/          # Chain-agnostic data types
├── MODERNIZATION_PLAN.md        # Detailed technical plan
└── README.md                    # This file (live product doc)
```

---

## Design System

### Brand Colors

| Color | Light | Dark | Usage |
|-------|-------|------|-------|
| **Primary (Indigo)** | `#6366F1` | `#818CF8` | CTAs, active states |
| **Accent (Teal)** | `#2DD4BF` | `#14B8A6` | Highlights, secondary CTAs |
| **Success** | `#22C55E` | `#4ADE80` | Positive gains |
| **Destructive** | `#EF4444` | `#F87171` | Losses, errors |
| **Warning** | `#F59E0B` | `#FBBF24` | Uncategorized, attention |

### Typography

- **Headings**: Geist (with Plus Jakarta Sans fallback)
- **Body**: Geist
- **Monospace**: Geist Mono (for addresses, numbers)

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

### Phase 2: Wallet Core (Current)
- [ ] HD wallet generation (BIP39/BIP44)
- [ ] Mnemonic import/export
- [ ] Watch-only address import
- [ ] Encrypted storage (keyring + AES-GCM)
- [ ] Wallet management UI

### Phase 3: Bitcoin Integration
- [ ] BDK adapter implementation
- [ ] Electrum/Esplora sync
- [ ] Balance fetching
- [ ] Transaction history
- [ ] Send/receive flows

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

*Last Updated: December 2024*
*Version: 2.0.0-alpha*
