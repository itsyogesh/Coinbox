/**
 * Desktop Chain Integrations
 *
 * Desktop-specific chain utilities that bridge @coinbox/core registry
 * to viem and @web3icons.
 *
 * @example
 * ```typescript
 * import { getViemChain, getChainIconComponent } from '@/lib/chains';
 *
 * // Get viem chain object
 * const viemChain = getViemChain('ethereum');
 *
 * // Get icon component
 * const IconComponent = getChainIconComponent('NetworkEthereum');
 * ```
 */

// Viem chain mappings
export {
  getViemChain,
  getViemChainOrThrow,
  getEnabledViemChains,
  getEvmChainIdNumber,
  hasViemChain,
  isEVMChainId,
  type EVMChainId,
} from "./viem";

// Icon component mappings
export {
  CHAIN_ICON_COMPONENTS,
  TOKEN_ICON_COMPONENTS,
  getChainIconComponent,
  getTokenIconComponent,
  getIconComponent,
} from "./icons";

// Re-export everything from @coinbox/core chains for convenience
export {
  // Types
  type ChainFamily,
  type ChainLayer,
  type NativeCurrency,
  type TokenDefinition,
  type ChainDefinition,
  type ChainFamilyDefinition,
  // Registry Data
  CHAINS,
  TESTNET_CHAINS,
  // Family Data
  CHAIN_FAMILIES,
  FAMILY_CHAINS,
  // Token Data
  ETHEREUM_TOKENS,
  ARBITRUM_TOKENS,
  OPTIMISM_TOKENS,
  BASE_TOKENS,
  POLYGON_TOKENS,
  // Helpers
  getChain,
  getAllChains,
  getEnabledChains,
  getEnabledChainIds,
  getFamily,
  getAllFamilies,
  getEnabledFamilies,
  getChainsByFamily,
  getEnabledChainsByFamily,
  getFamilyForChain,
  getL2Chains,
  getL2sFor,
  getParentChain,
  sharesAddress,
  getChainsWithSharedAddress,
  getToken,
  getAllTokens,
  getAllCoingeckoIds,
  getFamilyDisplayName,
  getPrimaryChainForFamily,
  getChainColor,
  getFamilyColor,
} from "@coinbox/core";
