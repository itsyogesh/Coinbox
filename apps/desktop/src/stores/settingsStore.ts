/**
 * Settings Store - Persistent app settings
 *
 * Manages:
 * - Theme (light/dark/system)
 * - Display currency
 * - Custom RPC endpoints
 * - API keys
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EVMChainId } from "@coinbox/chains";

// ============================================================================
// Types
// ============================================================================

export type Theme = "light" | "dark" | "system";
export type Currency = "USD" | "EUR" | "GBP" | "INR";

export interface RpcEndpoints {
  // Bitcoin
  bitcoin?: string;
  // EVM chains
  ethereum?: string;
  arbitrum?: string;
  optimism?: string;
  base?: string;
  polygon?: string;
}

export interface ApiKeys {
  anthropic?: string;
  // Block explorer API keys (for higher rate limits)
  etherscan?: string;
  arbiscan?: string;
  optimisticEtherscan?: string;
  basescan?: string;
  polygonscan?: string;
}

export interface CustomToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string;
}

// Custom tokens per chain
export type CustomTokens = Partial<Record<EVMChainId, CustomToken[]>>;

interface SettingsState {
  // Appearance
  theme: Theme;
  currency: Currency;

  // Network
  rpcEndpoints: RpcEndpoints;

  // API Keys
  apiKeys: ApiKeys;

  // Custom tokens
  customTokens: CustomTokens;

  // Actions
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: Currency) => void;
  setRpcEndpoint: (chain: keyof RpcEndpoints, url: string) => void;
  clearRpcEndpoint: (chain: keyof RpcEndpoints) => void;
  setApiKey: (key: keyof ApiKeys, value: string) => void;
  clearApiKey: (key: keyof ApiKeys) => void;
  getRpcUrl: (chainId: EVMChainId) => string | undefined;
  addCustomToken: (chainId: EVMChainId, token: CustomToken) => void;
  removeCustomToken: (chainId: EVMChainId, address: string) => void;
  getCustomTokens: (chainId: EVMChainId) => CustomToken[];
  resetAll: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultSettings = {
  theme: "dark" as Theme,
  currency: "USD" as Currency,
  rpcEndpoints: {} as RpcEndpoints,
  apiKeys: {} as ApiKeys,
  customTokens: {} as CustomTokens,
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply theme to document
        applyTheme(theme);
      },

      setCurrency: (currency: Currency) => {
        set({ currency });
      },

      setRpcEndpoint: (chain: keyof RpcEndpoints, url: string) => {
        set((state) => ({
          rpcEndpoints: {
            ...state.rpcEndpoints,
            [chain]: url.trim() || undefined, // Remove empty strings
          },
        }));
      },

      clearRpcEndpoint: (chain: keyof RpcEndpoints) => {
        set((state) => {
          const { [chain]: _, ...rest } = state.rpcEndpoints;
          return { rpcEndpoints: rest };
        });
      },

      setApiKey: (key: keyof ApiKeys, value: string) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [key]: value.trim() || undefined,
          },
        }));
      },

      clearApiKey: (key: keyof ApiKeys) => {
        set((state) => {
          const { [key]: _, ...rest } = state.apiKeys;
          return { apiKeys: rest };
        });
      },

      getRpcUrl: (chainId: EVMChainId) => {
        return get().rpcEndpoints[chainId];
      },

      addCustomToken: (chainId: EVMChainId, token: CustomToken) => {
        set((state) => {
          const existing = state.customTokens[chainId] ?? [];
          // Check if token already exists
          const exists = existing.some(
            (t) => t.address.toLowerCase() === token.address.toLowerCase()
          );
          if (exists) return state;

          return {
            customTokens: {
              ...state.customTokens,
              [chainId]: [...existing, token],
            },
          };
        });
      },

      removeCustomToken: (chainId: EVMChainId, address: string) => {
        set((state) => {
          const existing = state.customTokens[chainId] ?? [];
          return {
            customTokens: {
              ...state.customTokens,
              [chainId]: existing.filter(
                (t) => t.address.toLowerCase() !== address.toLowerCase()
              ),
            },
          };
        });
      },

      getCustomTokens: (chainId: EVMChainId) => {
        return get().customTokens[chainId] ?? [];
      },

      resetAll: () => {
        set(defaultSettings);
        applyTheme(defaultSettings.theme);
      },
    }),
    {
      name: "coinbox-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// Theme Utilities
// ============================================================================

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // System preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

/**
 * Initialize theme on app startup
 * Call this in main.tsx or App.tsx
 */
export function initializeTheme(): void {
  const settings = useSettingsStore.getState();
  applyTheme(settings.theme);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    if (settings.theme === "system") {
      applyTheme("system");
    }
  });
}

// ============================================================================
// Currency Utilities
// ============================================================================

export const CURRENCY_CONFIG: Record<
  Currency,
  { symbol: string; name: string; locale: string }
> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
};

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: Currency = "USD"
): string {
  const config = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
