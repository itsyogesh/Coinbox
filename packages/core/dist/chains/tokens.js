/**
 * Token Definitions
 *
 * Common ERC-20 tokens for each EVM chain.
 * Each token includes coingeckoId for price lookups.
 */
// ============================================================================
// Ethereum Mainnet Tokens
// ============================================================================
export const ETHEREUM_TOKENS = [
    {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coingeckoId: 'usd-coin',
    },
    {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        coingeckoId: 'tether',
    },
    {
        address: '0x6B175474E89094C44Da98b954EescdeCB5BE3830',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        coingeckoId: 'dai',
    },
    {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        decimals: 8,
        coingeckoId: 'bitcoin', // WBTC tracks BTC price
    },
    {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        coingeckoId: 'ethereum', // WETH tracks ETH price
    },
    {
        address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        symbol: 'LINK',
        name: 'Chainlink',
        decimals: 18,
        coingeckoId: 'chainlink',
    },
    {
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        symbol: 'UNI',
        name: 'Uniswap',
        decimals: 18,
        coingeckoId: 'uniswap',
    },
];
// ============================================================================
// Arbitrum Tokens
// ============================================================================
export const ARBITRUM_TOKENS = [
    {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coingeckoId: 'usd-coin',
    },
    {
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        coingeckoId: 'tether',
    },
    {
        address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        coingeckoId: 'dai',
    },
    {
        address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        decimals: 8,
        coingeckoId: 'bitcoin',
    },
    {
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        coingeckoId: 'ethereum',
    },
    {
        address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        symbol: 'ARB',
        name: 'Arbitrum',
        decimals: 18,
        coingeckoId: 'arbitrum',
    },
];
// ============================================================================
// Optimism Tokens
// ============================================================================
export const OPTIMISM_TOKENS = [
    {
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coingeckoId: 'usd-coin',
    },
    {
        address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        coingeckoId: 'tether',
    },
    {
        address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        coingeckoId: 'dai',
    },
    {
        address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        decimals: 8,
        coingeckoId: 'bitcoin',
    },
    {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        coingeckoId: 'ethereum',
    },
    {
        address: '0x4200000000000000000000000000000000000042',
        symbol: 'OP',
        name: 'Optimism',
        decimals: 18,
        coingeckoId: 'optimism',
    },
];
// ============================================================================
// Base Tokens
// ============================================================================
export const BASE_TOKENS = [
    {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coingeckoId: 'usd-coin',
    },
    {
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        coingeckoId: 'dai',
    },
    {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        coingeckoId: 'ethereum',
    },
    {
        address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
        symbol: 'cbETH',
        name: 'Coinbase Wrapped Staked ETH',
        decimals: 18,
        coingeckoId: 'coinbase-wrapped-staked-eth',
    },
];
// ============================================================================
// Polygon Tokens
// ============================================================================
export const POLYGON_TOKENS = [
    {
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        coingeckoId: 'usd-coin',
    },
    {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        coingeckoId: 'tether',
    },
    {
        address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        coingeckoId: 'dai',
    },
    {
        address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        decimals: 8,
        coingeckoId: 'bitcoin',
    },
    {
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        coingeckoId: 'ethereum',
    },
    {
        address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        symbol: 'WPOL',
        name: 'Wrapped POL',
        decimals: 18,
        coingeckoId: 'matic-network', // Still uses MATIC ID
    },
];
// ============================================================================
// All Tokens (for price fetching)
// ============================================================================
/**
 * Get all unique CoinGecko IDs for price fetching
 */
export function getAllCoingeckoIds() {
    const allTokens = [
        ...ETHEREUM_TOKENS,
        ...ARBITRUM_TOKENS,
        ...OPTIMISM_TOKENS,
        ...BASE_TOKENS,
        ...POLYGON_TOKENS,
    ];
    const ids = new Set();
    // Add token IDs
    allTokens.forEach(token => ids.add(token.coingeckoId));
    // Add native currency IDs (handled separately in registry)
    // These are: bitcoin, ethereum, matic-network, solana
    return Array.from(ids);
}
//# sourceMappingURL=tokens.js.map