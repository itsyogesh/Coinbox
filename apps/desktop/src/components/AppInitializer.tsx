/**
 * AppInitializer - Handles app startup data loading
 *
 * Flow:
 * 1. Load wallets from SQLite
 * 2. Hydrate chainStore (balances, prices, transactions from SQLite)
 * 3. Start background sync for all wallets
 * 4. Show loading screen until hydrated
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { useWalletStore } from "@/stores/walletStore";
import { useChainStore } from "@/stores/chainStore";
import { Logo } from "@/components/ui/Logo";

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Starting up...");

  const loadWallets = useWalletStore((s) => s.loadWallets);
  const hydrate = useChainStore((s) => s.hydrate);
  const syncAllWallets = useChainStore((s) => s.syncAllWallets);
  const syncPrices = useChainStore((s) => s.syncPrices);
  const isHydrated = useChainStore((s) => s.isHydrated);

  useEffect(() => {
    async function init() {
      try {
        // Step 1: Load wallets from SQLite
        setLoadingMessage("Loading wallets...");
        await loadWallets();

        // Step 2: Hydrate chain data from SQLite cache
        setLoadingMessage("Loading cached data...");
        await hydrate();

        // Done loading - show app
        setIsLoading(false);

        // Step 3: Start background sync (don't await - runs in background)
        setLoadingMessage("Syncing...");
        syncAllWallets().catch(console.error);
        syncPrices().catch(console.error);
      } catch (error) {
        console.error("[AppInitializer] Failed to initialize:", error);
        setIsLoading(false); // Show app anyway, with empty state
      }
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading screen while initializing
  if (isLoading || !isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <Logo size="lg" showText={false} />
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{loadingMessage}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // App is ready
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="app-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default AppInitializer;
