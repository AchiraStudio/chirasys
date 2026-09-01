use crate::AppState;
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: Option<String>,
    pub messages: serde_json::Value,
    pub tools: Option<serde_json::Value>,
    pub tool_choice: Option<serde_json::Value>,
    pub api_key: Option<String>,
}

#[tauri::command]
pub async fn send_ai_chat_request(
    request: ChatCompletionRequest,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db_key: Option<String> = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'openai_api_key' AND value != ''"
    )
    .fetch_optional(&state.db_pool)
    .await
    .unwrap_or(None);

    let db_model: Option<String> = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'openai_model' AND value != ''"
    )
    .fetch_optional(&state.db_pool)
    .await
    .unwrap_or(None);

    let api_key = request.api_key
        .filter(|k| !k.trim().is_empty())
        .or(db_key)
        .or_else(|| std::env::var("VITE_OPENAI_API_KEY").ok())
        .or_else(|| std::env::var("OPENAI_API_KEY").ok())
        .or_else(|| option_env!("VITE_OPENAI_API_KEY").map(|s| s.to_string()))
        .or_else(|| option_env!("OPENAI_API_KEY").map(|s| s.to_string()))
        .filter(|k| !k.trim().is_empty())
        .ok_or_else(|| "OpenAI API Key belum dikonfigurasi. Silakan masukkan API Key OpenAI Anda di menu pengaturan atau popup chat.".to_string())?;

    let model = request.model
        .filter(|m| !m.trim().is_empty())
        .or(db_model)
        .unwrap_or_else(|| "gpt-4o-mini".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Gagal menginisialisasi HTTP client: {}", e))?;

    let mut body = serde_json::json!({
        "model": model,
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
        .map_err(|e| format!("Koneksi ke server OpenAI gagal: {}", e))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| format!("Gagal membaca respons dari OpenAI: {}", e))?;

    if !status.is_success() {
        if status.as_u16() == 401 {
            return Err("API Key OpenAI tidak valid atau telah dinonaktifkan (401 Unauthorized). Silakan periksa kembali API Key OpenAI Anda.".to_string());
        }
        if status.as_u16() == 429 {
            return Err("Kuota akun OpenAI Anda telah habis atau terkena batas permintaan (429 Rate Limit/Quota). Pastikan akun Anda memiliki saldo/kredit aktif di platform OpenAI.".to_string());
        }
        return Err(format!("OpenAI API Error ({}): {}", status, text));
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Gagal memproses respons JSON dari OpenAI: {}. Response: {}", e, text))?;

    Ok(json)
}
