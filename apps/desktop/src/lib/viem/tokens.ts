/**
 * ERC-20 Token Definitions and Fetching
 *
 * Common tokens for each EVM chain with multicall balance fetching.
 *
 * @deprecated Token definitions are now in the chain registry.
 * Use: `import { ETHEREUM_TOKENS, getToken } from '@/lib/chains'`
 *
 * The balance fetching functions in this file are still used.
 * Token metadata should come from the registry (which includes coingeckoId for prices).
 */

import { erc20Abi, type Address } from "viem";
import { getPublicClient } from "./clients";
import { type EVMChainId } from "./chains";

// ============================================================================
// Token Definitions
// ============================================================================

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

export interface TokenBalance extends TokenInfo {
  balance: string; // Raw balance as string (for JSON serialization)
  formattedBalance: string;
}

// Common tokens by chain
export const COMMON_TOKENS: Record<EVMChainId, TokenInfo[]> = {
  ethereum: [
    {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    {
      address: "0x6B175474E89094C44Da98b954EescdeCB5BE3830",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      symbol: "WBTC",
      name: "Wrapped BTC",
      decimals: 8,
    },
    {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    {
      address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      symbol: "LINK",
      name: "Chainlink",
      decimals: 18,
    },
    {
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      symbol: "UNI",
      name: "Uniswap",
      decimals: 18,
    },
  ],
  arbitrum: [
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    {
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      symbol: "WBTC",
      name: "Wrapped BTC",
      decimals: 8,
    },
    {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    {
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      symbol: "ARB",
      name: "Arbitrum",
      decimals: 18,
    },
  ],
  optimism: [
    {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    {
      address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
      symbol: "WBTC",
      name: "Wrapped BTC",
      decimals: 8,
    },
    {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    {
      address: "0x4200000000000000000000000000000000000042",
      symbol: "OP",
      name: "Optimism",
      decimals: 18,
    },
  ],
  base: [
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    {
      address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
      symbol: "cbETH",
      name: "Coinbase Wrapped Staked ETH",
      decimals: 18,
    },
  ],
  polygon: [
    {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    {
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
    },
    {
      address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      symbol: "WBTC",
      name: "Wrapped BTC",
      decimals: 8,
    },
    {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
    },
    {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      symbol: "WMATIC",
      name: "Wrapped Matic",
      decimals: 18,
    },
  ],
};

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
  const tokens = COMMON_TOKENS[chainId];
  if (!tokens || tokens.length === 0) {
    return [];
  }

  const client = getPublicClient(chainId);

  try {
    // Use multicall to fetch all balances in a single RPC call
    const results = await client.multicall({
      contracts: tokens.map((token) => ({
        address: token.address,
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
            logoUrl: token.logoUrl,
            balance: rawBalance.toString(),
            formattedBalance,
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

/**
 * Get token info by address
 */
export function getTokenInfo(
  chainId: EVMChainId,
  tokenAddress: Address
): TokenInfo | undefined {
  const tokens = COMMON_TOKENS[chainId];
  return tokens?.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
}
