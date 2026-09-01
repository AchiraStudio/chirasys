// fallow-ignore-file unused-file
const fs = require('fs');

const code = `
// ─────────────────────────────────────────────────────────────────────────────
// Background Pull Worker
// ─────────────────────────────────────────────────────────────────────────────

pub fn spawn_pull_worker(pool: SqlitePool) {
    tokio::spawn(async move {
        // Delay startup so we don't hammer the network immediately
        tokio::time::sleep(tokio::time::Duration::from_secs(12)).await;
        let _ = dotenvy::dotenv();

        let supabase_url = std::env::var("SUPABASE_URL").unwrap_or_default();
        let supabase_key = std::env::var("SUPABASE_KEY").unwrap_or_default();

        if supabase_url.is_empty() || supabase_key.is_empty() {
            println!("⚠️  Pull worker stopped: SUPABASE_URL or SUPABASE_KEY not set.");
            return;
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        println!("📥 Cloud Pull Worker started...");

        let tables = vec![
            "customers", "suppliers", 
            "purchase_orders", "po_lines", "purchases", "purchase_lines", "purchase_payments", "purchase_returns", "purchase_return_lines",
            "promos", "promo_bogo_rules", "promo_tiers", "promo_bundle_items",
            "accounts", "journal_entries", "journal_lines",
            "sales", "sale_lines", "sale_payments", "sale_returns", "sale_return_lines",
            "stock_opname", "stock_opname_lines",
            "stock_ledger", "items", "item_units", "item_prices", "categories", "brands"
        ];

        loop {
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
                                    if row_updated_at > &max_updated_at {
                                        max_updated_at = row_updated_at.to_string();
                                    }
                                }
                                
                                // Apply to local DB
                                let _ = apply_cloud_sync(&pool, table, &row).await;
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
`;

fs.appendFileSync('src-tauri/src/commands/sync.rs', code);
