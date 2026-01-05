/**
 * Store Sync - TypeScript wrappers for SQLite persistence commands
 *
 * These functions bridge the frontend Zustand stores with SQLite backend.
 */

import { invoke } from "@tauri-apps/api/core";

// =============================================================================
// Types
// =============================================================================

export interface Balance {
  wallet_id: string;
  chain: string;
  asset: string;
  confirmed: string;
  unconfirmed: string;
  last_synced: string | null;
}

export interface Price {
  asset: string;
  price_usd: number;
  last_updated: string;
}

export interface CachedTransaction {
  id: string;
  wallet_id: string;
  chain: string;
  tx_hash: string;
  block_number: number | null;
  timestamp: string;
  tx_type: string; // "sent", "received", "internal"
  amount: string;
  fee: string | null;
  asset_symbol: string;
  from_address: string;
  to_address: string | null;
  raw_data: string | null;
}

// =============================================================================
// Balance Commands
// =============================================================================

/**
 * Load all balances from SQLite
 */
export async function loadBalances(): Promise<Balance[]> {
  return invoke<Balance[]>("load_balances");
}

/**
 * Load balances for a specific wallet
 */
export async function loadWalletBalances(walletId: string): Promise<Balance[]> {
  return invoke<Balance[]>("load_wallet_balances", { walletId });
}

/**
 * Save or update a balance
 */
export async function saveBalance(balance: Balance): Promise<void> {
  return invoke("save_balance", { balance });
}

/**
 * Delete all balances for a wallet
 */
export async function deleteWalletBalances(walletId: string): Promise<void> {
  return invoke("delete_wallet_balances", { walletId });
}

// =============================================================================
// Price Commands
// =============================================================================

/**
 * Load all prices from SQLite
 */
export async function loadPrices(): Promise<Price[]> {
  return invoke<Price[]>("load_prices");
}

/**
 * Load price for a specific asset
 */
export async function loadPrice(asset: string): Promise<Price | null> {
  return invoke<Price | null>("load_price", { asset });
}

/**
 * Save or update a price
 */
export async function savePrice(price: Price): Promise<void> {
  return invoke("save_price", { price });
}

/**
 * Save multiple prices at once
 */
export async function savePrices(prices: Price[]): Promise<void> {
  return invoke("save_prices", { prices });
}

// =============================================================================
// Transaction Commands
// =============================================================================

/**
 * Load transactions for a specific wallet
 */
export async function loadCachedTransactions(
  walletId: string
): Promise<CachedTransaction[]> {
  return invoke<CachedTransaction[]>("load_cached_transactions", { walletId });
}

/**
 * Load all transactions (for Transactions page)
 */
export async function loadAllTransactions(): Promise<CachedTransaction[]> {
  return invoke<CachedTransaction[]>("load_all_transactions");
}

/**
 * Save a single transaction
 */
export async function saveTransaction(tx: CachedTransaction): Promise<void> {
  return invoke("save_transaction", { tx });
}

/**
 * Save multiple transactions at once (bulk upsert)
 */
export async function saveTransactions(
  transactions: CachedTransaction[]
): Promise<void> {
  return invoke("save_transactions", { transactions });
}

/**
 * Delete all transactions for a wallet
 */
export async function deleteWalletTransactions(
  walletId: string
): Promise<void> {
  return invoke("delete_wallet_transactions", { walletId });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert Balance to a key for use in Record/Map
 */
export function balanceKey(balance: Balance): string {
  return `${balance.wallet_id}:${balance.chain}:${balance.asset}`;
}

/**
 * Parse balance key back to components
 */
export function parseBalanceKey(key: string): {
  walletId: string;
  chain: string;
  asset: string;
} {
  const parts = key.split(":");
  return {
    walletId: parts[0] ?? "",
    chain: parts[1] ?? "",
    asset: parts[2] ?? "",
  };
}
