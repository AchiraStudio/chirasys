use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Sale {
    pub id: String,
    pub transaction_no: String,
    pub branch_id: String,
    pub customer_id: Option<String>,
    pub user_id: Option<String>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub grand_total: f64,
    pub status: String,
    pub price_type: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct SaleLine {
    pub id: String,
    pub sale_id: String,
    pub item_id: String,
    pub unit_id: String,
    pub qty: f64,
    pub price_type: String,
    pub price: f64,
    pub discount_amount: f64,
    pub subtotal: f64,
    pub hpp_value: f64,
    pub notes: Option<String>,
    // Virtual fields
    pub item_name: Option<String>,
    pub unit_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleDetail {
    pub sale: Sale,
    pub lines: Vec<SaleLine>,
    pub payments: Vec<SalePayment>,
    pub cashier_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct SalePayment {
    pub id: String,
    pub sale_id: String,
    pub amount: f64,
    pub method: String,
    pub reference: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SaleLineInput {
    pub item_id: String,
    pub unit_id: String,
    pub qty: f64,
    pub price_type: String,
    pub price: f64,
    pub discount_amount: f64,
    pub hpp_value: f64,
}

#[derive(Debug, Deserialize)]
pub struct SaleReturnLineInput {
    pub sale_line_id: String,
    pub item_id: String,
    pub unit_id: String,
    pub qty: f64,
    pub price: f64,
    pub hpp_value: f64,
}

#[derive(Debug, Deserialize)]
pub struct SalePaymentInput {
    pub amount: f64,
    pub method: String,
    pub reference: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleInput {
    pub branch_id: String,
    pub customer_id: Option<String>,
    pub user_id: Option<String>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub grand_total: f64,
    pub price_type: String,
    pub notes: Option<String>,
    pub lines: Vec<SaleLineInput>,
    pub payments: Vec<SalePaymentInput>,
}
