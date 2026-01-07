/**
 * Chain Registry Types
 *
 * Central type definitions for all blockchain networks supported by Coinbox.
 * Chains are grouped by "family" - chains that share the same address derivation.
 */

// ============================================================================
// Chain Family
// ============================================================================

/**
 * Chain Family - groups chains by address derivation.
 * Chains in the same family share the same address from the same seed phrase.
 */
export type ChainFamily = 'bitcoin' | 'evm' | 'solana';

/**
 * Chain Layer classification
 */
export type ChainLayer = 'L1' | 'L2';

// ============================================================================
// Native Currency
// ============================================================================

/**
 * Native currency for a chain (e.g., ETH for Ethereum, BTC for Bitcoin)
 */
export interface NativeCurrency {
  /** Display name (e.g., "Ether", "Bitcoin") */
  name: string;
  /** Symbol (e.g., "ETH", "BTC") */
  symbol: string;
  /** Decimals (e.g., 18 for ETH, 8 for BTC) */
  decimals: number;
  /** CoinGecko ID for price lookup */
  coingeckoId: string;
}

// ============================================================================
// Token Definition
// ============================================================================

/**
 * ERC-20 or similar token definition
 */
export interface TokenDefinition {
  /** Contract address */
  address: string;
  /** Token symbol (e.g., "USDC") */
  symbol: string;
  /** Token name (e.g., "USD Coin") */
  name: string;
  /** Token decimals */
  decimals: number;
  /** CoinGecko ID for price lookup */
  coingeckoId: string;
  /** Optional logo URL */
  logoUrl?: string;
}

// ============================================================================
// Chain Definition
// ============================================================================

/**
 * Complete chain definition with all metadata
 */
export interface ChainDefinition {
  // === Identity ===
  /** Unique chain identifier (e.g., 'ethereum', 'arbitrum') */
  id: string;
  /** EVM chain ID (only for EVM chains) */
  chainId?: number;
  /** Full display name (e.g., "Ethereum", "Arbitrum One") */
  name: string;
  /** Short display name (e.g., "ETH", "ARB") */
  shortName: string;

  // === Classification ===
  /** Chain family for address derivation grouping */
  family: ChainFamily;
  /** Layer classification (L1 or L2) */
  layer: ChainLayer;
  /** Parent chain ID for L2s (e.g., 'ethereum' for Arbitrum) */
  parentId?: string;

  // === Native Currency ===
  /** Native currency configuration */
  nativeCurrency: NativeCurrency;

  // === Branding ===
  /** @web3icons/react component name (e.g., 'NetworkEthereum') */
  iconComponent: string;
  /** Brand color in hex (e.g., '#627EEA') */
  brandColor: string;

  // === Network ===
  /** Default RPC URL */
  rpcUrl: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Block explorer API URL (optional) */
  explorerApiUrl?: string;

  // === Tokens ===
  /** Common tokens on this chain */
  tokens: TokenDefinition[];

  // === Flags ===
  /** Whether this is a testnet */
  isTestnet: boolean;
  /** Whether this chain is enabled in the app */
  isEnabled: boolean;
}

// ============================================================================
// Chain Family Definition
// ============================================================================

/**
 * Family definition for UI grouping and display
 */
export interface ChainFamilyDefinition {
  /** Family identifier */
  id: ChainFamily;
  /** Display name (e.g., "Bitcoin", "Ethereum") */
  name: string;
  /** Description for onboarding */
  description: string;
  /** Representative icon component */
  iconComponent: string;
  /** Brand color */
  brandColor: string;
  /** Primary chain ID (e.g., 'ethereum' for EVM family) */
  primaryChainId: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * EVM Chain ID type (subset of ChainDefinition['id'] for EVM chains)
 */
export type EVMChainId = 'ethereum' | 'arbitrum' | 'optimism' | 'base' | 'polygon';

/**
 * Check if a chain ID is an EVM chain
 */
export function isEVMChainId(chainId: string): chainId is EVMChainId {
  return ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'].includes(chainId);
}
