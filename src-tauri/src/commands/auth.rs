use crate::AppState;
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;
use uuid::Uuid;
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub username: String,
    pub role: String,
    pub permissions: String,
    pub branch_id: Option<String>,
    pub avatar_color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

// 1. LOGIN
#[tauri::command]
pub async fn login(username: String, password_guess: String, state: State<'_, AppState>) -> Result<LoginResponse, String> {
    // Note: We avoid sqlx::query! to bypass compile-time DB checks without URL.
    let user_res = sqlx::query("SELECT id, name, username, password_hash, role, permissions, branch_id, avatar_color, active FROM users WHERE username = ?")
        .bind(&username)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = user_res {
        let is_active = row.get::<bool, _>("active");
        if !is_active {
            return Err("Akun ini telah dinonaktifkan.".to_string());
        }

        let stored_hash = row.get::<String, _>("password_hash");
        
        // For the very first default admin login, we might not have a real hash yet.
        // We'll hardcode 'admin' for the default user if the hash isn't valid bcrypt yet.
        let is_valid = if stored_hash == "hashed_password_placeholder" && password_guess == "admin" {
            true // Auto-approve the default admin on first run
        } else {
            verify(&password_guess, &stored_hash).unwrap_or(false)
        };

        if is_valid {
            // Update the placeholder hash if it was the default login
            if stored_hash == "hashed_password_placeholder" {
                let new_hash = hash(&password_guess, DEFAULT_COST).unwrap_or(stored_hash);
                let _ = sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
                    .bind(new_hash)
                    .bind(row.get::<String, _>("id"))
                    .execute(&state.db_pool)
                    .await;
            }

            let token = Uuid::new_v4().to_string();
            let expires_at = (Utc::now() + Duration::hours(12)).to_rfc3339();
            let user_id = row.get::<String, _>("id");

            let _ = sqlx::query("INSERT INTO local_sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
                .bind(&token)
                .bind(&user_id)
                .bind(expires_at)
                .execute(&state.db_pool)
                .await
                .map_err(|e| e.to_string())?;

            let _ = sqlx::query("UPDATE users SET last_login = datetime('now') WHERE id = ?")
                .bind(&user_id)
                .execute(&state.db_pool)
                .await;

            Ok(LoginResponse {
                token,
                user: UserInfo {
                    id: user_id,
                    name: row.get("name"),
                    username: row.get("username"),
                    role: row.get("role"),
                    permissions: row.get("permissions"),
                    branch_id: row.get("branch_id"),
                    avatar_color: row.get("avatar_color"),
                }
            })
        } else {
            Err("Password salah.".to_string())
        }
    } else {
        Err("Username tidak ditemukan.".to_string())
    }
}

// 2. GET CURRENT USER
#[tauri::command]
pub async fn get_current_user(token: String, state: State<'_, AppState>) -> Result<UserInfo, String> {
    let query = "
        SELECT u.id, u.name, u.username, u.role, u.permissions, u.branch_id, u.avatar_color
        FROM users u
        JOIN local_sessions s ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    ";

    let row = sqlx::query(query)
        .bind(&token)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = row {
        Ok(UserInfo {
            id: r.get("id"),
            name: r.get("name"),
            username: r.get("username"),
            role: r.get("role"),
            permissions: r.get("permissions"),
            branch_id: r.get("branch_id"),
            avatar_color: r.get("avatar_color"),
        })
    } else {
        Err("Sesi tidak valid atau telah berakhir.".to_string())
    }
}

// 3. LOGOUT
#[tauri::command]
pub async fn logout(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let _ = sqlx::query("DELETE FROM local_sessions WHERE token = ?")
        .bind(token)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize, sqlx::FromRow)]
pub struct UserRow {
    pub id: String,
    pub username: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}

#[tauri::command]
pub async fn get_users(state: State<'_, AppState>) -> Result<Vec<UserRow>, String> {
    sqlx::query_as::<_, UserRow>(
        r#"SELECT id, username, name, role, active AS is_active, created_at FROM users ORDER BY name ASC"#
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_user(
    name: String,
    username: String,
    password: String,
    role: String,
    state: State<'_, AppState>,
) -> Result<UserRow, String> {
    let existing: Option<(String,)> = sqlx::query_as("SELECT id FROM users WHERE username = ?")
        .bind(&username)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    if existing.is_some() {
        return Err("Username sudah digunakan.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;
    let colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
    let avatar_color = colors[id.len() % colors.len()];

    sqlx::query(
        "INSERT INTO users (id, username, password_hash, name, role, permissions, avatar_color, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    )
    .bind(&id)
    .bind(&username)
    .bind(&password_hash)
    .bind(&name)
    .bind(&role)
    .bind("default")
    .bind(avatar_color)
    .execute(&state.db_pool)
    .await
    .map_err(|e| format!("Gagal membuat pengguna: {}", e))?;

    let created_at: (String,) = sqlx::query_as("SELECT created_at FROM users WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(UserRow { id, username, name, role, is_active: true, created_at: created_at.0 })
}

#[tauri::command]
pub async fn toggle_user_active(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    sqlx::query("UPDATE users SET active = NOT active WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reset_user_password(
    id: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let new_hash = hash(&new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(new_hash)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
