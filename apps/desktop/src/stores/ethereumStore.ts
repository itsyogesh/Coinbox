/**
 * Ethereum Store - State management for EVM chains
 *
 * Uses Viem for RPC calls (balances, transactions, gas).
 * Signing is handled by TauriAccount which routes to Rust backend.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  fetchNativeBalance,
  fetchTokenBalances,
  fetchGasPrice as viemFetchGasPrice,
  type EVMChainId,
  type EthereumBalance,
  type TokenBalance,
  formatEther,
  formatGwei,
} from "@/lib/viem";
import type { Address } from "viem";
import { getAllCoingeckoIds } from "@/lib/chains";

// Custom JSON replacer that converts BigInt to string
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

// Custom localStorage wrapper that safely handles BigInt during serialization
const bigIntSafeLocalStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    // Re-serialize with BigInt handling in case any BigInt slips through
    try {
      const parsed = JSON.parse(value);
      const safe = JSON.stringify(parsed, bigIntReplacer);
      localStorage.setItem(name, safe);
    } catch {
      // If parsing fails, store as-is
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

// ============================================================================
// Types
// ============================================================================

export interface EthereumTransaction {
  hash: string;
  chainId: EVMChainId;
  blockNumber: number | null;
  timestamp: number;
  from: string;
  to: string | null;
  value: string; // in wei
  gasUsed: string;
  gasPrice: string;
  status: "success" | "failed" | "pending";
  direction: "send" | "receive" | "self" | "contract";
}

// TokenBalance is imported from @/lib/viem

export interface ChainState {
  balance: EthereumBalance | null;
  tokens: TokenBalance[];
  transactions: EthereumTransaction[];
  gasPrice: { wei: string; gwei: string } | null; // wei as string for JSON serialization
  lastSynced: string | null;
  isSyncing: boolean;
  error: string | null;
}

const createDefaultChainState = (): ChainState => ({
  balance: null,
  tokens: [],
  transactions: [],
  gasPrice: null,
  lastSynced: null,
  isSyncing: false,
  error: null,
});

// Chain states per wallet
export type WalletChainStates = Record<EVMChainId, ChainState>;

const createDefaultWalletState = (): WalletChainStates => ({
  ethereum: createDefaultChainState(),
  arbitrum: createDefaultChainState(),
  optimism: createDefaultChainState(),
  base: createDefaultChainState(),
  polygon: createDefaultChainState(),
});

interface PriceState {
  /**
   * Prices by CoinGecko ID (e.g., "ethereum" -> 3500)
   * Uses IDs from the chain registry for dynamic price lookup.
   */
  prices: Record<string, number>;
  // Metadata
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Get price for a coingeckoId from the price state
 */
function getPrice(prices: Record<string, number>, coingeckoId: string): number {
  return prices[coingeckoId] ?? 0;
}

interface EthereumStoreState {
  // State per wallet (walletId -> chain states)
  wallets: Record<string, WalletChainStates>;

  // Price state
  price: PriceState;

  // Actions
  syncBalance: (
    walletId: string,
    address: Address,
    chainId: EVMChainId
  ) => Promise<void>;
  syncAllChains: (walletId: string, address: Address) => Promise<void>;
  fetchGasPrice: (chainId: EVMChainId) => Promise<void>;
  fetchPrice: () => Promise<void>;
  clearWallet: (walletId: string) => void;
  initWallet: (walletId: string) => void;

  // Getters
  getBalance: (
    walletId: string,
    chainId: EVMChainId
  ) => EthereumBalance | null;
  getTotalBalanceUsd: (walletId: string) => number;
}

// ============================================================================
// Store
// ============================================================================

export const useEthereumStore = create<EthereumStoreState>()(
  persist(
    (set, get) => ({
      wallets: {},

      price: {
        prices: {},
        lastUpdated: null,
        isLoading: false,
        error: null,
      },

      // Initialize wallet state
      initWallet: (walletId: string) => {
        if (!get().wallets[walletId]) {
          set((state) => ({
            wallets: {
              ...state.wallets,
              [walletId]: createDefaultWalletState(),
            },
          }));
        }
      },

      // Sync balance for a specific chain
      syncBalance: async (
        walletId: string,
        address: Address,
        chainId: EVMChainId
      ) => {
        // Ensure wallet state exists
        get().initWallet(walletId);

        // Set syncing state
        set((state) => {
          const wallet = state.wallets[walletId] || createDefaultWalletState();
          return {
            wallets: {
              ...state.wallets,
              [walletId]: {
                ...wallet,
                [chainId]: {
                  ...wallet[chainId],
                  isSyncing: true,
                  error: null,
                },
              },
            },
          };
        });

        try {
          console.log(
            `[EthereumStore] Syncing ${chainId} balance for ${address}`
          );

          // Fetch native balance and token balances in parallel
          const [balance, tokens] = await Promise.all([
            fetchNativeBalance(address, chainId),
            fetchTokenBalances(address, chainId),
          ]);

          set((state) => {
            const wallet = state.wallets[walletId] || createDefaultWalletState();
            return {
              wallets: {
                ...state.wallets,
                [walletId]: {
                  ...wallet,
                  [chainId]: {
                    ...wallet[chainId],
                    balance,
                    tokens,
                    lastSynced: new Date().toISOString(),
                    isSyncing: false,
                  },
                },
              },
            };
          });

          console.log(
            `[EthereumStore] ${chainId} balance: ${balance.formatted} ${balance.symbol}, ${tokens.length} tokens`
          );
        } catch (error) {
          console.error(`[EthereumStore] Failed to sync ${chainId}:`, error);

          set((state) => {
            const wallet = state.wallets[walletId] || createDefaultWalletState();
            return {
              wallets: {
                ...state.wallets,
                [walletId]: {
                  ...wallet,
                  [chainId]: {
                    ...wallet[chainId],
                    isSyncing: false,
                    error:
                      error instanceof Error ? error.message : "Sync failed",
                  },
                },
              },
            };
          });
        }
      },

      // Sync all chains for a wallet
      syncAllChains: async (walletId: string, address: Address) => {
        const chains: EVMChainId[] = [
          "ethereum",
          "arbitrum",
          "optimism",
          "base",
          "polygon",
        ];

        console.log(
          `[EthereumStore] Syncing all chains for wallet ${walletId}`
        );

        // Sync all chains in parallel
        await Promise.allSettled(
          chains.map((chainId) =>
            get().syncBalance(walletId, address, chainId)
          )
        );

        console.log(`[EthereumStore] All chains synced for ${walletId}`);
      },

      // Fetch gas price for a chain
      fetchGasPrice: async (chainId: EVMChainId) => {
        try {
          const gasPrice = await viemFetchGasPrice(chainId);

          // Update gas price for all wallets
          set((state) => {
            const updatedWallets: Record<string, WalletChainStates> = {};
            for (const [walletId, wallet] of Object.entries(state.wallets)) {
              updatedWallets[walletId] = {
                ...wallet,
                [chainId]: {
                  ...wallet[chainId],
                  gasPrice: {
                    wei: gasPrice.toString(), // Convert BigInt to string for JSON serialization
                    gwei: formatGwei(gasPrice),
                  },
                },
              } as WalletChainStates;
            }
            return { wallets: { ...state.wallets, ...updatedWallets } };
          });
        } catch (error) {
          console.error(
            `[EthereumStore] Failed to fetch gas price for ${chainId}:`,
            error
          );
        }
      },

      // Fetch all token prices from CoinGecko using registry IDs
      fetchPrice: async () => {
        set((state) => ({
          price: { ...state.price, isLoading: true, error: null },
        }));

        try {
          // Get all coingecko IDs from the chain registry
          const coingeckoIds = getAllCoingeckoIds();
          const ids = coingeckoIds.join(",");

          console.log(`[EthereumStore] Fetching prices for: ${ids}`);

          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
          );

          if (!response.ok) {
            throw new Error(`Price API error: ${response.status}`);
          }

          const data = await response.json();

          // Build prices map from response
          const prices: Record<string, number> = {};
          for (const id of coingeckoIds) {
            const price = data[id]?.usd;
            if (typeof price === "number") {
              prices[id] = price;
            } else if (id === "usd-coin" || id === "tether" || id === "dai") {
              // Default stablecoins to $1 if API doesn't return
              prices[id] = 1;
            }
          }

          // Verify we got essential prices
          if (!prices["ethereum"]) {
            throw new Error("Invalid ETH price data");
          }

          set({
            price: {
              prices,
              lastUpdated: new Date().toISOString(),
              isLoading: false,
              error: null,
            },
          });

          console.log(
            `[EthereumStore] Prices fetched: ETH=$${prices["ethereum"]}, MATIC=$${prices["matic-network"]}, ARB=$${prices["arbitrum"]}, OP=$${prices["optimism"]}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Price fetch failed";
          set((state) => ({
            price: {
              ...state.price,
              isLoading: false,
              error: errorMessage,
            },
          }));
          console.error("[EthereumStore] Failed to fetch price:", error);
        }
      },

      // Clear wallet state
      clearWallet: (walletId: string) => {
        set((state) => {
          const { [walletId]: _, ...rest } = state.wallets;
          return { wallets: rest };
        });
      },

      // Get balance for a specific chain
      getBalance: (walletId: string, chainId: EVMChainId) => {
        return get().wallets[walletId]?.[chainId]?.balance ?? null;
      },

      // Get total balance in USD across all chains (native + tokens)
      getTotalBalanceUsd: (walletId: string) => {
        const { wallets, price } = get();
        const wallet = wallets[walletId];
        const { prices } = price;

        // Need at least ETH price to calculate
        if (!wallet || !prices["ethereum"]) return 0;

        let total = 0;
        const allChains: EVMChainId[] = [
          "ethereum",
          "arbitrum",
          "optimism",
          "base",
          "polygon",
        ];

        // Token symbol to coingeckoId mapping (from registry)
        const symbolToCoingeckoId: Record<string, string> = {
          // Native/Wrapped ETH
          ETH: "ethereum",
          WETH: "ethereum",
          cbETH: "coinbase-wrapped-staked-eth",
          // Native POL/MATIC
          POL: "matic-network",
          WPOL: "matic-network",
          MATIC: "matic-network",
          WMATIC: "matic-network",
          // Other tokens
          WBTC: "bitcoin",
          LINK: "chainlink",
          UNI: "uniswap",
          ARB: "arbitrum",
          OP: "optimism",
          // Stablecoins
          USDC: "usd-coin",
          USDT: "tether",
          DAI: "dai",
        };

        for (const chainId of allChains) {
          const chainState = wallet[chainId];
          if (!chainState) continue;

          // Native balance
          const balance = chainState.balance;
          if (balance) {
            const amount = parseFloat(balance.formatted);
            // Polygon uses POL, others use ETH
            const nativeCoingeckoId = chainId === "polygon" ? "matic-network" : "ethereum";
            const nativePrice = getPrice(prices, nativeCoingeckoId);
            total += amount * nativePrice;
          }

          // Token balances
          const tokens = chainState.tokens;
          if (tokens && tokens.length > 0) {
            for (const token of tokens) {
              const coingeckoId = symbolToCoingeckoId[token.symbol];
              if (coingeckoId) {
                const tokenPrice = getPrice(prices, coingeckoId);
                const amount = parseFloat(token.formattedBalance);
                total += amount * tokenPrice;
              }
            }
          }
        }

        return total;
      },
    }),
    {
      name: "coinbox-ethereum-store",
      storage: createJSONStorage(() => bigIntSafeLocalStorage),
      partialize: (state) => ({
        // Only persist essential data
        wallets: state.wallets,
      }),
    }
  )
);

// ============================================================================
// Selectors (for convenience)
// ============================================================================

/**
 * Hook to get Ethereum state for a specific wallet and chain
 */
export function useChainState(
  walletId: string,
  chainId: EVMChainId
): ChainState | null {
  return useEthereumStore(
    (state) => state.wallets[walletId]?.[chainId] ?? null
  );
}

/**
 * Hook to check if any chain is syncing for a wallet
 */
export function useIsAnySyncing(walletId: string): boolean {
  const wallet = useEthereumStore((state) => state.wallets[walletId]);
  if (!wallet) return false;

  const chains: EVMChainId[] = [
    "ethereum",
    "arbitrum",
    "optimism",
    "base",
    "polygon",
  ];
  return chains.some((chainId) => wallet[chainId]?.isSyncing);
}

/**
 * Get formatted total balance across all EVM chains
 */
export function useFormattedTotalBalance(walletId: string): string {
  const wallet = useEthereumStore((state) => state.wallets[walletId]);
  if (!wallet) return "0";

  let totalWei = BigInt(0);
  const chains: EVMChainId[] = [
    "ethereum",
    "arbitrum",
    "optimism",
    "base",
    "polygon",
  ];

  for (const chainId of chains) {
    const balance = wallet[chainId]?.balance;
    if (balance && balance.wei) {
      // Parse string back to BigInt for calculation
      totalWei += BigInt(balance.wei);
    }
  }

  return formatEther(totalWei);
}
