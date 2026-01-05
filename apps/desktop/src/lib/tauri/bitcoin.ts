/**
 * Tauri IPC wrappers for Bitcoin (BDK) commands
 *
 * These functions wrap the Tauri invoke API for type-safe communication
 * with the Rust backend Bitcoin module.
 */

import { invoke } from "@tauri-apps/api/core";

// =============================================================================
// Types matching Rust backend
// =============================================================================

export type BitcoinNetwork = "mainnet" | "testnet" | "signet" | "regtest";

export type TransactionDirection = "received" | "sent" | "internal";

export type SyncStage = "connecting" | "scanning" | "updating" | "complete" | "failed";

export interface BitcoinBalance {
  /** Confirmed balance in satoshis */
  confirmed: number;
  /** Unconfirmed balance (pending transactions) in satoshis */
  unconfirmed: number;
  /** Immature balance (coinbase rewards not yet spendable) in satoshis */
  immature: number;
  /** Total trusted balance (confirmed + trusted pending) in satoshis */
  trusted_spendable: number;
}

export interface ConfirmationStatus {
  type: "confirmed" | "unconfirmed";
  block_height?: number;
  block_time?: number;
  confirmations?: number;
}

export interface BitcoinTransaction {
  /** Transaction ID (txid) */
  txid: string;
  /** Transaction direction */
  direction: TransactionDirection;
  /** Amount transferred in satoshis (positive for received, negative for sent) */
  amount_sats: number;
  /** Transaction fee in satoshis (only for sent transactions) */
  fee_sats: number | null;
  /** Confirmation status */
  status: ConfirmationStatus;
  /** Transaction timestamp (block time if confirmed, first seen if unconfirmed) */
  timestamp: number | null;
  /** Addresses involved */
  addresses: string[];
  /** Raw transaction size in bytes */
  size: number | null;
  /** Virtual size in vbytes (for fee calculation) */
  vsize: number | null;
}

export interface UtxoInfo {
  /** Transaction ID containing this UTXO */
  txid: string;
  /** Output index within the transaction */
  vout: number;
  /** Amount in satoshis */
  amount_sats: number;
  /** Address that owns this UTXO */
  address: string;
  /** Whether this UTXO is confirmed */
  is_confirmed: boolean;
  /** Block height if confirmed */
  block_height: number | null;
}

export interface SyncProgress {
  /** Current sync stage */
  stage: SyncStage;
  /** Progress percentage (0.0 - 100.0) */
  progress: number;
  /** Optional message describing current operation */
  message: string | null;
}

export interface FeeEstimate {
  /** Fee rate in satoshis per vbyte */
  sat_per_vbyte: number;
  /** Target confirmation blocks */
  target_blocks: number;
}

export interface SendTransactionResult {
  /** Transaction ID */
  txid: string;
  /** Raw signed transaction hex */
  tx_hex: string;
  /** Fee paid in satoshis */
  fee_sats: number | null;
  /** Virtual size in vbytes */
  vsize: number;
  /** Whether the transaction was broadcast */
  broadcast: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert satoshis to BTC
 */
export function satsToBtc(sats: number): number {
  return sats / 100_000_000;
}

/**
 * Convert BTC to satoshis
 */
export function btcToSats(btc: number): number {
  return Math.round(btc * 100_000_000);
}

/**
 * Format satoshis as BTC string with specified decimals
 */
export function formatBtc(sats: number, decimals: number = 8): string {
  return satsToBtc(sats).toFixed(decimals);
}

// =============================================================================
// Wallet Management
// =============================================================================

/**
 * Create a Bitcoin wallet from seed
 *
 * @param walletId - Unique identifier for the wallet
 * @param seed - 64-byte seed (from mnemonic)
 * @param account - BIP84 account index (default: 0)
 */
export async function createBitcoinWallet(
  walletId: string,
  seed: number[],
  account: number = 0
): Promise<string> {
  return invoke<string>("bitcoin_create_wallet", {
    walletId,
    seed,
    account,
  });
}

/**
 * Create a watch-only Bitcoin wallet from xpub
 *
 * @param walletId - Unique identifier for the wallet
 * @param xpub - Extended public key (xpub, zpub, etc.)
 */
export async function createBitcoinWatchWallet(
  walletId: string,
  xpub: string
): Promise<string> {
  return invoke<string>("bitcoin_create_watch_wallet", {
    walletId,
    xpub,
  });
}

/**
 * Check if a Bitcoin wallet exists
 */
export async function bitcoinWalletExists(walletId: string): Promise<boolean> {
  return invoke<boolean>("bitcoin_wallet_exists", { walletId });
}

/**
 * Initialize a Bitcoin wallet from the cached seed in WalletManager
 *
 * This should be called after creating or importing an HD wallet
 * that includes Bitcoin, to initialize the BDK wallet for syncing.
 *
 * @param walletId - Wallet ID from createHDWallet/importHDWallet
 * @param account - BIP84 account index (default: 0)
 */
export async function initBitcoinFromCachedSeed(
  walletId: string,
  account: number = 0
): Promise<string> {
  return invoke<string>("bitcoin_init_from_cached_seed", {
    walletId,
    account,
  });
}

// =============================================================================
// Synchronization
// =============================================================================

/**
 * Sync a Bitcoin wallet with the blockchain
 *
 * This will connect to Electrum servers and fetch the latest
 * transaction data for the wallet.
 */
export async function syncBitcoinWallet(walletId: string): Promise<SyncProgress> {
  return invoke<SyncProgress>("bitcoin_sync_wallet", { walletId });
}

// =============================================================================
// Balance & Transactions
// =============================================================================

/**
 * Get Bitcoin wallet balance
 */
export async function getBitcoinBalance(walletId: string): Promise<BitcoinBalance> {
  return invoke<BitcoinBalance>("bitcoin_get_balance", { walletId });
}

/**
 * Get Bitcoin transaction history
 */
export async function getBitcoinTransactions(
  walletId: string
): Promise<BitcoinTransaction[]> {
  return invoke<BitcoinTransaction[]>("bitcoin_get_transactions", { walletId });
}

/**
 * Get Bitcoin UTXOs
 */
export async function getBitcoinUtxos(walletId: string): Promise<UtxoInfo[]> {
  return invoke<UtxoInfo[]>("bitcoin_get_utxos", { walletId });
}

// =============================================================================
// Addresses
// =============================================================================

/**
 * Get a new Bitcoin receiving address
 */
export async function getBitcoinNewAddress(walletId: string): Promise<string> {
  return invoke<string>("bitcoin_get_new_address", { walletId });
}

// =============================================================================
// Fee Estimation
// =============================================================================

/**
 * Estimate fee for Bitcoin transaction
 *
 * @param targetBlocks - Target number of blocks for confirmation (default: 6)
 */
export async function estimateBitcoinFee(
  targetBlocks: number = 6
): Promise<FeeEstimate> {
  return invoke<FeeEstimate>("bitcoin_estimate_fee", { targetBlocks });
}

// =============================================================================
// Network Info
// =============================================================================

/**
 * Get current Bitcoin network
 */
export async function getBitcoinNetwork(): Promise<BitcoinNetwork> {
  return invoke<BitcoinNetwork>("bitcoin_get_network");
}

// =============================================================================
// Single Address Queries (for watch-only addresses)
// =============================================================================

/**
 * Get balance for a single Bitcoin address
 *
 * Use this for watch-only single addresses. Queries Electrum directly
 * without needing a BDK wallet.
 *
 * @param address - Bitcoin address (bc1..., 1..., 3...)
 */
export async function getBitcoinAddressBalance(
  address: string
): Promise<BitcoinBalance> {
  return invoke<BitcoinBalance>("bitcoin_get_address_balance", { address });
}

/**
 * Get transaction history for a single Bitcoin address
 *
 * Use this for watch-only single addresses. Queries Electrum directly
 * without needing a BDK wallet.
 *
 * @param address - Bitcoin address (bc1..., 1..., 3...)
 */
export async function getBitcoinAddressTransactions(
  address: string
): Promise<BitcoinTransaction[]> {
  return invoke<BitcoinTransaction[]>("bitcoin_get_address_transactions", {
    address,
  });
}

/**
 * Check if a string is a Bitcoin address (vs an xpub)
 */
export function isBitcoinAddress(input: string): boolean {
  return (
    input.startsWith("bc1") ||
    input.startsWith("tb1") ||
    input.startsWith("1") ||
    input.startsWith("3") ||
    input.startsWith("m") ||
    input.startsWith("n") ||
    input.startsWith("2")
  );
}

// =============================================================================
// Send Transaction
// =============================================================================

/**
 * Send Bitcoin to a recipient address
 *
 * Creates, signs, and broadcasts a Bitcoin transaction.
 * Only works with HD wallets that have signing capability.
 *
 * @param walletId - Wallet ID
 * @param recipientAddress - Bitcoin address to send to
 * @param amountSats - Amount to send in satoshis
 * @param feeRate - Fee rate in sat/vB
 * @param broadcast - Whether to broadcast the transaction (default: true)
 */
export async function sendBitcoinTransaction(
  walletId: string,
  recipientAddress: string,
  amountSats: number,
  feeRate: number,
  broadcast: boolean = true
): Promise<SendTransactionResult> {
  return invoke<SendTransactionResult>("bitcoin_send_transaction", {
    walletId,
    recipientAddress,
    amountSats,
    feeRate,
    broadcast,
  });
}

/**
 * Validate a Bitcoin address for the current network
 *
 * @param address - Bitcoin address to validate
 * @returns true if valid for current network
 */
export async function validateBitcoinAddress(address: string): Promise<boolean> {
  return invoke<boolean>("bitcoin_validate_address", { address });
}
