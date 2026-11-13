# Coinbox implementation status

This handoff covers the private finance work in [PR #49](https://github.com/itsyogesh/Coinbox/pull/49). Start with the [desktop walkthrough](PRIVATE_FINANCE.md) or the [operator runbook](COINBOX_SELF_HOST.md).

| Area | Included | Remaining |
| --- | --- | --- |
| Desktop | Standalone encrypted vault, connected finance, and the existing crypto wallet | Signed distribution |
| Mobile web | Responsive finance UI through the private server | Physical iPhone and Android testing on the target host |
| Native mobile | Planned iOS and Android clients | Pairing and secure credential storage, capture, offline drafts, sync, and signed builds |
| Private server | Rust API and web UI, SQLCipher vault, revocable per-book access, encrypted backup and restore, and Compose configuration | Target-host deployment, restart, HTTPS, second-device, and restore checks |
| Imports | INR CSV, single-sheet Excel, and supported unencrypted PDF tables with local OCR. Review before posting, with links to source rows. | Issuer-specific parsing and password-protected PDF imports |
| Email | Local EML attachment review and optional Gmail OAuth for standalone macOS | Live Google consent, search, attachment import, and disconnect testing with a test mailbox |
| Reports and assistant | Indian fiscal-year ledger and evidence CSVs, ledger-backed Ask Coinbox, optional desktop Ollama classification, and read-only MCP | Accountant review, live Ollama evaluation, and testing with the intended MCP client |
| Crypto and payouts | Existing desktop wallet signing and watch-only flows | Finance-ledger import and reconciliation for exchange activity and Droidsize payouts |

Standalone finance uses a local vault. Connected desktop, phone browsers, and other web clients use the server vault. Use one authoritative copy of each book after migration. Finance backups include both books, statements, drafts, and bills. The wallet signer and the server's grant store use separate storage.

## Indian bank PDF parser references

Coinbox currently uses a generic PDF table extractor with local OCR and manual review. It has a 1 MiB and eight-page PDF limit. The projects below are references for future adapters.

| Project | Documented coverage |
| --- | --- |
| [bank-statement-parser](https://github.com/akhilnarang/bank-statement-parser) | MIT Python parser for bank accounts. HDFC, ICICI, IDFC FIRST, IndusInd, Kotak, Slice, SBI monthly and YONO layouts, and Union Bank. |
| [cc-parser](https://github.com/akhilnarang/cc-parser) | MIT Python parser for cards. HDFC, ICICI, SBI, Axis, IDFC, IndusInd, HSBC, Bank of Baroda, Yes Bank, and others. Supports password prompts for encrypted PDFs. |
| [indian-bank-statement-parser](https://github.com/raptar231/indian-bank-statement-parser) | Apache-2.0 Python CLI and library. Lists both bank-account and card PDF adapters for HDFC, ICICI, SBI, and Axis. Exports CSV and JSON. |
| [Club-Asymmetric Bank Statement Parser](https://github.com/Club-Asymmetric/Bank-Statement-Parser) | Additional bank-account layout references for SBI, ICICI, Canara, Tamilnad Mercantile Bank, and Karur Vysya Bank. Check license terms before reusing code. |

AU Small Finance Bank PDF support remains unverified in the GitHub projects reviewed. [Tally's support list](https://help.tallysolutions.com/list-of-banks-supported-by-tallyprime-for-e-payments-auto-brs-and-cheque-formats/) identifies an AU Excel format, which is a candidate for Coinbox's existing Excel mapper. Validate AU savings or current account and AU credit card PDFs separately with sanitized samples that preserve columns, page breaks, signs, and balances.

For each adapter, check row count, debit and credit direction, opening and closing balances where present, and line-level source references. Repeat the same import to check idempotency and exercise ambiguous rows in manual review. Keep PDF extraction local or on the private server.

## Verification

The PR records a passing workspace typecheck, frontend build, 101 desktop Rust tests, and three finance tests. The synthetic server flow verified stable totals after repeat imports, two repayment source references, fiscal exports, book isolation, revocation, and restoration into a clean vault. Original PDF and XLSX files were retained, and local OCR recovered a signed amount from a synthetic image-only PDF. Browser checks covered the dashboard, Ask Coinbox and its source row, and reports. The Tauri development launch reached app startup. The Compose file parsed successfully.

### Verification commands

```sh
pnpm typecheck
pnpm build
cargo test --locked --manifest-path packages/finance/Cargo.toml
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo build --locked --manifest-path apps/finance-server/Cargo.toml
```

## Private rollout checks

1. Start the private server with a fresh vault. Check `GET /health` and import the two included sample CSVs. Expect ₹1,000 in net spending, ₹5,000 in income, and three ledger entries. Check that the repayment links to both statement rows.
2. Connect an iPhone and Android phone over private HTTPS using separate book-scoped device tokens. Test import selection, ledger navigation, source links, and downloads.
3. Revoke one token and trigger another request on that phone. Confirm it returns to sign-in. Restart the server and confirm the other test token still works.
4. Restore an encrypted backup into a clean profile with the original passphrase. Compare both books, totals, bills, and source files.
5. Test Gmail with a synthetic attachment and Ollama with known ledger questions before using those integrations with real records.
