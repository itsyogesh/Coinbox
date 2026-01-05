/**
 * BitcoinBalanceCard - Display Bitcoin balance with sync functionality
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bitcoin,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useBitcoinStore } from "@/stores/bitcoinStore";
import { useChainStore } from "@/stores/chainStore";
import { satsToBtc, formatBtc } from "@/lib/tauri/bitcoin";

interface BitcoinBalanceCardProps {
  walletId: string;
  /** For watch-only single-address wallets, pass the address */
  address?: string;
  onSync?: () => void;
}

export function BitcoinBalanceCard({ walletId, address, onSync }: BitcoinBalanceCardProps) {
  const {
    getWalletState,
    syncWallet,
    fetchBalance,
    fetchPrice,
    price,
  } = useBitcoinStore();

  // Also sync chainStore for global Transactions page
  const syncChainStore = useChainStore((s) => s.syncWallet);

  const walletState = getWalletState(walletId);
  const { balance, isSyncing, lastSynced, error } = walletState;

  // Fetch price on mount
  useEffect(() => {
    if (!price.btcUsd) {
      fetchPrice();
    }
  }, [price.btcUsd, fetchPrice]);

  // Auto-sync on mount if not recently synced (within 5 minutes)
  useEffect(() => {
    const shouldAutoSync = !lastSynced ||
      (Date.now() - new Date(lastSynced).getTime() > 5 * 60 * 1000);

    if (shouldAutoSync && !isSyncing) {
      // Sync both stores - bitcoinStore for local component, chainStore for global
      Promise.all([
        syncWallet(walletId, address),
        syncChainStore(walletId, "bitcoin", address),
      ]).catch(console.error);
    } else {
      // Just fetch cached data
      fetchBalance(walletId, address);
    }
  }, [walletId, address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    try {
      // Sync both stores in parallel
      await Promise.all([
        syncWallet(walletId, address),
        syncChainStore(walletId, "bitcoin", address),
      ]);
      onSync?.();
    } catch (err) {
      console.error("Sync failed:", err);
    }
  };

  const totalSats = balance ? balance.confirmed + balance.unconfirmed : 0;
  const totalBtc = satsToBtc(totalSats);
  const usdValue = price.btcUsd ? totalBtc * price.btcUsd : null;

  const hasUnconfirmed = balance && balance.unconfirmed > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Bitcoin className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Bitcoin Balance</h3>
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
          {isSyncing ? "Syncing..." : "Sync"}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Balance Display */}
      {balance ? (
        <div className="space-y-4">
          {/* Main Balance */}
          <div>
            <p className="text-3xl font-heading font-bold tracking-tight tabular-nums">
              {formatBtc(totalSats, 8)} <span className="text-lg text-muted-foreground">BTC</span>
            </p>
            {usdValue !== null && (
              <p className="text-lg text-muted-foreground tabular-nums">
                ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Balance Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                Confirmed
              </div>
              <p className="font-mono text-sm tabular-nums">
                {formatBtc(balance.confirmed, 8)} BTC
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5 text-warning" />
                Pending
              </div>
              <p className={cn(
                "font-mono text-sm tabular-nums",
                hasUnconfirmed && "text-warning"
              )}>
                {formatBtc(balance.unconfirmed, 8)} BTC
              </p>
            </div>
          </div>

          {/* Pending Notice */}
          {hasUnconfirmed && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 text-warning text-xs">
              <Clock className="h-3.5 w-3.5" />
              You have pending transactions waiting for confirmation
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Bitcoin className="h-8 w-8 text-muted-foreground" />
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

export default BitcoinBalanceCard;
