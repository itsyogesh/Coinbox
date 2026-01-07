/**
 * Chain Registry
 *
 * Single source of truth for all chain definitions.
 * Consolidates data from multiple sources into one canonical registry.
 */
import { ETHEREUM_TOKENS, ARBITRUM_TOKENS, OPTIMISM_TOKENS, BASE_TOKENS, POLYGON_TOKENS } from './tokens';
// ============================================================================
// Chain Definitions
// ============================================================================
export const CHAINS = {
    // ==========================================================================
    // Bitcoin Family
    // ==========================================================================
    bitcoin: {
        id: 'bitcoin',
        name: 'Bitcoin',
        shortName: 'BTC',
        family: 'bitcoin',
        layer: 'L1',
        nativeCurrency: {
            name: 'Bitcoin',
            symbol: 'BTC',
            decimals: 8,
            coingeckoId: 'bitcoin',
        },
        iconComponent: 'NetworkBitcoin',
        brandColor: '#F7931A',
        rpcUrl: '', // Bitcoin uses Electrum, not standard RPC
        explorerUrl: 'https://mempool.space',
        tokens: [], // Bitcoin doesn't have tokens in the same sense
        isTestnet: false,
        isEnabled: true,
    },
    // ==========================================================================
    // EVM Family - Layer 1
    // ==========================================================================
    ethereum: {
        id: 'ethereum',
        chainId: 1,
        name: 'Ethereum',
        shortName: 'ETH',
        family: 'evm',
        layer: 'L1',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            coingeckoId: 'ethereum',
        },
        iconComponent: 'NetworkEthereum',
        brandColor: '#627EEA',
        rpcUrl: 'https://eth.llamarpc.com',
        explorerUrl: 'https://etherscan.io',
        explorerApiUrl: 'https://api.etherscan.io',
        tokens: ETHEREUM_TOKENS,
        isTestnet: false,
        isEnabled: true,
    },
    // ==========================================================================
    // EVM Family - Layer 2s
    // ==========================================================================
    arbitrum: {
        id: 'arbitrum',
        chainId: 42161,
        name: 'Arbitrum One',
        shortName: 'ARB',
        family: 'evm',
        layer: 'L2',
        parentId: 'ethereum',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            coingeckoId: 'ethereum',
        },
        iconComponent: 'NetworkArbitrumOne',
        brandColor: '#28A0F0',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        explorerApiUrl: 'https://api.arbiscan.io',
        tokens: ARBITRUM_TOKENS,
        isTestnet: false,
        isEnabled: true,
    },
    optimism: {
        id: 'optimism',
        chainId: 10,
        name: 'Optimism',
        shortName: 'OP',
        family: 'evm',
        layer: 'L2',
        parentId: 'ethereum',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            coingeckoId: 'ethereum',
        },
        iconComponent: 'NetworkOptimism',
        brandColor: '#FF0420',
        rpcUrl: 'https://mainnet.optimism.io',
        explorerUrl: 'https://optimistic.etherscan.io',
        explorerApiUrl: 'https://api-optimistic.etherscan.io',
        tokens: OPTIMISM_TOKENS,
        isTestnet: false,
        isEnabled: true,
    },
    base: {
        id: 'base',
        chainId: 8453,
        name: 'Base',
        shortName: 'BASE',
        family: 'evm',
        layer: 'L2',
        parentId: 'ethereum',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            coingeckoId: 'ethereum',
        },
        iconComponent: 'NetworkBase',
        brandColor: '#0052FF',
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        explorerApiUrl: 'https://api.basescan.org',
        tokens: BASE_TOKENS,
        isTestnet: false,
        isEnabled: true,
    },
    polygon: {
        id: 'polygon',
        chainId: 137,
        name: 'Polygon',
        shortName: 'POL',
        family: 'evm',
        layer: 'L2',
        parentId: 'ethereum',
        // Note: MATIC is migrating to POL token
        nativeCurrency: {
            name: 'POL',
            symbol: 'POL', // Formerly MATIC
            decimals: 18,
            coingeckoId: 'matic-network', // CoinGecko still uses this ID
        },
        iconComponent: 'NetworkPolygon',
        brandColor: '#8247E5',
        rpcUrl: 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        explorerApiUrl: 'https://api.polygonscan.com',
        tokens: POLYGON_TOKENS,
        isTestnet: false,
        isEnabled: true,
    },
    // ==========================================================================
    // Solana Family (Future)
    // ==========================================================================
    solana: {
        id: 'solana',
        name: 'Solana',
        shortName: 'SOL',
        family: 'solana',
        layer: 'L1',
        nativeCurrency: {
            name: 'Solana',
            symbol: 'SOL',
            decimals: 9,
            coingeckoId: 'solana',
        },
        iconComponent: 'NetworkSolana',
        brandColor: '#14F195',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        explorerUrl: 'https://solscan.io',
        tokens: [],
        isTestnet: false,
        isEnabled: false, // Not yet implemented
    },
};
// ============================================================================
// Testnet Chains (for development)
// ============================================================================
export const TESTNET_CHAINS = {
    sepolia: {
        id: 'sepolia',
        chainId: 11155111,
        name: 'Sepolia',
        shortName: 'SEP',
        family: 'evm',
        layer: 'L1',
        nativeCurrency: {
            name: 'Sepolia Ether',
            symbol: 'ETH',
            decimals: 18,
            coingeckoId: 'ethereum',
        },
        iconComponent: 'NetworkEthereum',
        brandColor: '#627EEA',
        rpcUrl: 'https://rpc.sepolia.org',
        explorerUrl: 'https://sepolia.etherscan.io',
        tokens: [],
        isTestnet: true,
        isEnabled: false,
    },
};
//# sourceMappingURL=registry.js.map