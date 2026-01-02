import { motion } from "framer-motion";
import { Plus, Wallet, Eye, Bitcoin, Hexagon, QrCode, Import, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export default function WalletsPage() {
  // Placeholder - no wallets connected yet
  const wallets: Array<{
    id: string;
    name: string;
    chain: "bitcoin" | "ethereum";
    address: string;
    balance: string;
    balanceUsd: string;
    isWatchOnly: boolean;
  }> = [];

  const addWalletOptions = [
    {
      id: "create",
      title: "Create New Wallet",
      description: "Generate a new HD wallet with secure seed phrase",
      icon: Plus,
      accent: "primary",
    },
    {
      id: "import",
      title: "Import Wallet",
      description: "Import using seed phrase or private key",
      icon: Import,
      accent: "primary",
    },
    {
      id: "watch",
      title: "Watch Address",
      description: "Track any public address without private keys",
      icon: Eye,
      accent: "muted",
    },
    {
      id: "scan",
      title: "Scan QR Code",
      description: "Scan a wallet QR code to add it",
      icon: QrCode,
      accent: "muted",
    },
  ];

  const supportedChains = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      icon: Bitcoin,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      icon: Hexagon,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground">
            Manage your wallets and track addresses across chains
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Wallet
        </Button>
      </motion.header>

      {/* Wallet list or empty state */}
      {wallets.length > 0 ? (
        <motion.div
          variants={containerVariants}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {wallets.map((wallet) => (
            <motion.div key={wallet.id} variants={itemVariants}>
              <div className="card-premium p-5 group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      wallet.chain === "bitcoin" ? "bg-orange-500/10" : "bg-blue-500/10"
                    )}>
                      {wallet.chain === "bitcoin" ? (
                        <Bitcoin className="h-5 w-5 text-orange-500" />
                      ) : (
                        <Hexagon className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{wallet.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </p>
                    </div>
                  </div>
                  {wallet.isWatchOnly && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Watch-only
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-heading font-semibold tabular-nums">
                    {wallet.balance}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {wallet.balanceUsd}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <div className="card-premium p-12">
            <div className="max-w-md mx-auto text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-heading font-semibold mb-2">
                No wallets connected
              </h2>
              <p className="text-muted-foreground mb-8">
                Add your first wallet to start tracking your portfolio across multiple chains.
                You can create new wallets, import existing ones, or track watch-only addresses.
              </p>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Wallet
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add wallet options */}
      <motion.section variants={itemVariants} className="space-y-4">
        <h2 className="text-lg font-heading font-semibold">Add a Wallet</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addWalletOptions.map((option) => (
            <motion.div
              key={option.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-full"
            >
              <button className="w-full h-full text-left card-premium p-5 group hover:border-primary/50 transition-colors flex flex-col">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0",
                  option.accent === "primary" ? "bg-primary/10" : "bg-muted"
                )}>
                  <option.icon className={cn(
                    "h-5 w-5",
                    option.accent === "primary" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
                  {option.title}
                </h3>
                <p className="text-sm text-muted-foreground flex-1">
                  {option.description}
                </p>
              </button>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Supported chains */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold">Supported Chains</h2>
          <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            View all chains
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {supportedChains.map((chain) => (
            <motion.div key={chain.name} variants={itemVariants}>
              <div className="card-premium p-5 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", chain.bgColor)}>
                  <chain.icon className={cn("h-6 w-6", chain.color)} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{chain.name}</h3>
                  <p className="text-sm text-muted-foreground">{chain.symbol}</p>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-full bg-success/10 text-success">
                  Supported
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
