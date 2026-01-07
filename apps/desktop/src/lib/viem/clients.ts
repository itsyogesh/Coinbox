/**
 * Viem client factory for EVM chains
 * Creates public clients for read-only RPC operations
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Account,
  type Chain,
  type Transport,
  formatEther,
  parseEther,
  formatUnits,
  parseUnits,
  type Address,
} from "viem";
import { getChain, type EVMChainId } from "@coinbox/chains";
import { getViemChainOrThrow } from "@/lib/chains";
import { useSettingsStore } from "@/stores/settingsStore";

// Cache for public clients to avoid recreating them
const publicClientCache: Map<string, PublicClient> = new Map();

/**
 * Get custom RPC URL from settings if configured
 */
function getCustomRpcUrl(chainId: EVMChainId): string | undefined {
  try {
    return useSettingsStore.getState().getRpcUrl(chainId);
  } catch {
    // Settings store may not be initialized yet
    return undefined;
  }
}

/**
 * Get or create a public client for the specified chain
 * Public clients are used for read-only operations (getBalance, getBlock, etc.)
 *
 * If customRpcUrl is provided, it takes precedence.
 * Otherwise, checks settings store for user-configured RPC.
 * Falls back to default RPC from chain registry.
 */
export function getPublicClient(
  chainId: EVMChainId,
  customRpcUrl?: string
): PublicClient {
  // Check settings for user-configured RPC if not explicitly provided
  const settingsRpcUrl = customRpcUrl ? undefined : getCustomRpcUrl(chainId);
  const effectiveRpcUrl = customRpcUrl || settingsRpcUrl;

  const cacheKey = effectiveRpcUrl ? `${chainId}:${effectiveRpcUrl}` : chainId;

  // Return cached client if available
  const cached = publicClientCache.get(cacheKey);
  if (cached) return cached;

  const chainDef = getChain(chainId);
  if (!chainDef) {
    throw new Error(`Unknown chain: ${chainId}`);
  }

  const viemChain = getViemChainOrThrow(chainId);
  const rpcUrl = effectiveRpcUrl || chainDef.rpcUrl;

  const client = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl, {
      timeout: 30_000, // 30 second timeout
      retryCount: 3,
      retryDelay: 1000,
    }),
  });

  // Cache the client
  publicClientCache.set(cacheKey, client);

  return client;
}

/**
 * Create a wallet client for signing and sending transactions
 * The account parameter is required and should be a TauriAccount
 *
 * Uses settings store RPC if configured, otherwise falls back to default.
 */
export function getWalletClient(
  chainId: EVMChainId,
  account: Account,
  customRpcUrl?: string
): WalletClient<Transport, Chain, Account> {
  const chainDef = getChain(chainId);
  if (!chainDef) {
    throw new Error(`Unknown chain: ${chainId}`);
  }

  // Check settings for user-configured RPC if not explicitly provided
  const settingsRpcUrl = customRpcUrl ? undefined : getCustomRpcUrl(chainId);
  const effectiveRpcUrl = customRpcUrl || settingsRpcUrl;

  const viemChain = getViemChainOrThrow(chainId);
  const rpcUrl = effectiveRpcUrl || chainDef.rpcUrl;

  return createWalletClient({
    account,
    chain: viemChain,
    transport: http(rpcUrl, {
      timeout: 30_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  });
}

/**
 * Clear the client cache (useful when RPC URLs change)
 */
export function clearClientCache(): void {
  publicClientCache.clear();
}

/**
 * Clear a specific chain's cached client
 */
export function clearChainClient(chainId: string): void {
  // Clear all entries for this chain (including custom RPC variants)
  for (const key of publicClientCache.keys()) {
    if (key === chainId || key.startsWith(`${chainId}:`)) {
      publicClientCache.delete(key);
    }
  }
}

// ============================================================================
// Balance utilities
// ============================================================================

export interface EthereumBalance {
  wei: string; // Stored as string for JSON serialization (BigInt can't be serialized)
  formatted: string; // Human readable (e.g., "1.5")
  symbol: string;
}

/**
 * Fetch native token balance for an address
 */
export async function fetchNativeBalance(
  address: Address,
  chainId: EVMChainId
): Promise<EthereumBalance> {
  const client = getPublicClient(chainId);
  const chainDef = getChain(chainId);

  const balance = await client.getBalance({ address });

  return {
    wei: balance.toString(), // Convert BigInt to string for JSON serialization
    formatted: formatEther(balance),
    symbol: chainDef?.nativeCurrency.symbol ?? "ETH",
  };
}

/**
 * Fetch gas price for a chain
 */
export async function fetchGasPrice(chainId: EVMChainId): Promise<bigint> {
  const client = getPublicClient(chainId);
  return client.getGasPrice();
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  chainId: EVMChainId,
  params: {
    from: Address;
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }
): Promise<bigint> {
  const client = getPublicClient(chainId);
  return client.estimateGas({
    account: params.from,
    to: params.to,
    value: params.value,
    data: params.data,
  });
}

/**
 * Get current block number
 */
export async function getBlockNumber(chainId: EVMChainId): Promise<bigint> {
  const client = getPublicClient(chainId);
  return client.getBlockNumber();
}

/**
 * Test RPC connection
 */
export async function testRpcConnection(
  chainId: EVMChainId,
  rpcUrl?: string
): Promise<{ success: boolean; blockNumber?: bigint; error?: string }> {
  try {
    // Create a fresh client (don't use cache for testing)
    const chainDef = getChain(chainId);
    if (!chainDef) {
      return { success: false, error: `Unknown chain: ${chainId}` };
    }

    const viemChain = getViemChainOrThrow(chainId);
    const client = createPublicClient({
      chain: viemChain,
      transport: http(rpcUrl || chainDef.rpcUrl, { timeout: 10_000 }),
    });

    const blockNumber = await client.getBlockNumber();
    return { success: true, blockNumber };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

// ============================================================================
// Unit conversion utilities (re-exported from viem)
// ============================================================================

export {
  formatEther,
  parseEther,
  formatUnits,
  parseUnits,
  type Address,
  type Account,
  type PublicClient,
  type WalletClient,
};

/**
 * Format wei to a human-readable string with specified decimals
 */
export function formatWei(wei: bigint, decimals: number = 18): string {
  return formatUnits(wei, decimals);
}

/**
 * Parse a human-readable amount to wei
 */
export function parseToWei(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}

/**
 * Format gas price to Gwei
 */
export function formatGwei(wei: bigint): string {
  return formatUnits(wei, 9);
}
