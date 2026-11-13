# Private finance desktop

The first milestone imports UTF-8 INR bank and credit card CSVs into the Personal or Droidsize book. It runs in the Tauri desktop app. The finance vault uses SQLCipher and a separate passphrase. Statement bytes, parsed rows, and ledger entries live in the same encrypted file. Wallets and signing continue to use their existing storage.

## Run locally

From the checkout root, use Node.js 22, pnpm 9.15.0 (the version in `package.json`), a current stable Rust toolchain, and your platform's [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/). On macOS, install the Xcode Command Line Tools with `xcode-select --install` if needed.

```sh
pnpm install --frozen-lockfile
COINBOX_FINANCE_DIR="$(mktemp -d)" pnpm tauri:dev
```

The temporary directory isolates the sample finance vault. Leave out `COINBOX_FINANCE_DIR` for the normal profile, which stores the file at `finance/vault.sqlite3` inside Tauri's app data directory. To keep a separate profile between launches, set `COINBOX_FINANCE_DIR` to a persistent directory you own.

For a private desktop executable on the build machine:

```sh
pnpm tauri:build --no-bundle
COINBOX_FINANCE_DIR="$(mktemp -d)" ./apps/desktop/src-tauri/target/release/coinbox
```

On Windows, launch `apps/desktop/src-tauri/target/release/coinbox.exe` and set `COINBOX_FINANCE_DIR` in the same PowerShell session if you want a separate profile. Desktop distribution bundles and signing are part of the release milestone.

## Try the statement workflow

1. Open Coinbox and create a finance vault with a passphrase of at least 14 characters. Select **Personal** and open **Import Inbox**.
2. Choose **Use sample bank CSV**, click **Add account** to create Sample checking, and click **Stage for review**. Repeat with **Use sample card CSV** and Sample credit card. Review both statements before confirming.
3. In **Review card repayments**, compare the bank withdrawal and card credit and click **Match as transfer**. Review the other rows and click **Confirm and save**.
4. On **Overview**, Personal shows ₹1,000.00 net spending, ₹5,000.00 income, and three ledger entries. Account activity shows ₹4,000.00 net movement in checking and ₹0.00 on the card. These figures describe posted activity and exclude opening balances.
5. Open **Ledger**. Click each source link on the repayment to see the original CSV row. **Export CSV** saves the current book's posted entries to Downloads. Original source CSVs and encrypted backups also save to Downloads and preserve any earlier files. The repayment has two source references and contributes zero spending.
6. Stage each sample again using its existing account. Coinbox reports that the exact file is already in the book. Check that the ledger still shows three entries. Switch to **Droidsize** to see its independent ledger and export.
7. Click **Encrypted backup**. Open a second Coinbox launch with a fresh `COINBOX_FINANCE_DIR`, choose **Restore a backup**, and enter the original passphrase. Check that Personal shows the same totals and both repayment sources. The backup includes both books, original statements, and drafts. The in-app backup and restore limit is 32 MiB.

For your own format, map the date, description, and either a signed amount or separate debit and credit columns. Map a running balance when available to flag mismatches. The first milestone accepts CSVs up to 1 MiB each. Review possible overlaps and repayments before posting. An unresolved row can stay pending while you stage another statement. Exported ledgers and downloaded source CSVs contain plaintext financial data.

## Checks

```sh
pnpm typecheck
pnpm build
cargo test --locked --manifest-path packages/finance/Cargo.toml
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

The finance tests use synthetic data to exercise duplicate uploads, confirmation retries, book isolation, exact money calculations, source links, CSV export, wrong passphrases, and encrypted backup and restore. Once dependencies are installed, the finance flow uses local Tauri commands and can be exercised with internet access disabled. The wallet routes use their existing network providers when opened.

The Overview, Accounts, Bills, and Reports screens use the selected book. Ledger search and filters narrow the visible rows. The export contains the full selected book.

## Connected mode and integrations

See [COINBOX_SELF_HOST.md](COINBOX_SELF_HOST.md) for the server, Docker Compose, book-scoped device and MCP access, EML and Gmail, reports, and optional Ollama setup.
