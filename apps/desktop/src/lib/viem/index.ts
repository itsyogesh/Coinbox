/**
 * Viem integration for EVM chains
 *
 * This module provides:
 * - Public client factory for read-only RPC operations
 * - Wallet client factory with Tauri signing bridge
 * - TauriAccount for secure signing via Rust backend
 * - Balance and gas utilities
 *
 * Chain configurations are now in @coinbox/chains package.
 */

// Re-export chain types from @coinbox/chains for backward compatibility
export { type EVMChainId, isEVMChainId as isEVMChain } from "@coinbox/chains";

// Client factory and utilities
export {
  getPublicClient,
  getWalletClient,
  clearClientCache,
  clearChainClient,
  fetchNativeBalance,
  fetchGasPrice,
  estimateGas,
  getBlockNumber,
  testRpcConnection,
  type EthereumBalance,
} from "./clients";

// Tauri-backed account for secure signing
export {
  createTauriAccount,
  isTauriAccount,
  type TauriAccountOptions,
} from "./tauriAccount";

// Unit conversion utilities
export {
  formatEther,
  parseEther,
  formatUnits,
  parseUnits,
  formatWei,
  parseToWei,
  formatGwei,
  type Address,
  type Account,
  type PublicClient,
  type WalletClient,
} from "./clients";

// ERC-20 Token support
export {
  fetchTokenBalances,
  fetchTokenMetadata,
  type TokenBalance,
} from "./tokens";

// Block explorer API (Etherscan)
export {
  fetchEthTransactions,
  fetchTokenTransfers,
  fetchAllTransactions,
  setApiKey as setExplorerApiKey,
  type TransactionRecord,
} from "./etherscan";
