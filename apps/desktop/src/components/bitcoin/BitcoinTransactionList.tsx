/**
 * BitcoinTransactionList - Display Bitcoin transaction history
 */

import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  Copy,
} from "lucide-react";

import { cn, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBitcoinStore } from "@/stores/bitcoinStore";
import { BitcoinTransaction, satsToBtc, formatBtc } from "@/lib/tauri/bitcoin";

interface BitcoinTransactionListProps {
  walletId: string;
  limit?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export function BitcoinTransactionList({ walletId, limit }: BitcoinTransactionListProps) {
  const { toast } = useToast();
  const { getWalletState, price } = useBitcoinStore();
  const { transactions } = getWalletState(walletId);

  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  const handleCopyTxid = async (txid: string) => {
    const success = await copyToClipboard(txid);
    toast({
      title: success ? "Copied!" : "Failed",
      description: success ? "Transaction ID copied" : "Could not copy",
      variant: success ? "default" : "destructive",
    });
  };

  const openInExplorer = (txid: string) => {
    window.open(`https://mempool.space/tx/${txid}`, "_blank");
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          No transactions yet. Sync your wallet to see transaction history.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {displayTransactions.map((tx) => (
        <TransactionRow
          key={tx.txid}
          transaction={tx}
          btcPrice={price.btcUsd}
          onCopy={handleCopyTxid}
          onOpenExplorer={openInExplorer}
        />
      ))}

      {limit && transactions.length > limit && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          +{transactions.length - limit} more transactions
        </p>
      )}
    </motion.div>
  );
}

interface TransactionRowProps {
  transaction: BitcoinTransaction;
  btcPrice: number | null;
  onCopy: (txid: string) => void;
  onOpenExplorer: (txid: string) => void;
}

function TransactionRow({ transaction, btcPrice, onCopy, onOpenExplorer }: TransactionRowProps) {
  const { txid, direction, amount_sats, status, timestamp } = transaction;

  const isReceived = direction === "received";
  const isInternal = direction === "internal";
  const isConfirmed = status.type === "confirmed";

  const amountBtc = satsToBtc(Math.abs(amount_sats));
  const usdValue = btcPrice ? amountBtc * btcPrice : null;

  const Icon = isReceived ? ArrowDownLeft : isInternal ? ArrowLeftRight : ArrowUpRight;
  const iconColor = isReceived ? "text-success" : isInternal ? "text-muted-foreground" : "text-orange-500";
  const amountColor = isReceived ? "text-success" : "text-foreground";
  const amountPrefix = isReceived ? "+" : isInternal ? "" : "-";

  const formattedDate = timestamp
    ? new Date(timestamp * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Pending";

  const formattedTime = timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      variants={itemVariants}
      className="group flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-border transition-colors"
    >
      {/* Direction Icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isReceived ? "bg-success/10" : isInternal ? "bg-muted" : "bg-orange-500/10"
      )}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>

      {/* Transaction Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">
            {direction === "received" ? "Received" : direction === "sent" ? "Sent" : "Internal"}
          </span>
          {isConfirmed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-warning" />
          )}
          {!isConfirmed && (
            <span className="text-xs text-warning">Pending</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
            {txid}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onCopy(txid)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={cn("font-mono font-medium tabular-nums", amountColor)}>
          {amountPrefix}{formatBtc(Math.abs(amount_sats), 8)} BTC
        </p>
        {usdValue !== null && (
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Date & Actions */}
      <div className="text-right shrink-0 w-24">
        <p className="text-sm">{formattedDate}</p>
        <p className="text-xs text-muted-foreground">{formattedTime}</p>
      </div>

      {/* Explorer Link */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={() => onOpenExplorer(txid)}
        title="View in explorer"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

export default BitcoinTransactionList;
