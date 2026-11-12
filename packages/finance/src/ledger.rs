use crate::{
    csv::write_csv_row,
    digest,
    imports::{duplicate_for, observation, read_ref, transfer_matches, Observation},
    invalid, Result, SourceRef, Vault,
};
use rusqlite::{params, Connection, OptionalExtension, Transaction, TransactionBehavior};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Serialize)]
pub struct Book {
    pub id: String,
    pub name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub movement: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Confirmation {
    pub request_id: String,
    pub post: Vec<PostChoice>,
    pub skip: Vec<i64>,
    pub transfers: Vec<TransferChoice>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostChoice {
    pub row_id: i64,
    pub acknowledge_warning: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferChoice {
    pub bank_row_id: i64,
    pub card_row_id: i64,
}

#[derive(Serialize)]
pub struct ConfirmationResult {
    pub posted: i64,
    pub skipped: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerEntry {
    pub id: i64,
    pub date: String,
    pub description: String,
    pub kind: String,
    pub amount: String,
    pub spending: String,
    pub income: String,
    pub accounts: Vec<String>,
    pub sources: Vec<SourceRef>,
}

#[derive(Serialize)]
pub struct Report {
    pub spending: String,
    pub income: String,
    pub accounts: Vec<Account>,
    pub entries: Vec<LedgerEntry>,
}

impl Vault {
    pub fn books(&self) -> Result<Vec<Book>> {
        let mut query = self
            .conn
            .prepare("SELECT id, name FROM books ORDER BY rowid")?;
        let books = query
            .query_map([], |row| {
                Ok(Book {
                    id: row.get(0)?,
                    name: row.get(1)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(books)
    }

    pub fn add_account(&mut self, book: &str, name: &str, kind: &str) -> Result<i64> {
        require_book(&self.conn, book)?;
        let name = name.trim();
        if name.is_empty()
            || name.chars().count() > 80
            || name.chars().any(char::is_control)
            || !matches!(kind, "bank" | "card")
        {
            return Err(invalid(
                "Enter an account name up to 80 characters and select bank or card.",
            ));
        }
        if self.conn.execute(
            "INSERT INTO accounts (book_id, name, kind) VALUES (?1, ?2, ?3)
            ON CONFLICT (book_id, name) DO NOTHING",
            params![book, name, kind],
        )? == 0
        {
            return Err(invalid("This book already has an account with that name."));
        }
        Ok(self.conn.last_insert_rowid())
    }

    pub fn confirm(&mut self, book: &str, choices: &Confirmation) -> Result<ConfirmationResult> {
        let tx = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        require_book(&tx, book)?;
        if choices.request_id.is_empty() || choices.request_id.len() > 100 {
            return Err(invalid("A confirmation needs a request ID."));
        }
        let hash = digest(&serde_json::to_vec(choices)?);
        let receipt: Option<(String, i64, i64)> = tx
            .query_row(
                "SELECT request_hash, posted, skipped
            FROM confirmations WHERE book_id = ?1 AND request_id = ?2",
                params![book, choices.request_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()?;
        if let Some((previous, posted, skipped)) = receipt {
            if previous != hash {
                return Err(invalid(
                    "That confirmation ID belongs to a different selection.",
                ));
            }
            return Ok(ConfirmationResult { posted, skipped });
        }
        let mut seen = HashSet::new();
        let ids = choices
            .post
            .iter()
            .map(|row| row.row_id)
            .chain(choices.skip.iter().copied())
            .chain(
                choices
                    .transfers
                    .iter()
                    .flat_map(|pair| [pair.bank_row_id, pair.card_row_id]),
            );
        for id in ids {
            if !seen.insert(id) {
                return Err(invalid("A row can only have one decision."));
            }
        }
        if seen.is_empty() {
            return Err(invalid("Select at least one row or transfer to confirm."));
        }

        // Validate all choices against one snapshot before changing any row's status.
        let skips = choices
            .skip
            .iter()
            .map(|&id| pending(&tx, book, id))
            .collect::<Result<Vec<_>>>()?;
        let mut pairs = Vec::new();
        for pair in &choices.transfers {
            let bank = pending(&tx, book, pair.bank_row_id)?;
            let card = pending(&tx, book, pair.card_row_id)?;
            if bank.kind != "bank"
                || card.kind != "card"
                || !transfer_matches(&tx, book, &bank)?
                    .iter()
                    .any(|item| item.row_id == pair.card_row_id)
            {
                return Err(invalid(
                    "A selected repayment pair is no longer eligible. Refresh the review.",
                ));
            }
            if duplicate_for(&tx, book, &bank, false)?.is_some()
                || duplicate_for(&tx, book, &card, false)?.is_some()
            {
                return Err(invalid("A repayment row matches a posted row in another statement. Review the duplicate first."));
            }
            pairs.push((bank, card));
        }
        let mut posts = Vec::new();
        for choice in &choices.post {
            let row = pending(&tx, book, choice.row_id)?;
            if !choice.acknowledge_warning
                && (row.transfer_hint
                    || row.row.balance_mismatch
                    || duplicate_for(&tx, book, &row, true)?.is_some()
                    || !transfer_matches(&tx, book, &row)?.is_empty())
            {
                return Err(invalid("A selected row has a review warning. Refresh the review and confirm it individually."));
            }
            posts.push(row);
        }

        for row in &skips {
            tx.execute(
                "UPDATE source_rows SET skipped = 1 WHERE id = ?1",
                [row.row.source.row_id],
            )?;
        }
        for (bank, card) in &pairs {
            post_transfer(&tx, book, bank, card)?;
        }
        for row in &posts {
            post_individual(&tx, book, row)?;
        }
        let posted = (posts.len() + pairs.len()) as i64;
        let skipped = skips.len() as i64;
        tx.execute(
            "INSERT INTO confirmations VALUES (?1, ?2, ?3, ?4, ?5)",
            params![book, choices.request_id, hash, posted, skipped],
        )?;
        tx.commit()?;
        Ok(ConfirmationResult { posted, skipped })
    }

    pub fn report(&self, book: &str) -> Result<Report> {
        let tx = self.conn.unchecked_transaction()?;
        require_book(&tx, book)?;
        let (spending, income): (i64, i64) = tx.query_row(
            "SELECT
            coalesce(sum(amount) FILTER (WHERE category = 'expense'), 0),
            coalesce(sum(-amount) FILTER (WHERE category = 'income'), 0)
            FROM postings WHERE book_id = ?1",
            [book],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        let accounts = {
            let mut query = tx.prepare("SELECT a.id, a.name, a.kind, coalesce(sum(p.amount), 0) FROM accounts a
                LEFT JOIN postings p ON p.account_id = a.id WHERE a.book_id = ?1 GROUP BY a.id ORDER BY a.id")?;
            let rows = query
                .query_map([book], |row| {
                    Ok(Account {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        kind: row.get(2)?,
                        movement: row.get::<_, i64>(3)?.to_string(),
                    })
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            rows
        };
        let entries = report_entries(&tx, book)?;
        tx.commit()?;
        Ok(Report {
            spending: spending.to_string(),
            income: income.to_string(),
            accounts,
            entries,
        })
    }

    pub fn export_csv(&self, book: &str) -> Result<String> {
        let report = self.report(book)?;
        let mut csv = String::new();
        write_csv_row(
            &mut csv,
            &[
                "entry_id",
                "date",
                "description",
                "kind",
                "amount_inr",
                "spending_inr",
                "income_inr",
                "accounts",
                "source_rows",
            ],
        );
        for entry in report.entries {
            let references = entry
                .sources
                .iter()
                .map(|source| {
                    format!(
                        "{} line {} (row {})",
                        source.name, source.line, source.row_id
                    )
                })
                .collect::<Vec<_>>()
                .join(" | ");
            write_csv_row(
                &mut csv,
                &[
                    &entry.id.to_string(),
                    &entry.date,
                    &spreadsheet_text(&entry.description),
                    &entry.kind,
                    &decimal(&entry.amount),
                    &decimal(&entry.spending),
                    &decimal(&entry.income),
                    &spreadsheet_text(&entry.accounts.join(" → ")),
                    &spreadsheet_text(&references),
                ],
            );
        }
        Ok(csv)
    }
}

pub(crate) fn require_book(conn: &Connection, book: &str) -> Result<()> {
    if !conn
        .prepare("SELECT 1 FROM books WHERE id = ?1")?
        .exists([book])?
    {
        return Err(invalid("Choose an available book."));
    }
    Ok(())
}

fn pending(conn: &Connection, book: &str, id: i64) -> Result<Observation> {
    let row = observation(conn, book, id)?;
    if row.row.status != "pending" {
        return Err(invalid(
            "A row was already decided or is invalid. Refresh the review.",
        ));
    }
    Ok(row)
}

fn post_individual(tx: &Transaction<'_>, book: &str, row: &Observation) -> Result<()> {
    let amount = row
        .amount
        .ok_or_else(|| invalid("The row has no amount."))?;
    let (kind, category) = match (amount < 0, row.kind.as_str()) {
        (true, _) => ("expense", "expense"),
        (false, "card") => ("refund", "expense"),
        _ => ("income", "income"),
    };
    let entry = insert_entry(tx, book, row, &row.row.description, kind)?;
    post(tx, book, entry, Some(row.account_id), "account", amount)?;
    post(tx, book, entry, None, category, -amount)?;
    link(tx, entry, row)
}

fn post_transfer(
    tx: &Transaction<'_>,
    book: &str,
    bank: &Observation,
    card: &Observation,
) -> Result<()> {
    let amount = bank
        .amount
        .ok_or_else(|| invalid("The repayment has no amount."))?;
    let entry = insert_entry(tx, book, bank, "Credit card repayment", "transfer")?;
    post(tx, book, entry, Some(bank.account_id), "account", amount)?;
    post(tx, book, entry, Some(card.account_id), "account", -amount)?;
    link(tx, entry, bank)?;
    link(tx, entry, card)
}

fn insert_entry(
    tx: &Transaction<'_>,
    book: &str,
    row: &Observation,
    description: &str,
    kind: &str,
) -> Result<i64> {
    tx.execute(
        "INSERT INTO journal_entries (book_id, date, description, kind) VALUES (?1, ?2, ?3, ?4)",
        params![book, row.row.date, description, kind],
    )?;
    Ok(tx.last_insert_rowid())
}

fn post(
    tx: &Transaction<'_>,
    book: &str,
    entry: i64,
    account: Option<i64>,
    category: &str,
    amount: i64,
) -> Result<()> {
    tx.execute("INSERT INTO postings (book_id, entry_id, account_id, category, amount) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![book, entry, account, category, amount])?;
    Ok(())
}

fn link(tx: &Transaction<'_>, entry: i64, row: &Observation) -> Result<()> {
    tx.execute(
        "UPDATE source_rows SET entry_id = ?1 WHERE id = ?2",
        params![entry, row.row.source.row_id],
    )?;
    Ok(())
}

fn report_entries(conn: &Connection, book: &str) -> Result<Vec<LedgerEntry>> {
    let mut query = conn.prepare("SELECT e.id, e.date, e.description, e.kind,
        CASE WHEN e.kind = 'transfer' THEN max(p.amount) ELSE sum(p.amount) FILTER (WHERE p.category = 'account') END,
        coalesce(sum(p.amount) FILTER (WHERE p.category = 'expense'), 0),
        coalesce(sum(-p.amount) FILTER (WHERE p.category = 'income'), 0)
        FROM journal_entries e JOIN postings p ON p.entry_id = e.id
        WHERE e.book_id = ?1 GROUP BY e.id ORDER BY e.date DESC, e.id DESC")?;
    let mut source = conn.prepare(
        "SELECT r.id, d.id, d.name, r.line FROM source_rows r JOIN import_runs i ON i.id = r.run_id
        JOIN source_documents d ON d.id = i.source_id WHERE r.entry_id = ?1 ORDER BY r.id",
    )?;
    let mut accounts = conn.prepare(
        "SELECT a.name FROM postings p JOIN accounts a ON a.id = p.account_id
        WHERE p.entry_id = ?1 ORDER BY p.id",
    )?;
    let entries = query
        .query_map([book], |row| {
            let id = row.get::<_, i64>(0)?;
            Ok(LedgerEntry {
                id,
                date: row.get(1)?,
                description: row.get(2)?,
                kind: row.get(3)?,
                amount: row.get::<_, i64>(4)?.to_string(),
                spending: row.get::<_, i64>(5)?.to_string(),
                income: row.get::<_, i64>(6)?.to_string(),
                accounts: accounts
                    .query_map([id], |row| row.get(0))?
                    .collect::<rusqlite::Result<_>>()?,
                sources: source
                    .query_map([id], read_ref)?
                    .collect::<rusqlite::Result<_>>()?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(entries)
}

fn decimal(amount: &str) -> String {
    // Amounts in the report are generated from signed integer minor units.
    let digits = amount.trim_start_matches('-');
    let sign = if amount.starts_with('-') { "-" } else { "" };
    if digits.len() <= 2 {
        return format!("{sign}0.{digits:0>2}");
    }
    let (whole, fraction) = digits.split_at(digits.len() - 2);
    format!("{sign}{whole}.{fraction}")
}

fn spreadsheet_text(text: &str) -> String {
    if text
        .trim_start()
        .starts_with(['=', '+', '-', '@', '＝', '＋', '－', '＠'])
        || text.starts_with(['\t', '\r', '\n'])
    {
        return format!("'{text}");
    }
    text.to_owned()
}
