import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Wallet,
  Eye,
  Bitcoin,
  Hexagon,
  QrCode,
  Import,
  ArrowRight,
  Circle,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { truncateAddress, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { WalletCreationFlow } from "@/components/wallet/WalletCreationFlow";
import { useWalletStore } from "@/stores/walletStore";

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

// Chain icons lookup
const chainIcons: Record<string, React.ReactNode> = {
  bitcoin: <Bitcoin className="h-5 w-5 text-orange-500" />,
  ethereum: <Hexagon className="h-5 w-5 text-blue-500" />,
  arbitrum: <Circle className="h-5 w-5 text-blue-400" />,
  optimism: <Circle className="h-5 w-5 text-red-500" />,
  base: <Circle className="h-5 w-5 text-blue-600" />,
  polygon: <Circle className="h-5 w-5 text-purple-500" />,
  solana: <Circle className="h-5 w-5 text-gradient-start" />,
};

const chainColors: Record<string, { text: string; bg: string }> = {
  bitcoin: { text: "text-orange-500", bg: "bg-orange-500/10" },
  ethereum: { text: "text-blue-500", bg: "bg-blue-500/10" },
  arbitrum: { text: "text-blue-400", bg: "bg-blue-400/10" },
  optimism: { text: "text-red-500", bg: "bg-red-500/10" },
  base: { text: "text-blue-600", bg: "bg-blue-600/10" },
  polygon: { text: "text-purple-500", bg: "bg-purple-500/10" },
  solana: { text: "text-teal-500", bg: "bg-teal-500/10" },
};

export default function WalletsPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    wallets,
    mainnetChains,
    chainsLoaded,
    loadChains,
    startCreation,
  } = useWalletStore();

  // Load chains on mount
  useEffect(() => {
    if (!chainsLoaded) {
      loadChains();
    }
  }, [chainsLoaded, loadChains]);

  const handleOpenCreate = () => {
    startCreation();
    setShowCreateDialog(true);
  };

  const handleCopyAddress = async (address: string) => {
    const success = await copyToClipboard(address);
    toast({
      title: success ? "Copied!" : "Failed",
      description: success ? "Address copied to clipboard" : "Could not copy",
      variant: success ? "default" : "destructive",
    });
  };

  const addWalletOptions = [
    {
      id: "create",
      title: "Create New Wallet",
      description: "Generate a new HD wallet with secure seed phrase",
      icon: Plus,
      accent: "primary",
      onClick: handleOpenCreate,
    },
    {
      id: "import",
      title: "Import Wallet",
      description: "Import using seed phrase or private key",
      icon: Import,
      accent: "primary",
      onClick: () => {
        // TODO: Implement import flow
        toast({
          title: "Coming soon",
          description: "Import wallet functionality will be available soon",
        });
      },
    },
    {
      id: "watch",
      title: "Watch Address",
      description: "Track any public address without private keys",
      icon: Eye,
      accent: "muted",
      onClick: () => {
        // TODO: Implement watch-only flow
        toast({
          title: "Coming soon",
          description: "Watch-only addresses will be available soon",
        });
      },
    },
    {
      id: "scan",
      title: "Scan QR Code",
      description: "Scan a wallet QR code to add it",
      icon: QrCode,
      accent: "muted",
      onClick: () => {
        // TODO: Implement QR scanning
        toast({
          title: "Coming soon",
          description: "QR code scanning will be available soon",
        });
      },
    },
  ];

  return (
    <>
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
          <Button onClick={handleOpenCreate} className="gap-2">
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
                <div className="card-premium p-5 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{wallet.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {wallet.addresses.length} address
                          {wallet.addresses.length !== 1 ? "es" : ""}
                        </p>
                      </div>
                    </div>
                    {!wallet.hasBackupVerified && (
                      <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning">
                        Backup pending
                      </span>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="space-y-2">
                    {wallet.addresses.map((addr) => {
                      const colors = chainColors[addr.chain] || {
                        text: "text-muted-foreground",
                        bg: "bg-muted",
                      };
                      return (
                        <div
                          key={`${addr.chain}-${addr.address}`}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <div
                            className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center",
                              colors.bg
                            )}
                          >
                            {chainIcons[addr.chain] || (
                              <Circle className="h-3 w-3" />
                            )}
                          </div>
                          <span className="text-xs font-mono flex-1 truncate">
                            {truncateAddress(addr.address, 8, 6)}
                          </span>
                          <button
                            onClick={() => handleCopyAddress(addr.address)}
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      );
                    })}
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
                <Button size="lg" className="gap-2" onClick={handleOpenCreate}>
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
                <button
                  onClick={option.onClick}
                  className="w-full h-full text-left card-premium p-5 group hover:border-primary/50 transition-colors flex flex-col"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0",
                      option.accent === "primary" ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <option.icon
                      className={cn(
                        "h-5 w-5",
                        option.accent === "primary"
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mainnetChains.slice(0, 6).map((chain) => {
              const colors = chainColors[chain.id] || {
                text: "text-muted-foreground",
                bg: "bg-muted",
              };
              return (
                <motion.div key={chain.id} variants={itemVariants}>
                  <div className="card-premium p-5 flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        colors.bg
                      )}
                    >
                      {chainIcons[chain.id] || (
                        <Circle className={cn("h-6 w-6", colors.text)} />
                      )}
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
              );
            })}
          </div>
        </motion.section>
      </motion.div>

      {/* Wallet Creation Dialog */}
      <WalletCreationFlow
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
