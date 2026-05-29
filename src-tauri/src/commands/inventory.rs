use crate::db::models::inventory::{
    LowStockAlert, StockLedger, StockMovementRow, StockOverviewRow,
};
use crate::AppState;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_stock_overview(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<StockOverviewRow>, String> {
    let query = r#"
        SELECT 
            i.id          AS item_id,
            i.name        AS item_name,
            i.sku,
            i.min_stock,
            i.has_expiry,
            i.hpp_method,
            c.name        AS category_name,
            iu.id         AS unit_id,
            iu.unit_name,
            COALESCE(SUM(
                CASE sl.direction
                    WHEN 'in'  THEN  sl.qty_change
                    WHEN 'out' THEN -sl.qty_change
                    ELSE 0.0
                END
            ), 0.0) AS current_qty,
            EXISTS(SELECT 1 FROM stock_ledger WHERE item_id = i.id) AS has_ledger_entries
        FROM items i
        LEFT JOIN item_units  iu ON iu.item_id = i.id AND iu.is_base = 1
        LEFT JOIN categories  c  ON c.id = i.category_id
        LEFT JOIN stock_ledger sl ON sl.item_id = i.id 
                                  AND sl.unit_id = iu.id
                                  AND sl.branch_id = ?
        WHERE i.is_active = 1
        GROUP BY i.id, iu.id
        ORDER BY i.name ASC
    "#;

    let rows = sqlx::query_as::<_, StockOverviewRow>(query)
        .bind(&branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    // Map and compute boolean in Rust
    let mapped_rows = rows
        .into_iter()
        .map(|mut r| {
            r.is_low_stock = r.current_qty <= r.min_stock;
            r
        })
        .collect();

    Ok(mapped_rows)
}

#[tauri::command]
pub async fn get_low_stock_alerts(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<LowStockAlert>, String> {
    let overview = get_stock_overview(branch_id, state).await?;

    let alerts = overview
        .into_iter()
        .filter(|r| r.is_low_stock)
        .map(|r| LowStockAlert {
            item_id: r.item_id,
            item_name: r.item_name,
            sku: r.sku,
            current_qty: r.current_qty,
            min_stock: r.min_stock,
            unit_name: r.unit_name.unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect();

    Ok(alerts)
}

#[tauri::command]
pub async fn get_stock_movements(
    item_id: String,
    branch_id: String,
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<StockMovementRow>, String> {
    // 1. Fetch ledger chronologically to compute running totals accurately
    let ledger_entries = sqlx::query_as::<_, StockLedger>(
        "SELECT * FROM stock_ledger WHERE item_id = ? AND branch_id = ? ORDER BY created_at ASC LIMIT ?"
    )
    .bind(&item_id).bind(&branch_id).bind(limit)
    .fetch_all(&state.db_pool).await.map_err(|e| e.to_string())?;

    let mut running_total = 0.0;
    let mut movements = Vec::new();

    for entry in ledger_entries {
        let change = if entry.direction == "out" {
            -entry.qty_change
        } else {
            entry.qty_change
        };
        running_total += change;

        movements.push(StockMovementRow {
            id: entry.id,
            direction: entry.direction,
            qty_change: change,
            source_type: entry.source_type,
            hpp_value: entry.hpp_value,
            expiry_date: entry.expiry_date,
            batch_no: entry.batch_no,
            notes: entry.notes,
            created_by_name: Some("System".to_string()), // Placeholder until Auth
            created_at: entry.created_at,
            running_total,
        });
    }

    // 2. Reverse for the UI so newest is on top
    movements.reverse();
    Ok(movements)
}

#[tauri::command]
pub async fn set_initial_stock(
    item_id: String,
    unit_id: String,
    branch_id: String,
    qty: f64,
    hpp_value: Option<f64>,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<StockLedger, String> {
    // Safety check: Ensure no ledger rows exist for this item+branch yet
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM stock_ledger WHERE item_id = ? AND branch_id = ?")
            .bind(&item_id)
            .bind(&branch_id)
            .fetch_one(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

    if count > 0 {
        return Err("Initial stock has already been set for this item.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, hpp_value, notes) 
           VALUES (?, ?, ?, ?, ?, 'in', 'initial', ?, ?)"#
    )
    .bind(&id).bind(&item_id).bind(&unit_id).bind(&branch_id).bind(qty.abs())
    .bind(&hpp_value).bind(&notes)
    .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, StockLedger>("SELECT * FROM stock_ledger WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn adjust_stock(
    item_id: String,
    unit_id: String,
    branch_id: String,
    qty: f64,
    direction: String,
    notes: Option<String>,
    created_by: Option<String>,
    state: State<'_, AppState>,
) -> Result<StockLedger, String> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, notes, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, 'adjustment', ?, ?)"#
    )
    .bind(&id).bind(&item_id).bind(&unit_id).bind(&branch_id).bind(qty.abs())
    .bind(&direction).bind(&notes).bind(&created_by)
    .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, StockLedger>("SELECT * FROM stock_ledger WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn apply_hpp_retroactive(
    method: String, // "avg", "fifo", "lifo"
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    // We don't actually recalculate all past sales here (that would alter past financial records, which is illegal in accounting).
    // Instead, we just reset the qty_consumed to 0 for all IN ledgers, then simulate past sales to consume them properly,
    // SO THAT future sales start from the correct remaining batch.

    // 1. Reset qty_consumed to 0 globally
    sqlx::query("UPDATE stock_ledger SET qty_consumed = 0 WHERE direction = 'in'")
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    if method == "fifo" || method == "lifo" {
        // 2. We need to "consume" the historical sales.
        // For each item, find total OUT qty, and consume the IN layers according to FIFO/LIFO.
        let items: Vec<String> = sqlx::query_scalar("SELECT id FROM items").fetch_all(&mut *tx).await.map_err(|e| e.to_string())?;

        for item_id in items {
            let total_out: Option<f64> = sqlx::query_scalar("SELECT SUM(qty_change) FROM stock_ledger WHERE item_id = ? AND direction = 'out'")
                .bind(&item_id)
                .fetch_optional(&mut *tx).await.unwrap_or(Some(0.0));
            
            let mut qty_to_consume = total_out.unwrap_or(0.0);
            if qty_to_consume <= 0.0 { continue; }

            let order_dir = if method == "lifo" { "DESC" } else { "ASC" };
            let query = format!(
                "SELECT id, qty_change FROM stock_ledger WHERE item_id = ? AND direction = 'in' ORDER BY created_at {}", order_dir
            );

            let in_layers: Vec<(String, f64)> = sqlx::query_as(&query)
                .bind(&item_id)
                .fetch_all(&mut *tx).await.unwrap_or_default();

            for (layer_id, layer_qty) in in_layers {
                if qty_to_consume <= 0.0 { break; }
                let consume = if layer_qty > qty_to_consume { qty_to_consume } else { layer_qty };
                qty_to_consume -= consume;
                
                let _ = sqlx::query("UPDATE stock_ledger SET qty_consumed = ? WHERE id = ?")
                    .bind(consume).bind(&layer_id)
                    .execute(&mut *tx).await;
            }
        }
    }

    // Update global setting
    sqlx::query("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('hpp_method', ?)")
        .bind(&method)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok("HPP recalculation successful. Stock layers updated.".to_string())
}

#[derive(serde::Deserialize)]
pub struct BulkStockInput {
    pub item_id: String,
    pub unit_id: String,
    pub qty_change: f64,
    pub hpp_value: Option<f64>,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn bulk_add_stock(
    branch_id: String,
    items: Vec<BulkStockInput>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    for item in items {
        let ledger_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, notes, hpp_value) VALUES (?, ?, ?, ?, ?, 'in', 'adjustment', ?, ?)"
        )
        .bind(ledger_id)
        .bind(&item.item_id)
        .bind(&item.unit_id)
        .bind(&branch_id)
        .bind(item.qty_change)
        .bind(&item.notes)
        .bind(item.hpp_value)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok("Bulk stock adjustment successful.".to_string())
}

#[tauri::command]
pub async fn create_opname_session(
    branch_id: String,
    created_by: Option<String>,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO stock_opnames (id, branch_id, status, notes, created_by) VALUES (?, ?, 'draft', ?, ?)")
        .bind(&id).bind(&branch_id).bind(&notes).bind(&created_by)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
    Ok(id)
}

#[derive(serde::Deserialize)]
pub struct OpnameLineInput {
    pub item_id: String,
    pub unit_id: String,
    pub actual_qty: f64,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn submit_opname_lines(
    opname_id: String,
    lines: Vec<OpnameLineInput>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
    
    // First, clear existing lines for this session if any
    sqlx::query("DELETE FROM stock_opname_lines WHERE opname_id = ?").bind(&opname_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;

    let opname: (String,) = sqlx::query_as("SELECT branch_id FROM stock_opnames WHERE id = ?")
        .bind(&opname_id).fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;
    let branch_id = opname.0;

    for line in lines {
        // Calculate expected qty
        let expected_qty: Option<f64> = sqlx::query_scalar(
            "SELECT SUM(CASE direction WHEN 'in' THEN qty_change WHEN 'out' THEN -qty_change ELSE 0 END) FROM stock_ledger WHERE item_id = ? AND branch_id = ?"
        ).bind(&line.item_id).bind(&branch_id).fetch_optional(&mut *tx).await.unwrap_or(Some(0.0));
        
        let expected = expected_qty.unwrap_or(0.0);
        let diff = line.actual_qty - expected;
        
        // HPP Value for diff
        let hpp: Option<f64> = sqlx::query_scalar("SELECT hpp_value FROM stock_ledger WHERE item_id = ? AND branch_id = ? ORDER BY created_at DESC LIMIT 1")
            .bind(&line.item_id).bind(&branch_id).fetch_optional(&mut *tx).await.unwrap_or(Some(0.0));
        
        let line_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO stock_opname_lines (id, opname_id, item_id, unit_id, expected_qty, actual_qty, diff_qty, hpp_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(line_id).bind(&opname_id).bind(&line.item_id).bind(&line.unit_id)
            .bind(expected).bind(line.actual_qty).bind(diff).bind(hpp.unwrap_or(0.0) * diff.abs()).bind(&line.notes)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn finalize_opname(
    opname_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
    
    // Get branch
    let opname: (String,) = sqlx::query_as("SELECT branch_id FROM stock_opnames WHERE id = ?")
        .bind(&opname_id).fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;
    let branch_id = opname.0;

    // Get lines
    #[derive(sqlx::FromRow)]
    struct LineRow { item_id: String, unit_id: String, diff_qty: f64, hpp_value: f64 }
    
    let lines = sqlx::query_as::<_, LineRow>("SELECT item_id, unit_id, diff_qty, hpp_value FROM stock_opname_lines WHERE opname_id = ? AND diff_qty != 0")
        .bind(&opname_id).fetch_all(&mut *tx).await.map_err(|e| e.to_string())?;

    for line in lines {
        let dir = if line.diff_qty > 0.0 { "in" } else { "out" };
        let qty = line.diff_qty.abs();
        let hpp = if line.diff_qty != 0.0 { line.hpp_value / qty } else { 0.0 };
        let ledger_id = Uuid::new_v4().to_string();
        
        sqlx::query("INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes, hpp_value) VALUES (?, ?, ?, ?, ?, ?, 'adjustment', ?, 'Stock Opname', ?)")
            .bind(ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&branch_id)
            .bind(qty).bind(dir).bind(&opname_id).bind(hpp)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    sqlx::query("UPDATE stock_opnames SET status = 'completed', completed_at = datetime('now') WHERE id = ?")
        .bind(&opname_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}
