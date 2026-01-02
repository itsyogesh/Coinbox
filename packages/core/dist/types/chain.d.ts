/**
 * Blockchain chain definitions
 */
export declare enum Chain {
    Bitcoin = "bitcoin",
    Ethereum = "ethereum",
    Arbitrum = "arbitrum",
    Optimism = "optimism",
    Base = "base",
    Polygon = "polygon"
}
export interface ChainConfig {
    chain: Chain;
    name: string;
    symbol: string;
    decimals: number;
    explorerUrl: string;
    color: string;
    iconName: string;
}
export declare const CHAIN_CONFIGS: Record<Chain, ChainConfig>;
export declare function isEVMChain(chain: Chain): boolean;
export declare function getChainConfig(chain: Chain): ChainConfig;
//# sourceMappingURL=chain.d.ts.map