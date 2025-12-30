import { motion } from "framer-motion";
import { Plus, Wallet, Eye, Bitcoin, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageTransition, staggerContainer, staggerItem, cardHover } from "@/lib/animations";

export default function WalletsPage() {
  // Placeholder - no wallets connected yet
  const wallets: Array<{
    id: string;
    name: string;
    chain: "bitcoin" | "ethereum";
    address: string;
    balance: string;
    isWatchOnly: boolean;
  }> = [];

  const supportedChains = [
    {
      name: "Bitcoin",
      icon: Bitcoin,
      description: "Add a Bitcoin wallet or watch-only address",
    },
    {
      name: "Ethereum",
      icon: Coins,
      description: "Add an Ethereum wallet (supports L2s)",
    },
  ];

  return (
    <motion.div {...pageTransition}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
            <p className="text-muted-foreground">
              Manage your connected wallets and watch-only addresses
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Wallet
          </Button>
        </div>

        {/* Connected Wallets */}
        {wallets.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {wallets.map((wallet) => (
              <motion.div key={wallet.id} variants={staggerItem}>
                <motion.div {...cardHover}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {wallet.name}
                      </CardTitle>
                      {wallet.isWatchOnly && (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{wallet.balance}</div>
                      <p className="text-xs text-muted-foreground truncate">
                        {wallet.address}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No wallets connected</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Connect your first wallet to start tracking your portfolio. You can
                add watch-only addresses or connect wallets directly.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Supported Chains */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Supported Chains</h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 md:grid-cols-2"
          >
            {supportedChains.map((chain) => (
              <motion.div key={chain.name} variants={staggerItem}>
                <motion.div {...cardHover}>
                  <Card className="cursor-pointer hover:border-primary transition-colors">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <chain.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{chain.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {chain.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
