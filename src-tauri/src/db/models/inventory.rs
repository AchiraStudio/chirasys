use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Supplier {
    pub id: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub payment_terms: Option<String>,
    pub notes: Option<String>,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub region: Option<String>,
    pub customer_tier: String,
    pub loyalty_points: i32,
    pub credit_limit: f64,
    pub notes: Option<String>,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
    pub membership_expiry: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct StockLedger {
    pub id: String,
    pub item_id: String,
    pub unit_id: String,
    pub branch_id: String,
    pub qty_change: f64,
    pub direction: String,
    pub source_type: String,
    pub source_id: Option<String>,
    pub hpp_value: Option<f64>,
    pub expiry_date: Option<String>,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct StockOverviewRow {
    pub item_id: String,
    pub item_name: String,
    pub sku: String,
    pub min_stock: f64,
    pub has_expiry: i32,
    pub hpp_method: String,
    pub category_name: Option<String>,
    pub unit_id: Option<String>,
    pub unit_name: Option<String>,
    pub current_qty: f64,
    pub has_ledger_entries: bool,
    #[sqlx(skip)]
    pub is_low_stock: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockMovementRow {
    pub id: String,
    pub direction: String,
    pub qty_change: f64,
    pub source_type: String,
    pub hpp_value: Option<f64>,
    pub expiry_date: Option<String>,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub running_total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LowStockAlert {
    pub item_id: String,
    pub item_name: String,
    pub sku: String,
    pub current_qty: f64,
    pub min_stock: f64,
    pub unit_name: String,
}
