# Coinbox

Coinbox brings INR bank and credit card statements into a ledger you can check against the originals. Review transactions before saving them, match card repayments as transfers, and export an April-to-March financial year for your accountant. Coinbox also includes a desktop crypto wallet.

## Try Coinbox

Start with the [desktop quickstart](docs/PRIVATE_FINANCE.md) and the two built-in sample statements. Review both before saving, then match the card repayment as a transfer. The sample ledger shows ₹1,000 in net spending, ₹5,000 in income, and three entries.

Coinbox is available from source. Signed desktop installers are pending. You can use a phone browser to open an existing private workspace.

## What you can do

- Import CSV, single-sheet Excel, and supported unlocked PDFs. Start with CSV or Excel if your bank offers either format.
- Bring in a downloaded statement attachment or an original email file. Standalone macOS supports an optional Gmail connection.
- Check possible duplicates, review the original statement behind a transaction, export records, and download an encrypted workspace backup.

## Guides

| Task | Guide |
| --- | --- |
| Build the desktop app or restore a sample backup | [Desktop quickstart](docs/PRIVATE_FINANCE.md) |
| Run a private workspace, connect a phone, or set up Gmail | [Self-hosting and integrations](docs/COINBOX_SELF_HOST.md) |
| Preview or publish the website | [Website guide](docs/COINBOX_WEBSITE.md) |
| Check supported formats, bank PDF references, and platform status | [Implementation status](docs/COINBOX_STATUS.md) |
| Prepare a public release | [Release checklist](docs/COINBOX_RELEASE.md) |
| Work on the existing crypto wallet | [Wallet architecture](docs/WALLET_CORE.md) and [wallet workflows](docs/WALLET_FLOWS.md) |

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
