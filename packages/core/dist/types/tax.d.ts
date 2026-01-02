/**
 * Tax types and interfaces
 */
import type { Asset, CostBasisMethod, TaxCategory, Transaction } from './transaction';
export declare enum TaxJurisdiction {
    US = "us",
    UK = "uk",
    Germany = "de",
    France = "fr",
    India = "in"
}
export interface TaxConfig {
    jurisdiction: TaxJurisdiction;
    costBasisMethod: CostBasisMethod;
    fiatCurrency: string;
    taxYear: number;
}
export interface TaxJurisdictionConfig {
    jurisdiction: TaxJurisdiction;
    name: string;
    currency: string;
    supportedMethods: CostBasisMethod[];
    defaultMethod: CostBasisMethod;
    shortTermDays: number;
    /** Special rules (e.g., Germany 1-year tax-free) */
    specialRules?: string[];
}
export declare const TAX_JURISDICTION_CONFIGS: Record<TaxJurisdiction, TaxJurisdictionConfig>;
/**
 * Capital gains entry for tax report
 */
export interface CapitalGainsEntry {
    transactionId: string;
    transaction: Transaction;
    asset: Asset;
    dateAcquired: number;
    dateSold: number;
    proceeds: string;
    costBasis: string;
    gainLoss: string;
    holdingPeriod: 'short' | 'long';
    method: CostBasisMethod;
}
/**
 * Income entry for tax report
 */
export interface IncomeEntry {
    transactionId: string;
    transaction: Transaction;
    asset: Asset;
    amount: string;
    fairMarketValue: string;
    category: TaxCategory;
    description?: string;
}
/**
 * Tax report summary
 */
export interface TaxReport {
    config: TaxConfig;
    generatedAt: number;
    capitalGains: {
        shortTerm: CapitalGainsEntry[];
        longTerm: CapitalGainsEntry[];
        totalShortTermGain: string;
        totalLongTermGain: string;
        totalGain: string;
    };
    income: {
        entries: IncomeEntry[];
        totalIncome: string;
        byCategory: Record<TaxCategory, string>;
    };
    summary: {
        totalTaxableEvents: number;
        totalTransactions: number;
        uncategorizedTransactions: number;
    };
}
/**
 * Tax lot for cost basis tracking
 */
export interface TaxLot {
    id: string;
    asset: Asset;
    amount: string;
    remainingAmount: string;
    costBasis: string;
    acquiredAt: number;
    acquisitionTxId: string;
    isClosed: boolean;
}
/**
 * Tax export format
 */
export declare enum TaxExportFormat {
    CSV = "csv",
    Form8949 = "form_8949",
    TurboTax = "turbotax",
    CoinTracker = "cointracker",
    Koinly = "koinly"
}
export interface TaxExportRequest {
    report: TaxReport;
    format: TaxExportFormat;
    includeTransactions?: boolean;
}
//# sourceMappingURL=tax.d.ts.map