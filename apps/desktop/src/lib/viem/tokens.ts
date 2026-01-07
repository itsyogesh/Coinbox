/**
 * ERC-20 Token Balance Fetching
 *
 * Provides multicall-based token balance fetching.
 * Token definitions come from @coinbox/chains.
 */

import { erc20Abi, type Address } from "viem";
import { getPublicClient } from "./clients";
import { getChain, type EVMChainId } from "@coinbox/chains";

// ============================================================================
// Token Types
// ============================================================================

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // Raw balance as string (for JSON serialization)
  formattedBalance: string;
  coingeckoId?: string;
}

// ============================================================================
// Token Balance Fetching
// ============================================================================

/**
 * Fetch token balances using multicall for efficiency
 */
export async function fetchTokenBalances(
  address: Address,
  chainId: EVMChainId
): Promise<TokenBalance[]> {
  const chainDef = getChain(chainId);
  const tokens = chainDef?.tokens ?? [];
  if (tokens.length === 0) {
    return [];
  }

  const client = getPublicClient(chainId);

  try {
    // Use multicall to fetch all balances in a single RPC call
    const results = await client.multicall({
      contracts: tokens.map((token) => ({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })),
      allowFailure: true,
    });

    const balances: TokenBalance[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const result = results[i];

      // Skip if token or result is undefined
      if (!token || !result) continue;

      if (result.status === "success" && result.result) {
        const rawBalance = result.result as bigint;

        // Only include tokens with non-zero balance
        if (rawBalance > 0n) {
          const formattedBalance = formatTokenBalance(
            rawBalance,
            token.decimals
          );

          balances.push({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: rawBalance.toString(),
            formattedBalance,
            coingeckoId: token.coingeckoId,
          });
        }
      }
    }

    return balances;
  } catch (error) {
    console.error(
      `[Tokens] Failed to fetch token balances on ${chainId}:`,
      error
    );
    return [];
  }
}

/**
 * Format token balance with proper decimals
 */
function formatTokenBalance(balance: bigint, decimals: number): string {
  if (balance === 0n) return "0";

  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  if (fractionalPart === 0n) {
    return integerPart.toString();
  }

  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  // Remove trailing zeros
  const trimmedFractional = fractionalStr.replace(/0+$/, "");

  if (trimmedFractional === "") {
    return integerPart.toString();
  }

  // Limit to 6 decimal places for display
  const displayFractional = trimmedFractional.slice(0, 6);

  return `${integerPart}.${displayFractional}`;
}
