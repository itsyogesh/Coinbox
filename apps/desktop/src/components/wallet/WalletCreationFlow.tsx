/**
 * WalletCreationFlow - Multi-step wizard for HD wallet creation
 *
 * Steps:
 * 1. Select chains to support
 * 2. Set wallet name and password
 * 3. Display mnemonic for backup
 * 4. Verify mnemonic backup
 * 5. Success with derived addresses
 */

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  Wallet,
  AlertTriangle,
  Shield,
  Sparkles,
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
import {
  useWalletStore,
  type WalletCreationStep,
} from "@/stores/walletStore";
import {
  getEnabledFamilies,
  getEnabledChainsByFamily,
} from "@/lib/chains";

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
// Props
// =============================================================================

interface WalletCreationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function WalletCreationFlow({
  open,
  onOpenChange,
}: WalletCreationFlowProps) {
  const { toast } = useToast();
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationWords, setVerificationWords] = useState<Record<number, string>>({});
  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);

  const {
    mainnetChains,
    chainsLoaded,
    loadChains,
    creation,
    isCreating,
    setCreationStep,
    setWalletName,
    toggleFamilySelection,
    setPassword,
    createWallet,
    verifyMnemonicWord,
    confirmMnemonicBackup,
    resetCreation,
  } = useWalletStore();

  // Get enabled families from the registry
  const families = useMemo(() => getEnabledFamilies(), []);

  // Load chains on mount
  useEffect(() => {
    if (!chainsLoaded) {
      loadChains();
    }
  }, [chainsLoaded, loadChains]);

  // Generate random verification indices when mnemonic is shown
  useEffect(() => {
    if (creation.step === "show-mnemonic" && creation.mnemonic) {
      const words = creation.mnemonic.split(" ");
      const indices: number[] = [];
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * words.length);
        if (!indices.includes(idx)) {
          indices.push(idx);
        }
      }
      setVerificationIndices(indices.sort((a, b) => a - b));
      setVerificationWords({});
    }
  }, [creation.step, creation.mnemonic]);

  const mnemonicWords = useMemo(
    () => creation.mnemonic?.split(" ") || [],
    [creation.mnemonic]
  );

  const passwordsMatch = creation.password === confirmPassword;
  const passwordValid = creation.password.length >= 8;

  const canProceed = useMemo(() => {
    switch (creation.step) {
      case "select-chains":
        return creation.selectedFamilies.length > 0;
      case "set-password":
        return (
          creation.walletName.trim().length > 0 &&
          passwordValid &&
          passwordsMatch
        );
      case "verify-mnemonic":
        return verificationIndices.every(
          (idx) => verifyMnemonicWord(idx, verificationWords[idx] || "")
        );
      default:
        return true;
    }
  }, [
    creation.step,
    creation.selectedFamilies,
    creation.walletName,
    passwordValid,
    passwordsMatch,
    verificationIndices,
    verificationWords,
    verifyMnemonicWord,
  ]);

  const handleNext = async () => {
    setDirection(1);
    switch (creation.step) {
      case "select-chains":
        setCreationStep("set-password");
        break;
      case "set-password":
        try {
          await createWallet();
        } catch {
          toast({
            title: "Failed to create wallet",
            description: creation.error || "An error occurred",
            variant: "destructive",
          });
        }
        break;
      case "show-mnemonic":
        setCreationStep("verify-mnemonic");
        break;
      case "verify-mnemonic":
        confirmMnemonicBackup();
        break;
      case "success":
        onOpenChange(false);
        resetCreation();
        break;
    }
  };

  const handleBack = () => {
    setDirection(-1);
    switch (creation.step) {
      case "set-password":
        setCreationStep("select-chains");
        break;
      case "verify-mnemonic":
        setCreationStep("show-mnemonic");
        break;
    }
  };

  const handleCopyMnemonic = async () => {
    if (creation.mnemonic) {
      const success = await copyToClipboard(creation.mnemonic);
      toast({
        title: success ? "Copied!" : "Failed to copy",
        description: success
          ? "Mnemonic copied to clipboard. Clear it after writing down!"
          : "Could not copy to clipboard",
        variant: success ? "default" : "destructive",
      });
    }
  };

  const handleDownloadMnemonic = () => {
    if (!creation.mnemonic) return;

    const walletName = creation.walletName || "wallet";
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${walletName.toLowerCase().replace(/\s+/g, "-")}-backup-${timestamp}.txt`;

    const content = `COINBOX WALLET BACKUP
=====================
Wallet Name: ${creation.walletName}
Created: ${new Date().toLocaleString()}

⚠️ IMPORTANT: Keep this file secure and private!
Anyone with these words can access your wallet.

RECOVERY PHRASE (12 words):
${creation.mnemonic.split(" ").map((word, i) => `${(i + 1).toString().padStart(2, " ")}. ${word}`).join("\n")}

=====================
Store this backup in a secure location.
Delete this file after writing down the words.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Backup Downloaded",
      description: "Delete the file after writing down your recovery phrase!",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Delay reset to allow animation
    setTimeout(resetCreation, 200);
  };

  const stepOrder: WalletCreationStep[] = [
    "select-chains",
    "set-password",
    "show-mnemonic",
    "verify-mnemonic",
    "success",
  ];
  const currentStepIndex = stepOrder.indexOf(creation.step);
  const showBackButton = ["set-password", "verify-mnemonic"].includes(creation.step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-xl overflow-hidden"
        showClose={creation.step !== "show-mnemonic"}
      >
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
            key={creation.step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Step: Select Chains (Family-based) */}
            {creation.step === "select-chains" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Select Networks
                  </DialogTitle>
                  <DialogDescription>
                    Choose which blockchain networks you want to use. Selecting a network
                    automatically includes all compatible chains.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  {families.map((family, i) => {
                    const isSelected = creation.selectedFamilies.includes(family.id);
                    const chainsInFamily = getEnabledChainsByFamily(family.id);
                    const chainNames = chainsInFamily.map(c => c.name).join(", ");

                    return (
                      <motion.button
                        key={family.id}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => toggleFamilySelection(family.id)}
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
                  Selected: {creation.selectedFamilies.length} network
                  {creation.selectedFamilies.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Step: Set Password */}
            {creation.step === "set-password" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Secure Your Wallet
                  </DialogTitle>
                  <DialogDescription>
                    Choose a name and strong password to encrypt your wallet.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wallet Name</label>
                    <Input
                      placeholder="My Wallet"
                      value={creation.walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={creation.password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    {creation.password && !passwordValid && (
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
                    Make sure to remember your password. It cannot be recovered
                    if lost.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Show Mnemonic */}
            {creation.step === "show-mnemonic" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Backup Your Recovery Phrase
                  </DialogTitle>
                  <DialogDescription>
                    Write down these 12 words in order. This is the ONLY way to
                    recover your wallet.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-2">
                  {mnemonicWords.map((word, idx) => (
                    <motion.div
                      key={idx}
                      custom={idx}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border"
                    >
                      <span className="text-xs text-muted-foreground w-5">
                        {idx + 1}.
                      </span>
                      <span className="font-mono text-sm">{word}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMnemonic}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMnemonic}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Backup
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive space-y-1">
                      <p className="font-medium">Never share these words!</p>
                      <p className="text-destructive/80">
                        Anyone with this phrase can access all your funds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Verify Mnemonic */}
            {creation.step === "verify-mnemonic" && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    Verify Your Backup
                  </DialogTitle>
                  <DialogDescription>
                    Enter the requested words to confirm you've saved your
                    recovery phrase.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {verificationIndices.map((wordIdx) => (
                    <div key={wordIdx} className="space-y-2">
                      <label className="text-sm font-medium">
                        Word #{wordIdx + 1}
                      </label>
                      <Input
                        placeholder={`Enter word #${wordIdx + 1}`}
                        value={verificationWords[wordIdx] || ""}
                        onChange={(e) =>
                          setVerificationWords((prev) => ({
                            ...prev,
                            [wordIdx]: e.target.value,
                          }))
                        }
                        className={cn(
                          verificationWords[wordIdx] &&
                            (verifyMnemonicWord(wordIdx, verificationWords[wordIdx])
                              ? "border-success"
                              : "border-destructive")
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Success */}
            {creation.step === "success" && (
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
                    <DialogTitle>Wallet Created!</DialogTitle>
                    <DialogDescription>
                      Your wallet is ready to use. Here are your derived addresses:
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {creation.derivedAddresses.map((addr, idx) => {
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
            disabled={!canProceed || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Wallet className="h-4 w-4" />
                </motion.div>
                Creating...
              </>
            ) : creation.step === "success" ? (
              <>
                Done
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                {creation.step === "set-password" ? "Create Wallet" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
