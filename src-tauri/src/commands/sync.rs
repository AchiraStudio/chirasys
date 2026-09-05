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

pub fn get_supabase_credentials() -> (String, String) {
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename(".env");
    let _ = dotenvy::from_filename("../.env");

    let supabase_url = env::var("SUPABASE_URL")
        .or_else(|_| env::var("VITE_SUPABASE_URL"))
        .unwrap_or_default();

    let supabase_key = env::var("SUPABASE_KEY")
        .or_else(|_| env::var("SUPABASE_ANON_KEY"))
        .or_else(|_| env::var("SUPABASE_SERVICE_ROLE_KEY"))
        .or_else(|_| env::var("VITE_SUPABASE_ANON_KEY"))
        .unwrap_or_default();

    (supabase_url, supabase_key)
}

// ─────────────────────────────────────────────────────────────────────────────
// Background sync worker
// ─────────────────────────────────────────────────────────────────────────────

pub fn spawn_sync_worker(pool: SqlitePool) {
    tauri::async_runtime::spawn(async move {
        // Let the app fully start before trying
        sleep(Duration::from_secs(8)).await;

        let (supabase_url, supabase_key) = get_supabase_credentials();

        if supabase_url.is_empty() || supabase_key.is_empty() {
            println!("⚠️  Sync worker stopped: SUPABASE_URL or SUPABASE_KEY not set.");
            return;
        }

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_else(|_| Client::new());

        let mut consecutive_failures: u32 = 0;
        let mut started_logged = false;

        loop {
            // Guard: Do not run sync if setup is not yet completed
            let has_setup: String = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'has_completed_setup'"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None)
            .unwrap_or_else(|| "false".to_string());

            if has_setup != "true" {
                sleep(Duration::from_secs(15)).await;
                continue;
            }

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

            let auto_sync: String = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'auto_sync'"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None)
            .unwrap_or_else(|| "false".to_string());
            if auto_sync != "true" && auto_sync != "1" {
                sleep(Duration::from_secs(15)).await;
                continue;
            }

            if !started_logged {
                println!("🚀 Cloud Sync Worker active → {}", supabase_url);
                started_logged = true;
            }

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
    // Read up to 250 pending rows per tick for high-throughput batching
    let pending_items = sqlx::query(
        "SELECT id, table_name, record_id, operation, payload
         FROM sync_queue
         WHERE synced_at IS NULL AND retry_count < ?
         ORDER BY created_at ASC
         LIMIT 250"
    )
    .bind(MAX_RETRY_COUNT)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if pending_items.is_empty() {
        return Ok(0);
    }

    println!("🔄 Processing batch of {} items in sync queue...", pending_items.len());
    let mut success_count = 0;
    let mut all_network_failed = true;

    // Group items into batches: (table_name, operation) -> Vec<(queue_id, record_id, payload)>
    use std::collections::HashMap;
    let mut groups: HashMap<(String, String), Vec<(String, String, serde_json::Value)>> = HashMap::new();

    for row in &pending_items {
        let queue_id: String = row.get("id");
        let table_name: String = row.get("table_name");
        let record_id: String = row.get("record_id");
        let operation: String = row.get("operation");
        let payload_str: String = row.get("payload");

        let mut json_payload: serde_json::Value = serde_json::from_str(&payload_str)
            .unwrap_or_else(|_| serde_json::json!({}));

        if let serde_json::Value::Object(ref mut map) = json_payload {
            map.insert("workspace_id".to_string(), serde_json::Value::String(workspace_id.to_string()));
            map.remove("image_blob");

            let now_iso = chrono::Utc::now().to_rfc3339();
            let need_updated = match map.get("updated_at") {
                None | Some(serde_json::Value::Null) => true,
                Some(serde_json::Value::String(s)) => s.trim().is_empty(),
                _ => false,
            };
            if need_updated {
                map.insert("updated_at".to_string(), serde_json::Value::String(now_iso.clone()));
            }

            if table_name == "item_prices" || table_name == "sale_lines" || table_name == "journal_lines" {
                map.remove("created_at");
            } else {
                let need_created = match map.get("created_at") {
                    None | Some(serde_json::Value::Null) => true,
                    Some(serde_json::Value::String(s)) => s.trim().is_empty(),
                    _ => false,
                };
                if need_created {
                    map.insert("created_at".to_string(), serde_json::Value::String(now_iso));
                }
            }

            if table_name == "stock_ledger" {
                map.remove("source_id");
            }

            if table_name == "sales" {
                if let Some(created_by_val) = map.remove("created_by") {
                    if !map.contains_key("user_id") {
                        map.insert("user_id".to_string(), created_by_val);
                    }
                }
                map.remove("net_amount");
            }

            if table_name == "users" || table_name == "role_default_permissions" {
                if let Some(perms_val) = map.get("permissions") {
                    if let Some(perms_str) = perms_val.as_str() {
                        if let Ok(parsed_json) = serde_json::from_str::<serde_json::Value>(perms_str) {
                            map.insert("permissions".to_string(), parsed_json);
                        }
                    }
                }
            }
        }

        groups.entry((table_name, operation)).or_default().push((queue_id, record_id, json_payload));
    }

    for ((table_name, operation), items) in groups {
        let endpoint = format!("{}/rest/v1/{}", supabase_url, table_name);

        if operation == "insert" || operation == "update" {
            // Batch UPSERT via single HTTP POST array with Prefer: resolution=merge-duplicates
            let payloads: Vec<serde_json::Value> = items.iter().map(|(_, _, p)| p.clone()).collect();
            let queue_ids: Vec<String> = items.iter().map(|(qid, _, _)| qid.clone()).collect();

            let batch_req = client
                .post(&endpoint)
                .header("Prefer", "resolution=merge-duplicates,return=minimal")
                .header("apikey", supabase_key)
                .header("Authorization", format!("Bearer {}", supabase_key))
                .header("Content-Type", "application/json")
                .json(&payloads);

            match batch_req.send().await {
                Ok(res) if res.status().is_success() => {
                    let count = queue_ids.len();
                    for qid in queue_ids {
                        let _ = sqlx::query(
                            "UPDATE sync_queue SET synced_at = datetime('now'), error = NULL WHERE id = ?"
                        )
                        .bind(&qid)
                        .execute(pool)
                        .await;
                    }
                    success_count += count;
                    all_network_failed = false;
                }
                Ok(res) => {
                    // Fallback to item-by-item if batch fails
                    all_network_failed = false;
                    let batch_status = res.status();
                    let batch_err = res.text().await.unwrap_or_default();
                    eprintln!("⚠️ Batch upsert fallback for {} (HTTP {}: {}). Retrying item-by-item...", table_name, batch_status, batch_err);

                    for (queue_id, record_id, json_payload) in items {
                        let single_req = if operation == "insert" {
                            client
                                .post(&endpoint)
                                .header("Prefer", "resolution=merge-duplicates,return=minimal")
                        } else {
                            let id_col = if table_name == "role_default_permissions" { "role" } else { "id" };
                            client
                                .patch(&format!("{}?{}=eq.{}", endpoint, id_col, record_id))
                                .header("Prefer", "return=minimal")
                        };

                        let single_req = single_req
                            .header("apikey", supabase_key)
                            .header("Authorization", format!("Bearer {}", supabase_key))
                            .header("Content-Type", "application/json")
                            .json(&json_payload);

                        match single_req.send().await {
                            Ok(r) if r.status().is_success() => {
                                let _ = sqlx::query("UPDATE sync_queue SET synced_at = datetime('now'), error = NULL WHERE id = ?")
                                    .bind(&queue_id).execute(pool).await;
                                success_count += 1;
                            }
                            Ok(r) => {
                                let err_msg = format!("HTTP {}: {}", r.status(), r.text().await.unwrap_or_default());
                                let _ = sqlx::query("UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?")
                                    .bind(&err_msg).bind(&queue_id).execute(pool).await;
                            }
                            Err(e) => {
                                let err_msg = e.to_string();
                                let _ = sqlx::query("UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?")
                                    .bind(&err_msg).bind(&queue_id).execute(pool).await;
                            }
                        }
                    }
                }
                Err(e) => {
                    let err_msg = e.to_string();
                    for (queue_id, _, _) in items {
                        let _ = sqlx::query("UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?")
                            .bind(&err_msg).bind(&queue_id).execute(pool).await;
                    }
                }
            }
        } else {
            // Delete operation
            for (queue_id, record_id, _) in items {
                let id_col = if table_name == "role_default_permissions" { "role" } else { "id" };
                let delete_req = client
                    .delete(&format!("{}?{}=eq.{}", endpoint, id_col, record_id))
                    .header("apikey", supabase_key)
                    .header("Authorization", format!("Bearer {}", supabase_key));

                match delete_req.send().await {
                    Ok(res) if res.status().is_success() => {
                        let _ = sqlx::query("UPDATE sync_queue SET synced_at = datetime('now'), error = NULL WHERE id = ?")
                            .bind(&queue_id).execute(pool).await;
                        success_count += 1;
                        all_network_failed = false;
                    }
                    Ok(res) => {
                        let err_msg = format!("HTTP {}: {}", res.status(), res.text().await.unwrap_or_default());
                        let _ = sqlx::query("UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?")
                            .bind(&err_msg).bind(&queue_id).execute(pool).await;
                        all_network_failed = false;
                    }
                    Err(e) => {
                        let err_msg = e.to_string();
                        let _ = sqlx::query("UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?")
                            .bind(&err_msg).bind(&queue_id).execute(pool).await;
                    }
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
    pub auto_sync: bool,
}

/// Validate a workspace code or invite token against Supabase and save to local settings.
#[tauri::command]
pub async fn join_workspace(
    code_or_token: String,
    password: Option<String>,
    state: tauri::State<'_, crate::AppState>,
) -> Result<WorkspaceInfo, String> {
    let (supabase_url, supabase_key) = get_supabase_credentials();

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
    let (supabase_url, supabase_key) = get_supabase_credentials();

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
    let (supabase_url, supabase_key) = get_supabase_credentials();

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

    let auto_sync_str: String = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'auto_sync'"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or_else(|| "false".to_string());

    let auto_sync = auto_sync_str == "true" || auto_sync_str == "1";

    Ok(SyncStatus { workspace_id, workspace_name, workspace_code, pending_count, failed_count, last_synced, auto_sync })
}

#[tauri::command]
pub async fn trigger_sync_push(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<usize, String> {
    use tauri::Emitter;
    let (supabase_url, supabase_key) = get_supabase_credentials();

    let workspace_id: Option<String> = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
    )
    .fetch_optional(&state.db_pool)
    .await
    .unwrap_or(None);

    let workspace_id = workspace_id.ok_or_else(|| "Workspace ID belum terhubung.".to_string())?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_else(|_| Client::new());

    let total_pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_queue WHERE synced_at IS NULL AND retry_count < ?"
    )
    .bind(MAX_RETRY_COUNT)
    .fetch_one(&state.db_pool)
    .await
    .unwrap_or(0);

    if total_pending == 0 {
        let _ = app.emit("sync-push-progress", serde_json::json!({
            "current": 0,
            "total": 0,
            "percent": 100,
            "table_name": "Selesai"
        }));
        return Ok(0);
    }

    let mut total_synced = 0;
    loop {
        let batch_synced = process_sync_queue(&state.db_pool, &client, &supabase_url, &supabase_key, &workspace_id).await?;
        if batch_synced == 0 {
            break;
        }
        total_synced += batch_synced;
        let percent = ((total_synced as f64 / total_pending as f64) * 100.0).min(100.0);
        let _ = app.emit("sync-push-progress", serde_json::json!({
            "current": total_synced,
            "total": total_pending,
            "percent": percent,
            "table_name": "sync_queue"
        }));
    }

    let _ = app.emit("sync-push-progress", serde_json::json!({
        "current": total_synced,
        "total": total_pending,
        "percent": 100,
        "table_name": "Selesai"
    }));

    Ok(total_synced)
}

pub async fn trigger_auto_push(pool: &SqlitePool) {
    let (supabase_url, supabase_key) = get_supabase_credentials();
    if supabase_url.is_empty() || supabase_key.is_empty() {
        return;
    }

    let workspace_id: Option<String> = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
    )
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    if let Some(ws_id) = workspace_id {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| Client::new());

        let _ = process_sync_queue(pool, &client, &supabase_url, &supabase_key, &ws_id).await;
    }
}

#[tauri::command]
pub async fn trigger_sync_pull(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::AppState>,
    full_pull: Option<bool>,
) -> Result<usize, String> {
    use tauri::Emitter;
    let (supabase_url, supabase_key) = get_supabase_credentials();

    let workspace_id: Option<String> = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
    )
    .fetch_optional(&state.db_pool)
    .await
    .unwrap_or(None);

    let workspace_id = workspace_id.ok_or_else(|| "Workspace ID belum terhubung.".to_string())?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| Client::new());

    let mut last_pull_at: String = if full_pull.unwrap_or(false) {
        "2000-01-01T00:00:00Z".to_string()
    } else {
        sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'last_pull_at'")
            .fetch_optional(&state.db_pool)
            .await
            .unwrap_or_default()
            .unwrap_or_default()
    };

    if last_pull_at.is_empty() {
        last_pull_at = "2000-01-01T00:00:00Z".to_string();
    }

    let tables = vec![
        "role_default_permissions", "users",
        "customers", "suppliers", 
        "purchase_orders", "po_lines", "purchases", "purchase_lines", "purchase_payments", "purchase_returns", "purchase_return_lines",
        "promos", "promo_bogo_rules", "promo_tiers", "promo_bundle_items",
        "accounts", "journal_entries", "journal_lines",
        "sales", "sale_lines", "sale_payments", "sale_returns", "sale_return_lines",
        "stock_opname", "stock_opname_lines",
        "stock_ledger", "items", "item_units", "item_prices", "item_price_tiers", "categories", "brands"
    ];

    let total_tables = tables.len();
    let mut total_pulled = 0;
    let mut max_updated_at = last_pull_at.clone();

    for (idx, table) in tables.iter().enumerate() {
        let percent = (((idx + 1) as f64 / total_tables as f64) * 100.0).min(100.0);
        let _ = app.emit("sync-pull-progress", serde_json::json!({
            "current": idx + 1,
            "total": total_tables,
            "percent": percent,
            "table_name": table,
            "items_pulled": total_pulled
        }));

        let url = format!("{}/rest/v1/{}?workspace_id=eq.{}&updated_at=gt.{}&order=updated_at.asc&limit=500", supabase_url, table, workspace_id, last_pull_at);
        
        let req = client.get(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "return=representation");

        if let Ok(res) = req.send().await {
            if res.status().is_success() {
                if let Ok(rows) = res.json::<Vec<serde_json::Value>>().await {
                    for row in rows {
                        if let Some(row_updated_at) = row.get("updated_at").and_then(|v| v.as_str()) {
                            if row_updated_at > max_updated_at.as_str() {
                                max_updated_at = row_updated_at.to_string();
                            }
                        }
                        
                        let _ = apply_cloud_sync(&state.db_pool, table, &row).await;
                        let _ = app.emit("sync-received", table);
                        total_pulled += 1;
                    }
                }
            }
        }
    }

    if total_pulled > 0 && max_updated_at > last_pull_at {
        let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('last_pull_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(&max_updated_at)
            .execute(&state.db_pool)
            .await;
    }

    let _ = app.emit("sync-pull-progress", serde_json::json!({
        "current": total_tables,
        "total": total_tables,
        "percent": 100.0,
        "table_name": "Selesai",
        "items_pulled": total_pulled
    }));

    Ok(total_pulled)
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
    apply_cloud_sync(&state.db_pool, &table_name, &payload).await
}

// ─────────────────────────────────────────────────────────────────────────────
// System Admin commands
// ─────────────────────────────────────────────────────────────────────────────

use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header, Algorithm};

#[derive(Debug, Serialize)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

fn mint_sysadmin_jwt(username: &str) -> Option<String> {
    let default_secret = "fQTM5FzWc5ZQljXshc+HxRw+JUpNSkFiNf43dJmmY2gVbue5ioFDtCeTRHqHfQwbRBwfvXlKKMtKSuH4fsbofw==";
    let secret = std::env::var("VITE_SUPABASE_JWT_SECRET")
        .or_else(|_| std::env::var("SUPABASE_JWT_SECRET"))
        .unwrap_or_else(|_| default_secret.to_string());
    if secret.is_empty() { return None; }
    
    let exp = (Utc::now() + chrono::Duration::try_hours(12).unwrap_or(chrono::Duration::hours(12))).timestamp() as usize;
    let claims = Claims {
        sub: username.to_string(),
        role: "sysadmin".to_string(), // Ensure your Supabase RLS policies allow the 'sysadmin' role
        exp,
    };
    encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(secret.as_bytes())).ok()
}

#[derive(Debug, Serialize)]
pub struct SysadminLoginResponse {
    pub success: bool,
    pub supabase_token: Option<String>,
}

#[tauri::command]
pub async fn sysadmin_login(username: String, password_hash: String) -> Result<SysadminLoginResponse, String> {
    let (supabase_url, supabase_key) = get_supabase_credentials();

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
    let success = !users.is_empty();
    
    let mut supabase_token = None;
    if success {
        supabase_token = mint_sysadmin_jwt(&username);
    }
    
    Ok(SysadminLoginResponse { success, supabase_token })
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
    let (supabase_url, supabase_key) = get_supabase_credentials();

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
    let (supabase_url, supabase_key) = get_supabase_credentials();

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
    let (supabase_url, supabase_key) = get_supabase_credentials();

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
    let (supabase_url, supabase_key) = get_supabase_credentials();

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


fn json_to_i64(val: Option<&serde_json::Value>, default_val: i64) -> i64 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_i64().unwrap_or(default_val),
        Some(serde_json::Value::Bool(b)) => if *b { 1 } else { 0 },
        Some(serde_json::Value::String(s)) => {
            if s == "true" || s == "1" {
                1
            } else if s == "false" || s == "0" {
                0
            } else {
                s.parse::<i64>().unwrap_or(default_val)
            }
        }
        _ => default_val,
    }
}

fn json_to_f64(val: Option<&serde_json::Value>, default_val: f64) -> f64 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(default_val),
        Some(serde_json::Value::String(s)) => s.parse::<f64>().unwrap_or(default_val),
        Some(serde_json::Value::Bool(b)) => if *b { 1.0 } else { 0.0 },
        _ => default_val,
    }
}

pub async fn apply_cloud_sync(pool: &SqlitePool, table_name: &str, payload: &serde_json::Value) -> Result<(), String> {
    match table_name {
        "customers" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let phone = payload.get("phone").and_then(|v| v.as_str());
            let email = payload.get("email").and_then(|v| v.as_str());
            let address = payload.get("address").and_then(|v| v.as_str());
            let region = payload.get("region").and_then(|v| v.as_str());
            let customer_tier = payload.get("customer_tier").and_then(|v| v.as_str());
            let loyalty_points = json_to_i64(payload.get("loyalty_points"), 0);
            let credit_limit = json_to_f64(payload.get("credit_limit"), 0.0);
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let is_active = json_to_i64(payload.get("is_active"), 1);
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO customers (id, name, phone, email, address, region, customer_tier, loyalty_points, credit_limit, notes, is_active, created_at, updated_at, deleted_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address, region=excluded.region, customer_tier=excluded.customer_tier, loyalty_points=excluded.loyalty_points, credit_limit=excluded.credit_limit, notes=excluded.notes, is_active=excluded.is_active, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(name)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(region)
            .bind(customer_tier)
            .bind(loyalty_points)
            .bind(credit_limit)
            .bind(notes)
            .bind(is_active)
            .bind(created_at)
            .bind(updated_at)
            .bind(deleted_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "suppliers" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let contact_person = payload.get("contact_person").and_then(|v| v.as_str());
            let phone = payload.get("phone").and_then(|v| v.as_str());
            let email = payload.get("email").and_then(|v| v.as_str());
            let address = payload.get("address").and_then(|v| v.as_str());
            let payment_terms = payload.get("payment_terms").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let is_active = payload.get("is_active").and_then(|v| v.as_i64());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO suppliers (id, name, contact_person, phone, email, address, payment_terms, notes, is_active, created_at, updated_at, deleted_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name, contact_person=excluded.contact_person, phone=excluded.phone, email=excluded.email, address=excluded.address, payment_terms=excluded.payment_terms, notes=excluded.notes, is_active=excluded.is_active, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(name)
            .bind(contact_person)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(payment_terms)
            .bind(notes)
            .bind(is_active)
            .bind(created_at)
            .bind(updated_at)
            .bind(deleted_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "purchase_orders" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let supplier_id = payload.get("supplier_id").and_then(|v| v.as_str());
            let status = payload.get("status").and_then(|v| v.as_str());
            let expected_date = payload.get("expected_date").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO purchase_orders (id, branch_id, supplier_id, status, expected_date, notes, created_by, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'system_sync', ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id, supplier_id=excluded.supplier_id, status=excluded.status, expected_date=excluded.expected_date, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(branch_id)
            .bind(supplier_id)
            .bind(status)
            .bind(expected_date)
            .bind(notes)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "po_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let po_id = payload.get("po_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let qty_ordered = payload.get("qty_ordered").and_then(|v| v.as_f64());
            let qty_received = payload.get("qty_received").and_then(|v| v.as_f64());
            let price_estimate = payload.get("price_estimate").and_then(|v| v.as_f64());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO po_lines (id, po_id, item_id, unit_id, qty_ordered, qty_received, price_estimate, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET po_id=excluded.po_id, item_id=excluded.item_id, unit_id=excluded.unit_id, qty_ordered=excluded.qty_ordered, qty_received=excluded.qty_received, price_estimate=excluded.price_estimate, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(po_id)
            .bind(item_id)
            .bind(unit_id)
            .bind(qty_ordered)
            .bind(qty_received)
            .bind(price_estimate)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "purchases" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let po_id = payload.get("po_id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let supplier_id = payload.get("supplier_id").and_then(|v| v.as_str());
            let invoice_no = payload.get("invoice_no").and_then(|v| v.as_str());
            let invoice_date = payload.get("invoice_date").and_then(|v| v.as_str());
            let total_amount = payload.get("total_amount").and_then(|v| v.as_f64());
            let status = payload.get("status").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO purchases (id, po_id, branch_id, supplier_id, invoice_no, invoice_date, total_amount, status, notes, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET po_id=excluded.po_id, branch_id=excluded.branch_id, supplier_id=excluded.supplier_id, invoice_no=excluded.invoice_no, invoice_date=excluded.invoice_date, total_amount=excluded.total_amount, status=excluded.status, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(po_id)
            .bind(branch_id)
            .bind(supplier_id)
            .bind(invoice_no)
            .bind(invoice_date)
            .bind(total_amount)
            .bind(status)
            .bind(notes)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "purchase_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let purchase_id = payload.get("purchase_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let qty_received = payload.get("qty_received").and_then(|v| v.as_f64());
            let price_per_unit = payload.get("price_per_unit").and_then(|v| v.as_f64());
            let expiry_date = payload.get("expiry_date").and_then(|v| v.as_str());
            let batch_no = payload.get("batch_no").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO purchase_lines (id, purchase_id, item_id, unit_id, qty_received, price_per_unit, expiry_date, batch_no, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET purchase_id=excluded.purchase_id, item_id=excluded.item_id, unit_id=excluded.unit_id, qty_received=excluded.qty_received, price_per_unit=excluded.price_per_unit, expiry_date=excluded.expiry_date, batch_no=excluded.batch_no, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(purchase_id)
            .bind(item_id)
            .bind(unit_id)
            .bind(qty_received)
            .bind(price_per_unit)
            .bind(expiry_date)
            .bind(batch_no)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "purchase_payments" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let purchase_id = payload.get("purchase_id").and_then(|v| v.as_str());
            let amount = payload.get("amount").and_then(|v| v.as_f64());
            let method = payload.get("method").and_then(|v| v.as_str());
            let reference = payload.get("reference").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO purchase_payments (id, purchase_id, amount, method, reference, notes, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET purchase_id=excluded.purchase_id, amount=excluded.amount, method=excluded.method, reference=excluded.reference, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(purchase_id)
            .bind(amount)
            .bind(method)
            .bind(reference)
            .bind(notes)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "purchase_returns" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let purchase_id = payload.get("purchase_id").and_then(|v| v.as_str());
            let supplier_id = payload.get("supplier_id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let reason = payload.get("reason").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO purchase_returns (id, purchase_id, supplier_id, branch_id, reason, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET purchase_id=excluded.purchase_id, supplier_id=excluded.supplier_id, branch_id=excluded.branch_id, reason=excluded.reason, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(purchase_id)
            .bind(supplier_id)
            .bind(branch_id)
            .bind(reason)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "purchase_return_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let return_id = payload.get("return_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let qty = payload.get("qty").and_then(|v| v.as_f64());
            let reason = payload.get("reason").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO purchase_return_lines (id, return_id, item_id, unit_id, qty, reason, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET return_id=excluded.return_id, item_id=excluded.item_id, unit_id=excluded.unit_id, qty=excluded.qty, reason=excluded.reason, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(return_id)
            .bind(item_id)
            .bind(unit_id)
            .bind(qty)
            .bind(reason)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "promos" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let description = payload.get("description").and_then(|v| v.as_str());
            let discount_percent = payload.get("discount_percent").and_then(|v| v.as_f64());
            let min_qty = payload.get("min_qty").and_then(|v| v.as_f64());
            let category_id = payload.get("category_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let member_only = payload.get("member_only").and_then(|v| v.as_i64());
            let active = payload.get("active").and_then(|v| v.as_i64());
            let start_date = payload.get("start_date").and_then(|v| v.as_str());
            let end_date = payload.get("end_date").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO promos (id, name, description, discount_percent, min_qty, category_id, item_id, member_only, active, start_date, end_date, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, discount_percent=excluded.discount_percent, min_qty=excluded.min_qty, category_id=excluded.category_id, item_id=excluded.item_id, member_only=excluded.member_only, active=excluded.active, start_date=excluded.start_date, end_date=excluded.end_date, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(name)
            .bind(description)
            .bind(discount_percent)
            .bind(min_qty)
            .bind(category_id)
            .bind(item_id)
            .bind(member_only)
            .bind(active)
            .bind(start_date)
            .bind(end_date)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "promo_bogo_rules" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let promo_id = payload.get("promo_id").and_then(|v| v.as_str());
            let buy_qty = payload.get("buy_qty").and_then(|v| v.as_f64());
            let get_qty = payload.get("get_qty").and_then(|v| v.as_f64());
            let free_item_id = payload.get("free_item_id").and_then(|v| v.as_str());
            let free_item_unit_id = payload.get("free_item_unit_id").and_then(|v| v.as_str());
            let free_item_discount_percent = payload.get("free_item_discount_percent").and_then(|v| v.as_f64());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO promo_bogo_rules (id, promo_id, buy_qty, get_qty, free_item_id, free_item_unit_id, free_item_discount_percent, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET promo_id=excluded.promo_id, buy_qty=excluded.buy_qty, get_qty=excluded.get_qty, free_item_id=excluded.free_item_id, free_item_unit_id=excluded.free_item_unit_id, free_item_discount_percent=excluded.free_item_discount_percent, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(promo_id)
            .bind(buy_qty)
            .bind(get_qty)
            .bind(free_item_id)
            .bind(free_item_unit_id)
            .bind(free_item_discount_percent)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "promo_tiers" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let promo_id = payload.get("promo_id").and_then(|v| v.as_str());
            let min_qty = payload.get("min_qty").and_then(|v| v.as_f64());
            let discount_percent = payload.get("discount_percent").and_then(|v| v.as_f64());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO promo_tiers (id, promo_id, min_qty, discount_percent, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET promo_id=excluded.promo_id, min_qty=excluded.min_qty, discount_percent=excluded.discount_percent, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(promo_id)
            .bind(min_qty)
            .bind(discount_percent)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "promo_bundle_items" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let promo_id = payload.get("promo_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let qty = payload.get("qty").and_then(|v| v.as_f64());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO promo_bundle_items (id, promo_id, item_id, qty, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET promo_id=excluded.promo_id, item_id=excluded.item_id, qty=excluded.qty, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(promo_id)
            .bind(item_id)
            .bind(qty)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "accounts" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let code = payload.get("code").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let type_val = payload.get("type").and_then(|v| v.as_str());
            let parent_id = payload.get("parent_id").and_then(|v| v.as_str());
            let normal_balance = payload.get("normal_balance").and_then(|v| v.as_str());
            let is_system = payload.get("is_system").and_then(|v| v.as_i64());
            let is_active = payload.get("is_active").and_then(|v| v.as_i64());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO accounts (id, code, name, type, parent_id, normal_balance, is_system, is_active, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, type=excluded.type, parent_id=excluded.parent_id, normal_balance=excluded.normal_balance, is_system=excluded.is_system, is_active=excluded.is_active, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(code)
            .bind(name)
            .bind(type_val)
            .bind(parent_id)
            .bind(normal_balance)
            .bind(is_system)
            .bind(is_active)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "journal_entries" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let entry_no = payload.get("entry_no").and_then(|v| v.as_str());
            let date = payload.get("date").and_then(|v| v.as_str());
            let description = payload.get("description").and_then(|v| v.as_str());
            let source_type = payload.get("source_type").and_then(|v| v.as_str());
            let source_id = payload.get("source_id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO journal_entries (id, entry_no, date, description, source_type, source_id, branch_id, created_by, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'system_sync', ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET entry_no=excluded.entry_no, date=excluded.date, description=excluded.description, source_type=excluded.source_type, source_id=excluded.source_id, branch_id=excluded.branch_id, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(entry_no)
            .bind(date)
            .bind(description)
            .bind(source_type)
            .bind(source_id)
            .bind(branch_id)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "journal_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let journal_entry_id = payload.get("journal_entry_id").and_then(|v| v.as_str());
            let account_id = payload.get("account_id").and_then(|v| v.as_str());
            let debit = payload.get("debit").and_then(|v| v.as_f64());
            let credit = payload.get("credit").and_then(|v| v.as_f64());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, notes, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET journal_entry_id=excluded.journal_entry_id, account_id=excluded.account_id, debit=excluded.debit, credit=excluded.credit, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(journal_entry_id)
            .bind(account_id)
            .bind(debit)
            .bind(credit)
            .bind(notes)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "sales" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let transaction_no = payload.get("transaction_no").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let customer_id = payload.get("customer_id").and_then(|v| v.as_str());
            let user_id = payload.get("user_id").and_then(|v| v.as_str());
            let total_amount = payload.get("total_amount").and_then(|v| v.as_f64());
            let discount_amount = payload.get("discount_amount").and_then(|v| v.as_f64());
            let tax_amount = payload.get("tax_amount").and_then(|v| v.as_f64());
            let grand_total = payload.get("grand_total").and_then(|v| v.as_f64());
            let status = payload.get("status").and_then(|v| v.as_str());
            let price_type = payload.get("price_type").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO sales (id, transaction_no, branch_id, customer_id, user_id, total_amount, discount_amount, tax_amount, grand_total, status, price_type, notes, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET transaction_no=excluded.transaction_no, branch_id=excluded.branch_id, customer_id=excluded.customer_id, user_id=excluded.user_id, total_amount=excluded.total_amount, discount_amount=excluded.discount_amount, tax_amount=excluded.tax_amount, grand_total=excluded.grand_total, status=excluded.status, price_type=excluded.price_type, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(transaction_no)
            .bind(branch_id)
            .bind(customer_id)
            .bind(user_id)
            .bind(total_amount)
            .bind(discount_amount)
            .bind(tax_amount)
            .bind(grand_total)
            .bind(status)
            .bind(price_type)
            .bind(notes)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "sale_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let sale_id = payload.get("sale_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let qty = payload.get("qty").and_then(|v| v.as_f64());
            let price_type = payload.get("price_type").and_then(|v| v.as_str());
            let price = payload.get("price").and_then(|v| v.as_f64());
            let discount_amount = payload.get("discount_amount").and_then(|v| v.as_f64());
            let subtotal = payload.get("subtotal").and_then(|v| v.as_f64());
            let hpp_value = payload.get("hpp_value").and_then(|v| v.as_f64());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO sale_lines (id, sale_id, item_id, unit_id, qty, price_type, price, discount_amount, subtotal, hpp_value, notes, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET sale_id=excluded.sale_id, item_id=excluded.item_id, unit_id=excluded.unit_id, qty=excluded.qty, price_type=excluded.price_type, price=excluded.price, discount_amount=excluded.discount_amount, subtotal=excluded.subtotal, hpp_value=excluded.hpp_value, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(sale_id)
            .bind(item_id)
            .bind(unit_id)
            .bind(qty)
            .bind(price_type)
            .bind(price)
            .bind(discount_amount)
            .bind(subtotal)
            .bind(hpp_value)
            .bind(notes)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "sale_payments" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let sale_id = payload.get("sale_id").and_then(|v| v.as_str());
            let amount = payload.get("amount").and_then(|v| v.as_f64());
            let method = payload.get("method").and_then(|v| v.as_str());
            let reference = payload.get("reference").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO sale_payments (id, sale_id, amount, method, reference, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET sale_id=excluded.sale_id, amount=excluded.amount, method=excluded.method, reference=excluded.reference, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(sale_id)
            .bind(amount)
            .bind(method)
            .bind(reference)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "sale_returns" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let sale_id = payload.get("sale_id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let return_total = payload.get("return_total").and_then(|v| v.as_f64());
            let refund_amount = payload.get("refund_amount").and_then(|v| v.as_f64());
            let reason = payload.get("reason").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO sale_returns (id, sale_id, branch_id, return_total, refund_amount, reason, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET sale_id=excluded.sale_id, branch_id=excluded.branch_id, return_total=excluded.return_total, refund_amount=excluded.refund_amount, reason=excluded.reason, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(sale_id)
            .bind(branch_id)
            .bind(return_total)
            .bind(refund_amount)
            .bind(reason)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "sale_return_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let return_id = payload.get("return_id").and_then(|v| v.as_str());
            let sale_line_id = payload.get("sale_line_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let qty = payload.get("qty").and_then(|v| v.as_f64());
            let refund_amount = payload.get("refund_amount").and_then(|v| v.as_f64());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO sale_return_lines (id, return_id, sale_line_id, item_id, qty, refund_amount, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET return_id=excluded.return_id, sale_line_id=excluded.sale_line_id, item_id=excluded.item_id, qty=excluded.qty, refund_amount=excluded.refund_amount, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(return_id)
            .bind(sale_line_id)
            .bind(item_id)
            .bind(qty)
            .bind(refund_amount)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "stock_opname" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let status = payload.get("status").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let finalized_at = payload.get("finalized_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO stock_opname (id, branch_id, status, notes, created_by, created_at, finalized_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, 'system_sync', ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id, status=excluded.status, notes=excluded.notes, finalized_at=excluded.finalized_at, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(branch_id)
            .bind(status)
            .bind(notes)
            .bind(created_at)
            .bind(finalized_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "stock_opname_lines" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let opname_id = payload.get("opname_id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let expected_qty = payload.get("expected_qty").and_then(|v| v.as_f64());
            let actual_qty = payload.get("actual_qty").and_then(|v| v.as_f64());
            let diff_qty = payload.get("diff_qty").and_then(|v| v.as_f64());
            let hpp_value = payload.get("hpp_value").and_then(|v| v.as_f64());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO stock_opname_lines (id, opname_id, item_id, unit_id, expected_qty, actual_qty, diff_qty, hpp_value, notes, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET opname_id=excluded.opname_id, item_id=excluded.item_id, unit_id=excluded.unit_id, expected_qty=excluded.expected_qty, actual_qty=excluded.actual_qty, diff_qty=excluded.diff_qty, hpp_value=excluded.hpp_value, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(opname_id)
            .bind(item_id)
            .bind(unit_id)
            .bind(expected_qty)
            .bind(actual_qty)
            .bind(diff_qty)
            .bind(hpp_value)
            .bind(notes)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "stock_ledger" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let qty_change = payload.get("qty_change").and_then(|v| v.as_f64());
            let direction = payload.get("direction").and_then(|v| v.as_str());
            let source_type = payload.get("source_type").and_then(|v| v.as_str());
            let source_id = payload.get("source_id").and_then(|v| v.as_str());
            let hpp_value = payload.get("hpp_value").and_then(|v| v.as_f64());
            let expiry_date = payload.get("expiry_date").and_then(|v| v.as_str());
            let batch_no = payload.get("batch_no").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, hpp_value, expiry_date, batch_no, notes, created_by, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync', ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET item_id=excluded.item_id, unit_id=excluded.unit_id, branch_id=excluded.branch_id, qty_change=excluded.qty_change, direction=excluded.direction, source_type=excluded.source_type, source_id=excluded.source_id, hpp_value=excluded.hpp_value, expiry_date=excluded.expiry_date, batch_no=excluded.batch_no, notes=excluded.notes, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(item_id)
            .bind(unit_id)
            .bind(branch_id)
            .bind(qty_change)
            .bind(direction)
            .bind(source_type)
            .bind(source_id)
            .bind(hpp_value)
            .bind(expiry_date)
            .bind(batch_no)
            .bind(notes)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "items" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let sku = payload.get("sku").and_then(|v| v.as_str());
            let barcode = payload.get("barcode").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let generic_name = payload.get("generic_name").and_then(|v| v.as_str());
            let category_id = payload.get("category_id").and_then(|v| v.as_str());
            let brand_id = payload.get("brand_id").and_then(|v| v.as_str());
            let hpp_method = payload.get("hpp_method").and_then(|v| v.as_str());
            let image_blob = payload.get("image_blob").and_then(|v| v.as_str());
            let min_stock = json_to_f64(payload.get("min_stock"), 0.0);
            let has_expiry = json_to_i64(payload.get("has_expiry"), 0);
            let requires_prescription = json_to_i64(payload.get("requires_prescription"), 0);
            let cost_price = json_to_f64(payload.get("cost_price"), 0.0);
            let rack_location = payload.get("rack_location").and_then(|v| v.as_str());
            let item_type = payload.get("item_type").and_then(|v| v.as_str());
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let is_active = json_to_i64(payload.get("is_active"), 1);
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO items (id, sku, barcode, name, generic_name, category_id, brand_id, hpp_method, image_blob, min_stock, has_expiry, requires_prescription, cost_price, rack_location, item_type, notes, is_active, created_at, updated_at, deleted_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET sku=excluded.sku, barcode=excluded.barcode, name=excluded.name, generic_name=excluded.generic_name, category_id=excluded.category_id, brand_id=excluded.brand_id, hpp_method=excluded.hpp_method, image_blob=excluded.image_blob, min_stock=excluded.min_stock, has_expiry=excluded.has_expiry, requires_prescription=excluded.requires_prescription, cost_price=excluded.cost_price, rack_location=excluded.rack_location, item_type=excluded.item_type, notes=excluded.notes, is_active=excluded.is_active, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(sku)
            .bind(barcode)
            .bind(name)
            .bind(generic_name)
            .bind(category_id)
            .bind(brand_id)
            .bind(hpp_method)
            .bind(image_blob)
            .bind(min_stock)
            .bind(has_expiry)
            .bind(requires_prescription)
            .bind(cost_price)
            .bind(rack_location)
            .bind(item_type)
            .bind(notes)
            .bind(is_active)
            .bind(created_at)
            .bind(updated_at)
            .bind(deleted_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "item_price_tiers" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let tier_level = json_to_i64(payload.get("tier_level"), 1);
            let max_qty = json_to_f64(payload.get("max_qty"), 0.0);
            let price = json_to_f64(payload.get("price"), 0.0);
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO item_price_tiers (id, item_id, unit_id, tier_level, max_qty, price, deleted_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET item_id=excluded.item_id, unit_id=excluded.unit_id, tier_level=excluded.tier_level, max_qty=excluded.max_qty, price=excluded.price, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at"
            )
            .bind(id)
            .bind(item_id)
            .bind(unit_id)
            .bind(tier_level)
            .bind(max_qty)
            .bind(price)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "item_units" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_name = payload.get("unit_name").and_then(|v| v.as_str());
            let conversion = json_to_f64(payload.get("conversion"), 1.0);
            let is_base = json_to_i64(payload.get("is_base"), 1);
            let barcode = payload.get("barcode").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO item_units (id, item_id, unit_name, conversion, is_base, barcode, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET item_id=excluded.item_id, unit_name=excluded.unit_name, conversion=excluded.conversion, is_base=excluded.is_base, barcode=excluded.barcode, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(item_id)
            .bind(unit_name)
            .bind(conversion)
            .bind(is_base)
            .bind(barcode)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "item_prices" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let item_id = payload.get("item_id").and_then(|v| v.as_str());
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str());
            let customer_tier = payload.get("customer_tier").and_then(|v| v.as_str());
            let price = json_to_f64(payload.get("price"), 0.0);
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO item_prices (id, item_id, unit_id, customer_tier, price, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET item_id=excluded.item_id, unit_id=excluded.unit_id, customer_tier=excluded.customer_tier, price=excluded.price, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(item_id)
            .bind(unit_id)
            .bind(customer_tier)
            .bind(price)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "categories" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let parent_id = payload.get("parent_id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let description = payload.get("description").and_then(|v| v.as_str());
            let color = payload.get("color").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO categories (id, parent_id, name, description, color, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, name=excluded.name, description=excluded.description, color=excluded.color, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(parent_id)
            .bind(name)
            .bind(description)
            .bind(color)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "brands" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let logo_blob = payload.get("logo_blob").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let _ = sqlx::query(
                "INSERT INTO brands (id, name, logo_blob, created_at, deleted_at, updated_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name, logo_blob=excluded.logo_blob, deleted_at=excluded.deleted_at, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(name)
            .bind(logo_blob)
            .bind(created_at)
            .bind(deleted_at)
            .bind(updated_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "users" => {
            let id = payload.get("id").and_then(|v| v.as_str());
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str());
            let username = payload.get("username").and_then(|v| v.as_str());
            let password_hash = payload.get("password_hash").and_then(|v| v.as_str());
            let role = payload.get("role").and_then(|v| v.as_str());
            let permissions_raw = match payload.get("permissions") {
                Some(serde_json::Value::String(s)) => s.clone(),
                Some(v) if !v.is_null() => serde_json::to_string(v).unwrap_or_else(|_| "default".to_string()),
                _ => "default".to_string(),
            };
            let active = json_to_i64(payload.get("active"), 1);
            let last_login = payload.get("last_login").and_then(|v| v.as_str());
            let avatar_color = payload.get("avatar_color").and_then(|v| v.as_str());
            let workspace_id = payload.get("workspace_id").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str());
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());
            let deleted_at = payload.get("deleted_at").and_then(|v| v.as_str());
            
            // Clean up any stale local user with identical username but different id
            if let (Some(uname), Some(uid)) = (username, id) {
                let _ = sqlx::query("DELETE FROM users WHERE LOWER(username) = LOWER(?) AND id != ?")
                    .bind(uname)
                    .bind(uid)
                    .execute(pool)
                    .await;
            }

            let _ = sqlx::query(
                "INSERT INTO users (id, branch_id, name, username, password_hash, role, permissions, active, last_login, avatar_color, workspace_id, created_at, updated_at, deleted_at, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET 
                    branch_id=excluded.branch_id, 
                    name=excluded.name, 
                    username=excluded.username, 
                    password_hash=excluded.password_hash, 
                    role=excluded.role, 
                    permissions=excluded.permissions, 
                    active=excluded.active, 
                    last_login=excluded.last_login, 
                    avatar_color=excluded.avatar_color, 
                    workspace_id=excluded.workspace_id, 
                    updated_at=excluded.updated_at, 
                    deleted_at=excluded.deleted_at, 
                    updated_by=excluded.updated_by"
            )
            .bind(id)
            .bind(branch_id)
            .bind(name)
            .bind(username)
            .bind(password_hash)
            .bind(role)
            .bind(permissions_raw)
            .bind(active)
            .bind(last_login)
            .bind(avatar_color)
            .bind(workspace_id)
            .bind(created_at)
            .bind(updated_at)
            .bind(deleted_at)
            .execute(pool).await.map_err(|e| e.to_string())?;
        }
        "role_default_permissions" => {
            let role = payload.get("role").and_then(|v| v.as_str());
            let permissions_raw = match payload.get("permissions") {
                Some(serde_json::Value::String(s)) => s.clone(),
                Some(v) if !v.is_null() => serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()),
                _ => "[]".to_string(),
            };
            let updated_at = payload.get("updated_at").and_then(|v| v.as_str());

            if let Some(r) = role {
                let _ = sqlx::query(
                    "INSERT INTO role_default_permissions (role, permissions, updated_at, updated_by)
                     VALUES (?, ?, ?, 'system_sync')
                     ON CONFLICT(role) DO UPDATE SET permissions=excluded.permissions, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
                )
                .bind(r)
                .bind(permissions_raw)
                .bind(updated_at)
                .execute(pool).await.map_err(|e| e.to_string())?;
            }
        }
        _ => {}
    }
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Pull Worker
// ─────────────────────────────────────────────────────────────────────────────

pub fn spawn_pull_worker(pool: SqlitePool, app: tauri::AppHandle) {
    use tauri::Emitter;
    tauri::async_runtime::spawn(async move {
        // Delay startup so we don't hammer the network immediately
        tokio::time::sleep(tokio::time::Duration::from_secs(12)).await;

        let (supabase_url, supabase_key) = get_supabase_credentials();

        if supabase_url.is_empty() || supabase_key.is_empty() {
            println!("⚠️  Pull worker stopped: SUPABASE_URL or SUPABASE_KEY not set.");
            return;
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let mut pull_logged = false;

        let tables = vec![
            "role_default_permissions", "users",
            "customers", "suppliers", 
            "purchase_orders", "po_lines", "purchases", "purchase_lines", "purchase_payments", "purchase_returns", "purchase_return_lines",
            "promos", "promo_bogo_rules", "promo_tiers", "promo_bundle_items",
            "accounts", "journal_entries", "journal_lines",
            "sales", "sale_lines", "sale_payments", "sale_returns", "sale_return_lines",
            "stock_opname", "stock_opname_lines",
            "stock_ledger", "items", "item_units", "item_prices", "item_price_tiers", "categories", "brands"
        ];

        loop {
            // Guard: Do not run pull worker if setup is not yet completed
            let has_setup: String = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'has_completed_setup'"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None)
            .unwrap_or_else(|| "false".to_string());

            if has_setup != "true" {
                tokio::time::sleep(tokio::time::Duration::from_secs(15)).await;
                continue;
            }

            // Read workspace_id from settings
            let workspace_id: Option<String> = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);

            if workspace_id.is_none() {
                tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
                continue;
            }
            let workspace_id = workspace_id.unwrap();

            let auto_sync: String = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'auto_sync'"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or(None)
            .unwrap_or_else(|| "false".to_string());

            if auto_sync != "true" && auto_sync != "1" {
                tokio::time::sleep(tokio::time::Duration::from_secs(15)).await;
                continue;
            }

            if !pull_logged {
                println!("📥 Cloud Pull Worker active → {}", supabase_url);
                pull_logged = true;
            }

            // Read last_pull_at cursor
            let mut last_pull_at: String = sqlx::query_scalar(
                "SELECT value FROM global_settings WHERE key = 'last_pull_at'"
            )
            .fetch_optional(&pool)
            .await
            .unwrap_or_default()
            .unwrap_or_default();

            if last_pull_at.is_empty() {
                // If never pulled, use long ago timestamp to get everything
                last_pull_at = "2000-01-01T00:00:00Z".to_string();
            }

            let mut max_updated_at = last_pull_at.clone();
            let mut any_pulled = false;

            for table in &tables {
                let url = format!("{}/rest/v1/{}?workspace_id=eq.{}&updated_at=gt.{}&order=updated_at.asc&limit=500", supabase_url, table, workspace_id, last_pull_at);
                
                let req = client.get(&url)
                    .header("apikey", &supabase_key)
                    .header("Authorization", format!("Bearer {}", &supabase_key))
                    .header("Prefer", "return=representation");

                if let Ok(res) = req.send().await {
                    if res.status().is_success() {
                        if let Ok(rows) = res.json::<Vec<serde_json::Value>>().await {
                            for row in rows {
                                // Keep track of the highest updated_at across all tables and rows
                                if let Some(row_updated_at) = row.get("updated_at").and_then(|v| v.as_str()) {
                                    if row_updated_at > max_updated_at.as_str() {
                                        max_updated_at = row_updated_at.to_string();
                                    }
                                }
                                
                                // Apply to local DB
                                let _ = apply_cloud_sync(&pool, table, &row).await;
                                let _ = app.emit("sync-received", table);
                                any_pulled = true;
                            }
                        }
                    }
                }
            }

            if any_pulled && max_updated_at > last_pull_at {
                let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('last_pull_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                    .bind(&max_updated_at)
                    .execute(&pool)
                    .await;
                println!("✅ Pull worker sync complete. Cursor updated to {}", max_updated_at);
            }

            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
        }
    });
}

#[tauri::command]
pub async fn nuke_cloud_workspace_data(
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    let (supabase_url, supabase_key) = get_supabase_credentials();

    let workspace_id: Option<String> = sqlx::query_scalar(
        "SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''"
    )
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let ws_id = match workspace_id {
        Some(id) if !id.is_empty() => id,
        _ => return Err("Tidak ada cloud workspace yang terhubung.".to_string()),
    };

    let client = reqwest::Client::new();
    let tables = vec![
        "role_default_permissions", "users",
        "sale_return_lines", "sale_returns", "sale_payments", "sale_lines", "sales",
        "stock_ledger", "stock_opname_lines", "stock_opname", "purchase_return_lines",
        "purchase_returns", "purchase_payments", "purchase_lines", "purchases",
        "po_lines", "purchase_orders", "promo_bundle_items", "promo_tiers", "promo_bogo_rules",
        "promos", "item_price_tiers", "item_prices", "item_units", "items", "categories", "brands",
        "suppliers", "customers", "members"
    ];

    for table in tables {
        let url = format!("{}/rest/v1/{}?workspace_id=eq.{}", supabase_url, table, ws_id);
        let _ = client
            .delete(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await;
    }

    Ok(format!("Seluruh data cloud Supabase untuk workspace {} berhasil dibersihkan!", ws_id))
}
