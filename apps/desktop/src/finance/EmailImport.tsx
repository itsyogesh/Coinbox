import { useEffect, useRef, useState } from "react";
import { FileText, Mail } from "lucide-react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { errorMessage, remoteFinance } from "./api";

type Message = { subject: string; sender: string; attachments: File[]; unavailable: number };

export function EmailImport({ book, disabled, onSelect }: {
  book: string;
  disabled: boolean;
  onSelect: (file: File) => Promise<void>;
}) {
  const [message, setMessage] = useState<Message>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const [gmailOpen, setGmailOpen] = useState(false);

  async function open(file: File) {
    const id = ++request.current;
    setMessage(undefined);
    setError("");
    setBusy(true);
    try {
      if (!/\.eml$/i.test(file.name) || !file.size || file.size > 20 * 1024 * 1024) {
        throw new Error("Choose a non-empty .eml file up to 20 MiB.");
      }
      const { default: PostalMime } = await import("./vendor/postal-mime/postal-mime.js");
      const parsed = await PostalMime.parse(await file.arrayBuffer(), {
        maxRfc822NestingDepth: 0, maxNestingDepth: 20, maxHeadersSize: 65536, maxPartCount: 250,
      });
      if (id !== request.current) return;
      let unavailable = 0;
      const attachments = parsed.attachments.flatMap((part) => {
        if (part.related || part.disposition === "inline" || !part.filename) return [];
        const name = (part.filename.split(/[\\/]/).pop() ?? "").replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "").slice(-150);
        if (!/\.(csv|xlsx?|pdf)$/i.test(name) || !part.content.byteLength || part.content.byteLength > 1024 * 1024) {
          unavailable++;
          return [];
        }
        return [new File([part.content], name, { type: "text/csv" })];
      });
      setMessage({ subject: parsed.subject?.slice(0, 240) || "Untitled message", sender: parsed.from?.address?.slice(0, 180) || "Unknown sender", attachments, unavailable });
    } catch (err) {
      if (id === request.current) setError(errorMessage(err));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  return <div className="coinbox-email-import">
    <label className="coinbox-upload">
      <Mail size={20} aria-hidden="true" />
      <span>{busy ? "Reading email…" : "Choose an email file (.eml)"}</span>
      <input type="file" accept=".eml,message/rfc822" disabled={disabled || busy} onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) void open(file);
      }} />
    </label>
    {isTauri() && !remoteFinance && /Mac/.test(navigator.platform) && <>
      <button type="button" className="coinbox-button secondary" aria-expanded={gmailOpen} disabled={disabled || busy}
        onClick={() => setGmailOpen(!gmailOpen)}><Mail size={15} /> Gmail connection</button>
      {gmailOpen && <GmailImport book={book} disabled={disabled || busy} onMessage={open} />}
    </>}
    {error && <p className="coinbox-alert" role="alert">{error}</p>}
    {message && <div className="coinbox-email-review">
      <div className="coinbox-section-title spread"><h3>Review email attachments</h3>
        <button type="button" className="coinbox-source-link" onClick={() => setMessage(undefined)}>Close email</button></div>
      <p><strong>{message.subject}</strong><br /><small className="coinbox-muted">From {message.sender}</small></p>
      {message.attachments.length === 0 && <p>No CSV, Excel, or PDF attachments of up to 1 MiB were found.</p>}
      {message.attachments.map((file, index) => <div key={index} className="coinbox-section-title spread">
        <span><FileText size={15} aria-hidden="true" /> {file.name}</span>
        <button type="button" className="coinbox-button secondary" disabled={disabled} onClick={() => void onSelect(file)}>Map statement</button>
      </div>)}
      {message.unavailable > 0 && <small className="coinbox-muted">{message.unavailable} unsupported or oversized attachments.</small>}
      <p className="coinbox-muted">Coinbox reads the email on this device. Only a statement you stage is saved.</p>
    </div>}
  </div>;
}

type GmailStatus = { configured: boolean; connected: boolean };
type GmailMessage = { id: string; subject: string; sender: string; date: string };

function GmailImport({ book, disabled, onMessage }: { book: string; disabled: boolean; onMessage: (file: File) => Promise<void> }) {
  const [status, setStatus] = useState<GmailStatus>();
  const [messages, setMessages] = useState<GmailMessage[]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void invoke<GmailStatus>("gmail_status", { book }).then((value) => { if (active) setStatus(value); })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [book]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <section className="coinbox-email-review">
    <h3>Gmail connection</h3>
    <p className="coinbox-muted">Gmail grants read-only mailbox access. Coinbox searches the label and sender you enter and opens the message you select.</p>
    {status && !status.configured && <p>Set COINBOX_GMAIL_CLIENT_FILE to your Google Desktop OAuth client JSON and restart Coinbox.</p>}
    {status?.configured && !status.connected && <button type="button" className="coinbox-button primary" disabled={disabled || busy} onClick={() => void run(async () => {
      await invoke("gmail_connect", { book });
      setStatus(await invoke<GmailStatus>("gmail_status", { book }));
    })}>Connect Gmail</button>}
    {status?.connected && <>
      <form className="coinbox-mapping" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setMessages(undefined);
        void run(async () => setMessages(await invoke<GmailMessage[]>("gmail_search", { book, label: String(data.get("label")), sender: String(data.get("sender")) })));
      }}>
        <label>Gmail label<input name="label" required maxLength={80} placeholder="Coinbox" /></label>
        <label>Sender (optional)<input name="sender" type="email" maxLength={180} /></label>
        <div className="coinbox-actions">
          <button type="submit" className="coinbox-button primary" disabled={disabled || busy}>Find messages</button>
          <button type="button" className="coinbox-button secondary" disabled={disabled || busy} onClick={() => void run(async () => {
            try { await invoke("gmail_disconnect", { book }); }
            finally { setMessages(undefined); setStatus(await invoke<GmailStatus>("gmail_status", { book })); }
          })}>Disconnect</button>
        </div>
      </form>
      {messages?.length === 0 && <p>No matching messages.</p>}
      {messages?.map((item) => <div key={item.id} className="coinbox-section-title spread">
        <div><strong>{item.subject || "Untitled message"}</strong><br /><small>{item.sender} · {item.date}</small></div>
        <button type="button" className="coinbox-button secondary" disabled={disabled || busy} onClick={() => void run(async () => {
          const bytes = await invoke<ArrayBuffer>("gmail_message", { book, id: item.id });
          await onMessage(new File([bytes], "gmail-message.eml", { type: "message/rfc822" }));
        })}>Review attachments</button>
      </div>)}
    </>}
    {busy && <p role="status">Waiting for Gmail…</p>}
    {error && <p role="alert" className="coinbox-alert">{error}</p>}
  </section>;
}
