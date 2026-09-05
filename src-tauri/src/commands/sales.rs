use crate::db::models::sales::{CreateSaleInput, Sale};
use crate::AppState;
use chrono::Local;
use tauri::State;
use uuid::Uuid;

pub async fn generate_unique_transaction_no(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    branch_id: &str,
) -> Result<String, String> {
    // 1. Determine monthly period identifier e.g. "202609" and short format "2609"
    let date_str = Local::now().format("%Y%m").to_string();
    let display_date = Local::now().format("%y%m").to_string();

    // 2. Fetch current counter for this branch and month, or initialize
    let mut counter: i64 = match sqlx::query_scalar::<_, i64>(
        "SELECT counter FROM transaction_counters WHERE branch_id = ? AND date_str = ?"
    )
    .bind(branch_id)
    .bind(&date_str)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())? {
        Some(c) => c,
        None => 0,
    };

    // 3. Increment and verify uniqueness against existing sales
    loop {
        counter += 1;
        let candidate_no = format!("{:04}/KSR/{}", counter, display_date);

        let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM sales WHERE transaction_no = ?")
            .bind(&candidate_no)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

        if exists.is_none() {
            // Update counter in transaction_counters table
            sqlx::query(
                "INSERT INTO transaction_counters (branch_id, date_str, counter) VALUES (?, ?, ?)
                 ON CONFLICT(branch_id, date_str) DO UPDATE SET counter = excluded.counter"
            )
            .bind(branch_id)
            .bind(&date_str)
            .bind(counter)
            .execute(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

            return Ok(candidate_no);
        }
    }
}

#[tauri::command]
pub async fn get_next_transaction_no(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let display_date = Local::now().format("%y%m").to_string();
    let date_str = Local::now().format("%Y%m").to_string();

    let mut counter: i64 = sqlx::query_scalar(
        "SELECT counter FROM transaction_counters WHERE branch_id = ? AND date_str = ?"
    )
    .bind(&branch_id)
    .bind(&date_str)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or(0);

    // Preview next available number without committing
    loop {
        counter += 1;
        let candidate_no = format!("{:04}/KSR/{}", counter, display_date);
        let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM sales WHERE transaction_no = ?")
            .bind(&candidate_no)
            .fetch_optional(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

        if exists.is_none() {
            return Ok(candidate_no);
        }
    }
}

#[tauri::command]
pub async fn create_sale(
    input: CreateSaleInput,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let sale_id = Uuid::new_v4().to_string();

    // 1. Resolve and validate branch_id against branches table
    let valid_branch_id: String = {
        let exists: Option<String> = sqlx::query_scalar("SELECT id FROM branches WHERE id = ?")
            .bind(&input.branch_id)
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None);
        if let Some(b) = exists {
            b
        } else {
            let first_branch: Option<String> = sqlx::query_scalar("SELECT id FROM branches LIMIT 1")
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);
            match first_branch {
                Some(b) => b,
                None => {
                    let _ = sqlx::query("INSERT OR IGNORE INTO branches (id, name, mode) VALUES ('branch_001', 'ChiraSys Main HQ', 'local')")
                        .execute(&mut *tx)
                        .await;
                    "branch_001".to_string()
                }
            }
        }
    };

    let transaction_no = generate_unique_transaction_no(&mut tx, &valid_branch_id).await?;

    // 2. Resolve and validate user_id against users table
    let valid_user_id: Option<String> = if let Some(ref uid) = input.user_id {
        let trimmed = uid.trim();
        if trimmed.is_empty() {
            None
        } else {
            let exists: Option<String> = sqlx::query_scalar("SELECT id FROM users WHERE id = ?")
                .bind(trimmed)
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);
            if exists.is_some() {
                Some(trimmed.to_string())
            } else {
                sqlx::query_scalar("SELECT id FROM users LIMIT 1")
                    .fetch_optional(&mut *tx)
                    .await
                    .unwrap_or(None)
            }
        }
    } else {
        sqlx::query_scalar("SELECT id FROM users LIMIT 1")
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None)
    };

    // 3. Resolve and validate customer_id against customers table
    let valid_customer_id: Option<String> = if let Some(ref cid) = input.customer_id {
        let trimmed = cid.trim();
        if trimmed.is_empty() {
            None
        } else {
            let exists: Option<String> = sqlx::query_scalar("SELECT id FROM customers WHERE id = ?")
                .bind(trimmed)
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);
            if exists.is_some() {
                Some(trimmed.to_string())
            } else {
                None
            }
        }
    } else {
        None
    };

    // Call discount engine for double-checking and applying promos
    let lines_for_discount = input
        .lines
        .iter()
        .enumerate()
        .map(|(i, l)| crate::db::models::promos::CartLineForDiscount {
            item_id: l.item_id.clone(),
            unit_id: l.unit_id.clone(),
            category_id: None,
            qty: l.qty,
            price: l.price,
            line_index: i,
        })
        .collect();

    // Get customer tier if not walk-in
    let customer_tier = if let Some(ref cid) = valid_customer_id {
        let member: Option<i64> = sqlx::query_scalar("SELECT 1 FROM members WHERE customer_id = ?")
            .bind(cid)
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None);

        if member.is_some() {
            Some("member".to_string())
        } else {
            Some("regular".to_string())
        }
    } else {
        None
    };

    let discount_res = crate::commands::promos::calculate_discounts_internal(
        &state.db_pool,
        lines_for_discount,
        customer_tier,
    )
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"INSERT INTO sales (id, transaction_no, branch_id, customer_id, user_id, total_amount, discount_amount, tax_amount, grand_total, status, price_type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)"#
    )
    .bind(&sale_id).bind(&transaction_no).bind(&valid_branch_id).bind(&valid_customer_id).bind(&valid_user_id)
    .bind(input.total_amount).bind(input.discount_amount).bind(input.tax_amount).bind(input.grand_total)
    .bind(&input.price_type).bind(&input.notes)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    // Record applied promos (only if promo_id actually exists in promos table)
    for applied in discount_res.line_discounts {
        let promo_exists: Option<String> = sqlx::query_scalar("SELECT id FROM promos WHERE id = ?")
            .bind(&applied.promo_id)
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None);
        if let Some(pid) = promo_exists {
            let spa_id = Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO sale_promo_applications (id, sale_id, promo_id, discount_amount, applied_to) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(&spa_id).bind(&sale_id).bind(&pid).bind(applied.discount_amount).bind("line_id_placeholder")
            .execute(&mut *tx).await;
        }
    }

    if discount_res.cart_discount > 0.0 {
        if let Some(ref pid) = discount_res.cart_discount_promo_id {
            let promo_exists: Option<String> = sqlx::query_scalar("SELECT id FROM promos WHERE id = ?")
                .bind(pid)
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);
            if let Some(p) = promo_exists {
                let spa_id = Uuid::new_v4().to_string();
                let _ = sqlx::query(
                    "INSERT INTO sale_promo_applications (id, sale_id, promo_id, discount_amount, applied_to) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(&spa_id).bind(&sale_id).bind(&p).bind(discount_res.cart_discount).bind("cart")
                .execute(&mut *tx).await;
            }
        }
    }

    // Fetch global HPP method
    let hpp_method: String = sqlx::query_scalar("SELECT value FROM system_settings WHERE key = 'hpp_method'")
        .fetch_optional(&mut *tx).await.unwrap_or(None).unwrap_or_else(|| "avg".to_string());

    let mut actual_cogs_total = 0.0;

    for line in &input.lines {
        // Validate and resolve unit_id in item_units table
        let valid_unit_id: String = {
            let unit_exists: Option<String> = sqlx::query_scalar("SELECT id FROM item_units WHERE id = ?")
                .bind(&line.unit_id)
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);

            if let Some(uid) = unit_exists {
                uid
            } else {
                let item_unit: Option<String> = sqlx::query_scalar(
                    "SELECT id FROM item_units WHERE item_id = ? ORDER BY is_base DESC LIMIT 1"
                )
                .bind(&line.item_id)
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);

                if let Some(uid) = item_unit {
                    uid
                } else {
                    let new_uid = Uuid::new_v4().to_string();
                    let _ = sqlx::query(
                        "INSERT INTO item_units (id, item_id, name, conversion, is_base) VALUES (?, ?, 'PCS', 1.0, 1)"
                    )
                    .bind(&new_uid)
                    .bind(&line.item_id)
                    .execute(&mut *tx)
                    .await;
                    new_uid
                }
            }
        };

        let mut line_hpp_value = line.hpp_value; // fallback to frontend value

        if hpp_method == "avg" {
            // Keep using the latest moving average from ledger or frontend
            let latest_hpp: Option<f64> = sqlx::query_scalar(
                "SELECT hpp_value FROM stock_ledger WHERE item_id = ? AND hpp_value > 0 ORDER BY created_at DESC LIMIT 1"
            )
            .bind(&line.item_id)
            .fetch_optional(&mut *tx).await.unwrap_or(None);
            
            if let Some(h) = latest_hpp {
                line_hpp_value = h;
            }
        } else {
            // FIFO or LIFO
            let order_dir = if hpp_method == "lifo" { "DESC" } else { "ASC" };
            let query = format!(
                "SELECT id, (qty_change - qty_consumed) as remaining, hpp_value 
                 FROM stock_ledger 
                 WHERE item_id = ? AND branch_id = ? AND direction = 'in' AND (qty_change - qty_consumed) > 0 
                 ORDER BY created_at {}", order_dir
            );
            
            let layers: Vec<(String, f64, f64)> = sqlx::query_as(&query)
                .bind(&line.item_id).bind(&valid_branch_id)
                .fetch_all(&mut *tx).await.unwrap_or_default();

            let mut qty_to_consume = line.qty;
            let mut total_cost_for_line = 0.0;

            for (layer_id, remaining, cost) in layers {
                if qty_to_consume <= 0.0 { break; }
                
                let consume = if remaining > qty_to_consume { qty_to_consume } else { remaining };
                total_cost_for_line += consume * cost;
                qty_to_consume -= consume;

                let _ = sqlx::query("UPDATE stock_ledger SET qty_consumed = qty_consumed + ? WHERE id = ?")
                    .bind(consume).bind(&layer_id)
                    .execute(&mut *tx).await;
            }
            
            // If there's still qty_to_consume (selling more than we have layers for), use the last known cost for the remainder
            if qty_to_consume > 0.0 {
                let ledger_fallback: Option<f64> = sqlx::query_scalar(
                    "SELECT hpp_value FROM stock_ledger WHERE item_id = ? AND hpp_value > 0 ORDER BY created_at DESC LIMIT 1"
                )
                .bind(&line.item_id)
                .fetch_optional(&mut *tx).await.unwrap_or(None);

                let fallback = ledger_fallback.unwrap_or(if line_hpp_value > 0.0 { line_hpp_value } else { 0.0 });
                total_cost_for_line += qty_to_consume * fallback;
            }

            // Average out the HPP for this specific sale line record
            if line.qty > 0.0 {
                line_hpp_value = total_cost_for_line / line.qty;
            }
        }

        actual_cogs_total += line.qty * line_hpp_value;

        let line_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"INSERT INTO sale_lines (id, sale_id, item_id, unit_id, qty, price_type, price, discount_amount, subtotal, hpp_value)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
        )
        .bind(&line_id).bind(&sale_id).bind(&line.item_id).bind(&valid_unit_id)
        .bind(line.qty).bind(&line.price_type).bind(line.price).bind(line.discount_amount)
        .bind(line.qty * line.price - line.discount_amount).bind(line_hpp_value)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Update Stock Ledger (OUT)
        let ledger_id = Uuid::new_v4().to_string();
        let notes = format!("Sale {}", transaction_no);
        sqlx::query(
            "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes, hpp_value) VALUES (?, ?, ?, ?, ?, 'out', 'sale', ?, ?, ?)"
        )
        .bind(ledger_id).bind(&line.item_id).bind(&valid_unit_id).bind(&valid_branch_id)
        .bind(line.qty).bind(&sale_id).bind(&notes).bind(line_hpp_value)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // Record Payments
    for payment in &input.payments {
        let payment_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sale_payments (id, sale_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&payment_id).bind(&sale_id).bind(payment.amount).bind(&payment.method).bind(&payment.reference)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // -----------------------------------------------------
    // POST JOURNAL (Double Entry Accounting)
    // -----------------------------------------------------
    let mut journal_lines = Vec::new();

    let tax_mode: String = sqlx::query_scalar("SELECT value FROM system_settings WHERE key = 'tax_mode'")
        .fetch_optional(&mut *tx).await.unwrap_or(None).unwrap_or_else(|| "none".to_string());

    let mut actual_sales_revenue = input.total_amount;
    if tax_mode == "include" && input.tax_amount > 0.0 {
        actual_sales_revenue -= input.tax_amount;
    }

    // 1. Credit Sales (Income) -> grand_total before discount if using full price logic, but simpler:
    // Actually, Penjualan is total_amount (before tax/discount), adjusted for include tax
    journal_lines.push(("acc_sales", 0.0, actual_sales_revenue, Some("Sales Revenue")));

    // 2. Debit Diskon Penjualan (Expense/Contra-Revenue)
    if input.discount_amount > 0.0 {
        journal_lines.push((
            "acc_disc",
            input.discount_amount,
            0.0,
            Some("Sales Discount"),
        ));
    }
    
    // 2.5 Credit Tax Payable (Liability)
    if input.tax_amount > 0.0 {
        journal_lines.push((
            "acc_tax",
            0.0,
            input.tax_amount,
            Some("Tax Payable"),
        ));
    }

    // 3. Debit Bank/Kas (Assets) based on payments
    for p in &input.payments {
        let acc = if p.method == "cash" {
            "acc_kas"
        } else {
            "acc_bank"
        };
        journal_lines.push((acc, p.amount, 0.0, Some("Payment Received")));
    }

    // Note: If payments don't match grand_total (e.g. they paid less, the rest is AR)
    let total_paid: f64 = input.payments.iter().map(|p| p.amount).sum();
    let change = total_paid - input.grand_total;
    // In POS we assume total_paid >= grand_total, and change is given back in cash
    if change > 0.0 {
        journal_lines.push(("acc_kas", 0.0, change, Some("Change Given")));
    } else if change < -0.01 {
        // Underpaid -> Accounts Receivable
        journal_lines.push((
            "acc_ar",
            input.grand_total - total_paid,
            0.0,
            Some("Accounts Receivable"),
        ));
    }

    // 4. COGS (Debit) and Inventory (Credit)
    let total_cogs = actual_cogs_total;
    if total_cogs > 0.0 {
        journal_lines.push(("acc_cogs", total_cogs, 0.0, Some("Cost of Goods Sold")));
        journal_lines.push(("acc_inv", 0.0, total_cogs, Some("Inventory Out")));
    }

    let notes = format!("Sale {}", transaction_no);
    if let Err(e) = crate::commands::accounting::post_journal(
        &mut tx,
        "sale",
        &sale_id,
        Some(&valid_branch_id),
        &notes,
        journal_lines,
    )
    .await {
        eprintln!("⚠️ [Sale Accounting] Non-fatal journal posting error: {}", e);
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(sale_id)
}

#[tauri::command]
pub async fn get_sales(branch_id: String, customer_id: Option<String>, state: State<'_, AppState>) -> Result<Vec<Sale>, String> {
    let base_query = r#"
        SELECT sales.*, 
               COALESCE((SELECT SUM(qty * hpp_value) FROM sale_lines WHERE sale_id = sales.id), 0.0) as total_cogs
        FROM sales
    "#;
    if let Some(cid) = customer_id {
        let query = format!("{} WHERE branch_id = ? AND customer_id = ? ORDER BY created_at DESC", base_query);
        sqlx::query_as::<_, Sale>(&query)
            .bind(&branch_id)
            .bind(&cid)
            .fetch_all(&state.db_pool)
            .await
            .map_err(|e| e.to_string())
    } else {
        let query = format!("{} WHERE branch_id = ? ORDER BY created_at DESC", base_query);
        sqlx::query_as::<_, Sale>(&query)
            .bind(&branch_id)
            .fetch_all(&state.db_pool)
            .await
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn get_sale_detail(
    id: String,
    state: State<'_, AppState>,
) -> Result<crate::db::models::sales::SaleDetail, String> {
    let sale = sqlx::query_as::<_, Sale>("SELECT * FROM sales WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let lines = sqlx::query_as::<_, crate::db::models::sales::SaleLine>(
        r#"SELECT sl.*, i.name as item_name, u.unit_name 
           FROM sale_lines sl
           LEFT JOIN items i ON sl.item_id = i.id
           LEFT JOIN item_units u ON sl.unit_id = u.id
           WHERE sl.sale_id = ?"#,
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let payments = sqlx::query_as::<_, crate::db::models::sales::SalePayment>(
        "SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY created_at ASC",
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let cashier_name: Option<String> = if let Some(ref uid) = sale.user_id {
        sqlx::query_scalar("SELECT name FROM users WHERE id = ?")
            .bind(uid)
            .fetch_optional(&state.db_pool)
            .await
            .unwrap_or(None)
    } else {
        None
    };

    Ok(crate::db::models::sales::SaleDetail {
        sale,
        lines,
        payments,
        cashier_name,
    })
}

#[tauri::command]
pub async fn create_sale_return(
    sale_id: String,
    lines: Vec<crate::db::models::sales::SaleReturnLineInput>,
    reason: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let return_id = Uuid::new_v4().to_string();
    let sale = sqlx::query_as::<_, Sale>("SELECT * FROM sales WHERE id = ?")
        .bind(&sale_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO sale_returns (id, sale_id, branch_id, reason) VALUES (?, ?, ?, ?)")
        .bind(&return_id)
        .bind(&sale_id)
        .bind(&sale.branch_id)
        .bind(&reason)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for line in &lines {
        let line_id = Uuid::new_v4().to_string();
        let refund_amount = line.qty * line.price;
        sqlx::query("INSERT INTO sale_return_lines (id, return_id, sale_line_id, item_id, qty, refund_amount) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&line_id).bind(&return_id).bind(&line.sale_line_id).bind(&line.item_id).bind(line.qty).bind(refund_amount)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Reverse stock ledger (IN)
        let ledger_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes) VALUES (?, ?, ?, ?, ?, 'in', 'sale_return', ?, ?)")
            .bind(ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&sale.branch_id).bind(line.qty).bind(&return_id).bind("Customer return")
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // Return amount (Assume refund from Cash for now, or reduce AR)
    let total_refund: f64 = lines.iter().map(|l| l.qty * l.price).sum();
    if total_refund > 0.0 {
        let mut journal_lines = Vec::new();
        journal_lines.push(("acc_sales", total_refund, 0.0, Some("Sales Return"))); // Debit Sales
        journal_lines.push(("acc_kas", 0.0, total_refund, Some("Refund to Customer"))); // Credit Cash

        let total_cogs: f64 = lines.iter().map(|l| l.qty * l.hpp_value).sum();
        if total_cogs > 0.0 {
            journal_lines.push(("acc_inv", total_cogs, 0.0, Some("Inventory Return"))); // Debit Inventory
            journal_lines.push(("acc_cogs", 0.0, total_cogs, Some("COGS Reversal")));
            // Credit COGS
        }

        crate::commands::accounting::post_journal(
            &mut tx,
            "return",
            &return_id,
            Some(&sale.branch_id),
            &format!("Sale Return for {}", sale.transaction_no),
            journal_lines,
        )
        .await?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_cash_drawer() -> Result<String, String> {
    // Phase 10: Placeholder for ESC/POS printer drawer kick
    println!("🔔 Cash drawer triggered via shortcut (F2)!");
    Ok("Drawer triggered".to_string())
}

#[tauri::command]
pub async fn delete_sale(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Delete journal entries of any returns for this sale
    sqlx::query(
        "DELETE FROM journal_entries WHERE source_type = 'return' AND source_id IN (SELECT id FROM sale_returns WHERE sale_id = ?)"
    )
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // 2. Delete stock ledger entries of any returns for this sale
    sqlx::query(
        "DELETE FROM stock_ledger WHERE source_type = 'sale_return' AND source_id IN (SELECT id FROM sale_returns WHERE sale_id = ?)"
    )
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // 2b. Delete sale_return_lines of any returns for this sale
    sqlx::query(
        "DELETE FROM sale_return_lines WHERE return_id IN (SELECT id FROM sale_returns WHERE sale_id = ?)"
    )
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // 2c. Delete sale_returns for this sale
    sqlx::query("DELETE FROM sale_returns WHERE sale_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 3. Delete journal entries for the sale itself
    sqlx::query("DELETE FROM journal_entries WHERE source_type = 'sale' AND source_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Delete stock ledger entries for the sale itself
    sqlx::query("DELETE FROM stock_ledger WHERE source_type = 'sale' AND source_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 5. Delete the sale itself (Cascades to sale_lines, sale_payments, sale_returns, sale_promo_applications)
    sqlx::query("DELETE FROM sales WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

