import { invoke } from "@tauri-apps/api/core";

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

export const finance = {
  status: () => invoke<VaultStatus>("finance_status"),
  unlock: (passphrase: string, create: boolean) => invoke<void>("finance_unlock", { passphrase, create }),
  lock: () => invoke<void>("finance_lock"),
  restore: (passphrase: string, bytes: number[]) => invoke<void>("finance_restore", { passphrase, bytes }),
  backup: () => invoke<string>("finance_backup"),
  books: () => invoke<Book[]>("finance_books"),
  addAccount: (book: string, name: string, kind: AccountKind) => invoke<number>("finance_add_account", { book, name, kind }),
  inspect: (bytes: number[]) => invoke<CsvPreview>("finance_inspect_csv", { bytes }),
  stage: (book: string, statement: { accountId: number; name: string; bytes: number[]; mapping: CsvMapping }) =>
    invoke<{ sourceId: number; alreadyExists: boolean }>("finance_stage", { book, statement }),
  review: (book: string) => invoke<Review>("finance_review", { book }),
  discard: (book: string, sourceId: number) => invoke<void>("finance_discard", { book, sourceId }),
  confirm: (book: string, choices: Confirmation) => invoke<{ posted: number; skipped: number }>("finance_confirm", { book, choices }),
  report: (book: string) => invoke<Report>("finance_report", { book }),
  sourceRow: (book: string, rowId: number) => invoke<SourceRow>("finance_source_row", { book, rowId }),
  sourceFile: (book: string, sourceId: number) => invoke<string>("finance_source_file", { book, sourceId }),
  exportCsv: (book: string) => invoke<string>("finance_export", { book }),
};

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
