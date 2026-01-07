/**
 * SendTokenDialog - Send ETH or ERC-20 tokens
 *
 * UI for sending tokens. Actual signing requires TauriAccount
 * which routes to the Rust backend.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Send,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChainIcon, TokenIcon } from "@/components/ui/crypto-icon";
import { useEthereumStore, type ChainState } from "@/stores/ethereumStore";
import type { EVMChainId } from "@/lib/viem";

interface SendTokenDialogProps {
  walletId: string;
  chainId: EVMChainId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

type Status = "idle" | "sending" | "success" | "error";

interface SendableAsset {
  type: "native" | "token";
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  address?: string; // Token contract address
}

const chainConfig: Record<EVMChainId, { name: string; nativeSymbol: string }> = {
  ethereum: { name: "Ethereum", nativeSymbol: "ETH" },
  arbitrum: { name: "Arbitrum", nativeSymbol: "ETH" },
  optimism: { name: "Optimism", nativeSymbol: "ETH" },
  base: { name: "Base", nativeSymbol: "ETH" },
  polygon: { name: "Polygon", nativeSymbol: "POL" },
};

export function SendTokenDialog({
  walletId,
  chainId,
  isOpen,
  onClose,
}: SendTokenDialogProps) {
  const { wallets } = useEthereumStore();
  const walletState = wallets[walletId];
  const chainState = walletState?.[chainId] as ChainState | undefined;

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<SendableAsset | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const chain = chainConfig[chainId];
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);

  // Build list of sendable assets
  const getSendableAssets = (): SendableAsset[] => {
    const assets: SendableAsset[] = [];

    // Native balance
    if (chainState?.balance) {
      assets.push({
        type: "native",
        symbol: chainState.balance.symbol,
        name: chain.name,
        balance: chainState.balance.formatted,
        decimals: 18,
      });
    }

    // Token balances
    if (chainState?.tokens) {
      for (const token of chainState.tokens) {
        assets.push({
          type: "token",
          symbol: token.symbol,
          name: token.name,
          balance: token.formattedBalance,
          decimals: token.decimals,
          address: token.address,
        });
      }
    }

    return assets;
  };

  const assets = getSendableAssets();

  // Select first asset by default
  if (!selectedAsset && assets.length > 0 && assets[0]) {
    setSelectedAsset(assets[0]);
  }

  const handleSend = async () => {
    if (!isValidAddress || !amount || !selectedAsset) {
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      // TODO: Implement actual sending via TauriAccount
      // This requires:
      // 1. Creating a TauriAccount for the wallet
      // 2. Using getWalletClient with the account
      // 3. Calling sendTransaction or ERC-20 transfer

      // For now, show a placeholder message
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setError(
        "Send functionality requires wallet signing. " +
        "This will be enabled once wallet integration is complete."
      );
      setStatus("error");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  };

  const handleClose = () => {
    setRecipient("");
    setAmount("");
    setSelectedAsset(null);
    setStatus("idle");
    setError(null);
    onClose();
  };

  const handleSetMax = () => {
    if (selectedAsset) {
      // For native assets, leave some for gas
      if (selectedAsset.type === "native") {
        const balance = parseFloat(selectedAsset.balance);
        const maxAmount = Math.max(0, balance - 0.01).toString();
        setAmount(maxAmount);
      } else {
        setAmount(selectedAsset.balance);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="card-premium p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-semibold">
                      Send {selectedAsset?.symbol || "Token"}
                    </h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      on <ChainIcon chainId={chainId} size={14} variant="branded" />
                      {chain.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Asset Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Asset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {assets.map((asset) => (
                      <button
                        key={asset.address || asset.symbol}
                        onClick={() => setSelectedAsset(asset)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                          selectedAsset?.symbol === asset.symbol &&
                            selectedAsset?.address === asset.address
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        {asset.type === "native" ? (
                          <ChainIcon chainId={chainId} size={24} variant="branded" />
                        ) : (
                          <TokenIcon symbol={asset.symbol} size={24} variant="branded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {asset.balance}
                          </p>
                        </div>
                      </button>
                    ))}
                    {assets.length === 0 && (
                      <p className="col-span-2 text-sm text-muted-foreground text-center py-4">
                        No assets available to send
                      </p>
                    )}
                  </div>
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className={cn(
                      "w-full rounded-lg border bg-background px-4 py-2.5 text-sm font-mono outline-none transition-all",
                      recipient && !isValidAddress
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                    )}
                  />
                  {recipient && !isValidAddress && (
                    <p className="mt-1.5 text-xs text-destructive">
                      Please enter a valid Ethereum address
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Amount</label>
                    {selectedAsset && (
                      <button
                        onClick={handleSetMax}
                        className="text-xs text-primary hover:underline"
                      >
                        Max: {selectedAsset.balance}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {selectedAsset?.symbol || "—"}
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    !isValidAddress ||
                    !amount ||
                    !selectedAsset ||
                    status === "sending"
                  }
                  onClick={handleSend}
                >
                  {status === "sending" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SendTokenDialog;
