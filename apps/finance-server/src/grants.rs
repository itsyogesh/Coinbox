use crate::ServerError;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{self, Write},
    path::PathBuf,
};
use subtle::ConstantTimeEq;

#[derive(Clone, Copy, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Scope {
    Device,
    Assistant,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Grant {
    pub id: String,
    pub book: String,
    name: String,
    pub scope: Scope,
}

#[derive(Clone, Deserialize, Serialize)]
struct StoredGrant {
    grant: Grant,
    hash: [u8; 32],
}

pub struct Grants {
    path: PathBuf,
    entries: Vec<StoredGrant>,
}

impl Grants {
    pub fn open(path: PathBuf) -> Result<Self, ServerError> {
        let entries = match fs::read(&path) {
            Ok(bytes) => serde_json::from_slice(&bytes)?,
            Err(error) if error.kind() == io::ErrorKind::NotFound => Vec::new(),
            Err(error) => return Err(error.into()),
        };
        Ok(Self { path, entries })
    }

    pub fn list(&self) -> Vec<&Grant> {
        self.entries.iter().map(|entry| &entry.grant).collect()
    }

    pub fn find(&self, token: &str) -> Option<&Grant> {
        let hash = digest(token);
        self.entries
            .iter()
            .find(|entry| bool::from(entry.hash.ct_eq(&hash)))
            .map(|entry| &entry.grant)
    }

    pub fn create(
        &mut self,
        book: String,
        name: String,
        scope: Scope,
    ) -> Result<(Grant, String), ServerError> {
        let mut random = [0u8; 48];
        getrandom::fill(&mut random).map_err(|error| io::Error::other(error.to_string()))?;
        let grant = Grant {
            id: hex::encode(&random[..16]),
            book,
            name,
            scope,
        };
        let token = hex::encode(&random[16..]);
        let mut entries = self.entries.clone();
        entries.push(StoredGrant {
            grant: grant.clone(),
            hash: digest(&token),
        });
        self.replace(entries)?;
        Ok((grant, token))
    }

    pub fn revoke(&mut self, id: &str) -> Result<(), ServerError> {
        let entries = self
            .entries
            .iter()
            .filter(|entry| entry.grant.id != id)
            .cloned()
            .collect();
        self.replace(entries)
    }

    fn replace(&mut self, entries: Vec<StoredGrant>) -> Result<(), ServerError> {
        let mut temp =
            tempfile::NamedTempFile::new_in(self.path.parent().ok_or("Invalid grants path.")?)?;
        temp.write_all(&serde_json::to_vec(&entries)?)?;
        temp.as_file().sync_all()?;
        temp.persist(&self.path)?;
        self.entries = entries;
        Ok(())
    }
}

pub fn valid_token(token: &str) -> bool {
    token.len() == 64
        && token
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

pub fn digest(token: &str) -> [u8; 32] {
    Sha256::digest(token).into()
}

pub fn matches(expected: &[u8; 32], token: &str) -> bool {
    expected.ct_eq(&digest(token)).into()
}
