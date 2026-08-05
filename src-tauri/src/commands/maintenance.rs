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
pub async fn export_database(state: State<'_, AppState>, target_path: String) -> Result<String, String> {
    // If target file exists, remove it first because VACUUM INTO fails if file already exists
    let path = std::path::Path::new(&target_path);
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }

    let sanitized_path = target_path.replace("'", "''");
    let sql = format!("VACUUM INTO '{}';", sanitized_path);
    sqlx::query(&sql)
        .execute(&state.db_pool)
        .await
        .map_err(|e| format!("Failed to export database: {}", e))?;

    Ok("Database exported successfully!".to_string())
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

#[cfg(target_os = "windows")]
mod winspool {
    use std::ffi::CString;
    use std::ptr;

    #[repr(C)]
    struct DocInfoA {
        p_doc_name: *const i8,
        p_output_file: *const i8,
        p_data_type: *const i8,
    }

    #[link(name = "winspool")]
    extern "system" {
        fn OpenPrinterA(p_printer_name: *const i8, ph_printer: *mut usize, p_default: *const std::ffi::c_void) -> i32;
        fn ClosePrinter(h_printer: usize) -> i32;
        fn StartDocPrinterA(h_printer: usize, level: u32, p_doc_info: *const DocInfoA) -> u32;
        fn EndDocPrinter(h_printer: usize) -> i32;
        fn StartPagePrinter(h_printer: usize) -> i32;
        fn EndPagePrinter(h_printer: usize) -> i32;
        fn WritePrinter(h_printer: usize, p_buf: *const std::ffi::c_void, buf_size: u32, p_written: *mut u32) -> i32;
    }

    pub unsafe fn send_bytes_to_printer(printer_name: &str, bytes: &[u8]) -> Result<(), String> {
        let c_printer_name = CString::new(printer_name).map_err(|e| e.to_string())?;
        let c_doc_name = CString::new("Cash Drawer Kick").map_err(|e| e.to_string())?;
        let c_data_type = CString::new("RAW").map_err(|e| e.to_string())?;

        let mut h_printer: usize = 0;
        if OpenPrinterA(c_printer_name.as_ptr(), &mut h_printer, ptr::null()) == 0 {
            return Err(format!("Failed to open printer '{}' (Check printer name)", printer_name));
        }

        let doc_info = DocInfoA {
            p_doc_name: c_doc_name.as_ptr(),
            p_output_file: ptr::null(),
            p_data_type: c_data_type.as_ptr(),
        };

        if StartDocPrinterA(h_printer, 1, &doc_info) == 0 {
            ClosePrinter(h_printer);
            return Err("Failed to start printer document".to_string());
        }

        if StartPagePrinter(h_printer) == 0 {
            EndDocPrinter(h_printer);
            ClosePrinter(h_printer);
            return Err("Failed to start printer page".to_string());
        }

        let mut written: u32 = 0;
        let success = WritePrinter(h_printer, bytes.as_ptr() as *const _, bytes.len() as u32, &mut written);

        EndPagePrinter(h_printer);
        EndDocPrinter(h_printer);
        ClosePrinter(h_printer);

        if success == 0 || written == 0 {
            Err("Failed to write bytes to printer".to_string())
        } else {
            Ok(())
        }
    }
}

/// Send ESC/POS cash drawer kick pulse natively via Windows Spooler C-FFI (Instant <1ms execution)
#[tauri::command]
pub async fn kick_cash_drawer(printer_name: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // HPRT TP806 / Standard ESC/POS cash drawer kick: ESC p <pin> <on-time> <off-time>
        // Raw bytes: 27, 112, 0, 25, 250 (0x1B 0x70 0x00 0x19 0xFA)
        let kick_bytes: [u8; 5] = [27, 112, 0, 25, 250];
        unsafe {
            winspool::send_bytes_to_printer(&printer_name, &kick_bytes)?;
        }
        Ok("Cash drawer kick pulse sent instantly!".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Linux/macOS fallback
        use std::process::Command;
        let output = Command::new("sh")
            .args([
                "-c",
                &format!(
                    r#"printf '\x1b\x70\x00\x19\xfa' > {}"#,
                    printer_name
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

/// Send raw byte array directly to printer via Windows Spooler C-FFI
#[tauri::command]
pub async fn print_raw_receipt(printer_name: String, bytes: Vec<u8>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        unsafe {
            winspool::send_bytes_to_printer(&printer_name, &bytes)?;
        }
        Ok("Print job sent instantly!".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Linux/macOS fallback: pipe bytes directly to lp
        use std::process::{Command, Stdio};
        use std::io::Write;
        
        let mut child = Command::new("lp")
            .args(["-d", &printer_name, "-o", "raw"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn lp: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(&bytes).map_err(|e| format!("Failed to write to lp stdin: {}", e))?;
        }

        let output = child.wait_with_output().map_err(|e| format!("Failed to wait on lp: {}", e))?;

        if output.status.success() {
            Ok("Print job sent!".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}
