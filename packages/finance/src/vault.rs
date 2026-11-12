use crate::{invalid, Result};
use rusqlite::{Connection, OpenFlags, TransactionBehavior};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::Duration,
};

const APPLICATION_ID: i64 = 1128416854;
const VERSION: i64 = 1;
pub const MAX_BACKUP_BYTES: usize = 32 * 1024 * 1024;

pub struct Vault {
    pub(crate) conn: Connection,
    path: PathBuf,
}

impl Vault {
    pub fn create(path: &Path, passphrase: &str) -> Result<Self> {
        if passphrase.chars().count() < 14 {
            return Err(invalid(
                "Use a finance passphrase of at least 14 characters.",
            ));
        }
        let temp = temp_file(path)?;
        {
            let mut conn = keyed_connection(temp.path(), passphrase)?;
            let tx = conn.transaction()?;
            tx.execute_batch(include_str!("schema.sql"))?;
            tx.commit()?;
            verify(&conn)?;
        }
        temp.as_file().sync_all()?;
        install(temp, path)?;
        Self::open(path, passphrase)
    }

    pub fn open(path: &Path, passphrase: &str) -> Result<Self> {
        let conn = keyed_connection(path, passphrase)?;
        verify(&conn)?;
        Ok(Self {
            conn,
            path: path.to_owned(),
        })
    }

    pub fn backup(&mut self) -> Result<Vec<u8>> {
        // DELETE journaling keeps committed data in the main file. An immediate
        // transaction prevents writes from other connections during the copy.
        let tx = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        if fs::metadata(&self.path)?.len() > MAX_BACKUP_BYTES as u64 {
            return Err(invalid(
                "This vault exceeds the in-app backup limit of 32 MiB.",
            ));
        }
        let bytes = fs::read(&self.path)?;
        tx.commit()?;
        Ok(bytes)
    }

    pub fn restore(path: &Path, passphrase: &str, bytes: &[u8]) -> Result<Self> {
        if bytes.is_empty() || bytes.len() > MAX_BACKUP_BYTES {
            return Err(invalid(
                "Choose a Coinbox encrypted backup of up to 32 MiB.",
            ));
        }
        let mut temp = temp_file(path)?;
        temp.write_all(bytes)?;
        temp.as_file().sync_all()?;
        {
            let conn = keyed_connection(temp.path(), passphrase)?;
            verify(&conn)?;
            let mut integrity = conn.prepare("PRAGMA integrity_check")?;
            let results = integrity
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            if results != ["ok"] || conn.prepare("PRAGMA foreign_key_check")?.exists([])? {
                return Err(invalid("The backup failed its integrity check."));
            }
        }
        install(temp, path)?;
        Self::open(path, passphrase)
    }
}

fn temp_file(path: &Path) -> Result<tempfile::NamedTempFile> {
    let parent = path
        .parent()
        .filter(|dir| !dir.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;
    Ok(tempfile::Builder::new()
        .prefix(".finance-vault-")
        .tempfile_in(parent)?)
}

fn install(temp: tempfile::NamedTempFile, path: &Path) -> Result<()> {
    // Publish the initialized file atomically without replacing an existing vault.
    match fs::hard_link(temp.path(), path) {
        Ok(()) => {
            #[cfg(unix)]
            fs::File::open(
                path.parent()
                    .filter(|dir| !dir.as_os_str().is_empty())
                    .unwrap_or(Path::new(".")),
            )?
            .sync_all()?;
            Ok(())
        }
        Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists => {
            Err(invalid("A finance vault already exists in this profile."))
        }
        Err(err) => Err(err.into()),
    }
}

fn keyed_connection(path: &Path, passphrase: &str) -> Result<Connection> {
    if passphrase.is_empty() || passphrase.as_bytes().len() > 1024 || passphrase.contains('\0') {
        return Err(invalid("Enter a valid finance passphrase."));
    }
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)?;
    // Use SQLCipher's key API directly. The passphrase never becomes SQL text.
    let rc = unsafe {
        rusqlite::ffi::sqlite3_key(
            conn.handle(),
            passphrase.as_ptr().cast(),
            passphrase.len() as i32,
        )
    };
    if rc != rusqlite::ffi::SQLITE_OK
        || conn
            .query_row("PRAGMA cipher_version", [], |row| row.get::<_, String>(0))
            .is_err()
    {
        return Err(invalid(
            "SQLCipher is unavailable. Finance data remains locked.",
        ));
    }
    conn.busy_timeout(Duration::from_secs(5))?;
    // Authenticate the first page before setting writable pragmas.
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |row| {
        row.get::<_, i64>(0)
    })
    .map_err(|_| invalid("The passphrase is incorrect or the vault cannot be read."))?;
    conn.pragma_update(None, "temp_store", "MEMORY")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    let journal: String = conn.query_row("PRAGMA journal_mode = DELETE", [], |row| row.get(0))?;
    if !journal.eq_ignore_ascii_case("delete") {
        return Err(invalid("The finance vault requires DELETE journaling."));
    }
    conn.pragma_update(None, "synchronous", "FULL")?;
    Ok(conn)
}

fn verify(conn: &Connection) -> Result<()> {
    let id: i64 = conn.pragma_query_value(None, "application_id", |row| row.get(0))?;
    let version: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    if id != APPLICATION_ID || version != VERSION {
        return Err(invalid(
            "This file is not a supported Coinbox finance vault.",
        ));
    }
    Ok(())
}
