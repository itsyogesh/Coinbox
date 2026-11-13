use super::{blocking, forbidden, internal, token, ApiResult, Server};
use crate::grants::Scope;
use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use std::sync::Arc;

const VERSION: &str = "2025-11-25";

pub async fn request(
    State(server): State<Arc<Server>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> ApiResult {
    // Local assistant clients use a separate bearer grant and no browser origin.
    if headers.contains_key(header::ORIGIN) {
        return Err(forbidden());
    }
    if headers
        .get("mcp-protocol-version")
        .is_some_and(|value| value != VERSION && value != "2025-03-26")
    {
        return Ok(StatusCode::BAD_REQUEST.into_response());
    }
    blocking(move || {
        let grants = server.grants.lock().map_err(|_| internal())?;
        let grant = grants.find(token(&headers)?).filter(|grant| grant.scope == Scope::Assistant).ok_or_else(forbidden)?;
        let id = &body["id"];
        let method = body["method"].as_str().unwrap_or_default();
        if body["jsonrpc"] != "2.0" || method.is_empty() {
            return Ok(rpc_error(id, -32600, "Invalid request"));
        }
        if body.get("id").is_none() {
            return Ok(StatusCode::ACCEPTED.into_response());
        }
        let params = &body["params"];
        let result = match method {
            "initialize" => json!({
                "protocolVersion": VERSION, "capabilities": { "tools": {} },
                "serverInfo": { "name": "coinbox", "version": env!("CARGO_PKG_VERSION") }
            }),
            "ping" => json!({}),
            "tools/list" => json!({ "tools": [
                tool("ledger_summary", "Posted net spending, income, and a few evidence references for the granted book."),
                tool("statement_coverage", "Statement ranges and review counts for the granted book."),
                tool("recurring_bills", "Monthly recurring charges for the granted book.")
            ] }),
            "tools/call" => {
                let vault = server.vault.lock().map_err(|_| internal())?;
                let data = match params["name"].as_str() {
                    Some("ledger_summary") => {
                        let report = vault.report(&grant.book)?;
                        let sources = report.entries.iter().filter(|entry| entry.kind != "transfer")
                            .flat_map(|entry| &entry.sources).take(12)
                            .map(|row| json!({ "rowId": row.row_id, "line": row.line })).collect::<Vec<_>>();
                        json!({ "book": grant.book, "spendingPaise": report.spending,
                            "incomePaise": report.income, "entryCount": report.entries.len(), "sources": sources })
                    }
                    Some("statement_coverage") => {
                        let review = vault.review(&grant.book)?;
                        let sources = review.sources.iter().map(|source| json!({
                            "sourceId": source.id, "firstDate": source.first_date,
                            "lastDate": source.last_date, "pendingRows": source.pending,
                            "invalidRows": source.invalid, "balanceMismatches": source.mismatches
                        })).collect::<Vec<_>>();
                        json!({ "book": grant.book, "statements": sources })
                    }
                    Some("recurring_bills") => json!({ "book": grant.book, "bills": vault.bills(&grant.book)? }),
                    _ => return Ok(rpc_error(id, -32602, "Unknown tool")),
                };
                json!({ "content": [{ "type": "text", "text": data.to_string() }], "structuredContent": data })
            }
            _ => return Ok(rpc_error(id, -32601, "Method not found")),
        };
        Ok(Json(json!({ "jsonrpc": "2.0", "id": id, "result": result })).into_response())
    }).await
}

fn tool(name: &str, description: &str) -> Value {
    json!({ "name": name, "description": description, "inputSchema": {
        "type": "object", "properties": {}, "additionalProperties": false
    }, "annotations": { "readOnlyHint": true } })
}

fn rpc_error(id: &Value, code: i32, message: &str) -> axum::response::Response {
    Json(json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } }))
        .into_response()
}
