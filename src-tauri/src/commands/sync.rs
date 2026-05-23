#![allow(dead_code)]
use reqwest::Client;
use sqlx::{Row, SqlitePool};
use std::env;
use tokio::time::{sleep, Duration};

pub fn spawn_sync_worker(pool: SqlitePool) {
    tokio::spawn(async move {
        // Give the app some time to start up before checking dotenv
        sleep(Duration::from_secs(5)).await;
        let _ = dotenvy::dotenv();

        let supabase_url = env::var("SUPABASE_URL").unwrap_or_default();
        let supabase_key = env::var("SUPABASE_KEY").unwrap_or_default();

        if supabase_url.is_empty() || supabase_key.is_empty() {
            println!("⚠️ Sync worker stopped: SUPABASE_URL or SUPABASE_KEY not found in .env");
            return;
        }

        let client = Client::new();
        println!("🚀 Cloud Sync Worker started for {}", supabase_url);

        loop {
            if let Err(e) = process_sync_queue(&pool, &client, &supabase_url, &supabase_key).await {
                eprintln!("❌ Sync worker error: {}", e);
            }
            // Poll every 15 seconds
            sleep(Duration::from_secs(15)).await;
        }
    });
}

async fn process_sync_queue(
    pool: &SqlitePool,
    client: &Client,
    supabase_url: &str,
    supabase_key: &str,
) -> Result<(), String> {
    // 1. Fetch pending sync items (oldest first), limit to 50 at a time
    let pending_items = sqlx::query(
        "SELECT id, table_name, record_id, operation, payload 
         FROM sync_queue 
         WHERE synced_at IS NULL 
         ORDER BY created_at ASC 
         LIMIT 50"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if pending_items.is_empty() {
        return Ok(()); // Nothing to do
    }

    println!("🔄 Processing {} items in sync queue...", pending_items.len());

    for row in pending_items {
        let queue_id: String = row.get("id");
        let table_name: String = row.get("table_name");
        let record_id: String = row.get("record_id");
        let operation: String = row.get("operation");
        let payload_str: String = row.get("payload");

        let endpoint = format!("{}/rest/v1/{}", supabase_url, table_name);

        let mut request = match operation.as_str() {
            "insert" => client.post(&endpoint),
            "update" => client.patch(&format!("{}?id=eq.{}", endpoint, record_id)),
            "delete" => client.delete(&format!("{}?id=eq.{}", endpoint, record_id)),
            _ => continue,
        };

        // Add headers
        request = request
            .header("apikey", supabase_key)
            .header("Authorization", format!("Bearer {}", supabase_key))
            .header("Content-Type", "application/json")
            // Prefer minimal return to save bandwidth
            .header("Prefer", "return=minimal");

        // Add payload for insert/update
        if operation != "delete" && !payload_str.is_empty() {
            let json_payload: serde_json::Value = serde_json::from_str(&payload_str)
                .unwrap_or_else(|_| serde_json::json!({}));
            request = request.json(&json_payload);
        }

        // Send Request
        let response = request.send().await;

        match response {
            Ok(res) if res.status().is_success() => {
                // Success! Mark as synced.
                let _ = sqlx::query("UPDATE sync_queue SET synced_at = datetime('now'), error = NULL WHERE id = ?")
                    .bind(&queue_id)
                    .execute(pool)
                    .await;
                println!("✅ Synced {} -> {}", operation, table_name);
            }
            Ok(res) => {
                // HTTP Error
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                let err_msg = format!("HTTP {}: {}", status, err_text);
                
                let _ = sqlx::query("UPDATE sync_queue SET error = ? WHERE id = ?")
                    .bind(&err_msg)
                    .bind(&queue_id)
                    .execute(pool)
                    .await;
                eprintln!("❌ Sync failed for {}: {}", queue_id, err_msg);
            }
            Err(e) => {
                // Network Error
                let err_msg = e.to_string();
                let _ = sqlx::query("UPDATE sync_queue SET error = ? WHERE id = ?")
                    .bind(&err_msg)
                    .bind(&queue_id)
                    .execute(pool)
                    .await;
                eprintln!("📡 Sync network error: {}", err_msg);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn receive_cloud_sync(table_name: String, payload: serde_json::Value, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    // When a row arrives from Supabase Realtime, we insert it locally.
    // To prevent infinite loop (trigger inserting it back to sync_queue),
    // we use `created_by = 'system_sync'`. The triggers ignore this user.

    match table_name.as_str() {
        "sales" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str()).unwrap_or_default();
            let customer_id = payload.get("customer_id").and_then(|v| v.as_str());
            let tx_no = payload.get("transaction_no").and_then(|v| v.as_str()).unwrap_or_default();
            let tx_date = payload.get("transaction_date").and_then(|v| v.as_str()).unwrap_or_default();
            let method = payload.get("payment_method").and_then(|v| v.as_str()).unwrap_or_default();
            let total = payload.get("total_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let disc = payload.get("discount_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let tax = payload.get("tax_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let net = payload.get("net_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let paid = payload.get("paid_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let change = payload.get("change_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or_default();
            let notes = payload.get("notes").and_then(|v| v.as_str());
            
            let _ = sqlx::query(
                "INSERT INTO sales (id, branch_id, customer_id, transaction_no, transaction_date, payment_method, total_amount, discount_amount, tax_amount, net_amount, paid_amount, change_amount, status, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET 
                 status=excluded.status, payment_method=excluded.payment_method, paid_amount=excluded.paid_amount, change_amount=excluded.change_amount, notes=excluded.notes"
            )
            .bind(id).bind(branch_id).bind(customer_id).bind(tx_no).bind(tx_date)
            .bind(method).bind(total).bind(disc).bind(tax).bind(net).bind(paid)
            .bind(change).bind(status).bind(notes)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "stock_ledger" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let item_id = payload.get("item_id").and_then(|v| v.as_str()).unwrap_or_default();
            let branch_id = payload.get("branch_id").and_then(|v| v.as_str()).unwrap_or_default();
            let tx_date = payload.get("transaction_date").and_then(|v| v.as_str()).unwrap_or_default();
            let source = payload.get("source_type").and_then(|v| v.as_str()).unwrap_or_default();
            let source_id = payload.get("source_id").and_then(|v| v.as_str()).unwrap_or_default();
            let qty = payload.get("qty_change").and_then(|v| v.as_f64()).unwrap_or_default();
            let hpp = payload.get("hpp_value").and_then(|v| v.as_f64()).unwrap_or_default();
            let notes = payload.get("notes").and_then(|v| v.as_str());

            let _ = sqlx::query(
                "INSERT INTO stock_ledger (id, item_id, branch_id, transaction_date, source_type, source_id, qty_change, hpp_value, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO NOTHING"
            )
            .bind(id).bind(item_id).bind(branch_id).bind(tx_date).bind(source)
            .bind(source_id).bind(qty).bind(hpp).bind(notes)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        _ => {}
    }

    Ok(())
}
