/**
 * EVM Chain configurations for Viem
 * Supports Ethereum mainnet + L2s (Arbitrum, Optimism, Base, Polygon)
 *
 * @deprecated Chain data is now centralized in the registry.
 * Use: `import { getChain, getViemChain } from '@/lib/chains'`
 *
 * This file is kept for backward compatibility with existing Viem integrations.
 * New code should use the chain registry for metadata and this file only for Viem Chain objects.
 */

import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  polygonAmoy,
  type Chain,
} from "viem/chains";

export type EVMChainId =
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon";

export type TestnetChainId =
  | "sepolia"
  | "arbitrum-sepolia"
  | "optimism-sepolia"
  | "base-sepolia"
  | "polygon-amoy";

export interface ChainConfig {
  id: EVMChainId | TestnetChainId;
  name: string;
  chain: Chain;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

// Default public RPC endpoints (free, no API key required)
export const MAINNET_CHAINS: Record<EVMChainId, ChainConfig> = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    chain: mainnet,
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    explorerApiUrl: "https://api.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    chain: arbitrum,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    explorerApiUrl: "https://api.arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  optimism: {
    id: "optimism",
    name: "Optimism",
    chain: optimism,
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    explorerApiUrl: "https://api-optimistic.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  base: {
    id: "base",
    name: "Base",
    chain: base,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    explorerApiUrl: "https://api.basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    chain: polygon,
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    explorerApiUrl: "https://api.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    isTestnet: false,
  },
};

export const TESTNET_CHAINS: Record<TestnetChainId, ChainConfig> = {
  sepolia: {
    id: "sepolia",
    name: "Sepolia",
    chain: sepolia,
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    explorerApiUrl: "https://api-sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    isTestnet: true,
  },
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    explorerApiUrl: "https://api-sepolia.arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: true,
  },
  "optimism-sepolia": {
    id: "optimism-sepolia",
    name: "Optimism Sepolia",
    chain: optimismSepolia,
    rpcUrl: "https://sepolia.optimism.io",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    explorerApiUrl: "https://api-sepolia-optimistic.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: true,
  },
  "base-sepolia": {
    id: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    explorerApiUrl: "https://api-sepolia.basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: true,
  },
  "polygon-amoy": {
    id: "polygon-amoy",
    name: "Polygon Amoy",
    chain: polygonAmoy,
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    explorerApiUrl: "https://api-amoy.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    isTestnet: true,
  },
};

// All chains combined
export const ALL_CHAINS: Record<string, ChainConfig> = {
  ...MAINNET_CHAINS,
  ...TESTNET_CHAINS,
};

// Helper to get chain config by ID
export function getChainConfig(
  chainId: EVMChainId | TestnetChainId
): ChainConfig | undefined {
  return ALL_CHAINS[chainId];
}

// Helper to check if a chain ID is a valid EVM chain
export function isEVMChain(chainId: string): chainId is EVMChainId {
  return chainId in MAINNET_CHAINS;
}

// Helper to check if a chain ID is a testnet
export function isTestnet(chainId: string): chainId is TestnetChainId {
  return chainId in TESTNET_CHAINS;
}

// Get chain ID number from chain ID string
export function getChainIdNumber(chainId: EVMChainId | TestnetChainId): number {
  const config = ALL_CHAINS[chainId];
  return config?.chain.id ?? 1;
}

// EVM chain IDs for UI display
export const EVM_CHAIN_IDS: EVMChainId[] = [
  "ethereum",
  "arbitrum",
  "optimism",
  "base",
  "polygon",
];
