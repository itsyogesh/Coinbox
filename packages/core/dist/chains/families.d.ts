/**
 * Chain Family Definitions
 *
 * Families group chains that share the same address derivation.
 * Used for onboarding UI and wallet grouping.
 */
import type { ChainFamily, ChainFamilyDefinition } from './types';
export declare const CHAIN_FAMILIES: Record<ChainFamily, ChainFamilyDefinition>;
/**
 * Get chains that belong to each family
 */
export declare const FAMILY_CHAINS: Record<ChainFamily, string[]>;
/**
 * Get the family for a given chain ID
 */
export declare function getFamilyForChain(chainId: string): ChainFamily | undefined;
//# sourceMappingURL=families.d.ts.map