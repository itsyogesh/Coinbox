# Coinbox

Coinbox brings INR bank and credit card statements into a ledger you can check against the originals. Review transactions before saving them, match card repayments as transfers, and export an April-to-March financial year for your accountant. The desktop app also includes the existing crypto wallet.

## Getting started

| I want to… | Start here |
| --- | --- |
| Try Coinbox with sample statements | [Desktop quickstart](docs/PRIVATE_FINANCE.md) |
| Run a private workspace and open it on my phone | [Self-hosting and integrations](docs/COINBOX_SELF_HOST.md) |
| Preview or publish the public website | [Website guide](docs/COINBOX_WEBSITE.md) |
| Check bank PDF coverage or feature availability | [Implementation status](docs/COINBOX_STATUS.md) |
| Prepare a public release | [Release checklist](docs/COINBOX_RELEASE.md) |
| Work on the existing crypto wallet | [Wallet architecture](docs/WALLET_CORE.md) and [wallet workflows](docs/WALLET_FLOWS.md) |

Coinbox is available from source. The desktop guide covers how to build it and run a sample import. The phone experience opens an existing workspace in a browser.

## Project structure

| Path | Responsibility |
| --- | --- |
| `apps/website/` | Public product site, sample walkthrough, and Help |
| `apps/desktop/` | Finance interface used by desktop and private web, plus the desktop wallet |
| `apps/finance-server/` | Private finance API, book access, and read-only assistant integration |
| `packages/finance/` | Statement parsing, reconciliation, ledger, reports, and encrypted storage |
| `packages/core/` and `packages/chains/` | Shared types and chain registry |
| `deploy/` | Private finance server container and Compose configuration |
| `app/` and `server/` | Legacy web app and backend |

Standalone desktop keeps its finance data on the device. A connected desktop or browser uses the vault of the private workspace it opens. The wallet uses separate desktop storage. The public website is a static build with synthetic examples.

## Contributing

Follow the [desktop setup](docs/PRIVATE_FINANCE.md#run-locally) and [verification commands](docs/COINBOX_STATUS.md#verification-commands). If you change a label or workflow, update the desktop walkthrough and public Help in the same pull request.

Use synthetic examples in issues and pull requests. [Report a bug or request a feature](https://github.com/itsyogesh/Coinbox/issues).

## License

The workspace package declares MIT. Confirm the project license and copyright notices before distributing release artifacts. Bundled third-party assets retain their license notices.
