/**
 * Unified Multi-Chain Data Model - TypeScript
 *
 * This data model provides a chain-agnostic representation of blockchain transactions
 * that works across UTXO-based chains (Bitcoin), account-based EVM chains (Ethereum, L2s),
 * Solana, and future chains.
 *
 * Key Design Principles:
 * 1. Chain-agnostic core with chain-specific extensions
 * 2. Sufficient detail for tax calculations (cost basis, gains/losses)
 * 3. Support for native currency, tokens, and NFTs uniformly
 * 4. Extensible without schema changes
 */

// ============================================================================
// Core Enums & Types
// ============================================================================

export enum Chain {
  Bitcoin = 'bitcoin',
  Ethereum = 'ethereum',
  Arbitrum = 'arbitrum',
  Optimism = 'optimism',
  Base = 'base',
  Polygon = 'polygon',
  Solana = 'solana',
  Cosmos = 'cosmos',
  Sui = 'sui',
  Aptos = 'aptos',
}

export enum TransactionStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
  Dropped = 'dropped',
}

export enum TransactionDirection {
  Incoming = 'incoming',    // Received funds
  Outgoing = 'outgoing',    // Sent funds
  SelfTransfer = 'self',    // Between own addresses
  Swap = 'swap',            // Exchange within same tx
  Contract = 'contract',    // Contract interaction
}

export enum AssetType {
  NativeCurrency = 'native',  // BTC, ETH, SOL
  Token = 'token',            // ERC-20, SPL Token
  NFT = 'nft',                // ERC-721, ERC-1155, Metaplex
  LP = 'lp',                  // Liquidity pool tokens
}

export enum TaxCategory {
  // Capital Gains Events
  Sale = 'sale',
  Swap = 'swap',
  NFTSale = 'nft_sale',
  PaymentSent = 'payment_sent',

  // Income Events
  Airdrop = 'airdrop',
  StakingReward = 'staking_reward',
  MiningReward = 'mining_reward',
  DeFiYield = 'defi_yield',
  Salary = 'salary',

  // Non-Taxable
  Transfer = 'transfer',           // Between own wallets
  Purchase = 'purchase',           // Buying crypto
  GiftReceived = 'gift_received',
  GiftSent = 'gift_sent',

  // Special
  Fee = 'fee',
  Bridge = 'bridge',
  Deposit = 'deposit',             // To exchange/DeFi
  Withdrawal = 'withdrawal',       // From exchange/DeFi
  Unknown = 'unknown',
}

// ============================================================================
// Asset Representation
// ============================================================================

/**
 * Unified asset representation across all chains
 */
export interface Asset {
  /** Chain this asset exists on */
  chain: Chain;

  /** Asset type */
  type: AssetType;

  /**
   * Symbol (e.g., 'BTC', 'ETH', 'USDC')
   * For NFTs, this is the collection symbol
   */
  symbol: string;

  /**
   * Full name (e.g., 'Bitcoin', 'USD Coin')
   * For NFTs, this is the collection name
   */
  name: string;

  /**
   * Number of decimals (e.g., 8 for BTC, 18 for ETH, 0 for NFTs)
   */
  decimals: number;

  /**
   * Chain-specific identifier
   * - Native: null
   * - ERC-20: contract address
   * - SPL: mint address
   * - NFT: contract address or mint address
   */
  contractAddress: string | null;

  /**
   * For NFTs: token ID within the collection
   */
  tokenId?: string;

  /**
   * CoinGecko/CoinMarketCap ID for price lookups
   */
  priceId?: string;

  /**
   * Image/logo URL (especially for NFTs)
   */
  imageUrl?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

// ============================================================================
// Amount Representation
// ============================================================================

/**
 * Monetary amount with asset information
 * All numeric values stored as strings to avoid floating point issues
 */
export interface Amount {
  /** The asset being transferred */
  asset: Asset;

  /**
   * Amount in smallest unit (satoshis, wei, lamports)
   * Stored as string to handle bigints
   */
  raw: string;

  /**
   * Human-readable amount (e.g., '1.5' BTC)
   * Derived from raw / 10^decimals
   */
  formatted: string;

  /**
   * Fiat value at time of transaction
   */
  fiatValue?: FiatValue;
}

/**
 * Fiat currency value
 */
export interface FiatValue {
  /** Currency code (USD, EUR, etc.) */
  currency: string;

  /** Amount in fiat */
  amount: string;

  /** Price per unit at time of transaction */
  price: string;

  /** Timestamp of price */
  priceTimestamp: number;

  /** Price source */
  priceSource: string;
}

// ============================================================================
// Transfer & Fee Representation
// ============================================================================

/**
 * A single asset transfer within a transaction
 * Transactions can have multiple transfers (e.g., Bitcoin with multiple outputs,
 * Ethereum with ERC-20 transfer + ETH payment)
 */
export interface Transfer {
  /** Unique ID for this transfer */
  id: string;

  /** Sender address */
  from: string;

  /** Recipient address */
  to: string;

  /** Amount transferred */
  amount: Amount;

  /**
   * Transfer type/method
   * - 'native': Native currency transfer
   * - 'token': Token transfer
   * - 'nft': NFT transfer
   * - 'internal': Internal transaction (Ethereum)
   */
  transferType: string;

  /**
   * For token transfers: log index or instruction index
   */
  logIndex?: number;

  /**
   * Chain-specific data
   */
  chainData?: Record<string, any>;
}

/**
 * Transaction fee representation
 * Handles different fee models across chains
 */
export interface Fee {
  /** Fee amount */
  amount: Amount;

  /**
   * Fee rate information (chain-specific)
   * - Bitcoin: { satPerVbyte: number }
   * - Ethereum: { gasPrice: string, gasUsed: string, maxFeePerGas?: string, maxPriorityFeePerGas?: string }
   * - Solana: { computeUnits: number }
   */
  feeRate?: Record<string, any>;

  /**
   * Who paid the fee (usually transaction sender)
   */
  payer: string;
}

// ============================================================================
// Unified Transaction Model
// ============================================================================

/**
 * Core unified transaction structure
 * Works across all blockchain types
 */
export interface UnifiedTransaction {
  /** Unique identifier (chain-specific hash) */
  id: string;

  /** Blockchain this transaction is on */
  chain: Chain;

  /** Transaction hash */
  hash: string;

  /** Block number (null if pending) */
  blockNumber: number | null;

  /** Block hash */
  blockHash: string | null;

  /** Transaction index in block */
  transactionIndex: number | null;

  /** Timestamp (null if pending) */
  timestamp: number | null;

  /** Number of confirmations */
  confirmations: number;

  /** Transaction status */
  status: TransactionStatus;

  /**
   * Overall direction from user's perspective
   * Determined by comparing addresses against user's wallet addresses
   */
  direction: TransactionDirection;

  /** Transaction fee */
  fee: Fee;

  /**
   * All transfers within this transaction
   * - Bitcoin: one per output
   * - Ethereum: native transfer + any token transfers
   * - Solana: multiple SPL transfers possible
   */
  transfers: Transfer[];

  /**
   * Contract/program interactions
   */
  contractInteractions: ContractInteraction[];

  /**
   * User-assigned or AI-suggested category for tax purposes
   */
  taxCategory?: TaxCategory;

  /**
   * Confidence score for AI categorization (0-1)
   */
  taxCategoryConfidence?: number;

  /**
   * Sub-category for more specific classification
   */
  taxSubCategory?: string;

  /**
   * User notes
   */
  notes?: string;

  /**
   * Tags for organization
   */
  tags?: string[];

  /**
   * Cost basis information (for disposals)
   */
  costBasis?: CostBasisInfo[];

  /**
   * Chain-specific raw data (extensibility)
   * This allows storing chain-specific information without schema changes
   */
  chainSpecific: ChainSpecificData;

  /**
   * When this record was created/updated locally
   */
  createdAt: number;
  updatedAt: number;
}

/**
 * Contract or program interaction
 */
export interface ContractInteraction {
  /** Contract/program address */
  address: string;

  /** Contract name (if known) */
  name?: string;

  /** Method/function called */
  method?: string;

  /** Human-readable description */
  description?: string;

  /** Interaction type (swap, stake, etc.) */
  type?: string;

  /** Decoded parameters */
  params?: Record<string, any>;
}

/**
 * Cost basis information for tax calculations
 */
export interface CostBasisInfo {
  /** Asset being disposed */
  asset: Asset;

  /** Amount disposed */
  amount: string;

  /** Total cost basis in fiat */
  costBasisFiat: string;

  /** Acquisition date */
  acquiredAt: number;

  /** Reference to acquisition transaction */
  acquisitionTxId?: string;

  /** Holding period (short/long term) */
  holdingPeriod: 'short' | 'long';

  /** Proceeds from disposal */
  proceedsFiat: string;

  /** Realized gain/loss */
  gainLoss: string;

  /** Cost basis method used */
  method: 'fifo' | 'lifo' | 'hifo' | 'specific';
}

// ============================================================================
// Chain-Specific Data Structures
// ============================================================================

/**
 * Discriminated union for chain-specific data
 */
export type ChainSpecificData =
  | BitcoinData
  | EthereumData
  | SolanaData
  | GenericChainData;

/**
 * Bitcoin-specific data (UTXO model)
 */
export interface BitcoinData {
  chain: Chain.Bitcoin;

  /** Inputs (UTXOs being spent) */
  inputs: BitcoinInput[];

  /** Outputs (new UTXOs) */
  outputs: BitcoinOutput[];

  /** Transaction version */
  version: number;

  /** Lock time */
  lockTime: number;

  /** Virtual size (vBytes) */
  vsize: number;

  /** Weight units */
  weight: number;

  /** Is this a SegWit transaction */
  isSegwit: boolean;

  /** Is this a replace-by-fee transaction */
  isRBF: boolean;
}

export interface BitcoinInput {
  /** Previous transaction hash */
  txid: string;

  /** Output index */
  vout: number;

  /** Script signature */
  scriptSig: string;

  /** Witness data (for SegWit) */
  witness?: string[];

  /** Sequence number */
  sequence: number;

  /** Address spending from */
  address?: string;

  /** Value being spent */
  value: string;
}

export interface BitcoinOutput {
  /** Output index */
  n: number;

  /** Value in satoshis */
  value: string;

  /** Script pubkey */
  scriptPubKey: string;

  /** Recipient address */
  address?: string;

  /** Output type (p2pkh, p2sh, p2wpkh, etc.) */
  type: string;
}

/**
 * Ethereum/EVM-specific data (account model)
 */
export interface EthereumData {
  chain: Chain.Ethereum | Chain.Arbitrum | Chain.Optimism | Chain.Base | Chain.Polygon;

  /** Sender address */
  from: string;

  /** Recipient address (null for contract creation) */
  to: string | null;

  /** Value in wei */
  value: string;

  /** Gas limit */
  gasLimit: string;

  /** Gas used */
  gasUsed: string;

  /** Gas price (legacy) */
  gasPrice?: string;

  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: string;

  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: string;

  /** Base fee per gas (EIP-1559) */
  baseFeePerGas?: string;

  /** Effective gas price paid */
  effectiveGasPrice: string;

  /** Transaction type (0: legacy, 1: EIP-2930, 2: EIP-1559) */
  type: number;

  /** Nonce */
  nonce: number;

  /** Input data */
  input: string;

  /** Contract creation address */
  contractAddress?: string;

  /** Logs (events) */
  logs: EthereumLog[];

  /** Internal transactions */
  internalTransactions?: EthereumInternalTransaction[];

  /** Decoded method call */
  decodedInput?: {
    method: string;
    params: Record<string, any>;
  };
}

export interface EthereumLog {
  /** Log index */
  logIndex: number;

  /** Contract address that emitted the log */
  address: string;

  /** Event topics */
  topics: string[];

  /** Event data */
  data: string;

  /** Decoded event */
  decoded?: {
    name: string;
    params: Record<string, any>;
  };
}

export interface EthereumInternalTransaction {
  /** Type (call, delegatecall, staticcall, create) */
  type: string;

  /** From address */
  from: string;

  /** To address */
  to: string;

  /** Value transferred */
  value: string;

  /** Gas used */
  gas: string;

  /** Gas used */
  gasUsed: string;

  /** Input data */
  input: string;

  /** Output data */
  output: string;

  /** Error (if failed) */
  error?: string;
}

/**
 * Solana-specific data (account model with instructions)
 */
export interface SolanaData {
  chain: Chain.Solana;

  /** Transaction signatures */
  signatures: string[];

  /** Recent blockhash */
  recentBlockhash: string;

  /** Fee payer */
  feePayer: string;

  /** Instructions executed */
  instructions: SolanaInstruction[];

  /** Inner instructions (from CPI) */
  innerInstructions?: SolanaInnerInstruction[];

  /** Account keys */
  accountKeys: string[];

  /** Compute units consumed */
  computeUnitsConsumed?: number;

  /** Log messages */
  logMessages?: string[];

  /** Pre-balances */
  preBalances: string[];

  /** Post-balances */
  postBalances: string[];

  /** Pre-token balances */
  preTokenBalances?: SolanaTokenBalance[];

  /** Post-token balances */
  postTokenBalances?: SolanaTokenBalance[];
}

export interface SolanaInstruction {
  /** Program ID */
  programId: string;

  /** Program name (if known) */
  programName?: string;

  /** Instruction index */
  index: number;

  /** Account indices involved */
  accounts: number[];

  /** Instruction data */
  data: string;

  /** Decoded instruction */
  decoded?: {
    type: string;
    info: Record<string, any>;
  };
}

export interface SolanaInnerInstruction {
  /** Parent instruction index */
  index: number;

  /** Inner instructions */
  instructions: SolanaInstruction[];
}

export interface SolanaTokenBalance {
  /** Account index */
  accountIndex: number;

  /** Mint address */
  mint: string;

  /** Owner */
  owner: string;

  /** Amount */
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
  };
}

/**
 * Generic chain data for future chains
 */
export interface GenericChainData {
  chain: Chain;

  /** Raw transaction data as JSON */
  raw: Record<string, any>;
}

// ============================================================================
// Transaction Query & Filter Types
// ============================================================================

export interface TransactionFilter {
  /** Filter by chains */
  chains?: Chain[];

  /** Filter by addresses (user wallets) */
  addresses?: string[];

  /** Filter by direction */
  direction?: TransactionDirection;

  /** Filter by status */
  status?: TransactionStatus;

  /** Filter by tax category */
  taxCategory?: TaxCategory;

  /** Filter by asset */
  asset?: string;

  /** Date range */
  dateRange?: {
    from: number;
    to: number;
  };

  /** Search query (hash, address, notes) */
  search?: string;

  /** Pagination */
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  /** Total transactions */
  total: number;

  /** By chain */
  byChain: Record<Chain, number>;

  /** By direction */
  byDirection: Record<TransactionDirection, number>;

  /** By status */
  byStatus: Record<TransactionStatus, number>;

  /** By tax category */
  byTaxCategory: Record<TaxCategory, number>;

  /** Total fees paid */
  totalFees: Record<string, string>; // asset -> total

  /** Date range */
  dateRange: {
    earliest: number;
    latest: number;
  };
}

// ============================================================================
// Export Types
// ============================================================================

export interface TaxExport {
  /** Tax year */
  year: number;

  /** Cost basis method */
  costBasisMethod: 'fifo' | 'lifo' | 'hifo' | 'specific';

  /** Currency */
  currency: string;

  /** Capital gains */
  capitalGains: {
    shortTerm: CapitalGainsEntry[];
    longTerm: CapitalGainsEntry[];
    totalShortTermGain: string;
    totalLongTermGain: string;
  };

  /** Income */
  income: IncomeEntry[];
  totalIncome: string;

  /** Transactions */
  transactions: UnifiedTransaction[];
}

export interface CapitalGainsEntry {
  /** Transaction */
  transaction: UnifiedTransaction;

  /** Asset disposed */
  asset: Asset;

  /** Date acquired */
  dateAcquired: number;

  /** Date sold */
  dateSold: number;

  /** Proceeds */
  proceeds: string;

  /** Cost basis */
  costBasis: string;

  /** Gain/loss */
  gainLoss: string;
}

export interface IncomeEntry {
  /** Transaction */
  transaction: UnifiedTransaction;

  /** Asset received */
  asset: Asset;

  /** Amount */
  amount: string;

  /** Fair market value */
  fmv: string;

  /** Category */
  category: TaxCategory;
}
