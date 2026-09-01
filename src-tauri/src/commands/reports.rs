// commands/reports.rs
// Phase 8 — Business Intelligence Reports

use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;

// ============================================================
// OUTPUT TYPES
// ============================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SalesSummaryRow {
    pub period_label: String,
    pub transaction_count: i64,
    pub total_revenue: f64,
    pub total_discount: f64,
    pub total_cogs: f64,
    pub gross_profit: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TopItemRow {
    pub item_name: String,
    pub sku: String,
    pub category_name: Option<String>,
    pub qty_sold: f64,
    pub total_revenue: f64,
    pub total_cogs: f64,
    pub gross_margin: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PaymentMethodRow {
    pub method: String,
    pub transaction_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StockValuationRow {
    pub item_name: String,
    pub sku: String,
    pub category_name: Option<String>,
    pub unit_name: Option<String>,
    pub current_qty: f64,
    pub avg_hpp: f64,
    pub total_value: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ExpiringItemRow {
    pub item_name: String,
    pub sku: String,
    pub category_name: Option<String>,
    pub batch_no: Option<String>,
    pub expiry_date: String,
    pub qty: f64,
    pub days_left: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OutstandingPayableRow {
    pub purchase_id: String,
    pub supplier_name: String,
    pub invoice_no: Option<String>,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub balance: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PurchaseSummaryRow {
    pub supplier_name: String,
    pub purchase_count: i64,
    pub total_amount: f64,
    pub paid_amount: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CustomerReportRow {
    pub customer_name: String,
    pub customer_tier: String,
    pub transaction_count: i64,
    pub total_spent: f64,
}

// ============================================================
// REPORT COMMANDS
// ============================================================

/// Laporan Penjualan — Sales summary grouped by day
#[tauri::command]
pub async fn get_sales_summary(
    branch_id: String,
    date_from: String,
    date_to: String,
    state: State<'_, AppState>,
) -> Result<Vec<SalesSummaryRow>, String> {
    let query = r#"
        SELECT
            strftime('%Y-%m-%d', s.created_at) AS period_label,
            COUNT(DISTINCT s.id)               AS transaction_count,
            COALESCE(SUM(s.grand_total), 0)    AS total_revenue,
            COALESCE(SUM(s.discount_amount), 0) AS total_discount,
            COALESCE(SUM(sl.line_cogs), 0)     AS total_cogs,
            COALESCE(SUM(s.grand_total), 0) - COALESCE(SUM(sl.line_cogs), 0) AS gross_profit
        FROM sales s
        LEFT JOIN (
            SELECT sale_id, SUM(qty * hpp_value) AS line_cogs
            FROM sale_lines
            GROUP BY sale_id
        ) sl ON sl.sale_id = s.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
          AND date(s.created_at) BETWEEN date(?) AND date(?)
        GROUP BY strftime('%Y-%m-%d', s.created_at)
        ORDER BY period_label ASC
    "#;

    sqlx::query_as::<_, SalesSummaryRow>(query)
        .bind(&branch_id)
        .bind(&date_from)
        .bind(&date_to)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Item Terlaris — Top selling items by revenue
#[tauri::command]
pub async fn get_top_selling_items(
    branch_id: String,
    date_from: String,
    date_to: String,
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TopItemRow>, String> {
    let query = r#"
        SELECT
            i.name                           AS item_name,
            i.sku,
            c.name                           AS category_name,
            SUM(sl.qty)                      AS qty_sold,
            SUM(sl.subtotal)                 AS total_revenue,
            SUM(sl.qty * sl.hpp_value)       AS total_cogs,
            CASE
                WHEN SUM(sl.subtotal) > 0
                THEN ROUND((SUM(sl.subtotal) - SUM(sl.qty * sl.hpp_value)) / SUM(sl.subtotal) * 100, 1)
                ELSE 0
            END                              AS gross_margin
        FROM sale_lines sl
        JOIN sales s ON sl.sale_id = s.id
        JOIN items i ON sl.item_id = i.id
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
          AND date(s.created_at) BETWEEN date(?) AND date(?)
        GROUP BY sl.item_id
        ORDER BY total_revenue DESC
        LIMIT ?
    "#;

    sqlx::query_as::<_, TopItemRow>(query)
        .bind(&branch_id)
        .bind(&date_from)
        .bind(&date_to)
        .bind(limit)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Metode Pembayaran — Sales by payment method
#[tauri::command]
pub async fn get_sales_by_payment_method(
    branch_id: String,
    date_from: String,
    date_to: String,
    state: State<'_, AppState>,
) -> Result<Vec<PaymentMethodRow>, String> {
    let query = r#"
        SELECT
            sp.method,
            COUNT(DISTINCT sp.sale_id) AS transaction_count,
            SUM(sp.amount)             AS total_amount
        FROM sale_payments sp
        JOIN sales s ON sp.sale_id = s.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
          AND date(s.created_at) BETWEEN date(?) AND date(?)
        GROUP BY sp.method
        ORDER BY total_amount DESC
    "#;

    sqlx::query_as::<_, PaymentMethodRow>(query)
        .bind(&branch_id)
        .bind(&date_from)
        .bind(&date_to)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Valuasi Stok — Current stock with HPP value
#[tauri::command]
pub async fn get_stock_valuation(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<StockValuationRow>, String> {
    let query = r#"
        SELECT
            i.name                          AS item_name,
            i.sku,
            cat.name                        AS category_name,
            iu.unit_name,
            COALESCE(SUM(
                CASE sl.direction
                    WHEN 'in'  THEN  sl.qty_change
                    WHEN 'out' THEN -sl.qty_change
                    ELSE 0
                END
            ), 0)                           AS current_qty,
            COALESCE(
                (SELECT sl2.hpp_value
                 FROM stock_ledger sl2
                 WHERE sl2.item_id = i.id AND sl2.branch_id = ? AND sl2.hpp_value IS NOT NULL AND sl2.hpp_value > 0
                 ORDER BY sl2.created_at DESC LIMIT 1),
                0
            )                               AS avg_hpp,
            COALESCE(SUM(
                CASE sl.direction
                    WHEN 'in'  THEN  sl.qty_change
                    WHEN 'out' THEN -sl.qty_change
                    ELSE 0
                END
            ), 0) * COALESCE(
                (SELECT sl3.hpp_value
                 FROM stock_ledger sl3
                 WHERE sl3.item_id = i.id AND sl3.branch_id = ? AND sl3.hpp_value IS NOT NULL AND sl3.hpp_value > 0
                 ORDER BY sl3.created_at DESC LIMIT 1),
                0
            )                               AS total_value
        FROM items i
        LEFT JOIN item_units iu  ON iu.item_id = i.id AND iu.is_base = 1
        LEFT JOIN categories cat ON cat.id = i.category_id
        LEFT JOIN stock_ledger sl ON sl.item_id = i.id AND sl.unit_id = iu.id AND sl.branch_id = ?
        WHERE i.is_active = 1
        GROUP BY i.id, iu.id
        HAVING current_qty > 0
        ORDER BY total_value DESC
    "#;

    sqlx::query_as::<_, StockValuationRow>(query)
        .bind(&branch_id)
        .bind(&branch_id)
        .bind(&branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Kadaluarsa — Items expiring within N days
#[tauri::command]
pub async fn get_expiring_items(
    branch_id: String,
    days_ahead: i64,
    state: State<'_, AppState>,
) -> Result<Vec<ExpiringItemRow>, String> {
    let query = r#"
        SELECT
            i.name                          AS item_name,
            i.sku,
            (SELECT name FROM categories WHERE id = i.category_id) AS category_name,
            sl.batch_no,
            sl.expiry_date,
            SUM(sl.qty_change)              AS qty,
            CAST(julianday(sl.expiry_date) - julianday('now') AS INTEGER) AS days_left
        FROM stock_ledger sl
        JOIN items i ON sl.item_id = i.id
        WHERE sl.branch_id = ?
          AND sl.direction = 'in'
          AND sl.expiry_date IS NOT NULL
          AND sl.expiry_date != ''
          AND date(sl.expiry_date) <= date('now', '+' || ? || ' days')
          AND date(sl.expiry_date) >= date('now')
        GROUP BY sl.item_id, sl.batch_no, sl.expiry_date
        HAVING qty > 0
        ORDER BY sl.expiry_date ASC
    "#;

    sqlx::query_as::<_, ExpiringItemRow>(query)
        .bind(&branch_id)
        .bind(days_ahead)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Hutang Dagang — Outstanding payables to suppliers
#[tauri::command]
pub async fn get_outstanding_payables(
    branch_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<OutstandingPayableRow>, String> {
    let query = r#"
        SELECT
            p.id                                            AS purchase_id,
            s.name                                         AS supplier_name,
            p.invoice_no,
            p.total_amount,
            COALESCE(SUM(pp.amount), 0)                    AS paid_amount,
            p.total_amount - COALESCE(SUM(pp.amount), 0)  AS balance,
            p.created_at
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN purchase_payments pp ON pp.purchase_id = p.id
        WHERE p.branch_id = ?
          AND p.status != 'paid'
        GROUP BY p.id
        HAVING balance > 0
        ORDER BY p.created_at ASC
    "#;

    sqlx::query_as::<_, OutstandingPayableRow>(query)
        .bind(&branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Pembelian — Purchase summary per supplier
#[tauri::command]
pub async fn get_purchase_summary(
    branch_id: String,
    date_from: String,
    date_to: String,
    state: State<'_, AppState>,
) -> Result<Vec<PurchaseSummaryRow>, String> {
    let query = r#"
        SELECT
            s.name                        AS supplier_name,
            COUNT(p.id)                   AS purchase_count,
            SUM(p.total_amount)           AS total_amount,
            COALESCE(SUM(pp.paid), 0)     AS paid_amount
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (
            SELECT purchase_id, SUM(amount) AS paid
            FROM purchase_payments
            GROUP BY purchase_id
        ) pp ON pp.purchase_id = p.id
        WHERE p.branch_id = ?
          AND date(p.created_at) BETWEEN date(?) AND date(?)
        GROUP BY p.supplier_id
        ORDER BY total_amount DESC
    "#;

    sqlx::query_as::<_, PurchaseSummaryRow>(query)
        .bind(&branch_id)
        .bind(&date_from)
        .bind(&date_to)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Pelanggan — Customer spending report
#[tauri::command]
pub async fn get_customer_report(
    branch_id: String,
    date_from: String,
    date_to: String,
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<CustomerReportRow>, String> {
    let query = r#"
        SELECT
            COALESCE(c.name, 'Pelanggan Umum') AS customer_name,
            COALESCE(c.customer_tier, 'regular') AS customer_tier,
            COUNT(s.id)                        AS transaction_count,
            SUM(s.grand_total)                 AS total_spent
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
          AND date(s.created_at) BETWEEN date(?) AND date(?)
        GROUP BY s.customer_id
        ORDER BY total_spent DESC
        LIMIT ?
    "#;

    sqlx::query_as::<_, CustomerReportRow>(query)
        .bind(&branch_id)
        .bind(&date_from)
        .bind(&date_to)
        .bind(limit)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================
// COMPREHENSIVE DETAILED SALES REPORTS (OVERHAUL)
// ============================================================

#[derive(Debug, Deserialize)]
pub struct SalesReportFilter {
    pub branch_id: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub tx_from: Option<String>,
    pub tx_to: Option<String>,
    pub customer_id: Option<String>,
    pub user_id: Option<String>,
    pub payment_method: Option<String>,
    pub category_id: Option<String>,
    pub price_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SalesRecapReportRow {
    pub sale_id: String,
    pub transaction_no: String,
    pub created_at: String,
    pub status: String,
    pub price_type: String,
    pub customer_name: String,
    pub customer_tier: String,
    pub cashier_name: String,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub grand_total: f64,
    pub total_cogs: f64,
    pub gross_profit: f64,
    pub gross_margin: f64,
    pub payment_methods: String,
    pub total_items: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SalesLineReportRow {
    pub sale_id: String,
    pub transaction_no: String,
    pub created_at: String,
    pub status: String,
    pub price_type: String,
    pub customer_name: String,
    pub cashier_name: String,
    pub line_id: String,
    pub item_id: String,
    pub item_name: String,
    pub sku: String,
    pub category_name: String,
    pub qty: f64,
    pub unit_name: String,
    pub price: f64,
    pub line_discount: f64,
    pub subtotal: f64,
    pub hpp_value: f64,
    pub line_cogs: f64,
    pub line_profit: f64,
    pub payment_methods: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CashierSalesReportRow {
    pub user_id: String,
    pub cashier_name: String,
    pub role: String,
    pub transaction_count: i64,
    pub total_cash: f64,
    pub total_non_cash: f64,
    pub total_revenue: f64,
    pub total_discount: f64,
    pub total_cogs: f64,
    pub gross_profit: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DailySalesRecapRow {
    pub date: String,
    pub date_label: String,
    pub transaction_count: i64,
    pub total_cash: f64,
    pub total_non_cash: f64,
    pub total_revenue: f64,
    pub total_discount: f64,
    pub total_cogs: f64,
    pub gross_profit: f64,
    pub gross_margin: f64,
}

/// Laporan Penjualan Rekap (per Faktur / Nota)
#[tauri::command]
pub async fn get_sales_recap_report(
    filter: SalesReportFilter,
    state: State<'_, AppState>,
) -> Result<Vec<SalesRecapReportRow>, String> {
    let mut query = String::from(r#"
        SELECT
            s.id AS sale_id,
            s.transaction_no,
            s.created_at,
            s.status,
            s.price_type,
            COALESCE(c.name, 'Pelanggan Umum') AS customer_name,
            COALESCE(c.customer_tier, 'regular') AS customer_tier,
            COALESCE(u.name, u.username, 'Kasir') AS cashier_name,
            s.total_amount,
            s.discount_amount,
            s.tax_amount,
            s.grand_total,
            COALESCE(cogs.total_cogs, 0.0) AS total_cogs,
            (s.grand_total - COALESCE(cogs.total_cogs, 0.0)) AS gross_profit,
            CASE 
                WHEN s.grand_total > 0 THEN ROUND(((s.grand_total - COALESCE(cogs.total_cogs, 0.0)) / s.grand_total) * 100.0, 1)
                ELSE 0.0 
            END AS gross_margin,
            COALESCE((
                SELECT GROUP_CONCAT(DISTINCT method) FROM sale_payments WHERE sale_id = s.id
            ), 'cash') AS payment_methods,
            COALESCE(cogs.total_items, 0.0) AS total_items
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN (
            SELECT sale_id, SUM(qty * hpp_value) AS total_cogs, SUM(qty) AS total_items
            FROM sale_lines
            GROUP BY sale_id
        ) cogs ON cogs.sale_id = s.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
    "#);

    if let Some(ref from) = filter.date_from {
        if !from.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at >= '{}'", from.replace("'", "''")));
        }
    }
    if let Some(ref to) = filter.date_to {
        if !to.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at <= '{}'", to.replace("'", "''")));
        }
    }
    if let Some(ref tx_from) = filter.tx_from {
        if !tx_from.trim().is_empty() {
            query.push_str(&format!(" AND s.transaction_no >= '{}'", tx_from.replace("'", "''")));
        }
    }
    if let Some(ref tx_to) = filter.tx_to {
        if !tx_to.trim().is_empty() {
            query.push_str(&format!(" AND s.transaction_no <= '{}'", tx_to.replace("'", "''")));
        }
    }
    if let Some(ref cust_id) = filter.customer_id {
        if !cust_id.trim().is_empty() {
            query.push_str(&format!(" AND s.customer_id = '{}'", cust_id.replace("'", "''")));
        }
    }
    if let Some(ref uid) = filter.user_id {
        if !uid.trim().is_empty() {
            query.push_str(&format!(" AND s.user_id = '{}'", uid.replace("'", "''")));
        }
    }
    if let Some(ref method) = filter.payment_method {
        if !method.trim().is_empty() && method != "all" {
            query.push_str(&format!(" AND EXISTS (SELECT 1 FROM sale_payments sp WHERE sp.sale_id = s.id AND sp.method = '{}')", method.replace("'", "''")));
        }
    }
    if let Some(ref p_type) = filter.price_type {
        if !p_type.trim().is_empty() && p_type != "all" {
            query.push_str(&format!(" AND s.price_type = '{}'", p_type.replace("'", "''")));
        }
    }

    query.push_str(" ORDER BY s.created_at DESC");

    sqlx::query_as::<_, SalesRecapReportRow>(&query)
        .bind(&filter.branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Penjualan Detail (Rincian Item per Baris Penjualan)
#[tauri::command]
pub async fn get_detailed_sales_lines(
    filter: SalesReportFilter,
    state: State<'_, AppState>,
) -> Result<Vec<SalesLineReportRow>, String> {
    let mut query = String::from(r#"
        SELECT
            s.id AS sale_id,
            s.transaction_no,
            s.created_at,
            s.status,
            s.price_type,
            COALESCE(c.name, 'Pelanggan Umum') AS customer_name,
            COALESCE(u.name, u.username, 'Kasir') AS cashier_name,
            sl.id AS line_id,
            sl.item_id,
            COALESCE(i.name, sl.item_id) AS item_name,
            COALESCE(i.sku, '-') AS sku,
            COALESCE(cat.name, 'Umum') AS category_name,
            sl.qty,
            COALESCE(iu.unit_name, sl.unit_id) AS unit_name,
            sl.price,
            sl.discount_amount AS line_discount,
            sl.subtotal,
            sl.hpp_value,
            (sl.qty * sl.hpp_value) AS line_cogs,
            (sl.subtotal - (sl.qty * sl.hpp_value)) AS line_profit,
            COALESCE((
                SELECT GROUP_CONCAT(DISTINCT method) FROM sale_payments WHERE sale_id = s.id
            ), 'cash') AS payment_methods
        FROM sales s
        JOIN sale_lines sl ON sl.sale_id = s.id
        LEFT JOIN items i ON sl.item_id = i.id
        LEFT JOIN item_units iu ON sl.unit_id = iu.id
        LEFT JOIN categories cat ON i.category_id = cat.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
    "#);

    if let Some(ref from) = filter.date_from {
        if !from.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at >= '{}'", from.replace("'", "''")));
        }
    }
    if let Some(ref to) = filter.date_to {
        if !to.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at <= '{}'", to.replace("'", "''")));
        }
    }
    if let Some(ref tx_from) = filter.tx_from {
        if !tx_from.trim().is_empty() {
            query.push_str(&format!(" AND s.transaction_no >= '{}'", tx_from.replace("'", "''")));
        }
    }
    if let Some(ref tx_to) = filter.tx_to {
        if !tx_to.trim().is_empty() {
            query.push_str(&format!(" AND s.transaction_no <= '{}'", tx_to.replace("'", "''")));
        }
    }
    if let Some(ref cust_id) = filter.customer_id {
        if !cust_id.trim().is_empty() {
            query.push_str(&format!(" AND s.customer_id = '{}'", cust_id.replace("'", "''")));
        }
    }
    if let Some(ref uid) = filter.user_id {
        if !uid.trim().is_empty() {
            query.push_str(&format!(" AND s.user_id = '{}'", uid.replace("'", "''")));
        }
    }
    if let Some(ref cat_id) = filter.category_id {
        if !cat_id.trim().is_empty() {
            query.push_str(&format!(" AND i.category_id = '{}'", cat_id.replace("'", "''")));
        }
    }
    if let Some(ref method) = filter.payment_method {
        if !method.trim().is_empty() && method != "all" {
            query.push_str(&format!(" AND EXISTS (SELECT 1 FROM sale_payments sp WHERE sp.sale_id = s.id AND sp.method = '{}')", method.replace("'", "''")));
        }
    }

    query.push_str(" ORDER BY s.created_at DESC, sl.id ASC");

    sqlx::query_as::<_, SalesLineReportRow>(&query)
        .bind(&filter.branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Jual Per Kasir / User
#[tauri::command]
pub async fn get_sales_by_cashier_summary(
    filter: SalesReportFilter,
    state: State<'_, AppState>,
) -> Result<Vec<CashierSalesReportRow>, String> {
    let mut query = String::from(r#"
        SELECT
            COALESCE(u.id, 'unknown') AS user_id,
            COALESCE(u.name, u.username, 'Kasir Umum') AS cashier_name,
            COALESCE(u.role, 'cashier') AS role,
            COUNT(DISTINCT s.id) AS transaction_count,
            COALESCE(SUM(sp_cash.cash_amt), 0.0) AS total_cash,
            COALESCE(SUM(sp_noncash.noncash_amt), 0.0) AS total_non_cash,
            COALESCE(SUM(s.grand_total), 0.0) AS total_revenue,
            COALESCE(SUM(s.discount_amount), 0.0) AS total_discount,
            COALESCE(SUM(sl_cogs.cogs_amt), 0.0) AS total_cogs,
            COALESCE(SUM(s.grand_total), 0.0) - COALESCE(SUM(sl_cogs.cogs_amt), 0.0) AS gross_profit
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN (
            SELECT sale_id, SUM(amount) AS cash_amt
            FROM sale_payments
            WHERE method = 'cash'
            GROUP BY sale_id
        ) sp_cash ON sp_cash.sale_id = s.id
        LEFT JOIN (
            SELECT sale_id, SUM(amount) AS noncash_amt
            FROM sale_payments
            WHERE method != 'cash'
            GROUP BY sale_id
        ) sp_noncash ON sp_noncash.sale_id = s.id
        LEFT JOIN (
            SELECT sale_id, SUM(qty * hpp_value) AS cogs_amt
            FROM sale_lines
            GROUP BY sale_id
        ) sl_cogs ON sl_cogs.sale_id = s.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
    "#);

    if let Some(ref from) = filter.date_from {
        if !from.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at >= '{}'", from.replace("'", "''")));
        }
    }
    if let Some(ref to) = filter.date_to {
        if !to.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at <= '{}'", to.replace("'", "''")));
        }
    }
    if let Some(ref uid) = filter.user_id {
        if !uid.trim().is_empty() {
            query.push_str(&format!(" AND s.user_id = '{}'", uid.replace("'", "''")));
        }
    }

    query.push_str(" GROUP BY s.user_id ORDER BY total_revenue DESC");

    sqlx::query_as::<_, CashierSalesReportRow>(&query)
        .bind(&filter.branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

/// Laporan Penjualan Harian
#[tauri::command]
pub async fn get_daily_sales_recap(
    filter: SalesReportFilter,
    state: State<'_, AppState>,
) -> Result<Vec<DailySalesRecapRow>, String> {
    let mut query = String::from(r#"
        SELECT
            strftime('%Y-%m-%d', s.created_at) AS date,
            strftime('%d/%m/%Y', s.created_at) AS date_label,
            COUNT(DISTINCT s.id) AS transaction_count,
            COALESCE(SUM(sp_cash.cash_amt), 0.0) AS total_cash,
            COALESCE(SUM(sp_noncash.noncash_amt), 0.0) AS total_non_cash,
            COALESCE(SUM(s.grand_total), 0.0) AS total_revenue,
            COALESCE(SUM(s.discount_amount), 0.0) AS total_discount,
            COALESCE(SUM(sl_cogs.cogs_amt), 0.0) AS total_cogs,
            COALESCE(SUM(s.grand_total), 0.0) - COALESCE(SUM(sl_cogs.cogs_amt), 0.0) AS gross_profit,
            CASE 
                WHEN SUM(s.grand_total) > 0 THEN ROUND(((SUM(s.grand_total) - COALESCE(SUM(sl_cogs.cogs_amt), 0.0)) / SUM(s.grand_total)) * 100.0, 1)
                ELSE 0.0 
            END AS gross_margin
        FROM sales s
        LEFT JOIN (
            SELECT sale_id, SUM(amount) AS cash_amt
            FROM sale_payments
            WHERE method = 'cash'
            GROUP BY sale_id
        ) sp_cash ON sp_cash.sale_id = s.id
        LEFT JOIN (
            SELECT sale_id, SUM(amount) AS noncash_amt
            FROM sale_payments
            WHERE method != 'cash'
            GROUP BY sale_id
        ) sp_noncash ON sp_noncash.sale_id = s.id
        LEFT JOIN (
            SELECT sale_id, SUM(qty * hpp_value) AS cogs_amt
            FROM sale_lines
            GROUP BY sale_id
        ) sl_cogs ON sl_cogs.sale_id = s.id
        WHERE s.branch_id = ?
          AND s.status = 'completed'
    "#);

    if let Some(ref from) = filter.date_from {
        if !from.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at >= '{}'", from.replace("'", "''")));
        }
    }
    if let Some(ref to) = filter.date_to {
        if !to.trim().is_empty() {
            query.push_str(&format!(" AND s.created_at <= '{}'", to.replace("'", "''")));
        }
    }
    if let Some(ref cust_id) = filter.customer_id {
        if !cust_id.trim().is_empty() {
            query.push_str(&format!(" AND s.customer_id = '{}'", cust_id.replace("'", "''")));
        }
    }
    if let Some(ref uid) = filter.user_id {
        if !uid.trim().is_empty() {
            query.push_str(&format!(" AND s.user_id = '{}'", uid.replace("'", "''")));
        }
    }

    query.push_str(" GROUP BY strftime('%Y-%m-%d', s.created_at) ORDER BY date DESC");

    sqlx::query_as::<_, DailySalesRecapRow>(&query)
        .bind(&filter.branch_id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

