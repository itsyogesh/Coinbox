# Run Coinbox privately

The standalone Tauri app and the private finance server use the same Rust import and ledger engine. The server serves the responsive web app and API from one origin. A book has one active vault location. Choose either the standalone vault or the server for posting new entries after migration. The local wallet signer continues to use the desktop wallet storage.

See [implementation status](COINBOX_STATUS.md) for supported platforms, issuer-specific PDF references, and release scope.

## Desktop

Install a current stable Rust toolchain, Node.js 22, pnpm 9.15.0, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install --frozen-lockfile
COINBOX_FINANCE_DIR="$(mktemp -d)" pnpm tauri:dev
```

Use a fresh synthetic vault for the first run. In **Import Inbox**, stage the sample bank and card statements, match the repayment, and confirm. The Personal ledger shows three entries, ₹1,000 in net spending and ₹5,000 in income. Repeating either file keeps those figures. The transfer links to both original statement rows. Choose **Encrypted backup** to save both books and their source documents.

The importer accepts INR CSV, one-sheet XLS/XLSX, and rectangular PDF statement tables with a header row. Excel and PDF use the same column-mapping and review screens. Their source download contains the original file. Row numbers for Excel and PDF refer to the extracted table. The PDF adapter supports unencrypted files up to 1 MiB and eight pages. Install Poppler and Tesseract to extract PDF text and scan image-based PDFs. Compare the extracted rows against the original before posting.

For an email file, download the original message as `.eml`, choose it in **Import Inbox**, select an attachment with **Map statement**, and confirm the column mapping. Coinbox parses the email on the client and only persists files that you explicitly stage.

### Live Gmail on macOS

Create a [Google Desktop OAuth client](https://developers.google.com/identity/protocols/oauth2/native-app), enable the Gmail API, and configure the consent screen and intended test user. Place the downloaded client JSON outside the repository. Launch standalone Coinbox with:

```sh
COINBOX_GMAIL_CLIENT_FILE=/absolute/path/to/client.json pnpm tauri:dev
```

Open **Import Inbox → Gmail connection → Connect Gmail**. The system browser handles Google consent. Coinbox uses a loopback callback and PKCE, stores the refresh token in macOS Keychain per vault and book, and runs label and optional sender searches on demand. Open a matching message to review its attachments before staging. Gmail's [read-only permission](https://developers.google.com/workspace/gmail/api/auth/scopes) covers the mailbox. Label and sender filters narrow the search that Coinbox performs. Test with a separate account and synthetic statements. The browser app and connected desktop mode can import downloaded EML files.

### Ask Coinbox

The dashboard and sidebar open the book's chat. Spending and income answers are calculated from posted entries and link to the contributing source rows. Upcoming bills and pending imports use the same data shown elsewhere in the app. To enable optional desktop question classification, start local Ollama, install a model, and launch Coinbox with `COINBOX_OLLAMA_MODEL` set to its model name. Enable the model in Ask Coinbox for the session. Coinbox sends the question to loopback Ollama and calculates the answer from the ledger itself.

## Run the private server

The server needs a data directory, a finance passphrase file, an administrator token file, and the built frontend. Install Poppler and Tesseract on the host for PDF imports. The server binds to `127.0.0.1:8787` by default.

### Local trial

Run from the checkout root in Bash. Use the temporary vault for synthetic statements.

```bash
pnpm install --frozen-lockfile
pnpm build
cargo build --locked --manifest-path apps/finance-server/Cargo.toml

umask 077
coinbox_trial="$(mktemp -d)"
read -r -s -p "Finance passphrase (14 characters minimum): " coinbox_passphrase
printf '\n'
printf '%s\n' "$coinbox_passphrase" > "$coinbox_trial/finance-passphrase"
unset coinbox_passphrase
openssl rand -hex 32 > "$coinbox_trial/finance-admin-token"

export COINBOX_WEB_DIST="$PWD/apps/desktop/dist"
export COINBOX_SERVER_DIR="$coinbox_trial/data"
export COINBOX_SERVER_PASSPHRASE_FILE="$coinbox_trial/finance-passphrase"
export COINBOX_SERVER_ADMIN_TOKEN_FILE="$coinbox_trial/finance-admin-token"
apps/finance-server/target/debug/coinbox-finance-server init
apps/finance-server/target/debug/coinbox-finance-server
```

Open `http://127.0.0.1:8787` on the host and enter the administrator token. From a second terminal, run `curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8787/health` and expect HTTP `204`. For ongoing use, put the vault and credentials in persistent locations and initialize the vault once.

### Connect a phone or desktop

1. Serve the loopback listener through your host's HTTPS reverse proxy on a private LAN or VPN.
2. Open the private HTTPS URL as admin. Under **Server access**, create a **Device** token for the intended book.
3. On the phone, open the same URL in Safari or Chrome and enter the device token. The responsive workspace can open the ledger, import statements, and export reports. The browser holds its token in memory, so reloading requires signing in again.
4. For connected Tauri, run `COINBOX_REMOTE_SERVER=https://your-private-host pnpm tauri:dev` and sign in with a device token. An explicit numeric loopback HTTP origin also works for local desktop testing.

The phone browser needs a reachable server. Native iOS and Android apps, camera capture, and offline drafts remain planned.

### Backup and restore

The admin can download an encrypted vault snapshot. To restore, stop the test server, point `COINBOX_SERVER_DIR` at an empty directory, use the backup's original passphrase, and run:

```sh
apps/finance-server/target/debug/coinbox-finance-server restore /absolute/path/to/backup.sqlite3
```

The vault backup includes both books, bills, staged statements, and source rows. Built-in backup and restore accept vaults up to 32 MiB. Keep the vault passphrase separately from the backup. Device and assistant grants are stored separately and can be reissued after a restore. Keep one authoritative copy per book and rehearse restore on a separate profile before switching devices to the server.

### Docker Compose

```sh
export COINBOX_SECRETS_DIR="/absolute/path/to/private/secrets"
docker compose -f deploy/finance.compose.yml build
docker compose -f deploy/finance.compose.yml run --rm coinbox init
docker compose -f deploy/finance.compose.yml up -d
```

Use files named `finance-passphrase` and `finance-admin-token`. The service runs as UID 10001. Initialize each volume once. Check startup with `docker compose -f deploy/finance.compose.yml logs coinbox` and the host loopback health endpoint. On Linux, make the bind-mounted secret files readable by that UID while keeping them private. The named vault volume persists across restarts, and the published port binds to the host loopback interface. Terminate HTTPS at your private host's reverse proxy.

### MCP

Configure a client that supports [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) and custom bearer headers. Set the URL to `https://<your-private-origin>/api/mcp` and use an assistant token from **Server access**. The endpoint offers three read-only tools for the granted book. Ledger summaries expose amounts and evidence row IDs. Coverage exposes statement dates and review counts. Bills expose recurring charges. Revoke the grant from **Server access** to stop subsequent calls.

## Before moving real data

Follow the [private rollout checks](COINBOX_STATUS.md#private-rollout-checks) on the target host. The local server was tested with synthetic data. The Compose configuration was validated and a container deployment on the intended host remains open.
