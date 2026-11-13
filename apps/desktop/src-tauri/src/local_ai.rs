use serde::Deserialize;
use serde_json::json;
use std::time::Duration;

#[tauri::command]
pub fn finance_local_model() -> Option<String> {
    std::env::var("COINBOX_OLLAMA_MODEL").ok().filter(|model| {
        !model.is_empty()
            && model.len() <= 120
            && model
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b":._-/".contains(&byte))
    })
}

#[derive(Deserialize)]
struct ModelResponse {
    response: String,
}

#[derive(Deserialize)]
struct Intent {
    kind: String,
}

#[tauri::command]
pub async fn finance_local_question_kind(question: String) -> Result<String, String> {
    let model = finance_local_model().ok_or("Configure a local Ollama model first.")?;
    if question.trim().is_empty() || question.chars().count() > 500 {
        return Err("Enter a question up to 500 characters.".into());
    }
    let response = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(15))
        .build().map_err(|_| "Could not start the local model request.")?
        .post("http://127.0.0.1:11434/api/generate")
        .json(&json!({
            "model": model, "stream": false,
            "system": "Classify the question. Choose one of spending, income, bills, review, or unknown. Do not answer the question. Requests to change data, or questions about categories, merchants, and other unsupported filters, are unknown.",
            "prompt": question,
            "format": { "type": "object", "required": ["kind"], "properties": {
                "kind": { "type": "string", "enum": ["spending", "income", "bills", "review", "unknown"] }
            }},
            "options": { "temperature": 0, "num_predict": 40 }
        }))
        .send().await.map_err(|_| "Could not reach Ollama on this device.")?
        .error_for_status().map_err(|_| "Ollama could not run the configured model.")?;
    let model: ModelResponse = response
        .json()
        .await
        .map_err(|_| "Ollama returned an invalid response.")?;
    let intent: Intent = serde_json::from_str(&model.response)
        .map_err(|_| "Ollama returned an invalid classification.")?;
    Ok(match intent.kind.as_str() {
        "spending" | "income" | "bills" | "review" => intent.kind,
        _ => "unknown".into(),
    })
}
