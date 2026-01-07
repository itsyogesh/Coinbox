/**
 * Crypto Icon Components
 *
 * Centralized crypto icons using @web3icons/react for consistent
 * chain and token icons across the app.
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
} from "@web3icons/react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ChainId =
  | "bitcoin"
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon"
  | "solana";

export type TokenSymbol =
  | "USDC"
  | "USDT"
  | "DAI"
  | "WBTC"
  | "WETH"
  | "LINK"
  | "UNI"
  | "ARB"
  | "OP"
  | "MATIC"
  | "WMATIC"
  | "cbETH";

interface IconProps {
  size?: number;
  className?: string;
  variant?: "mono" | "branded" | "background";
}

// ============================================================================
// Chain Icon Component
// ============================================================================

interface ChainIconProps extends IconProps {
  chainId: ChainId | string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chainIconMap: Record<string, React.ComponentType<any>> = {
  bitcoin: NetworkBitcoin,
  ethereum: NetworkEthereum,
  arbitrum: NetworkArbitrumOne,
  optimism: NetworkOptimism,
  base: NetworkBase,
  polygon: NetworkPolygon,
  solana: NetworkSolana,
};

/**
 * Chain/Network Icon Component
 *
 * Usage:
 * ```tsx
 * <ChainIcon chainId="ethereum" size={24} variant="branded" />
 * <ChainIcon chainId="bitcoin" size={32} />
 * ```
 */
export function ChainIcon({
  chainId,
  size = 24,
  className,
  variant = "branded",
}: ChainIconProps) {
  const IconComponent = chainIconMap[chainId.toLowerCase()];

  if (!IconComponent) {
    // Fallback for unknown chains
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {chainId.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <IconComponent
      size={size}
      variant={variant}
      className={className}
    />
  );
}

// ============================================================================
// Token Icon Component
// ============================================================================

interface TokenIconProps extends IconProps {
  symbol: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tokenIconMap: Record<string, React.ComponentType<any>> = {
  usdc: TokenUSDC,
  usdt: TokenUSDT,
  dai: TokenDAI,
  wbtc: TokenWBTC,
  weth: TokenETH, // Use ETH icon for WETH
  eth: TokenETH,
  link: TokenLINK,
  uni: TokenUNI,
  arb: TokenARB,
  op: TokenOP,
  matic: TokenMATIC,
  wmatic: TokenMATIC, // Same icon for WMATIC
  cbeth: TokenETH, // Use ETH icon as fallback for cbETH
};

/**
 * Token Icon Component
 *
 * Usage:
 * ```tsx
 * <TokenIcon symbol="USDC" size={24} variant="branded" />
 * <TokenIcon symbol="ETH" size={32} />
 * ```
 */
export function TokenIcon({
  symbol,
  size = 24,
  className,
  variant = "branded",
}: TokenIconProps) {
  const normalizedSymbol = symbol.toLowerCase();
  const IconComponent = tokenIconMap[normalizedSymbol];

  if (!IconComponent) {
    // Fallback for unknown tokens
    return (
      <div
        className={cn(
          "rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <IconComponent
      size={size}
      variant={variant}
      className={className}
    />
  );
}

// ============================================================================
// Combined Icon Component (for flexibility)
// ============================================================================

interface CryptoIconProps extends IconProps {
  /** Chain ID (e.g., 'bitcoin', 'ethereum') */
  chainId?: ChainId | string;
  /** Token symbol (e.g., 'USDC', 'ETH') */
  symbol?: string;
}

/**
 * Universal Crypto Icon Component
 *
 * Can render either a chain icon or token icon based on props.
 *
 * Usage:
 * ```tsx
 * <CryptoIcon chainId="ethereum" size={24} />
 * <CryptoIcon symbol="USDC" size={24} />
 * ```
 */
export function CryptoIcon({
  chainId,
  symbol,
  size = 24,
  className,
  variant = "branded",
}: CryptoIconProps) {
  if (chainId) {
    return (
      <ChainIcon
        chainId={chainId}
        size={size}
        className={className}
        variant={variant}
      />
    );
  }

  if (symbol) {
    return (
      <TokenIcon
        symbol={symbol}
        size={size}
        className={className}
        variant={variant}
      />
    );
  }

  // Fallback
  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      ?
    </div>
  );
}

// ============================================================================
// Chain Info Helper
// ============================================================================

export interface ChainInfo {
  id: ChainId;
  name: string;
  symbol: string;
  color: string;
}

export const CHAIN_INFO: Record<ChainId, ChainInfo> = {
  bitcoin: {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    color: "#F7931A",
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    color: "#627EEA",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ETH",
    color: "#28A0F0",
  },
  optimism: {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    color: "#FF0420",
  },
  base: {
    id: "base",
    name: "Base",
    symbol: "ETH",
    color: "#0052FF",
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    color: "#8247E5",
  },
  solana: {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    color: "#14F195",
  },
};

/**
 * Get chain info by ID
 */
export function getChainInfo(chainId: string): ChainInfo | undefined {
  return CHAIN_INFO[chainId as ChainId];
}
