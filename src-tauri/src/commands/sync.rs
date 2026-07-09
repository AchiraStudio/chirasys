#![allow(dead_code)]
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::env;
use tokio::time::{sleep, Duration};

const MAX_RETRY_COUNT: i64 = 10;
const POLL_INTERVAL_SECS: u64 = 20;
const BACKOFF_INTERVAL_SECS: u64 = 120; // 2 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Background sync worker
// ─────────────────────────────────────────────────────────────────────────────

pub fn spawn_sync_worker(pool: SqlitePool) {
    tokio::spawn(async move {
        // Let the app fully start before trying
        sleep(Duration::from_secs(8)).await;
        let _ = dotenvy::dotenv();

        let supabase_url = env::var("SUPABASE_URL").unwrap_or_default();
        let supabase_key = env::var("SUPABASE_KEY").unwrap_or_default();

        if supabase_url.is_empty() || supabase_key.is_empty() {
            println!("⚠️  Sync worker stopped: SUPABASE_URL or SUPABASE_KEY not set.");
            return;
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_else(|_| Client::new());

        println!("🚀 Cloud Sync Worker started → {}", supabase_url);

        let mut consecutive_failures: u32 = 0;

        loop {
            // Read workspace_id from settings on each tick (so we pick it up after login)
            let workspace_id: Option<String> = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

            if workspace_id.is_none() {
                // No workspace configured — check again in 30s
                sleep(Duration::from_secs(30)).await;
                continue;
            }
            let workspace_id = workspace_id.unwrap();

            match process_sync_queue(&pool, &client, &supabase_url, &supabase_key, &workspace_id).await {
                Ok(synced) => {
                    if synced > 0 {
                        consecutive_failures = 0;
                        println!("✅ Sync batch complete: {} items pushed.", synced);
                    }
                }
                Err(e) => {
                    consecutive_failures += 1;
                    eprintln!("❌ Sync worker error ({}x): {}", consecutive_failures, e);
                    // After 3 consecutive all-fail batches, back off for 2 minutes
                    if consecutive_failures >= 3 {
                        println!("⏸️  Sync backing off for {}s due to repeated failures.", BACKOFF_INTERVAL_SECS);
                        sleep(Duration::from_secs(BACKOFF_INTERVAL_SECS)).await;
                        consecutive_failures = 0;
                        continue;
                    }
                }
            }

            sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
        }
    });
}

async fn process_sync_queue(
    pool: &SqlitePool,
    client: &Client,
    supabase_url: &str,
    supabase_key: &str,
    workspace_id: &str,
) -> Result<usize, String> {
    // Only process items that haven't permanently failed
    let pending_items = sqlx::query(
        "SELECT id, table_name, record_id, operation, payload
         FROM sync_queue
         WHERE synced_at IS NULL AND retry_count < ?
         ORDER BY created_at ASC
         LIMIT 50"
    )
    .bind(MAX_RETRY_COUNT)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if pending_items.is_empty() {
        return Ok(0);
    }

    println!("🔄 Processing {} items in sync queue...", pending_items.len());
    let mut success_count = 0;
    let mut all_network_failed = true;

    for row in &pending_items {
        let queue_id: String = row.get("id");
        let table_name: String = row.get("table_name");
        let record_id: String = row.get("record_id");
        let operation: String = row.get("operation");
        let payload_str: String = row.get("payload");

        let endpoint = format!("{}/rest/v1/{}", supabase_url, table_name);

        // Inject workspace_id into the payload
        let mut json_payload: serde_json::Value = serde_json::from_str(&payload_str)
            .unwrap_or_else(|_| serde_json::json!({}));
        if let serde_json::Value::Object(ref mut map) = json_payload {
            map.insert("workspace_id".to_string(), serde_json::Value::String(workspace_id.to_string()));
        }

        let request = match operation.as_str() {
            "insert" => client
                .post(&endpoint)
                .header("Prefer", "resolution=merge-duplicates,return=minimal"),
            "update" => client
                .patch(&format!("{}?id=eq.{}", endpoint, record_id))
                .header("Prefer", "return=minimal"),
            "delete" => client.delete(&format!("{}?id=eq.{}", endpoint, record_id)),
            _ => continue,
        };

        let request = request
            .header("apikey", supabase_key)
            .header("Authorization", format!("Bearer {}", supabase_key))
            .header("Content-Type", "application/json");

        let request = if operation != "delete" {
            request.json(&json_payload)
        } else {
            request
        };

        match request.send().await {
            Ok(res) if res.status().is_success() => {
                let _ = sqlx::query(
                    "UPDATE sync_queue SET synced_at = datetime('now'), error = NULL WHERE id = ?"
                )
                .bind(&queue_id)
                .execute(pool)
                .await;
                success_count += 1;
                all_network_failed = false;
            }
            Ok(res) => {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                let err_msg = format!("HTTP {}: {}", status, err_text);
                let _ = sqlx::query(
                    "UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?"
                )
                .bind(&err_msg)
                .bind(&queue_id)
                .execute(pool)
                .await;
                eprintln!("❌ Sync HTTP error for {}/{}: {}", table_name, record_id, err_msg);
                all_network_failed = false; // HTTP error = server responded, not network fail
            }
            Err(e) => {
                let err_msg = e.to_string();
                let _ = sqlx::query(
                    "UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?"
                )
                .bind(&err_msg)
                .bind(&queue_id)
                .execute(pool)
                .await;
                // Only print first network error per batch to avoid log spam
                if success_count == 0 && all_network_failed {
                    eprintln!("📡 Sync network error (Supabase unreachable): {}", err_msg);
                }
            }
        }
    }

    if all_network_failed && !pending_items.is_empty() {
        return Err("Network unreachable — all requests failed.".to_string());
    }

    Ok(success_count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace join / management commands
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub id: String,
    pub name: String,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct SyncStatus {
    pub workspace_id: String,
    pub workspace_name: String,
    pub workspace_code: String,
    pub pending_count: i64,
    pub failed_count: i64,
    pub last_synced: Option<String>,
}

/// Validate a workspace code or invite token against Supabase and save to local settings.
#[tauri::command]
pub async fn join_workspace(
    code_or_token: String,
    password: Option<String>,
    state: tauri::State<'_, crate::AppState>,
) -> Result<WorkspaceInfo, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let trimmed = code_or_token.trim().to_uppercase();

    // First try: treat as invite token (hex string, 32 chars, or 36-char UUID)
    let is_uuid = trimmed.len() == 36 && trimmed.chars().all(|c| c.is_ascii_hexdigit() || c == '-');
    let is_hex32 = trimmed.len() == 32 && trimmed.chars().all(|c| c.is_ascii_hexdigit());
    if is_uuid || is_hex32 {
        let token_lower = code_or_token.trim().to_lowercase();
        let invite_url = format!(
            "{}/rest/v1/workspace_invites?token=eq.{}&select=id,workspace_id,role,used_at,expires_at",
            supabase_url, token_lower
        );
        let resp = client
            .get(&invite_url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if resp.status().is_success() {
            let invites: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
            if let Some(invite) = invites.first() {
                if invite.get("used_at").and_then(|v| v.as_str()).is_some() {
                    return Err("This invite link has already been used.".to_string());
                }
                let workspace_id = invite["workspace_id"].as_str().unwrap_or_default().to_string();
                
                // Fetch workspace to verify password if set
                let ws_url = format!("{}/rest/v1/workspaces?id=eq.{}&select=id,name,code,password_hash", supabase_url, workspace_id);
                let ws_resp = client
                    .get(&ws_url)
                    .header("apikey", &supabase_key)
                    .header("Authorization", format!("Bearer {}", &supabase_key))
                    .send()
                    .await
                    .map_err(|e| format!("Network error: {}", e))?;
                
                let workspaces: Vec<serde_json::Value> = ws_resp.json().await.unwrap_or_default();
                if let Some(ws) = workspaces.first() {
                    if let Some(hash) = ws.get("password_hash").and_then(|v| v.as_str()) {
                        if !hash.is_empty() {
                            let pw = password.as_deref().unwrap_or("");
                            if pw.is_empty() {
                                return Err("Workspace ini memerlukan password untuk bergabung.".to_string());
                            }
                            let matches = bcrypt::verify(pw, hash).map_err(|e| e.to_string())?;
                            if !matches {
                                return Err("Password workspace salah.".to_string());
                            }
                        }
                    }
                }

                // Fetch workspace details and save
                return fetch_and_save_workspace(&client, &supabase_url, &supabase_key, &workspace_id, &state.db_pool).await;
            }
        }
    }

    // Second try: treat as workspace code
    let code_url = format!(
        "{}/rest/v1/workspaces?code=eq.{}&select=id,name,code,password_hash",
        supabase_url, trimmed
    );
    let resp = client
        .get(&code_url)
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Supabase error: {}", resp.status()));
    }

    let workspaces: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    if workspaces.is_empty() {
        return Err("Workspace code or invite not found. Please check and try again.".to_string());
    }

    let ws = &workspaces[0];
    if let Some(hash) = ws.get("password_hash").and_then(|v| v.as_str()) {
        if !hash.is_empty() {
            let pw = password.as_deref().unwrap_or("");
            if pw.is_empty() {
                return Err("Workspace ini memerlukan password untuk bergabung.".to_string());
            }
            let matches = bcrypt::verify(pw, hash).map_err(|e| e.to_string())?;
            if !matches {
                return Err("Password workspace salah.".to_string());
            }
        }
    }

    let workspace_id = ws["id"].as_str().unwrap_or_default().to_string();
    fetch_and_save_workspace(&client, &supabase_url, &supabase_key, &workspace_id, &state.db_pool).await
}

async fn fetch_and_save_workspace(
    client: &Client,
    supabase_url: &str,
    supabase_key: &str,
    workspace_id: &str,
    pool: &SqlitePool,
) -> Result<WorkspaceInfo, String> {
    let ws_url = format!("{}/rest/v1/workspaces?id=eq.{}&select=id,name,code", supabase_url, workspace_id);
    let resp = client
        .get(&ws_url)
        .header("apikey", supabase_key)
        .header("Authorization", format!("Bearer {}", supabase_key))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let workspaces: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    let ws = workspaces.first().ok_or("Workspace not found.".to_string())?;
    let name = ws["name"].as_str().unwrap_or("Unknown").to_string();
    let code = ws["code"].as_str().unwrap_or("").to_string();

    // Save to local settings
    for (k, v) in [("workspace_id", workspace_id), ("workspace_name", &name), ("workspace_code", &code)] {
        sqlx::query("INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(k).bind(v)
            .execute(pool).await.map_err(|e| e.to_string())?;
    }

    println!("✅ Joined workspace: {} ({})", name, code);
    Ok(WorkspaceInfo { id: workspace_id.to_string(), name, code })
}

/// Create a new workspace (used by the Main Admin on first launch)
#[tauri::command]
pub async fn create_workspace(
    name: String,
    code: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<WorkspaceInfo, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let payload = serde_json::json!({"name": name, "code": code.to_uppercase()});
    let resp = client
        .post(format!("{}/rest/v1/workspaces", supabase_url))
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        // If conflict (code already taken), surface a nice message
        if err.contains("unique") || err.contains("duplicate") {
            return Err("This workspace code is already taken. Choose a different one.".to_string());
        }
        return Err(format!("Failed to create workspace: {}", err));
    }

    let workspaces: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    let ws = workspaces.first().ok_or("No response from server.".to_string())?;
    let workspace_id = ws["id"].as_str().unwrap_or_default().to_string();
    let name_out = ws["name"].as_str().unwrap_or(&name).to_string();
    let code_out = ws["code"].as_str().unwrap_or(&code).to_string();

    // Save to local settings
    for (k, v) in [
        ("workspace_id", workspace_id.as_str()),
        ("workspace_name", name_out.as_str()),
        ("workspace_code", code_out.as_str()),
    ] {
        sqlx::query("INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(k).bind(v)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
    }

    println!("🎉 Created workspace: {} ({})", name_out, code_out);
    Ok(WorkspaceInfo { id: workspace_id, name: name_out, code: code_out })
}

/// Create an invite link (token) for this workspace
#[tauri::command]
pub async fn create_workspace_invite(
    role: String,
    email: Option<String>,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let workspace_id: String = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Not connected to a workspace. Join or create a workspace first.".to_string())?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "workspace_id": workspace_id,
        "role": role,
        "email": email,
    });

    let resp = client
        .post(format!("{}/rest/v1/workspace_invites", supabase_url))
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Failed to create invite: {}", resp.text().await.unwrap_or_default()));
    }

    let invites: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    let token = invites.first()
        .and_then(|i| i["token"].as_str())
        .ok_or("No token returned".to_string())?
        .to_string();

    Ok(token)
}

/// Get the current sync status for the settings/status UI
#[tauri::command]
pub async fn get_sync_status(state: tauri::State<'_, crate::AppState>) -> Result<SyncStatus, String> {
    let workspace_id: String = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_id'"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or_default();

    let workspace_name: String = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_name'"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or_default();

    let workspace_code: String = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_code'"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or_default();

    let pending_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_queue WHERE synced_at IS NULL AND retry_count < ?"
    )
    .bind(MAX_RETRY_COUNT)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let failed_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_queue WHERE synced_at IS NULL AND retry_count >= ?"
    )
    .bind(MAX_RETRY_COUNT)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let last_synced: Option<String> = sqlx::query_scalar(
        "SELECT MAX(synced_at) FROM sync_queue WHERE synced_at IS NOT NULL"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .flatten();

    Ok(SyncStatus { workspace_id, workspace_name, workspace_code, pending_count, failed_count, last_synced })
}

/// Leave the current workspace (clears local workspace config)
#[tauri::command]
pub async fn leave_workspace(state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    for key in ["workspace_id", "workspace_name", "workspace_code"] {
        sqlx::query("INSERT INTO global_settings (key, value) VALUES (?, '') ON CONFLICT(key) DO UPDATE SET value = ''")
            .bind(key)
            .execute(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// receive_cloud_sync (incoming from Supabase Realtime — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
#[tauri::command]
pub async fn receive_cloud_sync(table_name: String, payload: serde_json::Value, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    match table_name.as_str() {
        "sales" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str()).unwrap_or_default();
            let customer_id = payload.get("customer_id").and_then(|v| v.as_str());
            let tx_no = payload.get("transaction_no").and_then(|v| v.as_str()).unwrap_or_default();
            let total = payload.get("total_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let disc = payload.get("discount_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let tax = payload.get("tax_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let grand_total = payload.get("grand_total").and_then(|v| v.as_f64()).unwrap_or_default();
            let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or_default();
            let price_type = payload.get("price_type").and_then(|v| v.as_str()).unwrap_or("retail");
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            let _ = sqlx::query(
                "INSERT INTO sales (id, branch_id, customer_id, transaction_no, user_id, total_amount, discount_amount, tax_amount, grand_total, status, price_type, notes, created_at)
                 VALUES (?, ?, ?, ?, 'system_sync', ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET status=excluded.status, notes=excluded.notes"
            )
            .bind(id).bind(branch_id).bind(customer_id).bind(tx_no)
            .bind(total).bind(disc).bind(tax).bind(grand_total)
            .bind(status).bind(price_type).bind(notes).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "stock_ledger" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let item_id = payload.get("item_id").and_then(|v| v.as_str()).unwrap_or_default();
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str()).unwrap_or_default();
            let source = payload.get("source_type").and_then(|v| v.as_str()).unwrap_or_default();
            let source_id = payload.get("source_id").and_then(|v| v.as_str());
            let qty = payload.get("qty_change").and_then(|v| v.as_f64()).unwrap_or_default();
            let hpp = payload.get("hpp_value").and_then(|v| v.as_f64());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO stock_ledger (id, item_id, branch_id, source_type, source_id, qty_change, hpp_value, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO NOTHING"
            )
            .bind(id).bind(item_id).bind(branch_id).bind(source)
            .bind(source_id).bind(qty).bind(hpp).bind(notes)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "categories" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let parent_id = payload.get("parent_id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or_default();
            let desc = payload.get("description").and_then(|v| v.as_str());
            let color = payload.get("color").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            let _ = sqlx::query(
                "INSERT INTO categories (id, parent_id, name, description, color, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, name=excluded.name, description=excluded.description, color=excluded.color"
            )
            .bind(id).bind(parent_id).bind(name).bind(desc).bind(color).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "brands" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or_default();
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            let _ = sqlx::query(
                "INSERT INTO brands (id, name, created_at, created_by)
                 VALUES (?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name"
            )
            .bind(id).bind(name).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "items" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let sku = payload.get("sku").and_then(|v| v.as_str()).unwrap_or_default();
            let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or_default();
            let generic_name = payload.get("generic_name").and_then(|v| v.as_str());
            let barcode = payload.get("barcode").and_then(|v| v.as_str());
            let category_id = payload.get("category_id").and_then(|v| v.as_str());
            let brand_id = payload.get("brand_id").and_then(|v| v.as_str());
            let hpp_method = payload.get("hpp_method").and_then(|v| v.as_str()).unwrap_or("avg");
            let min_stock = payload.get("min_stock").and_then(|v| v.as_f64()).unwrap_or_default();
            let has_expiry = payload.get("has_expiry").and_then(|v| v.as_i64()).unwrap_or_default();
            let req_rx = payload.get("requires_prescription").and_then(|v| v.as_i64()).unwrap_or_default();
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let is_active = payload.get("is_active").and_then(|v| v.as_i64()).unwrap_or(1);
            let wholesale_price = payload.get("wholesale_price").and_then(|v| v.as_f64()).unwrap_or_default();
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            let _ = sqlx::query(
                "INSERT INTO items (id, sku, barcode, name, generic_name, category_id, brand_id, hpp_method, min_stock, has_expiry, requires_prescription, notes, is_active, wholesale_price, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET sku=excluded.sku, barcode=excluded.barcode, name=excluded.name, generic_name=excluded.generic_name, category_id=excluded.category_id, brand_id=excluded.brand_id, hpp_method=excluded.hpp_method, min_stock=excluded.min_stock, has_expiry=excluded.has_expiry, requires_prescription=excluded.requires_prescription, notes=excluded.notes, is_active=excluded.is_active, wholesale_price=excluded.wholesale_price"
            )
            .bind(id).bind(sku).bind(barcode).bind(name).bind(generic_name)
            .bind(category_id).bind(brand_id).bind(hpp_method).bind(min_stock)
            .bind(has_expiry).bind(req_rx).bind(notes).bind(is_active).bind(wholesale_price).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "item_units" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let item_id = payload.get("item_id").and_then(|v| v.as_str()).unwrap_or_default();
            let unit_name = payload.get("unit_name").and_then(|v| v.as_str()).unwrap_or_default();
            let conversion = payload.get("conversion").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let is_base = payload.get("is_base").and_then(|v| v.as_i64()).unwrap_or_default();
            let barcode = payload.get("barcode").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            let _ = sqlx::query(
                "INSERT INTO item_units (id, item_id, unit_name, conversion, is_base, barcode, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET unit_name=excluded.unit_name, conversion=excluded.conversion, is_base=excluded.is_base, barcode=excluded.barcode"
            )
            .bind(id).bind(item_id).bind(unit_name).bind(conversion)
            .bind(is_base).bind(barcode).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "item_prices" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let item_id = payload.get("item_id").and_then(|v| v.as_str()).unwrap_or_default();
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str()).unwrap_or_default();
            let customer_tier = payload.get("customer_tier").and_then(|v| v.as_str()).unwrap_or("regular");
            let price = payload.get("price").and_then(|v| v.as_f64()).unwrap_or_default();
            let _ = sqlx::query(
                "INSERT INTO item_prices (id, item_id, unit_id, customer_tier, price, created_by)
                 VALUES (?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET price=excluded.price"
            )
            .bind(id).bind(item_id).bind(unit_id).bind(customer_tier).bind(price)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        _ => {}
    }
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// System Admin commands
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn sysadmin_login(username: String, password_hash: String) -> Result<bool, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder().build().map_err(|e| e.to_string())?;

    let url = format!("{}/rest/v1/system_admins?username=eq.{}&password_hash=eq.{}&select=username", supabase_url, username, password_hash);
    let resp = client
        .get(&url)
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Supabase error: {}", resp.status()));
    }

    let users: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    Ok(!users.is_empty())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceListInfo {
    pub id: String,
    pub name: String,
    pub code: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn sysadmin_get_workspaces() -> Result<Vec<WorkspaceListInfo>, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder().build().map_err(|e| e.to_string())?;

    let url = format!("{}/rest/v1/workspaces?select=id,name,code,created_at&order=created_at.desc", supabase_url);
    let resp = client
        .get(&url)
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Supabase error: {}", resp.status()));
    }

    let workspaces: Vec<WorkspaceListInfo> = resp.json().await.unwrap_or_default();
    Ok(workspaces)
}

#[tauri::command]
pub async fn sysadmin_create_workspace(name: String, code: String) -> Result<WorkspaceInfo, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder().build().map_err(|e| e.to_string())?;

    let payload = serde_json::json!({"name": name, "code": code.to_uppercase()});
    let resp = client
        .post(format!("{}/rest/v1/workspaces", supabase_url))
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        if err.contains("unique") || err.contains("duplicate") {
            return Err("Workspace code already taken.".to_string());
        }
        return Err(format!("Failed to create workspace: {}", err));
    }

    let workspaces: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    let ws = workspaces.first().ok_or("No response from server.".to_string())?;
    let id = ws["id"].as_str().unwrap_or_default().to_string();
    let name_out = ws["name"].as_str().unwrap_or(&name).to_string();
    let code_out = ws["code"].as_str().unwrap_or(&code).to_string();

    Ok(WorkspaceInfo { id, name: name_out, code: code_out })
}

#[tauri::command]
pub async fn sysadmin_create_workspace_invite(workspace_id: String, role: String) -> Result<String, String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder().build().map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "workspace_id": workspace_id,
        "role": role,
    });

    let resp = client
        .post(format!("{}/rest/v1/workspace_invites", supabase_url))
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Failed to create invite: {}", resp.text().await.unwrap_or_default()));
    }

    let invites: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    let token = invites.first()
        .and_then(|i| i["token"].as_str())
        .ok_or("No token returned".to_string())?
        .to_string();

    Ok(token)
}

#[tauri::command]
pub async fn sysadmin_update_workspace_password(
    workspace_id: String,
    password: Option<String>,
) -> Result<(), String> {
    let _ = dotenvy::dotenv();
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| "SUPABASE_URL not configured".to_string())?;
    let supabase_key = env::var("SUPABASE_KEY").map_err(|_| "SUPABASE_KEY not configured".to_string())?;

    let client = Client::builder().build().map_err(|e| e.to_string())?;

    // Hash password if provided
    let password_hash = if let Some(ref pw) = password {
        if pw.trim().is_empty() {
            serde_json::Value::Null
        } else {
            let hashed = bcrypt::hash(pw, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
            serde_json::Value::String(hashed)
        }
    } else {
        serde_json::Value::Null
    };

    let payload = serde_json::json!({
        "password_hash": password_hash
    });

    let resp = client
        .patch(format!("{}/rest/v1/workspaces?id=eq.{}", supabase_url, workspace_id))
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", &supabase_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(format!("Failed to update workspace password: {}", err));
    }

    Ok(())
}

