import { Routes, Route, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppInitializer } from "@/components/AppInitializer";
import { Toaster } from "@/components/ui/toaster";
import { FinanceWorkspace } from "@/finance/FinanceWorkspace";

import DashboardPage from "@/pages/DashboardPage";
import WalletsPage from "@/pages/WalletsPage";
import WalletDetailsPage from "@/pages/WalletDetailsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import TaxPage from "@/pages/TaxPage";
import SettingsPage from "@/pages/SettingsPage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route element={<FinanceWorkspace />}>
          <Route index element={null} />
          <Route path="imports" element={null} />
          <Route path="ledger" element={null} />
          <Route path="ask" element={null} />
        </Route>
        <Route element={<AppInitializer><div className="coinbox-wallet-content"><Outlet /></div></AppInitializer>}>
          <Route path="crypto" element={<DashboardPage />} />
          <Route path="wallets" element={<WalletsPage />} />
          <Route path="wallets/:walletId" element={<WalletDetailsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="tax" element={<TaxPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </AppLayout>
  );
}

export default App;
