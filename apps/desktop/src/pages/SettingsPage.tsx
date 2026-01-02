import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Monitor,
  DollarSign,
  Key,
  Database,
  Shield,
  Globe,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

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

type Theme = "light" | "dark" | "system";
type Currency = "USD" | "EUR" | "GBP" | "INR";

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [apiKey, setApiKey] = useState("");

  // Handle theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("coinbox-theme", "dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
      localStorage.setItem("coinbox-theme", "light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.removeItem("coinbox-theme");
    }
  }, [theme]);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("coinbox-theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const currencies: { value: Currency; label: string; symbol: string }[] = [
    { value: "USD", label: "US Dollar", symbol: "$" },
    { value: "EUR", label: "Euro", symbol: "€" },
    { value: "GBP", label: "Pound", symbol: "£" },
    { value: "INR", label: "Rupee", symbol: "₹" },
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
        <h1 className="text-3xl font-heading font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and configuration
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
                  onClick={() => setTheme(value)}
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
                  <Icon className={cn("h-5 w-5", theme === value ? "text-primary" : "text-muted-foreground")} />
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
                  <span className="text-xl font-heading font-semibold">{symbol}</span>
                  <span className="text-xs text-muted-foreground">{value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* AI Configuration */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-semibold">AI Configuration</h2>
        </div>

        <div className="card-premium p-6 space-y-5">
          <div>
            <label className="text-sm font-medium">Anthropic API Key</label>
            <p className="text-sm text-muted-foreground mb-4">
              Enable AI-powered transaction categorization
            </p>
            <div className="flex gap-3">
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <Button variant="outline">Verify</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Your API key is stored locally and encrypted. Never sent to our servers.
            </p>
          </div>
        </div>
      </motion.section>

      {/* RPC Endpoints */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-semibold">RPC Endpoints</h2>
        </div>

        <div className="card-premium p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Configure custom RPC endpoints. Leave empty to use defaults.
          </p>

          <div className="space-y-4">
            {[
              { label: "Bitcoin (Electrum)", placeholder: "ssl://electrum.blockstream.info:60002" },
              { label: "Ethereum", placeholder: "https://eth-mainnet.g.alchemy.com/v2/..." },
              { label: "Arbitrum", placeholder: "https://arb-mainnet.g.alchemy.com/v2/..." },
              { label: "Optimism", placeholder: "https://opt-mainnet.g.alchemy.com/v2/..." },
              { label: "Base", placeholder: "https://base-mainnet.g.alchemy.com/v2/..." },
            ].map((endpoint) => (
              <div key={endpoint.label}>
                <label className="text-sm font-medium">{endpoint.label}</label>
                <input
                  type="text"
                  placeholder={endpoint.placeholder}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Data Management */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-semibold">Data Management</h2>
        </div>

        <div className="card-premium divide-y divide-border">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground">
                Download all data as JSON
              </p>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>

          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium">Import Data</p>
              <p className="text-sm text-muted-foreground">
                Restore from backup
              </p>
            </div>
            <Button variant="outline" size="sm">Import</Button>
          </div>

          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-destructive">Clear All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete everything
              </p>
            </div>
            <Button variant="destructive" size="sm">Clear</Button>
          </div>
        </div>
      </motion.section>

      {/* Security */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-success" />
          </div>
          <h2 className="text-lg font-heading font-semibold">Security</h2>
        </div>

        <div className="card-premium divide-y divide-border">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium">Database Encryption</p>
              <p className="text-sm text-muted-foreground">
                Encrypted with SQLCipher
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-success/10 text-success font-medium">
              Enabled
            </span>
          </div>

          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium">Encryption Password</p>
              <p className="text-sm text-muted-foreground">
                Update your database password
              </p>
            </div>
            <Button variant="outline" size="sm">Change</Button>
          </div>
        </div>
      </motion.section>

      {/* About */}
      <motion.section variants={itemVariants}>
        <div className="card-premium p-8">
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" />
            <p className="mt-4 text-sm text-muted-foreground">Version 2.0.0</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Open source multi-chain portfolio intelligence platform
            </p>
            <div className="mt-6 flex gap-4">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
                GitHub
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
                Docs
              </Button>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
