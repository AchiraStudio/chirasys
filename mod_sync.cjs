// fallow-ignore-file unused-file
const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/commands/sync.rs', 'utf8');

// Replace receive_cloud_sync body
const newReceive = `#[tauri::command]
pub async fn receive_cloud_sync(table_name: String, payload: serde_json::Value, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    apply_cloud_sync(&state.db_pool, &table_name, &payload).await
}`;

code = code.replace(/#\[tauri::command\]\npub async fn receive_cloud_sync[\s\S]*?Ok\(\(\)\)\n\}/, newReceive);

const logic = fs.readFileSync('rust_sync_logic.txt', 'utf8');
code += '\n' + logic;

fs.writeFileSync('src-tauri/src/commands/sync.rs', code);
