/**
 * Etherscan API Service
 *
 * Fetches transaction history from Etherscan-compatible APIs.
 * Supports Ethereum mainnet and L2 block explorers.
 */

import { getChain, type EVMChainId } from "@coinbox/chains";
import type { Address } from "viem";

// ============================================================================
// Types
// ============================================================================

interface EtherscanTx {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  methodId: string;
  functionName: string;
}

interface EtherscanTokenTx {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
  contractAddress: string;
}

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T[] | string;
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
// API Configuration
// ============================================================================

/**
 * Get block explorer API URL for a chain
 */
function getExplorerApiUrl(chainId: EVMChainId): string | null {
  const chain = getChain(chainId);
  return chain?.explorerApiUrl ?? null;
}

/**
 * Block explorer API keys (optional, for higher rate limits)
 * Users can configure these in settings
 */
let apiKeys: Record<string, string> = {};

export function setApiKey(chainId: EVMChainId, key: string): void {
  apiKeys[chainId] = key;
}

export function getApiKey(chainId: EVMChainId): string {
  return apiKeys[chainId] ?? "";
}

// ============================================================================
// Transaction Fetching
// ============================================================================

/**
 * Fetch normal (ETH) transactions for an address
 */
export async function fetchEthTransactions(
  address: Address,
  chainId: EVMChainId,
  options: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: "asc" | "desc";
  } = {}
): Promise<TransactionRecord[]> {
  const apiUrl = getExplorerApiUrl(chainId);
  if (!apiUrl) {
    console.warn(`[Etherscan] No API URL for chain: ${chainId}`);
    return [];
  }

  const {
    startBlock = 0,
    endBlock = 99999999,
    page = 1,
    offset = 50,
    sort = "desc",
  } = options;

  const apiKey = getApiKey(chainId);
  const params = new URLSearchParams({
    module: "account",
    action: "txlist",
    address,
    startblock: startBlock.toString(),
    endblock: endBlock.toString(),
    page: page.toString(),
    offset: offset.toString(),
    sort,
    ...(apiKey && { apikey: apiKey }),
  });

  try {
    const response = await fetch(`${apiUrl}/api?${params}`);
    const data: EtherscanResponse<EtherscanTx> = await response.json();

    if (data.status !== "1" || typeof data.result === "string") {
      // "No transactions found" is not an error
      if (data.message === "No transactions found") {
        return [];
      }
      console.warn(`[Etherscan] API warning: ${data.message}`);
      return [];
    }

    return data.result.map((tx) =>
      transformEthTransaction(tx, address, chainId)
    );
  } catch (error) {
    console.error(`[Etherscan] Failed to fetch transactions:`, error);
    return [];
  }
}

/**
 * Fetch ERC-20 token transfers for an address
 */
export async function fetchTokenTransfers(
  address: Address,
  chainId: EVMChainId,
  options: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: "asc" | "desc";
  } = {}
): Promise<TransactionRecord[]> {
  const apiUrl = getExplorerApiUrl(chainId);
  if (!apiUrl) {
    return [];
  }

  const {
    startBlock = 0,
    endBlock = 99999999,
    page = 1,
    offset = 50,
    sort = "desc",
  } = options;

  const apiKey = getApiKey(chainId);
  const params = new URLSearchParams({
    module: "account",
    action: "tokentx",
    address,
    startblock: startBlock.toString(),
    endblock: endBlock.toString(),
    page: page.toString(),
    offset: offset.toString(),
    sort,
    ...(apiKey && { apikey: apiKey }),
  });

  try {
    const response = await fetch(`${apiUrl}/api?${params}`);
    const data: EtherscanResponse<EtherscanTokenTx> = await response.json();

    if (data.status !== "1" || typeof data.result === "string") {
      if (data.message === "No transactions found") {
        return [];
      }
      console.warn(`[Etherscan] Token API warning: ${data.message}`);
      return [];
    }

    return data.result.map((tx) =>
      transformTokenTransaction(tx, address, chainId)
    );
  } catch (error) {
    console.error(`[Etherscan] Failed to fetch token transfers:`, error);
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

  // Determine status
  let status: TransactionRecord["status"] = "success";
  if (tx.isError === "1" || tx.txreceipt_status === "0") {
    status = "failed";
  }

  return {
    hash: tx.hash,
    chainId,
    blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 10) : null,
    timestamp: parseInt(tx.timeStamp, 10),
    from: tx.from,
    to: tx.to || null,
    value: tx.value,
    gasUsed: tx.gasUsed,
    gasPrice: tx.gasPrice,
    status,
    direction,
    methodId: tx.methodId !== "0x" ? tx.methodId : undefined,
    functionName: tx.functionName || undefined,
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
    blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 10) : null,
    timestamp: parseInt(tx.timeStamp, 10),
    from: tx.from,
    to: tx.to || null,
    value: "0", // Token transfer, not ETH
    gasUsed: "0",
    gasPrice: "0",
    status: "success",
    direction,
    tokenTransfer: {
      symbol: tx.tokenSymbol,
      name: tx.tokenName,
      decimals: parseInt(tx.tokenDecimal, 10),
      value: tx.value,
      contractAddress: tx.contractAddress,
    },
  };
}
