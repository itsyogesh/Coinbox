import { useEffect, useState, type FormEvent } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { CalendarDays, Download, FileText, Send, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { errorMessage, finance, inr, type Bill, type Report, type Review, type SourceRef } from "./api";
import { SourceLink } from "./ImportReview";

type Run = (action: () => Promise<string>, reload?: boolean) => Promise<void>;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function upcomingBills(bills: Bill[], now = new Date()) {
  return bills.map((bill) => {
    const { dueDay } = bill;
    const year = now.getFullYear();
    const month = now.getMonth();
    const due = (offset: number) => new Date(year, month + offset, Math.min(dueDay, new Date(year, month + offset + 1, 0).getDate()));
    const current = due(0);
    return { ...bill, next: dateKey(current) >= dateKey(now) ? dateKey(current) : dateKey(due(1)) };
  }).sort((a, b) => a.next.localeCompare(b.next));
}

export function Bills({ book, busy, run, bills }: { book: string; busy: boolean; run: Run; bills: Bill[] }) {
  const [editing, setEditing] = useState<Bill>();
  const [revision, setRevision] = useState(0);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const [whole = "", fraction = ""] = String(data.get("amount")).split(".");
    const amount = (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
    void run(async () => {
      await finance.saveBill(book, editing?.id ?? null, { name: String(data.get("name")), amount, dueDay: Number(data.get("day")) });
      setEditing(undefined);
      setRevision((current) => current + 1);
      return "Recurring bill saved.";
    });
  }

  const total = bills.reduce((sum, bill) => sum + BigInt(bill.amount), 0n);
  return <>
    <div className="coinbox-stats"><section className="coinbox-stat spending"><span>Expected monthly <CalendarDays size={17} /></span><strong>{inr(total.toString())}</strong></section></div>
    <div className="coinbox-overview-grid">
      <section className="coinbox-card"><h2>Recurring charges</h2>
        {!bills.length && <p className="coinbox-empty">Add a bill to track its next expected charge.</p>}
        <ul className="coinbox-activity">{upcomingBills(bills).map((bill) => <li key={bill.id}>
          <div><strong>{bill.name}</strong><small>Next due {bill.next}</small></div>
          <span className="coinbox-number">{inr(bill.amount)}</span>
          <div className="coinbox-actions">
            <button type="button" className="coinbox-source-link" disabled={busy} onClick={() => setEditing(bill)}>Edit</button>
            <button type="button" className="coinbox-source-link" disabled={busy} onClick={() => {
              if (window.confirm(`Remove ${bill.name} from recurring bills?`)) void run(async () => {
                await finance.removeBill(book, bill.id);
                if (editing?.id === bill.id) setEditing(undefined);
                return "Recurring bill removed.";
              });
            }}>Remove</button>
          </div>
        </li>)}</ul>
      </section>
      <section className="coinbox-card"><h2>{editing ? "Edit recurring bill" : "Add a recurring bill"}</h2>
        <form className="coinbox-mapping" key={`${editing?.id ?? "new"}-${revision}`} onSubmit={save}>
          <label>Bill name<input name="name" required maxLength={80} defaultValue={editing?.name} /></label>
          <label>Amount (INR)<input name="amount" inputMode="decimal" required pattern="[0-9]{1,12}(\.[0-9]{1,2})?"
            defaultValue={editing ? `${BigInt(editing.amount) / 100n}.${editing.amount.padStart(2, "0").slice(-2)}` : undefined} /></label>
          <label>Monthly due day<input name="day" type="number" min={1} max={31} required defaultValue={editing?.dueDay} /></label>
          <div className="coinbox-actions"><button className="coinbox-button primary" disabled={busy}>Save bill</button>
            {editing && <button type="button" className="coinbox-button secondary" onClick={() => setEditing(undefined)}>Cancel</button>}</div>
        </form>
      </section>
    </div>
  </>;
}

export function FinanceReports({ book, review, busy, run }: { book: string; review: Review; busy: boolean; run: Run }) {
  const now = new Date();
  const fiscalYear = now.getFullYear() - Number(now.getMonth() < 3);
  const [year, setYear] = useState(fiscalYear);
  const [account, setAccount] = useState("");
  const accounts = Array.from(new Set(review.sources.map((source) => source.account)));
  const selected = review.sources.filter((source) => !account || source.account === account);
  return <>
    <section className="coinbox-card">
      <div className="coinbox-section-title spread"><h2>Statement coverage</h2>
        <div className="coinbox-actions">
          <label>Financial year <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {Array.from({ length: Math.min(100, fiscalYear - 1899) }, (_, i) => fiscalYear - i).map((value) => <option key={value} value={value}>{value}–{String(value + 1).slice(-2)}</option>)}
          </select></label>
          <label>Account <select value={account} onChange={(event) => setAccount(event.target.value)}><option value="">All accounts</option>{accounts.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div></div>
      <p className="coinbox-muted">Coverage uses the dates found in imported statements. A month with rows may still have gaps.</p>
      <ul className="coinbox-month-grid">{Array.from({ length: 12 }, (_, i) => {
        const month = new Date(year, 3 + i, 1);
        const start = dateKey(month);
        const end = dateKey(new Date(year, 4 + i, 1));
        const overlapping = selected.filter((source) => source.firstDate && source.lastDate && source.firstDate < end && source.lastDate >= start);
        const status = overlapping.some((source) => source.pending || source.invalid || source.mismatches) ? "Review open" : overlapping.length ? "Rows available" : "No statement";
        return <li key={start} data-status={status}><strong>{month.toLocaleDateString("en-IN", { month: "short" })}</strong><small>{status}</small></li>;
      })}</ul>
    </section>
    <section className="coinbox-card"><div className="coinbox-section-title"><FileText size={19} /><h2>Accountant review pack</h2></div>
      <p className="coinbox-muted">Export saved transactions and their statement references for April to March. Both downloads include every account in this book.</p>
      <div className="coinbox-actions">{[false, true].map((evidence) => <button type="button" key={String(evidence)} className="coinbox-button secondary" disabled={busy}
        onClick={() => void run(async () => {
          await finance.exportFiscalYear(book, year, evidence);
          return evidence ? "Statement references downloaded." : "Financial year transactions downloaded.";
        }, false)}>
        <Download size={15} />{evidence ? "Export statement references" : "Export transactions"}</button>)}</div>
    </section>
  </>;
}

const prompts = ["How much did I spend this month?", "What bills are coming up?", "Which statements still need review?"];
type Answer = { question: string; text: string; sources: SourceRef[]; page?: string; label?: string };

export function AskCoinbox({ book, report, review, bills }: { book: string; report: Report; review: Review; bills: Bill[] }) {
  const location = useLocation();
  const [question, setQuestion] = useState(typeof location.state?.question === "string" ? location.state.question : "");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string>();
  const [useModel, setUseModel] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    void invoke<string | null>("finance_local_model").then((name) => {
      if (active && name) setModel(name);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function ask(value: string) {
    const text = value.trim();
    if (!text || busy) return;
    setQuestion("");
    setFailure("");
    setBusy(true);
    try {
      const lower = text.toLowerCase();
      const detected = useModel ? await invoke<string>("finance_local_question_kind", { question: text }) : undefined;
      let answer: Omit<Answer, "question">;
      if (detected === "bills" || (detected === undefined && /\b(bill|bills|subscription|subscriptions)\b/.test(lower))) {
        const next = upcomingBills(bills).slice(0, 5);
        answer = { text: next.length ? next.map((bill) => `${bill.name} · ${inr(bill.amount)} · ${bill.next}`).join("\n") : "There are no recurring bills scheduled for this book.", sources: [], page: "/bills", label: "Open bills" };
      } else if (detected === "review" || (detected === undefined && /\b(statement|statements|pending|import|review)\b/.test(lower))) {
        const pending = review.rows.filter((row) => row.status === "pending");
        answer = { text: `${pending.length} statement rows are waiting for review in this book.`, sources: pending.slice(0, 5), page: "/imports", label: "Open Import Inbox" };
      } else if (detected === "spending" || detected === "income" || (detected === undefined && /\b(spend|spent|spending|income|earned|expenses|expense)\b/.test(lower))) {
        const now = dateKey(new Date()).slice(0, 7);
        const income = detected === "income" || (detected === undefined && /\b(income|earned)\b/.test(lower));
        const entries = report.entries.filter((entry) => (!lower.includes("this month") || entry.date.startsWith(now)) && BigInt(income ? entry.income : entry.spending) !== 0n);
        const total = entries.reduce((sum, entry) => sum + BigInt(income ? entry.income : entry.spending), 0n);
        answer = { text: `${income ? "Income" : "Net spending"} ${lower.includes("this month") ? "this month" : "across all posted dates"} is ${inr(total.toString())}. ${entries.length} posted ${entries.length === 1 ? "entry contributed" : "entries contributed"}.`, sources: entries.slice(0, 5).flatMap((entry) => entry.sources), page: "/ledger", label: "Open ledger" };
      } else {
        answer = { text: "Ask about posted spending, income, upcoming bills, or statement rows waiting for review.", sources: [] };
      }
      setAnswers((current) => [...current, { question: text, ...answer }]);
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <section className="coinbox-card coinbox-chat" aria-label={`Ask Coinbox for ${book}`}>
    <div className="coinbox-section-title"><div className="coinbox-tile"><Sparkles size={20} /></div><h2>Explore your ledger</h2></div>
    <p className="coinbox-muted">Answers use posted entries, scheduled bills, and statement review in this book.</p>
    {model && <label className="coinbox-check"><input type="checkbox" checked={useModel} disabled={busy} onChange={(event) => setUseModel(event.target.checked)} /> Use on-device help to interpret questions</label>}
    <div className="coinbox-actions">{prompts.map((prompt) => <button type="button" key={prompt} className="coinbox-button secondary" disabled={busy} onClick={() => void ask(prompt)}>{prompt}</button>)}</div>
    <div className="coinbox-chat-history" aria-live="polite">{answers.map((answer, i) => <article key={i}>
      <strong>{answer.question}</strong><p>{answer.text}</p>
      <div className="coinbox-actions">{answer.sources.map((source) => <SourceLink key={source.rowId} source={source} />)}
        {answer.page && <Link className="coinbox-source-link" to={answer.page}>{answer.label}</Link>}</div>
    </article>)}</div>
    {failure && <p className="coinbox-alert" role="alert">{failure}</p>}
    <form className="coinbox-actions" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
      <input aria-label="Question for Coinbox" placeholder="Ask about this book" value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} required />
      <button className="coinbox-button primary" disabled={busy || !question.trim()}><Send size={16} /> Ask</button>
    </form>
  </section>;
}
