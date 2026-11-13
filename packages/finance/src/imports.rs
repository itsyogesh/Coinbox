use crate::{
    csv::{parse_statement, CsvMapping},
    digest, invalid,
    ledger::require_book,
    Result, Vault,
};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Statement {
    pub account_id: i64,
    pub name: String,
    pub bytes: Vec<u8>,
    pub mapping: CsvMapping,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StageResult {
    pub source_id: i64,
    pub already_exists: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceDocument {
    pub id: i64,
    pub name: String,
    pub fingerprint: String,
    pub account: String,
    pub account_id: i64,
    pub first_date: Option<String>,
    pub last_date: Option<String>,
    pub valid: i64,
    pub invalid: i64,
    pub pending: i64,
    pub posted: i64,
    pub skipped: i64,
    pub balances: i64,
    pub mismatches: i64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRef {
    pub row_id: i64,
    pub source_id: i64,
    pub name: String,
    pub line: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRow {
    #[serde(flatten)]
    pub source: SourceRef,
    pub account: String,
    pub date: Option<String>,
    pub description: String,
    pub amount: Option<String>,
    pub balance: Option<String>,
    pub balance_mismatch: bool,
    pub raw: String,
    pub status: &'static str,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewRow {
    #[serde(flatten)]
    pub row: SourceRow,
    pub duplicate: Option<SourceRef>,
    pub transfer_hint: bool,
    pub transfer_matches: Vec<SourceRef>,
}

#[derive(Serialize)]
pub struct Review {
    pub sources: Vec<SourceDocument>,
    pub rows: Vec<ReviewRow>,
}

pub(crate) struct Observation {
    pub row: SourceRow,
    pub account_id: i64,
    pub kind: String,
    pub amount: Option<i64>,
    signature: Option<String>,
    pub transfer_hint: bool,
}

const OBSERVATIONS: &str = "SELECT r.id, d.id, d.name, r.line, a.name, r.date, r.description,
    r.amount, r.balance, r.balance_mismatch, r.raw, r.error, r.skipped, r.entry_id,
    a.id, a.kind, r.signature, r.transfer_hint
    FROM source_rows r JOIN import_runs i ON i.id = r.run_id
    JOIN source_documents d ON d.id = i.source_id JOIN accounts a ON a.id = i.account_id";

impl Vault {
    pub fn stage(&mut self, book: &str, statement: &Statement) -> Result<StageResult> {
        let fingerprint = digest(&statement.bytes);
        let tx = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let kind: String = tx
            .query_row(
                "SELECT kind FROM accounts WHERE book_id = ?1 AND id = ?2",
                params![book, statement.account_id],
                |row| row.get(0),
            )
            .optional()?
            .ok_or_else(|| invalid("Choose an account in this book."))?;
        let existing: Option<(i64, i64)> = tx.query_row(
            "SELECT d.id, i.account_id FROM source_documents d JOIN import_runs i ON i.source_id = d.id
             WHERE d.book_id = ?1 AND d.fingerprint = ?2",
            params![book, fingerprint], |row| Ok((row.get(0)?, row.get(1)?)),
        ).optional()?;
        if let Some((source_id, account_id)) = existing {
            if account_id != statement.account_id {
                return Err(invalid(
                    "This file is already in this book under a different account.",
                ));
            }
            return Ok(StageResult {
                source_id,
                already_exists: true,
            });
        }
        let normalized = crate::document::normalize(&statement.name, &statement.bytes)?;
        let rows = parse_statement(
            normalized.as_deref().unwrap_or(&statement.bytes),
            &statement.mapping,
        )?;
        let name: String = statement
            .name
            .rsplit(['/', '\\'])
            .next()
            .unwrap_or_default()
            .chars()
            .filter(|c| !c.is_control())
            .take(200)
            .collect();
        if name.trim().is_empty() {
            return Err(invalid("The statement needs a filename."));
        }
        tx.execute("INSERT INTO source_documents (book_id, fingerprint, name, bytes) VALUES (?1, ?2, ?3, ?4)",
            params![book, fingerprint, name, statement.bytes])?;
        let source_id = tx.last_insert_rowid();
        tx.execute("INSERT INTO import_runs (book_id, source_id, account_id, mapping) VALUES (?1, ?2, ?3, ?4)",
            params![book, source_id, statement.account_id, serde_json::to_string(&statement.mapping)?])?;
        let run = tx.last_insert_rowid();
        {
            let mut insert = tx.prepare("INSERT INTO source_rows (run_id, line, date, description, amount, balance,
                balance_mismatch, error, signature, transfer_hint, raw) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)")?;
            for row in rows {
                let description = row
                    .description
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
                    .to_lowercase();
                let signature = match (&row.date, row.amount, row.error) {
                    (Some(date), Some(amount), None) => Some(digest(
                        format!("{date}\n{amount}\n{description}").as_bytes(),
                    )),
                    _ => None,
                };
                let transfer_hint = match (kind.as_str(), row.amount) {
                    ("card", Some(amount)) if amount > 0 => [
                        "payment received",
                        "payment thank",
                        "payment - thank",
                        "payment by",
                        "card repayment",
                        "autopay payment",
                        "credit card payment",
                    ]
                    .iter()
                    .any(|hint| description.contains(hint)),
                    ("bank", Some(amount)) if amount < 0 => {
                        ["card payment", "card repayment", "card bill"]
                            .iter()
                            .any(|hint| description.contains(hint))
                    }
                    _ => false,
                };
                insert.execute(params![
                    run,
                    row.line,
                    row.date,
                    row.description,
                    row.amount,
                    row.balance,
                    row.balance_mismatch,
                    row.error,
                    signature,
                    transfer_hint,
                    row.raw
                ])?;
            }
        }
        tx.commit()?;
        Ok(StageResult {
            source_id,
            already_exists: false,
        })
    }

    pub fn review(&self, book: &str) -> Result<Review> {
        require_book(&self.conn, book)?;
        let mut source_query = self.conn.prepare(
            "SELECT d.id, d.name, d.fingerprint, a.name, a.id,
            min(CASE WHEN r.error IS NULL THEN r.date END), max(CASE WHEN r.error IS NULL THEN r.date END),
            count(*) FILTER (WHERE r.error IS NULL), count(r.error),
            count(*) FILTER (WHERE r.error IS NULL AND r.entry_id IS NULL AND r.skipped = 0),
            count(r.entry_id), sum(r.skipped), count(r.balance), sum(r.balance_mismatch)
            FROM source_documents d JOIN import_runs i ON i.source_id = d.id JOIN accounts a ON a.id = i.account_id
            JOIN source_rows r ON r.run_id = i.id WHERE d.book_id = ?1 GROUP BY d.id ORDER BY d.id DESC",
        )?;
        let sources = source_query
            .query_map([book], |row| {
                Ok(SourceDocument {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    fingerprint: row.get(2)?,
                    account: row.get(3)?,
                    account_id: row.get(4)?,
                    first_date: row.get(5)?,
                    last_date: row.get(6)?,
                    valid: row.get(7)?,
                    invalid: row.get(8)?,
                    pending: row.get(9)?,
                    posted: row.get(10)?,
                    skipped: row.get(11)?,
                    balances: row.get(12)?,
                    mismatches: row.get(13)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let mut query = self.conn.prepare(&format!("{OBSERVATIONS} WHERE d.book_id = ?1 AND r.entry_id IS NULL AND r.skipped = 0 ORDER BY d.id, r.line"))?;
        let rows = query.query_map([book], read_observation)?;
        let mut review = Vec::new();
        for row in rows {
            let row = row?;
            let duplicate = duplicate_for(&self.conn, book, &row, true)?;
            let transfer_matches = transfer_matches(&self.conn, book, &row)?;
            review.push(ReviewRow {
                row: row.row,
                duplicate,
                transfer_hint: row.transfer_hint,
                transfer_matches,
            });
        }
        Ok(Review {
            sources,
            rows: review,
        })
    }

    pub fn discard(&mut self, book: &str, source_id: i64) -> Result<()> {
        let deleted = self.conn.execute(
            "DELETE FROM source_documents WHERE book_id = ?1 AND id = ?2 AND NOT EXISTS (
            SELECT 1 FROM import_runs i JOIN source_rows r ON r.run_id = i.id
            WHERE i.source_id = ?2 AND (r.entry_id IS NOT NULL OR r.skipped = 1))",
            params![book, source_id],
        )?;
        if deleted == 0 {
            return Err(invalid(
                "Only a statement with no confirmed rows can be discarded.",
            ));
        }
        Ok(())
    }

    pub fn source_row(&self, book: &str, row_id: i64) -> Result<SourceRow> {
        Ok(observation(&self.conn, book, row_id)?.row)
    }

    pub fn source_extension(&self, book: &str, source_id: i64) -> Result<&'static str> {
        let name: String = self
            .conn
            .query_row(
                "SELECT name FROM source_documents WHERE book_id = ?1 AND id = ?2",
                params![book, source_id],
                |row| row.get(0),
            )
            .optional()?
            .ok_or_else(|| invalid("Statement not found in this book."))?;
        let name = name.to_ascii_lowercase();
        Ok(if name.ends_with(".xlsx") {
            "xlsx"
        } else if name.ends_with(".xls") {
            "xls"
        } else if name.ends_with(".pdf") {
            "pdf"
        } else {
            "csv"
        })
    }

    pub fn source_file(&self, book: &str, source_id: i64) -> Result<Vec<u8>> {
        self.conn
            .query_row(
                "SELECT bytes FROM source_documents WHERE book_id = ?1 AND id = ?2",
                params![book, source_id],
                |row| row.get(0),
            )
            .optional()?
            .ok_or_else(|| invalid("That statement is unavailable in this book."))
    }
}

pub(crate) fn observation(conn: &Connection, book: &str, row_id: i64) -> Result<Observation> {
    let query = format!("{OBSERVATIONS} WHERE d.book_id = ?1 AND r.id = ?2");
    conn.query_row(&query, params![book, row_id], read_observation)
        .optional()?
        .ok_or_else(|| invalid("A selected row is unavailable in this book."))
}

fn read_observation(row: &rusqlite::Row<'_>) -> rusqlite::Result<Observation> {
    let error = row.get::<_, Option<String>>(11)?;
    let amount = row.get::<_, Option<i64>>(7)?;
    let status = if error.is_some() {
        "invalid"
    } else if row.get::<_, Option<i64>>(13)?.is_some() {
        "posted"
    } else if row.get::<_, bool>(12)? {
        "skipped"
    } else {
        "pending"
    };
    Ok(Observation {
        row: SourceRow {
            source: read_ref(row)?,
            account: row.get(4)?,
            date: row.get(5)?,
            description: row.get(6)?,
            amount: amount.map(|v| v.to_string()),
            balance: row.get::<_, Option<i64>>(8)?.map(|v| v.to_string()),
            balance_mismatch: row.get(9)?,
            raw: row.get(10)?,
            status,
            error,
        },
        amount,
        account_id: row.get(14)?,
        kind: row.get(15)?,
        signature: row.get(16)?,
        transfer_hint: row.get(17)?,
    })
}

pub(crate) fn read_ref(row: &rusqlite::Row<'_>) -> rusqlite::Result<SourceRef> {
    Ok(SourceRef {
        row_id: row.get(0)?,
        source_id: row.get(1)?,
        name: row.get(2)?,
        line: row.get(3)?,
    })
}

pub(crate) fn duplicate_for(
    conn: &Connection,
    book: &str,
    row: &Observation,
    include_pending: bool,
) -> Result<Option<SourceRef>> {
    let Some(signature) = &row.signature else {
        return Ok(None);
    };
    Ok(conn.query_row("SELECT r.id, d.id, d.name, r.line FROM source_rows r JOIN import_runs i ON i.id = r.run_id
        JOIN source_documents d ON d.id = i.source_id WHERE d.book_id = ?1 AND i.account_id = ?2
        AND r.signature = ?3 AND d.id <> ?4 AND r.skipped = 0
        AND (r.entry_id IS NOT NULL OR (?5 AND d.id < ?4))
        ORDER BY r.entry_id IS NULL, d.id, r.line LIMIT 1",
        params![book, row.account_id, signature, row.row.source.source_id, include_pending], read_ref).optional()?)
}

pub(crate) fn transfer_matches(
    conn: &Connection,
    book: &str,
    row: &Observation,
) -> Result<Vec<SourceRef>> {
    let (Some(date), Some(amount)) = (&row.row.date, row.amount) else {
        return Ok(Vec::new());
    };
    if row.row.status != "pending"
        || (row.kind == "bank" && amount > 0)
        || (row.kind == "card" && amount < 0)
    {
        return Ok(Vec::new());
    }
    let mut query = conn.prepare(
        "SELECT r.id, d.id, d.name, r.line FROM source_rows r JOIN import_runs i ON i.id = r.run_id
        JOIN source_documents d ON d.id = i.source_id JOIN accounts a ON a.id = i.account_id
        WHERE d.book_id = ?1 AND r.date BETWEEN date(?2, '-3 days') AND date(?2, '+3 days')
        AND r.amount = ?3 AND a.kind <> ?4 AND (?5 OR r.transfer_hint)
        AND r.error IS NULL AND r.entry_id IS NULL AND r.skipped = 0 ORDER BY r.date, r.id",
    )?;
    let matches = query
        .query_map(
            params![book, date, -amount, row.kind, row.transfer_hint],
            read_ref,
        )?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(matches)
}
