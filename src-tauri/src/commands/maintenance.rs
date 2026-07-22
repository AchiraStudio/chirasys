use tauri::State;
use crate::AppState;

#[tauri::command]
pub async fn optimize_database(state: State<'_, AppState>) -> Result<String, String> {
    sqlx::query("PRAGMA optimize;")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to optimize: {}", e))?;

    sqlx::query("VACUUM;")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to vacuum: {}", e))?;

    sqlx::query("ANALYZE;")
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to analyze: {}", e))?;

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

/// Detect system printers via PowerShell (Windows) or lpstat (Linux/macOS)
#[tauri::command]
pub async fn list_printers() -> Result<Vec<serde_json::Value>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json -Depth 2",
            ])
            .output()
            .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell error: {}", err));
        }

        let raw = String::from_utf8_lossy(&output.stdout);
        let trimmed = raw.trim();

        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        // PowerShell returns a single object (not array) if only 1 printer — normalize
        let json_val: serde_json::Value = serde_json::from_str(trimmed)
            .map_err(|e| format!("JSON parse error: {} - raw: {}", e, &trimmed[..trimmed.len().min(300)]))?;

        let printers: Vec<serde_json::Value> = match json_val {
            serde_json::Value::Array(arr) => arr,
            single => vec![single],
        };

        Ok(printers)
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        let output = Command::new("lpstat")
            .args(["-p"])
            .output()
            .map_err(|e| format!("Failed to run lpstat: {}", e))?;

        let raw = String::from_utf8_lossy(&output.stdout);
        let printers: Vec<serde_json::Value> = raw
            .lines()
            .filter(|l| l.starts_with("printer "))
            .map(|l| {
                let name = l.split_whitespace().nth(1).unwrap_or("Unknown").to_string();
                let is_idle = l.contains("idle");
                serde_json::json!({
                    "Name": name,
                    "DriverName": "Unknown",
                    "PortName": "Unknown",
                    "PrinterStatus": if is_idle { 0 } else { 1 },
                    "Default": false
                })
            })
            .collect();
        Ok(printers)
    }
}

/// Send ESC/POS cash drawer kick pulse via PowerShell raw bytes to printer port
/// This writes the standard ESC/POS sequence: ESC p 0 64 240
#[tauri::command]
pub async fn kick_cash_drawer(printer_port: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // ESC/POS cash drawer kick: ESC p <pin> <on-time> <off-time>
        // Standard: 27, 112, 0, 64, 240
        // Try writing raw bytes to the printer port (e.g., "LPT1:", "COM1:", or UNC path "\\.\printer_name")
        let script = format!(
            r#"
$port = '{}'
$kickBytes = [byte[]](27, 112, 0, 64, 240)
try {{
    $stream = [System.IO.File]::OpenWrite($port)
    $stream.Write($kickBytes, 0, $kickBytes.Length)
    $stream.Flush()
    $stream.Close()
    Write-Output "OK"
}} catch {{
    Write-Error $_.Exception.Message
}}
"#,
            printer_port
        );

        let output = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script.trim()])
            .output()
            .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        if output.status.success() && !stdout.is_empty() {
            Ok("Cash drawer kick pulse sent successfully!".to_string())
        } else if !stderr.is_empty() {
            Err(format!("Drawer kick failed: {}", stderr))
        } else {
            Ok("Kick signal sent (port may require physical hardware).".to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Linux/macOS: write ESC/POS bytes to /dev/usb/lp0 or similar
        use std::process::Command;
        let output = Command::new("sh")
            .args([
                "-c",
                &format!(
                    r#"printf '\x1b\x70\x00\x40\xf0' > {}"#,
                    printer_port
                ),
            ])
            .output()
            .map_err(|e| format!("Failed: {}", e))?;

        if output.status.success() {
            Ok("Cash drawer kick sent!".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}
