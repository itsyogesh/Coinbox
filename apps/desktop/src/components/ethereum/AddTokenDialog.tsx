/**
 * AddTokenDialog - Add custom ERC-20 tokens
 *
 * Allows users to add custom tokens by entering contract address.
 * Fetches token metadata automatically from the blockchain.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fetchTokenMetadata } from "@/lib/viem";
import { useSettingsStore, type CustomToken } from "@/stores/settingsStore";
import type { EVMChainId } from "@coinbox/chains";
import type { Address } from "viem";

interface AddTokenDialogProps {
  chainId: EVMChainId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

export function AddTokenDialog({
  chainId,
  isOpen,
  onClose,
  onSuccess,
}: AddTokenDialogProps) {
  const { addCustomToken } = useSettingsStore();
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<CustomToken | null>(null);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address);

  const handleFetchMetadata = async () => {
    if (!isValidAddress) {
      setError("Please enter a valid contract address");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const metadata = await fetchTokenMetadata(address as Address, chainId);

      if (!metadata) {
        setError("Could not fetch token data. Make sure this is a valid ERC-20 contract.");
        setStatus("error");
        return;
      }

      setTokenData({
        address,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
      });
      setStatus("success");
    } catch (err) {
      setError("Failed to fetch token metadata");
      setStatus("error");
    }
  };

  const handleAddToken = () => {
    if (!tokenData) return;

    addCustomToken(chainId, tokenData);
    onSuccess?.();
    handleClose();
  };

  const handleClose = () => {
    setAddress("");
    setStatus("idle");
    setError(null);
    setTokenData(null);
    onClose();
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
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-semibold">
                      Add Custom Token
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Import an ERC-20 token
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
                {/* Address Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Token Contract Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setStatus("idle");
                        setTokenData(null);
                        setError(null);
                      }}
                      className={cn(
                        "flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm font-mono outline-none transition-all",
                        error
                          ? "border-destructive focus:border-destructive"
                          : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                      )}
                    />
                    <Button
                      onClick={handleFetchMetadata}
                      disabled={!isValidAddress || status === "loading"}
                      className="shrink-0"
                    >
                      {status === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Lookup"
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {error}
                    </p>
                  )}
                </div>

                {/* Token Preview */}
                {tokenData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-success/5 border border-success/20"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {tokenData.name}{" "}
                          <span className="text-muted-foreground">
                            ({tokenData.symbol})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Decimals: {tokenData.decimals}
                        </p>
                      </div>
                    </div>
                  </motion.div>
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
                  disabled={!tokenData}
                  onClick={handleAddToken}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Token
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AddTokenDialog;
