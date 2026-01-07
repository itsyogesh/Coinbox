/**
 * EthereumTransactionList - Display Ethereum transaction history
 *
 * Shows transactions across all EVM chains with explorer links.
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
import { ChainIcon } from "@/components/ui/crypto-icon";

import { cn, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEthereumStore, type EthereumTransaction } from "@/stores/ethereumStore";
import { type EVMChainId } from "@/lib/viem";

interface EthereumTransactionListProps {
  walletId: string;
  chainId?: EVMChainId;
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

// Chain display configuration
const chainConfig: Record<
  EVMChainId,
  { name: string; color: string; explorerUrl: string }
> = {
  ethereum: {
    name: "Ethereum",
    color: "text-blue-500",
    explorerUrl: "https://etherscan.io/tx/",
  },
  arbitrum: {
    name: "Arbitrum",
    color: "text-blue-400",
    explorerUrl: "https://arbiscan.io/tx/",
  },
  optimism: {
    name: "Optimism",
    color: "text-red-500",
    explorerUrl: "https://optimistic.etherscan.io/tx/",
  },
  base: {
    name: "Base",
    color: "text-blue-600",
    explorerUrl: "https://basescan.org/tx/",
  },
  polygon: {
    name: "Polygon",
    color: "text-purple-500",
    explorerUrl: "https://polygonscan.com/tx/",
  },
};

export function EthereumTransactionList({
  walletId,
  chainId,
  limit,
}: EthereumTransactionListProps) {
  const { toast } = useToast();
  const { wallets } = useEthereumStore();
  const walletState = wallets[walletId];

  // Collect transactions from specified chain or all chains
  const allTransactions: EthereumTransaction[] = [];
  if (walletState) {
    const chains: EVMChainId[] = chainId
      ? [chainId]
      : ["ethereum", "arbitrum", "optimism", "base", "polygon"];

    for (const chain of chains) {
      const chainState = walletState[chain];
      if (chainState?.transactions) {
        allTransactions.push(...chainState.transactions);
      }
    }
  }

  // Sort by timestamp descending
  allTransactions.sort((a, b) => b.timestamp - a.timestamp);

  const displayTransactions = limit
    ? allTransactions.slice(0, limit)
    : allTransactions;

  const handleCopyHash = async (hash: string) => {
    const success = await copyToClipboard(hash);
    toast({
      title: success ? "Copied!" : "Failed",
      description: success ? "Transaction hash copied" : "Could not copy",
      variant: success ? "default" : "destructive",
    });
  };

  const openInExplorer = (hash: string, chain: EVMChainId) => {
    const config = chainConfig[chain];
    window.open(`${config.explorerUrl}${hash}`, "_blank");
  };

  if (allTransactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          No transactions yet. Transaction history will appear after syncing.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Coming soon: Transaction history from block explorers
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
          key={tx.hash}
          transaction={tx}
          onCopy={handleCopyHash}
          onOpenExplorer={openInExplorer}
        />
      ))}

      {limit && allTransactions.length > limit && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          +{allTransactions.length - limit} more transactions
        </p>
      )}
    </motion.div>
  );
}

interface TransactionRowProps {
  transaction: EthereumTransaction;
  onCopy: (hash: string) => void;
  onOpenExplorer: (hash: string, chain: EVMChainId) => void;
}

function TransactionRow({
  transaction,
  onCopy,
  onOpenExplorer,
}: TransactionRowProps) {
  const { hash, chainId, direction, value, status, timestamp, tokenTransfer } = transaction;

  const isReceived = direction === "receive";
  const isSelf = direction === "self";
  const isContract = direction === "contract";
  const isPending = status === "pending";
  const isSuccess = status === "success";
  const isTokenTransfer = !!tokenTransfer;

  const chain = chainConfig[chainId];

  // Get native currency symbol based on chain
  const nativeSymbol = chainId === "polygon" ? "POL" : "ETH";

  // Calculate display amount
  let displayAmount: string;
  let displaySymbol: string;

  if (isTokenTransfer && tokenTransfer) {
    // Token transfer - use token decimals
    const tokenValue = parseFloat(tokenTransfer.value) / Math.pow(10, tokenTransfer.decimals);
    displayAmount = tokenValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    displaySymbol = tokenTransfer.symbol;
  } else {
    // Native transfer - use 18 decimals
    const valueEth = parseFloat(value) / 1e18;
    displayAmount = valueEth.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
    displaySymbol = nativeSymbol;
  }

  const Icon = isReceived
    ? ArrowDownLeft
    : isSelf || isContract
    ? ArrowLeftRight
    : ArrowUpRight;
  const iconColor = isReceived
    ? "text-success"
    : isSelf || isContract
    ? "text-muted-foreground"
    : "text-blue-500";
  const amountColor = isReceived ? "text-success" : "text-foreground";
  const amountPrefix = isReceived ? "+" : isSelf ? "" : "-";

  const formattedDate = new Date(timestamp * 1000).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  const formattedTime = new Date(timestamp * 1000).toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Transaction type label
  const typeLabel = isTokenTransfer
    ? direction === "receive"
      ? "Received Token"
      : "Sent Token"
    : direction === "receive"
    ? "Received"
    : direction === "send"
    ? "Sent"
    : direction === "contract"
    ? "Contract"
    : "Self";

  return (
    <motion.div
      variants={itemVariants}
      className="group flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-border transition-colors"
    >
      {/* Direction Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          isReceived
            ? "bg-success/10"
            : isSelf || isContract
            ? "bg-muted"
            : "bg-blue-500/10"
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>

      {/* Transaction Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{typeLabel}</span>
          {isPending ? (
            <Clock className="h-3.5 w-3.5 text-warning" />
          ) : isSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <span className="text-xs text-destructive">Failed</span>
          )}
          {isPending && <span className="text-xs text-warning">Pending</span>}
          <span
            className={cn(
              "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
              chain.color,
              "bg-current/10"
            )}
          >
            <ChainIcon chainId={chainId} size={14} variant="branded" />
            {chain.name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
            {hash}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onCopy(hash)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={cn("font-mono font-medium tabular-nums", amountColor)}>
          {amountPrefix}{displayAmount} {displaySymbol}
        </p>
        {isTokenTransfer && tokenTransfer && (
          <p className="text-xs text-muted-foreground">{tokenTransfer.name}</p>
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
        onClick={() => onOpenExplorer(hash, chainId)}
        title="View in explorer"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

export default EthereumTransactionList;
