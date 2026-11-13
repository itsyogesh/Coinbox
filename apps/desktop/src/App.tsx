import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppInitializer } from "@/components/AppInitializer";
import { Toaster } from "@/components/ui/toaster";
import { remoteFinance } from "@/finance/api";
import { FinanceHelp } from "@/finance/FinanceHelp";
import { FinanceWorkspace } from "@/finance/FinanceWorkspace";

import DashboardPage from "@/pages/DashboardPage";
import WalletsPage from "@/pages/WalletsPage";
import WalletDetailsPage from "@/pages/WalletDetailsPage";
import TransactionsPage from "@/pages/TransactionsPage";
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
          <Route path="bills" element={null} />
          <Route path="reports" element={null} />
          <Route path="accounts" element={null} />
          {remoteFinance && <Route path="server-access" element={null} />}
        </Route>
        <Route path="help" element={<FinanceHelp />} />
        <Route path="tax" element={<Navigate to="/reports" replace />} />
        {isTauri() && <Route element={<AppInitializer><div className="coinbox-wallet-content"><Outlet /></div></AppInitializer>}>
          <Route path="crypto" element={<DashboardPage />} />
          <Route path="wallets" element={<WalletsPage />} />
          <Route path="wallets/:walletId" element={<WalletDetailsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </AppLayout>
  );
}

export default App;
