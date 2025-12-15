/**
 * Chain Adapter Examples
 *
 * Shows how each chain adapter transforms chain-specific transaction data
 * into the unified transaction format.
 */

use super::types::*;
use std::collections::HashMap;

// ============================================================================
// Chain Adapter Trait
// ============================================================================

#[async_trait::async_trait]
pub trait ChainAdapter: Send + Sync {
    /// Get the chain this adapter is for
    fn chain(&self) -> Chain;

    /// Transform chain-specific transaction into unified format
    async fn transform_transaction(
        &self,
        tx_hash: &str,
        user_addresses: &[String],
    ) -> Result<UnifiedTransaction, ChainAdapterError>;

    /// Fetch and transform transactions for an address
    async fn get_transactions(
        &self,
        address: &str,
        from_block: Option<u64>,
    ) -> Result<Vec<UnifiedTransaction>, ChainAdapterError>;

    /// Get current balance
    async fn get_balance(&self, address: &str) -> Result<Vec<Amount>, ChainAdapterError>;
}

#[derive(Debug, thiserror::Error)]
pub enum ChainAdapterError {
    #[error("Network error: {0}")]
    Network(String),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Transaction not found: {0}")]
    NotFound(String),

    #[error("Invalid address: {0}")]
    InvalidAddress(String),
}

// ============================================================================
// Bitcoin Adapter
// ============================================================================

pub struct BitcoinAdapter {
    // Electrum client or API client
}

impl BitcoinAdapter {
    /// Transform Bitcoin transaction into unified format
    ///
    /// Bitcoin uses UTXO model:
    /// - Multiple inputs (previous outputs being spent)
    /// - Multiple outputs (new UTXOs created)
    /// - Each output creates a separate transfer
    pub fn transform_btc_transaction(
        &self,
        raw_tx: BitcoinRawTransaction,
        user_addresses: &[String],
    ) -> UnifiedTransaction {
        // Calculate total input and output for user addresses
        let mut user_received = 0u64;
        let mut user_sent = 0u64;
        let mut transfers = Vec::new();

        // Create transfers for each output
        for output in &raw_tx.vout {
            if let Some(address) = &output.address {
                let value_sats = output.value;

                // Create a transfer for this output
                let transfer = Transfer {
                    id: format!("{}:{}", raw_tx.txid, output.n),
                    from: self.get_input_addresses(&raw_tx.vin).join(","), // Simplified
                    to: address.clone(),
                    amount: Amount {
                        asset: Asset::new_native(
                            Chain::Bitcoin,
                            "BTC".to_string(),
                            "Bitcoin".to_string(),
                            8,
                        ),
                        raw: value_sats.to_string(),
                        formatted: format!("{:.8}", value_sats as f64 / 100_000_000.0),
                        fiat_value: None, // Would be filled by price service
                    },
                    transfer_type: "native".to_string(),
                    log_index: None,
                    chain_data: None,
                };

                transfers.push(transfer);

                // Track user's received amounts
                if user_addresses.contains(address) {
                    user_received += value_sats;
                }
            }
        }

        // Calculate user's sent amounts from inputs
        for input in &raw_tx.vin {
            if let Some(address) = &input.address {
                if user_addresses.contains(address) {
                    user_sent += input.value.unwrap_or(0);
                }
            }
        }

        // Determine direction
        let direction = if user_received > 0 && user_sent == 0 {
            TransactionDirection::Incoming
        } else if user_sent > 0 && user_received == 0 {
            TransactionDirection::Outgoing
        } else if user_sent > 0 && user_received > 0 {
            TransactionDirection::SelfTransfer
        } else {
            TransactionDirection::Contract // Neither sent nor received
        };

        // Calculate fee
        let total_in: u64 = raw_tx
            .vin
            .iter()
            .filter_map(|i| i.value)
            .sum();
        let total_out: u64 = raw_tx.vout.iter().map(|o| o.value).sum();
        let fee_sats = total_in.saturating_sub(total_out);

        // Get first input address as fee payer
        let fee_payer = raw_tx
            .vin
            .first()
            .and_then(|i| i.address.clone())
            .unwrap_or_default();

        let fee = Fee {
            amount: Amount {
                asset: Asset::new_native(
                    Chain::Bitcoin,
                    "BTC".to_string(),
                    "Bitcoin".to_string(),
                    8,
                ),
                raw: fee_sats.to_string(),
                formatted: format!("{:.8}", fee_sats as f64 / 100_000_000.0),
                fiat_value: None,
            },
            fee_rate: Some({
                let mut map = HashMap::new();
                map.insert(
                    "satPerVbyte".to_string(),
                    serde_json::json!(fee_sats as f64 / raw_tx.vsize as f64),
                );
                map
            }),
            payer: fee_payer,
        };

        // Build chain-specific data
        let chain_specific = ChainSpecificData::Bitcoin(BitcoinData {
            inputs: raw_tx
                .vin
                .iter()
                .map(|input| BitcoinInput {
                    txid: input.txid.clone(),
                    vout: input.vout,
                    script_sig: input.script_sig.clone(),
                    witness: input.witness.clone(),
                    sequence: input.sequence,
                    address: input.address.clone(),
                    value: input.value.map(|v| v.to_string()),
                })
                .collect(),
            outputs: raw_tx
                .vout
                .iter()
                .map(|output| BitcoinOutput {
                    n: output.n,
                    value: output.value.to_string(),
                    script_pub_key: output.script_pub_key.clone(),
                    address: output.address.clone(),
                    output_type: output.output_type.clone(),
                })
                .collect(),
            version: raw_tx.version,
            lock_time: raw_tx.locktime,
            vsize: raw_tx.vsize,
            weight: raw_tx.weight,
            is_segwit: raw_tx.is_segwit,
            is_rbf: raw_tx.is_rbf,
        });

        let now = chrono::Utc::now().timestamp();

        UnifiedTransaction {
            id: raw_tx.txid.clone(),
            chain: Chain::Bitcoin,
            hash: raw_tx.txid,
            block_number: raw_tx.block_height,
            block_hash: raw_tx.block_hash,
            transaction_index: raw_tx.tx_index,
            timestamp: raw_tx.block_time,
            confirmations: raw_tx.confirmations,
            status: if raw_tx.confirmations > 0 {
                TransactionStatus::Confirmed
            } else {
                TransactionStatus::Pending
            },
            direction,
            fee,
            transfers,
            contract_interactions: Vec::new(), // Bitcoin has no smart contracts
            tax_category: None,
            tax_category_confidence: None,
            tax_sub_category: None,
            notes: None,
            tags: None,
            cost_basis: None,
            chain_specific,
            created_at: now,
            updated_at: now,
        }
    }

    fn get_input_addresses(&self, inputs: &[RawBitcoinInput]) -> Vec<String> {
        inputs
            .iter()
            .filter_map(|i| i.address.clone())
            .collect()
    }
}

// ============================================================================
// Ethereum Adapter
// ============================================================================

pub struct EthereumAdapter {
    // Ethers provider or RPC client
    chain: Chain,
}

impl EthereumAdapter {
    /// Transform Ethereum transaction into unified format
    ///
    /// Ethereum is account-based:
    /// - Single from/to for native ETH transfer
    /// - Additional ERC-20 transfers detected from logs
    /// - Internal transactions from contract calls
    /// - EIP-1559 fee model
    pub fn transform_eth_transaction(
        &self,
        raw_tx: EthereumRawTransaction,
        receipt: EthereumReceipt,
        user_addresses: &[String],
    ) -> UnifiedTransaction {
        let mut transfers = Vec::new();

        // 1. Native ETH transfer (if value > 0)
        if raw_tx.value > 0 {
            transfers.push(Transfer {
                id: format!("{}:native", raw_tx.hash),
                from: raw_tx.from.clone(),
                to: raw_tx.to.clone().unwrap_or_default(),
                amount: Amount {
                    asset: Asset::new_native(
                        self.chain.clone(),
                        "ETH".to_string(),
                        "Ethereum".to_string(),
                        18,
                    ),
                    raw: raw_tx.value.to_string(),
                    formatted: self.wei_to_eth(&raw_tx.value.to_string()),
                    fiat_value: None,
                },
                transfer_type: "native".to_string(),
                log_index: None,
                chain_data: None,
            });
        }

        // 2. ERC-20 transfers from logs
        for (idx, log) in receipt.logs.iter().enumerate() {
            // ERC-20 Transfer event signature
            const TRANSFER_EVENT: &str =
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

            if log.topics.first().map(|t| t.as_str()) == Some(TRANSFER_EVENT) && log.topics.len() == 3
            {
                // topics[1] = from (padded)
                // topics[2] = to (padded)
                // data = amount
                let from = format!("0x{}", &log.topics[1][26..]); // Remove padding
                let to = format!("0x{}", &log.topics[2][26..]);
                let amount_hex = &log.data[2..]; // Remove 0x
                let amount = u128::from_str_radix(amount_hex, 16).unwrap_or(0);

                // Get token info (would come from token registry or RPC call)
                let token_info = self.get_token_info(&log.address);

                transfers.push(Transfer {
                    id: format!("{}:erc20:{}", raw_tx.hash, idx),
                    from,
                    to,
                    amount: Amount {
                        asset: Asset::new_token(
                            self.chain.clone(),
                            token_info.symbol.clone(),
                            token_info.name.clone(),
                            token_info.decimals,
                            log.address.clone(),
                        ),
                        raw: amount.to_string(),
                        formatted: self.format_token_amount(amount, token_info.decimals),
                        fiat_value: None,
                    },
                    transfer_type: "token".to_string(),
                    log_index: Some(idx as u32),
                    chain_data: None,
                });
            }
        }

        // 3. Contract interactions
        let mut contract_interactions = Vec::new();
        if let Some(to) = &raw_tx.to {
            if !raw_tx.input.is_empty() && raw_tx.input != "0x" {
                // Decode method call (simplified - would use ABI)
                let method_sig = &raw_tx.input[..10]; // First 4 bytes (8 hex chars + 0x)

                contract_interactions.push(ContractInteraction {
                    address: to.clone(),
                    name: self.get_contract_name(to),
                    method: self.decode_method_signature(method_sig),
                    description: None,
                    r#type: None,
                    params: None,
                });
            }
        }

        // Determine direction
        let direction = self.determine_direction(&raw_tx, &transfers, user_addresses);

        // Calculate fee (EIP-1559)
        let gas_used = receipt.gas_used;
        let effective_gas_price = receipt.effective_gas_price;
        let fee_wei = gas_used * effective_gas_price;

        let fee = Fee {
            amount: Amount {
                asset: Asset::new_native(
                    self.chain.clone(),
                    "ETH".to_string(),
                    "Ethereum".to_string(),
                    18,
                ),
                raw: fee_wei.to_string(),
                formatted: self.wei_to_eth(&fee_wei.to_string()),
                fiat_value: None,
            },
            fee_rate: Some({
                let mut map = HashMap::new();
                map.insert("gasUsed".to_string(), serde_json::json!(gas_used));
                map.insert("effectiveGasPrice".to_string(), serde_json::json!(effective_gas_price.to_string()));
                if let Some(max_fee) = raw_tx.max_fee_per_gas {
                    map.insert("maxFeePerGas".to_string(), serde_json::json!(max_fee.to_string()));
                }
                if let Some(priority_fee) = raw_tx.max_priority_fee_per_gas {
                    map.insert("maxPriorityFeePerGas".to_string(), serde_json::json!(priority_fee.to_string()));
                }
                map
            }),
            payer: raw_tx.from.clone(),
        };

        // Build chain-specific data
        let chain_specific = ChainSpecificData::Ethereum(EthereumData {
            from: raw_tx.from,
            to: raw_tx.to,
            value: raw_tx.value.to_string(),
            gas_limit: raw_tx.gas_limit.to_string(),
            gas_used: receipt.gas_used.to_string(),
            gas_price: raw_tx.gas_price.map(|g| g.to_string()),
            max_fee_per_gas: raw_tx.max_fee_per_gas.map(|g| g.to_string()),
            max_priority_fee_per_gas: raw_tx.max_priority_fee_per_gas.map(|g| g.to_string()),
            base_fee_per_gas: receipt.base_fee_per_gas.map(|g| g.to_string()),
            effective_gas_price: receipt.effective_gas_price.to_string(),
            tx_type: raw_tx.tx_type,
            nonce: raw_tx.nonce,
            input: raw_tx.input,
            contract_address: receipt.contract_address,
            logs: receipt
                .logs
                .iter()
                .map(|log| EthereumLog {
                    log_index: log.log_index,
                    address: log.address.clone(),
                    topics: log.topics.clone(),
                    data: log.data.clone(),
                    decoded: None, // Would decode with ABI
                })
                .collect(),
            internal_transactions: None, // Would fetch from trace API
            decoded_input: None,
        });

        let now = chrono::Utc::now().timestamp();

        UnifiedTransaction {
            id: raw_tx.hash.clone(),
            chain: self.chain.clone(),
            hash: raw_tx.hash,
            block_number: raw_tx.block_number,
            block_hash: raw_tx.block_hash,
            transaction_index: raw_tx.transaction_index,
            timestamp: raw_tx.block_timestamp,
            confirmations: raw_tx.confirmations,
            status: if receipt.status == 1 {
                TransactionStatus::Confirmed
            } else {
                TransactionStatus::Failed
            },
            direction,
            fee,
            transfers,
            contract_interactions,
            tax_category: None,
            tax_category_confidence: None,
            tax_sub_category: None,
            notes: None,
            tags: None,
            cost_basis: None,
            chain_specific,
            created_at: now,
            updated_at: now,
        }
    }

    fn determine_direction(
        &self,
        tx: &EthereumRawTransaction,
        transfers: &[Transfer],
        user_addresses: &[String],
    ) -> TransactionDirection {
        let user_is_sender = user_addresses.iter().any(|addr| addr.eq_ignore_ascii_case(&tx.from));
        let user_is_receiver = tx
            .to
            .as_ref()
            .map(|to| user_addresses.iter().any(|addr| addr.eq_ignore_ascii_case(to)))
            .unwrap_or(false);

        // Check if any transfers involve user
        let user_received_tokens = transfers
            .iter()
            .any(|t| user_addresses.iter().any(|addr| addr.eq_ignore_ascii_case(&t.to)));

        if user_is_sender && user_is_receiver {
            TransactionDirection::SelfTransfer
        } else if user_is_sender && !user_received_tokens {
            TransactionDirection::Outgoing
        } else if user_received_tokens || user_is_receiver {
            TransactionDirection::Incoming
        } else if !tx.input.is_empty() && tx.input != "0x" {
            TransactionDirection::Contract
        } else {
            TransactionDirection::Contract
        }
    }

    fn wei_to_eth(&self, wei: &str) -> String {
        let wei_val = wei.parse::<u128>().unwrap_or(0);
        format!("{:.18}", wei_val as f64 / 1e18)
    }

    fn format_token_amount(&self, amount: u128, decimals: u8) -> String {
        format!("{:.width$}", amount as f64 / 10f64.powi(decimals as i32), width = decimals as usize)
    }

    fn get_token_info(&self, _address: &str) -> TokenInfo {
        // Mock - would fetch from cache or RPC
        TokenInfo {
            symbol: "USDC".to_string(),
            name: "USD Coin".to_string(),
            decimals: 6,
        }
    }

    fn get_contract_name(&self, _address: &str) -> Option<String> {
        // Mock - would fetch from registry
        Some("Uniswap V3 Router".to_string())
    }

    fn decode_method_signature(&self, _sig: &str) -> Option<String> {
        // Mock - would decode from ABI
        Some("swapExactTokensForTokens".to_string())
    }
}

// ============================================================================
// Solana Adapter
// ============================================================================

pub struct SolanaAdapter {
    // Solana RPC client
}

impl SolanaAdapter {
    /// Transform Solana transaction into unified format
    ///
    /// Solana uses account-based model with instructions:
    /// - Multiple instructions per transaction
    /// - Token transfers via SPL Token program
    /// - Native SOL transfers via System program
    /// - Token balances tracked via pre/post balance deltas
    pub fn transform_solana_transaction(
        &self,
        raw_tx: SolanaRawTransaction,
        user_addresses: &[String],
    ) -> UnifiedTransaction {
        let mut transfers = Vec::new();

        // 1. Native SOL transfers (from balance changes)
        for (idx, account) in raw_tx.account_keys.iter().enumerate() {
            let pre_balance = raw_tx.pre_balances.get(idx).copied().unwrap_or(0);
            let post_balance = raw_tx.post_balances.get(idx).copied().unwrap_or(0);

            if pre_balance != post_balance && pre_balance > 0 {
                // This account had a balance change
                let diff = post_balance as i64 - pre_balance as i64;
                if diff != 0 && diff.abs() > 5000 {
                    // Ignore tiny changes (likely rent)
                    // Note: In production, would correlate with System program instructions
                    transfers.push(Transfer {
                        id: format!("{}:sol:{}", raw_tx.signature, idx),
                        from: if diff < 0 {
                            account.clone()
                        } else {
                            "unknown".to_string()
                        },
                        to: if diff > 0 {
                            account.clone()
                        } else {
                            "unknown".to_string()
                        },
                        amount: Amount {
                            asset: Asset::new_native(
                                Chain::Solana,
                                "SOL".to_string(),
                                "Solana".to_string(),
                                9,
                            ),
                            raw: diff.abs().to_string(),
                            formatted: format!("{:.9}", diff.abs() as f64 / 1e9),
                            fiat_value: None,
                        },
                        transfer_type: "native".to_string(),
                        log_index: None,
                        chain_data: None,
                    });
                }
            }
        }

        // 2. SPL Token transfers (from token balance changes)
        if let (Some(pre_token_balances), Some(post_token_balances)) =
            (&raw_tx.pre_token_balances, &raw_tx.post_token_balances)
        {
            // Group by account to find changes
            let mut token_changes: HashMap<(usize, String), (i128, i128)> = HashMap::new();

            for balance in pre_token_balances {
                let key = (balance.account_index as usize, balance.mint.clone());
                token_changes
                    .entry(key)
                    .or_insert((0, 0))
                    .0 = balance.ui_token_amount.amount.parse().unwrap_or(0);
            }

            for balance in post_token_balances {
                let key = (balance.account_index as usize, balance.mint.clone());
                token_changes
                    .entry(key)
                    .or_insert((0, 0))
                    .1 = balance.ui_token_amount.amount.parse().unwrap_or(0);
            }

            // Create transfers for changed balances
            for ((account_idx, mint), (pre, post)) in token_changes {
                if pre != post {
                    let diff = post - pre;
                    let account = raw_tx
                        .account_keys
                        .get(account_idx)
                        .cloned()
                        .unwrap_or_default();

                    // Get token info
                    let token_info = self.get_spl_token_info(&mint);

                    transfers.push(Transfer {
                        id: format!("{}:spl:{}:{}", raw_tx.signature, mint, account_idx),
                        from: if diff < 0 {
                            account.clone()
                        } else {
                            "unknown".to_string()
                        },
                        to: if diff > 0 {
                            account.clone()
                        } else {
                            "unknown".to_string()
                        },
                        amount: Amount {
                            asset: Asset::new_token(
                                Chain::Solana,
                                token_info.symbol,
                                token_info.name,
                                token_info.decimals,
                                mint.clone(),
                            ),
                            raw: diff.abs().to_string(),
                            formatted: format!(
                                "{:.width$}",
                                diff.abs() as f64 / 10f64.powi(token_info.decimals as i32),
                                width = token_info.decimals as usize
                            ),
                            fiat_value: None,
                        },
                        transfer_type: "token".to_string(),
                        log_index: Some(account_idx as u32),
                        chain_data: None,
                    });
                }
            }
        }

        // Determine direction
        let direction = self.determine_direction(&raw_tx, &transfers, user_addresses);

        // Fee (always paid by fee_payer)
        let fee = Fee {
            amount: Amount {
                asset: Asset::new_native(
                    Chain::Solana,
                    "SOL".to_string(),
                    "Solana".to_string(),
                    9,
                ),
                raw: raw_tx.fee.to_string(),
                formatted: format!("{:.9}", raw_tx.fee as f64 / 1e9),
                fiat_value: None,
            },
            fee_rate: raw_tx.compute_units_consumed.map(|cu| {
                let mut map = HashMap::new();
                map.insert("computeUnits".to_string(), serde_json::json!(cu));
                map
            }),
            payer: raw_tx.fee_payer.clone(),
        };

        // Contract interactions (from instructions)
        let contract_interactions: Vec<ContractInteraction> = raw_tx
            .instructions
            .iter()
            .filter(|inst| {
                // Filter out system and token programs
                inst.program_id != "11111111111111111111111111111111" // System program
                    && inst.program_id != "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                // Token program
            })
            .map(|inst| ContractInteraction {
                address: inst.program_id.clone(),
                name: inst.program_name.clone(),
                method: inst.decoded.as_ref().map(|d| d.instruction_type.clone()),
                description: None,
                r#type: None,
                params: None,
            })
            .collect();

        // Build chain-specific data
        let chain_specific = ChainSpecificData::Solana(SolanaData {
            signatures: vec![raw_tx.signature.clone()],
            recent_blockhash: raw_tx.recent_blockhash.clone(),
            fee_payer: raw_tx.fee_payer.clone(),
            instructions: raw_tx
                .instructions
                .iter()
                .map(|inst| SolanaInstruction {
                    program_id: inst.program_id.clone(),
                    program_name: inst.program_name.clone(),
                    index: inst.index,
                    accounts: inst.accounts.clone(),
                    data: inst.data.clone(),
                    decoded: inst.decoded.as_ref().map(|d| DecodedInstruction {
                        instruction_type: d.instruction_type.clone(),
                        info: d.info.clone(),
                    }),
                })
                .collect(),
            inner_instructions: None,
            account_keys: raw_tx.account_keys.clone(),
            compute_units_consumed: raw_tx.compute_units_consumed,
            log_messages: raw_tx.log_messages.clone(),
            pre_balances: raw_tx.pre_balances.iter().map(|b| b.to_string()).collect(),
            post_balances: raw_tx.post_balances.iter().map(|b| b.to_string()).collect(),
            pre_token_balances: raw_tx.pre_token_balances.clone().map(|balances| {
                balances
                    .iter()
                    .map(|b| SolanaTokenBalance {
                        account_index: b.account_index,
                        mint: b.mint.clone(),
                        owner: b.owner.clone(),
                        ui_token_amount: TokenAmount {
                            amount: b.ui_token_amount.amount.clone(),
                            decimals: b.ui_token_amount.decimals,
                            ui_amount: b.ui_token_amount.ui_amount,
                        },
                    })
                    .collect()
            }),
            post_token_balances: raw_tx.post_token_balances.clone().map(|balances| {
                balances
                    .iter()
                    .map(|b| SolanaTokenBalance {
                        account_index: b.account_index,
                        mint: b.mint.clone(),
                        owner: b.owner.clone(),
                        ui_token_amount: TokenAmount {
                            amount: b.ui_token_amount.amount.clone(),
                            decimals: b.ui_token_amount.decimals,
                            ui_amount: b.ui_token_amount.ui_amount,
                        },
                    })
                    .collect()
            }),
        });

        let now = chrono::Utc::now().timestamp();

        UnifiedTransaction {
            id: raw_tx.signature.clone(),
            chain: Chain::Solana,
            hash: raw_tx.signature.clone(),
            block_number: raw_tx.slot.map(|s| s as u64),
            block_hash: None, // Solana doesn't have block hashes
            transaction_index: None,
            timestamp: raw_tx.block_time,
            confirmations: raw_tx.confirmations,
            status: if raw_tx.confirmations > 0 {
                TransactionStatus::Confirmed
            } else {
                TransactionStatus::Pending
            },
            direction,
            fee,
            transfers,
            contract_interactions,
            tax_category: None,
            tax_category_confidence: None,
            tax_sub_category: None,
            notes: None,
            tags: None,
            cost_basis: None,
            chain_specific,
            created_at: now,
            updated_at: now,
        }
    }

    fn determine_direction(
        &self,
        tx: &SolanaRawTransaction,
        transfers: &[Transfer],
        user_addresses: &[String],
    ) -> TransactionDirection {
        let user_sent = transfers
            .iter()
            .any(|t| user_addresses.iter().any(|addr| addr == &t.from));
        let user_received = transfers
            .iter()
            .any(|t| user_addresses.iter().any(|addr| addr == &t.to));

        if user_sent && user_received {
            TransactionDirection::SelfTransfer
        } else if user_sent {
            TransactionDirection::Outgoing
        } else if user_received {
            TransactionDirection::Incoming
        } else if user_addresses.contains(&tx.fee_payer) {
            TransactionDirection::Contract
        } else {
            TransactionDirection::Contract
        }
    }

    fn get_spl_token_info(&self, _mint: &str) -> TokenInfo {
        // Mock - would fetch from cache or RPC
        TokenInfo {
            symbol: "USDC".to_string(),
            name: "USD Coin".to_string(),
            decimals: 6,
        }
    }
}

// ============================================================================
// Raw Transaction Types (Chain-Specific)
// ============================================================================

// Bitcoin raw transaction format
pub struct BitcoinRawTransaction {
    pub txid: String,
    pub version: i32,
    pub locktime: u32,
    pub vin: Vec<RawBitcoinInput>,
    pub vout: Vec<RawBitcoinOutput>,
    pub block_height: Option<u64>,
    pub block_hash: Option<String>,
    pub block_time: Option<i64>,
    pub tx_index: Option<u32>,
    pub confirmations: u32,
    pub vsize: u64,
    pub weight: u64,
    pub is_segwit: bool,
    pub is_rbf: bool,
}

pub struct RawBitcoinInput {
    pub txid: String,
    pub vout: u32,
    pub script_sig: String,
    pub witness: Option<Vec<String>>,
    pub sequence: u32,
    pub address: Option<String>,
    pub value: Option<u64>,
}

pub struct RawBitcoinOutput {
    pub n: u32,
    pub value: u64,
    pub script_pub_key: String,
    pub address: Option<String>,
    pub output_type: String,
}

// Ethereum raw transaction format
pub struct EthereumRawTransaction {
    pub hash: String,
    pub from: String,
    pub to: Option<String>,
    pub value: u128,
    pub gas_limit: u64,
    pub gas_price: Option<u128>,
    pub max_fee_per_gas: Option<u128>,
    pub max_priority_fee_per_gas: Option<u128>,
    pub tx_type: u8,
    pub nonce: u64,
    pub input: String,
    pub block_number: Option<u64>,
    pub block_hash: Option<String>,
    pub block_timestamp: Option<i64>,
    pub transaction_index: Option<u32>,
    pub confirmations: u32,
}

pub struct EthereumReceipt {
    pub status: u8,
    pub gas_used: u64,
    pub effective_gas_price: u128,
    pub base_fee_per_gas: Option<u128>,
    pub logs: Vec<RawEthereumLog>,
    pub contract_address: Option<String>,
}

pub struct RawEthereumLog {
    pub log_index: u32,
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
}

// Solana raw transaction format
pub struct SolanaRawTransaction {
    pub signature: String,
    pub slot: Option<u64>,
    pub block_time: Option<i64>,
    pub confirmations: u32,
    pub fee: u64,
    pub fee_payer: String,
    pub recent_blockhash: String,
    pub instructions: Vec<RawSolanaInstruction>,
    pub account_keys: Vec<String>,
    pub pre_balances: Vec<u64>,
    pub post_balances: Vec<u64>,
    pub pre_token_balances: Option<Vec<RawSolanaTokenBalance>>,
    pub post_token_balances: Option<Vec<RawSolanaTokenBalance>>,
    pub compute_units_consumed: Option<u64>,
    pub log_messages: Option<Vec<String>>,
}

pub struct RawSolanaInstruction {
    pub program_id: String,
    pub program_name: Option<String>,
    pub index: u32,
    pub accounts: Vec<u32>,
    pub data: String,
    pub decoded: Option<RawDecodedInstruction>,
}

pub struct RawDecodedInstruction {
    pub instruction_type: String,
    pub info: HashMap<String, serde_json::Value>,
}

pub struct RawSolanaTokenBalance {
    pub account_index: u32,
    pub mint: String,
    pub owner: String,
    pub ui_token_amount: RawTokenAmount,
}

pub struct RawTokenAmount {
    pub amount: String,
    pub decimals: u8,
    pub ui_amount: f64,
}

struct TokenInfo {
    symbol: String,
    name: String,
    decimals: u8,
}
