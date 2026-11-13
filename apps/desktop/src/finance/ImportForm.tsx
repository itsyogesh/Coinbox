import { useState, type FormEvent } from "react";
import { CreditCard, Landmark, Upload } from "lucide-react";
import { errorMessage, FinanceMessage, finance, type Account, type AccountKind, type CsvMapping, type CsvPreview, type DateFormat } from "./api";
import { EmailImport } from "./EmailImport";
import sampleBank from "./fixtures/synthetic-bank-inr.csv?raw";
import sampleCard from "./fixtures/synthetic-card-inr.csv?raw";

function column(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header.toLowerCase().replace(/[^a-z]/g, "")));
}

export function ImportForm({ book, accounts, busy, run }: {
  book: string;
  accounts: Account[];
  busy: boolean;
  run: (action: () => Promise<string>, refresh?: boolean) => Promise<void>;
}) {
  const [file, setFile] = useState<{ name: string; bytes: number[]; preview: CsvPreview } | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const [date, setDate] = useState(-1);
  const [description, setDescription] = useState(-1);
  const [dateFormat, setDateFormat] = useState<DateFormat>("iso");
  const [mode, setMode] = useState<"signed" | "split">("signed");
  const [signed, setSigned] = useState(-1);
  const [debit, setDebit] = useState(-1);
  const [credit, setCredit] = useState(-1);
  const [balance, setBalance] = useState(-1);
  const [owed, setOwed] = useState(false);
  const [invert, setInvert] = useState(false);
  const [newestFirst, setNewestFirst] = useState(false);
  const account = accounts.find((item) => String(item.id) === accountId);

  async function pick(next: File, sampleKind?: AccountKind) {
    setFile(null);
    setReading(true);
    setError("");
    try {
      if (next.size > 1024 * 1024) throw new FinanceMessage("Choose a statement of up to 1 MiB.");
      const bytes = Array.from(new Uint8Array(await next.arrayBuffer()));
      const preview = await finance.inspect(next.name, bytes, book);
      const headers = preview.headers;
      const signedColumn = column(headers, ["amount", "transactionamount", "netamount"]);
      const debitColumn = column(headers, ["debit", "withdrawal", "withdrawals", "debitamount"]);
      const creditColumn = column(headers, ["credit", "deposit", "deposits", "creditamount"]);
      setDate(column(headers, ["date", "transactiondate", "postingdate", "valuedate"]));
      setDescription(column(headers, ["description", "details", "narration", "particulars", "merchant"]));
      setSigned(signedColumn);
      setDebit(debitColumn);
      setCredit(creditColumn);
      setBalance(column(headers, ["balance", "runningbalance", "closingbalance", "availablebalance"]));
      setMode(signedColumn < 0 && debitColumn >= 0 && creditColumn >= 0 ? "split" : "signed");
      setDateFormat("iso");
      setNewestFirst(false);
      setInvert(false);
      setOwed((sampleKind ?? account?.kind) === "card");
      if (sampleKind) {
        const sampleName = sampleKind === "bank" ? "Sample checking" : "Sample credit card";
        const existing = accounts.find((item) => item.kind === sampleKind && item.name === sampleName);
        setAccountId(existing ? String(existing.id) : "");
        setKind(sampleKind);
        setName(existing ? "" : sampleName);
      }
      setFile({ name: next.name, bytes, preview });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReading(false);
    }
  }

  function addAccount(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const id = await finance.addAccount(book, name, kind);
      setAccountId(String(id));
      setOwed(kind === "card");
      setName("");
      return "Account added to this book.";
    });
  }

  function stage(event: FormEvent) {
    event.preventDefault();
    if (!file || !account) return;
    const mapping: CsvMapping = {
      date, description, dateFormat,
      amount: mode === "signed" ? { type: "signed", column: signed, invert } : { type: "split", debit, credit },
      balance: balance < 0 ? null : balance, balanceIsOwed: owed, newestFirst,
    };
    void run(async () => {
      const result = await finance.stage(book, { accountId: account.id, name: file.name, bytes: file.bytes, mapping });
      setFile(null);
      return result.alreadyExists ? "This statement is already in the book." : "Statement ready to review. Choose which transactions to save below.";
    });
  }

  return (
    <section className="coinbox-card coinbox-import-form">
      <h2>Import a statement</h2>
      <p className="coinbox-muted">Choose an INR bank or credit card statement with column headings.</p>
      <label className="coinbox-upload">
        <Upload size={20} aria-hidden="true" />
        <span>{reading ? "Reading statement…" : file?.name ?? "Choose a CSV, Excel, or PDF file"}</span>
        <input type="file" accept=".csv,.xls,.xlsx,.pdf,text/csv,application/pdf" disabled={busy || reading} onChange={(event) => {
          const next = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (next) void pick(next);
        }} />
      </label>
      <EmailImport book={book} disabled={busy || reading || file !== null} onSelect={pick} />
      <div className="coinbox-actions">
        <button type="button" className="coinbox-button secondary" disabled={busy || reading}
          onClick={() => void pick(new File([sampleBank], "synthetic-bank-inr.csv"), "bank")}><Landmark size={15} /> Try sample bank statement</button>
        <button type="button" className="coinbox-button secondary" disabled={busy || reading}
          onClick={() => void pick(new File([sampleCard], "synthetic-card-inr.csv"), "card")}><CreditCard size={15} /> Try sample card statement</button>
      </div>
      {error && <p className="coinbox-alert" role="alert">{error}</p>}
      {file && <>
        <form onSubmit={addAccount} className="coinbox-add-account">
          <label>New account name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="e.g. Main checking" /></label>
          <label>Account type<select value={kind} onChange={(event) => setKind(event.target.value as AccountKind)}>
            <option value="bank">Bank</option><option value="card">Credit card</option>
          </select></label>
          <button type="submit" className="coinbox-button secondary" disabled={busy || !name.trim()}>Add account</button>
        </form>
        <form onSubmit={stage} className="coinbox-mapping">
          <div className="coinbox-section-title spread"><h3>Match your columns</h3><button type="button" className="coinbox-source-link" disabled={busy} onClick={() => setFile(null)}>Clear file</button></div>
          {/\.pdf$/i.test(file.name) && <p className="coinbox-warning">Check the amounts and dates against the original PDF. Scanned statements can be misread.</p>}
          <p className="coinbox-muted">{file.preview.rows} rows found. Check which amounts are money in and money out.</p>
          <div className="coinbox-fields">
            <label>Import into account<select value={accountId} required onChange={(event) => {
              const id = event.target.value;
              setAccountId(id);
              setOwed(accounts.find((item) => String(item.id) === id)?.kind === "card");
            }}><option value="">Select an account</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Date format<select value={dateFormat} onChange={(event) => setDateFormat(event.target.value as DateFormat)}>
              <option value="iso">YYYY-MM-DD</option><option value="day_first">DD/MM/YYYY or DD-MM-YYYY</option><option value="month_first">MM/DD/YYYY or MM-DD-YYYY</option>
            </select></label>
            <Column label="Date" value={date} set={setDate} headers={file.preview.headers} />
            <Column label="Description" value={description} set={setDescription} headers={file.preview.headers} />
            <label>How amounts are shown<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              <option value="signed">One amount column with plus or minus signs</option><option value="split">Separate debit and credit columns</option>
            </select></label>
            {mode === "signed" ? <Column label="Amount" value={signed} set={setSigned} headers={file.preview.headers} /> : <>
              <Column label="Debit / money out" value={debit} set={setDebit} headers={file.preview.headers} />
              <Column label="Credit / money in" value={credit} set={setCredit} headers={file.preview.headers} />
            </>}
            <Column label="Running balance (optional)" value={balance} set={setBalance} headers={file.preview.headers} optional />
            {balance >= 0 && <label>Statement row order<select value={newestFirst ? "newest" : "oldest"}
              onChange={(event) => setNewestFirst(event.target.value === "newest")}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label>}
          </div>
          <div className="coinbox-actions">
            {mode === "signed" && <label className="coinbox-check"><input type="checkbox" checked={invert} onChange={(event) => setInvert(event.target.checked)} /> Charges or withdrawals are shown as positive amounts</label>}
            {balance >= 0 && <label className="coinbox-check"><input type="checkbox" checked={owed} onChange={(event) => setOwed(event.target.checked)} /> Balance represents money owed</label>}
          </div>
          <details><summary>Preview the statement</summary><div className="coinbox-scroll">
            <table><thead><tr>{file.preview.headers.map((header, index) => <th key={index}>{header || `Column ${index + 1}`}</th>)}</tr></thead>
              <tbody>{file.preview.examples.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table>
          </div></details>
          <button type="submit" className="coinbox-button primary" disabled={busy || !account}>Review statement</button>
        </form>
      </>}
    </section>
  );
}

function Column({ label, value, set, headers, optional = false }: {
  label: string; value: number; set: (value: number) => void; headers: string[]; optional?: boolean;
}) {
  return <label>{label}<select required={!optional} value={value < 0 ? "" : value} onChange={(event) => set(event.target.value ? Number(event.target.value) : -1)}>
    <option value="">{optional ? "None" : "Choose column"}</option>
    {headers.map((header, index) => <option key={index} value={index}>{index + 1}. {header || "Unnamed column"}</option>)}
  </select></label>;
}
