import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Monitor,
  DollarSign,
  Key,
  Check,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import {
  useSettingsStore,
  type Theme,
  type Currency,
  CURRENCY_CONFIG,
  applyTheme,
} from "@/stores/settingsStore";
import { testRpcConnection, clearClientCache } from "@/lib/viem";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
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

interface RpcFieldState {
  value: string;
  status: "idle" | "testing" | "success" | "error";
}

type RpcChain = "ethereum" | "arbitrum" | "optimism" | "base" | "polygon";
type RpcFields = Record<RpcChain, RpcFieldState>;

export default function SettingsPage() {
  const {
    theme,
    currency,
    rpcEndpoints,
    apiKeys,
    setTheme,
    setCurrency,
    setRpcEndpoint,
    setApiKey,
  } = useSettingsStore();

  // Local state for RPC field inputs and testing status
  const [rpcFields, setRpcFields] = useState<RpcFields>(() => ({
    ethereum: { value: rpcEndpoints.ethereum || "", status: "idle" },
    arbitrum: { value: rpcEndpoints.arbitrum || "", status: "idle" },
    optimism: { value: rpcEndpoints.optimism || "", status: "idle" },
    base: { value: rpcEndpoints.base || "", status: "idle" },
    polygon: { value: rpcEndpoints.polygon || "", status: "idle" },
  }));

  // Etherscan API key state
  const [etherscanKeyInput, setEtherscanKeyInput] = useState(apiKeys.etherscan || "");
  const [etherscanKeyStatus, setEtherscanKeyStatus] = useState<
    "idle" | "saved"
  >("idle");

  // Handle theme change with immediate visual feedback
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Update RPC field value
  const updateRpcField = (chain: RpcChain, value: string) => {
    setRpcFields((prev) => ({
      ...prev,
      [chain]: { value, status: "idle" as const },
    }));
  };

  // Test and save RPC endpoint
  const testAndSaveRpc = async (chain: RpcChain) => {
    const field = rpcFields[chain];
    if (!field.value.trim()) {
      setRpcEndpoint(chain, "");
      clearClientCache();
      setRpcFields((prev) => ({
        ...prev,
        [chain]: { value: field.value, status: "idle" as const },
      }));
      return;
    }

    // Test EVM RPC connection
    setRpcFields((prev) => ({
      ...prev,
      [chain]: { value: field.value, status: "testing" as const },
    }));

    const result = await testRpcConnection(chain, field.value);

    if (result.success) {
      setRpcEndpoint(chain, field.value);
      // Clear cache so new endpoint is used
      clearClientCache();
      setRpcFields((prev) => ({
        ...prev,
        [chain]: { value: field.value, status: "success" as const },
      }));
    } else {
      setRpcFields((prev) => ({
        ...prev,
        [chain]: { value: field.value, status: "error" as const },
      }));
    }
  };

  // Save Etherscan API key
  const saveEtherscanKey = () => {
    setApiKey("etherscan", etherscanKeyInput.trim());
    setEtherscanKeyStatus("saved");
    // Reset status after 2 seconds
    setTimeout(() => setEtherscanKeyStatus("idle"), 2000);
  };

  const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const currencies = Object.entries(CURRENCY_CONFIG).map(([value, config]) => ({
    value: value as Currency,
    label: config.name,
    symbol: config.symbol,
  }));

  const walletConnections: { chain: RpcChain; label: string }[] = [
    { chain: "ethereum", label: "Ethereum" },
    { chain: "arbitrum", label: "Arbitrum" },
    { chain: "optimism", label: "Optimism" },
    { chain: "base", label: "Base" },
    { chain: "polygon", label: "Polygon" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-3xl"
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Choose how Coinbox looks and how your wallets connect.
        </p>
      </motion.header>

      {/* Appearance */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sun className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-semibold">Appearance</h2>
        </div>

        <div className="card-premium p-6 space-y-5">
          <div>
            <label className="text-sm font-medium">Theme</label>
            <p className="text-sm text-muted-foreground mb-4">
              Select your preferred color scheme
            </p>
            <div className="grid grid-cols-3 gap-3">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all",
                    theme === value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border hover:bg-muted/50"
                  )}
                >
                  {theme === value && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      theme === value ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Currency */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-semibold">Currency</h2>
        </div>

        <div className="card-premium p-6 space-y-5">
          <div>
            <label className="text-sm font-medium">Display Currency</label>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how values are displayed
            </p>
            <div className="grid grid-cols-4 gap-3">
              {currencies.map(({ value, symbol }) => (
                <button
                  key={value}
                  onClick={() => setCurrency(value)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-xl border p-4 transition-all",
                    currency === value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border hover:bg-muted/50"
                  )}
                >
                  {currency === value && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <span className="text-xl font-heading font-semibold">
                    {symbol}
                  </span>
                  <span className="text-xs text-muted-foreground">{value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <details className="space-y-4">
          <summary className="cursor-pointer text-lg font-heading font-semibold">Advanced wallet connections</summary>
          <div className="card-premium p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Enter the connection address from your wallet data provider. To use the default connection, clear the address and save.
            </p>

            <div className="space-y-4">
              {walletConnections.map(({ chain, label }) => {
                const field = rpcFields[chain];
                return (
                  <div key={chain}>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor={`wallet-connection-${chain}`} className="text-sm font-medium">{label}</label>
                      {field.status === "success" && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </span>
                      )}
                      {field.status === "error" && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        id={`wallet-connection-${chain}`}
                        type="password"
                        autoComplete="off"
                        placeholder="Connection address"
                        value={field.value}
                        onChange={(e) => updateRpcField(chain, e.target.value)}
                        className={cn(
                          "flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-all font-mono",
                          field.status === "error"
                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                            : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                        )}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testAndSaveRpc(chain)}
                        disabled={field.status === "testing"}
                        className="shrink-0"
                      >
                        {field.status === "testing" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Test & Save"
                        )}
                      </Button>
                    </div>
                    {field.status === "error" && (
                      <p className="mt-1.5 text-xs text-destructive">
                        Couldn’t connect. Check the address and try again.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wallet history provider */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-heading font-semibold">
              Transaction history
            </h2>
          </div>

          <div className="card-premium p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="etherscan-key" className="text-sm font-medium">Etherscan key</label>
                <a
                  href="https://etherscan.io/apis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Get free API key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Add an Etherscan key to load transaction history for your Ethereum wallets.
              </p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="password"
                    id="etherscan-key"
                    autoComplete="off"
                    placeholder="Enter your Etherscan key"
                    value={etherscanKeyInput}
                    onChange={(e) => {
                      setEtherscanKeyInput(e.target.value);
                      setEtherscanKeyStatus("idle");
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                  />
                  {etherscanKeyStatus === "saved" && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={saveEtherscanKey}
                  disabled={etherscanKeyStatus === "saved"}
                >
                  {etherscanKeyStatus === "saved" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The same key works for Ethereum, Arbitrum, Optimism, Base, and Polygon.
              </p>
            </div>
          </div>
        </details>
      </motion.section>

      {/* About */}
      <motion.section variants={itemVariants}>
        <div className="card-premium p-8">
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" />
            <p className="mt-4 text-sm text-muted-foreground">Version 2.0.0</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Review statements and manage your crypto wallets.
            </p>
            <div className="mt-6 flex gap-4">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <a href="https://github.com/itsyogesh/Coinbox" target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> GitHub</a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Link to="/help">Coinbox Help</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
