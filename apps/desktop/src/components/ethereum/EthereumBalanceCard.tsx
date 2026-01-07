/**
 * EthereumBalanceCard - Display ETH balance across all EVM chains
 *
 * Shows total ETH holdings across Ethereum mainnet and L2s
 * with expandable per-chain breakdown.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Coins,
} from "lucide-react";
import { ChainIcon, TokenIcon } from "@/components/ui/crypto-icon";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useEthereumStore,
  useFormattedTotalBalance,
  useIsAnySyncing,
} from "@/stores/ethereumStore";
import { type EVMChainId, type TokenBalance } from "@/lib/viem";
import type { Address } from "viem";

// Token with chain info for display
interface TokenWithChain extends TokenBalance {
  chainId: EVMChainId;
  chainName: string;
}

interface EthereumBalanceCardProps {
  walletId: string;
  address: Address;
  onSync?: () => void;
}

// Chain display configuration
const chainConfig: Record<
  EVMChainId,
  { name: string; color: string; bgColor: string }
> = {
  ethereum: {
    name: "Ethereum",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  arbitrum: {
    name: "Arbitrum",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  optimism: {
    name: "Optimism",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  base: {
    name: "Base",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  polygon: {
    name: "Polygon",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
};

const EVM_CHAINS: EVMChainId[] = [
  "ethereum",
  "arbitrum",
  "optimism",
  "base",
  "polygon",
];

// ETH price (hardcoded for now, will be fetched from API later)
const ETH_PRICE_USD = 2500;

export function EthereumBalanceCard({
  walletId,
  address,
  onSync,
}: EthereumBalanceCardProps) {
  const { initWallet, syncAllChains, wallets } = useEthereumStore();
  const totalBalance = useFormattedTotalBalance(walletId);
  const isSyncing = useIsAnySyncing(walletId);

  const [isExpanded, setIsExpanded] = useState(false);

  const walletState = wallets[walletId];

  // Initialize wallet state on mount
  useEffect(() => {
    initWallet(walletId);
  }, [walletId, initWallet]);

  // Auto-sync on mount if not recently synced (within 5 minutes)
  useEffect(() => {
    const shouldAutoSync =
      !walletState ||
      EVM_CHAINS.some((chainId) => {
        const chainState = walletState?.[chainId];
        if (!chainState?.lastSynced) return true;
        return Date.now() - new Date(chainState.lastSynced).getTime() > 5 * 60 * 1000;
      });

    if (shouldAutoSync && !isSyncing) {
      syncAllChains(walletId, address).catch(console.error);
    }
  }, [walletId, address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    try {
      await syncAllChains(walletId, address);
      onSync?.();
    } catch (err) {
      console.error("Sync failed:", err);
    }
  };

  // Calculate totals
  const totalBalanceNum = parseFloat(totalBalance);
  const usdValue = totalBalanceNum * ETH_PRICE_USD;

  // Get latest sync time across all chains
  const getLastSyncedTime = (): string | null => {
    if (!walletState) return null;

    let latestSync: Date | null = null;
    for (const chainId of EVM_CHAINS) {
      const chainState = walletState[chainId];
      if (chainState?.lastSynced) {
        const syncDate = new Date(chainState.lastSynced);
        if (!latestSync || syncDate > latestSync) {
          latestSync = syncDate;
        }
      }
    }
    return latestSync?.toISOString() || null;
  };

  // Get any errors
  const getErrors = (): string[] => {
    if (!walletState) return [];
    return EVM_CHAINS.map((chainId) => walletState[chainId]?.error)
      .filter((e): e is string => !!e);
  };

  // Collect all tokens across chains
  const getAllTokens = (): TokenWithChain[] => {
    if (!walletState) return [];

    const allTokens: TokenWithChain[] = [];
    for (const chainId of EVM_CHAINS) {
      const chainState = walletState[chainId];
      const config = chainConfig[chainId];
      if (chainState?.tokens) {
        for (const token of chainState.tokens) {
          allTokens.push({
            ...token,
            chainId,
            chainName: config.name,
          });
        }
      }
    }
    return allTokens;
  };

  const lastSynced = getLastSyncedTime();
  const errors = getErrors();
  const allTokens = getAllTokens();
  const hasBalance = totalBalanceNum > 0 || allTokens.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <ChainIcon chainId="ethereum" size={24} variant="branded" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Ethereum Balance</h3>
            <p className="text-xs text-muted-foreground">
              {lastSynced
                ? `Last synced ${formatRelativeTime(lastSynced)}`
                : "Not synced yet"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          {isSyncing ? "Syncing..." : "Sync All"}
        </Button>
      </div>

      {/* Error State */}
      {errors.length > 0 && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            {errors.map((error, idx) => (
              <p key={idx}>{error}</p>
            ))}
          </div>
        </div>
      )}

      {/* Balance Display */}
      {hasBalance || walletState ? (
        <div className="space-y-4">
          {/* Main Balance */}
          <div>
            <p className="text-3xl font-heading font-bold tracking-tight tabular-nums">
              {formatEth(totalBalance)}{" "}
              <span className="text-lg text-muted-foreground">ETH</span>
            </p>
            <p className="text-lg text-muted-foreground tabular-nums">
              ${usdValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Expand/Collapse for chain breakdown */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full pt-2 border-t border-border/50"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
            {isExpanded ? "Hide" : "Show"} details
            {allTokens.length > 0 && (
              <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {allTokens.length} token{allTokens.length !== 1 ? "s" : ""}
              </span>
            )}
          </button>

          {/* Chain Breakdown */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-2">
                  {/* Native Balances by Chain */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Native Balances
                    </h4>
                    {EVM_CHAINS.map((chainId) => {
                      const config = chainConfig[chainId];
                      const chainState = walletState?.[chainId];
                      const balance = chainState?.balance;
                      const isChainSyncing = chainState?.isSyncing;

                      return (
                        <div
                          key={chainId}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                config.bgColor
                              )}
                            >
                              <ChainIcon chainId={chainId} size={20} variant="branded" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{config.name}</p>
                              {isChainSyncing && (
                                <p className="text-xs text-muted-foreground">
                                  Syncing...
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm tabular-nums">
                              {balance ? formatEth(balance.formatted) : "—"}{" "}
                              {balance?.symbol || "ETH"}
                            </p>
                            {balance && (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                $
                                {(
                                  parseFloat(balance.formatted) * ETH_PRICE_USD
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tokens */}
                  {allTokens.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Coins className="h-3.5 w-3.5" />
                        Tokens
                      </h4>
                      {allTokens.map((token, idx) => {
                        return (
                          <div
                            key={`${token.chainId}-${token.address}-${idx}`}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <TokenIcon symbol={token.symbol} size={32} variant="branded" />
                              <div>
                                <p className="font-medium text-sm">{token.symbol}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ChainIcon chainId={token.chainId} size={12} variant="branded" />
                                  {token.chainName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm tabular-nums">
                                {token.formattedBalance}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {token.name}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <ChainIcon chainId="ethereum" size={32} variant="mono" />
          </div>
          <p className="text-muted-foreground mb-4">
            Sync with the blockchain to see your balance
          </p>
          <Button onClick={handleSync} disabled={isSyncing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// Helper to format relative time
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Format ETH with appropriate precision
function formatEth(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  if (num < 1) return num.toFixed(6);
  if (num < 100) return num.toFixed(4);
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default EthereumBalanceCard;
