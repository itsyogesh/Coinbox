/**
 * Chain Family Definitions
 *
 * Families group chains that share the same address derivation.
 * Used for onboarding UI and wallet grouping.
 */
// ============================================================================
// Chain Families
// ============================================================================
export const CHAIN_FAMILIES = {
    bitcoin: {
        id: 'bitcoin',
        name: 'Bitcoin',
        description: 'The original cryptocurrency network',
        iconComponent: 'NetworkBitcoin',
        brandColor: '#F7931A',
        primaryChainId: 'bitcoin',
    },
    evm: {
        id: 'evm',
        name: 'Ethereum',
        description: 'Ethereum mainnet and Layer 2 networks (Arbitrum, Optimism, Base, Polygon)',
        iconComponent: 'NetworkEthereum',
        brandColor: '#627EEA',
        primaryChainId: 'ethereum',
    },
    solana: {
        id: 'solana',
        name: 'Solana',
        description: 'High-performance blockchain (coming soon)',
        iconComponent: 'NetworkSolana',
        brandColor: '#14F195',
        primaryChainId: 'solana',
    },
};
// ============================================================================
// Family Helpers
// ============================================================================
/**
 * Get chains that belong to each family
 */
export const FAMILY_CHAINS = {
    bitcoin: ['bitcoin'],
    evm: ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'],
    solana: ['solana'],
};
/**
 * Get the family for a given chain ID
 */
export function getFamilyForChain(chainId) {
    for (const [family, chains] of Object.entries(FAMILY_CHAINS)) {
        if (chains.includes(chainId)) {
            return family;
        }
    }
    return undefined;
}
//# sourceMappingURL=families.js.map