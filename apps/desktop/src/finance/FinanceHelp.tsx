import { Link } from "react-router-dom";

export function FinanceHelp() {
  return (
    <div className="coinbox-wrap coinbox-stack">
      <header className="coinbox-page-title"><div><h1>Help</h1><p className="coinbox-muted">Get started with statements, reports, and backups.</p></div></header>
      <section className="coinbox-card coinbox-stack">
        <h2>Try a sample statement</h2>
        <ol>
          <li>In Import Inbox, choose Try sample bank statement and add Sample checking.</li>
          <li>Choose Review statement. Repeat with the sample card statement and Sample credit card.</li>
          <li>Match the repayment as a transfer, then choose Save decisions. The Ledger shows where each transaction came from.</li>
        </ol>
        <Link className="coinbox-source-link" to="/imports">Open Import Inbox</Link>
      </section>
      <section className="coinbox-card coinbox-stack">
        <h2>Import your own statement</h2>
        <p>Choose an INR statement in CSV, single-sheet Excel, or an unlocked PDF up to eight pages. Each file can be up to 1 MiB. Check the dates and amounts against the original before saving.</p>
        <p>If a statement arrived by email, download the attachment or choose the original .eml file in Import Inbox.</p>
      </section>
      <section className="coinbox-card coinbox-stack">
        <h2>Keep a copy</h2>
        <p>Use Reports to export transactions and statement references for your accountant. If you see Encrypted backup at the top of the workspace, use it to save a copy you can restore. Keep the passphrase with your recovery information.</p>
        <Link className="coinbox-source-link" to="/reports">Open Reports</Link>
      </section>
    </div>
  );
}
