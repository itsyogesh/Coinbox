/**
 * Chain Registry Types
 *
 * Central type definitions for all blockchain networks supported by Coinbox.
 * Chains are grouped by "family" - chains that share the same address derivation.
 */
/**
 * Check if a chain ID is an EVM chain
 */
export function isEVMChainId(chainId) {
    return ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'].includes(chainId);
}
//# sourceMappingURL=types.js.map