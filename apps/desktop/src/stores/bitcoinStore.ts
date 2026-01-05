/**
 * Bitcoin Store - Zustand state management for Bitcoin operations
 *
 * Manages Bitcoin balances, transactions, sync state, and price data.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  BitcoinBalance,
  BitcoinTransaction,
  SyncProgress,
  getBitcoinBalance,
  getBitcoinTransactions,
  syncBitcoinWallet,
  satsToBtc,
  getBitcoinAddressBalance,
  getBitcoinAddressTransactions,
  isBitcoinAddress,
} from "@/lib/tauri/bitcoin";

// =============================================================================
// Types
// =============================================================================

export interface WalletBitcoinState {
  balance: BitcoinBalance | null;
  transactions: BitcoinTransaction[];
  lastSynced: string | null;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  error: string | null;
}

export interface PriceState {
  btcUsd: number | null;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

interface BitcoinStoreState {
  // Per-wallet Bitcoin state (keyed by wallet ID)
  walletStates: Record<string, WalletBitcoinState>;

  // Global price state
  price: PriceState;

  // Actions
  // For single-address watch-only wallets, pass the address
  // For HD wallets, pass undefined for address
  syncWallet: (walletId: string, address?: string) => Promise<void>;
  fetchBalance: (walletId: string, address?: string) => Promise<void>;
  fetchTransactions: (walletId: string, address?: string) => Promise<void>;
  fetchPrice: () => Promise<void>;
  refreshWallet: (walletId: string, address?: string) => Promise<void>;

  // Selectors
  getWalletState: (walletId: string) => WalletBitcoinState;
  getTotalBalanceBtc: (walletIds: string[]) => number;
  getTotalBalanceUsd: (walletIds: string[]) => number | null;
}

// =============================================================================
// Initial State
// =============================================================================

const initialWalletState: WalletBitcoinState = {
  balance: null,
  transactions: [],
  lastSynced: null,
  isSyncing: false,
  syncProgress: null,
  error: null,
};

const initialPriceState: PriceState = {
  btcUsd: null,
  lastUpdated: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// Store
// =============================================================================

export const useBitcoinStore = create<BitcoinStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        walletStates: {},
        price: initialPriceState,

      // Get wallet state with defaults
      getWalletState: (walletId: string) => {
        return get().walletStates[walletId] || initialWalletState;
      },

      // Sync wallet with blockchain
      // For single-address watch-only wallets, pass the address to use direct Electrum query
      syncWallet: async (walletId: string, address?: string) => {
        const isSingleAddress = address && isBitcoinAddress(address);

        // Set syncing state
        set((state) => ({
          walletStates: {
            ...state.walletStates,
            [walletId]: {
              ...state.walletStates[walletId] || initialWalletState,
              isSyncing: true,
              error: null,
            },
          },
        }));

        try {
          // For single addresses, skip BDK sync - just fetch data directly from Electrum
          if (isSingleAddress) {
            // Direct Electrum queries don't need a sync step
            set((state) => ({
              walletStates: {
                ...state.walletStates,
                [walletId]: {
                  ...state.walletStates[walletId] || initialWalletState,
                  isSyncing: false,
                  syncProgress: { stage: "complete", progress: 100, message: "Complete" },
                  lastSynced: new Date().toISOString(),
                  error: null,
                },
              },
            }));
          } else {
            // HD wallet - use BDK sync
            const progress = await syncBitcoinWallet(walletId);

            set((state) => ({
              walletStates: {
                ...state.walletStates,
                [walletId]: {
                  ...state.walletStates[walletId] || initialWalletState,
                  isSyncing: false,
                  syncProgress: progress,
                  lastSynced: new Date().toISOString(),
                  error: null,
                },
              },
            }));
          }

          // After sync, fetch updated balance and transactions
          await get().fetchBalance(walletId, address);
          await get().fetchTransactions(walletId, address);
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : "Sync failed";

          // Provide clearer error for common issues
          if (errorMessage.includes("not found") || errorMessage.includes("database")) {
            errorMessage = "Bitcoin wallet not initialized. Please recreate the wallet.";
          } else if (errorMessage.includes("connection") || errorMessage.includes("Electrum")) {
            errorMessage = "Could not connect to Bitcoin network. Check your internet connection.";
          }

          set((state) => ({
            walletStates: {
              ...state.walletStates,
              [walletId]: {
                ...state.walletStates[walletId] || initialWalletState,
                isSyncing: false,
                error: errorMessage,
              },
            },
          }));
          throw error;
        }
      },

      // Fetch balance for a wallet
      // For single-address watch-only wallets, pass the address
      fetchBalance: async (walletId: string, address?: string) => {
        try {
          const isSingleAddress = address && isBitcoinAddress(address);
          const balance = isSingleAddress
            ? await getBitcoinAddressBalance(address)
            : await getBitcoinBalance(walletId);

          set((state) => ({
            walletStates: {
              ...state.walletStates,
              [walletId]: {
                ...state.walletStates[walletId] || initialWalletState,
                balance,
                error: null,
              },
            },
          }));
        } catch (error) {
          // Balance fetch might fail if wallet hasn't been synced yet - that's ok
          console.warn(`[BitcoinStore] Failed to fetch balance for ${walletId}:`, error);
        }
      },

      // Fetch transactions for a wallet
      // For single-address watch-only wallets, pass the address
      fetchTransactions: async (walletId: string, address?: string) => {
        try {
          const isSingleAddress = address && isBitcoinAddress(address);
          const transactions = isSingleAddress
            ? await getBitcoinAddressTransactions(address)
            : await getBitcoinTransactions(walletId);

          set((state) => ({
            walletStates: {
              ...state.walletStates,
              [walletId]: {
                ...state.walletStates[walletId] || initialWalletState,
                transactions,
                error: null,
              },
            },
          }));
        } catch (error) {
          console.warn(`[BitcoinStore] Failed to fetch transactions for ${walletId}:`, error);
        }
      },

      // Fetch BTC/USD price from CoinGecko
      fetchPrice: async () => {
        set((state) => ({
          price: { ...state.price, isLoading: true, error: null },
        }));

        try {
          const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
          );

          if (!response.ok) {
            throw new Error(`Price API error: ${response.status}`);
          }

          const data = await response.json();
          const btcUsd = data.bitcoin?.usd;

          if (typeof btcUsd !== "number") {
            throw new Error("Invalid price data");
          }

          set({
            price: {
              btcUsd,
              lastUpdated: new Date().toISOString(),
              isLoading: false,
              error: null,
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Price fetch failed";
          set((state) => ({
            price: {
              ...state.price,
              isLoading: false,
              error: errorMessage,
            },
          }));
        }
      },

      // Refresh wallet (sync + fetch all data)
      // For single-address watch-only wallets, pass the address
      refreshWallet: async (walletId: string, address?: string) => {
        await get().syncWallet(walletId, address);
        await get().fetchPrice();
      },

      // Calculate total BTC balance across wallets
      getTotalBalanceBtc: (walletIds: string[]) => {
        const { walletStates } = get();
        let totalSats = 0;

        for (const walletId of walletIds) {
          const state = walletStates[walletId];
          if (state?.balance) {
            totalSats += state.balance.confirmed + state.balance.unconfirmed;
          }
        }

        return satsToBtc(totalSats);
      },

      // Calculate total USD value across wallets
      getTotalBalanceUsd: (walletIds: string[]) => {
        const { price } = get();
        if (!price.btcUsd) return null;

        const totalBtc = get().getTotalBalanceBtc(walletIds);
        return totalBtc * price.btcUsd;
      },
    }),
      {
        name: "coinbox-bitcoin-store",
        partialize: (state) => ({
          walletStates: Object.fromEntries(
            Object.entries(state.walletStates).map(([id, ws]) => [
              id,
              {
                balance: ws.balance,
                transactions: ws.transactions,
                lastSynced: ws.lastSynced,
                isSyncing: false,
                syncProgress: null,
                error: null,
              },
            ])
          ),
          price: state.price,
        }),
      }
    ),
    { name: "BitcoinStore" }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectWalletBalance = (state: BitcoinStoreState, walletId: string) =>
  state.walletStates[walletId]?.balance || null;

export const selectWalletTransactions = (state: BitcoinStoreState, walletId: string) =>
  state.walletStates[walletId]?.transactions || [];

export const selectIsSyncing = (state: BitcoinStoreState, walletId: string) =>
  state.walletStates[walletId]?.isSyncing || false;

export const selectBtcPrice = (state: BitcoinStoreState) => state.price.btcUsd;
