// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::env::set_var("RUST_BACKTRACE", "full");

    std::panic::set_hook(Box::new(|info| {
        let timestamp = chrono::Local::now().to_rfc3339();
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        let msg = format!(
            "[{}] APPLICATION CRASH REPORT\nPanic: {}\nLocation: {}\nBacktrace:\n{:?}\n\n",
            timestamp,
            payload,
            location,
            std::backtrace::Backtrace::capture()
        );

        eprintln!("{}", msg);

        if let Some(appdata) = std::env::var_os("APPDATA") {
            let _ = std::fs::write(std::path::Path::new(&appdata).join("chirasys_crash.log"), &msg);
        }
        if let Some(localappdata) = std::env::var_os("LOCALAPPDATA") {
            let _ = std::fs::write(std::path::Path::new(&localappdata).join("chirasys_crash.log"), &msg);
        }
        let _ = std::fs::write("crash.log", &msg);
    }));

    chirasys::run()
}
