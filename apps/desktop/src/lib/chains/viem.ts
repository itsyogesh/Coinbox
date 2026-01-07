/**
 * Viem Chain Mappings
 *
 * Maps chain IDs from the registry to Viem chain objects.
 * This bridges @coinbox/core registry to viem's chain system.
 */

import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  type Chain,
} from "viem/chains";
import { getChain, getEnabledChainsByFamily, type EVMChainId, isEVMChainId } from "@coinbox/chains";

// ============================================================================
// Viem Chain Object Mapping
// ============================================================================

/**
 * Map of chain IDs to Viem chain objects
 */
const VIEM_CHAINS: Record<string, Chain> = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  polygon: polygon,
  sepolia: sepolia,
};

/**
 * Get the Viem chain object for a chain ID
 */
export function getViemChain(chainId: string): Chain | undefined {
  return VIEM_CHAINS[chainId];
}

/**
 * Get the Viem chain object for a chain ID, throwing if not found
 */
export function getViemChainOrThrow(chainId: string): Chain {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) {
    throw new Error(`No Viem chain found for chain ID: ${chainId}`);
  }
  return chain;
}

/**
 * Get all enabled EVM chains as Viem chain objects
 */
export function getEnabledViemChains(): Chain[] {
  const evmChains = getEnabledChainsByFamily("evm");
  return evmChains
    .map((chain) => VIEM_CHAINS[chain.id])
    .filter((c): c is Chain => c !== undefined);
}

/**
 * Get EVM chain ID number from our chain ID string
 */
export function getEvmChainIdNumber(chainId: string): number | undefined {
  if (!isEVMChainId(chainId)) return undefined;
  const chainDef = getChain(chainId);
  return chainDef?.chainId;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a chain ID has a corresponding Viem chain
 */
export function hasViemChain(chainId: string): boolean {
  return chainId in VIEM_CHAINS;
}

// ============================================================================
// Re-exports from registry for convenience
// ============================================================================

export { isEVMChainId, type EVMChainId };
