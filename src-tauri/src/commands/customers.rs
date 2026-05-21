use crate::db::models::inventory::Customer;
use crate::AppState;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_customers(search: Option<String>, tier: Option<String>, active_only: bool, state: State<'_, AppState>) -> Result<Vec<Customer>, String> {
    let mut query_str = String::from("SELECT * FROM customers WHERE 1=1");
    if active_only { query_str.push_str(" AND is_active = 1"); }
    if let Some(_) = tier { query_str.push_str(" AND customer_tier = ?"); }
    if let Some(ref s) = search {
        if !s.trim().is_empty() { query_str.push_str(" AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)"); }
    }
    query_str.push_str(" ORDER BY name ASC");

    let mut query = sqlx::query_as::<_, Customer>(&query_str);
    if let Some(ref t) = tier { query = query.bind(t.clone()); }
    if let Some(ref s) = search {
        if !s.trim().is_empty() {
            let search_val = format!("%{}%", s.trim());
            query = query.bind(search_val.clone()).bind(search_val.clone()).bind(search_val.clone());
        }
    }

    query.fetch_all(&state.db_pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_customer(
    name: String, phone: Option<String>, email: Option<String>, address: Option<String>, 
    region: Option<String>, customer_tier: String, credit_limit: f64, notes: Option<String>, state: State<'_, AppState>
) -> Result<Customer, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO customers (id, name, phone, email, address, region, customer_tier, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&name).bind(&phone).bind(&email).bind(&address).bind(&region).bind(&customer_tier).bind(credit_limit).bind(&notes)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Customer>("SELECT * FROM customers WHERE id = ?").bind(&id).fetch_one(&state.db_pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_customer(
    id: String, name: String, phone: Option<String>, email: Option<String>, address: Option<String>, 
    region: Option<String>, customer_tier: String, credit_limit: f64, notes: Option<String>, state: State<'_, AppState>
) -> Result<Customer, String> {
    sqlx::query("UPDATE customers SET name=?, phone=?, email=?, address=?, region=?, customer_tier=?, credit_limit=?, notes=?, updated_at=datetime('now') WHERE id=?")
        .bind(&name).bind(&phone).bind(&email).bind(&address).bind(&region).bind(&customer_tier).bind(credit_limit).bind(&notes).bind(&id)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Customer>("SELECT * FROM customers WHERE id = ?").bind(&id).fetch_one(&state.db_pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_customer_active(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE customers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at=datetime('now') WHERE id = ?")
        .bind(&id).execute(&state.db_pool).await.map_err(|e| e.to_string())?;
    Ok(())
}