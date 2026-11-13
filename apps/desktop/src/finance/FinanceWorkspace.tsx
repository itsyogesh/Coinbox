import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Download, FileText, Inbox, LockKeyhole, Moon, Send, ShieldCheck, Sparkles, Sun, X } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { errorMessage, finance, inr, remoteFinance, type Bill, type Book, type LedgerEntry, type Report, type Review, type SourceRow, type VaultStatus } from "./api";
import { AskCoinbox, Bills, FinanceReports, upcomingBills } from "./FinanceTools";
import { ImportForm } from "./ImportForm";
import { ImportReview, SourceLink } from "./ImportReview";
import { useSettingsStore } from "@/stores/settingsStore";
import { ServerAccess } from "./ServerAccess";
import "./finance.css";

const pages = {
  "/": { title: "Overview", subtitle: "Spending, income and account activity in this book." },
  "/imports": { title: "Import Inbox", subtitle: "Stage statements, resolve overlaps and confirm what goes into your ledger." },
  "/ledger": { title: "Ledger", subtitle: "Posted transactions and the statement rows behind them." },
  "/bills": { title: "Bills", subtitle: "Track recurring charges and when they’re due." },
  "/accounts": { title: "Accounts", subtitle: "Track net movement and statement coverage for each account." },
  "/reports": { title: "Reports & tax", subtitle: "Review statement coverage and prepare fiscal-year exports." },
  "/server-access": { title: "Server access", subtitle: "Manage book access for your devices and assistants." },
  "/ask": { title: "Ask Coinbox", subtitle: "Ask about posted spending, upcoming bills, and pending imports." },
};

export function FinanceWorkspace() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const next = await finance.status();
      const available = next.unlocked ? await finance.books() : [];
      setBooks(available);
      setBookId((current) => available.some((book) => book.id === current) ? current : available[0]?.id ?? "");
      setStatus(next);
    } catch (err) {
      if (remoteFinance) {
        await finance.lock();
        setBooks([]);
        setStatus({ exists: true, unlocked: false });
      }
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const book = books.find((item) => item.id === bookId);
  return <>
    {error && <div className="coinbox-wrap"><p className="coinbox-alert" role="alert">{error}</p>
      <button className="coinbox-button secondary" onClick={() => void load()}>Retry</button></div>}
    {!status && !error && <p className="coinbox-wrap" role="status">Checking finance vault…</p>}
    {status && !status.unlocked && <VaultGate status={status} refresh={load} />}
    {status?.unlocked && book && <BookWorkspace key={book.id} book={book} books={books} switchBook={setBookId} onLock={load} />}
  </>;
}

function VaultGate({ status, refresh }: { status: VaultStatus; refresh: () => Promise<void> }) {
  const [restoring, setRestoring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const passphrase = String(data.get("passphrase") ?? "");
    if (!status.exists && !restoring && data.get("confirm") !== passphrase) {
      setError("The passphrases do not match.");
      return;
    }
    const backup = data.get("backup");
    setBusy(true);
    setError("");
    try {
      if (restoring) {
        if (!(backup instanceof File) || !backup.size || backup.size > 32 * 1024 * 1024) throw new Error("Choose an encrypted backup of up to 32 MiB.");
        await finance.restore(passphrase, Array.from(new Uint8Array(await backup.arrayBuffer())));
      } else {
        await finance.unlock(passphrase, !status.exists);
      }
      await refresh();
    } catch (err) { setError(errorMessage(err)); }
    finally {
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = ""; });
      setBusy(false);
    }
  }

  return <div className="coinbox-wrap coinbox-lock-screen">
    <section className="coinbox-card coinbox-vault-gate">
      <div className="coinbox-tile"><LockKeyhole size={21} aria-hidden="true" /></div>
      <h1>{remoteFinance ? "Connect to Coinbox" : status.exists ? "Unlock finance vault" : restoring ? "Restore finance vault" : "Create your finance vault"}</h1>
      <p className="coinbox-muted">{remoteFinance ? "Enter a device access token for your private server." : status.exists ? "Enter your finance passphrase to open your books." : restoring ? "Choose a Coinbox backup and enter the passphrase used to create it." : "Coinbox encrypts statements and transactions on this device. Use a separate passphrase for finance and keep it with your backups."}</p>
      <form onSubmit={(event) => void submit(event)} key={String(restoring)}>
        {restoring && <label>Encrypted backup<input name="backup" type="file" accept=".sqlite3" required /></label>}
        <label>{remoteFinance ? "Device access token" : "Finance passphrase"}<input name="passphrase" type="password" autoComplete={status.exists || restoring ? "current-password" : "new-password"}
          required minLength={!status.exists && !restoring ? 14 : undefined} maxLength={512} disabled={busy} /></label>
        {!status.exists && !restoring && <label>Confirm passphrase<input name="confirm" type="password" autoComplete="new-password" required minLength={14} maxLength={512} disabled={busy} /></label>}
        {error && <p className="coinbox-alert" role="alert">{error}</p>}
        <div className="coinbox-actions">
          <button type="submit" className="coinbox-button primary" disabled={busy}>{busy ? "Connecting…" : remoteFinance ? "Connect" : status.exists ? "Unlock vault" : restoring ? "Restore backup" : "Create vault"}</button>
          {!status.exists && <button type="button" className="coinbox-button secondary" disabled={busy} onClick={() => { setRestoring(!restoring); setError(""); }}>
            {restoring ? "Create a new vault" : "Restore a backup"}</button>}
        </div>
      </form>
    </section>
  </div>;
}

function BookWorkspace({ book, books, switchBook, onLock }: {
  book: Book; books: Book[]; switchBook: (id: string) => void; onLock: () => Promise<void>;
}) {
  const { pathname } = useLocation();
  const page = pages[pathname as keyof typeof pages] ?? pages["/"];
  const theme = useSettingsStore((store) => store.theme);
  const setTheme = useSettingsStore((store) => store.setTheme);
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [params, setParams] = useSearchParams();
  const rowId = Number(params.get("source"));
  const [report, setReport] = useState<Report | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [nextReport, nextReview, nextBills] = await Promise.all([finance.report(book.id), finance.review(book.id), finance.bills(book.id)]);
    setReport(nextReport);
    setReview(nextReview);
    setBills(nextBills);
  }, [book.id]);
  useEffect(() => { void refresh().catch((err) => setError(errorMessage(err))); }, [refresh]);

  async function run(action: () => Promise<string>, reload = true) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage(await action());
      if (reload) await refresh();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  function backup() {
    void run(async () => {
      const path = await finance.backup();
      return `Encrypted backup saved to ${path}.`;
    }, false);
  }

  return <>
    <header className="coinbox-topbar">
      <label className="coinbox-book-select">Book <select aria-label="Book" value={book.id} disabled={busy} onChange={(event) => {
        setParams({}, { replace: true });
        switchBook(event.target.value);
      }}>{books.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <div className="coinbox-actions">
        <button type="button" className="coinbox-icon-button" title={dark ? "Use light theme" : "Use dark theme"}
          aria-label={dark ? "Use light theme" : "Use dark theme"} onClick={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {remoteFinance && books.length > 1 && <Link to="/server-access" className="coinbox-button secondary">Server access</Link>}
        {(!remoteFinance || books.length > 1) && <button type="button" className="coinbox-button secondary" disabled={busy} onClick={backup}><Download size={16} /><span>Encrypted backup</span></button>}
        <button type="button" className="coinbox-icon-button" aria-label={remoteFinance ? "Disconnect" : "Lock finance vault"} title={remoteFinance ? "Disconnect" : "Lock finance vault"} disabled={busy}
          onClick={() => void run(async () => { await finance.lock(); await onLock(); return ""; }, false)}><LockKeyhole size={17} /></button>
      </div>
    </header>
    <div className="coinbox-wrap coinbox-stack">
      <div className="coinbox-page-title">
        <div><h1>{page.title}</h1><p className="coinbox-muted">{page.subtitle}</p></div>
        {pathname === "/" && <Link to="/imports" className="coinbox-button primary"><Inbox size={16} /> Import statement</Link>}
        {pathname === "/ledger" && <button className="coinbox-button primary" type="button" disabled={busy || !report} onClick={() => void run(async () => {
          const path = await finance.exportCsv(book.id);
          return `${book.name} ledger saved to ${path}.`;
        }, false)}><Download size={16} /> Export CSV</button>}
      </div>
      {error && <p className="coinbox-alert" role="alert">{error} <button className="coinbox-source-link" onClick={() => void run(async () => { await refresh(); return "Review refreshed."; }, false)}>Refresh data</button></p>}
      {message && <p className="coinbox-status" role="status">{message}</p>}
      {Number.isSafeInteger(rowId) && rowId > 0 && <SourceDetail key={rowId} book={book.id} rowId={rowId} close={() => setParams({}, { replace: true })} />}
      {(!report || !review) && !error && <p role="status">Loading {book.name}…</p>}
      {report && review && pathname === "/" && <Overview report={report} review={review} bills={bills} />}
      {report && review && pathname === "/ask" && <AskCoinbox book={book.name} report={report} review={review} bills={bills} />}
      {report && pathname === "/bills" && <Bills book={book.id} busy={busy} run={run} bills={bills} />}
      {report && review && pathname === "/accounts" && <Accounts report={report} review={review} />}
      {review && pathname === "/reports" && <FinanceReports book={book.id} review={review} busy={busy} run={run} />}
      {report && review && pathname === "/imports" && <div className="coinbox-import-layout">
        <ImportForm book={book.id} accounts={report.accounts} busy={busy} run={run} />
        <ImportReview book={book.id} review={review} busy={busy} run={run} />
      </div>}
      {remoteFinance && pathname === "/server-access" && <ServerAccess books={books} />}
      {report && pathname === "/ledger" && <Ledger entries={report.entries} />}
    </div>
  </>;
}

function Overview({ report, review, bills }: { report: Report; review: Review; bills: Bill[] }) {
  const nextBill = upcomingBills(bills)[0];
  const navigate = useNavigate();
  const pending = review.sources.reduce((sum, source) => sum + source.pending, 0);
  return <>
    <section className="coinbox-card coinbox-ask-spotlight" aria-label="Ask Coinbox">
      <div className="coinbox-tile"><Sparkles size={21} aria-hidden="true" /></div>
      <div><h2>Ask Coinbox</h2><p className="coinbox-muted">Get an answer from this book.</p></div>
      <form className="coinbox-actions" onSubmit={(event) => {
        event.preventDefault();
        const question = String(new FormData(event.currentTarget).get("question")).trim();
        if (question) navigate("/ask", { state: { question } });
      }}>
        <input name="question" required maxLength={500} aria-label="Ask about your book" placeholder="Ask about your book" />
        <button className="coinbox-button primary" aria-label="Open question in Ask Coinbox"><Send size={17} /></button>
      </form>
    </section>
    <div className="coinbox-stats">
      <section className="coinbox-stat spending"><span>Net spending <ArrowUpRight size={17} /></span><strong>{inr(report.spending)}</strong></section>
      <section className="coinbox-stat"><span>Income <ArrowDownLeft size={17} /></span><strong>{inr(report.income)}</strong></section>
      <section className="coinbox-stat"><span>Ledger entries <FileText size={17} /></span><strong>{report.entries.length}</strong></section>
    </div>
    <div className="coinbox-overview-grid">
      <div className="coinbox-stack">
        <section className="coinbox-card">
          <div className="coinbox-section-title spread"><h2>Recent transactions</h2><Link className="coinbox-source-link" to="/ledger">Open ledger</Link></div>
          {report.entries.length ? <ul className="coinbox-activity">{report.entries.slice(0, 5).map((entry) => <li key={entry.id}>
            <div><strong>{entry.description}</strong><small>{entry.date} · {entry.accounts.join(" → ")}</small></div><span className="coinbox-number">{inr(entry.amount)}</span>
          </li>)}</ul> : <p className="coinbox-empty">Confirmed statement rows will appear here.</p>}
        </section>
        <SpendingTrend entries={report.entries} />
        <section className="coinbox-card"><h2>Account activity</h2><p className="coinbox-muted">Net movement from posted rows. Opening balances are excluded.</p>
          {report.accounts.length ? <ul className="coinbox-activity">{report.accounts.map((account) => <li key={account.id}>
            <div><strong>{account.name}</strong><small>{account.kind === "card" ? "Credit card" : "Bank"}</small></div><span className="coinbox-number">{inr(account.movement)}</span>
          </li>)}</ul> : <p className="coinbox-empty">Add your first account when importing a statement.</p>}
        </section>
      </div>
      <div className="coinbox-stack">
        <section className="coinbox-card"><div className="coinbox-section-title"><Inbox size={18} /><h2>Import Inbox</h2></div>
          <p className="coinbox-muted">{pending ? `${pending} rows waiting for review.` : "No statements waiting for review."}</p><Link className="coinbox-source-link" to="/imports">Open Import Inbox <ArrowRight size={15} /></Link>
        </section>
        <section className="coinbox-card"><div className="coinbox-section-title"><CalendarDays size={18} /><h2>Next bill</h2></div>
          <p className="coinbox-muted">{nextBill ? `${nextBill.name} · ${inr(nextBill.amount)} · ${nextBill.next}` : "No bills scheduled."}</p>
          <Link className="coinbox-source-link" to="/bills">All bills <ArrowRight size={15} /></Link>
        </section>
        <p className="coinbox-local"><ShieldCheck size={17} /> {remoteFinance ? "Encrypted on your server" : "Encrypted on this device"}</p>
      </div>
    </div>
  </>;
}

function SpendingTrend({ entries }: { entries: LedgerEntry[] }) {
  const monthly = new Map<string, bigint>();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    const amount = BigInt(entry.spending);
    if (amount !== 0n) monthly.set(month, (monthly.get(month) ?? 0n) + amount);
  }
  const months = Array.from(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const magnitude = (value: bigint) => value < 0n ? -value : value;
  const max = months.reduce((largest, [, amount]) => magnitude(amount) > largest ? magnitude(amount) : largest, 1n);
  return <section className="coinbox-card">
    <h2>Monthly net spending</h2>
    {months.length ? <ul className="coinbox-trend">
      {months.map(([month, amount]) => <li key={month}>
        <span>{new Date(`${month}-02`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
        <span className="coinbox-trend-track" aria-hidden="true"><span style={{ width: `${Number(magnitude(amount) * 100n / max)}%` }} /></span>
        <strong className="coinbox-number">{inr(amount.toString())}</strong>
      </li>)}
    </ul> : <p className="coinbox-empty">Posted purchases and refunds will appear here.</p>}
  </section>;
}

function Accounts({ report, review }: { report: Report; review: Review }) {
  if (!report.accounts.length) return <div className="coinbox-card coinbox-empty">
    <p>Add a bank or card account when you import a statement.</p>
    <Link className="coinbox-source-link" to="/imports">Import a statement</Link>
  </div>;
  return <div className="coinbox-overview-grid">{report.accounts.map((account) => {
    const statements = review.sources.filter((source) => source.accountId === account.id);
    return <section key={account.id} className="coinbox-card coinbox-stack">
      <div className="coinbox-section-title spread"><h2>{account.name}</h2><span className="coinbox-pill">{account.kind === "card" ? "Credit card" : "Bank"}</span></div>
      <p><strong className="coinbox-number">{inr(account.movement)}</strong> <span className="coinbox-muted">net posted movement</span></p>
      {statements.length ? <ul className="coinbox-activity">{statements.map((source) => <li key={source.id}>
        <div><strong>{source.name}</strong><small>{source.firstDate && source.lastDate ? `${source.firstDate} to ${source.lastDate}` : "No valid dates"} · {source.pending} rows to review</small></div>
      </li>)}</ul> : <p className="coinbox-muted">No statements imported.</p>}
      <Link className="coinbox-source-link" to="/reports">Check statement coverage <ArrowRight size={15} /></Link>
    </section>;
  })}</div>;
}

function Ledger({ entries }: { entries: LedgerEntry[] }) {
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState("");
  const [kind, setKind] = useState("");
  const accounts = Array.from(new Set(entries.flatMap((entry) => entry.accounts))).sort();
  const visible = entries.filter((entry) => (!account || entry.accounts.includes(account)) &&
    (!kind || entry.kind === kind) && `${entry.description} ${entry.date} ${entry.accounts.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (!entries.length) return <div className="coinbox-card coinbox-empty"><p>No posted transactions in this book.</p><Link className="coinbox-source-link" to="/imports">Import a statement</Link></div>;
  return <div className="coinbox-card coinbox-ledger">
    <div className="coinbox-actions">
      <input type="search" aria-label="Search ledger" placeholder="Search ledger" value={query} onChange={(event) => setQuery(event.target.value)} />
      <label>Account <select value={account} onChange={(event) => setAccount(event.target.value)}><option value="">All accounts</option>
        {accounts.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Type <select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">All types</option>
        {["expense", "income", "refund", "transfer"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    {!visible.length && <p className="coinbox-empty">No transactions match these filters.</p>}
    {visible.length > 0 && <div className="coinbox-scroll"><table>
      <thead><tr><th>Transaction</th><th>Type</th><th>Amount</th><th>Sources</th></tr></thead>
      <tbody>{visible.map((entry) => <tr key={entry.id}>
        <td><strong>{entry.description}</strong><small>{entry.date} · {entry.accounts.join(" → ")}</small></td>
        <td><span className="coinbox-pill">{entry.kind}</span></td><td className="coinbox-number">{inr(entry.amount)}</td>
        <td>{entry.sources.map((source) => <SourceLink key={source.rowId} source={source} />)}</td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}

function SourceDetail({ book, rowId, close }: { book: string; rowId: number; close: () => void }) {
  const [row, setRow] = useState<SourceRow | null>(null);
  const [error, setError] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    finance.sourceRow(book, rowId).then((value) => { if (active) setRow(value); })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [book, rowId]);
  return <section className="coinbox-card coinbox-source-detail" aria-label="Statement source row">
    <div className="coinbox-section-title spread"><h2>{row ? `${row.name} · line ${row.line}` : "Statement source row"}</h2>
      <button type="button" className="coinbox-icon-button" autoFocus onClick={close} aria-label="Close source row"><X size={18} /></button></div>
    {error && <p className="coinbox-alert" role="alert">{error}</p>}
    {!row && !error && <p role="status">Loading statement row…</p>}
    {row && <><p className="coinbox-muted">{row.account} · {row.date ?? "Unknown date"} · {row.status}</p>
      <pre>{row.raw}</pre><button type="button" className="coinbox-button secondary" disabled={saving} onClick={() => {
        setError("");
        setSavedPath("");
        setSaving(true);
        void finance.sourceFile(book, row.sourceId).then(setSavedPath)
          .catch((err) => setError(errorMessage(err))).finally(() => setSaving(false));
      }}><Download size={16} /> Download original statement</button>
      {savedPath && <p className="coinbox-status" role="status">Original statement saved to {savedPath}.</p>}</>}
  </section>;
}
