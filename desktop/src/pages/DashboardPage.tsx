import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageTransition, staggerContainer, staggerItem, cardHover } from "@/lib/animations";

type Trend = "up" | "down" | "neutral";

interface StatItem {
  title: string;
  value: string;
  change: string | null;
  trend: Trend;
  icon: LucideIcon;
}

export default function DashboardPage() {
  // Placeholder data - will be replaced with real data from stores
  const stats: StatItem[] = [
    {
      title: "Total Portfolio",
      value: "$0.00",
      change: "+0.00%",
      trend: "up",
      icon: Wallet,
    },
    {
      title: "24h Change",
      value: "$0.00",
      change: "0.00%",
      trend: "neutral",
      icon: TrendingUp,
    },
    {
      title: "Connected Wallets",
      value: "0",
      change: null,
      trend: "neutral",
      icon: Wallet,
    },
    {
      title: "Transactions",
      value: "0",
      change: null,
      trend: "neutral",
      icon: ArrowLeftRight,
    },
  ];

  return (
    <motion.div {...pageTransition}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your portfolio overview and recent activity
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.title} variants={staggerItem}>
              <motion.div {...cardHover}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.change && (
                      <p
                        className={`text-xs ${
                          stat.trend === "up"
                            ? "text-success"
                            : stat.trend === "down"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {stat.trend === "up" && (
                          <TrendingUp className="mr-1 inline h-3 w-3" />
                        )}
                        {stat.trend === "down" && (
                          <TrendingDown className="mr-1 inline h-3 w-3" />
                        )}
                        {stat.change}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Portfolio Chart Placeholder */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">
                  Connect a wallet to see your portfolio chart
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            </CardContent>
          </Card>

          {/* Assets Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Top Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">No assets to display</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
