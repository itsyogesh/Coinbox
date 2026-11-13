CREATE TABLE books (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
INSERT INTO books VALUES ('personal', 'Personal'), ('droidsize', 'Droidsize');

CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL REFERENCES books,
    name TEXT NOT NULL COLLATE NOCASE,
    kind TEXT NOT NULL CHECK (kind IN ('bank', 'card')),
    UNIQUE (book_id, name),
    UNIQUE (book_id, id)
);
CREATE TABLE source_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL REFERENCES books,
    fingerprint TEXT NOT NULL,
    name TEXT NOT NULL,
    bytes BLOB NOT NULL,
    UNIQUE (book_id, fingerprint),
    UNIQUE (book_id, id)
);
CREATE TABLE import_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL REFERENCES books,
    source_id INTEGER NOT NULL UNIQUE,
    account_id INTEGER NOT NULL,
    mapping TEXT NOT NULL,
    FOREIGN KEY (book_id, source_id) REFERENCES source_documents (book_id, id) ON DELETE CASCADE,
    FOREIGN KEY (book_id, account_id) REFERENCES accounts (book_id, id)
);
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL REFERENCES books,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'refund', 'transfer')),
    UNIQUE (book_id, id)
);
CREATE TABLE source_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES import_runs ON DELETE CASCADE,
    line INTEGER NOT NULL,
    date TEXT,
    description TEXT NOT NULL,
    amount INTEGER,
    balance INTEGER,
    balance_mismatch INTEGER NOT NULL CHECK (balance_mismatch IN (0, 1)),
    error TEXT,
    signature TEXT,
    transfer_hint INTEGER NOT NULL CHECK (transfer_hint IN (0, 1)),
    raw TEXT NOT NULL,
    skipped INTEGER NOT NULL DEFAULT 0 CHECK (skipped IN (0, 1)),
    entry_id INTEGER REFERENCES journal_entries,
    UNIQUE (run_id, line)
);
CREATE TABLE postings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL REFERENCES books,
    entry_id INTEGER NOT NULL,
    account_id INTEGER,
    category TEXT NOT NULL CHECK (category IN ('account', 'expense', 'income')),
    amount INTEGER NOT NULL,
    CHECK ((category = 'account') = (account_id IS NOT NULL)),
    FOREIGN KEY (book_id, entry_id) REFERENCES journal_entries (book_id, id),
    FOREIGN KEY (book_id, account_id) REFERENCES accounts (book_id, id)
);
CREATE TABLE confirmations (
    book_id TEXT NOT NULL REFERENCES books,
    request_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    posted INTEGER NOT NULL,
    skipped INTEGER NOT NULL,
    PRIMARY KEY (book_id, request_id)
);
CREATE INDEX entries_by_book ON journal_entries (book_id, date DESC, id DESC);
CREATE INDEX postings_by_entry ON postings (entry_id);
CREATE INDEX rows_by_entry ON source_rows (entry_id);
CREATE INDEX rows_by_signature ON source_rows (signature);
CREATE INDEX rows_by_date ON source_rows (date, amount);
PRAGMA application_id = 1128416854;
PRAGMA user_version = 1;
