/**
 * WalletImportFlow - Multi-step wizard for importing existing HD wallet
 *
 * Steps:
 * 1. Enter mnemonic phrase
 * 2. Select chains to derive
 * 3. Set wallet name and password
 * 4. Success with derived addresses
 */

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Wallet,
  AlertTriangle,
  Download,
} from "lucide-react";
import { ChainIcon } from "@/components/ui/crypto-icon";

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
import { copyToClipboard, truncateAddress } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWalletStore } from "@/stores/walletStore";
import { validateMnemonic } from "@/lib/tauri/wallet";
import {
  type ChainFamily,
  getEnabledFamilies,
  getEnabledChainsByFamily,
} from "@/lib/chains";

// =============================================================================
// Types
// =============================================================================

type ImportStep = "enter-mnemonic" | "select-chains" | "set-password" | "success";

interface ImportedAddress {
  chain: string;
  address: string;
}

interface ImportState {
  step: ImportStep;
  mnemonic: string;
  /** @deprecated Use selectedFamilies instead */
  selectedChains: string[];
  /** Selected chain families */
  selectedFamilies: ChainFamily[];
  walletName: string;
  password: string;
  derivedAddresses: ImportedAddress[];
  error: string | null;
}

/**
 * Convert selected families to chain IDs for backend compatibility.
 */
function familiesToChainIds(families: ChainFamily[]): string[] {
  const chainIds: string[] = [];
  for (const family of families) {
    const enabledChains = getEnabledChainsByFamily(family);
    chainIds.push(...enabledChains.map(c => c.id));
  }
  return chainIds;
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
// Initial State
// =============================================================================

const initialState: ImportState = {
  step: "enter-mnemonic",
  mnemonic: "",
  selectedChains: [], // Deprecated, kept for compatibility
  selectedFamilies: [],
  walletName: "",
  password: "",
  derivedAddresses: [],
  error: null,
};

// =============================================================================
// Props
// =============================================================================

interface WalletImportFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function WalletImportFlow({
  open,
  onOpenChange,
}: WalletImportFlowProps) {
  const { toast } = useToast();
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<ImportState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [mnemonicValid, setMnemonicValid] = useState<boolean | null>(null);

  const {
    mainnetChains,
    chainsLoaded,
    loadChains,
    importWallet,
  } = useWalletStore();

  // Get enabled families from the registry
  const families = useMemo(() => getEnabledFamilies(), []);

  // Load chains on mount
  useEffect(() => {
    if (!chainsLoaded) {
      loadChains();
    }
  }, [chainsLoaded, loadChains]);

  // Validate mnemonic when it changes
  useEffect(() => {
    const words = state.mnemonic.trim().split(/\s+/);
    if (words.length >= 12) {
      const timer = setTimeout(async () => {
        setIsValidating(true);
        try {
          const response = await validateMnemonic(state.mnemonic.trim());
          setMnemonicValid(response.is_valid);
        } catch {
          setMnemonicValid(false);
        }
        setIsValidating(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setMnemonicValid(null);
    }
  }, [state.mnemonic]);

  const mnemonicWords = useMemo(
    () => state.mnemonic.trim().split(/\s+/).filter(Boolean),
    [state.mnemonic]
  );

  const passwordsMatch = state.password === confirmPassword;
  const passwordValid = state.password.length >= 8;

  const canProceed = useMemo(() => {
    switch (state.step) {
      case "enter-mnemonic":
        return mnemonicValid === true;
      case "select-chains":
        return state.selectedFamilies.length > 0;
      case "set-password":
        return (
          state.walletName.trim().length > 0 &&
          passwordValid &&
          passwordsMatch
        );
      default:
        return true;
    }
  }, [
    state.step,
    state.selectedFamilies,
    state.walletName,
    mnemonicValid,
    passwordValid,
    passwordsMatch,
  ]);

  const handleNext = async () => {
    setDirection(1);
    switch (state.step) {
      case "enter-mnemonic":
        setState((s) => ({ ...s, step: "select-chains" }));
        break;
      case "select-chains":
        setState((s) => ({ ...s, step: "set-password" }));
        break;
      case "set-password":
        setIsImporting(true);
        try {
          // Convert families to chain IDs for backend
          const chainIds = familiesToChainIds(state.selectedFamilies);
          await importWallet(
            state.walletName.trim(),
            state.mnemonic.trim(),
            chainIds,
            state.password
          );
          // Get derived addresses from store
          const { wallets } = useWalletStore.getState();
          const lastWallet = wallets[wallets.length - 1];
          setState((s) => ({
            ...s,
            step: "success",
            derivedAddresses: lastWallet?.addresses.map((a) => ({
              chain: a.chain,
              address: a.address,
            })) || [],
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to import wallet";
          toast({
            title: "Import Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        setIsImporting(false);
        break;
      case "success":
        handleClose();
        break;
    }
  };

  const handleBack = () => {
    setDirection(-1);
    switch (state.step) {
      case "select-chains":
        setState((s) => ({ ...s, step: "enter-mnemonic" }));
        break;
      case "set-password":
        setState((s) => ({ ...s, step: "select-chains" }));
        break;
    }
  };

  const toggleFamily = (family: ChainFamily) => {
    setState((s) => {
      const newFamilies = s.selectedFamilies.includes(family)
        ? s.selectedFamilies.filter((f) => f !== family)
        : [...s.selectedFamilies, family];
      return {
        ...s,
        selectedFamilies: newFamilies,
        selectedChains: familiesToChainIds(newFamilies), // Keep for compatibility
      };
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setState(initialState);
      setConfirmPassword("");
      setMnemonicValid(null);
    }, 200);
  };

  const stepOrder: ImportStep[] = [
    "enter-mnemonic",
    "select-chains",
    "set-password",
    "success",
  ];
  const currentStepIndex = stepOrder.indexOf(state.step);
  const showBackButton = ["select-chains", "set-password"].includes(state.step);

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
            {/* Step: Enter Mnemonic */}
            {state.step === "enter-mnemonic" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Import Wallet
                  </DialogTitle>
                  <DialogDescription>
                    Enter your 12 or 24 word recovery phrase to import your wallet.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recovery Phrase</label>
                    <textarea
                      className={cn(
                        "w-full min-h-[120px] p-3 rounded-lg border bg-background font-mono text-sm resize-none",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                        mnemonicValid === true && "border-success",
                        mnemonicValid === false && "border-destructive"
                      )}
                      placeholder="Enter your recovery phrase, with words separated by spaces..."
                      value={state.mnemonic}
                      onChange={(e) =>
                        setState((s) => ({ ...s, mnemonic: e.target.value }))
                      }
                      autoFocus
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Words: {mnemonicWords.length}
                      </span>
                      {isValidating && (
                        <span className="text-muted-foreground">Validating...</span>
                      )}
                      {mnemonicValid === true && (
                        <span className="text-success flex items-center gap-1">
                          <Check className="h-3 w-3" /> Valid phrase
                        </span>
                      )}
                      {mnemonicValid === false && (
                        <span className="text-destructive">Invalid phrase</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Make sure you're in a private place. Never share your recovery
                    phrase with anyone.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Select Chains (Family-based) */}
            {state.step === "select-chains" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Select Networks
                  </DialogTitle>
                  <DialogDescription>
                    Choose which blockchain networks to derive addresses for.
                    Selecting a network includes all compatible chains.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  {families.map((family, i) => {
                    const isSelected = state.selectedFamilies.includes(family.id);
                    const chainsInFamily = getEnabledChainsByFamily(family.id);
                    const chainNames = chainsInFamily.map(c => c.name).join(", ");

                    return (
                      <motion.button
                        key={family.id}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => toggleFamily(family.id)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left w-full",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${family.brandColor}20` }}
                        >
                          <ChainIcon chainId={family.primaryChainId} size={24} variant="branded" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{family.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {family.id === "evm" ? (
                              <>Includes: {chainNames}</>
                            ) : (
                              family.description
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Selected: {state.selectedFamilies.length} network
                  {state.selectedFamilies.length !== 1 ? "s" : ""}{" "}
                  ({state.selectedChains.length} chain
                  {state.selectedChains.length !== 1 ? "s" : ""})
                </p>
              </div>
            )}

            {/* Step: Set Password */}
            {state.step === "set-password" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Secure Your Wallet
                  </DialogTitle>
                  <DialogDescription>
                    Choose a name and password to encrypt your imported wallet.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wallet Name</label>
                    <Input
                      placeholder="Imported Wallet"
                      value={state.walletName}
                      onChange={(e) =>
                        setState((s) => ({ ...s, walletName: e.target.value }))
                      }
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={state.password}
                        onChange={(e) =>
                          setState((s) => ({ ...s, password: e.target.value }))
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {state.password && !passwordValid && (
                      <p className="text-xs text-destructive">
                        Password must be at least 8 characters
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    This password encrypts your wallet on this device. Remember it!
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
                    <DialogTitle>Wallet Imported!</DialogTitle>
                    <DialogDescription>
                      Your wallet has been imported. Here are your derived addresses:
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {state.derivedAddresses.map((addr, idx) => {
                    const chain = mainnetChains.find((c) => c.id === addr.chain);
                    return (
                      <motion.div
                        key={addr.chain}
                        custom={idx}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                          <ChainIcon chainId={addr.chain} size={16} variant="branded" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {chain?.name || addr.chain}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {truncateAddress(addr.address, 10, 8)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(addr.address)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    );
                  })}
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

          <Button
            onClick={handleNext}
            disabled={!canProceed || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Wallet className="h-4 w-4" />
                </motion.div>
                Importing...
              </>
            ) : state.step === "success" ? (
              <>
                Done
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                {state.step === "set-password" ? "Import Wallet" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
