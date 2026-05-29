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
            let total = payload.get("total_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let disc = payload.get("discount_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let tax = payload.get("tax_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let grand_total = payload.get("net_amount").and_then(|v| v.as_f64()).unwrap_or_default();
            let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or_default();
            let price_type = payload.get("price_type").and_then(|v| v.as_str()).unwrap_or_default();
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            
            let _ = sqlx::query(
                "INSERT INTO sales (id, branch_id, customer_id, transaction_no, user_id, total_amount, discount_amount, tax_amount, grand_total, status, price_type, notes, created_at)
                 VALUES (?, ?, ?, ?, 'system_sync', ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET 
                 status=excluded.status, notes=excluded.notes"
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
                 ON CONFLICT(id) DO UPDATE SET 
                 parent_id=excluded.parent_id, name=excluded.name, description=excluded.description, color=excluded.color"
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
            let barcode = payload.get("barcode").and_then(|v| v.as_str());
            let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or_default();
            let generic_name = payload.get("generic_name").and_then(|v| v.as_str());
            let category_id = payload.get("category_id").and_then(|v| v.as_str());
            let brand_id = payload.get("brand_id").and_then(|v| v.as_str());
            let hpp_method = payload.get("hpp_method").and_then(|v| v.as_str()).unwrap_or_default();
            let min_stock = payload.get("min_stock").and_then(|v| v.as_f64()).unwrap_or_default();
            let has_expiry = payload.get("has_expiry").and_then(|v| v.as_i64()).unwrap_or_default();
            let req_rx = payload.get("requires_prescription").and_then(|v| v.as_i64()).unwrap_or_default();
            let notes = payload.get("notes").and_then(|v| v.as_str());
            let is_active = payload.get("is_active").and_then(|v| v.as_i64()).unwrap_or_default();
            let wholesale_price = payload.get("wholesale_price").and_then(|v| v.as_f64()).unwrap_or_default();
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            
            let _ = sqlx::query(
                "INSERT INTO items (id, sku, barcode, name, generic_name, category_id, brand_id, hpp_method, min_stock, has_expiry, requires_prescription, notes, is_active, wholesale_price, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET 
                 sku=excluded.sku, barcode=excluded.barcode, name=excluded.name, generic_name=excluded.generic_name, category_id=excluded.category_id, brand_id=excluded.brand_id, hpp_method=excluded.hpp_method, min_stock=excluded.min_stock, has_expiry=excluded.has_expiry, requires_prescription=excluded.requires_prescription, notes=excluded.notes, is_active=excluded.is_active, wholesale_price=excluded.wholesale_price"
            )
            .bind(id).bind(sku).bind(barcode).bind(name).bind(generic_name)
            .bind(category_id).bind(brand_id).bind(hpp_method).bind(min_stock)
            .bind(has_expiry).bind(req_rx).bind(notes).bind(is_active)
            .bind(wholesale_price).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "item_units" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let item_id = payload.get("item_id").and_then(|v| v.as_str()).unwrap_or_default();
            let unit_name = payload.get("unit_name").and_then(|v| v.as_str()).unwrap_or_default();
            let conversion = payload.get("conversion").and_then(|v| v.as_f64()).unwrap_or_default();
            let is_base = payload.get("is_base").and_then(|v| v.as_i64()).unwrap_or_default();
            let barcode = payload.get("barcode").and_then(|v| v.as_str());
            let created_at = payload.get("created_at").and_then(|v| v.as_str()).unwrap_or_default();
            
            let _ = sqlx::query(
                "INSERT INTO item_units (id, item_id, unit_name, conversion, is_base, barcode, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET 
                 unit_name=excluded.unit_name, conversion=excluded.conversion, is_base=excluded.is_base, barcode=excluded.barcode"
            )
            .bind(id).bind(item_id).bind(unit_name).bind(conversion)
            .bind(is_base).bind(barcode).bind(created_at)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        "item_prices" => {
            let id = payload.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let item_id = payload.get("item_id").and_then(|v| v.as_str()).unwrap_or_default();
            let unit_id = payload.get("unit_id").and_then(|v| v.as_str()).unwrap_or_default();
            let customer_tier = payload.get("customer_tier").and_then(|v| v.as_str()).unwrap_or_default();
            let price = payload.get("price").and_then(|v| v.as_f64()).unwrap_or_default();
            
            let _ = sqlx::query(
                "INSERT INTO item_prices (id, item_id, unit_id, customer_tier, price, created_by)
                 VALUES (?, ?, ?, ?, ?, 'system_sync')
                 ON CONFLICT(id) DO UPDATE SET 
                 price=excluded.price"
            )
            .bind(id).bind(item_id).bind(unit_id).bind(customer_tier).bind(price)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
        }
        _ => {}
    }

    Ok(())
}
