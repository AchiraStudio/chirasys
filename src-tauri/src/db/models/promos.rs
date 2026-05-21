use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Promo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub discount_percent: f64, // Legacy
    pub min_qty: f64,
    pub category_id: Option<String>,
    pub item_id: Option<String>,
    pub member_only: i32,
    pub active: i32,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub created_at: String,
    
    // New fields in Phase 6
    pub promo_type: String,
    pub discount_value: Option<f64>,
    pub applies_to: String,
    pub max_discount_amount: Option<f64>,
    pub stack_rule: String,
    pub priority: i32,
    pub member_tier: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PromoBogoRule {
    pub id: String,
    pub promo_id: String,
    pub buy_qty: f64,
    pub get_qty: f64,
    pub free_item_id: Option<String>,
    pub free_item_unit_id: Option<String>,
    pub free_item_discount_percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PromoTier {
    pub id: String,
    pub promo_id: String,
    pub min_qty: f64,
    pub discount_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct SalePromoApplication {
    pub id: String,
    pub sale_id: String,
    pub promo_id: String,
    pub discount_amount: f64,
    pub applied_to: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromoDetail {
    pub promo: Promo,
    pub bogo_rules: Vec<PromoBogoRule>,
    pub tiers: Vec<PromoTier>,
}

#[derive(Debug, Deserialize)]
pub struct BogoRuleInput {
    pub buy_qty: f64,
    pub get_qty: f64,
    pub free_item_id: Option<String>,
    pub free_item_unit_id: Option<String>,
    pub free_item_discount_percent: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct PromoTierInput {
    pub min_qty: f64,
    pub discount_percent: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreatePromoInput {
    pub name: String,
    pub description: Option<String>,
    pub discount_percent: f64,
    pub min_qty: f64,
    pub category_id: Option<String>,
    pub item_id: Option<String>,
    pub member_only: i32,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    
    pub promo_type: String,
    pub discount_value: Option<f64>,
    pub applies_to: String,
    pub max_discount_amount: Option<f64>,
    pub stack_rule: String,
    pub priority: i32,
    pub member_tier: Option<String>,
    
    pub bogo_rules: Vec<BogoRuleInput>,
    pub tiers: Vec<PromoTierInput>,
}

// Structs for Discount Engine calculation

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CartLineForDiscount {
    pub item_id: String,
    pub unit_id: String,
    pub category_id: Option<String>,
    pub qty: f64,
    pub price: f64,
    pub line_index: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppliedDiscount {
    pub line_index: usize,
    pub discount_amount: f64,
    pub promo_id: String,
    pub promo_name: String,
    pub is_bogo_free_item: bool, // If true, the frontend needs to add this as a new line
    pub free_item_qty: f64,
    pub free_item_id: Option<String>,
    pub free_item_unit_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscountResult {
    pub line_discounts: Vec<AppliedDiscount>,
    pub cart_discount: f64,
    pub cart_discount_promo_id: Option<String>,
    pub total_discount: f64,
}
