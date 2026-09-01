use crate::db::models::purchasing::{PoLine, PoLineInput, PurchaseOrder, ReceiveLineInput};
use crate::AppState;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_purchase_orders(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<PurchaseOrder>, String> {
    let query = r#"
        SELECT po.*, s.name as supplier_name 
        FROM purchase_orders po 
        LEFT JOIN suppliers s ON po.supplier_id = s.id 
        WHERE po.branch_id = ? 
        ORDER BY po.created_at DESC
    "#;
    sqlx::query_as::<_, PurchaseOrder>(query)
        .bind(&branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_po_lines(
    po_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<PoLine>, String> {
    let query = r#"
        SELECT l.*, i.name as item_name, u.unit_name 
        FROM po_lines l 
        LEFT JOIN items i ON l.item_id = i.id 
        LEFT JOIN item_units u ON l.unit_id = u.id 
        WHERE l.po_id = ?
    "#;
    sqlx::query_as::<_, PoLine>(query)
        .bind(&po_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_purchase_order(
    branch_id: String,
    supplier_id: String,
    expected_date: Option<String>,
    notes: Option<String>,
    lines: Vec<PoLineInput>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let po_id = Uuid::new_v4().to_string();

    sqlx::query("INSERT INTO purchase_orders (id, branch_id, supplier_id, status, expected_date, notes) VALUES (?, ?, ?, 'sent', ?, ?)")
        .bind(&po_id).bind(&branch_id).bind(&supplier_id).bind(&expected_date).bind(&notes)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    for line in lines {
        let line_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO po_lines (id, po_id, item_id, unit_id, qty_ordered, qty_received, price_estimate) VALUES (?, ?, ?, ?, ?, 0, ?)")
            .bind(&line_id).bind(&po_id).bind(&line.item_id).bind(&line.unit_id).bind(line.qty).bind(line.price)
            .execute(&state.db_pool).await.map_err(|e| e.to_string())?;
    }
    Ok(po_id)
}

#[tauri::command]
pub async fn receive_goods(
    po_id: String,
    branch_id: String,
    supplier_id: String,
    invoice_no: Option<String>,
    lines: Vec<ReceiveLineInput>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // GUARD: Check if PO is already fully received or cancelled
    let current_status: String =
        sqlx::query_scalar("SELECT status FROM purchase_orders WHERE id = ?")
            .bind(&po_id)
            .fetch_one(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

    if current_status == "received" || current_status == "cancelled" {
        return Err(
            "Cannot receive goods against a finalized or cancelled Purchase Order.".to_string(),
        );
    }

    let purchase_id = Uuid::new_v4().to_string();
    let mut total_amount = 0.0;

    for line in &lines {
        total_amount += line.qty_received * line.price_per_unit;
    }

    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO purchases (id, po_id, branch_id, supplier_id, invoice_no, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, 'unpaid')")
        .bind(&purchase_id).bind(&po_id).bind(&branch_id).bind(&supplier_id).bind(&invoice_no).bind(total_amount)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for line in lines {
        if line.qty_received <= 0.0 {
            continue;
        }

        let line_id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO purchase_lines (id, purchase_id, item_id, unit_id, qty_received, price_per_unit, expiry_date, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&line_id).bind(&purchase_id).bind(&line.item_id).bind(&line.unit_id).bind(line.qty_received).bind(line.price_per_unit).bind(&line.expiry_date).bind(&line.batch_no)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        let hpp_method: String = sqlx::query_scalar("SELECT value FROM system_settings WHERE key = 'hpp_method'")
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None)
            .unwrap_or_else(|| "avg".to_string());

        let new_hpp = if hpp_method == "avg" {
            let (current_qty, last_hpp): (f64, f64) = sqlx::query_as::<_, (f64, f64)>(r#"
                SELECT
                    COALESCE(SUM(CASE direction WHEN 'in' THEN qty_change WHEN 'out' THEN -qty_change ELSE 0 END), 0),
                    COALESCE((SELECT hpp_value FROM stock_ledger
                               WHERE item_id = ? AND branch_id = ? AND hpp_value > 0
                               ORDER BY created_at DESC LIMIT 1), 0)
                FROM stock_ledger
                WHERE item_id = ? AND branch_id = ? AND unit_id = ?
            "#)
            .bind(&line.item_id).bind(&branch_id)
            .bind(&line.item_id).bind(&branch_id).bind(&line.unit_id)
            .fetch_one(&mut *tx).await.unwrap_or((0.0, 0.0));

            if current_qty + line.qty_received > 0.0 {
                (current_qty * last_hpp + line.qty_received * line.price_per_unit)
                    / (current_qty + line.qty_received)
            } else {
                line.price_per_unit
            }
        } else {
            line.price_per_unit
        };

        let ledger_id = Uuid::new_v4().to_string();
        let notes = format!(
            "PO Receipt {}",
            invoice_no.clone().unwrap_or_else(|| "N/A".to_string())
        );
        sqlx::query(
            "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, hpp_value, expiry_date, batch_no, notes) 
             VALUES (?, ?, ?, ?, ?, 'in', 'purchase', ?, ?, ?, ?, ?)"
        )
        .bind(&ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&branch_id).bind(line.qty_received)
        .bind(&purchase_id).bind(new_hpp).bind(&line.expiry_date).bind(&line.batch_no).bind(&notes)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        if let Some(ref po_line_id) = line.po_line_id {
            sqlx::query("UPDATE po_lines SET qty_received = qty_received + ? WHERE id = ?")
                .bind(line.qty_received)
                .bind(po_line_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    let unfulfilled_lines: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM po_lines WHERE po_id = ? AND qty_received < qty_ordered",
    )
    .bind(&po_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let new_status = if unfulfilled_lines > 0 {
        "partial"
    } else {
        "received"
    };

    sqlx::query("UPDATE purchase_orders SET status = ? WHERE id = ?")
        .bind(new_status)
        .bind(&po_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let inv_account_id: Option<String> = sqlx::query_scalar("SELECT id FROM accounts WHERE code = '1-1200'")
        .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
    let ap_account_id: Option<String> = sqlx::query_scalar("SELECT id FROM accounts WHERE code = '2-2000'")
        .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;

    if let (Some(inv_id), Some(ap_id)) = (inv_account_id, ap_account_id) {
        if total_amount > 0.0 {
            crate::commands::accounting::post_journal(
                &mut tx,
                "purchase",
                &purchase_id,
                Some(&branch_id),
                &format!("Penerimaan Barang PO {}", po_id),
                vec![
                    (inv_id.as_str(), total_amount, 0.0, None),
                    (ap_id.as_str(), 0.0, total_amount, None),
                ]
            ).await?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(purchase_id)
}

#[tauri::command]
pub async fn receive_goods_direct(
    branch_id: String,
    supplier_id: String,
    invoice_no: Option<String>,
    lines: Vec<ReceiveLineInput>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if lines.is_empty() {
        return Err("Harus memasukkan minimal 1 item pembelian.".to_string());
    }

    let purchase_id = Uuid::new_v4().to_string();
    let mut total_amount = 0.0;

    for line in &lines {
        total_amount += line.qty_received * line.price_per_unit;
    }

    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO purchases (id, po_id, branch_id, supplier_id, invoice_no, total_amount, status) VALUES (?, NULL, ?, ?, ?, ?, 'unpaid')")
        .bind(&purchase_id).bind(&branch_id).bind(&supplier_id).bind(&invoice_no).bind(total_amount)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for line in lines {
        if line.qty_received <= 0.0 {
            continue;
        }

        let line_id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO purchase_lines (id, purchase_id, item_id, unit_id, qty_received, price_per_unit, expiry_date, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&line_id).bind(&purchase_id).bind(&line.item_id).bind(&line.unit_id).bind(line.qty_received).bind(line.price_per_unit).bind(&line.expiry_date).bind(&line.batch_no)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        let hpp_method: String = sqlx::query_scalar("SELECT value FROM system_settings WHERE key = 'hpp_method'")
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None)
            .unwrap_or_else(|| "avg".to_string());

        let new_hpp = if hpp_method == "avg" {
            let (current_qty, last_hpp): (f64, f64) = sqlx::query_as::<_, (f64, f64)>(r#"
                SELECT
                    COALESCE(SUM(CASE direction WHEN 'in' THEN qty_change WHEN 'out' THEN -qty_change ELSE 0 END), 0),
                    COALESCE((SELECT hpp_value FROM stock_ledger
                               WHERE item_id = ? AND branch_id = ? AND hpp_value > 0
                               ORDER BY created_at DESC LIMIT 1), 0)
                FROM stock_ledger
                WHERE item_id = ? AND branch_id = ? AND unit_id = ?
            "#)
            .bind(&line.item_id).bind(&branch_id)
            .bind(&line.item_id).bind(&branch_id).bind(&line.unit_id)
            .fetch_one(&mut *tx).await.unwrap_or((0.0, 0.0));

            if current_qty + line.qty_received > 0.0 {
                (current_qty * last_hpp + line.qty_received * line.price_per_unit)
                    / (current_qty + line.qty_received)
            } else {
                line.price_per_unit
            }
        } else {
            line.price_per_unit
        };

        let ledger_id = Uuid::new_v4().to_string();
        let notes = format!(
            "Penerimaan Langsung {}",
            invoice_no.clone().unwrap_or_else(|| "N/A".to_string())
        );
        sqlx::query(
            "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, hpp_value, expiry_date, batch_no, notes) 
             VALUES (?, ?, ?, ?, ?, 'in', 'purchase', ?, ?, ?, ?, ?)"
        )
        .bind(&ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&branch_id).bind(line.qty_received)
        .bind(&purchase_id).bind(new_hpp).bind(&line.expiry_date).bind(&line.batch_no).bind(&notes)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    let inv_account_id: Option<String> = sqlx::query_scalar("SELECT id FROM accounts WHERE code = '1-1200'")
        .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
    let ap_account_id: Option<String> = sqlx::query_scalar("SELECT id FROM accounts WHERE code = '2-2000'")
        .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;

    if let (Some(inv_id), Some(ap_id)) = (inv_account_id, ap_account_id) {
        if total_amount > 0.0 {
            let memo = format!("Penerimaan Langsung {}", invoice_no.clone().unwrap_or_else(|| "N/A".to_string()));
            crate::commands::accounting::post_journal(
                &mut tx,
                "purchase",
                &purchase_id,
                Some(&branch_id),
                &memo,
                vec![
                    (inv_id.as_str(), total_amount, 0.0, None),
                    (ap_id.as_str(), 0.0, total_amount, None),
                ]
            ).await?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(purchase_id)
}

#[tauri::command]
pub async fn add_purchase_payment(
    purchase_id: String,
    amount: f64,
    method: String,
    reference: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO purchase_payments (id, purchase_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)")
        .bind(id).bind(&purchase_id).bind(amount).bind(&method).bind(&reference)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    // Update Purchase status if paid in full
    sqlx::query("UPDATE purchases SET status = 'paid' WHERE id = ? AND (SELECT SUM(amount) FROM purchase_payments WHERE purchase_id = ?) >= total_amount")
        .bind(&purchase_id).bind(&purchase_id)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_purchase_return(
    purchase_id: String,
    lines: Vec<ReceiveLineInput>,
    reason: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let return_id = Uuid::new_v4().to_string();
    let purchase = sqlx::query_as::<_, crate::db::models::purchasing::Purchase>(
        "SELECT * FROM purchases WHERE id = ?",
    )
    .bind(&purchase_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO purchase_returns (id, purchase_id, supplier_id, branch_id, reason) VALUES (?, ?, ?, ?, ?)")
        .bind(&return_id).bind(&purchase_id).bind(&purchase.supplier_id).bind(&purchase.branch_id).bind(&reason)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for line in lines {
        // Validate return quantity against received - already returned
        let original_qty: f64 = sqlx::query_scalar(
            "SELECT qty_received FROM purchase_lines WHERE purchase_id = ? AND item_id = ?",
        )
        .bind(&purchase_id)
        .bind(&line.item_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Get total returned qty for this purchase and item
        let returned_qty: f64 = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(sl.qty_change), 0) 
            FROM stock_ledger sl
            JOIN purchase_returns pr ON sl.source_id = pr.id
            WHERE pr.purchase_id = ? AND sl.item_id = ? AND sl.source_type = 'purchase_return'
            "#,
        )
        .bind(&purchase_id)
        .bind(&line.item_id)
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0.0);

        if line.qty_received > (original_qty - returned_qty) {
            return Err(format!(
                "Cannot return more than received minus already returned ({} units available)",
                original_qty - returned_qty
            ));
        }

        // Reverse the stock ledger: OUT because we are returning it
        let ledger_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes) VALUES (?, ?, ?, ?, ?, 'out', 'purchase_return', ?, ?)")
            .bind(ledger_id).bind(line.item_id).bind(line.unit_id).bind(&purchase.branch_id).bind(line.qty_received).bind(&return_id).bind("Return to supplier")
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_purchases(
    branch_id: String,
    supplier_id: Option<String>,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<crate::db::models::purchasing::Purchase>, String> {
    let mut query_str = String::from("SELECT * FROM purchases WHERE branch_id = ?");
    if supplier_id.is_some() {
        query_str.push_str(" AND supplier_id = ?");
    }
    if status.is_some() {
        query_str.push_str(" AND status = ?");
    }
    query_str.push_str(" ORDER BY created_at DESC");

    let mut query =
        sqlx::query_as::<_, crate::db::models::purchasing::Purchase>(&query_str).bind(&branch_id);
    if let Some(ref sid) = supplier_id {
        query = query.bind(sid);
    }
    if let Some(ref s) = status {
        query = query.bind(s);
    }

    query
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_purchase_detail(
    id: String,
    state: State<'_, AppState>,
) -> Result<crate::db::models::purchasing::PurchaseDetail, String> {
    let purchase = sqlx::query_as::<_, crate::db::models::purchasing::Purchase>(
        "SELECT * FROM purchases WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let lines = sqlx::query_as::<_, crate::db::models::purchasing::PurchaseLine>(
        r#"SELECT pl.*, i.name as item_name, u.unit_name 
           FROM purchase_lines pl
           LEFT JOIN items i ON pl.item_id = i.id
           LEFT JOIN item_units u ON pl.unit_id = u.id
           WHERE pl.purchase_id = ?"#,
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let payments = sqlx::query_as::<_, crate::db::models::purchasing::PurchasePayment>(
        "SELECT * FROM purchase_payments WHERE purchase_id = ? ORDER BY created_at ASC",
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let returns = sqlx::query_as::<_, crate::db::models::purchasing::PurchaseReturn>(
        "SELECT * FROM purchase_returns WHERE purchase_id = ?",
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(crate::db::models::purchasing::PurchaseDetail {
        purchase,
        lines,
        payments,
        returns,
    })
}

#[tauri::command]
pub async fn cancel_purchase_order(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Only allow cancelling if status is not 'received'
    let current_status: String = sqlx::query_scalar("SELECT status FROM purchase_orders WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if current_status == "received" {
        return Err("Cannot cancel a purchase order that has already been received.".to_string());
    }

    sqlx::query("UPDATE purchase_orders SET status = 'cancelled' WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
