use crate::{invalid, Result};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

pub(crate) const MAX_CSV_BYTES: usize = 1024 * 1024;
const MAX_ROWS: usize = 5000;
const MAX_COLUMNS: usize = 100;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CsvPreview {
    headers: Vec<String>,
    examples: Vec<Vec<String>>,
    rows: usize,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CsvMapping {
    pub date: usize,
    pub description: usize,
    pub date_format: DateFormat,
    pub amount: AmountColumns,
    pub balance: Option<usize>,
    pub balance_is_owed: bool,
    pub newest_first: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DateFormat {
    Iso,
    DayFirst,
    MonthFirst,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AmountColumns {
    Signed { column: usize, invert: bool },
    Split { debit: usize, credit: usize },
}

struct Record<'a> {
    line: usize,
    fields: Vec<String>,
    raw: &'a str,
}

pub(crate) struct ParsedRow<'a> {
    pub line: usize,
    pub date: Option<String>,
    pub description: String,
    pub amount: Option<i64>,
    pub balance: Option<i64>,
    pub balance_mismatch: bool,
    pub error: Option<&'static str>,
    pub raw: &'a str,
}

pub fn inspect_csv(bytes: &[u8]) -> Result<CsvPreview> {
    let mut records = read_csv(bytes)?.into_iter();
    let header = records.next().expect("read_csv validates the header");
    let rows = records.len();
    Ok(CsvPreview {
        headers: header
            .fields
            .into_iter()
            .map(|field| field.trim().to_owned())
            .collect(),
        examples: records.take(3).map(|record| record.fields).collect(),
        rows,
    })
}

pub(crate) fn parse_statement<'a>(
    bytes: &'a [u8],
    mapping: &CsvMapping,
) -> Result<Vec<ParsedRow<'a>>> {
    let mut records = read_csv(bytes)?.into_iter();
    let width = records
        .next()
        .expect("read_csv validates the header")
        .fields
        .len();
    let mut columns = vec![mapping.date, mapping.description];
    match mapping.amount {
        AmountColumns::Signed { column, .. } => columns.push(column),
        AmountColumns::Split { debit, credit } => columns.extend([debit, credit]),
    }
    columns.extend(mapping.balance);
    let count = columns.len();
    columns.sort_unstable();
    columns.dedup();
    if columns.len() != count || columns.iter().any(|&column| column >= width) {
        return Err(invalid("Map each field to a different CSV column."));
    }
    let mut rows: Vec<_> = records
        .map(|record| parse_row(record, width, mapping))
        .collect();
    let mut previous = None;
    let chronological: Box<dyn Iterator<Item = &mut ParsedRow<'_>>> = if mapping.newest_first {
        Box::new(rows.iter_mut().rev())
    } else {
        Box::new(rows.iter_mut())
    };
    for row in chronological {
        if row.error.is_some() {
            previous = None;
            continue;
        }
        if let (Some(prior), Some(amount), Some(balance)) = (previous, row.amount, row.balance) {
            row.balance_mismatch = i64::checked_add(prior, amount) != Some(balance);
        }
        previous = row.balance;
    }
    Ok(rows)
}

fn parse_row<'a>(record: Record<'a>, width: usize, mapping: &CsvMapping) -> ParsedRow<'a> {
    let field = |index| {
        record
            .fields
            .get(index)
            .map(|s: &String| s.trim())
            .unwrap_or_default()
    };
    let description = field(mapping.description).to_owned();
    let date = match mapping.date_format {
        DateFormat::Iso => NaiveDate::parse_from_str(field(mapping.date), "%Y-%m-%d"),
        DateFormat::DayFirst => NaiveDate::parse_from_str(field(mapping.date), "%d/%m/%Y")
            .or_else(|_| NaiveDate::parse_from_str(field(mapping.date), "%d-%m-%Y")),
        DateFormat::MonthFirst => NaiveDate::parse_from_str(field(mapping.date), "%m/%d/%Y")
            .or_else(|_| NaiveDate::parse_from_str(field(mapping.date), "%m-%d-%Y")),
    }
    .ok()
    .filter(|date| date.format("%Y").to_string().len() == 4)
    .map(|date| date.format("%Y-%m-%d").to_string());
    let amount = match mapping.amount {
        AmountColumns::Signed { column, invert } => {
            money(field(column)).map(|value| if invert { -value } else { value })
        }
        AmountColumns::Split { debit, credit } => {
            let parse = |value: &str| {
                if value.is_empty() {
                    Some(0)
                } else {
                    money(value)
                }
            };
            match (parse(field(debit)), parse(field(credit))) {
                (Some(debit), Some(0)) if debit > 0 => Some(-debit),
                (Some(0), Some(credit)) if credit > 0 => Some(credit),
                _ => None,
            }
        }
    }
    .filter(|amount| *amount != 0);
    let balance_field = mapping.balance.map(field).filter(|s| !s.is_empty());
    let balance = balance_field.and_then(money).map(|value| {
        if mapping.balance_is_owed {
            -value
        } else {
            value
        }
    });
    let error = if record.fields.len() != width {
        Some("Column count differs from the header.")
    } else if date.is_none() {
        Some("Date does not match the selected format.")
    } else if description.is_empty() {
        Some("Description is empty.")
    } else if amount.is_none() {
        Some("Amount is missing, zero, or invalid.")
    } else if balance_field.is_some() && balance.is_none() {
        Some("Balance is invalid.")
    } else {
        None
    };
    ParsedRow {
        line: record.line,
        date,
        description,
        amount,
        balance,
        balance_mismatch: false,
        error,
        raw: record.raw,
    }
}

fn money(input: &str) -> Option<i64> {
    let input = input.trim();
    let (input, negative) =
        if let Some(inner) = input.strip_prefix('(').and_then(|s| s.strip_suffix(')')) {
            (inner, true)
        } else if let Some(inner) = input.strip_prefix('-') {
            (inner, true)
        } else {
            (input.strip_prefix('+').unwrap_or(input), false)
        };
    let input = input
        .trim()
        .strip_prefix('₹')
        .unwrap_or(input.trim())
        .trim();
    let (whole, fraction) = input
        .split_once('.')
        .map_or((input, None), |(a, b)| (a, Some(b)));
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let groups: Vec<_> = whole.split(',').collect();
    if !groups.iter().all(|group| digits(group)) {
        return None;
    }
    if groups.len() > 1 {
        let middle = &groups[1..groups.len() - 1];
        let western = groups[0].len() <= 3 && middle.iter().all(|group| group.len() == 3);
        let indian = groups[0].len() <= 2 && middle.iter().all(|group| group.len() == 2);
        if groups.last()?.len() != 3 || !(western || indian) {
            return None;
        }
    }
    let paise = match fraction {
        None => 0,
        Some(f) if f.len() <= 2 && digits(f) => {
            f.parse::<i64>().ok()? * if f.len() == 1 { 10 } else { 1 }
        }
        _ => return None,
    };
    let minor = groups
        .concat()
        .parse::<i64>()
        .ok()?
        .checked_mul(100)?
        .checked_add(paise)?;
    Some(if negative { -minor } else { minor })
}

#[derive(Clone, Copy, PartialEq)]
enum FieldState {
    Start,
    Plain,
    Quoted,
    Closed,
}

fn read_csv(bytes: &[u8]) -> Result<Vec<Record<'_>>> {
    if bytes.len() > MAX_CSV_BYTES {
        return Err(invalid("Choose a CSV of up to 1 MiB."));
    }
    let text =
        std::str::from_utf8(bytes).map_err(|_| invalid("Save the statement as UTF-8 CSV."))?;
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    if text.contains('\0') {
        return Err(invalid("The CSV contains a NUL character."));
    }
    let mut records = Vec::new();
    let mut fields = Vec::new();
    let mut field = String::new();
    let mut state = FieldState::Start;
    let mut line = 1;
    let mut start_line = 1;
    let mut start = 0;
    let mut chars = text.char_indices().peekable();
    while let Some((offset, ch)) = chars.next() {
        match (state, ch) {
            (FieldState::Quoted, '"') => state = FieldState::Closed,
            (FieldState::Closed, '"') => {
                field.push('"');
                state = FieldState::Quoted;
            }
            (FieldState::Quoted, '\r' | '\n') => {
                field.push(ch);
                if ch == '\r' && chars.next_if(|&(_, next)| next == '\n').is_some() {
                    field.push('\n');
                }
                line += 1;
            }
            (FieldState::Quoted, _) => field.push(ch),
            (_, ',') => {
                fields.push(std::mem::take(&mut field));
                if fields.len() >= MAX_COLUMNS {
                    return Err(invalid("CSV supports up to 100 columns."));
                }
                state = FieldState::Start;
            }
            (_, '\r' | '\n') => {
                push_record(
                    &mut records,
                    &mut fields,
                    &mut field,
                    start_line,
                    &text[start..offset],
                )?;
                if ch == '\r' {
                    chars.next_if(|&(_, next)| next == '\n');
                }
                line += 1;
                start_line = line;
                start = chars.peek().map_or(text.len(), |&(next, _)| next);
                state = FieldState::Start;
            }
            (FieldState::Start, '"') => state = FieldState::Quoted,
            (FieldState::Closed, _) | (_, '"') => {
                return Err(invalid(format!("Invalid CSV quoting on line {line}.")))
            }
            (_, _) => {
                field.push(ch);
                state = FieldState::Plain;
            }
        }
    }
    if state == FieldState::Quoted {
        return Err(invalid(format!("Unclosed CSV quote on line {start_line}.")));
    }
    if start < text.len() {
        push_record(
            &mut records,
            &mut fields,
            &mut field,
            start_line,
            &text[start..],
        )?;
    }
    if records.len() < 2 {
        return Err(invalid(
            "The CSV needs a header and at least one transaction row.",
        ));
    }
    Ok(records)
}

fn push_record<'a>(
    records: &mut Vec<Record<'a>>,
    fields: &mut Vec<String>,
    field: &mut String,
    line: usize,
    raw: &'a str,
) -> Result<()> {
    if records.len() > MAX_ROWS {
        return Err(invalid("CSV supports up to 5,000 data rows."));
    }
    fields.push(std::mem::take(field));
    let fields = std::mem::take(fields);
    if !raw.trim().is_empty() {
        records.push(Record { line, fields, raw });
    }
    Ok(())
}

pub(crate) fn write_csv_row(output: &mut String, fields: &[&str]) {
    for (index, field) in fields.iter().enumerate() {
        if index > 0 {
            output.push(',');
        }
        output.push('"');
        output.push_str(&field.replace('"', "\"\""));
        output.push('"');
    }
    output.push('\n');
}
