import { useEffect, useState } from "react";
import { serverGrant, type Book, type ServerGrant, errorMessage } from "./api";

export function ServerAccess({ books }: { books: Book[] }) {
  const [grants, setGrants] = useState<ServerGrant[]>();
  const [issued, setIssued] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void serverGrant({ action: "list" }).then((value) => { if (active) setGrants(value); })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setIssued("");
    try {
      await action();
      setGrants(await serverGrant({ action: "list" }));
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <section className="coinbox-card coinbox-stack">
    <h2>Manage access</h2>
    {error && <p className="coinbox-alert" role="alert">{error}</p>}
    {grants && <>
      <p className="coinbox-muted">Give a device access to import and export for one book, or give an assistant read-only access to its summaries.</p>
      <form className="coinbox-mapping" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        void run(async () => {
          const result = await serverGrant({ action: "create", book: String(data.get("book")), name: String(data.get("name")),
            scope: data.get("scope") === "assistant" ? "assistant" : "device" });
          setIssued(result.token);
          form.reset();
        });
      }}>
        <label>Access name<input name="name" required maxLength={80} placeholder="e.g. My laptop" /></label>
        <label>Book<select name="book">{books.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select></label>
        <label>Access type<select name="scope"><option value="device">Device</option><option value="assistant">Assistant</option></select></label>
        <button className="coinbox-button primary" disabled={busy}>Create access code</button>
      </form>
      {issued && <div className="coinbox-status" role="status"><label>Copy this access code before leaving the page. Keep it private.
        <input aria-label="New access code" value={issued} readOnly onFocus={(event) => event.target.select()} /></label></div>}
      <ul className="coinbox-activity">{grants.map((grant) => <li key={grant.id}>
        <div><strong>{grant.name}</strong><small>{books.find((book) => book.id === grant.book)?.name ?? grant.book} · {grant.scope}</small></div>
        <button className="coinbox-button secondary" type="button" disabled={busy} onClick={() => {
          if (window.confirm(`Remove access for ${grant.name}?`)) void run(() => serverGrant({ action: "revoke", id: grant.id }));
        }}>Remove access</button>
      </li>)}</ul>
    </>}
  </section>;
}
