import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Wallets", icon: Wallet, path: "/wallets" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
  { label: "Tax Reports", icon: Receipt, path: "/tax" },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative flex flex-col border-r bg-card"
        >
          {/* Logo */}
          <div className="flex h-14 items-center px-4">
            <motion.div
              initial={false}
              animate={{ opacity: collapsed ? 0 : 1 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Wallet className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold tracking-tight">Coinbox</span>
            </motion.div>
            {collapsed && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Wallet className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.path}
              />
            ))}
          </nav>

          {/* Bottom navigation */}
          <div className="space-y-1 p-2">
            <Separator className="mb-2" />
            {bottomNavItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>

          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-sm"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}

interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

function NavItem({ item, collapsed, isActive }: NavItemProps) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.path}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground font-medium"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <motion.span
        initial={false}
        animate={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : "auto",
        }}
        className="overflow-hidden whitespace-nowrap"
      >
        {item.label}
      </motion.span>
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 h-6 w-1 rounded-r-full bg-primary"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">{link}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="relative">{link}</div>;
}
