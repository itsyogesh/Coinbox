/**
 * Chain Registry Helpers
 *
 * Utility functions for working with chains and families.
 */
import { CHAINS, TESTNET_CHAINS } from './registry';
import { CHAIN_FAMILIES, FAMILY_CHAINS, getFamilyForChain } from './families';
// ============================================================================
// Chain Getters
// ============================================================================
/**
 * Get a chain definition by ID
 */
export function getChain(chainId) {
    return CHAINS[chainId] ?? TESTNET_CHAINS[chainId];
}
/**
 * Get all chains (including disabled)
 */
export function getAllChains() {
    return Object.values(CHAINS);
}
/**
 * Get all enabled mainnet chains
 */
export function getEnabledChains() {
    return Object.values(CHAINS).filter(c => c.isEnabled && !c.isTestnet);
}
/**
 * Get all enabled mainnet chain IDs
 */
export function getEnabledChainIds() {
    return getEnabledChains().map(c => c.id);
}
// ============================================================================
// Family Getters
// ============================================================================
/**
 * Get a family definition
 */
export function getFamily(family) {
    return CHAIN_FAMILIES[family];
}
/**
 * Get all family definitions
 */
export function getAllFamilies() {
    return Object.values(CHAIN_FAMILIES);
}
/**
 * Get enabled families (families with at least one enabled chain)
 */
export function getEnabledFamilies() {
    return getAllFamilies().filter(family => {
        const chains = getChainsByFamily(family.id);
        return chains.some(c => c.isEnabled);
    });
}
/**
 * Get chains by family
 */
export function getChainsByFamily(family) {
    const chainIds = FAMILY_CHAINS[family] ?? [];
    return chainIds
        .map(id => CHAINS[id])
        .filter((c) => c !== undefined);
}
/**
 * Get enabled chains by family
 */
export function getEnabledChainsByFamily(family) {
    return getChainsByFamily(family).filter(c => c.isEnabled);
}
// ============================================================================
// Layer Helpers
// ============================================================================
/**
 * Get all L2 chains
 */
export function getL2Chains() {
    return Object.values(CHAINS).filter(c => c.layer === 'L2' && c.isEnabled);
}
/**
 * Get L2s for a specific parent chain
 */
export function getL2sFor(parentId) {
    return Object.values(CHAINS).filter(c => c.parentId === parentId && c.isEnabled);
}
/**
 * Get the parent chain for an L2
 */
export function getParentChain(chainId) {
    const chain = CHAINS[chainId];
    if (!chain?.parentId)
        return undefined;
    return CHAINS[chain.parentId];
}
// ============================================================================
// Address Helpers
// ============================================================================
/**
 * Check if two chains share the same address derivation
 */
export function sharesAddress(chainId1, chainId2) {
    const family1 = getFamilyForChain(chainId1);
    const family2 = getFamilyForChain(chainId2);
    if (!family1 || !family2)
        return false;
    return family1 === family2;
}
/**
 * Get all chains that share an address with the given chain
 */
export function getChainsWithSharedAddress(chainId) {
    const family = getFamilyForChain(chainId);
    if (!family)
        return [];
    return getChainsByFamily(family);
}
// ============================================================================
// Token Helpers
// ============================================================================
/**
 * Get token by symbol on a specific chain
 */
export function getToken(chainId, symbol) {
    const chain = CHAINS[chainId];
    if (!chain)
        return undefined;
    return chain.tokens.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
}
/**
 * Get all tokens across all chains
 */
export function getAllTokens() {
    return Object.values(CHAINS).flatMap(c => c.tokens);
}
/**
 * Get unique CoinGecko IDs for all native currencies and tokens
 */
export function getAllCoingeckoIds() {
    const ids = new Set();
    // Native currencies
    Object.values(CHAINS).forEach(chain => {
        if (chain.isEnabled) {
            ids.add(chain.nativeCurrency.coingeckoId);
        }
    });
    // Tokens
    Object.values(CHAINS).forEach(chain => {
        if (chain.isEnabled) {
            chain.tokens.forEach(token => ids.add(token.coingeckoId));
        }
    });
    return Array.from(ids);
}
// ============================================================================
// Display Helpers
// ============================================================================
/**
 * Get display name for a family
 */
export function getFamilyDisplayName(family) {
    return CHAIN_FAMILIES[family].name;
}
/**
 * Get the primary/representative chain for a family
 */
export function getPrimaryChainForFamily(family) {
    const familyDef = CHAIN_FAMILIES[family];
    return CHAINS[familyDef.primaryChainId];
}
/**
 * Get chain brand color
 */
export function getChainColor(chainId) {
    const chain = CHAINS[chainId];
    return chain?.brandColor ?? '#808080';
}
/**
 * Get family brand color
 */
export function getFamilyColor(family) {
    return CHAIN_FAMILIES[family].brandColor;
}
// ============================================================================
// Re-exports for convenience
// ============================================================================
export { getFamilyForChain } from './families';
//# sourceMappingURL=helpers.js.map