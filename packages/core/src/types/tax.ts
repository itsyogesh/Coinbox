/**
 * Tax types and interfaces
 */

import type { Asset, CostBasisMethod, TaxCategory, Transaction } from './transaction';

export enum TaxJurisdiction {
  US = 'us',
  UK = 'uk',
  Germany = 'de',
  France = 'fr',
  India = 'in',
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

export const TAX_JURISDICTION_CONFIGS: Record<TaxJurisdiction, TaxJurisdictionConfig> = {
  [TaxJurisdiction.US]: {
    jurisdiction: TaxJurisdiction.US,
    name: 'United States',
    currency: 'USD',
    supportedMethods: ['fifo', 'lifo', 'hifo', 'specific'],
    defaultMethod: 'fifo',
    shortTermDays: 365,
  },
  [TaxJurisdiction.UK]: {
    jurisdiction: TaxJurisdiction.UK,
    name: 'United Kingdom',
    currency: 'GBP',
    supportedMethods: ['fifo'], // Section 104 pool
    defaultMethod: 'fifo',
    shortTermDays: 0, // No distinction
    specialRules: ['section_104_pool'],
  },
  [TaxJurisdiction.Germany]: {
    jurisdiction: TaxJurisdiction.Germany,
    name: 'Germany',
    currency: 'EUR',
    supportedMethods: ['fifo'],
    defaultMethod: 'fifo',
    shortTermDays: 365,
    specialRules: ['one_year_tax_free'],
  },
  [TaxJurisdiction.France]: {
    jurisdiction: TaxJurisdiction.France,
    name: 'France',
    currency: 'EUR',
    supportedMethods: ['fifo'], // Average cost
    defaultMethod: 'fifo',
    shortTermDays: 0,
    specialRules: ['average_cost', 'flat_tax_30'],
  },
  [TaxJurisdiction.India]: {
    jurisdiction: TaxJurisdiction.India,
    name: 'India',
    currency: 'INR',
    supportedMethods: ['fifo'],
    defaultMethod: 'fifo',
    shortTermDays: 0,
    specialRules: ['flat_tax_30', 'no_loss_offset'],
  },
};

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
export enum TaxExportFormat {
  CSV = 'csv',
  Form8949 = 'form_8949',
  TurboTax = 'turbotax',
  CoinTracker = 'cointracker',
  Koinly = 'koinly',
}

export interface TaxExportRequest {
  report: TaxReport;
  format: TaxExportFormat;
  includeTransactions?: boolean;
}
