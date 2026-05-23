use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Item {
    pub id: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub generic_name: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub hpp_method: String,
    pub image_blob: Option<Vec<u8>>,
    pub min_stock: f64,
    pub has_expiry: i32,            // SQLite boolean
    pub requires_prescription: i32, // SQLite boolean
    pub notes: Option<String>,
    pub is_active: i32, // SQLite boolean
    pub created_at: String,
    pub updated_at: String,

    // Virtual fields joined for POS efficiency
    pub wholesale_price: f64,
    pub price: Option<f64>,
    pub base_unit_id: Option<String>,
    pub base_unit_name: Option<String>,
    pub avg_hpp: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ItemUnit {
    pub id: String,
    pub item_id: String,
    pub unit_name: String,
    pub conversion: f64,
    pub is_base: i32, // SQLite boolean
    pub barcode: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ItemPrice {
    pub id: String,
    pub item_id: String,
    pub unit_id: String,
    pub customer_tier: String,
    pub price: f64,
}

// A composite struct to send the full item detail to the frontend at once
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemDetail {
    pub item: Item,
    pub units: Vec<ItemUnit>,
    pub prices: Vec<ItemPrice>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginatedItems {
    pub items: Vec<Item>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}
