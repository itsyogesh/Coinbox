import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageTransition } from "@/lib/animations";

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Placeholder - no transactions yet
  const transactions: Array<{
    id: string;
    type: "send" | "receive" | "swap";
    amount: string;
    asset: string;
    date: string;
    status: "confirmed" | "pending";
    category?: string;
  }> = [];

  return (
    <motion.div {...pageTransition}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              View and categorize your transaction history
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                <Button variant="outline" size="sm">
                  All Chains
                </Button>
                <Button variant="outline" size="sm">
                  All Types
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        {transactions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          tx.type === "receive"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tx.type === "receive" ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          tx.type === "receive" ? "text-success" : ""
                        }`}
                      >
                        {tx.type === "receive" ? "+" : "-"}
                        {tx.amount} {tx.asset}
                      </p>
                      {tx.category && (
                        <p className="text-sm text-muted-foreground">
                          {tx.category}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ArrowUpRight className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Connect a wallet to see your transaction history. Transactions will
                be automatically synced and categorized.
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Categorization Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg">✨</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered Categorization</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your AI API key in Settings to enable automatic
                  transaction categorization for tax reporting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
