use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn reset_db_specific(target: String, state: State<'_, AppState>) -> Result<String, String> {
    // Disable FK checks so we can delete in any order
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    // ─── SALES ───────────────────────────────────────────────────────────
    if target == "sales" || target == "all" {
        // Returns first (depend on sale_lines and sales)
        let _ = sqlx::query("DELETE FROM sale_return_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM sale_returns").execute(&mut *tx).await;
        // Payments
        let _ = sqlx::query("DELETE FROM sale_payments").execute(&mut *tx).await;
        // Lines then header
        let _ = sqlx::query("DELETE FROM sale_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM sales").execute(&mut *tx).await;
        // Counters
        let _ = sqlx::query("DELETE FROM transaction_counters").execute(&mut *tx).await;
        // Journals
        let _ = sqlx::query("DELETE FROM journal_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM journal_entries").execute(&mut *tx).await;
    }

    // ─── INVENTORY / PURCHASING ──────────────────────────────────────────
    if target == "inventory" || target == "all" {
        // Stock ledger (depends on items + item_units)
        let _ = sqlx::query("DELETE FROM stock_ledger").execute(&mut *tx).await;
        // Opname (two possible table names from different migrations)
        let _ = sqlx::query("DELETE FROM stock_opname_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM stock_opname").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM stock_opnames").execute(&mut *tx).await; // migration 019
        // Purchase returns
        let _ = sqlx::query("DELETE FROM purchase_return_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM purchase_returns").execute(&mut *tx).await;
        // Purchase payments
        let _ = sqlx::query("DELETE FROM purchase_payments").execute(&mut *tx).await;
        // Purchase lines then header
        let _ = sqlx::query("DELETE FROM purchase_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM purchases").execute(&mut *tx).await;
        // PO lines then header
        let _ = sqlx::query("DELETE FROM po_lines").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM purchase_orders").execute(&mut *tx).await;
    }

    // ─── MASTER DATA (only on full wipe) ────────────────────────────────
    if target == "all" {
        // Promos
        let _ = sqlx::query("DELETE FROM promo_rewards").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM promo_conditions").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM promos").execute(&mut *tx).await;
        // Items (prices and units first)
        let _ = sqlx::query("DELETE FROM item_prices").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM item_units").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM items").execute(&mut *tx).await;
        // Master lookup tables
        let _ = sqlx::query("DELETE FROM categories").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM brands").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM suppliers").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM customers").execute(&mut *tx).await;
        let _ = sqlx::query("DELETE FROM members").execute(&mut *tx).await;
        // Sync queue
        let _ = sqlx::query("DELETE FROM sync_queue").execute(&mut *tx).await;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    // Re-enable FK checks
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    // Reclaim disk space
    let _ = sqlx::query("VACUUM").execute(&state.db_pool).await;
    let _ = sqlx::query("ANALYZE").execute(&state.db_pool).await;

    Ok(format!("Successfully reset target: {}", target))
}
