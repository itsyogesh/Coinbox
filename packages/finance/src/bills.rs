use crate::{
    csv::write_csv_row,
    invalid,
    ledger::{fiscal_period, require_book, spreadsheet_text},
    Result, Vault,
};
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BillInput {
    pub name: String,
    pub amount: String,
    pub due_day: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bill {
    pub id: i64,
    pub name: String,
    pub amount: String,
    pub due_day: i64,
}

impl Vault {
    pub fn bills(&self, book: &str) -> Result<Vec<Bill>> {
        require_book(&self.conn, book)?;
        let mut query = self.conn.prepare(
            "SELECT id, name, amount, due_day FROM recurring_bills WHERE book_id = ?1 ORDER BY due_day, id",
        )?;
        let bills = query.query_map([book], |row| {
            Ok(Bill {
                id: row.get(0)?,
                name: row.get(1)?,
                amount: row.get::<_, i64>(2)?.to_string(),
                due_day: row.get(3)?,
            })
        })?;
        Ok(bills.collect::<rusqlite::Result<_>>()?)
    }

    pub fn save_bill(&self, book: &str, id: Option<i64>, input: &BillInput) -> Result<i64> {
        require_book(&self.conn, book)?;
        let name = input.name.trim();
        let amount = input
            .amount
            .parse::<i64>()
            .ok()
            .filter(|value| *value > 0)
            .ok_or_else(|| invalid("Enter a positive bill amount in minor units."))?;
        if name.is_empty()
            || name.chars().count() > 80
            || name.chars().any(char::is_control)
            || !(1..=31).contains(&input.due_day)
        {
            return Err(invalid("Enter a bill name and a due day from 1 to 31."));
        }
        match id {
            Some(id) => {
                if self.conn.execute(
                    "UPDATE recurring_bills SET name = ?3, amount = ?4, due_day = ?5 WHERE book_id = ?1 AND id = ?2",
                    params![book, id, name, amount, input.due_day],
                )? == 0 {
                    return Err(invalid("Bill not found in this book."));
                }
                Ok(id)
            }
            None => {
                self.conn.execute(
                    "INSERT INTO recurring_bills (book_id, name, amount, due_day) VALUES (?1, ?2, ?3, ?4)",
                    params![book, name, amount, input.due_day],
                )?;
                Ok(self.conn.last_insert_rowid())
            }
        }
    }

    pub fn remove_bill(&self, book: &str, id: i64) -> Result<()> {
        require_book(&self.conn, book)?;
        self.conn.execute(
            "DELETE FROM recurring_bills WHERE book_id = ?1 AND id = ?2",
            params![book, id],
        )?;
        Ok(())
    }

    pub fn export_evidence(&self, book: &str, start_year: i32) -> Result<String> {
        let (start, end) = fiscal_period(start_year)?;
        let mut csv = String::new();
        write_csv_row(
            &mut csv,
            &[
                "source_id",
                "filename",
                "account",
                "sha256",
                "first_row_date",
                "last_row_date",
                "parsed_rows",
                "invalid_rows",
                "pending_rows",
                "posted_rows",
                "excluded_rows",
                "balances_mapped",
                "balance_mismatches",
            ],
        );
        for source in self.review(book)?.sources {
            if source.first_date.as_ref().is_some_and(|date| date >= &end)
                || source.last_date.as_ref().is_some_and(|date| date < &start)
            {
                continue;
            }
            write_csv_row(
                &mut csv,
                &[
                    &source.id.to_string(),
                    &spreadsheet_text(&source.name),
                    &spreadsheet_text(&source.account),
                    &source.fingerprint,
                    source.first_date.as_deref().unwrap_or_default(),
                    source.last_date.as_deref().unwrap_or_default(),
                    &source.valid.to_string(),
                    &source.invalid.to_string(),
                    &source.pending.to_string(),
                    &source.posted.to_string(),
                    &source.skipped.to_string(),
                    &source.balances.to_string(),
                    &source.mismatches.to_string(),
                ],
            );
        }
        Ok(csv)
    }
}
