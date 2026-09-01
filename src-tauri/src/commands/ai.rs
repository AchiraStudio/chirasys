use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: serde_json::Value,
    pub tools: Option<serde_json::Value>,
    pub tool_choice: Option<serde_json::Value>,
    pub api_key: Option<String>,
}

#[tauri::command]
pub async fn send_ai_chat_request(request: ChatCompletionRequest) -> Result<serde_json::Value, String> {
    let api_key = request.api_key
        .or_else(|| std::env::var("VITE_OPENAI_API_KEY").ok())
        .or_else(|| std::env::var("OPENAI_API_KEY").ok())
        .ok_or_else(|| "OpenAI API Key tidak ditemukan. Pastikan VITE_OPENAI_API_KEY terkonfigurasi.".to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut body = serde_json::json!({
        "model": request.model,
        "messages": request.messages,
    });

    if let Some(tools) = request.tools {
        body["tools"] = tools;
    }
    if let Some(tool_choice) = request.tool_choice {
        body["tool_choice"] = tool_choice;
    }

    let res = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network request to OpenAI failed: {}", e))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        return Err(format!("OpenAI API Error ({}): {}", status, text));
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse OpenAI JSON response: {}. Response was: {}", e, text))?;

    Ok(json)
}
