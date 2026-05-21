use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Category {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
}

// Struct for building the nested tree in the frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryNode {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<String>,
    pub children: Vec<CategoryNode>,
    pub item_count: i64, 
}