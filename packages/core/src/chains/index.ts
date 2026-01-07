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

// Types
export type {
  ChainFamily,
  ChainLayer,
  NativeCurrency,
  TokenDefinition,
  ChainDefinition,
  ChainFamilyDefinition,
  EVMChainId,
} from './types';

export { isEVMChainId } from './types';

// Registry Data
export { CHAINS, TESTNET_CHAINS } from './registry';

// Family Data
export { CHAIN_FAMILIES, FAMILY_CHAINS } from './families';

// Token Data
export {
  ETHEREUM_TOKENS,
  ARBITRUM_TOKENS,
  OPTIMISM_TOKENS,
  BASE_TOKENS,
  POLYGON_TOKENS,
} from './tokens';

// Helpers
export {
  // Chain getters
  getChain,
  getAllChains,
  getEnabledChains,
  getEnabledChainIds,
  // Family getters
  getFamily,
  getAllFamilies,
  getEnabledFamilies,
  getChainsByFamily,
  getEnabledChainsByFamily,
  getFamilyForChain,
  // Layer helpers
  getL2Chains,
  getL2sFor,
  getParentChain,
  // Address helpers
  sharesAddress,
  getChainsWithSharedAddress,
  // Token helpers
  getToken,
  getAllTokens,
  getAllCoingeckoIds,
  // Display helpers
  getFamilyDisplayName,
  getPrimaryChainForFamily,
  getChainColor,
  getFamilyColor,
} from './helpers';
