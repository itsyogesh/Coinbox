/**
 * Token Definitions
 *
 * Common ERC-20 tokens for each EVM chain.
 * Each token includes coingeckoId for price lookups.
 */
import type { TokenDefinition } from './types';
export declare const ETHEREUM_TOKENS: TokenDefinition[];
export declare const ARBITRUM_TOKENS: TokenDefinition[];
export declare const OPTIMISM_TOKENS: TokenDefinition[];
export declare const BASE_TOKENS: TokenDefinition[];
export declare const POLYGON_TOKENS: TokenDefinition[];
/**
 * Get all unique CoinGecko IDs for price fetching
 */
export declare function getAllCoingeckoIds(): string[];
//# sourceMappingURL=tokens.d.ts.map