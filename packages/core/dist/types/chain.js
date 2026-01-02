/**
 * Blockchain chain definitions
 */
export var Chain;
(function (Chain) {
    Chain["Bitcoin"] = "bitcoin";
    Chain["Ethereum"] = "ethereum";
    Chain["Arbitrum"] = "arbitrum";
    Chain["Optimism"] = "optimism";
    Chain["Base"] = "base";
    Chain["Polygon"] = "polygon";
})(Chain || (Chain = {}));
export const CHAIN_CONFIGS = {
    [Chain.Bitcoin]: {
        chain: Chain.Bitcoin,
        name: 'Bitcoin',
        symbol: 'BTC',
        decimals: 8,
        explorerUrl: 'https://mempool.space',
        color: '#F7931A',
        iconName: 'bitcoin',
    },
    [Chain.Ethereum]: {
        chain: Chain.Ethereum,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        explorerUrl: 'https://etherscan.io',
        color: '#627EEA',
        iconName: 'ethereum',
    },
    [Chain.Arbitrum]: {
        chain: Chain.Arbitrum,
        name: 'Arbitrum',
        symbol: 'ETH',
        decimals: 18,
        explorerUrl: 'https://arbiscan.io',
        color: '#28A0F0',
        iconName: 'arbitrum',
    },
    [Chain.Optimism]: {
        chain: Chain.Optimism,
        name: 'Optimism',
        symbol: 'ETH',
        decimals: 18,
        explorerUrl: 'https://optimistic.etherscan.io',
        color: '#FF0420',
        iconName: 'optimism',
    },
    [Chain.Base]: {
        chain: Chain.Base,
        name: 'Base',
        symbol: 'ETH',
        decimals: 18,
        explorerUrl: 'https://basescan.org',
        color: '#0052FF',
        iconName: 'base',
    },
    [Chain.Polygon]: {
        chain: Chain.Polygon,
        name: 'Polygon',
        symbol: 'POL',
        decimals: 18,
        explorerUrl: 'https://polygonscan.com',
        color: '#8247E5',
        iconName: 'polygon',
    },
};
export function isEVMChain(chain) {
    return chain !== Chain.Bitcoin;
}
export function getChainConfig(chain) {
    return CHAIN_CONFIGS[chain];
}
//# sourceMappingURL=chain.js.map