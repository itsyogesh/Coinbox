use crate::{
    csv::{write_csv_row, MAX_CSV_BYTES},
    invalid, Result,
};
use calamine::{open_workbook_auto_from_rs, Data, DataType, Reader};
use std::io::Cursor;

pub(crate) fn normalize(name: &str, bytes: &[u8]) -> Result<Option<Vec<u8>>> {
    let name = name.to_ascii_lowercase();
    if !name.ends_with(".xlsx") && !name.ends_with(".xls") {
        return Ok(None);
    }
    if bytes.is_empty() || bytes.len() > MAX_CSV_BYTES {
        return Err(invalid("Choose an Excel file of up to 1 MiB."));
    }
    let mut workbook = open_workbook_auto_from_rs(Cursor::new(bytes))
        .map_err(|_| invalid("Could not open this Excel statement."))?;
    if workbook.sheet_names().len() != 1 {
        return Err(invalid(
            "Save the statement sheet as a one-sheet workbook or CSV.",
        ));
    }
    let sheet = workbook
        .worksheet_range_at(0)
        .ok_or_else(|| invalid("The workbook has no statement sheet."))?
        .map_err(|_| invalid("Could not read the Excel statement sheet."))?;
    if sheet.width() > 100 || sheet.height() > 5001 {
        return Err(invalid(
            "The Excel statement exceeds 100 columns or 5,000 data rows.",
        ));
    }
    let mut csv = String::new();
    for row in sheet.rows() {
        if row.iter().all(DataType::is_empty) {
            continue;
        }
        let cells = row
            .iter()
            .map(|cell| match cell {
                Data::DateTime(_) => cell
                    .as_date()
                    .map(|date| date.format("%Y-%m-%d").to_string())
                    .unwrap_or_else(|| cell.to_string()),
                _ => cell.to_string(),
            })
            .collect::<Vec<_>>();
        let fields = cells.iter().map(String::as_str).collect::<Vec<_>>();
        write_csv_row(&mut csv, &fields);
        if csv.len() > MAX_CSV_BYTES {
            return Err(invalid("The mapped Excel statement exceeds 1 MiB."));
        }
    }
    Ok(Some(csv.into_bytes()))
}
