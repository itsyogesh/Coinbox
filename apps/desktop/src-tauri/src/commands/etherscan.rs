//! Etherscan API proxy commands
//!
//! Routes Etherscan API calls through the Rust backend to bypass CORS restrictions.

use serde::{Deserialize, Serialize};
use tauri::command;

/// Etherscan V2 unified API endpoint
const ETHERSCAN_V2_API: &str = "https://api.etherscan.io/v2/api";

#[derive(Debug, Serialize, Deserialize)]
pub struct EtherscanTx {
    pub hash: String,
    #[serde(rename = "blockNumber")]
    pub block_number: String,
    #[serde(rename = "timeStamp")]
    pub timestamp: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub gas: String,
    #[serde(rename = "gasUsed")]
    pub gas_used: String,
    #[serde(rename = "gasPrice")]
    pub gas_price: String,
    #[serde(rename = "isError")]
    pub is_error: String,
    pub txreceipt_status: Option<String>,
    #[serde(rename = "methodId")]
    pub method_id: Option<String>,
    #[serde(rename = "functionName")]
    pub function_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EtherscanTokenTx {
    pub hash: String,
    #[serde(rename = "blockNumber")]
    pub block_number: String,
    #[serde(rename = "timeStamp")]
    pub timestamp: String,
    pub from: String,
    pub to: String,
    pub value: String,
    #[serde(rename = "tokenSymbol")]
    pub token_symbol: String,
    #[serde(rename = "tokenName")]
    pub token_name: String,
    #[serde(rename = "tokenDecimal")]
    pub token_decimal: String,
    #[serde(rename = "contractAddress")]
    pub contract_address: String,
}

#[derive(Debug, Deserialize)]
struct EtherscanApiResponse {
    status: String,
    message: String,
    result: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct FetchTransactionsResult {
    pub transactions: Vec<EtherscanTx>,
    pub token_transfers: Vec<EtherscanTokenTx>,
    pub error: Option<String>,
}

/// Fetch transactions from Etherscan V2 API
#[command]
pub async fn fetch_etherscan_transactions(
    address: String,
    chain_id: u64,
    api_key: Option<String>,
) -> Result<FetchTransactionsResult, String> {
    let client = reqwest::Client::new();

    // Build query params for normal transactions
    let mut tx_params = vec![
        ("chainid", chain_id.to_string()),
        ("module", "account".to_string()),
        ("action", "txlist".to_string()),
        ("address", address.clone()),
        ("startblock", "0".to_string()),
        ("endblock", "99999999".to_string()),
        ("page", "1".to_string()),
        ("offset", "100".to_string()),
        ("sort", "desc".to_string()),
    ];

    if let Some(ref key) = api_key {
        tx_params.push(("apikey", key.clone()));
    }

    // Build query params for token transfers
    let mut token_params = vec![
        ("chainid", chain_id.to_string()),
        ("module", "account".to_string()),
        ("action", "tokentx".to_string()),
        ("address", address.clone()),
        ("startblock", "0".to_string()),
        ("endblock", "99999999".to_string()),
        ("page", "1".to_string()),
        ("offset", "100".to_string()),
        ("sort", "desc".to_string()),
    ];

    if let Some(ref key) = api_key {
        token_params.push(("apikey", key.clone()));
    }

    let mut result = FetchTransactionsResult {
        transactions: Vec::new(),
        token_transfers: Vec::new(),
        error: None,
    };

    // Fetch normal transactions
    let tx_response: Result<reqwest::Response, reqwest::Error> =
        client.get(ETHERSCAN_V2_API).query(&tx_params).send().await;

    match tx_response {
        Ok(response) => {
            match response.json::<EtherscanApiResponse>().await {
                Ok(data) => {
                    if data.status == "1" {
                        if let Ok(txs) = serde_json::from_value::<Vec<EtherscanTx>>(data.result) {
                            result.transactions = txs;
                        }
                    } else {
                        let msg: String = data.result.as_str()
                            .map(|s: &str| s.to_string())
                            .unwrap_or(data.message);
                        tracing::warn!("Etherscan API warning: {}", msg);
                        if !msg.contains("No transactions found") {
                            result.error = Some(msg);
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to parse Etherscan response: {}", e);
                    result.error = Some(format!("Parse error: {}", e));
                }
            }
        }
        Err(e) => {
            tracing::error!("Etherscan request failed: {}", e);
            result.error = Some(format!("Request failed: {}", e));
        }
    }

    // Fetch token transfers
    let token_response: Result<reqwest::Response, reqwest::Error> =
        client.get(ETHERSCAN_V2_API).query(&token_params).send().await;

    match token_response {
        Ok(response) => {
            match response.json::<EtherscanApiResponse>().await {
                Ok(data) => {
                    if data.status == "1" {
                        if let Ok(txs) = serde_json::from_value::<Vec<EtherscanTokenTx>>(data.result) {
                            result.token_transfers = txs;
                        }
                    } else {
                        // Token errors are less critical, just log
                        let msg: String = data.result.as_str()
                            .map(|s: &str| s.to_string())
                            .unwrap_or(data.message);
                        if !msg.contains("No transactions found") {
                            tracing::warn!("Etherscan token API warning: {}", msg);
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to parse Etherscan token response: {}", e);
                }
            }
        }
        Err(e) => {
            tracing::warn!("Etherscan token request failed: {}", e);
        }
    }

    Ok(result)
}
