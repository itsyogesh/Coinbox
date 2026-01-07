/**
 * Chain Icon Mappings
 *
 * Maps chain iconComponent strings from the registry to actual React components.
 * This bridges @coinbox/core registry to @web3icons/react.
 */

import {
  NetworkBitcoin,
  NetworkEthereum,
  NetworkArbitrumOne,
  NetworkOptimism,
  NetworkBase,
  NetworkPolygon,
  NetworkSolana,
  TokenUSDC,
  TokenUSDT,
  TokenDAI,
  TokenWBTC,
  TokenETH,
  TokenLINK,
  TokenUNI,
  TokenARB,
  TokenOP,
  TokenMATIC,
  TokenPOL,
} from "@web3icons/react";
import type { ComponentType } from "react";

// ============================================================================
// Chain Icon Components
// ============================================================================

/**
 * Map iconComponent strings to actual React components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHAIN_ICON_COMPONENTS: Record<string, ComponentType<any>> = {
  NetworkBitcoin,
  NetworkEthereum,
  NetworkArbitrumOne,
  NetworkOptimism,
  NetworkBase,
  NetworkPolygon,
  NetworkSolana,
};

/**
 * Get the icon component for a chain by iconComponent string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getChainIconComponent(iconComponent: string): ComponentType<any> | undefined {
  return CHAIN_ICON_COMPONENTS[iconComponent];
}

// ============================================================================
// Token Icon Components
// ============================================================================

/**
 * Map token symbols to icon components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOKEN_ICON_COMPONENTS: Record<string, ComponentType<any>> = {
  // Stablecoins
  USDC: TokenUSDC,
  USDT: TokenUSDT,
  DAI: TokenDAI,

  // Wrapped assets
  WBTC: TokenWBTC,
  WETH: TokenETH,
  ETH: TokenETH,

  // DeFi tokens
  LINK: TokenLINK,
  UNI: TokenUNI,

  // L2 native tokens
  ARB: TokenARB,
  OP: TokenOP,

  // Polygon
  MATIC: TokenMATIC,
  WMATIC: TokenMATIC,
  POL: TokenPOL,
  WPOL: TokenPOL,

  // Coinbase
  cbETH: TokenETH, // Use ETH icon as fallback
};

/**
 * Get the icon component for a token by symbol
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTokenIconComponent(symbol: string): ComponentType<any> | undefined {
  return TOKEN_ICON_COMPONENTS[symbol.toUpperCase()];
}

// ============================================================================
// Unified Icon Lookup
// ============================================================================

/**
 * Get icon component for either a chain or token
 */
export function getIconComponent(
  type: "chain" | "token",
  identifier: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ComponentType<any> | undefined {
  if (type === "chain") {
    return CHAIN_ICON_COMPONENTS[identifier];
  }
  return TOKEN_ICON_COMPONENTS[identifier.toUpperCase()];
}
