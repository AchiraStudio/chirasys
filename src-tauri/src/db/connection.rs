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
    // Enable WAL mode for much better write performance (~3x faster)
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA synchronous=NORMAL;")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA cache_size=-32000;")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA temp_store=MEMORY;")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Schema version table: ensures each migration runs only once
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _schema_version (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    // All migrations in order (sql content, version number)
    let migrations: &[(&str, i32)] = &[
        (include_str!("./migrations/001_init.sql"), 1),
        (include_str!("./migrations/002_master_data.sql"), 2),
        (include_str!("./migrations/003_inventory.sql"), 3),
        (include_str!("./migrations/004_purchasing.sql"), 4),
        (include_str!("./migrations/005_fix_source_type.sql"), 5),
        (include_str!("./migrations/006_sales_and_members.sql"), 6),
        (include_str!("./migrations/007_promos.sql"), 7),
        (include_str!("./migrations/008_alter_items.sql"), 8),
        (include_str!("./migrations/009_health.sql"), 9),
        (include_str!("./migrations/010_promo_advanced.sql"), 10),
        (include_str!("./migrations/011_accounting.sql"), 11),
        (include_str!("./migrations/012_fix_and_seed.sql"), 12),
        (include_str!("./migrations/013_auth_and_roles.sql"), 13),
        (include_str!("./migrations/014_sync_queue.sql"), 14),
        (include_str!("./migrations/015_sync_triggers.sql"), 15),
        (include_str!("./migrations/016_sync_triggers_fix.sql"), 16),
        (include_str!("./migrations/017_admin_v1.sql"), 17),
        (include_str!("./migrations/018_hpp_engine.sql"), 18),
        (include_str!("./migrations/019_stock_opname.sql"), 19),
        (include_str!("./migrations/021_tax_account.sql"), 21),
        (include_str!("./migrations/022_users_created_at.sql"), 22),
        (include_str!("./migrations/023_fix_stock_ledger_trigger.sql"), 23),
        (include_str!("./migrations/024_master_data_sync.sql"), 24),
        (include_str!("./migrations/025_fix_sales_sync_trigger.sql"), 25),
        (include_str!("./migrations/026_workspace.sql"), 26),
        (include_str!("./migrations/027_deduplicate_masters.sql"), 27),
        (include_str!("./migrations/028_fix_sales_sync_payload.sql"), 28),
        (include_str!("./migrations/029_staff_role_and_settings.sql"), 29),
        (include_str!("./migrations/030_sync_queue_retry_count.sql"), 30),
        (include_str!("./migrations/031_sync_queue_workspace_id.sql"), 31),
        (include_str!("./migrations/032_workspace_settings_seed.sql"), 32),
        (include_str!("./migrations/033_payments_sync_trigger.sql"), 33),
        (include_str!("./migrations/034_promo_bundles.sql"), 34),
        (include_str!("./migrations/035_fix_promo_check.sql"), 35),
        (include_str!("./migrations/036_fix_promos_category_fk.sql"), 36),
        (include_str!("./migrations/037_user_workspace_assign.sql"), 37),
        (include_str!("./migrations/038_member_expiry_and_tier_discount.sql"), 38),
        (include_str!("./migrations/039_soft_deletes.sql"), 39),
        (include_str!("./migrations/040_full_sync_triggers.sql"), 40),
        (include_str!("./migrations/041_fix_delete_sync.sql"), 41),
        (include_str!("./migrations/042_fix_missing_columns.sql"), 42),
        (include_str!("./migrations/043_force_fix_columns.sql"), 43),
        (include_str!("./migrations/044_default_workspace_seed.sql"), 44),
        (include_str!("./migrations/045_clean_sales_sync_queue.sql"), 45),
    ];

    for (sql, version) in migrations {
        // Skip if already applied
        let already_applied: Option<i64> =
            sqlx::query_scalar("SELECT 1 FROM _schema_version WHERE version = ?")
                .bind(version)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?;

        if already_applied.is_some() {
            continue;
        }

        // Execute statement-by-statement to prevent early aborts on idempotent errors
        let statements = split_sql_statements(sql);
        for stmt in statements {
            if let Err(e) = sqlx::query(&stmt).execute(pool).await {
                let msg = e.to_string();
                if msg.contains("duplicate column name") || msg.contains("already exists") || msg.contains("non-constant default") {
                    println!("⚠️ Statement skipped (idempotent): {}", msg);
                } else {
                    return Err(format!("❌ Migration {} failed on statement:\n{}\nError: {}", version, stmt, msg));
                }
            }
        }

        // Record as applied
        sqlx::query("INSERT OR IGNORE INTO _schema_version (version) VALUES (?)")
            .bind(version)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        println!("✅ Migration {} applied.", version);
    }

    println!("✅ All migrations up to date.");
    Ok(())
}

fn split_sql_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut in_begin_end = 0;

    for line in sql.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("--") || trimmed.is_empty() {
            continue;
        }

        let upper = trimmed.to_uppercase();
        if upper.starts_with("BEGIN") || upper.contains(" BEGIN ") {
            in_begin_end += 1;
        }

        current.push_str(line);
        current.push('\n');

        if upper.contains("END;") || upper.ends_with("END") {
            if in_begin_end > 0 {
                in_begin_end -= 1;
            }
        }

        if trimmed.ends_with(';') && in_begin_end == 0 {
            let stmt = current.trim().to_string();
            if !stmt.is_empty() {
                statements.push(stmt);
            }
            current.clear();
        }
    }
    let stmt = current.trim().to_string();
    if !stmt.is_empty() {
        statements.push(stmt);
    }
    statements
}