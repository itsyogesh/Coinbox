/**
 * Wallet Store - Zustand state management for wallet operations
 *
 * Manages HD wallets, derived addresses, and wallet session state.
 * Uses family-based chain selection (Bitcoin, Ethereum, etc.)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  ChainInfo,
  DerivedAddress,
  getSupportedChains,
  getMainnetChains,
  createHDWallet,
  importHDWallet,
  isWalletUnlocked,
  lockWallet,
  unlockWallet,
} from "@/lib/tauri/wallet";
import { initBitcoinFromCachedSeed, createBitcoinWatchWallet } from "@/lib/tauri/bitcoin";
import {
  type ChainFamily,
  getEnabledChainsByFamily,
} from "@/lib/chains";

// =============================================================================
// Types
// =============================================================================

export interface HDWallet {
  id: string;
  name: string;
  type: "hd" | "private_key" | "watch_only";
  hasBackupVerified: boolean;
  createdAt: string;
  addresses: WalletAddress[];
}

export interface WalletAddress {
  chain: string;
  chainFamily: "secp256k1" | "ed25519" | "sr25519";
  address: string;
  derivationPath: string;
  isPrimary: boolean;
}

export type WalletCreationStep =
  | "select-chains"
  | "set-password"
  | "show-mnemonic"
  | "verify-mnemonic"
  | "success";

export interface WalletCreationState {
  step: WalletCreationStep;
  walletName: string;
  /** @deprecated Use selectedFamilies instead */
  selectedChains: string[];
  /** Selected chain families (bitcoin, evm, solana) */
  selectedFamilies: ChainFamily[];
  password: string;
  mnemonic: string | null;
  mnemonicVerified: boolean;
  createdWalletId: string | null;
  derivedAddresses: DerivedAddress[];
  error: string | null;
}

interface WalletState {
  // Chain registry
  supportedChains: ChainInfo[];
  mainnetChains: ChainInfo[];
  chainsLoaded: boolean;

  // Wallets
  wallets: HDWallet[];
  selectedWalletId: string | null;

  // Session state
  isUnlocked: boolean;

  // Wallet creation flow
  creation: WalletCreationState;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;

  // Actions
  loadChains: () => Promise<void>;
  loadWallets: () => Promise<void>;
  selectWallet: (walletId: string | null) => void;

  // Session actions
  checkUnlockStatus: () => Promise<void>;
  unlock: (walletId: string, password: string) => Promise<void>;
  lock: () => Promise<void>;

  // Wallet creation flow actions
  startCreation: () => void;
  setCreationStep: (step: WalletCreationStep) => void;
  setWalletName: (name: string) => void;
  /** @deprecated Use toggleFamilySelection instead */
  toggleChainSelection: (chainId: string) => void;
  /** Toggle selection of a chain family (e.g., 'bitcoin', 'evm') */
  toggleFamilySelection: (family: ChainFamily) => void;
  setPassword: (password: string) => void;
  createWallet: () => Promise<void>;
  verifyMnemonicWord: (index: number, word: string) => boolean;
  confirmMnemonicBackup: () => void;
  resetCreation: () => void;

  // Import flow actions
  importWallet: (name: string, mnemonic: string, chains: string[], password: string) => Promise<void>;

  // Watch-only actions
  addWatchOnlyAddress: (name: string, chainId: string, address: string) => Promise<void>;
}

// =============================================================================
// Initial State
// =============================================================================

const initialCreationState: WalletCreationState = {
  step: "select-chains",
  walletName: "",
  selectedChains: [], // Deprecated, kept for compatibility
  selectedFamilies: [],
  password: "",
  mnemonic: null,
  mnemonicVerified: false,
  createdWalletId: null,
  derivedAddresses: [],
  error: null,
};

/**
 * Convert selected families to chain IDs for backend compatibility.
 * The backend expects individual chain IDs, not families.
 */
function familiesToChainIds(families: ChainFamily[]): string[] {
  const chainIds: string[] = [];
  for (const family of families) {
    const enabledChains = getEnabledChainsByFamily(family);
    chainIds.push(...enabledChains.map(c => c.id));
  }
  return chainIds;
}

// =============================================================================
// Store
// =============================================================================

export const useWalletStore = create<WalletState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        supportedChains: [],
        mainnetChains: [],
        chainsLoaded: false,
        wallets: [],
        selectedWalletId: null,
        isUnlocked: false,
        creation: { ...initialCreationState },
        isLoading: false,
        isCreating: false,

        // Load chain registry from backend
        loadChains: async () => {
          try {
            const [supported, mainnet] = await Promise.all([
              getSupportedChains(),
              getMainnetChains(),
            ]);
            set({
              supportedChains: supported,
              mainnetChains: mainnet,
              chainsLoaded: true,
            });
          } catch (error) {
            console.error("[WalletStore] Failed to load chains:", error);
          }
        },

        // Load wallets (placeholder - will integrate with DB later)
        loadWallets: async () => {
          set({ isLoading: true });
          try {
            // TODO: Implement get_wallets command
            // For now, wallets are populated from creation flow
            set({ isLoading: false });
          } catch (error) {
            console.error("Failed to load wallets:", error);
            set({ isLoading: false });
          }
        },

        selectWallet: (walletId) => {
          set({ selectedWalletId: walletId });
        },

        // Session management
        checkUnlockStatus: async () => {
          try {
            const unlocked = await isWalletUnlocked();
            set({ isUnlocked: unlocked });
          } catch (error) {
            console.error("Failed to check unlock status:", error);
          }
        },

        unlock: async (walletId, password) => {
          try {
            await unlockWallet(walletId, password);
            set({ isUnlocked: true });
          } catch (error) {
            console.error("Failed to unlock wallet:", error);
            throw error;
          }
        },

        lock: async () => {
          try {
            await lockWallet();
            set({ isUnlocked: false });
          } catch (error) {
            console.error("Failed to lock wallet:", error);
          }
        },

        // Wallet creation flow
        startCreation: () => {
          set({ creation: { ...initialCreationState } });
        },

        setCreationStep: (step) => {
          set((state) => ({
            creation: { ...state.creation, step, error: null },
          }));
        },

        setWalletName: (name) => {
          set((state) => ({
            creation: { ...state.creation, walletName: name },
          }));
        },

        toggleChainSelection: (chainId) => {
          // Deprecated: kept for backward compatibility
          set((state) => {
            const selected = state.creation.selectedChains;
            const newSelected = selected.includes(chainId)
              ? selected.filter((id) => id !== chainId)
              : [...selected, chainId];
            return {
              creation: { ...state.creation, selectedChains: newSelected },
            };
          });
        },

        toggleFamilySelection: (family) => {
          set((state) => {
            const selected = state.creation.selectedFamilies;
            const newSelected = selected.includes(family)
              ? selected.filter((f) => f !== family)
              : [...selected, family];
            // Also update selectedChains for backward compatibility
            const chainIds = familiesToChainIds(newSelected);
            return {
              creation: {
                ...state.creation,
                selectedFamilies: newSelected,
                selectedChains: chainIds,
              },
            };
          });
        },

        setPassword: (password) => {
          set((state) => ({
            creation: { ...state.creation, password },
          }));
        },

        createWallet: async () => {
          const { creation } = get();
          set({ isCreating: true });

          try {
            const response = await createHDWallet(
              creation.walletName,
              creation.selectedChains,
              creation.password,
              12
            );

            // Initialize Bitcoin BDK wallet if Bitcoin is included
            if (creation.selectedChains.includes("bitcoin")) {
              try {
                await initBitcoinFromCachedSeed(response.wallet_id, 0);
                console.log("[WalletStore] Bitcoin wallet initialized");
              } catch (btcError) {
                console.error("[WalletStore] Failed to init Bitcoin wallet:", btcError);
                // Continue anyway - sync will fail but wallet is still created
              }
            }

            // Create wallet entry
            const newWallet: HDWallet = {
              id: response.wallet_id,
              name: creation.walletName,
              type: "hd",
              hasBackupVerified: false,
              createdAt: new Date().toISOString(),
              addresses: response.addresses.map((addr) => ({
                chain: addr.chain,
                chainFamily: addr.chain_family,
                address: addr.address,
                derivationPath: addr.derivation_path,
                isPrimary: true,
              })),
            };

            set((state) => ({
              isCreating: false,
              creation: {
                ...state.creation,
                mnemonic: response.mnemonic,
                createdWalletId: response.wallet_id,
                derivedAddresses: response.addresses,
                step: "show-mnemonic",
                error: null,
              },
              wallets: [...state.wallets, newWallet],
              selectedWalletId: response.wallet_id,
              isUnlocked: true,
            }));
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to create wallet";
            set((state) => ({
              isCreating: false,
              creation: { ...state.creation, error: errorMessage },
            }));
            throw error;
          }
        },

        verifyMnemonicWord: (index, word) => {
          const { creation } = get();
          if (!creation.mnemonic) return false;
          const words = creation.mnemonic.split(" ");
          return words[index]?.toLowerCase() === word.toLowerCase();
        },

        confirmMnemonicBackup: () => {
          set((state) => {
            // Update the wallet's backup status
            const updatedWallets = state.wallets.map((w) =>
              w.id === state.creation.createdWalletId
                ? { ...w, hasBackupVerified: true }
                : w
            );

            return {
              creation: {
                ...state.creation,
                mnemonicVerified: true,
                step: "success",
              },
              wallets: updatedWallets,
            };
          });
        },

        resetCreation: () => {
          set({ creation: { ...initialCreationState } });
        },

        // Import wallet flow
        importWallet: async (name, mnemonic, chains, password) => {
          set({ isCreating: true });

          try {
            const response = await importHDWallet(name, mnemonic, chains, password);

            // Initialize Bitcoin BDK wallet if Bitcoin is included
            if (chains.includes("bitcoin")) {
              try {
                await initBitcoinFromCachedSeed(response.wallet_id, 0);
                console.log("[WalletStore] Bitcoin wallet initialized");
              } catch (btcError) {
                console.error("[WalletStore] Failed to init Bitcoin wallet:", btcError);
              }
            }

            const newWallet: HDWallet = {
              id: response.wallet_id,
              name,
              type: "hd",
              hasBackupVerified: true, // Imported wallets are considered backed up
              createdAt: new Date().toISOString(),
              addresses: response.addresses.map((addr) => ({
                chain: addr.chain,
                chainFamily: addr.chain_family,
                address: addr.address,
                derivationPath: addr.derivation_path,
                isPrimary: true,
              })),
            };

            set((state) => ({
              isCreating: false,
              wallets: [...state.wallets, newWallet],
              selectedWalletId: response.wallet_id,
              isUnlocked: true,
            }));

            return;
          } catch (error) {
            set({ isCreating: false });
            throw error;
          }
        },

        // Watch-only address
        addWatchOnlyAddress: async (name, chainId, address) => {
          const chain = useWalletStore.getState().supportedChains.find((c) => c.id === chainId);

          const walletId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Initialize BDK wallet for Bitcoin watch-only addresses
          if (chainId === "bitcoin") {
            try {
              await createBitcoinWatchWallet(walletId, address);
              console.log("[WalletStore] Bitcoin watch wallet initialized");
            } catch (btcError) {
              console.error("[WalletStore] Failed to init Bitcoin watch wallet:", btcError);
              // Still create the wallet entry, sync will just fail
            }
          }

          const newWallet: HDWallet = {
            id: walletId,
            name,
            type: "watch_only",
            hasBackupVerified: true, // Watch-only doesn't need backup
            createdAt: new Date().toISOString(),
            addresses: [
              {
                chain: chainId,
                chainFamily: chain?.family || "secp256k1",
                address,
                derivationPath: "",
                isPrimary: true,
              },
            ],
          };

          set((state) => ({
            wallets: [...state.wallets, newWallet],
            selectedWalletId: newWallet.id,
          }));
        },
      }),
      {
        name: "coinbox-wallet-store",
        // Only persist non-sensitive data
        partialize: (state) => ({
          wallets: state.wallets.map((w) => ({
            ...w,
            // Don't persist any potentially sensitive runtime data
          })),
          selectedWalletId: state.selectedWalletId,
        }),
      }
    ),
    { name: "WalletStore" }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectSelectedWallet = (state: WalletState) =>
  state.wallets.find((w) => w.id === state.selectedWalletId);

export const selectWalletsByChain = (state: WalletState, chainId: string) =>
  state.wallets.filter((w) => w.addresses.some((a) => a.chain === chainId));

export const selectChainById = (state: WalletState, chainId: string) =>
  state.supportedChains.find((c) => c.id === chainId);
