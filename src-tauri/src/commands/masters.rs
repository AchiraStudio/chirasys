use crate::db::models::{brand::Brand, category::Category};
use crate::AppState;
use tauri::State;
use uuid::Uuid;

// --- BRANDS ---

#[tauri::command]
pub async fn get_brands(state: State<'_, AppState>) -> Result<Vec<Brand>, String> {
    let brands = sqlx::query_as::<_, Brand>("SELECT * FROM brands ORDER BY name ASC")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(brands)
}

#[tauri::command]
pub async fn add_brand(name: String, state: State<'_, AppState>) -> Result<Brand, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO brands (id, name) VALUES (?, ?)")
        .bind(&id)
        .bind(&name)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Brand>("SELECT * FROM brands WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_brand(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Brand, String> {
    sqlx::query("UPDATE brands SET name = ? WHERE id = ?")
        .bind(&name)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Brand>("SELECT * FROM brands WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_brand(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("DELETE FROM brands WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- CATEGORIES ---

#[tauri::command]
pub async fn get_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    let categories = sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name ASC")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(categories)
}

#[tauri::command]
pub async fn add_category(
    name: String,
    description: Option<String>,
    color: Option<String>,
    parent_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Category, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO categories (id, name, description, color, parent_id) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&description)
    .bind(&color)
    .bind(&parent_id)
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_category(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Category, String> {
    // Only updating name for now as per the inline UI design to protect parent_id
    sqlx::query("UPDATE categories SET name = ? WHERE id = ?")
        .bind(&name)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_category(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- BANKS ---

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct Bank {
    pub id: String,
    pub name: String,
    pub code: String,
    pub is_active: i64,
}

#[tauri::command]
pub async fn get_banks(state: State<'_, AppState>) -> Result<Vec<Bank>, String> {
    sqlx::query_as::<_, Bank>("SELECT * FROM banks WHERE is_active = 1 ORDER BY code ASC")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

// --- GLOBAL SETTINGS ---

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct GlobalSetting {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Vec<GlobalSetting>, String> {
    sqlx::query_as::<_, GlobalSetting>(
        "SELECT key, value, description FROM global_settings ORDER BY key ASC",
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    sqlx::query("INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&key)
        .bind(&value)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
