/**
 * @coinbox/core types
 *
 * Chain-agnostic types for cryptocurrency portfolio tracking
 */

// Chain types
export {
  Chain,
  type ChainConfig,
  CHAIN_CONFIGS,
  isEVMChain,
  getChainConfig,
} from './chain';

// Wallet types
export {
  type Wallet,
  type WalletAddress,
  type WalletMetadata,
  type WalletBalance,
  type TokenBalance,
  type CreateWalletRequest,
  type WalletExport,
  WalletType,
} from './wallet';

// Transaction types
export {
  type Transaction,
  type Transfer,
  type TransactionFee,
  type Asset,
  type Amount,
  type FiatValue,
  type CostBasisInfo,
  type TransactionFilter,
  type BitcoinTxData,
  type BitcoinInput,
  type BitcoinOutput,
  type EVMTxData,
  type EVMLog,
  TransactionStatus,
  TransactionDirection,
  AssetType,
  TaxCategory,
  type CostBasisMethod,
} from './transaction';

// Tax types
export {
  type TaxConfig,
  type TaxJurisdictionConfig,
  type CapitalGainsEntry,
  type IncomeEntry,
  type TaxReport,
  type TaxLot,
  type TaxExportRequest,
  TaxJurisdiction,
  TAX_JURISDICTION_CONFIGS,
  TaxExportFormat,
} from './tax';

// Settings types
export {
  type AppSettings,
  type RPCEndpoints,
  type AISettings,
  type PrivacySettings,
  type Theme,
  type FiatCurrency,
  type AIProvider,
  DEFAULT_RPC_ENDPOINTS,
  DEFAULT_SETTINGS,
} from './settings';
