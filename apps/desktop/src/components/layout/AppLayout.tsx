import { isTauri } from "@tauri-apps/api/core";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ArrowLeftRight, CalendarDays, CircleHelp, FileText, Inbox, Landmark, LayoutDashboard, List, PanelLeftClose, PanelLeftOpen,
  Settings, Sparkles, Wallet,
} from "lucide-react";
import mark from "@/assets/finance/mark.svg";
import wordmark from "@/assets/finance/wordmark.svg";
import wordmarkDark from "@/assets/finance/wordmark-dark.svg";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, path: "/" },
  { label: "Ledger", icon: List, path: "/ledger" },
  { label: "Import Inbox", icon: Inbox, path: "/imports" },
  { label: "Ask Coinbox", icon: Sparkles, path: "/ask" },
];
const features = [
  { label: "Accounts", icon: Landmark, path: "/accounts" },
  { label: "Bills", icon: CalendarDays, path: "/bills" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Help", icon: CircleHelp, path: "/help" },
];
const walletNavigation = [
  { label: "Wallets", icon: Wallet, path: "/wallets" },
  { label: "Crypto overview", icon: LayoutDashboard, path: "/crypto" },
  { label: "Crypto transactions", icon: ArrowLeftRight, path: "/transactions" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

function NavItems({ items }: { items: typeof navigation }) {
  return items.map(({ label, icon: Icon, path }) => (
    <NavLink key={path} to={path} end={path === "/"} className="coinbox-nav-link" title={label}>
      <Icon size={17} aria-hidden="true" /> <span>{label}</span>
    </NavLink>
  ));
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const RailIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <div className={`coinbox-shell${collapsed ? " is-collapsed" : ""}`}>
      <a className="coinbox-skip" href="#coinbox-main">Skip to content</a>
      <aside className="coinbox-rail" aria-label="Coinbox sidebar">
        <div className="coinbox-rail-brand">
          <Link to="/" aria-label="Coinbox overview">
            <img className="coinbox-wordmark light" src={wordmark} alt="" />
            <img className="coinbox-wordmark dark-logo" src={wordmarkDark} alt="" />
            <img className="coinbox-mark" src={mark} alt="" />
          </Link>
          <button type="button" className="coinbox-icon-button" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}>
            <RailIcon size={17} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Finance"><NavItems items={navigation} /></nav>
        <nav aria-label="Features"><div className="coinbox-nav-heading">Features</div><NavItems items={features} /></nav>
        {isTauri() && <nav aria-label="Wallet"><div className="coinbox-nav-heading">Wallet</div><NavItems items={walletNavigation} /></nav>}
      </aside>
      <div className="coinbox-mobile-top">
        <Link to="/" aria-label="Coinbox overview"><img className="coinbox-wordmark light" src={wordmark} alt="" />
          <img className="coinbox-wordmark dark-logo" src={wordmarkDark} alt="" /></Link>
        <button type="button" className="coinbox-button secondary" aria-expanded={mobileOpen} aria-controls="mobile-more-menu"
          onClick={() => setMobileOpen(!mobileOpen)}><List size={16} aria-hidden="true" /> More</button>
        <nav id="mobile-more-menu" aria-label="More Coinbox pages" hidden={!mobileOpen} onClick={() => setMobileOpen(false)}>
          <NavItems items={isTauri() ? [...features, ...walletNavigation] : features} />
        </nav>
      </div>
      <main id="coinbox-main" className="coinbox-main" tabIndex={-1}>{children}</main>
      <nav className="coinbox-mobile-nav" aria-label="Finance"><NavItems items={navigation} /></nav>
    </div>
  );
}
