/**
 * Blockchain chain definitions
 *
 * @deprecated Use the new chain registry instead: `import { CHAINS, getChain } from '@coinbox/core/chains'`
 * This file is kept for backward compatibility but will be removed in a future version.
 *
 * Migration guide:
 * - `Chain.Ethereum` → `'ethereum'` (string IDs)
 * - `CHAIN_CONFIGS[Chain.Ethereum]` → `getChain('ethereum')`
 * - `isEVMChain(chain)` → `getFamilyForChain(chainId) === 'evm'`
 */
/**
 * @deprecated Use string chain IDs from the registry instead
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