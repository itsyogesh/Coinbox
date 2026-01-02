import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  FileText,
  Settings,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
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
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Wallets", icon: Wallet, path: "/wallets" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
  { label: "Tax Reports", icon: FileText, path: "/tax" },
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
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 72 : 260 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "relative flex flex-col h-full",
            "bg-sidebar border-r border-sidebar-border",
            "shrink-0"
          )}
        >
          {/* Logo area */}
          <div className="h-16 flex items-center px-5 shrink-0">
            <AnimatePresence mode="wait">
              {collapsed ? (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Logo size="sm" showText={false} />
                </motion.div>
              ) : (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <Logo size="md" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick action */}
          <div className="px-3 mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size={collapsed ? "icon" : "default"}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    "bg-primary/10 text-primary hover:bg-primary/20",
                    "border border-primary/20",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Add Wallet</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">Add Wallet</TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* Main navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            <div className="mb-3">
              {!collapsed && (
                <span className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Menu
                </span>
              )}
            </div>
            {navItems.map((item) => (
              <NavItemComponent
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.path}
              />
            ))}
          </nav>

          {/* Bottom navigation */}
          <div className="px-3 py-4 mt-auto border-t border-sidebar-border">
            {bottomNavItems.map((item) => (
              <NavItemComponent
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "absolute -right-3 top-7",
              "flex items-center justify-center",
              "h-6 w-6 rounded-full",
              "bg-background border border-border",
              "text-muted-foreground hover:text-foreground",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
              "z-10"
            )}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </motion.div>
          </button>
        </motion.aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-8">
              {children}
            </div>
          </div>
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

function NavItemComponent({ item, collapsed, isActive }: NavItemProps) {
  const Icon = item.icon;

  const content = (
    <div className="relative">
      {/* Active indicator - positioned relative to outer container */}
      {isActive && (
        <motion.div
          layoutId="activeNavIndicator"
          className="absolute -left-3 top-0 bottom-0 w-1 bg-primary rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      <NavLink
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg",
          "text-sm font-medium transition-all duration-200",
          "hover:bg-sidebar-accent",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-muted-foreground hover:text-sidebar-foreground",
          collapsed && "justify-center px-2.5"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            isActive ? "text-primary" : "text-current"
          )}
        />

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Badge */}
        {item.badge && !collapsed && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
