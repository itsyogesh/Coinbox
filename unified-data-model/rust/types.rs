/**
 * Unified Multi-Chain Data Model - Rust
 *
 * Rust equivalent of the TypeScript unified data model.
 * Uses serde for serialization/deserialization to match the TypeScript types.
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Core Enums & Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Chain {
    Bitcoin,
    Ethereum,
    Arbitrum,
    Optimism,
    Base,
    Polygon,
    Solana,
    Cosmos,
    Sui,
    Aptos,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Failed,
    Dropped,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TransactionDirection {
    Incoming,
    Outgoing,
    #[serde(rename = "self")]
    SelfTransfer,
    Swap,
    Contract,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    #[serde(rename = "native")]
    NativeCurrency,
    Token,
    #[serde(rename = "nft")]
    NFT,
    #[serde(rename = "lp")]
    LP,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaxCategory {
    // Capital Gains Events
    Sale,
    Swap,
    NFTSale,
    PaymentSent,

    // Income Events
    Airdrop,
    StakingReward,
    MiningReward,
    DeFiYield,
    Salary,

    // Non-Taxable
    Transfer,
    Purchase,
    GiftReceived,
    GiftSent,

    // Special
    Fee,
    Bridge,
    Deposit,
    Withdrawal,
    Unknown,
}

// ============================================================================
// Asset Representation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub chain: Chain,
    #[serde(rename = "type")]
    pub asset_type: AssetType,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub contract_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

// ============================================================================
// Amount Representation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Amount {
    pub asset: Asset,
    /// Amount in smallest unit (stored as string for bigint compatibility)
    pub raw: String,
    /// Human-readable amount
    pub formatted: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_value: Option<FiatValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiatValue {
    pub currency: String,
    pub amount: String,
    pub price: String,
    pub price_timestamp: i64,
    pub price_source: String,
}

// ============================================================================
// Transfer & Fee Representation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transfer {
    pub id: String,
    pub from: String,
    pub to: String,
    pub amount: Amount,
    pub transfer_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_index: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chain_data: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fee {
    pub amount: Amount,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fee_rate: Option<HashMap<String, serde_json::Value>>,
    pub payer: String,
}

// ============================================================================
// Unified Transaction Model
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedTransaction {
    pub id: String,
    pub chain: Chain,
    pub hash: String,
    pub block_number: Option<u64>,
    pub block_hash: Option<String>,
    pub transaction_index: Option<u32>,
    pub timestamp: Option<i64>,
    pub confirmations: u32,
    pub status: TransactionStatus,
    pub direction: TransactionDirection,
    pub fee: Fee,
    pub transfers: Vec<Transfer>,
    pub contract_interactions: Vec<ContractInteraction>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_category: Option<TaxCategory>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_category_confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_sub_category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_basis: Option<Vec<CostBasisInfo>>,

    pub chain_specific: ChainSpecificData,

    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractInteraction {
    pub address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostBasisInfo {
    pub asset: Asset,
    pub amount: String,
    pub cost_basis_fiat: String,
    pub acquired_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquisition_tx_id: Option<String>,
    pub holding_period: HoldingPeriod,
    pub proceeds_fiat: String,
    pub gain_loss: String,
    pub method: CostBasisMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HoldingPeriod {
    Short,
    Long,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CostBasisMethod {
    Fifo,
    Lifo,
    Hifo,
    Specific,
}

// ============================================================================
// Chain-Specific Data Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "chain", rename_all = "lowercase")]
pub enum ChainSpecificData {
    Bitcoin(BitcoinData),
    Ethereum(EthereumData),
    Arbitrum(EthereumData),
    Optimism(EthereumData),
    Base(EthereumData),
    Polygon(EthereumData),
    Solana(SolanaData),
    #[serde(untagged)]
    Generic(GenericChainData),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BitcoinData {
    pub inputs: Vec<BitcoinInput>,
    pub outputs: Vec<BitcoinOutput>,
    pub version: i32,
    pub lock_time: u32,
    pub vsize: u64,
    pub weight: u64,
    pub is_segwit: bool,
    pub is_rbf: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BitcoinInput {
    pub txid: String,
    pub vout: u32,
    pub script_sig: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub witness: Option<Vec<String>>,
    pub sequence: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BitcoinOutput {
    pub n: u32,
    pub value: String,
    pub script_pub_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(rename = "type")]
    pub output_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EthereumData {
    pub from: String,
    pub to: Option<String>,
    pub value: String,
    pub gas_limit: String,
    pub gas_used: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gas_price: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_fee_per_gas: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_priority_fee_per_gas: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_fee_per_gas: Option<String>,
    pub effective_gas_price: String,
    #[serde(rename = "type")]
    pub tx_type: u8,
    pub nonce: u64,
    pub input: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contract_address: Option<String>,
    pub logs: Vec<EthereumLog>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub internal_transactions: Option<Vec<EthereumInternalTransaction>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decoded_input: Option<DecodedInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EthereumLog {
    pub log_index: u32,
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decoded: Option<DecodedEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EthereumInternalTransaction {
    #[serde(rename = "type")]
    pub tx_type: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub gas: String,
    pub gas_used: String,
    pub input: String,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedInput {
    pub method: String,
    pub params: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedEvent {
    pub name: String,
    pub params: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolanaData {
    pub signatures: Vec<String>,
    pub recent_blockhash: String,
    pub fee_payer: String,
    pub instructions: Vec<SolanaInstruction>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inner_instructions: Option<Vec<SolanaInnerInstruction>>,
    pub account_keys: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compute_units_consumed: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_messages: Option<Vec<String>>,
    pub pre_balances: Vec<String>,
    pub post_balances: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pre_token_balances: Option<Vec<SolanaTokenBalance>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_token_balances: Option<Vec<SolanaTokenBalance>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolanaInstruction {
    pub program_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub program_name: Option<String>,
    pub index: u32,
    pub accounts: Vec<u32>,
    pub data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decoded: Option<DecodedInstruction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolanaInnerInstruction {
    pub index: u32,
    pub instructions: Vec<SolanaInstruction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolanaTokenBalance {
    pub account_index: u32,
    pub mint: String,
    pub owner: String,
    pub ui_token_amount: TokenAmount,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenAmount {
    pub amount: String,
    pub decimals: u8,
    pub ui_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodedInstruction {
    #[serde(rename = "type")]
    pub instruction_type: String,
    pub info: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenericChainData {
    pub raw: HashMap<String, serde_json::Value>,
}

// ============================================================================
// Transaction Query & Filter Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TransactionFilter {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chains: Option<Vec<Chain>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub addresses: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<TransactionDirection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<TransactionStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_category: Option<TaxCategory>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date_range: Option<DateRange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub from: i64,
    pub to: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionSummary {
    pub total: u64,
    pub by_chain: HashMap<Chain, u64>,
    pub by_direction: HashMap<String, u64>,
    pub by_status: HashMap<String, u64>,
    pub by_tax_category: HashMap<String, u64>,
    pub total_fees: HashMap<String, String>,
    pub date_range: DateRange,
}

// ============================================================================
// Helper Implementations
// ============================================================================

impl Asset {
    pub fn new_native(chain: Chain, symbol: String, name: String, decimals: u8) -> Self {
        Self {
            chain,
            asset_type: AssetType::NativeCurrency,
            symbol,
            name,
            decimals,
            contract_address: None,
            token_id: None,
            price_id: None,
            image_url: None,
            metadata: None,
        }
    }

    pub fn new_token(
        chain: Chain,
        symbol: String,
        name: String,
        decimals: u8,
        contract_address: String,
    ) -> Self {
        Self {
            chain,
            asset_type: AssetType::Token,
            symbol,
            name,
            decimals,
            contract_address: Some(contract_address),
            token_id: None,
            price_id: None,
            image_url: None,
            metadata: None,
        }
    }

    pub fn is_native(&self) -> bool {
        self.asset_type == AssetType::NativeCurrency
    }
}

impl UnifiedTransaction {
    /// Determine if this transaction involves the given address
    pub fn involves_address(&self, address: &str) -> bool {
        self.transfers.iter().any(|t| {
            t.from.eq_ignore_ascii_case(address) || t.to.eq_ignore_ascii_case(address)
        })
    }

    /// Get all unique addresses involved in this transaction
    pub fn all_addresses(&self) -> Vec<String> {
        let mut addresses = Vec::new();
        for transfer in &self.transfers {
            if !addresses.contains(&transfer.from) {
                addresses.push(transfer.from.clone());
            }
            if !addresses.contains(&transfer.to) {
                addresses.push(transfer.to.clone());
            }
        }
        addresses
    }

    /// Check if this is a taxable event
    pub fn is_taxable(&self) -> bool {
        matches!(
            self.tax_category,
            Some(TaxCategory::Sale)
                | Some(TaxCategory::Swap)
                | Some(TaxCategory::NFTSale)
                | Some(TaxCategory::PaymentSent)
                | Some(TaxCategory::Airdrop)
                | Some(TaxCategory::StakingReward)
                | Some(TaxCategory::MiningReward)
                | Some(TaxCategory::DeFiYield)
                | Some(TaxCategory::Salary)
        )
    }
}
