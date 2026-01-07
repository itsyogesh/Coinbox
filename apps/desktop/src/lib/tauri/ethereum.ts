/**
 * Ethereum Tauri IPC wrappers
 *
 * These functions call Rust backend for signing operations.
 * Balance/transaction fetching is done via Viem in the frontend.
 */

import { invoke } from "@tauri-apps/api/core";

// ============================================================================
// Types
// ============================================================================

export interface MessageSignature {
  /** Full signature in hex (65 bytes: r + s + v) */
  signature: string;
  /** Recovery ID (27 or 28) */
  v: number;
  /** R component */
  r: string;
  /** S component */
  s: string;
}

// ============================================================================
// Signing Commands
// ============================================================================

/**
 * Sign an Ethereum personal message (EIP-191)
 *
 * This prefixes the message with "\x19Ethereum Signed Message:\n{length}"
 * before hashing and signing.
 */
export async function signEthereumMessage(
  walletId: string,
  message: string,
  accountIndex: number = 0,
  addressIndex: number = 0
): Promise<MessageSignature> {
  return invoke<MessageSignature>("ethereum_sign_message", {
    walletId,
    message,
    accountIndex,
    addressIndex,
  });
}

/**
 * Sign typed data (EIP-712)
 *
 * The frontend computes the EIP-712 hash, which is signed here.
 *
 * @param hash - Pre-computed EIP-712 hash (32 bytes hex)
 */
export async function signEthereumTypedData(
  walletId: string,
  hash: string,
  accountIndex: number = 0,
  addressIndex: number = 0
): Promise<MessageSignature> {
  return invoke<MessageSignature>("ethereum_sign_typed_data", {
    walletId,
    hash,
    accountIndex,
    addressIndex,
  });
}

/**
 * Sign a transaction hash
 *
 * The frontend (Viem) builds and serializes the transaction, computes
 * its hash, and we sign the hash here.
 *
 * @param hash - Transaction hash to sign (32 bytes hex)
 */
export async function signEthereumTransactionHash(
  walletId: string,
  hash: string,
  accountIndex: number = 0,
  addressIndex: number = 0
): Promise<MessageSignature> {
  return invoke<MessageSignature>("ethereum_sign_transaction_hash", {
    walletId,
    hash,
    accountIndex,
    addressIndex,
  });
}

/**
 * Get the Ethereum address for a wallet
 *
 * Returns the address derived from the wallet's seed using BIP44.
 */
export async function getEthereumAddress(
  walletId: string,
  accountIndex: number = 0,
  addressIndex: number = 0
): Promise<string> {
  return invoke<string>("ethereum_get_address", {
    walletId,
    accountIndex,
    addressIndex,
  });
}

/**
 * Validate an Ethereum address
 *
 * Checks format and EIP-55 checksum (if mixed case).
 */
export async function validateEthereumAddress(
  address: string
): Promise<boolean> {
  return invoke<boolean>("ethereum_validate_address", { address });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an address looks like an Ethereum address (basic format check)
 */
export function isEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
