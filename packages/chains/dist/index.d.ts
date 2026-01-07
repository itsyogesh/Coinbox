/**
 * Chain Registry
 *
 * Single source of truth for all chain definitions in Coinbox.
 *
 * @example
 * ```typescript
 * import { getChain, getEnabledFamilies, getChainsByFamily } from '@coinbox/core/chains';
 *
 * // Get a specific chain
 * const ethereum = getChain('ethereum');
 *
 * // Get families for onboarding UI
 * const families = getEnabledFamilies();
 *
 * // Get all EVM chains
 * const evmChains = getChainsByFamily('evm');
 * ```
 */
export type { ChainFamily, ChainLayer, NativeCurrency, TokenDefinition, ChainDefinition, ChainFamilyDefinition, EVMChainId, } from './types';
export { isEVMChainId } from './types';
export { CHAINS, TESTNET_CHAINS } from './registry';
export { CHAIN_FAMILIES, FAMILY_CHAINS } from './families';
export { ETHEREUM_TOKENS, ARBITRUM_TOKENS, OPTIMISM_TOKENS, BASE_TOKENS, POLYGON_TOKENS, } from './tokens';
export { getChain, getAllChains, getEnabledChains, getEnabledChainIds, getFamily, getAllFamilies, getEnabledFamilies, getChainsByFamily, getEnabledChainsByFamily, getFamilyForChain, getL2Chains, getL2sFor, getParentChain, sharesAddress, getChainsWithSharedAddress, getToken, getAllTokens, getAllCoingeckoIds, getFamilyDisplayName, getPrimaryChainForFamily, getChainColor, getFamilyColor, } from './helpers';
//# sourceMappingURL=index.d.ts.map