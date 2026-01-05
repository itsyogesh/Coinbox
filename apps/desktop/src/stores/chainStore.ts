/**
 * Chain Store - Unified state management for all chain data
 *
 * This store manages balances, transactions, and prices across all chains.
 * Data is persisted to SQLite and loaded on app start for instant UI.
 *
 * Flow:
 * 1. App start → hydrate() loads from SQLite → instant UI
 * 2. syncWallet() → fetch from network → save to SQLite → update state
 * 3. All pages read from this store (Dashboard, Transactions, Wallet Details)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  Balance,
  Price,
  CachedTransaction,
  loadBalances,
  loadPrices,
  loadAllTransactions,
  saveBalance,
  savePrices,
  saveTransactions,
  balanceKey,
} from "@/lib/tauri/storeSync";
import {
  getBitcoinAddressBalance,
  getBitcoinAddressTransactions,
  syncBitcoinWallet,
  getBitcoinBalance,
  getBitcoinTransactions,
  isBitcoinAddress,
  BitcoinBalance,
  BitcoinTransaction,
} from "@/lib/tauri/bitcoin";
import { useWalletStore } from "./walletStore";

// =============================================================================
// Types
// =============================================================================

interface SyncStatus {
  isSyncing: boolean;
  lastSynced: string | null;
  error: string | null;
}

interface ChainStoreState {
  // Data (keyed for fast lookup)
  balances: Record<string, Balance>; // key: wallet_id:chain:asset
  transactions: Record<string, CachedTransaction[]>; // key: wallet_id
  prices: Record<string, Price>; // key: asset

  // Status
  isHydrated: boolean;
  syncStatus: Record<string, SyncStatus>; // key: wallet_id

  // Actions
  hydrate: () => Promise<void>;
  syncWallet: (walletId: string, chain: string, address?: string) => Promise<void>;
  syncAllWallets: () => Promise<void>;
  syncPrices: () => Promise<void>;

  // Selectors
  getBalance: (walletId: string, chain: string, asset: string) => Balance | null;
  getWalletTransactions: (walletId: string) => CachedTransaction[];
  getAllTransactions: () => CachedTransaction[];
  getPrice: (asset: string) => number | null;
  getTotalBalanceUsd: (walletIds: string[], chain: string, asset: string) => number | null;
  getSyncStatus: (walletId: string) => SyncStatus;
}

// =============================================================================
// Initial State
// =============================================================================

const initialSyncStatus: SyncStatus = {
  isSyncing: false,
  lastSynced: null,
  error: null,
};

// =============================================================================
// Store
// =============================================================================

export const useChainStore = create<ChainStoreState>()(
  devtools(
    (set, get) => ({
      balances: {},
      transactions: {},
      prices: {},
      isHydrated: false,
      syncStatus: {},

      // =========================================================================
      // Hydrate - Load from SQLite on app start
      // =========================================================================
      hydrate: async () => {
        console.log("[ChainStore] Hydrating from SQLite...");

        try {
          const [balances, prices, transactions] = await Promise.all([
            loadBalances(),
            loadPrices(),
            loadAllTransactions(),
          ]);

          // Index balances by key
          const balanceMap: Record<string, Balance> = {};
          for (const b of balances) {
            balanceMap[balanceKey(b)] = b;
          }

          // Index prices by asset
          const priceMap: Record<string, Price> = {};
          for (const p of prices) {
            priceMap[p.asset] = p;
          }

          // Group transactions by wallet_id
          const txMap: Record<string, CachedTransaction[]> = {};
          for (const tx of transactions) {
            const existing = txMap[tx.wallet_id];
            if (existing) {
              existing.push(tx);
            } else {
              txMap[tx.wallet_id] = [tx];
            }
          }

          // Build initial sync status from balances
          const syncStatus: Record<string, SyncStatus> = {};
          for (const b of balances) {
            if (!syncStatus[b.wallet_id]) {
              syncStatus[b.wallet_id] = {
                isSyncing: false,
                lastSynced: b.last_synced,
                error: null,
              };
            }
          }

          set({
            balances: balanceMap,
            prices: priceMap,
            transactions: txMap,
            syncStatus,
            isHydrated: true,
          });

          console.log(
            `[ChainStore] Hydrated: ${balances.length} balances, ${prices.length} prices, ${transactions.length} transactions`
          );
        } catch (error) {
          console.error("[ChainStore] Hydration failed:", error);
          set({ isHydrated: true }); // Still mark as hydrated so app can proceed
        }
      },

      // =========================================================================
      // Sync Wallet - Fetch from network, save to SQLite, update state
      // =========================================================================
      syncWallet: async (walletId: string, chain: string, address?: string) => {
        console.log(`[ChainStore] Syncing wallet ${walletId} on ${chain}`);

        // Set syncing status
        set((s) => ({
          syncStatus: {
            ...s.syncStatus,
            [walletId]: { ...initialSyncStatus, isSyncing: true },
          },
        }));

        try {
          if (chain === "bitcoin") {
            await syncBitcoinWallet_internal(walletId, address, set, get);
          }
          // Future: else if (chain === "ethereum") { ... }

          // Update sync status
          const now = new Date().toISOString();
          set((s) => ({
            syncStatus: {
              ...s.syncStatus,
              [walletId]: { isSyncing: false, lastSynced: now, error: null },
            },
          }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Sync failed";
          console.error(`[ChainStore] Sync failed for ${walletId}:`, error);

          set((s) => ({
            syncStatus: {
              ...s.syncStatus,
              [walletId]: {
                isSyncing: false,
                lastSynced: s.syncStatus[walletId]?.lastSynced ?? null,
                error: errorMsg,
              },
            },
          }));
        }
      },

      // =========================================================================
      // Sync All Wallets
      // =========================================================================
      syncAllWallets: async () => {
        console.log("[ChainStore] Syncing all wallets...");

        const wallets = useWalletStore.getState().wallets;

        // Sync each wallet's chains in parallel
        const syncPromises: Promise<void>[] = [];

        for (const wallet of wallets) {
          for (const addr of wallet.addresses) {
            // For watch-only, pass the address
            const addressForSync =
              wallet.type === "watch_only" ? addr.address : undefined;

            syncPromises.push(
              get().syncWallet(wallet.id, addr.chain, addressForSync)
            );
          }
        }

        await Promise.allSettled(syncPromises);
        console.log("[ChainStore] All wallets synced");
      },

      // =========================================================================
      // Sync Prices
      // =========================================================================
      syncPrices: async () => {
        console.log("[ChainStore] Syncing prices...");

        try {
          // Fetch BTC price from CoinGecko
          const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
          );

          if (!response.ok) {
            throw new Error(`Price API error: ${response.status}`);
          }

          const data = await response.json();
          const now = new Date().toISOString();

          const prices: Price[] = [];

          if (data.bitcoin?.usd) {
            prices.push({
              asset: "BTC",
              price_usd: data.bitcoin.usd,
              last_updated: now,
            });
          }

          if (data.ethereum?.usd) {
            prices.push({
              asset: "ETH",
              price_usd: data.ethereum.usd,
              last_updated: now,
            });
          }

          // Save to SQLite
          await savePrices(prices);

          // Update state
          const priceMap: Record<string, Price> = { ...get().prices };
          for (const p of prices) {
            priceMap[p.asset] = p;
          }

          set({ prices: priceMap });
          console.log(`[ChainStore] Prices synced: ${prices.length}`);
        } catch (error) {
          console.error("[ChainStore] Price sync failed:", error);
        }
      },

      // =========================================================================
      // Selectors
      // =========================================================================
      getBalance: (walletId: string, chain: string, asset: string) => {
        const key = `${walletId}:${chain}:${asset}`;
        return get().balances[key] ?? null;
      },

      getWalletTransactions: (walletId: string) => {
        return get().transactions[walletId] ?? [];
      },

      getAllTransactions: () => {
        const allTxs: CachedTransaction[] = [];
        for (const txs of Object.values(get().transactions)) {
          allTxs.push(...txs);
        }
        // Sort by timestamp descending
        return allTxs.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });
      },

      getPrice: (asset: string) => {
        return get().prices[asset]?.price_usd ?? null;
      },

      getTotalBalanceUsd: (walletIds: string[], chain: string, asset: string) => {
        const { balances, prices } = get();
        const price = prices[asset]?.price_usd;
        if (!price) return null;

        let total = 0;
        for (const walletId of walletIds) {
          const key = `${walletId}:${chain}:${asset}`;
          const balance = balances[key];
          if (balance) {
            const confirmed = parseFloat(balance.confirmed) || 0;
            const unconfirmed = parseFloat(balance.unconfirmed) || 0;
            total += confirmed + unconfirmed;
          }
        }

        // Convert sats to BTC for Bitcoin
        if (asset === "BTC") {
          total = total / 100_000_000;
        }

        return total * price;
      },

      getSyncStatus: (walletId: string) => {
        return get().syncStatus[walletId] ?? initialSyncStatus;
      },
    }),
    { name: "ChainStore" }
  )
);

// =============================================================================
// Internal Helpers
// =============================================================================

async function syncBitcoinWallet_internal(
  walletId: string,
  address: string | undefined,
  set: (fn: (state: ChainStoreState) => Partial<ChainStoreState>) => void,
  _get: () => ChainStoreState
) {
  const isSingleAddress = address && isBitcoinAddress(address);

  let balance: BitcoinBalance;
  let transactions: BitcoinTransaction[];

  if (isSingleAddress) {
    // Direct Electrum query for single address
    balance = await getBitcoinAddressBalance(address);
    transactions = await getBitcoinAddressTransactions(address);
  } else {
    // BDK sync for HD wallet
    await syncBitcoinWallet(walletId);
    balance = await getBitcoinBalance(walletId);
    transactions = await getBitcoinTransactions(walletId);
  }

  const now = new Date().toISOString();

  // Convert to our Balance format
  const balanceData: Balance = {
    wallet_id: walletId,
    chain: "bitcoin",
    asset: "BTC",
    confirmed: balance.confirmed.toString(),
    unconfirmed: balance.unconfirmed.toString(),
    last_synced: now,
  };

  // Save balance to SQLite
  await saveBalance(balanceData);

  // Convert transactions to CachedTransaction format
  const txData: CachedTransaction[] = transactions.map((tx) => ({
    id: `${walletId}:${tx.txid}`,
    wallet_id: walletId,
    chain: "bitcoin",
    tx_hash: tx.txid,
    block_number:
      tx.status.type === "confirmed" && tx.status.block_height !== undefined
        ? tx.status.block_height
        : null,
    timestamp: tx.timestamp
      ? new Date(tx.timestamp * 1000).toISOString()
      : now,
    tx_type: tx.direction,
    amount: tx.amount_sats.toString(),
    fee: tx.fee_sats?.toString() ?? null,
    asset_symbol: "BTC",
    from_address: address ?? walletId, // Use address if available
    to_address: null,
    raw_data: null,
  }));

  // Save transactions to SQLite
  if (txData.length > 0) {
    await saveTransactions(txData);
  }

  // Update state
  set((s) => ({
    balances: {
      ...s.balances,
      [balanceKey(balanceData)]: balanceData,
    },
    transactions: {
      ...s.transactions,
      [walletId]: txData,
    },
  }));
}

// =============================================================================
// Selectors (for use outside React components)
// =============================================================================

export const selectIsHydrated = (state: ChainStoreState) => state.isHydrated;
export const selectBalances = (state: ChainStoreState) => state.balances;
export const selectPrices = (state: ChainStoreState) => state.prices;
export const selectTransactions = (state: ChainStoreState) => state.transactions;
