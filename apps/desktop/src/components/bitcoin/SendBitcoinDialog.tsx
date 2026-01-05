/**
 * SendBitcoinDialog - Send Bitcoin transaction dialog
 *
 * Features:
 * - Recipient address input with validation
 * - Amount input (BTC or USD)
 * - Fee rate selection (priority levels)
 * - Transaction preview and confirmation
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bitcoin,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Zap,
  Clock,
  Snail,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
import { useBitcoinStore } from "@/stores/bitcoinStore";
import {
  sendBitcoinTransaction,
  validateBitcoinAddress,
  estimateBitcoinFee,
  btcToSats,
  satsToBtc,
  formatBtc,
  FeeEstimate,
  SendTransactionResult,
} from "@/lib/tauri/bitcoin";

interface SendBitcoinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  walletName: string;
  availableBalance: number; // in sats
}

type SendStep = "form" | "confirm" | "sending" | "success" | "error";

interface FeeOption {
  id: "fast" | "medium" | "slow";
  label: string;
  icon: React.ReactNode;
  targetBlocks: number;
  estimate?: FeeEstimate;
}

const FEE_OPTIONS: FeeOption[] = [
  { id: "fast", label: "Fast", icon: <Zap className="h-4 w-4" />, targetBlocks: 1 },
  { id: "medium", label: "Medium", icon: <Clock className="h-4 w-4" />, targetBlocks: 3 },
  { id: "slow", label: "Slow", icon: <Snail className="h-4 w-4" />, targetBlocks: 6 },
];

export function SendBitcoinDialog({
  open,
  onOpenChange,
  walletId,
  walletName,
  availableBalance,
}: SendBitcoinDialogProps) {
  const { toast } = useToast();
  const { price } = useBitcoinStore();
  const btcPrice = price.btcUsd;

  // Form state
  const [step, setStep] = useState<SendStep>("form");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amountBtc, setAmountBtc] = useState("");
  const [selectedFee, setSelectedFee] = useState<"fast" | "medium" | "slow">("medium");
  const [feeEstimates, setFeeEstimates] = useState<Record<string, FeeEstimate>>({});

  // Validation state
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [addressValidating, setAddressValidating] = useState(false);

  // Transaction state
  const [txResult, setTxResult] = useState<SendTransactionResult | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("form");
      setRecipientAddress("");
      setAmountBtc("");
      setSelectedFee("medium");
      setAddressValid(null);
      setTxResult(null);
      setTxError(null);
    }
  }, [open]);

  // Fetch fee estimates on open
  useEffect(() => {
    if (!open) return;

    async function fetchFees() {
      const estimates: Record<string, FeeEstimate> = {};
      for (const option of FEE_OPTIONS) {
        try {
          const estimate = await estimateBitcoinFee(option.targetBlocks);
          estimates[option.id] = estimate;
        } catch (e) {
          console.error(`Failed to estimate fee for ${option.id}:`, e);
          // Use fallback values
          estimates[option.id] = {
            sat_per_vbyte: option.id === "fast" ? 20 : option.id === "medium" ? 10 : 5,
            target_blocks: option.targetBlocks,
          };
        }
      }
      setFeeEstimates(estimates);
    }

    fetchFees();
  }, [open]);

  // Validate address with debounce
  useEffect(() => {
    if (!recipientAddress || recipientAddress.length < 26) {
      setAddressValid(null);
      return;
    }

    const timer = setTimeout(async () => {
      setAddressValidating(true);
      try {
        const valid = await validateBitcoinAddress(recipientAddress);
        setAddressValid(valid);
      } catch {
        setAddressValid(false);
      } finally {
        setAddressValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [recipientAddress]);

  // Calculate amounts
  const amountSats = useMemo(() => {
    const btc = parseFloat(amountBtc) || 0;
    return btcToSats(btc);
  }, [amountBtc]);

  const amountUsd = useMemo(() => {
    if (!btcPrice) return null;
    const btc = parseFloat(amountBtc) || 0;
    return btc * btcPrice;
  }, [amountBtc, btcPrice]);

  const currentFeeRate = feeEstimates[selectedFee]?.sat_per_vbyte || 10;

  // Estimate transaction fee (assuming ~140 vbytes for simple tx)
  const estimatedVsize = 140;
  const estimatedFeeSats = Math.ceil(currentFeeRate * estimatedVsize);
  const totalSats = amountSats + estimatedFeeSats;

  const hasInsufficientFunds = totalSats > availableBalance;
  const canSend =
    addressValid === true &&
    amountSats > 0 &&
    !hasInsufficientFunds;

  const handleSend = async () => {
    if (!canSend) return;

    setStep("sending");
    setTxError(null);

    try {
      const result = await sendBitcoinTransaction(
        walletId,
        recipientAddress,
        amountSats,
        currentFeeRate,
        true // broadcast
      );
      setTxResult(result);
      setStep("success");
      toast({
        title: "Transaction sent!",
        description: `${formatBtc(amountSats, 8)} BTC sent successfully`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Transaction failed";
      setTxError(errorMsg);
      setStep("error");
    }
  };

  const openInExplorer = (txid: string) => {
    window.open(`https://mempool.space/tx/${txid}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-orange-500" />
            Send Bitcoin
          </DialogTitle>
          <DialogDescription>
            Send Bitcoin from {walletName}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Form Step */}
          {step === "form" && (
            <>
              {/* Recipient Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Address</label>
                <div className="relative">
                  <Input
                    placeholder="bc1q... or 1... or 3..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className={cn(
                      "font-mono text-sm pr-10",
                      addressValid === true && "border-success",
                      addressValid === false && "border-destructive"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {addressValidating && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!addressValidating && addressValid === true && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {!addressValidating && addressValid === false && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                {addressValid === false && (
                  <p className="text-xs text-destructive">Invalid Bitcoin address</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00000000"
                    value={amountBtc}
                    onChange={(e) => setAmountBtc(e.target.value)}
                    className="font-mono text-lg pr-16"
                    step="0.00000001"
                    min="0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                    <Bitcoin className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">BTC</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {amountUsd !== null
                      ? `$${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "-"}
                  </span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      const maxSendable = Math.max(0, availableBalance - estimatedFeeSats);
                      setAmountBtc(satsToBtc(maxSendable).toFixed(8));
                    }}
                  >
                    Max: {formatBtc(availableBalance, 8)} BTC
                  </button>
                </div>
              </div>

              {/* Fee Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Speed</label>
                <div className="grid grid-cols-3 gap-2">
                  {FEE_OPTIONS.map((option) => {
                    const estimate = feeEstimates[option.id];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedFee(option.id)}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-colors",
                          selectedFee === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {option.icon}
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {estimate
                            ? `~${estimate.sat_per_vbyte.toFixed(0)} sat/vB`
                            : "Loading..."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ~{option.targetBlocks * 10} min
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-card/50 border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono">{formatBtc(amountSats, 8)} BTC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Fee</span>
                  <span className="font-mono">~{formatBtc(estimatedFeeSats, 8)} BTC</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span className="font-mono">{formatBtc(totalSats, 8)} BTC</span>
                </div>
              </div>

              {/* Insufficient Funds Warning */}
              {hasInsufficientFunds && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>Insufficient funds. You need at least {formatBtc(totalSats, 8)} BTC.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setStep("confirm")}
                  disabled={!canSend}
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* Confirm Step */}
          {step === "confirm" && (
            <>
              <div className="p-4 rounded-lg bg-card/50 border space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sending</p>
                  <p className="text-2xl font-heading font-bold tabular-nums">
                    {formatBtc(amountSats, 8)} BTC
                  </p>
                  {amountUsd !== null && (
                    <p className="text-sm text-muted-foreground">
                      ${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <p className="font-mono text-sm break-all">{recipientAddress}</p>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-mono">~{formatBtc(estimatedFeeSats, 8)} BTC</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Deducted</span>
                    <span className="font-mono">{formatBtc(totalSats, 8)} BTC</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-warning">
                  Please verify the address carefully. Bitcoin transactions cannot be reversed.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("form")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSend}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Send Bitcoin
                </Button>
              </div>
            </>
          )}

          {/* Sending Step */}
          {step === "sending" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="font-heading font-semibold mb-1">Sending Transaction</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while your transaction is signed and broadcast...
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && txResult && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div className="text-center">
                  <h3 className="font-heading font-semibold text-lg mb-1">
                    Transaction Sent!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your Bitcoin has been sent successfully
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-card/50 border space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                  <p className="font-mono text-xs break-all">{txResult.txid}</p>
                </div>
                {txResult.fee_sats && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fee Paid</p>
                    <p className="font-mono text-sm">{formatBtc(txResult.fee_sats, 8)} BTC</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => openInExplorer(txResult.txid)}
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Explorer
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center">
                  <h3 className="font-heading font-semibold text-lg mb-1">
                    Transaction Failed
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {txError || "An error occurred while sending your transaction"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("form")}
                >
                  Try Again
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default SendBitcoinDialog;
