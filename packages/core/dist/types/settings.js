/**
 * Application settings types
 */
export const DEFAULT_RPC_ENDPOINTS = {
    bitcoin: 'ssl://electrum.blockstream.info:60002',
    ethereum: 'https://eth.llamarpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
    base: 'https://mainnet.base.org',
    polygon: 'https://polygon-rpc.com',
};
export const DEFAULT_SETTINGS = {
    theme: 'dark',
    fiatCurrency: 'USD',
    locale: 'en-US',
    taxJurisdiction: 'us',
    costBasisMethod: 'fifo',
    rpcEndpoints: DEFAULT_RPC_ENDPOINTS,
    ai: {
        provider: 'none',
        autoCategorize: false,
    },
    privacy: {
        hideBalances: false,
        requirePasswordOnOpen: false,
        autoLockMinutes: 0,
    },
};
//# sourceMappingURL=settings.js.map