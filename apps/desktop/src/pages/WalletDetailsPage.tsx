/**
 * WalletDetailsPage - View and manage individual wallet
 *
 * Features:
 * - View wallet info and addresses
 * - Edit wallet name
 * - Delete wallet
 * - Copy addresses
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Pencil,
  Trash2,
  Check,
  X,
  Wallet,
  Eye,
  Bitcoin,
  Hexagon,
  Circle,
  AlertTriangle,
  Shield,
} from "lucide-react";

import { cn, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  solana: <Circle className="h-5 w-5 text-teal-500" />,
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

export default function WalletDetailsPage() {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { wallets, selectWallet, mainnetChains, chainsLoaded, loadChains } = useWalletStore();

  const wallet = wallets.find((w) => w.id === walletId);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(wallet?.name || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load chains on mount
  useEffect(() => {
    if (!chainsLoaded) {
      loadChains();
    }
  }, [chainsLoaded, loadChains]);

  // Set selected wallet on mount
  useEffect(() => {
    if (walletId) {
      selectWallet(walletId);
    }
  }, [walletId, selectWallet]);

  // Update edited name when wallet changes
  useEffect(() => {
    if (wallet) {
      setEditedName(wallet.name);
    }
  }, [wallet?.name]);

  const handleCopyAddress = async (address: string) => {
    const success = await copyToClipboard(address);
    toast({
      title: success ? "Copied!" : "Failed",
      description: success ? "Address copied to clipboard" : "Could not copy",
      variant: success ? "default" : "destructive",
    });
  };

  const handleSaveName = () => {
    if (!wallet || !editedName.trim()) return;

    useWalletStore.setState((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === wallet.id ? { ...w, name: editedName.trim() } : w
      ),
    }));

    setIsEditing(false);
    toast({
      title: "Wallet renamed",
      description: `Wallet is now named "${editedName.trim()}"`,
    });
  };

  const handleDelete = () => {
    if (!wallet) return;

    useWalletStore.setState((state) => ({
      wallets: state.wallets.filter((w) => w.id !== wallet.id),
      selectedWalletId:
        state.selectedWalletId === wallet.id ? null : state.selectedWalletId,
    }));

    setShowDeleteDialog(false);
    toast({
      title: "Wallet deleted",
      description: `"${wallet.name}" has been removed`,
    });
    navigate("/wallets");
  };

  if (!wallet) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] space-y-4"
      >
        <Wallet className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-heading font-semibold">Wallet not found</h2>
        <p className="text-muted-foreground">
          This wallet doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate("/wallets")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Wallets
        </Button>
      </motion.div>
    );
  }

  const walletTypeLabel =
    wallet.type === "hd"
      ? "HD Wallet"
      : wallet.type === "watch_only"
      ? "Watch-only"
      : "Private Key";

  const walletTypeIcon =
    wallet.type === "watch_only" ? (
      <Eye className="h-4 w-4" />
    ) : (
      <Shield className="h-4 w-4" />
    );

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/wallets")}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Wallets
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                {wallet.type === "watch_only" ? (
                  <Eye className="h-7 w-7 text-primary" />
                ) : (
                  <Wallet className="h-7 w-7 text-primary" />
                )}
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-9 w-64 text-lg font-heading font-bold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setIsEditing(false);
                          setEditedName(wallet.name);
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveName}
                      className="h-8 w-8 text-success"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedName(wallet.name);
                      }}
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-heading font-bold tracking-tight">
                      {wallet.name}
                    </h1>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {walletTypeIcon}
                    {walletTypeLabel}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {wallet.addresses.length} address
                    {wallet.addresses.length !== 1 ? "es" : ""}
                  </span>
                  {!wallet.hasBackupVerified && wallet.type === "hd" && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                        Backup pending
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </motion.header>

        {/* Wallet Info */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-heading font-semibold">Wallet Info</h2>
          <div className="card-premium p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="font-medium">
                  {new Date(wallet.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Wallet ID</p>
                <p className="font-mono text-sm truncate">{wallet.id}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Addresses */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-heading font-semibold">Addresses</h2>
          <div className="space-y-3">
            {wallet.addresses.map((addr, idx) => {
              const chain = mainnetChains.find((c) => c.id === addr.chain);
              const colors = chainColors[addr.chain] || {
                text: "text-muted-foreground",
                bg: "bg-muted",
              };

              return (
                <motion.div
                  key={`${addr.chain}-${addr.address}`}
                  variants={itemVariants}
                  custom={idx}
                  className="card-premium p-5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        colors.bg
                      )}
                    >
                      {chainIcons[addr.chain] || (
                        <Circle className={cn("h-6 w-6", colors.text)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {chain?.name || addr.chain}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {chain?.symbol}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-muted-foreground truncate">
                        {addr.address}
                      </p>
                      {addr.derivationPath && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Path: {addr.derivationPath}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyAddress(addr.address)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Wallet
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{wallet.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          {wallet.type === "hd" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Make sure you have backed up your recovery phrase before deleting.
                Without it, you will lose access to your funds permanently.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
