/**
 * Viem integration for EVM chains
 *
 * This module provides:
 * - Chain configurations for Ethereum + L2s
 * - Public client factory for read-only RPC operations
 * - Wallet client factory with Tauri signing bridge
 * - TauriAccount for secure signing via Rust backend
 * - Balance and gas utilities
 */

// Chain configurations
export {
  type EVMChainId,
  type TestnetChainId,
  type ChainConfig,
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  ALL_CHAINS,
  EVM_CHAIN_IDS,
  getChainConfig,
  isEVMChain,
  isTestnet,
  getChainIdNumber,
} from "./chains";

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
  getTokenInfo,
  COMMON_TOKENS,
  type TokenInfo,
  type TokenBalance,
} from "./tokens";
