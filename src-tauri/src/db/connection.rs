use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::fs;
use std::path::PathBuf;
use tauri::Manager; 

pub async fn establish_connection(app_handle: &tauri::AppHandle) -> Result<SqlitePool, String> {
    let app_dir: PathBuf = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to resolve app data directory");
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let db_path = app_dir.join("chirasys.db");
    
    println!("🗄️ DATABASE IS LOCATED AT: {}", db_path.display());

    let database_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .map_err(|e| format!("Failed to connect to SQLite: {}", e))?;

    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), String> {
    let migration_1 = include_str!("./migrations/001_init.sql");
    sqlx::query(migration_1).execute(pool).await.map_err(|e| format!("Migration 001 failed: {}", e))?;

    let migration_2 = include_str!("./migrations/002_master_data.sql");
    sqlx::query(migration_2).execute(pool).await.map_err(|e| format!("Migration 002 failed: {}", e))?;

    let migration_3 = include_str!("./migrations/003_inventory.sql");
    sqlx::query(migration_3).execute(pool).await.map_err(|e| format!("Migration 003 failed: {}", e))?;

    let migration_4 = include_str!("./migrations/004_purchasing.sql");
    sqlx::query(migration_4).execute(pool).await.map_err(|e| format!("Migration 004 failed: {}", e))?;

    let migration_5 = include_str!("./migrations/005_fix_source_type.sql");
    sqlx::query(migration_5).execute(pool).await.map_err(|e| format!("Migration 005 failed: {}", e))?;

    let migration_6 = include_str!("./migrations/006_sales_and_members.sql");
    sqlx::query(migration_6).execute(pool).await.map_err(|e| format!("Migration 006 failed: {}", e))?;

    let migration_7 = include_str!("./migrations/007_promos.sql");
    sqlx::query(migration_7).execute(pool).await.map_err(|e| format!("Migration 007 failed: {}", e))?;

    let migration_8 = include_str!("./migrations/008_alter_items.sql");
    if let Err(e) = sqlx::query(migration_8).execute(pool).await {
        if !e.to_string().contains("duplicate column name") {
            return Err(format!("Migration 008 failed: {}", e));
        }
    }

    let migration_9 = include_str!("./migrations/009_health.sql");
    sqlx::query(migration_9).execute(pool).await.map_err(|e| format!("Migration 009 failed: {}", e))?;

    let migration_10 = include_str!("./migrations/010_promo_advanced.sql");
    if let Err(e) = sqlx::query(migration_10).execute(pool).await {
        if !e.to_string().contains("duplicate column name") {
            return Err(format!("Migration 010 failed: {}", e));
        }
    }

    let migration_11 = include_str!("./migrations/011_accounting.sql");
    sqlx::query(migration_11).execute(pool).await.map_err(|e| format!("Migration 011 failed: {}", e))?;

    Ok(())
}