/**
 * TransactionsPage - Unified transaction history across all chains
 *
 * Aggregates transactions from chainStore (SQLite-backed).
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
import { useWalletStore } from "@/stores/walletStore";
import { cn } from "@/lib/utils";

interface UnifiedTransaction {
  id: string;
  chain: "bitcoin" | "ethereum";
  type: "received" | "sent" | "internal";
  amount: string;
  amountRaw: number;
  asset: string;
  timestamp: number | null;
  status: "confirmed" | "pending";
  txid: string;
  walletId: string;
  walletName: string;
}

export default function TransactionsPage() {
  const { wallets } = useWalletStore();
  const transactions = useChainStore((s) => s.transactions);
  const prices = useChainStore((s) => s.prices);
  const btcPrice = prices["BTC"]?.price_usd ?? null;

  // Flatten transactions from all wallets
  const allTransactions = useMemo(() => {
    const allTxs = Object.values(transactions).flat();
    // Sort by timestamp descending
    return allTxs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }, [transactions]);

  // Map chainStore transactions to UnifiedTransaction format
  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    return allTransactions.map((tx) => {
      // Find wallet name
      const wallet = wallets.find((w) => w.id === tx.wallet_id);
      const walletName = wallet?.name ?? "Unknown";

      // Parse amount (stored as sats string)
      const amountSats = parseInt(tx.amount, 10) || 0;

      // Format BTC amount
      const formatBtc = (sats: number) => {
        const btc = Math.abs(sats) / 100_000_000;
        return btc.toFixed(8);
      };

      // Parse timestamp
      const timestamp = tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : null;

      return {
        id: tx.id,
        chain: tx.chain as "bitcoin" | "ethereum",
        type: tx.tx_type as "received" | "sent" | "internal",
        amount: formatBtc(amountSats),
        amountRaw: amountSats,
        asset: tx.asset_symbol,
        timestamp,
        status: tx.block_number ? "confirmed" : "pending" as "confirmed" | "pending",
        txid: tx.tx_hash,
        walletId: tx.wallet_id,
        walletName,
      };
    });
  }, [allTransactions, wallets]);

  const openInExplorer = (chain: string, txid: string) => {
    if (chain === "bitcoin") {
      window.open(`https://mempool.space/tx/${txid}`, "_blank");
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
              const isInternal = tx.type === "internal";
              const Icon = isReceived
                ? ArrowDownLeft
                : isInternal
                ? ArrowLeftRight
                : ArrowUpRight;

              return (
                <motion.div
                  key={tx.id}
                  variants={staggerItem}
                  className="group card-premium p-4 flex items-center gap-4"
                >
                  {/* Chain Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isReceived
                        ? "bg-success/10"
                        : isInternal
                        ? "bg-muted"
                        : "bg-orange-500/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isReceived
                          ? "text-success"
                          : isInternal
                          ? "text-muted-foreground"
                          : "text-orange-500"
                      )}
                    />
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{tx.type}</span>
                      <ChainIcon chainId={tx.chain} size={14} variant="branded" />
                      {tx.status === "confirmed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-warning" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {tx.walletName}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "font-mono font-medium tabular-nums",
                        isReceived ? "text-success" : "text-foreground"
                      )}
                    >
                      {isReceived ? "+" : "-"}
                      {tx.amount} {tx.asset}
                    </p>
                    {btcPrice && (
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        $
                        {(
                          (Math.abs(tx.amountRaw) / 100_000_000) *
                          btcPrice
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
