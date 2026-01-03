/**
 * WatchOnlyFlow - Add a watch-only address to track
 *
 * Steps:
 * 1. Select chain
 * 2. Enter address (with validation)
 * 3. Name the wallet
 */

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Bitcoin,
  Hexagon,
  Circle,
  AlertCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useWalletStore } from "@/stores/walletStore";
import { validateChainAddress } from "@/lib/tauri/wallet";

// =============================================================================
// Types
// =============================================================================

type WatchStep = "select-chain" | "enter-address" | "success";

interface WatchState {
  step: WatchStep;
  selectedChain: string | null;
  address: string;
  walletName: string;
}

// =============================================================================
// Animation Variants
// =============================================================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  }),
};

// =============================================================================
// Chain Icons
// =============================================================================

const chainIcons: Record<string, React.ReactNode> = {
  bitcoin: <Bitcoin className="h-5 w-5 text-orange-500" />,
  ethereum: <Hexagon className="h-5 w-5 text-blue-500" />,
  arbitrum: <Circle className="h-5 w-5 text-blue-400" />,
  optimism: <Circle className="h-5 w-5 text-red-500" />,
  base: <Circle className="h-5 w-5 text-blue-600" />,
  polygon: <Circle className="h-5 w-5 text-purple-500" />,
  solana: <Circle className="h-5 w-5 text-teal-500" />,
};

// =============================================================================
// Initial State
// =============================================================================

const initialState: WatchState = {
  step: "select-chain",
  selectedChain: null,
  address: "",
  walletName: "",
};

// =============================================================================
// Props
// =============================================================================

interface WatchOnlyFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function WatchOnlyFlow({ open, onOpenChange }: WatchOnlyFlowProps) {
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<WatchState>(initialState);
  const [isValidating, setIsValidating] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);

  const {
    mainnetChains,
    chainsLoaded,
    loadChains,
    addWatchOnlyAddress,
  } = useWalletStore();

  // Load chains on mount
  useEffect(() => {
    if (!chainsLoaded) {
      loadChains();
    }
  }, [chainsLoaded, loadChains]);

  // Validate address when it changes
  useEffect(() => {
    if (state.address.length > 10 && state.selectedChain) {
      const timer = setTimeout(async () => {
        setIsValidating(true);
        try {
          const valid = await validateChainAddress(state.selectedChain!, state.address);
          setAddressValid(valid);
        } catch {
          setAddressValid(false);
        }
        setIsValidating(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAddressValid(null);
    }
  }, [state.address, state.selectedChain]);

  const selectedChainInfo = useMemo(
    () => mainnetChains.find((c) => c.id === state.selectedChain),
    [mainnetChains, state.selectedChain]
  );

  const canProceed = useMemo(() => {
    switch (state.step) {
      case "select-chain":
        return state.selectedChain !== null;
      case "enter-address":
        return addressValid === true && state.walletName.trim().length > 0;
      default:
        return true;
    }
  }, [state.step, state.selectedChain, addressValid, state.walletName]);

  const handleNext = () => {
    setDirection(1);
    switch (state.step) {
      case "select-chain":
        setState((s) => ({ ...s, step: "enter-address" }));
        break;
      case "enter-address":
        addWatchOnlyAddress(
          state.walletName.trim(),
          state.selectedChain!,
          state.address.trim()
        );
        setState((s) => ({ ...s, step: "success" }));
        break;
      case "success":
        handleClose();
        break;
    }
  };

  const handleBack = () => {
    setDirection(-1);
    switch (state.step) {
      case "enter-address":
        setState((s) => ({ ...s, step: "select-chain" }));
        break;
    }
  };

  const selectChain = (chainId: string) => {
    setState((s) => ({ ...s, selectedChain: chainId, address: "", walletName: "" }));
    setAddressValid(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setState(initialState);
      setAddressValid(null);
    }, 200);
  };

  const stepOrder: WatchStep[] = ["select-chain", "enter-address", "success"];
  const currentStepIndex = stepOrder.indexOf(state.step);
  const showBackButton = state.step === "enter-address";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl overflow-hidden">
        {/* Progress indicator */}
        <div className="flex gap-1.5 mb-2">
          {stepOrder.slice(0, -1).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                idx <= currentStepIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={state.step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Step: Select Chain */}
            {state.step === "select-chain" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Watch Address
                  </DialogTitle>
                  <DialogDescription>
                    Select the blockchain network for the address you want to track.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                  {mainnetChains.map((chain, i) => (
                    <motion.button
                      key={chain.id}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => selectChain(chain.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        state.selectedChain === chain.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        {chainIcons[chain.id] || (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{chain.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {chain.symbol}
                        </div>
                      </div>
                      {state.selectedChain === chain.id && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Enter Address */}
            {state.step === "enter-address" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {chainIcons[state.selectedChain!] || (
                      <Circle className="h-5 w-5 text-primary" />
                    )}
                    Enter {selectedChainInfo?.name} Address
                  </DialogTitle>
                  <DialogDescription>
                    Enter the public address you want to track. This is view-only.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wallet Name</label>
                    <Input
                      placeholder={`My ${selectedChainInfo?.name} Wallet`}
                      value={state.walletName}
                      onChange={(e) =>
                        setState((s) => ({ ...s, walletName: e.target.value }))
                      }
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Public Address</label>
                    <Input
                      placeholder={
                        state.selectedChain === "bitcoin"
                          ? "bc1q..."
                          : state.selectedChain === "solana"
                          ? "Base58 address..."
                          : "0x..."
                      }
                      value={state.address}
                      onChange={(e) =>
                        setState((s) => ({ ...s, address: e.target.value }))
                      }
                      className={cn(
                        "font-mono text-sm",
                        addressValid === true && "border-success",
                        addressValid === false && "border-destructive"
                      )}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {selectedChainInfo?.name} address
                      </span>
                      {isValidating && (
                        <span className="text-muted-foreground">Validating...</span>
                      )}
                      {addressValid === true && (
                        <span className="text-success flex items-center gap-1">
                          <Check className="h-3 w-3" /> Valid address
                        </span>
                      )}
                      {addressValid === false && (
                        <span className="text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Invalid address
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Eye className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Watch-only addresses let you track balances and transactions
                    without being able to send funds.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {state.step === "success" && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center"
                  >
                    <Check className="h-8 w-8 text-success" />
                  </motion.div>
                  <DialogHeader className="text-center">
                    <DialogTitle>Address Added!</DialogTitle>
                    <DialogDescription>
                      You're now tracking this {selectedChainInfo?.name} address.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                      {chainIcons[state.selectedChain!] || (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{state.walletName}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {state.address}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      Watch-only
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          {showBackButton ? (
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button onClick={handleNext} disabled={!canProceed} className="gap-2">
            {state.step === "success" ? (
              <>
                Done
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                {state.step === "enter-address" ? "Add Address" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
