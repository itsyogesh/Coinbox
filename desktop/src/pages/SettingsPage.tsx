import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { pageTransition } from "@/lib/animations";

type Theme = "light" | "dark" | "system";
type Currency = "USD" | "EUR" | "GBP" | "INR";

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("system");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [apiKey, setApiKey] = useState("");

  const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const currencies: { value: Currency; label: string; symbol: string }[] = [
    { value: "USD", label: "US Dollar", symbol: "$" },
    { value: "EUR", label: "Euro", symbol: "€" },
    { value: "GBP", label: "British Pound", symbol: "£" },
    { value: "INR", label: "Indian Rupee", symbol: "₹" },
  ];

  return (
    <motion.div {...pageTransition}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences
          </p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground mb-3">
                Select your preferred theme
              </p>
              <div className="grid grid-cols-3 gap-3">
                {themes.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
                      theme === value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Display Currency</label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose your preferred currency for displaying values
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {currencies.map(({ value, label, symbol }) => (
                  <button
                    key={value}
                    onClick={() => setCurrency(value)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-4 transition-colors ${
                      currency === value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <span className="text-lg font-bold">{symbol}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Anthropic API Key</label>
              <p className="text-sm text-muted-foreground mb-3">
                Enter your Anthropic API key for AI-powered transaction
                categorization
              </p>
              <div className="flex gap-3">
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <Button variant="outline">Verify</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RPC Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              RPC Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure custom RPC endpoints for each chain. Leave empty to use
              defaults.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bitcoin (Electrum)</label>
                <input
                  type="text"
                  placeholder="ssl://electrum.blockstream.info:60002"
                  className="mt-1 w-full rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium">Ethereum Mainnet</label>
                <input
                  type="text"
                  placeholder="https://eth-mainnet.g.alchemy.com/v2/..."
                  className="mt-1 w-full rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Arbitrum One</label>
                <input
                  type="text"
                  placeholder="https://arb-mainnet.g.alchemy.com/v2/..."
                  className="mt-1 w-full rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Optimism</label>
                <input
                  type="text"
                  placeholder="https://opt-mainnet.g.alchemy.com/v2/..."
                  className="mt-1 w-full rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Base</label>
                <input
                  type="text"
                  placeholder="https://base-mainnet.g.alchemy.com/v2/..."
                  className="mt-1 w-full rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Polygon</label>
                <input
                  type="text"
                  placeholder="https://polygon-mainnet.g.alchemy.com/v2/..."
                  className="mt-1 w-full rounded-md border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your data as a JSON file
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Import Data</p>
                <p className="text-sm text-muted-foreground">
                  Restore data from a previous export
                </p>
              </div>
              <Button variant="outline">Import</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Clear All Data</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all local data
                </p>
              </div>
              <Button variant="destructive">Clear Data</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Database Encryption</p>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted with SQLCipher
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                Enabled
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change Encryption Password</p>
                <p className="text-sm text-muted-foreground">
                  Update your database encryption password
                </p>
              </div>
              <Button variant="outline">Change</Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-semibold">Coinbox</h3>
              <p className="text-sm text-muted-foreground">Version 2.0.0</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Open source portfolio intelligence platform
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <Button variant="link" size="sm">
                  GitHub
                </Button>
                <Button variant="link" size="sm">
                  Documentation
                </Button>
                <Button variant="link" size="sm">
                  License
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
