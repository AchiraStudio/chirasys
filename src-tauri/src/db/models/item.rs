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

    pub cost_price: Option<f64>,
    pub rack_location: Option<String>,
    pub item_type: Option<String>,

    pub wholesale_price: f64,
    pub price: Option<f64>,
    pub base_unit_id: Option<String>,
    pub base_unit_name: Option<String>,
    pub category_name: Option<String>,
    pub avg_hpp: Option<f64>,
    #[sqlx(skip)]
    pub price_tiers: Option<Vec<ItemPriceTier>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ItemPriceTier {
    pub id: String,
    pub item_id: String,
    pub unit_id: Option<String>,
    pub tier_level: i64,
    pub max_qty: f64,
    pub price: f64,
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

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ActiveBatch {
    pub batch_no: Option<String>,
    pub expiry_date: Option<String>,
    pub current_qty: f64,
}

// A composite struct to send the full item detail to the frontend at once
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemDetail {
    pub item: Item,
    pub units: Vec<ItemUnit>,
    pub prices: Vec<ItemPrice>,
    pub price_tiers: Vec<ItemPriceTier>,
    pub active_batches: Vec<ActiveBatch>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginatedItems {
    pub items: Vec<Item>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}
