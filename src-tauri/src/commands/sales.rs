use crate::db::models::sales::{CreateSaleInput, Sale};
use crate::AppState;
use chrono::Local;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_next_transaction_no(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
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
        sqlx::query(
            "INSERT INTO transaction_counters (branch_id, date_str, counter) VALUES (?, ?, 1)",
        )
        .bind(&branch_id)
        .bind(&date_str)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        1
    };

    tx.commit().await.map_err(|e| e.to_string())?;

    // Format: 0001/KSR/2605
    Ok(format!("{:04}/KSR/{}", counter, display_date))
}

#[tauri::command]
pub async fn create_sale(
    input: CreateSaleInput,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let sale_id = Uuid::new_v4().to_string();

    // Get transaction number within this transaction to be safe?
    // We can do it inline to avoid dropping the `tx` reference
    let date_str = Local::now().format("%Y%m%d").to_string();
    let display_date = Local::now().format("%y%m").to_string();
    let current: Option<i64> = sqlx::query_scalar("UPDATE transaction_counters SET counter = counter + 1 WHERE branch_id = ? AND date_str = ? RETURNING counter")
        .bind(&input.branch_id).bind(&date_str)
        .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
    let counter = if let Some(c) = current {
        c
    } else {
        sqlx::query(
            "INSERT INTO transaction_counters (branch_id, date_str, counter) VALUES (?, ?, 1)",
        )
        .bind(&input.branch_id)
        .bind(&date_str)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        1
    };
    let transaction_no = format!("{:04}/KSR/{}", counter, display_date);

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
    let customer_tier = if let Some(ref cid) = input.customer_id {
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
    .bind(&sale_id).bind(&transaction_no).bind(&input.branch_id).bind(&input.customer_id).bind(&input.user_id)
    .bind(input.total_amount).bind(input.discount_amount).bind(input.tax_amount).bind(input.grand_total)
    .bind(&input.price_type).bind(&input.notes)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    // Record applied promos
    for applied in discount_res.line_discounts {
        let spa_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sale_promo_applications (id, sale_id, promo_id, discount_amount, applied_to) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&spa_id).bind(&sale_id).bind(&applied.promo_id).bind(applied.discount_amount).bind("line_id_placeholder")
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    if discount_res.cart_discount > 0.0 {
        let spa_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sale_promo_applications (id, sale_id, promo_id, discount_amount, applied_to) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&spa_id).bind(&sale_id).bind(discount_res.cart_discount_promo_id.as_deref().unwrap_or("CART_PROMO")).bind(discount_res.cart_discount).bind("cart")
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // Fetch global HPP method
    let hpp_method: String = sqlx::query_scalar("SELECT value FROM system_settings WHERE key = 'hpp_method'")
        .fetch_optional(&mut *tx).await.unwrap_or(None).unwrap_or_else(|| "avg".to_string());

    let mut actual_cogs_total = 0.0;

    for line in &input.lines {
        let mut line_hpp_value = line.hpp_value; // fallback to frontend value

        if hpp_method == "avg" {
            // Keep using the latest moving average from ledger or frontend
            let latest_hpp: Option<f64> = sqlx::query_scalar(
                "SELECT hpp_value FROM stock_ledger WHERE item_id = ? AND branch_id = ? AND hpp_value > 0 ORDER BY created_at DESC LIMIT 1"
            )
            .bind(&line.item_id).bind(&input.branch_id)
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
                .bind(&line.item_id).bind(&input.branch_id)
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
                let fallback = if line_hpp_value > 0.0 { line_hpp_value } else { 0.0 };
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
        .bind(&line_id).bind(&sale_id).bind(&line.item_id).bind(&line.unit_id)
        .bind(line.qty).bind(&line.price_type).bind(line.price).bind(line.discount_amount)
        .bind(line.qty * line.price - line.discount_amount).bind(line_hpp_value)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Update Stock Ledger (OUT)
        let ledger_id = Uuid::new_v4().to_string();
        let notes = format!("Sale {}", transaction_no);
        sqlx::query(
            "INSERT INTO stock_ledger (id, item_id, unit_id, branch_id, qty_change, direction, source_type, source_id, notes, hpp_value) VALUES (?, ?, ?, ?, ?, 'out', 'sale', ?, ?, ?)"
        )
        .bind(ledger_id).bind(&line.item_id).bind(&line.unit_id).bind(&input.branch_id)
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

    // 1. Credit Sales (Income) -> grand_total before discount if using full price logic, but simpler:
    // Actually, Penjualan is total_amount (before tax/discount)
    journal_lines.push(("acc_sales", 0.0, input.total_amount, Some("Sales Revenue")));

    // 2. Debit Diskon Penjualan (Expense/Contra-Revenue)
    if input.discount_amount > 0.0 {
        journal_lines.push((
            "acc_disc",
            input.discount_amount,
            0.0,
            Some("Sales Discount"),
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
    crate::commands::accounting::post_journal(
        &mut tx,
        "sale",
        &sale_id,
        Some(&input.branch_id),
        &notes,
        journal_lines,
    )
    .await?;

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

    Ok(crate::db::models::sales::SaleDetail {
        sale,
        lines,
        payments,
    })
}

#[tauri::command]
pub async fn create_sale_return(
    sale_id: String,
    lines: Vec<crate::db::models::sales::SaleLineInput>,
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
        sqlx::query("INSERT INTO sale_return_lines (id, return_id, item_id, unit_id, qty) VALUES (?, ?, ?, ?, ?)")
            .bind(&line_id).bind(&return_id).bind(&line.item_id).bind(&line.unit_id).bind(line.qty)
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
