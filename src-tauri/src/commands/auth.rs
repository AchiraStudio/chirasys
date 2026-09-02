use crate::AppState;
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize)]
struct AppMetadata {
    workspace_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct Claims {
    sub: String,
    role: String,
    app_metadata: AppMetadata,
    exp: usize,
}

fn mint_supabase_jwt(user_id: &str, role: &str, workspace_id: Option<String>) -> Option<String> {
    let default_secret = "fQTM5FzWc5ZQljXshc+HxRw+JUpNSkFiNf43dJmmY2gVbue5ioFDtCeTRHqHfQwbRBwfvXlKKMtKSuH4fsbofw==";
    let secret = std::env::var("VITE_SUPABASE_JWT_SECRET")
        .or_else(|_| std::env::var("SUPABASE_JWT_SECRET"))
        .unwrap_or_else(|_| default_secret.to_string());
    if secret.is_empty() {
        return None;
    }

    let jwt_role = if role == "sysadmin" { "sysadmin" } else { "authenticated" };
    let exp = (Utc::now() + chrono::Duration::try_hours(12).unwrap_or(chrono::Duration::hours(12))).timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        role: jwt_role.to_string(),
        app_metadata: AppMetadata { workspace_id },
        exp,
    };

    encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(secret.as_bytes())).ok()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub username: String,
    pub role: String,
    pub permissions: Vec<String>,
    pub is_custom_perms: bool,
    pub branch_id: Option<String>,
    pub avatar_color: Option<String>,
    pub workspace_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub supabase_token: Option<String>,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionDef {
    pub key: String,
    pub name: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RolePermissionItem {
    pub role: String,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPermissionsPayload {
    pub user_id: String,
    pub user_name: String,
    pub username: String,
    pub role: String,
    pub is_custom: bool,
    pub permissions: Vec<String>,
    pub role_defaults: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Helpers
// ─────────────────────────────────────────────────────────────────────────────

pub fn get_system_permission_definitions() -> Vec<PermissionDef> {
    vec![
        // Penjualan (Sales/POS)
        PermissionDef { key: "sales.create".into(), name: "Buat Transaksi Kasir (POS)".into(), description: "Memproses transaksi penjualan produk di kasir".into(), category: "Penjualan (POS)".into() },
        PermissionDef { key: "sales.delete".into(), name: "Hapus Transaksi Penjualan".into(), description: "Menghapus/void nota penjualan dan mengembalikan stok".into(), category: "Penjualan (POS)".into() },
        PermissionDef { key: "sales.return".into(), name: "Retur Penjualan".into(), description: "Memproses retur nota dan pengembalian dana pelanggan".into(), category: "Penjualan (POS)".into() },
        PermissionDef { key: "sales.discount".into(), name: "Diskon Kustom Kasir".into(), description: "Memberikan potongan/diskon manual pada keranjang kasir".into(), category: "Penjualan (POS)".into() },
        PermissionDef { key: "sales.cash_drawer".into(), name: "Buka Laci Kasir (Cash Drawer)".into(), description: "Membuka laci uang kasir secara manual atau shortcut".into(), category: "Penjualan (POS)".into() },

        // Inventaris & Produk
        PermissionDef { key: "items.view".into(), name: "Lihat Daftar Produk".into(), description: "Melihat katalog produk, harga, dan varian".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "items.create".into(), name: "Tambah Produk Baru".into(), description: "Menambahkan master produk dan satuan baru".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "items.edit".into(), name: "Ubah Data Produk".into(), description: "Mengedit nama produk, kategori, brand, dan barcode".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "items.delete".into(), name: "Hapus Produk".into(), description: "Menghapus produk dari katalog inventaris".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "items.change_price".into(), name: "Ubah Harga Jual & Grosir".into(), description: "Mengubah harga eceran, member, VIP, dan tier grosir".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "inventory.view".into(), name: "Lihat Stok & Riwayat".into(), description: "Melihat jumlah stok dan riwayat mutasi kartu stok".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "inventory.adjust".into(), name: "Penyesuaian Stok Manual".into(), description: "Melakukan koreksi stok masuk/keluar manual".into(), category: "Inventaris & Produk".into() },
        PermissionDef { key: "inventory.opname".into(), name: "Stock Opname".into(), description: "Membuat dan menyelesaikan sesi audit stock opname fisik".into(), category: "Inventaris & Produk".into() },

        // Pembelian & Pemasok
        PermissionDef { key: "purchasing.view".into(), name: "Lihat Pembelian".into(), description: "Melihat daftar Purchase Order dan faktur pembelian".into(), category: "Pembelian & Pemasok".into() },
        PermissionDef { key: "purchasing.create".into(), name: "Buat Purchase Order".into(), description: "Membuat pesanan pembelian baru ke supplier".into(), category: "Pembelian & Pemasok".into() },
        PermissionDef { key: "purchasing.receive".into(), name: "Penerimaan Barang".into(), description: "Menerima barang fisik dari supplier ke gudang".into(), category: "Pembelian & Pemasok".into() },
        PermissionDef { key: "purchasing.payment".into(), name: "Bayar Hutang Pembelian".into(), description: "Mencatat pembayaran hutang ke supplier".into(), category: "Pembelian & Pemasok".into() },
        PermissionDef { key: "purchasing.return".into(), name: "Retur Pembelian".into(), description: "Mengembalikan barang rusak/cacat ke supplier".into(), category: "Pembelian & Pemasok".into() },

        // Pelanggan & Promo
        PermissionDef { key: "crm.customers".into(), name: "Kelola Pelanggan & Member".into(), description: "Tambah, ubah, dan kelola data pelanggan & loyalitas".into(), category: "Pelanggan & Promo".into() },
        PermissionDef { key: "crm.suppliers".into(), name: "Kelola Supplier".into(), description: "Tambah, ubah, dan kelola data kontak supplier".into(), category: "Pelanggan & Promo".into() },
        PermissionDef { key: "promos.manage".into(), name: "Kelola Promo & Diskon".into(), description: "Membuat dan mengubah diskon otomatis & promo bundle".into(), category: "Pelanggan & Promo".into() },

        // Laporan & Keuangan
        PermissionDef { key: "reports.view".into(), name: "Lihat Laporan & Laba Rugi".into(), description: "Melihat ringkasan omset, laba kotor, dan analitik".into(), category: "Laporan & Keuangan".into() },
        PermissionDef { key: "reports.export".into(), name: "Ekspor Laporan Excel".into(), description: "Mengunduh file laporan ke Excel/Spreadsheet".into(), category: "Laporan & Keuangan".into() },
        PermissionDef { key: "accounting.manage".into(), name: "Kelola Kas & Akuntansi".into(), description: "Mencatat kas masuk/keluar dan jurnal akuntansi".into(), category: "Laporan & Keuangan".into() },

        // Pengaturan & Sistem
        PermissionDef { key: "settings.general".into(), name: "Pengaturan Toko & Pajak".into(), description: "Mengubah profil toko, metode HPP, dan pajak".into(), category: "Pengaturan & Sistem".into() },
        PermissionDef { key: "settings.hardware".into(), name: "Pengaturan Printer & Hardware".into(), description: "Konfigurasi printer thermal dan ukuran kertas".into(), category: "Pengaturan & Sistem".into() },
        PermissionDef { key: "settings.users".into(), name: "Manajemen Akun & Hak Akses".into(), description: "Menambah user, ubah password, dan atur hak akses".into(), category: "Pengaturan & Sistem".into() },
        PermissionDef { key: "settings.database".into(), name: "Database & Sinkronisasi Cloud".into(), description: "Optimasi, ekspor database, dan sinkronisasi workspace".into(), category: "Pengaturan & Sistem".into() },
        PermissionDef { key: "settings.lan".into(), name: "Jaringan Lokal & Sync LAN".into(), description: "Menghubungkan terminal kasir anak ke induk (LAN Sync)".into(), category: "Pengaturan & Sistem".into() },
    ]
}

pub async fn resolve_effective_permissions(
    pool: &sqlx::SqlitePool,
    role: &str,
    raw_perms: &str,
) -> (bool, Vec<String>) {
    let role_lower = role.to_lowercase();
    if role_lower == "owner" || role_lower == "sysadmin" {
        return (false, vec!["*".to_string()]);
    }

    // Check if user has explicit custom permissions (JSON array and not "default")
    if !raw_perms.is_empty() && raw_perms != "default" && raw_perms != "[]" {
        if let Ok(parsed) = serde_json::from_str::<Vec<String>>(raw_perms) {
            return (true, parsed);
        }
    }

    // Fetch role default permissions
    let role_perms: Option<String> = sqlx::query_scalar(
        "SELECT permissions FROM role_default_permissions WHERE role = ?"
    )
    .bind(&role_lower)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    if let Some(rp) = role_perms {
        if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&rp) {
            return (false, parsed);
        }
    }

    // Fallbacks
    if role_lower == "admin" {
        (false, vec![
            "sales.create".into(), "sales.delete".into(), "sales.return".into(), "sales.discount".into(), "sales.cash_drawer".into(),
            "items.view".into(), "items.create".into(), "items.edit".into(), "items.delete".into(), "items.change_price".into(),
            "inventory.view".into(), "inventory.adjust".into(), "inventory.opname".into(),
            "purchasing.view".into(), "purchasing.create".into(), "purchasing.receive".into(), "purchasing.payment".into(), "purchasing.return".into(),
            "crm.customers".into(), "crm.suppliers".into(), "promos.manage".into(),
            "reports.view".into(), "reports.export".into(), "accounting.manage".into(),
            "settings.general".into(), "settings.hardware".into(), "settings.users".into(), "settings.lan".into(),
        ])
    } else {
        (false, vec![
            "sales.create".into(), "sales.return".into(), "sales.cash_drawer".into(),
            "items.view".into(), "inventory.view".into(), "purchasing.view".into(),
            "crm.customers".into(), "settings.lan".into(),
        ])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Commands
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn login(username: String, password_guess: String, state: State<'_, AppState>) -> Result<LoginResponse, String> {
    let trimmed_username = username.trim().to_string();
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();

    // 1. PRIMARY: Fetch and synchronize user from Supabase Cloud first
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?username=eq.{}&limit=1", supabase_url, trimmed_username);
        if let Ok(res) = client.get(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(cloud_users) = res.json::<Vec<serde_json::Value>>().await {
                    if let Some(cloud_user) = cloud_users.first() {
                        // Apply cloud user to local DB
                        let _ = crate::commands::sync::apply_cloud_sync(&state.db_pool, "users", cloud_user).await;

                        // If user has a workspace_id, configure it locally if not yet configured
                        if let Some(ws_id) = cloud_user.get("workspace_id").and_then(|v| v.as_str()) {
                            let local_ws: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''")
                                .fetch_optional(&state.db_pool)
                                .await
                                .unwrap_or(None);

                            if local_ws.is_none() {
                                let ws_url = format!("{}/rest/v1/workspaces?id=eq.{}&limit=1", supabase_url, ws_id);
                                if let Ok(ws_res) = client.get(&ws_url)
                                    .header("apikey", &supabase_key)
                                    .header("Authorization", format!("Bearer {}", &supabase_key))
                                    .send()
                                    .await
                                {
                                    if let Ok(workspaces) = ws_res.json::<Vec<serde_json::Value>>().await {
                                        if let Some(ws) = workspaces.first() {
                                            let ws_name = ws.get("name").and_then(|v| v.as_str()).unwrap_or("Cloud Workspace");
                                            let ws_code = ws.get("code").and_then(|v| v.as_str()).unwrap_or("");
                                            for (k, v) in [("workspace_id", ws_id), ("workspace_name", ws_name), ("workspace_code", ws_code)] {
                                                let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                                                    .bind(k).bind(v)
                                                    .execute(&state.db_pool).await;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Query user from local SQLite (which now has latest cloud data if online)
    let user_res = sqlx::query("SELECT id, name, username, password_hash, role, permissions, branch_id, avatar_color, active, workspace_id FROM users WHERE username = ?")
        .bind(&trimmed_username)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let row = user_res.ok_or_else(|| {
        if !supabase_url.is_empty() {
            "Username tidak ditemukan di akun Cloud Supabase atau lokal.".to_string()
        } else {
            "Username tidak ditemukan.".to_string()
        }
    })?;

    let is_active = row.get::<bool, _>("active");
    if !is_active {
        return Err("Akun ini telah dinonaktifkan di Cloud / Sistem.".to_string());
    }

    let stored_hash = row.get::<String, _>("password_hash");
    let is_valid = if stored_hash == "hashed_password_placeholder" && password_guess == "admin" {
        true
    } else {
        verify(&password_guess, &stored_hash).unwrap_or(false)
    };

    if is_valid {
        if stored_hash == "hashed_password_placeholder" {
            let new_hash = match hash(&password_guess, DEFAULT_COST) {
                Ok(h) => h,
                Err(_) => stored_hash.clone(),
            };
            let _ = sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
                .bind(new_hash)
                .bind(row.get::<String, _>("id"))
                .execute(&state.db_pool)
                .await;
        }

        let token = Uuid::new_v4().to_string();
        let expires_at = (Utc::now() + chrono::Duration::try_hours(12).unwrap_or(chrono::Duration::hours(12))).to_rfc3339();
        let user_id: String = row.get("id");
        let role: String = row.get("role");
        let raw_perms: String = row.get::<Option<String>, _>("permissions").unwrap_or_else(|| "default".to_string());

        let (is_custom, effective_perms) = resolve_effective_permissions(&state.db_pool, &role, &raw_perms).await;

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

        let user_info = UserInfo {
            id: user_id,
            name: row.get("name"),
            username: row.get("username"),
            role: role.clone(),
            permissions: effective_perms,
            is_custom_perms: is_custom,
            branch_id: row.get("branch_id"),
            avatar_color: row.get("avatar_color"),
            workspace_id: row.get("workspace_id"),
        };

        let supabase_token = mint_supabase_jwt(
            &user_info.id,
            &user_info.role,
            user_info.workspace_id.clone(),
        );

        Ok(LoginResponse {
            token,
            supabase_token,
            user: user_info,
        })
    } else {
        Err("Password salah.".to_string())
    }
}

#[tauri::command]
pub async fn get_current_user(token: String, state: State<'_, AppState>) -> Result<UserInfo, String> {
    let query = "
        SELECT u.id, u.name, u.username, u.role, u.permissions, u.branch_id, u.avatar_color, u.workspace_id
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
        let role: String = r.get("role");
        let raw_perms: String = r.get::<Option<String>, _>("permissions").unwrap_or_else(|| "default".to_string());
        let (is_custom, effective_perms) = resolve_effective_permissions(&state.db_pool, &role, &raw_perms).await;

        Ok(UserInfo {
            id: r.get("id"),
            name: r.get("name"),
            username: r.get("username"),
            role,
            permissions: effective_perms,
            is_custom_perms: is_custom,
            branch_id: r.get("branch_id"),
            avatar_color: r.get("avatar_color"),
            workspace_id: r.get("workspace_id"),
        })
    } else {
        Err("Sesi tidak valid atau telah berakhir.".to_string())
    }
}

#[tauri::command]
pub async fn logout(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let _ = sqlx::query("DELETE FROM local_sessions WHERE token = ?")
        .bind(token)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management Commands
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, sqlx::FromRow)]
pub struct UserRow {
    pub id: String,
    pub username: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
    pub workspace_id: Option<String>,
    pub permissions: Option<String>,
    pub is_custom_perms: bool,
}

#[tauri::command]
pub async fn get_users(state: State<'_, AppState>) -> Result<Vec<UserRow>, String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let local_ws: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None);

    // 1. PRIMARY: Fetch from Supabase Cloud directly
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = if let Some(ref ws_id) = local_ws {
            format!("{}/rest/v1/users?workspace_id=eq.{}&order=name.asc", supabase_url, ws_id)
        } else {
            format!("{}/rest/v1/users?order=name.asc", supabase_url)
        };

        if let Ok(res) = client.get(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(cloud_users) = res.json::<Vec<serde_json::Value>>().await {
                    let mut users = Vec::new();
                    for cu in cloud_users {
                        // Apply cloud user to local DB cache
                        let _ = crate::commands::sync::apply_cloud_sync(&state.db_pool, "users", &cu).await;

                        let id = cu.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                        let username = cu.get("username").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                        let name = cu.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                        let role = cu.get("role").and_then(|v| v.as_str()).unwrap_or("staff").to_string();
                        let is_active = cu.get("active").and_then(|v| v.as_bool()).unwrap_or(true);
                        let created_at = cu.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                        let workspace_id = cu.get("workspace_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                        let permissions = cu.get("permissions").map(|p| {
                            if p.is_string() { p.as_str().unwrap().to_string() } else { p.to_string() }
                        });
                        let is_custom = permissions.as_ref().map(|p| !p.is_empty() && p != "default" && p != "[]").unwrap_or(false);

                        users.push(UserRow {
                            id,
                            username,
                            name,
                            role,
                            is_active,
                            created_at,
                            workspace_id,
                            permissions,
                            is_custom_perms: is_custom,
                        });
                    }
                    return Ok(users);
                }
            }
        }
    }

    // 2. OFFLINE FALLBACK: Read from local SQLite
    let rows = sqlx::query(
        r#"SELECT id, username, name, role, active AS is_active, created_at, workspace_id, permissions FROM users ORDER BY name ASC"#
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut users = Vec::new();
    for r in rows {
        let raw_perms: String = r.get::<Option<String>, _>("permissions").unwrap_or_else(|| "default".to_string());
        let is_custom = !raw_perms.is_empty() && raw_perms != "default" && raw_perms != "[]";

        users.push(UserRow {
            id: r.get("id"),
            username: r.get("username"),
            name: r.get("name"),
            role: r.get("role"),
            is_active: r.get("is_active"),
            created_at: r.get("created_at"),
            workspace_id: r.get("workspace_id"),
            permissions: Some(raw_perms),
            is_custom_perms: is_custom,
        });
    }

    Ok(users)
}

#[tauri::command]
pub async fn create_user(
    name: String,
    username: String,
    password: String,
    role: String,
    workspace_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<UserRow, String> {
    let trimmed_username = username.trim().to_string();
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();

    let resolved_workspace_id = match workspace_id {
        Some(w) if !w.trim().is_empty() => Some(w),
        _ => {
            sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id' AND value != ''")
                .fetch_optional(&state.db_pool)
                .await
                .unwrap_or(None)
        }
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    // 1. Direct Cloud Validation & Creation
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let check_url = format!("{}/rest/v1/users?username=eq.{}&limit=1", supabase_url, trimmed_username);
        if let Ok(res) = client.get(&check_url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(cloud_users) = res.json::<Vec<serde_json::Value>>().await {
                    if !cloud_users.is_empty() {
                        return Err("Username sudah digunakan di Supabase Cloud.".to_string());
                    }
                }
            }
        }
    }

    let id = Uuid::new_v4().to_string();
    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;
    let colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
    let avatar_color = colors[id.len() % colors.len()];
    let created_at_ts = Utc::now().to_rfc3339();

    let cloud_payload = serde_json::json!({
        "id": id,
        "username": trimmed_username,
        "password_hash": password_hash,
        "name": name,
        "role": role,
        "permissions": "default",
        "avatar_color": avatar_color,
        "active": true,
        "workspace_id": resolved_workspace_id,
        "created_at": created_at_ts,
        "updated_at": created_at_ts,
        "updated_by": "user"
    });

    // POST directly to Supabase Cloud
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let insert_url = format!("{}/rest/v1/users", supabase_url);
        let post_res = client.post(&insert_url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "resolution=merge-duplicates,return=minimal")
            .json(&cloud_payload)
            .send()
            .await;

        if let Ok(res) = post_res {
            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gagal membuat akun di Supabase Cloud: {}", err_text));
            }
        } else if let Err(e) = post_res {
            return Err(format!("Koneksi ke Supabase Cloud gagal: {}", e));
        }
    }

    // Save to local cache
    sqlx::query(
        "INSERT INTO users (id, username, password_hash, name, role, permissions, avatar_color, active, workspace_id, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'default', ?, 1, ?, ?, ?, 'user') ON CONFLICT(id) DO UPDATE SET username=excluded.username, name=excluded.name, role=excluded.role, password_hash=excluded.password_hash"
    )
    .bind(&id)
    .bind(&trimmed_username)
    .bind(&password_hash)
    .bind(&name)
    .bind(&role)
    .bind(avatar_color)
    .bind(&resolved_workspace_id)
    .bind(&created_at_ts)
    .bind(&created_at_ts)
    .execute(&state.db_pool)
    .await
    .map_err(|e| format!("Gagal menyimpan cache pengguna: {}", e))?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(UserRow {
        id,
        username: trimmed_username,
        name,
        role,
        is_active: true,
        created_at: created_at_ts,
        workspace_id: resolved_workspace_id,
        permissions: Some("default".to_string()),
        is_custom_perms: false,
    })
}

#[tauri::command]
pub async fn toggle_user_active(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let is_currently_active: bool = sqlx::query_scalar("SELECT active FROM users WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None)
        .unwrap_or(true);

    let next_active = !is_currently_active;
    let now_ts = Utc::now().to_rfc3339();

    // 1. Direct Cloud Patch
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?id=eq.{}", supabase_url, id.trim());
        let _ = client.patch(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "return=minimal")
            .json(&serde_json::json!({
                "active": next_active,
                "updated_at": now_ts,
                "updated_by": "user"
            }))
            .send()
            .await;
    }

    // 2. Local SQLite update
    sqlx::query("UPDATE users SET active = ?, updated_at = ?, updated_by = 'user' WHERE id = ?")
        .bind(next_active)
        .bind(&now_ts)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn reset_user_password(id: String, new_password: String, state: State<'_, AppState>) -> Result<(), String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let new_hash = hash(&new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    let now_ts = Utc::now().to_rfc3339();

    // 1. Direct Cloud Patch
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?id=eq.{}", supabase_url, id.trim());
        let _ = client.patch(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "return=minimal")
            .json(&serde_json::json!({
                "password_hash": new_hash,
                "updated_at": now_ts,
                "updated_by": "user"
            }))
            .send()
            .await;
    }

    // 2. Local SQLite update
    sqlx::query("UPDATE users SET password_hash = ?, updated_at = ?, updated_by = 'user' WHERE id = ?")
        .bind(&new_hash)
        .bind(&now_ts)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn update_user(
    id: String,
    name: String,
    username: String,
    role: String,
    workspace_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let trimmed_username = username.trim().to_string();
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let now_ts = Utc::now().to_rfc3339();

    // 1. Direct Cloud Patch
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?id=eq.{}", supabase_url, id.trim());
        let patch_res = client.patch(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "return=minimal")
            .json(&serde_json::json!({
                "name": name,
                "username": trimmed_username,
                "role": role,
                "workspace_id": workspace_id,
                "updated_at": now_ts,
                "updated_by": "user"
            }))
            .send()
            .await;

        if let Ok(res) = patch_res {
            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gagal memperbarui pengguna di Supabase Cloud: {}", err_text));
            }
        }
    }

    // 2. Local SQLite update
    sqlx::query("UPDATE users SET name = ?, username = ?, role = ?, workspace_id = ?, updated_at = ?, updated_by = 'user' WHERE id = ?")
        .bind(&name)
        .bind(&trimmed_username)
        .bind(&role)
        .bind(&workspace_id)
        .bind(&now_ts)
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn delete_user(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();

    // 1. Direct Cloud Delete
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?id=eq.{}", supabase_url, id.trim());
        let _ = client.delete(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await;
    }

    // 2. Local SQLite delete
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "User tidak dapat dihapus karena sudah memiliki data transaksi. Silakan nonaktifkan user ini sebagai gantinya.".to_string()
            } else {
                e.to_string()
            }
        })?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn assign_user_workspace(
    user_id: String,
    workspace_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let now_ts = Utc::now().to_rfc3339();

    // 1. Direct Cloud Patch
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?id=eq.{}", supabase_url, user_id.trim());
        let _ = client.patch(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "return=minimal")
            .json(&serde_json::json!({
                "workspace_id": workspace_id,
                "updated_at": now_ts,
                "updated_by": "user"
            }))
            .send()
            .await;
    }

    // 2. Local SQLite update
    sqlx::query("UPDATE users SET workspace_id = ?, updated_at = ?, updated_by = 'user' WHERE id = ?")
        .bind(&workspace_id)
        .bind(&now_ts)
        .bind(&user_id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission System Commands (Role Defaults & User Overrides)
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_permission_definitions() -> Vec<PermissionDef> {
    get_system_permission_definitions()
}

#[tauri::command]
pub async fn get_role_default_permissions(state: State<'_, AppState>) -> Result<Vec<RolePermissionItem>, String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();

    // 1. Primary: Fetch from Supabase Cloud
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/role_default_permissions?order=role.asc", supabase_url);
        if let Ok(res) = client.get(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(cloud_roles) = res.json::<Vec<serde_json::Value>>().await {
                    let mut list = Vec::new();
                    for cr in cloud_roles {
                        let _ = crate::commands::sync::apply_cloud_sync(&state.db_pool, "role_default_permissions", &cr).await;

                        let role = cr.get("role").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                        let permissions = cr.get("permissions").and_then(|v| {
                            if v.is_array() {
                                serde_json::from_value::<Vec<String>>(v.clone()).ok()
                            } else if let Some(s) = v.as_str() {
                                serde_json::from_str::<Vec<String>>(s).ok()
                            } else {
                                None
                            }
                        }).unwrap_or_default();

                        list.push(RolePermissionItem { role, permissions });
                    }
                    if !list.is_empty() {
                        return Ok(list);
                    }
                }
            }
        }
    }

    // 2. Offline fallback
    let rows = sqlx::query("SELECT role, permissions FROM role_default_permissions ORDER BY role ASC")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        let role: String = r.get("role");
        let perms_str: String = r.get("permissions");
        let perms: Vec<String> = serde_json::from_str(&perms_str).unwrap_or_default();
        list.push(RolePermissionItem { role, permissions: perms });
    }
    Ok(list)
}

#[tauri::command]
pub async fn update_role_default_permissions(
    role: String,
    permissions: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let perms_json = serde_json::to_string(&permissions).map_err(|e| e.to_string())?;
    let role_lower = role.to_lowercase();
    let now_ts = Utc::now().to_rfc3339();

    // 1. Direct Cloud Upsert
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/role_default_permissions", supabase_url);
        let _ = client.post(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "resolution=merge-duplicates,return=minimal")
            .json(&serde_json::json!({
                "role": role_lower,
                "permissions": permissions,
                "updated_at": now_ts,
                "updated_by": "user"
            }))
            .send()
            .await;
    }

    // 2. Local SQLite upsert
    sqlx::query(
        "INSERT INTO role_default_permissions (role, permissions, updated_at, updated_by) VALUES (?, ?, ?, 'user')
         ON CONFLICT(role) DO UPDATE SET permissions = excluded.permissions, updated_at = excluded.updated_at, updated_by = 'user'"
    )
    .bind(&role_lower)
    .bind(&perms_json)
    .bind(&now_ts)
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn get_user_permissions(user_id: String, state: State<'_, AppState>) -> Result<UserPermissionsPayload, String> {
    let user_row = sqlx::query("SELECT id, name, username, role, permissions FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = user_row {
        let role: String = r.get("role");
        let raw_perms: String = r.get::<Option<String>, _>("permissions").unwrap_or_else(|| "default".to_string());
        let (_, role_defaults) = resolve_effective_permissions(&state.db_pool, &role, "default").await;
        let (is_custom, user_perms) = resolve_effective_permissions(&state.db_pool, &role, &raw_perms).await;

        Ok(UserPermissionsPayload {
            user_id: r.get("id"),
            user_name: r.get("name"),
            username: r.get("username"),
            role,
            is_custom,
            permissions: user_perms,
            role_defaults,
        })
    } else {
        Err("Pengguna tidak ditemukan.".to_string())
    }
}

#[tauri::command]
pub async fn update_user_permissions(
    user_id: String,
    is_custom: bool,
    permissions: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (supabase_url, supabase_key) = crate::commands::sync::get_supabase_credentials();
    let perms_val = if is_custom {
        serde_json::to_string(&permissions).map_err(|e| e.to_string())?
    } else {
        "default".to_string()
    };
    let now_ts = Utc::now().to_rfc3339();

    // 1. Direct Cloud Patch
    if !supabase_url.is_empty() && !supabase_key.is_empty() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let url = format!("{}/rest/v1/users?id=eq.{}", supabase_url, user_id.trim());
        let _ = client.patch(&url)
            .header("apikey", &supabase_key)
            .header("Authorization", format!("Bearer {}", &supabase_key))
            .header("Prefer", "return=minimal")
            .json(&serde_json::json!({
                "permissions": perms_val,
                "updated_at": now_ts,
                "updated_by": "user"
            }))
            .send()
            .await;
    }

    // 2. Local SQLite update
    sqlx::query("UPDATE users SET permissions = ?, updated_at = ?, updated_by = 'user' WHERE id = ?")
        .bind(&perms_val)
        .bind(&now_ts)
        .bind(&user_id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let pool_clone = state.db_pool.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::trigger_auto_push(&pool_clone).await;
    });

    Ok(())
}
