import { invoke, isTauri } from "@tauri-apps/api/core";

export type AccountKind = "bank" | "card";
export type DateFormat = "iso" | "day_first" | "month_first";
export type VaultStatus = { exists: boolean; unlocked: boolean };
export type Book = { id: string; name: string };
export type Account = { id: number; name: string; kind: AccountKind; movement: string };
export type CsvPreview = { headers: string[]; examples: string[][]; rows: number };
export type CsvMapping = {
  date: number;
  description: number;
  dateFormat: DateFormat;
  amount: { type: "signed"; column: number; invert: boolean } | { type: "split"; debit: number; credit: number };
  balance: number | null;
  balanceIsOwed: boolean;
  newestFirst: boolean;
};
export type SourceRef = { rowId: number; sourceId: number; name: string; line: number };
export type SourceRow = SourceRef & {
  account: string;
  date: string | null;
  description: string;
  amount: string | null;
  balance: string | null;
  balanceMismatch: boolean;
  status: "invalid" | "pending" | "skipped" | "posted";
  error: string | null;
  raw: string;
};
export type ReviewRow = SourceRow & { duplicate: SourceRef | null; transferHint: boolean; transferMatches: SourceRef[] };
export type SourceDocument = {
  id: number;
  name: string;
  fingerprint: string;
  account: string;
  accountId: number;
  firstDate: string | null;
  lastDate: string | null;
  valid: number;
  invalid: number;
  pending: number;
  posted: number;
  skipped: number;
  balances: number;
  mismatches: number;
};
export type Review = { sources: SourceDocument[]; rows: ReviewRow[] };
export type TransferChoice = { bankRowId: number; cardRowId: number };
export type Confirmation = {
  requestId: string;
  post: { rowId: number; acknowledgeWarning: boolean }[];
  skip: number[];
  transfers: TransferChoice[];
};
export type LedgerEntry = {
  id: number;
  date: string;
  description: string;
  kind: "expense" | "income" | "refund" | "transfer";
  amount: string;
  spending: string;
  income: string;
  accounts: string[];
  sources: SourceRef[];
};
export type Report = { spending: string; income: string; accounts: Account[]; entries: LedgerEntry[] };

export type BillInput = { name: string; amount: string; dueDay: number };
export type Bill = BillInput & { id: number };

type GrantScope = "device" | "assistant";
export type ServerGrant = { id: string; name: string; book: string; scope: GrantScope };

let token = "";
export let remoteFinance = !isTauri();

export async function initializeFinance() {
  if (isTauri()) {
    remoteFinance = await invoke<boolean>("finance_remote_available");
    finance = remoteFinance ? remote : desktop;
  }
}

export function serverGrant(action: { action: "list" }): Promise<ServerGrant[]>;
export function serverGrant(action: { action: "create"; book: string; name: string; scope: GrantScope }): Promise<{ grant: ServerGrant; token: string }>;
export function serverGrant(action: { action: "revoke"; id: string }): Promise<null>;
export function serverGrant(action: object) {
  return serverRequest<unknown>("admin/grants", action);
}

async function serverRequest<T>(path: string, data?: object, download?: string): Promise<T> {
  if (isTauri()) return invoke<T>("finance_remote_request", { path, token, body: data ?? {} });
  const response = await fetch(`/api/${path}`, {
    method: "POST", cache: "no-store", credentials: "omit",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data ?? {}),
  });
  if (!response.ok) {
    const payload: { error?: string } = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Coinbox server returned HTTP ${response.status}.`);
  }
  if (download) {
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    const filename = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1];
    link.download = filename ?? download;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return link.download as T;
  }
  return response.json() as Promise<T>;
}

type Statement = { accountId: number; name: string; bytes: number[]; mapping: CsvMapping };

const desktop = {
  bills: (book: string) => invoke<Bill[]>("finance_bills", { book }),
  saveBill: (book: string, id: number | null, input: BillInput) => invoke<number>("finance_save_bill", { book, id, input }),
  removeBill: (book: string, id: number) => invoke<void>("finance_remove_bill", { book, id }),
  exportFiscalYear: (book: string, startYear: number, evidence: boolean) =>
    invoke<string>("finance_export_fiscal_year", { book, startYear, evidence }),
  status: () => invoke<VaultStatus>("finance_status"),
  unlock: (passphrase: string, create: boolean) => invoke<void>("finance_unlock", { passphrase, create }),
  lock: () => invoke<void>("finance_lock"),
  restore: (passphrase: string, bytes: number[]) => invoke<void>("finance_restore", { passphrase, bytes }),
  backup: () => invoke<string>("finance_backup"),
  books: () => invoke<Book[]>("finance_books"),
  addAccount: (book: string, name: string, kind: AccountKind) => invoke<number>("finance_add_account", { book, name, kind }),
  inspect: (name: string, bytes: number[], _book: string) => invoke<CsvPreview>("finance_inspect_csv", { name, bytes }),
  stage: (book: string, statement: Statement) => invoke<{ sourceId: number; alreadyExists: boolean }>("finance_stage", { book, statement }),
  review: (book: string) => invoke<Review>("finance_review", { book }),
  discard: (book: string, sourceId: number) => invoke<void>("finance_discard", { book, sourceId }),
  confirm: (book: string, choices: Confirmation) => invoke<{ posted: number; skipped: number }>("finance_confirm", { book, choices }),
  report: (book: string) => invoke<Report>("finance_report", { book }),
  sourceRow: (book: string, rowId: number) => invoke<SourceRow>("finance_source_row", { book, rowId }),
  sourceFile: (book: string, sourceId: number) => invoke<string>("finance_source_file", { book, sourceId }),
  exportCsv: (book: string) => invoke<string>("finance_export", { book }),
};

function bookRequest<T>(book: string, operation: string, data?: object, download?: string) {
  return serverRequest<T>(`books/${encodeURIComponent(book)}/${operation}`, data, download);
}

const remote: typeof desktop = {
  status: async () => ({ exists: true, unlocked: Boolean(token) }),
  unlock: async (accessToken) => {
    token = accessToken.trim();
    try { await serverRequest<Book[]>("books"); }
    catch (error) { token = ""; throw error; }
  },
  lock: async () => { token = ""; },
  restore: async () => { throw new Error("Restore server backups on the host."); },
  backup: () => serverRequest("admin/backup", {}, "coinbox-finance-backup.sqlite3"),
  books: () => serverRequest("books"),
  bills: (book) => bookRequest(book, "bills"),
  saveBill: (book, id, input) => bookRequest(book, "save_bill", { id, input }),
  removeBill: (book, id) => bookRequest(book, "remove_bill", { id }),
  exportFiscalYear: (book, startYear, evidence) =>
    bookRequest(book, "export_fiscal_year", { startYear, evidence }, `coinbox-${book}-${startYear}-${evidence ? "evidence" : "ledger"}.csv`),
  addAccount: (book, name, kind) => bookRequest(book, "add_account", { name, kind }),
  inspect: (name, bytes, book) => bookRequest(book, "inspect", { name, bytes }),
  stage: (book, statement) => bookRequest(book, "stage", statement),
  review: (book) => bookRequest(book, "review"),
  discard: (book, sourceId) => bookRequest(book, "discard", { sourceId }),
  confirm: (book, choices) => bookRequest(book, "confirm", choices),
  report: (book) => bookRequest(book, "report"),
  sourceRow: (book, rowId) => bookRequest(book, "source_row", { rowId }),
  sourceFile: (book, sourceId) => bookRequest(book, "source_file", { sourceId }, `coinbox-source-${sourceId}.csv`),
  exportCsv: (book) => bookRequest(book, "export", {}, `coinbox-${book}-ledger.csv`),
};

export let finance = remoteFinance ? remote : desktop;

export function inr(amount: string | null) {
  if (amount === null) return "—";
  const negative = amount.startsWith("-");
  const digits = (negative ? amount.slice(1) : amount).padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(?:\d{2})*\d{3}$)/g, ",");
  return `${negative ? "−" : ""}₹${whole}.${digits.slice(-2)}`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
