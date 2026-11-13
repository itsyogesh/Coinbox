use crate::{
    csv::{write_csv_row, MAX_CSV_BYTES},
    invalid, Result,
};
use std::{
    fs,
    io::Write,
    path::Path,
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
    let mut input = tempfile::NamedTempFile::new()?;
    input.write_all(bytes)?;
    let work = tempfile::tempdir()?;
    let info = work.path().join("info.txt");
    run("pdfinfo", &[input.path()], Some(&info))?;
    let info = fs::read_to_string(info)?;
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
    let layout = work.path().join("layout.txt");
    run(
        "pdftotext",
        &[Path::new("-layout"), input.path(), &layout],
        None,
    )?;
    let text = read_text(&layout)?;
    if let Some(csv) = table(&text)? {
        return Ok(Some(csv));
    }
    let mut ocr = String::new();
    for page in 1..=pages {
        let page = page.to_string();
        let raster = work.path().join("raster");
        run(
            "pdftoppm",
            &[
                Path::new("-f"),
                Path::new(&page),
                Path::new("-l"),
                Path::new(&page),
                Path::new("-scale-to"),
                Path::new("2200"),
                Path::new("-singlefile"),
                Path::new("-png"),
                input.path(),
                &raster,
            ],
            None,
        )?;
        let scanned = work.path().join("ocr.txt");
        run(
            "tesseract",
            &[
                &raster.with_extension("png"),
                Path::new("stdout"),
                Path::new("--psm"),
                Path::new("6"),
                Path::new("-c"),
                Path::new("preserve_interword_spaces=1"),
            ],
            Some(&scanned),
        )?;
        ocr.push_str(&read_text(&scanned)?);
        ocr.push('\n');
    }
    table(&ocr)?.map(Some).ok_or_else(|| {
        invalid("No supported transaction table was found. Export the statement as CSV or Excel.")
    })
}

fn read_text(path: &Path) -> Result<String> {
    if fs::metadata(path)?.len() > MAX_CSV_BYTES as u64 {
        return Err(invalid("The extracted statement text exceeds 1 MiB."));
    }
    Ok(fs::read_to_string(path)?)
}

fn run(command: &str, args: &[&Path], stdout: Option<&Path>) -> Result<()> {
    let output = match stdout {
        Some(path) => Stdio::from(fs::File::create(path)?),
        None => Stdio::null(),
    };
    let mut child = Command::new(command)
        .args(args)
        .stdin(Stdio::null())
        .stdout(output)
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                invalid(format!("Install {command} to import PDF statements."))
            } else {
                error.into()
            }
        })?;
    let deadline = Instant::now() + Duration::from_secs(12);
    loop {
        if let Some(status) = child.try_wait()? {
            return if status.success() {
                Ok(())
            } else {
                Err(invalid(format!("{command} could not read this PDF.")))
            };
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(invalid(format!("{command} timed out reading this PDF.")));
        }
        thread::sleep(Duration::from_millis(25));
    }
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
