/**
 * Tauri IPC wrappers for wallet commands
 *
 * These functions wrap the Tauri invoke API for type-safe communication
 * with the Rust backend wallet module.
 */

import { invoke } from "@tauri-apps/api/core";

// =============================================================================
// Types matching Rust backend
// =============================================================================

export type ChainFamily = "secp256k1" | "ed25519" | "sr25519";

export interface ChainInfo {
  id: string;
  name: string;
  symbol: string;
  family: ChainFamily;
  coin_type: number;
  is_testnet: boolean;
  icon_name: string;
}

export interface DerivedAddress {
  chain: string;
  chain_family: ChainFamily;
  address: string;
  derivation_path: string;
  public_key: string; // hex encoded
}

export interface CreateHDWalletResponse {
  wallet_id: string;
  mnemonic: string;
  addresses: DerivedAddress[];
}

export interface ValidateMnemonicResponse {
  is_valid: boolean;
  word_count: number;
  error: string | null;
}

// =============================================================================
// Chain Information
// =============================================================================

/**
 * Get all supported blockchain chains
 */
export async function getSupportedChains(): Promise<ChainInfo[]> {
  return invoke<ChainInfo[]>("get_supported_chains");
}

/**
 * Get only mainnet chains (excludes testnets)
 */
export async function getMainnetChains(): Promise<ChainInfo[]> {
  return invoke<ChainInfo[]>("get_mainnet_chains");
}

/**
 * Validate an address for a specific chain
 */
export async function validateChainAddress(
  chainId: string,
  address: string
): Promise<boolean> {
  return invoke<boolean>("validate_chain_address", {
    chainId,
    address,
  });
}

// =============================================================================
// Mnemonic Operations
// =============================================================================

/**
 * Generate a new random mnemonic phrase
 * @param wordCount - Number of words (12 or 24)
 */
export async function generateMnemonic(wordCount: number = 12): Promise<string> {
  return invoke<string>("generate_mnemonic", { wordCount });
}

/**
 * Validate an existing mnemonic phrase
 */
export async function validateMnemonic(
  phrase: string
): Promise<ValidateMnemonicResponse> {
  return invoke<ValidateMnemonicResponse>("validate_mnemonic", { phrase });
}

// =============================================================================
// Wallet Creation
// =============================================================================

/**
 * Create a new HD wallet with generated mnemonic
 *
 * @param name - Display name for the wallet
 * @param chains - Chain IDs to derive addresses for
 * @param password - Password for encrypting the wallet
 * @param wordCount - Mnemonic word count (12 or 24)
 * @returns Wallet ID, mnemonic (for backup), and derived addresses
 *
 * @security The mnemonic is returned ONCE for backup purposes.
 * Display it for user to write down, then verify backup before proceeding.
 */
export async function createHDWallet(
  name: string,
  chains: string[],
  password: string,
  wordCount: number = 12
): Promise<CreateHDWalletResponse> {
  return invoke<CreateHDWalletResponse>("create_hd_wallet", {
    name,
    chains,
    password,
    wordCount,
  });
}

/**
 * Import an existing HD wallet from mnemonic
 */
export async function importHDWallet(
  name: string,
  mnemonic: string,
  chains: string[],
  password: string
): Promise<CreateHDWalletResponse> {
  return invoke<CreateHDWalletResponse>("import_hd_wallet", {
    name,
    mnemonic,
    chains,
    password,
  });
}

// =============================================================================
// Address Derivation
// =============================================================================

/**
 * Derive a new address for an existing wallet
 */
export async function deriveWalletAddress(
  walletId: string,
  chainId: string,
  account: number = 0,
  index: number = 0
): Promise<DerivedAddress> {
  return invoke<DerivedAddress>("derive_wallet_address", {
    walletId,
    chainId,
    account,
    index,
  });
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Check if the wallet session is currently unlocked
 */
export async function isWalletUnlocked(): Promise<boolean> {
  return invoke<boolean>("is_wallet_unlocked");
}

/**
 * Lock the wallet (clear cached secrets from memory)
 */
export async function lockWallet(): Promise<void> {
  return invoke<void>("lock_wallet");
}

/**
 * Unlock a wallet with password
 */
export async function unlockWallet(
  walletId: string,
  password: string
): Promise<void> {
  return invoke<void>("unlock_wallet", { walletId, password });
}
