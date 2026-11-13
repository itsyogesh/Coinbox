import { useRef, useState } from "react";
import { ArrowLeftRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { finance, inr, type Confirmation, type Review, type ReviewRow, type SourceRef, type TransferChoice } from "./api";

type Decision = "post" | "skip" | "wait";

export function SourceLink({ source }: { source: SourceRef }) {
  return <Link className="coinbox-source-link" to={`?source=${source.rowId}`}>{source.name} · line {source.line}</Link>;
}

function hasWarning(row: ReviewRow) {
  return Boolean(row.duplicate || row.balanceMismatch || row.transferHint || row.transferMatches.length);
}

export function ImportReview({ book, review, busy, run }: {
  book: string;
  review: Review;
  busy: boolean;
  run: (action: () => Promise<string>, refresh?: boolean) => Promise<void>;
}) {
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [transfers, setTransfers] = useState<TransferChoice[]>([]);
  const request = useRef<Confirmation | null>(null);
  const byId = new Map(review.rows.map((row) => [row.rowId, row]));
  const activePairs = transfers.filter((pair) => byId.get(pair.bankRowId)?.transferMatches.some((match) => match.rowId === pair.cardRowId));
  const paired = new Set(activePairs.flatMap((pair) => [pair.bankRowId, pair.cardRowId]));
  const matches = review.rows.filter((row) => row.amount?.startsWith("-") && row.transferMatches.length);
  const pending = review.rows.filter((row) => row.status === "pending");
  const invalidRows = review.rows.length - pending.length;
  const decision = (row: ReviewRow): Decision => decisions[row.rowId] ?? (hasWarning(row) ? "wait" : "post");
  const post = pending.filter((row) => !paired.has(row.rowId) && decision(row) === "post")
    .map((row) => ({ rowId: row.rowId, acknowledgeWarning: decisions[row.rowId] === "post" }));
  const skip = pending.filter((row) => !paired.has(row.rowId) && decision(row) === "skip").map((row) => row.rowId);
  const entryCount = post.length + activePairs.length;

  function confirm() {
    if (!request.current) {
      const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      request.current = { requestId, post, skip, transfers: activePairs };
    }
    const choices = request.current;
    void run(async () => {
      const result = await finance.confirm(book, choices);
      request.current = null;
      setDecisions({});
      setTransfers([]);
      return `${result.posted} ledger ${result.posted === 1 ? "entry" : "entries"} saved · ${result.skipped} rows excluded.`;
    });
  }

  return (
    <div className="coinbox-stack">
      {matches.length > 0 && <section className="coinbox-card coinbox-repayment">
        <div className="coinbox-section-title"><ArrowLeftRight size={19} /><h2>Review card repayments</h2></div>
        <p className="coinbox-muted">Match a bank withdrawal with the payment on your card. Coinbox records one transfer and keeps it out of spending.</p>
        {matches.flatMap((bank) => bank.transferMatches.map((match) => {
          const card = byId.get(match.rowId);
          if (!card) return null;
          const selected = activePairs.some((pair) => pair.bankRowId === bank.rowId && pair.cardRowId === card.rowId);
          return <div className="coinbox-pair" key={`${bank.rowId}-${card.rowId}`}>
            {[bank, card].map((row) => <div key={row.rowId}><strong>{row.account} · {inr(row.amount)}</strong>
              <small>{row.date} · {row.description}</small><SourceLink source={row} />
              {row.duplicate && <small>Possible overlap · <SourceLink source={row.duplicate} /></small>}</div>)}
            <button type="button" className={`coinbox-button ${selected ? "secondary" : "primary"}`} aria-pressed={selected}
              disabled={busy || (!selected && (paired.has(bank.rowId) || paired.has(card.rowId)))} onClick={() => {
                request.current = null;
                setTransfers(selected ? activePairs.filter((pair) => pair.bankRowId !== bank.rowId)
                  : [...activePairs, { bankRowId: bank.rowId, cardRowId: card.rowId }]);
              }}>{selected ? "Undo match" : "Match as transfer"}</button>
          </div>;
        }))}
      </section>}
      <section className="coinbox-card">
        <h2>Review transactions</h2>
        <p className="coinbox-muted">{pending.length} to review · {invalidRows} unreadable</p>
        {review.rows.length === 0 ? <p className="coinbox-empty">Choose a statement to review its transactions here.</p> : <div className="coinbox-scroll">
          <table><thead><tr><th>Transaction</th><th>Amount / balance</th><th>Review</th><th>Decision</th></tr></thead>
            <tbody>{review.rows.map((row) => <tr key={row.rowId}>
              <td><strong>{row.description || "Unreadable transaction"}</strong><small>{row.date ?? "Unknown date"} · {row.account}</small><SourceLink source={row} /></td>
              <td className="coinbox-number">{inr(row.amount)}{row.balance !== null && <small>Balance {inr(row.balance)}</small>}</td>
              <td>{row.error && <span className="coinbox-warning">{row.error}</span>}
                {row.duplicate && <span className="coinbox-warning">Possible duplicate · <SourceLink source={row.duplicate} /></span>}
                {row.balanceMismatch && <span className="coinbox-warning">Running balance doesn’t add up</span>}
                {(row.transferHint || row.transferMatches.length > 0) && <span className="coinbox-warning">Possible card repayment</span>}
                {!row.error && !hasWarning(row) && <span className="coinbox-pill">Ready</span>}
              </td>
              <td>{row.status === "invalid" ? "Couldn’t read" : paired.has(row.rowId) ? "Matched transfer" : <select
                aria-label={`Decision for ${row.name} line ${row.line}`} value={decision(row)} disabled={busy}
                onChange={(event) => { request.current = null; setDecisions({ ...decisions, [row.rowId]: event.target.value as Decision }); }}>
                <option value="wait">Review later</option><option value="post">{hasWarning(row) ? "Save anyway" : "Import"}</option><option value="skip">Skip</option>
              </select>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {(entryCount > 0 || skip.length > 0) && <div className="coinbox-actions coinbox-confirm">
          <button className="coinbox-button primary" type="button" disabled={busy} onClick={confirm}>Save decisions</button>
          <span className="coinbox-muted">{entryCount} entries to save · {skip.length} rows to exclude</span>
        </div>}
      </section>
      <section className="coinbox-card">
        <h2>Statements in this book</h2>
        {review.sources.length === 0 ? <p className="coinbox-empty">No statements yet.</p> : <ul className="coinbox-documents">
          {review.sources.map((source) => <li key={source.id}>
            <FileText size={19} aria-hidden="true" />
            <div><strong>{source.name}</strong><small>{source.account} · {source.firstDate && source.lastDate ? `${source.firstDate} to ${source.lastDate}` : "No valid dates"}</small>
              <small>{source.pending} to review · {source.posted} saved · {source.skipped} skipped · {source.invalid} unreadable</small>
              <small>{source.balances} balances mapped · {source.mismatches} mismatches</small></div>
            {source.posted === 0 && source.skipped === 0 && <button type="button" className="coinbox-button secondary" disabled={busy}
              onClick={() => {
                if (!window.confirm(`Discard ${source.name} and its draft rows?`)) return;
                request.current = null;
                void run(async () => { await finance.discard(book, source.id); return "Draft statement discarded."; });
              }}>Discard draft</button>}
          </li>)}
        </ul>}
      </section>
    </div>
  );
}
