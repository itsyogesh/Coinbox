/**
 * Transaction types and interfaces
 */
import type { Chain } from './chain';
export declare enum TransactionStatus {
    Pending = "pending",
    Confirmed = "confirmed",
    Failed = "failed",
    Dropped = "dropped"
}
export declare enum TransactionDirection {
    Incoming = "incoming",
    Outgoing = "outgoing",
    SelfTransfer = "self",
    Swap = "swap",
    Contract = "contract"
}
export declare enum AssetType {
    NativeCurrency = "native",
    Token = "token",
    NFT = "nft",
    LP = "lp"
}
export declare enum TaxCategory {
    Sale = "sale",
    Swap = "swap",
    NFTSale = "nft_sale",
    PaymentSent = "payment_sent",
    Airdrop = "airdrop",
    StakingReward = "staking_reward",
    MiningReward = "mining_reward",
    DeFiYield = "defi_yield",
    Salary = "salary",
    Transfer = "transfer",
    Purchase = "purchase",
    GiftReceived = "gift_received",
    GiftSent = "gift_sent",
    Fee = "fee",
    Bridge = "bridge",
    Deposit = "deposit",
    Withdrawal = "withdrawal",
    Unknown = "unknown"
}
/**
 * Asset representation
 */
export interface Asset {
    chain: Chain;
    type: AssetType;
    symbol: string;
    name: string;
    decimals: number;
    contractAddress: string | null;
    tokenId?: string;
    priceId?: string;
    imageUrl?: string;
}
/**
 * Amount with asset info
 */
export interface Amount {
    asset: Asset;
    /** Raw amount in smallest unit (string for bigint safety) */
    raw: string;
    /** Human-readable formatted amount */
    formatted: string;
    /** Fiat value at time of transaction */
    fiatValue?: FiatValue;
}
export interface FiatValue {
    currency: string;
    amount: string;
    price: string;
    priceTimestamp: number;
    priceSource: string;
}
/**
 * Single transfer within a transaction
 */
export interface Transfer {
    id: string;
    from: string;
    to: string;
    amount: Amount;
    transferType: 'native' | 'token' | 'nft' | 'internal';
    logIndex?: number;
}
/**
 * Transaction fee
 */
export interface TransactionFee {
    amount: Amount;
    payer: string;
    feeRate?: Record<string, unknown>;
}
/**
 * Unified transaction model
 */
export interface Transaction {
    id: string;
    chain: Chain;
    hash: string;
    blockNumber: number | null;
    blockHash: string | null;
    transactionIndex: number | null;
    timestamp: number | null;
    confirmations: number;
    status: TransactionStatus;
    direction: TransactionDirection;
    fee: TransactionFee;
    transfers: Transfer[];
    taxCategory?: TaxCategory;
    taxCategoryConfidence?: number;
    taxSubCategory?: string;
    notes?: string;
    tags?: string[];
    costBasis?: CostBasisInfo[];
    chainData?: BitcoinTxData | EVMTxData;
    createdAt: number;
    updatedAt: number;
}
/**
 * Cost basis info for tax calculations
 */
export interface CostBasisInfo {
    asset: Asset;
    amount: string;
    costBasisFiat: string;
    acquiredAt: number;
    acquisitionTxId?: string;
    holdingPeriod: 'short' | 'long';
    proceedsFiat: string;
    gainLoss: string;
    method: CostBasisMethod;
}
export type CostBasisMethod = 'fifo' | 'lifo' | 'hifo' | 'specific';
/**
 * Bitcoin-specific transaction data
 */
export interface BitcoinTxData {
    type: 'bitcoin';
    inputs: BitcoinInput[];
    outputs: BitcoinOutput[];
    version: number;
    lockTime: number;
    vsize: number;
    weight: number;
    isSegwit: boolean;
    isRBF: boolean;
}
export interface BitcoinInput {
    txid: string;
    vout: number;
    scriptSig: string;
    witness?: string[];
    sequence: number;
    address?: string;
    value: string;
}
export interface BitcoinOutput {
    n: number;
    value: string;
    scriptPubKey: string;
    address?: string;
    type: string;
}
/**
 * EVM-specific transaction data
 */
export interface EVMTxData {
    type: 'evm';
    from: string;
    to: string | null;
    value: string;
    gasLimit: string;
    gasUsed: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    effectiveGasPrice: string;
    txType: number;
    nonce: number;
    input: string;
    logs: EVMLog[];
    contractAddress?: string;
}
export interface EVMLog {
    logIndex: number;
    address: string;
    topics: string[];
    data: string;
    decoded?: {
        name: string;
        params: Record<string, unknown>;
    };
}
/**
 * Transaction filter for queries
 */
export interface TransactionFilter {
    chains?: Chain[];
    addresses?: string[];
    direction?: TransactionDirection;
    status?: TransactionStatus;
    taxCategory?: TaxCategory;
    asset?: string;
    dateRange?: {
        from: number;
        to: number;
    };
    search?: string;
    limit?: number;
    offset?: number;
}
//# sourceMappingURL=transaction.d.ts.map