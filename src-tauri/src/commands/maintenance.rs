use tauri::State;
use crate::AppState;

#[tauri::command]
pub async fn optimize_database(state: State<'_, AppState>) -> Result<String, String> {
    // 1. Run PRAGMA optimize (quick analysis)
    sqlx::query("PRAGMA optimize;")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to optimize: {}", e))?;

    // 2. Run VACUUM (rebuilds the database file, repacking it into a minimal amount of disk space)
    sqlx::query("VACUUM;")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to vacuum: {}", e))?;

    // 3. Run ANALYZE (gathers statistics about tables and indices so the query optimizer can use them)
    sqlx::query("ANALYZE;")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to analyze: {}", e))?;

    // 4. Clean up old sync queue (older than 30 days and already synced)
    sqlx::query("DELETE FROM sync_queue WHERE synced_at IS NOT NULL AND synced_at < datetime('now', '-30 days');")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to clean sync queue: {}", e))?;

    Ok("Database optimized and cleaned successfully!".to_string())
}

#[tauri::command]
pub async fn open_devtools(_webview: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(debug_assertions)]
    _webview.open_devtools();
    Ok(())
}
