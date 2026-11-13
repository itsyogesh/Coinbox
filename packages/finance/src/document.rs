use crate::{
    csv::{write_csv_row, MAX_CSV_BYTES},
    invalid, Result,
};
use std::{
    io::{Read, Write},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

pub(crate) fn normalize(name: &str, bytes: &[u8]) -> Result<Option<Vec<u8>>> {
    let name = name.to_ascii_lowercase();
    if !name.ends_with(".pdf") {
        return crate::spreadsheet::normalize(&name, bytes);
    }
    if bytes.len() > MAX_CSV_BYTES || !bytes.starts_with(b"%PDF-") {
        return Err(invalid("Choose a PDF statement of up to 1 MiB."));
    }
    let info = run("pdfinfo", &["-"], bytes, MAX_CSV_BYTES)?;
    let info = read_text(&info)?;
    let pages = info
        .lines()
        .find_map(|line| line.strip_prefix("Pages:"))
        .and_then(|value| value.trim().parse::<usize>().ok())
        .unwrap_or(0);
    if !(1..=8).contains(&pages) {
        return Err(invalid(
            "PDF statements can have up to eight pages. Split larger statements or export a CSV.",
        ));
    }

    let layout = run("pdftotext", &["-layout", "-", "-"], bytes, MAX_CSV_BYTES)?;
    if let Some(csv) = table(read_text(&layout)?)? {
        return Ok(Some(csv));
    }

    let mut ocr = String::new();
    for page in 1..=pages {
        let page = page.to_string();
        let image = run(
            "pdftoppm",
            &[
                "-f",
                &page,
                "-l",
                &page,
                "-scale-to",
                "2200",
                "-singlefile",
                "-png",
                "-",
            ],
            bytes,
            16 * MAX_CSV_BYTES,
        )?;
        let scanned = run(
            "tesseract",
            &[
                "stdin",
                "stdout",
                "--psm",
                "6",
                "-c",
                "preserve_interword_spaces=1",
            ],
            &image,
            MAX_CSV_BYTES,
        )?;
        ocr.push_str(read_text(&scanned)?);
        ocr.push('\n');
        if ocr.len() > MAX_CSV_BYTES {
            return Err(invalid("The extracted statement text exceeds 1 MiB."));
        }
    }
    table(&ocr)?.map(Some).ok_or_else(|| {
        invalid("No supported transaction table was found. Export the statement as CSV or Excel.")
    })
}

fn read_text(bytes: &[u8]) -> Result<&str> {
    std::str::from_utf8(bytes).map_err(|_| invalid("The extracted statement text is not UTF-8."))
}

fn run(command: &str, args: &[&str], input: &[u8], limit: usize) -> Result<Vec<u8>> {
    let mut child = Command::new(command)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                invalid(format!("Install {command} to import PDF statements."))
            } else {
                error.into()
            }
        })?;
    let mut stdin = child.stdin.take().expect("configured stdin pipe");
    let stdout = child.stdout.take().expect("configured stdout pipe");

    thread::scope(|scope| {
        let writer = scope.spawn(move || stdin.write_all(input));
        let reader = scope.spawn(move || {
            let mut output = Vec::new();
            stdout.take(limit as u64 + 1).read_to_end(&mut output)?;
            Ok::<_, std::io::Error>(output)
        });
        let deadline = Instant::now() + Duration::from_secs(12);
        let status = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status,
                Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(25)),
                result => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return match result {
                        Ok(_) => Err(invalid(format!("{command} timed out reading this PDF."))),
                        Err(error) => Err(error.into()),
                    };
                }
            }
        };
        let output = reader
            .join()
            .map_err(|_| invalid("Could not read extracted statement data."))??;
        if output.len() > limit {
            return Err(invalid("Extracted statement data exceeds the size limit."));
        }
        if !status.success() {
            return Err(invalid(format!("{command} could not read this PDF.")));
        }
        match writer
            .join()
            .map_err(|_| invalid("Could not send the statement to the PDF parser."))?
        {
            Err(error) if error.kind() != std::io::ErrorKind::BrokenPipe => Err(error.into()),
            _ => Ok(output),
        }
    })
}

fn columns(line: &str) -> Vec<&str> {
    line.trim()
        .split("  ")
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect()
}

fn table(text: &str) -> Result<Option<Vec<u8>>> {
    let mut header: Option<Vec<&str>> = None;
    let mut rows = Vec::new();
    let mut uncertain = false;
    for line in text.lines() {
        let fields = columns(line);
        if fields.len() < 3 {
            continue;
        }
        if fields[0].to_ascii_lowercase().contains("date")
            && fields.iter().any(|field| {
                let value = field.to_ascii_lowercase();
                ["amount", "debit", "withdrawal", "credit", "deposit"]
                    .iter()
                    .any(|word| value.contains(word))
            })
        {
            if let Some(current) = &header {
                if *current != fields {
                    uncertain = true;
                }
            } else {
                header = Some(fields);
            }
            continue;
        }
        let Some(current) = &header else {
            continue;
        };
        let date = fields[0];
        if date
            .bytes()
            .next()
            .is_some_and(|byte| byte.is_ascii_digit())
            && (date.contains('-') || date.contains('/'))
        {
            if fields.len() != current.len() {
                uncertain = true;
            }
            rows.push(fields);
        }
    }
    let Some(header) = header.filter(|_| !rows.is_empty() && !uncertain) else {
        return Ok(None);
    };
    let mut csv = String::new();
    write_csv_row(&mut csv, &header);
    for row in rows {
        write_csv_row(&mut csv, &row);
    }
    if csv.len() > MAX_CSV_BYTES {
        return Err(invalid("The mapped PDF statement exceeds 1 MiB."));
    }
    Ok(Some(csv.into_bytes()))
}

#[cfg(test)]
mod tests {
    use super::table;

    #[test]
    fn extracts_a_rectangular_pdf_table_and_rejects_inconsistent_columns() {
        let input = "Sample bank\nDate    Description     Amount     Balance\n2026-09-01   Sample salary     5000.00     5000.00\n";
        let csv = String::from_utf8(table(input).unwrap().unwrap()).unwrap();
        assert!(csv.contains("\"2026-09-01\",\"Sample salary\",\"5000.00\",\"5000.00\""));
        assert!(table(&format!("{input}2026-09-02   Broken row   -10.00"))
            .unwrap()
            .is_none());
    }
}
