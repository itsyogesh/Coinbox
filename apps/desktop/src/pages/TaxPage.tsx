import { motion } from "framer-motion";
import { Receipt, Download, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/animations";

export default function TaxPage() {
  // Placeholder data
  const taxYears = [2024, 2023, 2022];
  const supportedJurisdictions = ["United States", "European Union", "India"];
  const costBasisMethods = ["FIFO", "LIFO", "HIFO", "Specific ID"];

  return (
    <motion.div {...pageTransition}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax Reports</h1>
            <p className="text-muted-foreground">
              Generate tax reports for your cryptocurrency transactions
            </p>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* Quick Stats */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 md:grid-cols-3"
        >
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Gains (2024)
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">
                  Short-term: $0.00 | Long-term: $0.00
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxable Events
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No taxable events this year
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Uncategorized
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  All transactions categorized
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Tax Configuration */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Jurisdiction */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Jurisdiction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select your tax jurisdiction for accurate reporting rules.
              </p>
              <div className="space-y-2">
                {supportedJurisdictions.map((jurisdiction) => (
                  <div
                    key={jurisdiction}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent"
                  >
                    <span className="text-sm font-medium">{jurisdiction}</span>
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Basis Method */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Basis Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how to calculate your cost basis for gains/losses.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {costBasisMethods.map((method) => (
                  <div
                    key={method}
                    className="flex items-center justify-center rounded-lg border p-3 cursor-pointer hover:bg-accent"
                  >
                    <span className="text-sm font-medium">{method}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tax Years */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Year Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {taxYears.map((year) => (
                <div
                  key={year}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">Tax Year {year}</p>
                    <p className="text-sm text-muted-foreground">
                      No data available
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Formats */}
        <Card className="border-muted">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Download className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Export Formats</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Export your tax reports in formats compatible with popular tax
                  software and accountant requirements.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    TurboTax (.csv)
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    TaxAct (.csv)
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    Form 8949 (PDF)
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    Schedule D (PDF)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
