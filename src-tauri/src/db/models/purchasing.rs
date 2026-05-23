use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PurchaseOrder {
    pub id: String,
    pub branch_id: String,
    pub supplier_id: String,
    pub supplier_name: Option<String>,
    pub status: String,
    pub expected_date: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Purchase {
    pub id: String,
    pub po_id: Option<String>,
    pub branch_id: String,
    pub supplier_id: String,
    pub invoice_no: Option<String>,
    pub total_amount: f64,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PoLine {
    pub id: String,
    pub po_id: String,
    pub item_id: String,
    pub item_name: Option<String>,
    pub unit_id: String,
    pub unit_name: Option<String>,
    pub qty_ordered: f64,
    pub qty_received: f64,
    pub price_estimate: f64,
}

// Input DTOs
#[derive(Debug, Deserialize)]
pub struct PoLineInput {
    pub item_id: String,
    pub unit_id: String,
    pub qty: f64,
    pub price: f64,
}

#[derive(Debug, Deserialize)]
pub struct ReceiveLineInput {
    pub po_line_id: String,
    pub item_id: String,
    pub unit_id: String,
    pub qty_received: f64,
    pub price_per_unit: f64,
    pub expiry_date: Option<String>,
    pub batch_no: Option<String>,
}

// ----- NEW STRUCTS for purchases/payments/returns -----
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PurchaseLine {
    pub id: String,
    pub purchase_id: String,
    pub item_id: String,
    pub item_name: Option<String>,
    pub unit_id: String,
    pub unit_name: Option<String>,
    pub qty_received: f64,
    pub price_per_unit: f64,
    pub expiry_date: Option<String>,
    pub batch_no: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PurchasePayment {
    pub id: String,
    pub purchase_id: String,
    pub amount: f64,
    pub method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PurchaseReturn {
    pub id: String,
    pub purchase_id: String,
    pub supplier_id: String,
    pub branch_id: String,
    pub reason: String,
    pub created_at: String,
}

// Composite detail structure to send to the frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseDetail {
    pub purchase: Purchase,
    pub lines: Vec<PurchaseLine>,
    pub payments: Vec<PurchasePayment>,
    pub returns: Vec<PurchaseReturn>,
}
