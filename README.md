# Coinbox

Coinbox combines a desktop crypto wallet with a private finance workspace for personal and business books. Use a local encrypted finance vault or connect to a server you control.

## Private finance preview

| Surface | Included | Still open |
| --- | --- | --- |
| Desktop | Standalone and connected finance modes, plus the existing crypto wallet | Signed distribution |
| Phone browser | Responsive finance workspace served by the private host | Physical iPhone and Android verification |
| Native mobile | Planned iOS and Android clients | Capture, offline drafts, secure pairing, and signed releases |
| Private server | Rust API, web app, book-scoped access, encrypted vault, and backup and restore | Docker deployment and verification on the target host |

- [Desktop quickstart and sample walkthrough](docs/PRIVATE_FINANCE.md)
- [Private server, phone browser, Gmail, and backup runbook](docs/COINBOX_SELF_HOST.md)
- [Implementation status, bank PDF references, and rollout checklist](docs/COINBOX_STATUS.md)

## Wallet development history

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
| Send Bitcoin transaction | ✅ Done | [#20](https://github.com/itsyogesh/Coinbox/issues/20) |

**Architecture highlights:**
- `BitcoinAdapter` with BDK 1.2 + bdk_electrum 0.21
- Electrum server sync (Blockstream defaults, configurable)
- Full/watch-only wallet support via descriptors
- UTXO management and fee estimation
- `SendBitcoinDialog` with address validation, fee selection, confirmation flow
- Tauri commands + TypeScript bindings

### Sprint 7-8: Ethereum Integration ✅ COMPLETE

| Task | Status | Issue |
|------|--------|-------|
| Viem setup + public client factory | ✅ Done | — |
| Tauri signing bridge | ✅ Done | — |
| ERC-20 token support | ✅ Done | — |
| Ethereum transaction history (Etherscan V2) | ✅ Done | — |
| L2 support (Arbitrum, Optimism, Base, Polygon) | ✅ Done | — |
| Chain provider settings UI | ✅ Done | — |

**Architecture highlights:**
- `@coinbox/chains` centralized chain registry with family-based grouping
- Viem for RPC calls (balances, token balances, gas estimation)
- Etherscan V2 unified API for transaction history (via Tauri CORS bypass)
- Family-grouped wallet display (EVM L2s grouped under "Ethereum & L2s")

---

## Features

### Supported Chains

| Chain | Status | Features |
|-------|--------|----------|
| **Bitcoin** | ✅ Live | Full wallet, watch-only, UTXO tracking, send |
| **Ethereum** | ✅ Live | ERC-20 tokens, transaction history |
| **Arbitrum** | ✅ Live | Full L2 support |
| **Optimism** | ✅ Live | Full L2 support |
| **Base** | ✅ Live | Full L2 support |
| **Polygon** | ✅ Live | Full L2 support |

### Reports and Ask Coinbox

The finance workspace exports an Indian fiscal-year ledger and a statement evidence index for accountant review. Ask Coinbox uses the selected book's ledger and links to the contributing source rows. An optional desktop Ollama integration classifies questions locally. Crypto cost basis and provider-specific exchange and payout reconciliation remain planned.

## Architecture

The React and TypeScript workspace uses the same Rust finance core in both modes. Standalone desktop calls it through Tauri and stores records in a local SQLCipher vault. Connected desktop and browser clients call the private Rust server over HTTPS and use its vault. Wallet signing uses separate desktop storage.

## Getting Started

Use Node.js 22, pnpm 9.15.0, a current stable Rust toolchain, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install --frozen-lockfile
COINBOX_FINANCE_DIR="$(mktemp -d)" pnpm tauri:dev
```

Open **Import Inbox** and use the sample bank and card statements. For a persistent profile or a desktop build, follow the [desktop guide](docs/PRIVATE_FINANCE.md). For the browser and connected desktop modes, follow the [server runbook](docs/COINBOX_SELF_HOST.md).

## Project structure

| Path | Responsibility |
| --- | --- |
| `apps/desktop/` | Shared React finance UI, Tauri desktop integration, and wallet |
| `apps/finance-server/` | Private Rust server, web UI, device grants, and MCP |
| `packages/finance/` | SQLCipher vault, statement parsing, ledger, and reports |
| `packages/core/` and `packages/chains/` | Shared types and chain registry |
| `deploy/` | Finance server Dockerfile and Compose configuration |
| `app/` and `server/` | Legacy web app and backend |

## Design system

The finance workspace uses the Coinbox wordmark, emerald accents, Geist headings, and DM Sans body text. The sidebar collapses on desktop and the phone layout uses bottom navigation.

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

## Development roadmap

The [implementation handoff](docs/COINBOX_STATUS.md) tracks the private-host rollout, mobile verification, native mobile, issuer-specific imports, and release work.

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run the [workspace checks](docs/COINBOX_STATUS.md#verification-commands)
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

- Standalone finance works offline after setup. Connected clients need access to your private server.
- Export ledger data and keep an encrypted finance backup.

---

## License

The workspace package declares an MIT license. Bundled third-party assets retain their license notices.

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

*Version: 2.0.0-alpha*
