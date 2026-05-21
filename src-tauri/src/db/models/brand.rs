use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Brand {
    pub id: String,
    pub name: String,
    pub logo_blob: Option<Vec<u8>>,
    pub created_at: String,
}