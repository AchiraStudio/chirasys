use crate::db::models::sales::{CreateSaleInput, Sale};
use crate::AppState;
use tauri::State;
use uuid::Uuid;
use chrono::Local;

#[tauri::command]
pub async fn get_next_transaction_no(branch_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let date_str = Local::now().format("%Y%m%d").to_string();
    let display_date = Local::now().format("%y%m").to_string();
    
    // Using an explicit transaction to ensure atomic increment or INSERT OR REPLACE
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
    
    // SQLite 3.35+ supports RETURNING
    let current: Option<i64> = sqlx::query_scalar(
        "UPDATE transaction_counters SET counter = counter + 1 WHERE branch_id = ? AND date_str = ? RETURNING counter"
    )
    .bind(&branch_id)
    .bind(&date_str)
    .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;

    let counter = if let Some(c) = current {
        c
    } else {
        // If not found, insert 1
        sqlx::query("INSERT INTO transaction_counters (branch_id, date_str, counter) VALUES (?, ?, 1)")
            .bind(&branch_id)
            .bind(&date_str)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        1
    };

    tx.commit().await.map_err(|e| e.to_string())?;

    // Format: 0001/KSR/2605
    Ok(format!("{:04}/KSR/{}", counter, display_date))
}

#[tauri::command]
pub async fn create_sale(input: CreateSaleInput, state: State<'_, AppState>) -> Result<String, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let sale_id = Uuid::new_v4().to_string();
    
    // Get transaction number within this transaction to be safe? 
    // We can do it inline to avoid dropping the `tx` reference
    let date_str = Local::now().format("%Y%m%d").to_string();
    let display_date = Local::now().format("%y%m").to_string();
    let current: Option<i64> = sqlx::query_scalar("UPDATE transaction_counters SET counter = counter + 1 WHERE branch_id = ? AND date_str = ? RETURNING counter")
        .bind(&input.branch_id).bind(&date_str)
        .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
    let counter = if let Some(c) = current { c } else {
        sqlx::query("INSERT INTO transaction_counters (branch_id, date_str, counter) VALUES (?, ?, 1)")
            .bind(&input.branch_id).bind(&date_str)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        1
    };
    let transaction_no = format!("{:04}/KSR/{}", counter, display_date);

    sqlx::query(
        r#"INSERT INTO sales (id, transaction_no, branch_id, customer_id, user_id, total_amount, discount_amount, tax_amount, grand_total, status, price_type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)"#
    )
    .bind(&sale_id).bind(&transaction_no).bind(&input.branch_id).bind(&input.customer_id).bind(&input.user_id)
    .bind(input.total_amount).bind(input.discount_amount).bind(input.tax_amount).bind(input.grand_total)
    .bind(&input.price_type).bind(&input.notes)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for line in input.lines {
        let line_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"INSERT INTO sale_lines (id, sale_id, item_id, unit_id, qty, price_type, price, discount_amount, subtotal, hpp_value)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
        )
        .bind(&line_id).bind(&sale_id).bind(&line.item_id).bind(&line.unit_id)
        .bind(line.qty).bind(&line.price_type).bind(line.price).bind(line.discount_amount)
        .bind(line.qty * line.price - line.discount_amount).bind(line.hpp_value)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Update Stock Ledger (OUT)
        let ledger_id = Uuid::new_v4().to_string();
        let notes = format!("Sale {}", transaction_no);
        sqlx::query(
            "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes) VALUES (?, ?, ?, ?, ?, 'out', 'sale', ?, ?)"
        )
        .bind(ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&input.branch_id)
        .bind(line.qty).bind(&sale_id).bind(&notes)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for payment in input.payments {
        let payment_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sale_payments (id, sale_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&payment_id).bind(&sale_id).bind(payment.amount).bind(&payment.method).bind(&payment.reference)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(sale_id)
}

#[tauri::command]
pub async fn get_sales(branch_id: String, state: State<'_, AppState>) -> Result<Vec<Sale>, String> {
    sqlx::query_as::<_, Sale>("SELECT * FROM sales WHERE branch_id = ? ORDER BY created_at DESC")
        .bind(&branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sale_detail(id: String, state: State<'_, AppState>) -> Result<crate::db::models::sales::SaleDetail, String> {
    let sale = sqlx::query_as::<_, Sale>("SELECT * FROM sales WHERE id = ?")
        .bind(&id).fetch_one(&state.db_pool).await.map_err(|e| e.to_string())?;

    let lines = sqlx::query_as::<_, crate::db::models::sales::SaleLine>(
        r#"SELECT sl.*, i.name as item_name, u.unit_name 
           FROM sale_lines sl
           LEFT JOIN items i ON sl.item_id = i.id
           LEFT JOIN item_units u ON sl.unit_id = u.id
           WHERE sl.sale_id = ?"#
    ).bind(&id).fetch_all(&state.db_pool).await.map_err(|e| e.to_string())?;

    let payments = sqlx::query_as::<_, crate::db::models::sales::SalePayment>(
        "SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY created_at ASC"
    ).bind(&id).fetch_all(&state.db_pool).await.map_err(|e| e.to_string())?;

    Ok(crate::db::models::sales::SaleDetail { sale, lines, payments })
}

#[tauri::command]
pub async fn create_sale_return(sale_id: String, lines: Vec<crate::db::models::sales::SaleLineInput>, reason: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let return_id = Uuid::new_v4().to_string();
    let sale = sqlx::query_as::<_, Sale>("SELECT * FROM sales WHERE id = ?")
        .bind(&sale_id).fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO sale_returns (id, sale_id, branch_id, reason) VALUES (?, ?, ?, ?)")
        .bind(&return_id).bind(&sale_id).bind(&sale.branch_id).bind(&reason)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for line in lines {
        let line_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO sale_return_lines (id, return_id, item_id, unit_id, qty) VALUES (?, ?, ?, ?, ?)")
            .bind(&line_id).bind(&return_id).bind(&line.item_id).bind(&line.unit_id).bind(line.qty)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Reverse stock ledger (IN)
        let ledger_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes) VALUES (?, ?, ?, ?, ?, 'in', 'sale_return', ?, ?)")
            .bind(ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&sale.branch_id).bind(line.qty).bind(&return_id).bind("Customer return")
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

