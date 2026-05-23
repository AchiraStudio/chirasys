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
