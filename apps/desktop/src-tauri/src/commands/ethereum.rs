//! Ethereum signing commands
//!
//! This module provides Tauri commands for Ethereum transaction signing.
//! All signing happens in Rust - private keys never leave the backend.
//!
//! The frontend uses Viem for RPC calls (balances, gas estimation, etc.)
//! and routes signing requests to these commands.

use k256::ecdsa::{Signature, SigningKey};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use tauri::State;

use crate::wallet::chains::secp256k1::derive_key_from_seed;
use crate::wallet::core::WalletManager;

/// Ethereum transaction request from frontend
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EthereumTxRequest {
    /// Chain ID (e.g., 1 for mainnet, 42161 for Arbitrum)
    pub chain_id: u64,
    /// Nonce
    pub nonce: u64,
    /// Gas price in wei (for legacy transactions)
    #[serde(default)]
    pub gas_price: Option<String>,
    /// Max fee per gas in wei (for EIP-1559)
    #[serde(default)]
    pub max_fee_per_gas: Option<String>,
    /// Max priority fee per gas in wei (for EIP-1559)
    #[serde(default)]
    pub max_priority_fee_per_gas: Option<String>,
    /// Gas limit
    pub gas: u64,
    /// Recipient address (None for contract deployment)
    #[serde(default)]
    pub to: Option<String>,
    /// Value in wei
    pub value: String,
    /// Transaction data (hex encoded)
    #[serde(default)]
    pub data: Option<String>,
}

/// Signed transaction result
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedTransaction {
    /// The signed transaction as raw hex (ready to broadcast)
    pub raw_transaction: String,
    /// The transaction hash
    pub hash: String,
}

/// Message signature result
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageSignature {
    /// The signature in hex format (65 bytes: r + s + v)
    pub signature: String,
    /// Recovery ID (v)
    pub v: u8,
    /// R component
    pub r: String,
    /// S component
    pub s: String,
}

/// Wallet state wrapper for Tauri
pub struct EthereumState {
    pub wallet_manager: WalletManager,
}

impl EthereumState {
    pub fn new(wallet_manager: WalletManager) -> Self {
        Self { wallet_manager }
    }
}

/// Get the Ethereum private key for a wallet
fn get_ethereum_private_key(
    wallet_manager: &WalletManager,
    wallet_id: &str,
    account_index: u32,
    address_index: u32,
) -> Result<SigningKey, String> {
    // Get the seed from storage
    let storage = wallet_manager.storage();
    let seed = storage
        .get_seed(wallet_id)
        .map_err(|e| format!("Failed to get seed: {}", e))?;

    // Derive the Ethereum key using BIP44 path
    // m/44'/60'/account'/0/index
    let path = format!("m/44'/60'/{}'/0/{}", account_index, address_index);
    let derived = derive_key_from_seed(&seed, &path)
        .map_err(|e| format!("Failed to derive key: {}", e))?;

    // Convert to k256 SigningKey
    let private_bytes = derived.private_key().to_bytes();
    SigningKey::from_bytes((&private_bytes).into())
        .map_err(|e| format!("Failed to create signing key: {}", e))
}

/// Sign an Ethereum personal message (EIP-191)
///
/// This prepends "\x19Ethereum Signed Message:\n{length}" to the message
/// before hashing and signing.
#[tauri::command]
pub async fn ethereum_sign_message(
    state: State<'_, EthereumState>,
    wallet_id: String,
    message: String,
    account_index: Option<u32>,
    address_index: Option<u32>,
) -> Result<MessageSignature, String> {
    let account_idx = account_index.unwrap_or(0);
    let address_idx = address_index.unwrap_or(0);

    tracing::info!(
        "Signing message for wallet {} (account {}, address {})",
        wallet_id,
        account_idx,
        address_idx
    );

    // Get the signing key
    let signing_key = get_ethereum_private_key(
        &state.wallet_manager,
        &wallet_id,
        account_idx,
        address_idx,
    )?;

    // Create the EIP-191 prefixed message
    let prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    let prefixed_message = [prefix.as_bytes(), message.as_bytes()].concat();

    // Hash with Keccak256
    let mut hasher = Keccak256::new();
    hasher.update(&prefixed_message);
    let hash = hasher.finalize();

    // Sign the hash
    let (signature, recovery_id): (Signature, _) = signing_key
        .sign_prehash_recoverable(&hash)
        .map_err(|e| format!("Failed to sign: {}", e))?;

    let r = signature.r();
    let s = signature.s();
    let v = recovery_id.to_byte() + 27; // Ethereum uses 27/28 for v

    // Combine into 65-byte signature
    let mut sig_bytes = [0u8; 65];
    sig_bytes[0..32].copy_from_slice(&r.to_bytes());
    sig_bytes[32..64].copy_from_slice(&s.to_bytes());
    sig_bytes[64] = v;

    Ok(MessageSignature {
        signature: format!("0x{}", hex::encode(sig_bytes)),
        v,
        r: format!("0x{}", hex::encode(r.to_bytes())),
        s: format!("0x{}", hex::encode(s.to_bytes())),
    })
}

/// Sign typed data (EIP-712)
///
/// The frontend should compute the EIP-712 hash and pass it here.
#[tauri::command]
pub async fn ethereum_sign_typed_data(
    state: State<'_, EthereumState>,
    wallet_id: String,
    hash: String, // Pre-computed EIP-712 hash from frontend
    account_index: Option<u32>,
    address_index: Option<u32>,
) -> Result<MessageSignature, String> {
    let account_idx = account_index.unwrap_or(0);
    let address_idx = address_index.unwrap_or(0);

    tracing::info!(
        "Signing typed data for wallet {} (account {}, address {})",
        wallet_id,
        account_idx,
        address_idx
    );

    // Get the signing key
    let signing_key = get_ethereum_private_key(
        &state.wallet_manager,
        &wallet_id,
        account_idx,
        address_idx,
    )?;

    // Parse the hash (should be 32 bytes)
    let hash_bytes = hex::decode(hash.trim_start_matches("0x"))
        .map_err(|e| format!("Invalid hash: {}", e))?;

    if hash_bytes.len() != 32 {
        return Err("Hash must be 32 bytes".to_string());
    }

    let hash_array: [u8; 32] = hash_bytes
        .try_into()
        .map_err(|_| "Failed to convert hash")?;

    // Sign the hash
    let (signature, recovery_id): (Signature, _) = signing_key
        .sign_prehash_recoverable(&hash_array)
        .map_err(|e| format!("Failed to sign: {}", e))?;

    let r = signature.r();
    let s = signature.s();
    let v = recovery_id.to_byte() + 27;

    let mut sig_bytes = [0u8; 65];
    sig_bytes[0..32].copy_from_slice(&r.to_bytes());
    sig_bytes[32..64].copy_from_slice(&s.to_bytes());
    sig_bytes[64] = v;

    Ok(MessageSignature {
        signature: format!("0x{}", hex::encode(sig_bytes)),
        v,
        r: format!("0x{}", hex::encode(r.to_bytes())),
        s: format!("0x{}", hex::encode(s.to_bytes())),
    })
}

/// Sign a raw transaction hash
///
/// The frontend (Viem) builds and serializes the transaction, then computes
/// the hash. We sign the hash here and return the signature components.
#[tauri::command]
pub async fn ethereum_sign_transaction_hash(
    state: State<'_, EthereumState>,
    wallet_id: String,
    hash: String, // Transaction hash to sign
    account_index: Option<u32>,
    address_index: Option<u32>,
) -> Result<MessageSignature, String> {
    let account_idx = account_index.unwrap_or(0);
    let address_idx = address_index.unwrap_or(0);

    tracing::info!(
        "Signing transaction hash for wallet {} (account {}, address {})",
        wallet_id,
        account_idx,
        address_idx
    );

    // Get the signing key
    let signing_key = get_ethereum_private_key(
        &state.wallet_manager,
        &wallet_id,
        account_idx,
        address_idx,
    )?;

    // Parse the hash
    let hash_bytes = hex::decode(hash.trim_start_matches("0x"))
        .map_err(|e| format!("Invalid hash: {}", e))?;

    if hash_bytes.len() != 32 {
        return Err("Hash must be 32 bytes".to_string());
    }

    let hash_array: [u8; 32] = hash_bytes
        .try_into()
        .map_err(|_| "Failed to convert hash")?;

    // Sign
    let (signature, recovery_id): (Signature, _) = signing_key
        .sign_prehash_recoverable(&hash_array)
        .map_err(|e| format!("Failed to sign: {}", e))?;

    let r = signature.r();
    let s = signature.s();
    let v = recovery_id.to_byte() + 27;

    let mut sig_bytes = [0u8; 65];
    sig_bytes[0..32].copy_from_slice(&r.to_bytes());
    sig_bytes[32..64].copy_from_slice(&s.to_bytes());
    sig_bytes[64] = v;

    Ok(MessageSignature {
        signature: format!("0x{}", hex::encode(sig_bytes)),
        v,
        r: format!("0x{}", hex::encode(r.to_bytes())),
        s: format!("0x{}", hex::encode(s.to_bytes())),
    })
}

/// Get the Ethereum address for a wallet
///
/// Returns the address derived from the wallet's seed.
#[tauri::command]
pub async fn ethereum_get_address(
    state: State<'_, EthereumState>,
    wallet_id: String,
    account_index: Option<u32>,
    address_index: Option<u32>,
) -> Result<String, String> {
    let account_idx = account_index.unwrap_or(0);
    let address_idx = address_index.unwrap_or(0);

    // Get the signing key
    let signing_key = get_ethereum_private_key(
        &state.wallet_manager,
        &wallet_id,
        account_idx,
        address_idx,
    )?;

    // Get the public key
    let verifying_key = signing_key.verifying_key();
    let public_key_bytes = verifying_key.to_encoded_point(false);
    let public_key_uncompressed = &public_key_bytes.as_bytes()[1..]; // Skip the 0x04 prefix

    // Hash with Keccak256 and take last 20 bytes
    let mut hasher = Keccak256::new();
    hasher.update(public_key_uncompressed);
    let hash = hasher.finalize();
    let address_bytes = &hash[12..32];

    // Convert to checksummed address
    let address_hex = hex::encode(address_bytes);
    let checksummed = to_checksum_address(&address_hex);

    Ok(checksummed)
}

/// Convert address to EIP-55 checksum format
fn to_checksum_address(address: &str) -> String {
    let address_lower = address.to_lowercase();

    // Hash the lowercase address
    let mut hasher = Keccak256::new();
    hasher.update(address_lower.as_bytes());
    let hash = hasher.finalize();
    let hash_hex = hex::encode(hash);

    // Apply checksum
    let mut result = String::with_capacity(42);
    result.push_str("0x");

    for (i, c) in address_lower.chars().enumerate() {
        if c.is_ascii_hexdigit() && !c.is_ascii_digit() {
            let hash_char = hash_hex.chars().nth(i).unwrap();
            if hash_char.to_digit(16).unwrap() >= 8 {
                result.push(c.to_ascii_uppercase());
            } else {
                result.push(c);
            }
        } else {
            result.push(c);
        }
    }

    result
}

/// Validate an Ethereum address
#[tauri::command]
pub async fn ethereum_validate_address(address: String) -> Result<bool, String> {
    // Basic format check
    if !address.starts_with("0x") || address.len() != 42 {
        return Ok(false);
    }

    // Check if it's valid hex
    let addr_bytes = hex::decode(&address[2..]);
    if addr_bytes.is_err() {
        return Ok(false);
    }

    // If mixed case, verify checksum
    let addr_without_prefix = &address[2..];
    if addr_without_prefix != addr_without_prefix.to_lowercase()
        && addr_without_prefix != addr_without_prefix.to_uppercase()
    {
        let checksummed = to_checksum_address(addr_without_prefix);
        return Ok(checksummed == address);
    }

    Ok(true)
}
