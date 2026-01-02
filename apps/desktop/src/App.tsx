import { Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";

// Pages
import DashboardPage from "@/pages/DashboardPage";
import WalletsPage from "@/pages/WalletsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import TaxPage from "@/pages/TaxPage";
import SettingsPage from "@/pages/SettingsPage";

function App() {
  return (
    <>
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/wallets" element={<WalletsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/tax" element={<TaxPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AnimatePresence>
      </AppLayout>
      <Toaster />
    </>
  );
}

export default App;
