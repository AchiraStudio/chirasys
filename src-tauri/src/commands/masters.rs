use crate::db::models::{brand::Brand, category::Category};
use crate::AppState;
use tauri::State;
use uuid::Uuid;
use regex::Regex;
use std::collections::HashMap;

// --- BRANDS ---

#[tauri::command]
pub async fn get_brands(state: State<'_, AppState>) -> Result<Vec<Brand>, String> {
    let brands = sqlx::query_as::<_, Brand>("SELECT * FROM brands WHERE name IS NOT NULL AND TRIM(name) != '' GROUP BY UPPER(TRIM(name)) ORDER BY name ASC")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(brands)
}

#[tauri::command]
pub async fn add_brand(name: String, state: State<'_, AppState>) -> Result<Brand, String> {
    let id = Uuid::new_v4().to_string();
    let upper_name = name.trim().to_uppercase();
    sqlx::query("INSERT INTO brands (id, name) VALUES (?, ?)")
        .bind(&id)
        .bind(&upper_name)
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
    let upper_name = name.trim().to_uppercase();
    sqlx::query("UPDATE brands SET name = ? WHERE id = ?")
        .bind(&upper_name)
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

#[tauri::command]
pub async fn auto_assign_brands(state: State<'_, AppState>) -> Result<String, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Cleanup bad brands created by accident
    let bad_units = ["PCS", "BOX", "STRIP", "BOTOL", "TUBE", "AMPUL", "VIAL", "KAPSUL", "TABLET"];
    for bad in &bad_units {
        // Unlink from items
        sqlx::query("UPDATE items SET brand_id = NULL WHERE brand_id IN (SELECT id FROM brands WHERE UPPER(name) = ?)")
            .bind(bad)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        // Delete the brand
        sqlx::query("DELETE FROM brands WHERE UPPER(name) = ?")
            .bind(bad)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // 2. Fetch all valid brands
    let mut brands: Vec<(String, String)> = sqlx::query_as("SELECT id, name FROM brands")
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Sort brands by length descending so longer brands match first (e.g., "KALBE FARMA" before "KALBE")
    brands.sort_by(|a, b| b.1.len().cmp(&a.1.len()));

    // 3. Fetch all items with no brand
    let items: Vec<(String, String)> = sqlx::query_as("SELECT id, name FROM items WHERE brand_id IS NULL OR brand_id = ''")
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let mut updated_count = 0;

    for (item_id, item_name) in items {
        let upper_name = item_name.to_uppercase();
        for (brand_id, brand_name) in &brands {
            let escaped_brand = regex::escape(&brand_name.to_uppercase());
            // Match brand surrounded by word boundaries, spaces, or parentheses
            let pattern = format!(r"(?i)(?:^|\s|\()({})(?:$|\s|\))", escaped_brand);
            
            if let Ok(re) = Regex::new(&pattern) {
                if re.is_match(&upper_name) {
                    // Match found!
                    sqlx::query("UPDATE items SET brand_id = ? WHERE id = ?")
                        .bind(brand_id)
                        .bind(&item_id)
                        .execute(&mut *tx)
                        .await
                        .map_err(|e| e.to_string())?;
                    
                    updated_count += 1;
                    break; // stop searching brands for this item
                }
            }
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(format!("Successfully cleaned up invalid brands and auto-assigned brands to {} items.", updated_count))
}

#[derive(Debug, serde::Serialize)]
pub struct DiscoveredBrand {
    pub name: String,
    pub count: i64,
}

#[tauri::command]
pub async fn discover_potential_brands(state: State<'_, AppState>) -> Result<Vec<DiscoveredBrand>, String> {
    let items: Vec<(String, String)> = sqlx::query_as("SELECT id, name FROM items WHERE brand_id IS NULL OR brand_id = ''")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut potential_brands: HashMap<String, i64> = HashMap::new();
    
    // Common units and descriptive words to ignore
    let ignore_words = vec![
        "TAB", "TABLET", "KAP", "KAPSUL", "MG", "GR", "ML", "CREAM", "KRIM", "SYRUP", "SIRUP",
        "PCS", "BOX", "STRIP", "BOTOL", "TUBE", "AMPUL", "VIAL", "SALEP", "TETES", "MATA",
        "TELINGA", "INJ", "INJEKSI", "SUPP", "SUPPOSITORIA", "G", "MCG", "IU", "FORTE",
        "PLUS", "KIDS", "ANAK", "DEWASA"
    ];

    let re_parens = Regex::new(r"\(([^)]+)\)").unwrap();
    
    for (_, item_name) in items {
        let upper_name = item_name.to_uppercase();
        let mut found_in_parens = false;

        // 1. Check for words in parentheses
        for cap in re_parens.captures_iter(&upper_name) {
            let inside = cap[1].trim();
            if !inside.is_empty() && !ignore_words.contains(&inside) && inside.len() > 1 && !inside.chars().all(char::is_numeric) {
                *potential_brands.entry(inside.to_string()).or_insert(0) += 1;
                found_in_parens = true;
            }
        }
        
        // 2. If no parens, check the last word
        if !found_in_parens {
            let words: Vec<&str> = upper_name.split_whitespace().collect();
            if let Some(&last_word) = words.last() {
                let cleaned_last = last_word.trim_matches(|c: char| !c.is_alphanumeric());
                if !cleaned_last.is_empty() && !ignore_words.contains(&cleaned_last) && cleaned_last.len() > 1 {
                    // Make sure it's not just a number or dosage like "500MG"
                    let has_letters = cleaned_last.chars().any(char::is_alphabetic);
                    let is_dosage = cleaned_last.ends_with("MG") || cleaned_last.ends_with("ML") || cleaned_last.ends_with("GR");
                    if has_letters && !is_dosage {
                        *potential_brands.entry(cleaned_last.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
    }

    let mut result: Vec<DiscoveredBrand> = potential_brands.into_iter()
        .map(|(name, count)| DiscoveredBrand { name, count })
        .collect();

    // Sort by frequency descending
    result.sort_by(|a, b| b.count.cmp(&a.count));
    // Limit to top 50 suggestions to prevent overwhelming UI
    result.truncate(50);

    Ok(result)
}

// --- CATEGORIES ---

#[tauri::command]
pub async fn get_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    let categories = sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE name IS NOT NULL AND TRIM(name) != '' GROUP BY UPPER(TRIM(name)) ORDER BY name ASC")
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
    let upper_name = name.trim().to_uppercase();
    sqlx::query(
        "INSERT INTO categories (id, name, description, color, parent_id) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&upper_name)
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
    let upper_name = name.trim().to_uppercase();
    // Only updating name for now as per the inline UI design to protect parent_id
    sqlx::query("UPDATE categories SET name = ? WHERE id = ?")
        .bind(&upper_name)
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
    
    if key == "hpp_method" {
        sqlx::query("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('hpp_method', ?)")
            .bind(&value)
            .execute(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
