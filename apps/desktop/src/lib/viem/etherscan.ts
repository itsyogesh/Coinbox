/**
 * Etherscan API Service (V2)
 *
 * Fetches transaction history from Etherscan V2 unified API.
 * Uses Tauri command to bypass CORS restrictions.
 *
 * @see https://docs.etherscan.io/v2-migration
 */

import { invoke } from "@tauri-apps/api/core";
import { getChain, type EVMChainId } from "@coinbox/chains";
import type { Address } from "viem";
import { useSettingsStore } from "@/stores/settingsStore";

// ============================================================================
// Types
// ============================================================================

interface EtherscanTx {
  hash: string;
  block_number: string;
  timestamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gas_used: string;
  gas_price: string;
  is_error: string;
  txreceipt_status: string | null;
  method_id: string | null;
  function_name: string | null;
}

interface EtherscanTokenTx {
  hash: string;
  block_number: string;
  timestamp: string;
  from: string;
  to: string;
  value: string;
  token_symbol: string;
  token_name: string;
  token_decimal: string;
  contract_address: string;
}

interface TauriEtherscanResult {
  transactions: EtherscanTx[];
  token_transfers: EtherscanTokenTx[];
  error: string | null;
}

export interface TransactionRecord {
  hash: string;
  chainId: EVMChainId;
  blockNumber: number | null;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: "success" | "failed" | "pending";
  direction: "send" | "receive" | "self" | "contract";
  // Token transfer info (if applicable)
  tokenTransfer?: {
    symbol: string;
    name: string;
    decimals: number;
    value: string;
    contractAddress: string;
  };
  // Method info for contract interactions
  methodId?: string;
  functionName?: string;
}

// ============================================================================
// API Configuration - Etherscan V2
// ============================================================================

/**
 * Map EVMChainId to numeric chain ID for Etherscan V2 API
 */
function getNumericChainId(chainId: EVMChainId): number | null {
  const chain = getChain(chainId);
  return chain?.chainId ?? null;
}

/**
 * Get Etherscan API key from settings store
 * V2 uses a single key for all chains
 */
function getApiKeyFromSettings(): string | null {
  const apiKey = useSettingsStore.getState().apiKeys.etherscan;
  return apiKey || null;
}

// ============================================================================
// Transaction Fetching (via Tauri backend to bypass CORS)
// ============================================================================

/**
 * Fetch transactions from Etherscan via Tauri command
 * This bypasses CORS restrictions by routing through Rust backend
 */
export async function fetchEthTransactions(
  address: Address,
  chainId: EVMChainId,
  _options: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: "asc" | "desc";
  } = {}
): Promise<TransactionRecord[]> {
  const numericChainId = getNumericChainId(chainId);
  if (!numericChainId) {
    console.warn(`[Etherscan] No chain ID for: ${chainId}`);
    return [];
  }

  try {
    const apiKey = getApiKeyFromSettings();
    console.log(`[Etherscan V2] Fetching ${chainId} (${numericChainId}) transactions via Tauri...`);

    const result = await invoke<TauriEtherscanResult>("fetch_etherscan_transactions", {
      address,
      chainId: numericChainId,
      apiKey,
    });

    if (result.error) {
      console.warn(`[Etherscan V2] API warning for ${chainId}: ${result.error}`);
    }

    console.log(`[Etherscan V2] Found ${result.transactions.length} transactions on ${chainId}`);
    return result.transactions.map((tx) =>
      transformEthTransaction(tx, address, chainId)
    );
  } catch (error) {
    console.error(`[Etherscan V2] Failed to fetch ${chainId} transactions:`, error);
    return [];
  }
}

/**
 * Fetch ERC-20 token transfers from Etherscan via Tauri command
 */
export async function fetchTokenTransfers(
  address: Address,
  chainId: EVMChainId,
  _options: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: "asc" | "desc";
  } = {}
): Promise<TransactionRecord[]> {
  const numericChainId = getNumericChainId(chainId);
  if (!numericChainId) {
    console.warn(`[Etherscan V2] No chain ID for: ${chainId}`);
    return [];
  }

  try {
    const apiKey = getApiKeyFromSettings();
    console.log(`[Etherscan V2] Fetching ${chainId} (${numericChainId}) token transfers via Tauri...`);

    const result = await invoke<TauriEtherscanResult>("fetch_etherscan_transactions", {
      address,
      chainId: numericChainId,
      apiKey,
    });

    console.log(`[Etherscan V2] Found ${result.token_transfers.length} token transfers on ${chainId}`);
    return result.token_transfers.map((tx) =>
      transformTokenTransaction(tx, address, chainId)
    );
  } catch (error) {
    console.error(`[Etherscan V2] Failed to fetch ${chainId} token transfers:`, error);
    return [];
  }
}

/**
 * Fetch all transactions (ETH + tokens) and merge them
 */
export async function fetchAllTransactions(
  address: Address,
  chainId: EVMChainId,
  options: {
    limit?: number;
  } = {}
): Promise<TransactionRecord[]> {
  const { limit = 100 } = options;

  // Fetch both in parallel
  const [ethTxs, tokenTxs] = await Promise.all([
    fetchEthTransactions(address, chainId, { offset: limit }),
    fetchTokenTransfers(address, chainId, { offset: limit }),
  ]);

  // Merge and sort by timestamp (most recent first)
  const allTxs = [...ethTxs, ...tokenTxs];
  allTxs.sort((a, b) => b.timestamp - a.timestamp);

  // Deduplicate by hash (token transfers may overlap with ETH txs)
  const seen = new Set<string>();
  const deduped: TransactionRecord[] = [];

  for (const tx of allTxs) {
    // For token transfers, use hash + contract for uniqueness
    const key = tx.tokenTransfer
      ? `${tx.hash}-${tx.tokenTransfer.contractAddress}`
      : tx.hash;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(tx);
    }
  }

  return deduped.slice(0, limit);
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformEthTransaction(
  tx: EtherscanTx,
  userAddress: Address,
  chainId: EVMChainId
): TransactionRecord {
  const from = tx.from.toLowerCase();
  const to = tx.to?.toLowerCase() ?? null;
  const user = userAddress.toLowerCase();

  let direction: TransactionRecord["direction"];
  if (from === user && to === user) {
    direction = "self";
  } else if (from === user) {
    direction = "send";
  } else if (to === user) {
    direction = "receive";
  } else {
    direction = "contract";
  }

  // Determine status (using snake_case from Rust backend)
  let status: TransactionRecord["status"] = "success";
  if (tx.is_error === "1" || tx.txreceipt_status === "0") {
    status = "failed";
  }

  return {
    hash: tx.hash,
    chainId,
    blockNumber: tx.block_number ? parseInt(tx.block_number, 10) : null,
    timestamp: parseInt(tx.timestamp, 10),
    from: tx.from,
    to: tx.to || null,
    value: tx.value,
    gasUsed: tx.gas_used,
    gasPrice: tx.gas_price,
    status,
    direction,
    methodId: tx.method_id && tx.method_id !== "0x" ? tx.method_id : undefined,
    functionName: tx.function_name || undefined,
  };
}

function transformTokenTransaction(
  tx: EtherscanTokenTx,
  userAddress: Address,
  chainId: EVMChainId
): TransactionRecord {
  const from = tx.from.toLowerCase();
  const to = tx.to?.toLowerCase() ?? null;
  const user = userAddress.toLowerCase();

  let direction: TransactionRecord["direction"];
  if (from === user && to === user) {
    direction = "self";
  } else if (from === user) {
    direction = "send";
  } else if (to === user) {
    direction = "receive";
  } else {
    direction = "contract";
  }

  return {
    hash: tx.hash,
    chainId,
    blockNumber: tx.block_number ? parseInt(tx.block_number, 10) : null,
    timestamp: parseInt(tx.timestamp, 10),
    from: tx.from,
    to: tx.to || null,
    value: "0", // Token transfer, not ETH
    gasUsed: "0",
    gasPrice: "0",
    status: "success",
    direction,
    tokenTransfer: {
      symbol: tx.token_symbol,
      name: tx.token_name,
      decimals: parseInt(tx.token_decimal, 10),
      value: tx.value,
      contractAddress: tx.contract_address,
    },
  };
}
