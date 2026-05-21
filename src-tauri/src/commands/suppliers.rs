use crate::db::models::inventory::Supplier;
use crate::AppState;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_suppliers(search: Option<String>, active_only: bool, state: State<'_, AppState>) -> Result<Vec<Supplier>, String> {
    let mut query_str = String::from("SELECT * FROM suppliers WHERE 1=1");
    if active_only { query_str.push_str(" AND is_active = 1"); }
    
    if let Some(ref s) = search {
        if !s.trim().is_empty() { query_str.push_str(" AND (name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)"); }
    }
    query_str.push_str(" ORDER BY name ASC");

    let mut query = sqlx::query_as::<_, Supplier>(&query_str);
    if let Some(ref s) = search {
        if !s.trim().is_empty() {
            let search_val = format!("%{}%", s.trim());
            query = query.bind(search_val.clone()).bind(search_val.clone()).bind(search_val.clone());
        }
    }

    query.fetch_all(&state.db_pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_supplier(
    name: String, contact_person: Option<String>, phone: Option<String>, email: Option<String>, 
    address: Option<String>, payment_terms: Option<String>, notes: Option<String>, state: State<'_, AppState>
) -> Result<Supplier, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO suppliers (id, name, contact_person, phone, email, address, payment_terms, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&name).bind(&contact_person).bind(&phone).bind(&email).bind(&address).bind(&payment_terms).bind(&notes)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Supplier>("SELECT * FROM suppliers WHERE id = ?").bind(&id).fetch_one(&state.db_pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_supplier(
    id: String, name: String, contact_person: Option<String>, phone: Option<String>, email: Option<String>, 
    address: Option<String>, payment_terms: Option<String>, notes: Option<String>, state: State<'_, AppState>
) -> Result<Supplier, String> {
    sqlx::query("UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, address=?, payment_terms=?, notes=?, updated_at=datetime('now') WHERE id=?")
        .bind(&name).bind(&contact_person).bind(&phone).bind(&email).bind(&address).bind(&payment_terms).bind(&notes).bind(&id)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Supplier>("SELECT * FROM suppliers WHERE id = ?").bind(&id).fetch_one(&state.db_pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_supplier_active(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE suppliers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at=datetime('now') WHERE id = ?")
        .bind(&id).execute(&state.db_pool).await.map_err(|e| e.to_string())?;
    Ok(())
}