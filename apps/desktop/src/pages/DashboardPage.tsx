import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { ChainIcon } from "@/components/ui/crypto-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/walletStore";
import { useBitcoinStore } from "@/stores/bitcoinStore";
import { useEthereumStore } from "@/stores/ethereumStore";
import { formatBtc, satsToBtc } from "@/lib/tauri/bitcoin";
import { formatEther } from "@/lib/viem";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { wallets } = useWalletStore();
  const { getWalletState, fetchPrice: fetchBtcPrice, price: btcPrice, walletStates } = useBitcoinStore();
  const {
    wallets: ethWallets,
    fetchPrice: fetchEthPrice,
    price: ethPrice,
    getTotalBalanceUsd: getEthTotalUsd,
  } = useEthereumStore();

  // Fetch prices on mount
  useEffect(() => {
    if (!btcPrice.btcUsd) {
      fetchBtcPrice();
    }
    if (!ethPrice.prices["ethereum"]) {
      fetchEthPrice();
    }
  }, [btcPrice.btcUsd, fetchBtcPrice, ethPrice.prices, fetchEthPrice]);

  // Calculate portfolio values from all wallets (BTC + ETH)
  const portfolioData = useMemo(() => {
    let totalSats = 0;
    let totalTransactions = 0;

    // Get all wallets with Bitcoin addresses
    const btcWallets = wallets.filter((w) =>
      w.addresses.some((a) => a.chain === "bitcoin")
    );

    btcWallets.forEach((wallet) => {
      const state = getWalletState(wallet.id);
      if (state.balance) {
        totalSats += state.balance.confirmed + state.balance.unconfirmed;
      }
      totalTransactions += state.transactions.length;
    });

    const totalBtc = satsToBtc(totalSats);
    const btcUsdValue = btcPrice.btcUsd ? totalBtc * btcPrice.btcUsd : 0;

    // Get all wallets with Ethereum addresses
    const ethWalletsList = wallets.filter((w) =>
      w.addresses.some((a) => a.chain === "ethereum")
    );

    // Calculate total ETH holdings across all wallets and chains
    let totalEthWei = BigInt(0);
    let ethUsdValue = 0;

    ethWalletsList.forEach((wallet) => {
      const ethWalletState = ethWallets[wallet.id];
      if (ethWalletState) {
        // Sum native ETH balances across all EVM chains
        (["ethereum", "arbitrum", "optimism", "base"] as const).forEach((chainId) => {
          const chainBalance = ethWalletState[chainId]?.balance;
          if (chainBalance?.wei) {
            totalEthWei += BigInt(chainBalance.wei);
          }
        });
        // Get total USD value including tokens
        ethUsdValue += getEthTotalUsd(wallet.id);
      }
    });

    const totalEth = parseFloat(formatEther(totalEthWei));
    const totalUsd = btcUsdValue + ethUsdValue;

    return {
      // BTC data
      totalSats,
      totalBtc,
      btcUsdValue,
      btcWalletCount: btcWallets.length,
      // ETH data
      totalEthWei,
      totalEth,
      ethUsdValue,
      ethWalletCount: ethWalletsList.length,
      // Combined
      totalUsd,
      transactionCount: totalTransactions,
    };
  }, [wallets, walletStates, btcPrice.btcUsd, getWalletState, ethWallets, ethPrice.prices, getEthTotalUsd]);

  // Check if any wallet is syncing (BTC or ETH)
  const isSyncing = useMemo(() => {
    // Check BTC wallets
    const btcSyncing = wallets.some((w) => {
      const state = getWalletState(w.id);
      return state.isSyncing;
    });

    // Check ETH wallets
    const ethSyncing = wallets.some((w) => {
      const ethWalletState = ethWallets[w.id];
      if (!ethWalletState) return false;
      return (["ethereum", "arbitrum", "optimism", "base", "polygon"] as const).some(
        (chainId) => ethWalletState[chainId]?.isSyncing
      );
    });

    return btcSyncing || ethSyncing;
  }, [wallets, walletStates, getWalletState, ethWallets]);

  const portfolioValue = portfolioData.totalUsd;
  const change24h = 0; // TODO: Implement 24h change tracking
  const changePercent = 0; // TODO: Implement percentage change
  const walletCount = wallets.length;
  const transactionCount = portfolioData.transactionCount;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.header variants={itemVariants} className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your portfolio performance and recent activity
        </p>
      </motion.header>

      {/* Portfolio Overview - Hero Card */}
      <motion.div variants={itemVariants}>
        <div className="card-premium relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

          <div className="relative p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span>Total Portfolio Value</span>
                  {isSyncing && (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-5xl font-heading font-bold tracking-tight tabular-nums">
                    ${portfolioValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>

                  {/* Holdings Summary */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {portfolioData.totalSats > 0 && (
                      <div className="flex items-center gap-1.5">
                        <ChainIcon chainId="bitcoin" size={14} variant="branded" />
                        <span className="font-mono tabular-nums">
                          {formatBtc(portfolioData.totalSats, 8)} BTC
                        </span>
                      </div>
                    )}
                    {portfolioData.totalEth > 0 && (
                      <div className="flex items-center gap-1.5">
                        <ChainIcon chainId="ethereum" size={14} variant="branded" />
                        <span className="font-mono tabular-nums">
                          {portfolioData.totalEth.toFixed(6)} ETH
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full",
                        changePercent >= 0
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {changePercent >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      <span className="tabular-nums">
                        {changePercent >= 0 ? "+" : ""}
                        {changePercent.toFixed(2)}%
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ${Math.abs(change24h).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      today
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-8">
                <QuickStat
                  label="Wallets"
                  value={walletCount.toString()}
                  icon={Wallet}
                />
                <QuickStat
                  label="Transactions"
                  value={transactionCount.toString()}
                  icon={Clock}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="card-premium p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-semibold">
                Portfolio Performance
              </h3>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {["1D", "1W", "1M", "1Y", "All"].map((period) => (
                  <button
                    key={period}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      period === "1M"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="h-[280px] flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-dashed border-border">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">No portfolio data yet</p>
                  <p className="text-xs text-muted-foreground">
                    Add a wallet to see your performance chart
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/wallets")}
                  className="gap-2 text-primary hover:text-primary/80"
                >
                  <Plus className="h-4 w-4" />
                  Add your first wallet
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Assets */}
        <motion.div variants={itemVariants}>
          <div className="card-premium p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-semibold">Top Assets</h3>
              <button
                onClick={() => navigate("/wallets")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {(portfolioData.totalSats > 0 || portfolioData.totalEth > 0) ? (
              <div className="space-y-3">
                {/* Bitcoin Asset */}
                {portfolioData.totalSats > 0 && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                      <ChainIcon chainId="bitcoin" size={24} variant="branded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bitcoin</span>
                        <span className="text-xs text-muted-foreground">BTC</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {portfolioData.btcWalletCount} wallet{portfolioData.btcWalletCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium tabular-nums">
                        {formatBtc(portfolioData.totalSats, 8)} BTC
                      </p>
                      {portfolioData.btcUsdValue > 0 && (
                        <p className="text-sm text-muted-foreground tabular-nums">
                          ${portfolioData.btcUsdValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Ethereum Asset */}
                {portfolioData.ethWalletCount > 0 && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ChainIcon chainId="ethereum" size={24} variant="branded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Ethereum</span>
                        <span className="text-xs text-muted-foreground">ETH</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {portfolioData.ethWalletCount} wallet{portfolioData.ethWalletCount !== 1 ? "s" : ""} • Includes tokens
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium tabular-nums">
                        {portfolioData.totalEth.toFixed(6)} ETH
                      </p>
                      {portfolioData.ethUsdValue > 0 && (
                        <p className="text-sm text-muted-foreground tabular-nums">
                          ${portfolioData.ethUsdValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="h-[280px] flex flex-col items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No assets to display
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/wallets")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add wallet
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold">
              Recent Transactions
            </h3>
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Empty state */}
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Transactions will appear here once you add a wallet and start
                  tracking your activity
                </p>
              </div>
            </div>
          </div>

          {/* Transaction list preview (hidden when empty) */}
          <div className="hidden divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <TransactionRow key={i} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Quick stat component
function QuickStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-heading font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

// Transaction row component (for when there's data)
function TransactionRow() {
  const isReceive = Math.random() > 0.5;

  return (
    <div className="flex items-center gap-4 py-4 group">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isReceive ? "bg-success/10" : "bg-primary/10"
        )}
      >
        {isReceive ? (
          <ArrowDownLeft className="h-5 w-5 text-success" />
        ) : (
          <ArrowUpRight className="h-5 w-5 text-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {isReceive ? "Received" : "Sent"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            BTC
          </span>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          0x1234...5678
        </div>
      </div>

      <div className="text-right">
        <div
          className={cn(
            "font-mono font-medium tabular-nums",
            isReceive ? "text-success" : "text-foreground"
          )}
        >
          {isReceive ? "+" : "-"}0.0234 BTC
        </div>
        <div className="text-xs text-muted-foreground">$1,234.56</div>
      </div>
    </div>
  );
}
