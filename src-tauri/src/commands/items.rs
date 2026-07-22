use crate::db::models::item::{Item, ItemDetail, ItemPrice, ItemUnit, PaginatedItems};
use crate::AppState;
use tauri::State;
use uuid::Uuid;

// ==========================================
// CORE ITEM CRUD
// ==========================================

#[tauri::command]
pub async fn get_items_filtered(
    search: Option<String>,
    category_id: Option<String>,
    brand_id: Option<String>,
    active_only: bool,
    page: i64,
    per_page: i64,
    state: State<'_, AppState>,
) -> Result<PaginatedItems, String> {
    let offset = (page - 1) * per_page;

    // Base queries
    let mut query_str = String::from(
        r#"
        SELECT items.*, 
               (SELECT price FROM item_prices WHERE item_id = items.id AND customer_tier = 'regular' LIMIT 1) as price,
               (SELECT id FROM item_units WHERE item_id = items.id AND is_base = 1 LIMIT 1) as base_unit_id,
               (SELECT unit_name FROM item_units WHERE item_id = items.id AND is_base = 1 LIMIT 1) as base_unit_name,
               0.0 as avg_hpp
        FROM items WHERE 1=1
    "#,
    );
    let mut count_str = String::from("SELECT COUNT(*) FROM items WHERE 1=1");

    if active_only {
        query_str.push_str(" AND is_active = 1");
        count_str.push_str(" AND is_active = 1");
    }

    if let Some(_) = category_id {
        query_str.push_str(" AND category_id = ?");
        count_str.push_str(" AND category_id = ?");
    }

    if let Some(_) = brand_id {
        query_str.push_str(" AND brand_id = ?");
        count_str.push_str(" AND brand_id = ?");
    }

    if let Some(ref s) = search {
        if !s.trim().is_empty() {
            let search_clause =
                " AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR generic_name LIKE ?)";
            query_str.push_str(search_clause);
            count_str.push_str(search_clause);
        }
    }

    query_str.push_str(&format!(
        " ORDER BY name ASC LIMIT {} OFFSET {}",
        per_page, offset
    ));

    // Build the execution queries dynamically
    let mut query = sqlx::query_as::<_, Item>(&query_str);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_str);

    // Bind parameters in order (CRITICAL FIX: Passing ownership instead of borrowing)
    if let Some(ref cid) = category_id {
        query = query.bind(cid.clone());
        count_query = count_query.bind(cid.clone());
    }

    if let Some(ref bid) = brand_id {
        query = query.bind(bid.clone());
        count_query = count_query.bind(bid.clone());
    }

    if let Some(ref s) = search {
        if !s.trim().is_empty() {
            let search_val = format!("%{}%", s.trim());
            // Because we have 4 LIKE clauses, we must bind the value 4 times!
            query = query
                .bind(search_val.clone())
                .bind(search_val.clone())
                .bind(search_val.clone())
                .bind(search_val.clone());

            count_query = count_query
                .bind(search_val.clone())
                .bind(search_val.clone())
                .bind(search_val.clone())
                .bind(search_val.clone());
        }
    }

    let items = query
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    let total = count_query.fetch_one(&state.db_pool).await.unwrap_or(0);

    Ok(PaginatedItems {
        items,
        total,
        page,
        per_page,
    })
}
#[tauri::command]
pub async fn get_item(id: String, state: State<'_, AppState>) -> Result<ItemDetail, String> {
    let query_str = r#"
        SELECT items.*, 
               (SELECT price FROM item_prices WHERE item_id = items.id AND customer_tier = 'regular' LIMIT 1) as price,
               (SELECT id FROM item_units WHERE item_id = items.id AND is_base = 1 LIMIT 1) as base_unit_id,
               (SELECT unit_name FROM item_units WHERE item_id = items.id AND is_base = 1 LIMIT 1) as base_unit_name,
               0.0 as avg_hpp
        FROM items WHERE id = ?
    "#;
    let item = sqlx::query_as::<_, Item>(query_str)
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let units = sqlx::query_as::<_, ItemUnit>(
        "SELECT * FROM item_units WHERE item_id = ? ORDER BY conversion ASC",
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let prices = sqlx::query_as::<_, ItemPrice>("SELECT * FROM item_prices WHERE item_id = ?")
        .bind(&id)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let active_batches = sqlx::query_as::<_, crate::db::models::item::ActiveBatch>(
        r#"
        SELECT batch_no, expiry_date, 
               SUM(CASE WHEN direction = 'in' THEN qty_change ELSE 0 END) - 
               SUM(CASE WHEN direction = 'out' THEN qty_change ELSE 0 END) as current_qty 
        FROM stock_ledger 
        WHERE item_id = ? 
        GROUP BY batch_no, expiry_date 
        HAVING current_qty > 0
        ORDER BY expiry_date ASC
        "#
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ItemDetail {
        item,
        units,
        prices,
        active_batches,
    })
}

#[tauri::command]
pub async fn add_item(
    sku: String,
    barcode: Option<String>,
    name: String,
    generic_name: Option<String>,
    category_id: Option<String>,
    brand_id: Option<String>,
    hpp_method: String,
    min_stock: f64,
    has_expiry: i32,
    requires_prescription: i32,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<Item, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO items (id, sku, barcode, name, generic_name, category_id, brand_id, hpp_method, min_stock, has_expiry, requires_prescription, notes, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"#
    )
    .bind(&id).bind(&sku).bind(&barcode).bind(&name).bind(&generic_name)
    .bind(&category_id).bind(&brand_id).bind(&hpp_method).bind(min_stock)
    .bind(has_expiry).bind(requires_prescription).bind(&notes)
    .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    get_item_by_id(&id, &state).await
}

#[tauri::command]
pub async fn update_item(
    id: String,
    sku: String,
    barcode: Option<String>,
    name: String,
    generic_name: Option<String>,
    category_id: Option<String>,
    brand_id: Option<String>,
    hpp_method: String,
    min_stock: f64,
    has_expiry: i32,
    requires_prescription: i32,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<Item, String> {
    sqlx::query(
        r#"UPDATE items SET sku=?, barcode=?, name=?, generic_name=?, category_id=?, brand_id=?, 
           hpp_method=?, min_stock=?, has_expiry=?, requires_prescription=?, notes=?, updated_at=datetime('now') WHERE id=?"#
    )
    .bind(&sku).bind(&barcode).bind(&name).bind(&generic_name).bind(&category_id)
    .bind(&brand_id).bind(&hpp_method).bind(min_stock).bind(has_expiry)
    .bind(requires_prescription).bind(&notes).bind(&id)
    .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    get_item_by_id(&id, &state).await
}

#[tauri::command]
pub async fn delete_item(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE items SET is_active = 0, updated_at=datetime('now') WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_item_active(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE items SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at=datetime('now') WHERE id = ?")
        .bind(&id).execute(&state.db_pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn bulk_update_category(
    item_ids: Vec<String>,
    category_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
    for id in item_ids {
        sqlx::query("UPDATE items SET category_id = ?, updated_at=datetime('now') WHERE id = ?")
            .bind(&category_id)
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// ITEM UNITS
// ==========================================

#[tauri::command]
pub async fn add_item_unit(
    item_id: String,
    unit_name: String,
    conversion: f64,
    is_base: i32,
    barcode: Option<String>,
    state: State<'_, AppState>,
) -> Result<ItemUnit, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO item_units (id, item_id, unit_name, conversion, is_base, barcode) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(&item_id).bind(&unit_name).bind(conversion).bind(is_base).bind(&barcode)
        .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ItemUnit>("SELECT * FROM item_units WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_item_unit(
    id: String,
    unit_name: String,
    conversion: f64,
    is_base: i32,
    barcode: Option<String>,
    state: State<'_, AppState>,
) -> Result<ItemUnit, String> {
    sqlx::query("UPDATE item_units SET unit_name=?, conversion=?, is_base=?, barcode=? WHERE id=?")
        .bind(&unit_name)
        .bind(conversion)
        .bind(is_base)
        .bind(&barcode)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ItemUnit>("SELECT * FROM item_units WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_item_unit(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("DELETE FROM item_units WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// ITEM PRICES
// ==========================================

#[tauri::command]
pub async fn set_item_price(
    item_id: String,
    unit_id: String,
    customer_tier: String,
    price: f64,
    state: State<'_, AppState>,
) -> Result<ItemPrice, String> {
    let id = Uuid::new_v4().to_string();

    // UPSERT: Insert or Update if the unique constraint (item_id, unit_id, customer_tier) is hit
    sqlx::query(
        r#"
        INSERT INTO item_prices (id, item_id, unit_id, customer_tier, price) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(item_id, unit_id, customer_tier) 
        DO UPDATE SET price = excluded.price
        "#,
    )
    .bind(&id)
    .bind(&item_id)
    .bind(&unit_id)
    .bind(&customer_tier)
    .bind(price)
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ItemPrice>(
        "SELECT * FROM item_prices WHERE item_id = ? AND unit_id = ? AND customer_tier = ?",
    )
    .bind(&item_id)
    .bind(&unit_id)
    .bind(&customer_tier)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| e.to_string())
}

// Helper function
async fn get_item_by_id(id: &str, state: &State<'_, AppState>) -> Result<Item, String> {
    let query_str = r#"
        SELECT items.*, 
               (SELECT price FROM item_prices WHERE item_id = items.id AND customer_tier = 'regular' LIMIT 1) as price,
               (SELECT id FROM item_units WHERE item_id = items.id AND is_base = 1 LIMIT 1) as base_unit_id,
               (SELECT unit_name FROM item_units WHERE item_id = items.id AND is_base = 1 LIMIT 1) as base_unit_name,
               0.0 as avg_hpp
        FROM items WHERE id = ?
    "#;
    sqlx::query_as::<_, Item>(query_str)
        .bind(id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_item_wholesale_price(
    id: String,
    wholesale_price: f64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    sqlx::query("UPDATE items SET wholesale_price = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(wholesale_price)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

