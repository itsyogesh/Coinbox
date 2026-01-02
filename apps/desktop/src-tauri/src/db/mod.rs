mod schema;

use crate::{Error, Result};
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&path)?;

        // Enable WAL mode for better concurrent access
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn with_encryption(path: PathBuf, password: &str) -> Result<Self> {
        let conn = Connection::open(&path)?;

        // Set encryption key for SQLCipher
        conn.execute_batch(&format!("PRAGMA key = '{}';", password))?;

        // Enable WAL mode
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn execute<F, T>(&self, f: F) -> Result<T>
    where
        F: FnOnce(&Connection) -> Result<T>,
    {
        let conn = self.conn.lock().map_err(|e| {
            Error::Database(rusqlite::Error::ExecuteReturnedResults)
        })?;
        f(&conn)
    }

    pub fn run_migrations(&self) -> Result<()> {
        self.execute(|conn| {
            schema::run_migrations(conn)?;
            Ok(())
        })
    }
}

pub async fn init_database(app: &tauri::AppHandle) -> Result<()> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| Error::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not find app data directory",
        )))?;

    // Create app directory if it doesn't exist
    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("coinbox.db");

    tracing::info!("Initializing database at {:?}", db_path);

    // For now, use unencrypted database. User can enable encryption in settings.
    let db = Database::new(db_path)?;

    // Run migrations
    db.run_migrations()?;

    // Store database in app state
    app.manage(db);

    tracing::info!("Database initialized successfully");

    Ok(())
}
