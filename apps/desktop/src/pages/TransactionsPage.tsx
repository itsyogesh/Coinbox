/**
 * TransactionsPage - Unified transaction history across all chains
 *
 * Aggregates transactions from:
 * - chainStore (SQLite-backed) for Bitcoin
 * - ethereumStore (Etherscan API) for EVM chains
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ChainIcon } from "@/components/ui/crypto-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/animations";
import { useChainStore } from "@/stores/chainStore";
import { useEthereumStore, type EthereumTransaction } from "@/stores/ethereumStore";
import { useWalletStore } from "@/stores/walletStore";
import { cn } from "@/lib/utils";
import type { EVMChainId } from "@/lib/viem";

interface UnifiedTransaction {
  id: string;
  chain: "bitcoin" | EVMChainId;
  type: "received" | "sent" | "internal" | "contract" | "self";
  amount: string;
  amountRaw: number;
  asset: string;
  timestamp: number | null;
  status: "confirmed" | "pending" | "failed" | "success";
  txid: string;
  walletId: string;
  walletName: string;
  // EVM-specific: token transfer info
  tokenTransfer?: {
    symbol: string;
    name: string;
    decimals: number;
  };
}

// EVM chain explorer URLs
const evmExplorers: Record<EVMChainId, string> = {
  ethereum: "https://etherscan.io/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  base: "https://basescan.org/tx/",
  polygon: "https://polygonscan.com/tx/",
};

export default function TransactionsPage() {
  const { wallets } = useWalletStore();
  const transactions = useChainStore((s) => s.transactions);
  const prices = useChainStore((s) => s.prices);
  const btcPrice = prices["BTC"]?.price_usd ?? null;

  // Get Ethereum store wallets
  const ethWallets = useEthereumStore((s) => s.wallets);
  const ethPriceState = useEthereumStore((s) => s.price);
  const ethPrice = ethPriceState.prices["ethereum"] ?? null;

  // Flatten Bitcoin transactions from chainStore
  const allBtcTransactions = useMemo(() => {
    const allTxs = Object.values(transactions).flat();
    return allTxs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }, [transactions]);

  // Flatten Ethereum transactions from ethereumStore
  const allEthTransactions = useMemo((): { tx: EthereumTransaction; walletId: string }[] => {
    const result: { tx: EthereumTransaction; walletId: string }[] = [];

    for (const [walletId, walletState] of Object.entries(ethWallets)) {
      if (!walletState) continue;
      const evmChains: EVMChainId[] = ["ethereum", "arbitrum", "optimism", "base", "polygon"];

      for (const chainId of evmChains) {
        const chainState = walletState[chainId];
        if (chainState?.transactions) {
          for (const tx of chainState.transactions) {
            result.push({ tx, walletId });
          }
        }
      }
    }

    return result.sort((a, b) => b.tx.timestamp - a.tx.timestamp);
  }, [ethWallets]);

  // Map chainStore transactions to UnifiedTransaction format
  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    const unified: UnifiedTransaction[] = [];

    // Format BTC amount
    const formatBtc = (sats: number) => {
      const btc = Math.abs(sats) / 100_000_000;
      return btc.toFixed(8);
    };

    // Add Bitcoin transactions
    for (const tx of allBtcTransactions) {
      const wallet = wallets.find((w) => w.id === tx.wallet_id);
      const walletName = wallet?.name ?? "Unknown";
      const amountSats = parseInt(tx.amount, 10) || 0;
      const timestamp = tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : null;

      unified.push({
        id: tx.id,
        chain: "bitcoin",
        type: tx.tx_type as "received" | "sent" | "internal",
        amount: formatBtc(amountSats),
        amountRaw: amountSats,
        asset: tx.asset_symbol,
        timestamp,
        status: tx.block_number ? "confirmed" : "pending",
        txid: tx.tx_hash,
        walletId: tx.wallet_id,
        walletName,
      });
    }

    // Add Ethereum transactions
    for (const { tx, walletId } of allEthTransactions) {
      const wallet = wallets.find((w) => w.id === walletId);
      const walletName = wallet?.name ?? "Unknown";

      // Determine type and amount
      let type: UnifiedTransaction["type"];
      if (tx.direction === "receive") type = "received";
      else if (tx.direction === "send") type = "sent";
      else if (tx.direction === "self") type = "self";
      else type = "contract";

      let amount: string;
      let asset: string;
      let amountRaw: number;
      let tokenTransfer: UnifiedTransaction["tokenTransfer"] | undefined;

      if (tx.tokenTransfer) {
        // Token transfer
        const tokenValue = parseFloat(tx.tokenTransfer.value) / Math.pow(10, tx.tokenTransfer.decimals);
        amount = tokenValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        });
        asset = tx.tokenTransfer.symbol;
        amountRaw = parseFloat(tx.tokenTransfer.value);
        tokenTransfer = {
          symbol: tx.tokenTransfer.symbol,
          name: tx.tokenTransfer.name,
          decimals: tx.tokenTransfer.decimals,
        };
      } else {
        // Native transfer
        const valueEth = parseFloat(tx.value) / 1e18;
        amount = valueEth.toLocaleString(undefined, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        });
        asset = tx.chainId === "polygon" ? "POL" : "ETH";
        amountRaw = parseFloat(tx.value);
      }

      unified.push({
        id: tx.hash,
        chain: tx.chainId,
        type,
        amount,
        amountRaw,
        asset,
        timestamp: tx.timestamp,
        status: tx.status,
        txid: tx.hash,
        walletId,
        walletName,
        tokenTransfer,
      });
    }

    // Sort all by timestamp descending
    unified.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    return unified;
  }, [allBtcTransactions, allEthTransactions, wallets]);

  const openInExplorer = (chain: string, txid: string) => {
    if (chain === "bitcoin") {
      window.open(`https://mempool.space/tx/${txid}`, "_blank");
    } else if (chain in evmExplorers) {
      window.open(`${evmExplorers[chain as EVMChainId]}${txid}`, "_blank");
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Pending";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div {...pageTransition}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">
              Transactions
            </h1>
            <p className="text-muted-foreground">
              View and categorize your transaction history
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Button variant="outline" size="sm">
                  All Chains
                </Button>
                <Button variant="outline" size="sm">
                  All Types
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        {unifiedTransactions.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-2"
          >
            {unifiedTransactions.map((tx) => {
              const isReceived = tx.type === "received";
              const isSelfOrContract = tx.type === "self" || tx.type === "contract" || tx.type === "internal";
              const isFailed = tx.status === "failed";
              const isTokenTransfer = !!tx.tokenTransfer;

              const Icon = isReceived
                ? ArrowDownLeft
                : isSelfOrContract
                ? ArrowLeftRight
                : ArrowUpRight;

              // Determine amount prefix based on type
              const amountPrefix = isReceived ? "+" : isSelfOrContract ? "" : "-";

              // Calculate USD value based on chain
              let usdValue: string | null = null;
              if (tx.chain === "bitcoin" && btcPrice) {
                usdValue = ((Math.abs(tx.amountRaw) / 100_000_000) * btcPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              } else if (tx.chain !== "bitcoin" && ethPrice && !isTokenTransfer) {
                // Native ETH/POL transfer
                usdValue = ((Math.abs(tx.amountRaw) / 1e18) * ethPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              }

              // Type label for display
              const typeLabel = isTokenTransfer
                ? isReceived
                  ? "Received Token"
                  : "Sent Token"
                : tx.type.charAt(0).toUpperCase() + tx.type.slice(1);

              return (
                <motion.div
                  key={tx.id}
                  variants={staggerItem}
                  className="group card-premium p-4 flex items-center gap-4"
                >
                  {/* Direction Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isFailed
                        ? "bg-destructive/10"
                        : isReceived
                        ? "bg-success/10"
                        : isSelfOrContract
                        ? "bg-muted"
                        : "bg-orange-500/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isFailed
                          ? "text-destructive"
                          : isReceived
                          ? "text-success"
                          : isSelfOrContract
                          ? "text-muted-foreground"
                          : "text-orange-500"
                      )}
                    />
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{typeLabel}</span>
                      <ChainIcon chainId={tx.chain} size={14} variant="branded" />
                      {isFailed ? (
                        <span className="text-xs text-destructive">Failed</span>
                      ) : tx.status === "confirmed" || tx.status === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-warning" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {tx.walletName}
                      {tx.tokenTransfer && (
                        <span className="ml-1 text-xs">• {tx.tokenTransfer.name}</span>
                      )}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "font-mono font-medium tabular-nums",
                        isFailed
                          ? "text-muted-foreground line-through"
                          : isReceived
                          ? "text-success"
                          : "text-foreground"
                      )}
                    >
                      {amountPrefix}
                      {tx.amount} {tx.asset}
                    </p>
                    {usdValue && !isFailed && (
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        ${usdValue}
                      </p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right shrink-0 w-24">
                    <p className="text-sm">{formatDate(tx.timestamp)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(tx.timestamp)}
                    </p>
                  </div>

                  {/* Explorer Link */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => openInExplorer(tx.chain, tx.txid)}
                    title="View in explorer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* Empty State */
          <Card className="card-premium">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ArrowUpRight className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Connect a wallet to see your transaction history. Transactions
                will be automatically synced and categorized.
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Categorization Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg">✨</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered Categorization</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your AI API key in Settings to enable automatic
                  transaction categorization for tax reporting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
