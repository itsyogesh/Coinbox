CREATE TABLE recurring_bills (
    id INTEGER PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31)
);
CREATE INDEX recurring_bills_by_book ON recurring_bills (book_id, due_day, id);
