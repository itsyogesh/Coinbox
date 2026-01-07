/**
 * Chain Registry Helpers
 *
 * Utility functions for working with chains and families.
 */
import type { ChainDefinition, ChainFamily, ChainFamilyDefinition, TokenDefinition } from './types';
/**
 * Get a chain definition by ID
 */
export declare function getChain(chainId: string): ChainDefinition | undefined;
/**
 * Get all chains (including disabled)
 */
export declare function getAllChains(): ChainDefinition[];
/**
 * Get all enabled mainnet chains
 */
export declare function getEnabledChains(): ChainDefinition[];
/**
 * Get all enabled mainnet chain IDs
 */
export declare function getEnabledChainIds(): string[];
/**
 * Get a family definition
 */
export declare function getFamily(family: ChainFamily): ChainFamilyDefinition;
/**
 * Get all family definitions
 */
export declare function getAllFamilies(): ChainFamilyDefinition[];
/**
 * Get enabled families (families with at least one enabled chain)
 */
export declare function getEnabledFamilies(): ChainFamilyDefinition[];
/**
 * Get chains by family
 */
export declare function getChainsByFamily(family: ChainFamily): ChainDefinition[];
/**
 * Get enabled chains by family
 */
export declare function getEnabledChainsByFamily(family: ChainFamily): ChainDefinition[];
/**
 * Get all L2 chains
 */
export declare function getL2Chains(): ChainDefinition[];
/**
 * Get L2s for a specific parent chain
 */
export declare function getL2sFor(parentId: string): ChainDefinition[];
/**
 * Get the parent chain for an L2
 */
export declare function getParentChain(chainId: string): ChainDefinition | undefined;
/**
 * Check if two chains share the same address derivation
 */
export declare function sharesAddress(chainId1: string, chainId2: string): boolean;
/**
 * Get all chains that share an address with the given chain
 */
export declare function getChainsWithSharedAddress(chainId: string): ChainDefinition[];
/**
 * Get token by symbol on a specific chain
 */
export declare function getToken(chainId: string, symbol: string): TokenDefinition | undefined;
/**
 * Get all tokens across all chains
 */
export declare function getAllTokens(): TokenDefinition[];
/**
 * Get unique CoinGecko IDs for all native currencies and tokens
 */
export declare function getAllCoingeckoIds(): string[];
/**
 * Get display name for a family
 */
export declare function getFamilyDisplayName(family: ChainFamily): string;
/**
 * Get the primary/representative chain for a family
 */
export declare function getPrimaryChainForFamily(family: ChainFamily): ChainDefinition | undefined;
/**
 * Get chain brand color
 */
export declare function getChainColor(chainId: string): string;
/**
 * Get family brand color
 */
export declare function getFamilyColor(family: ChainFamily): string;
export { getFamilyForChain } from './families';
//# sourceMappingURL=helpers.d.ts.map