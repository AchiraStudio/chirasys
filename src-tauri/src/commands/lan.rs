// src-tauri/src/commands/lan.rs
// Local Area Network (LAN) Offline Auto-Discovery, Parent-Child Architecture, and Database Synchronization Engine

use axum::{
    extract::{Query, State as AxumState},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr, UdpSocket},
    sync::Arc,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

const UDP_DISCOVERY_PORT: u16 = 3698;
const DEFAULT_HTTP_PORT: u16 = 3699;

pub const SNAPSHOT_TABLES: &[&str] = &[
    "role_default_permissions",
    "users",
    "categories",
    "brands",
    "items",
    "item_units",
    "item_prices",
    "item_price_tiers",
    "customers",
    "suppliers",
    "promos",
    "promo_bogo_rules",
    "promo_tiers",
    "promo_bundle_items",
    "accounts",
    "journal_entries",
    "journal_lines",
    "purchase_orders",
    "po_lines",
    "purchases",
    "purchase_lines",
    "purchase_payments",
    "purchase_returns",
    "purchase_return_lines",
    "sales",
    "sale_lines",
    "sale_payments",
    "sale_returns",
    "sale_return_lines",
    "stock_opname",
    "stock_opname_lines",
    "stock_ledger",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanPeer {
    pub device_id: String,
    pub device_name: String,
    pub role: String, // "parent" | "child"
    pub ip_address: String,
    pub http_port: u16,
    pub workspace_id: String,
    pub last_seen: u64,
    pub is_self: bool,
    pub is_paired: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanStatus {
    pub device_id: String,
    pub device_name: String,
    pub role: String, // "parent" | "child"
    pub local_ip: String,
    pub http_port: u16,
    pub auto_connect: bool,
    pub paired_parent_ip: Option<String>,
    pub paired_parent_port: Option<u16>,
    pub paired_parent_name: Option<String>,
    pub last_sync_time: Option<String>,
    pub last_sync_status: Option<String>,
    pub last_sync_error: Option<String>,
    pub peers_count: usize,
    pub is_server_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanBeaconPacket {
    pub app: String,
    pub version: String,
    pub workspace_id: String,
    pub device_id: String,
    pub device_name: String,
    pub role: String,
    pub http_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseSnapshot {
    pub timestamp: String,
    pub device_id: String,
    pub device_name: String,
    pub workspace_id: String,
    pub tables: HashMap<String, Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushQueueRequest {
    pub device_id: String,
    pub workspace_id: String,
    pub items: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullQueueResponse {
    pub items: Vec<serde_json::Value>,
    pub latest_timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanConnectionTestResult {
    pub success: bool,
    pub latency_ms: u64,
    pub ip_address: String,
    pub http_port: u16,
    pub device_id: String,
    pub device_name: String,
    pub role: String,
    pub workspace_id: String,
    pub items_count: i64,
    pub version: String,
    pub server_time: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanSyncResult {
    pub success: bool,
    pub pushed_count: usize,
    pub pulled_count: usize,
    pub latency_ms: u64,
    pub message: String,
    pub synced_at: String,
}

pub type PeerRegistry = Arc<RwLock<HashMap<String, LanPeer>>>;

// Global lazy state for LAN services
lazy_static::lazy_static! {
    pub static ref PEER_REGISTRY: PeerRegistry = Arc::new(RwLock::new(HashMap::new()));
}

fn now_epoch_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}

// Helper to determine the local machine's primary IPv4 address
pub fn get_local_ip() -> String {
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                return local_addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

pub fn get_device_unique_id() -> String {
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "chirasys_node".to_string());
    format!("dev_{}", hostname.to_lowercase().replace(' ', "_"))
}

// ---------------------------------------------------------------------------
// 1. EMBEDDED AXUM HTTP SERVER (RUNS ON PARENT AND CHILD FOR P2P / HUB)
// ---------------------------------------------------------------------------

#[derive(Clone)]
struct ServerContext {
    pool: SqlitePool,
    app_handle: AppHandle,
}

pub async fn start_lan_http_server(pool: SqlitePool, app_handle: AppHandle, port: u16) {
    let ctx = ServerContext {
        pool: pool.clone(),
        app_handle: app_handle.clone(),
    };

    let router = Router::new()
        .route("/api/lan/info", get(handle_lan_info))
        .route("/api/lan/export_snapshot", get(handle_export_snapshot))
        .route("/api/lan/queue/push", post(handle_queue_push))
        .route("/api/lan/queue/pull", get(handle_queue_pull))
        .route("/api/lan/remote/kick_drawer", post(handle_remote_kick_drawer))
        .route("/api/lan/remote/print_receipt", post(handle_remote_print_receipt))
        .layer(CorsLayer::permissive())
        .with_state(ctx);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("🌐 [LAN Sync] Starting local embedded server on http://0.0.0.0:{}", port);

    tauri::async_runtime::spawn(async move {
        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, router).await {
                    eprintln!("❌ [LAN Sync] HTTP Server error: {}", e);
                }
            }
            Err(e) => {
                eprintln!("⚠️ [LAN Sync] Could not bind HTTP server on port {}: {}", port, e);
            }
        }
    });
}

async fn handle_lan_info(AxumState(ctx): AxumState<ServerContext>) -> Json<serde_json::Value> {
    let role: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_role'")
        .fetch_optional(&ctx.pool)
        .await
        .unwrap_or_default()
        .unwrap_or_else(|| "child".to_string());

    let device_name: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_device_name'")
        .fetch_optional(&ctx.pool)
        .await
        .unwrap_or_default()
        .unwrap_or_else(|| "Kasir Terminal".to_string());

    let workspace_id: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id'")
        .fetch_optional(&ctx.pool)
        .await
        .unwrap_or_default()
        .unwrap_or_default();

    let items_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM items WHERE deleted_at IS NULL")
        .fetch_one(&ctx.pool)
        .await
        .unwrap_or(0);

    let sales_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sales WHERE deleted_at IS NULL")
        .fetch_one(&ctx.pool)
        .await
        .unwrap_or(0);

    Json(serde_json::json!({
        "app": "chirasys",
        "version": "1.2.0",
        "device_id": get_device_unique_id(),
        "device_name": device_name,
        "role": role,
        "workspace_id": workspace_id,
        "items_count": items_count,
        "sales_count": sales_count,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn handle_export_snapshot(
    AxumState(ctx): AxumState<ServerContext>,
) -> Result<Json<DatabaseSnapshot>, (StatusCode, String)> {
    let workspace_id: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id'")
        .fetch_optional(&ctx.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .unwrap_or_default();

    let device_name: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_device_name'")
        .fetch_optional(&ctx.pool)
        .await
        .unwrap_or_default()
        .unwrap_or_else(|| "Parent Server".to_string());

    let mut tables = HashMap::new();

    for &table in SNAPSHOT_TABLES {
        let sql = format!("SELECT * FROM {}", table);
        let rows = sqlx::query(&sql).fetch_all(&ctx.pool).await.unwrap_or_default();
        let mut list = Vec::new();
        for r in rows {
            let mut obj = serde_json::Map::new();
            use sqlx::Column;
            for col in r.columns() {
                let name = col.name();
                if let Ok(val) = r.try_get::<String, _>(name) {
                    obj.insert(name.to_string(), serde_json::Value::String(val));
                } else if let Ok(val) = r.try_get::<i64, _>(name) {
                    obj.insert(name.to_string(), serde_json::json!(val));
                } else if let Ok(val) = r.try_get::<f64, _>(name) {
                    obj.insert(name.to_string(), serde_json::json!(val));
                } else if let Ok(val) = r.try_get::<Option<String>, _>(name) {
                    obj.insert(name.to_string(), match val { Some(s) => serde_json::Value::String(s), None => serde_json::Value::Null });
                } else {
                    obj.insert(name.to_string(), serde_json::Value::Null);
                }
            }
            list.push(serde_json::Value::Object(obj));
        }
        tables.insert(table.to_string(), list);
    }

    Ok(Json(DatabaseSnapshot {
        timestamp: chrono::Utc::now().to_rfc3339(),
        device_id: get_device_unique_id(),
        device_name,
        workspace_id,
        tables,
    }))
}

async fn handle_queue_push(
    AxumState(ctx): AxumState<ServerContext>,
    Json(payload): Json<PushQueueRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut applied_count = 0;

    for item in payload.items {
        if let (Some(table_name), Some(row_data)) = (
            item.get("table_name").and_then(|v| v.as_str()),
            item.get("payload"),
        ) {
            // Apply into local DB using system_sync updated_by flag to prevent loops
            if crate::commands::sync::apply_cloud_sync(&ctx.pool, table_name, row_data).await.is_ok() {
                applied_count += 1;
            }
        }
    }

    if applied_count > 0 {
        let _ = ctx.app_handle.emit("chirasys:sync", ());
    }

    Ok(Json(serde_json::json!({
        "status": "ok",
        "applied_count": applied_count
    })))
}

#[derive(Deserialize)]
struct PullQuery {
    since: Option<String>,
}

async fn handle_queue_pull(
    AxumState(ctx): AxumState<ServerContext>,
    Query(params): Query<PullQuery>,
) -> Result<Json<PullQueueResponse>, (StatusCode, String)> {
    let since = params.since.unwrap_or_else(|| "2000-01-01T00:00:00Z".to_string());

    let rows = sqlx::query(
        "SELECT id, table_name, record_id, operation, payload, updated_at FROM sync_queue WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 500"
    )
    .bind(&since)
    .fetch_all(&ctx.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut items = Vec::new();
    let mut latest_timestamp = since;

    for r in rows {
        let id: String = r.get("id");
        let table_name: String = r.get("table_name");
        let record_id: String = r.get("record_id");
        let operation: String = r.get("operation");
        let payload_str: String = r.get("payload");
        let updated_at: String = r.get("updated_at");

        let payload_json: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Null);

        if updated_at > latest_timestamp {
            latest_timestamp = updated_at.clone();
        }

        items.push(serde_json::json!({
            "id": id,
            "table_name": table_name,
            "record_id": record_id,
            "operation": operation,
            "payload": payload_json,
            "updated_at": updated_at
        }));
    }

    Ok(Json(PullQueueResponse {
        items,
        latest_timestamp,
    }))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteKickDrawerRequest {
    pub printer_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemotePrintReceiptRequest {
    pub printer_name: Option<String>,
    pub bytes: Vec<u8>,
}

async fn handle_remote_kick_drawer(
    AxumState(_ctx): AxumState<ServerContext>,
    Json(payload): Json<RemoteKickDrawerRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let printer = payload.printer_name.unwrap_or_default();
    match crate::commands::maintenance::kick_cash_drawer(printer).await {
        Ok(msg) => Ok(Json(serde_json::json!({ "success": true, "message": msg }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

async fn handle_remote_print_receipt(
    AxumState(_ctx): AxumState<ServerContext>,
    Json(payload): Json<RemotePrintReceiptRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let printer = payload.printer_name.unwrap_or_default();
    match crate::commands::maintenance::print_raw_receipt(printer, payload.bytes).await {
        Ok(msg) => Ok(Json(serde_json::json!({ "success": true, "message": msg }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

// ---------------------------------------------------------------------------
// 2. UDP BROADCAST DISCOVERY BEACON & LISTENER
// ---------------------------------------------------------------------------

pub async fn spawn_lan_discovery_service(pool: SqlitePool, app_handle: AppHandle) {
    let device_id = get_device_unique_id();
    let pool_clone = pool.clone();
    let app_handle_clone = app_handle.clone();

    // Task A: UDP Broadcaster (Beacons every 3 seconds)
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(3)).await;

            let role: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_role'")
                .fetch_optional(&pool_clone)
                .await
                .unwrap_or_default()
                .unwrap_or_else(|| "child".to_string());

            let device_name: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_device_name'")
                .fetch_optional(&pool_clone)
                .await
                .unwrap_or_default()
                .unwrap_or_else(|| "Kasir Terminal".to_string());

            let workspace_id: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id'")
                .fetch_optional(&pool_clone)
                .await
                .unwrap_or_default()
                .unwrap_or_default();

            let packet = LanBeaconPacket {
                app: "chirasys".to_string(),
                version: "1.2.0".to_string(),
                workspace_id,
                device_id: device_id.clone(),
                device_name,
                role,
                http_port: DEFAULT_HTTP_PORT,
            };

            if let Ok(bytes) = serde_json::to_vec(&packet) {
                if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
                    let _ = socket.set_broadcast(true);
                    let target = format!("255.255.255.255:{}", UDP_DISCOVERY_PORT);
                    let _ = socket.send_to(&bytes, target);
                }
            }
        }
    });

    // Task B: UDP Listener (Collects peers and maintains in-memory radar)
    tauri::async_runtime::spawn(async move {
        let socket = match UdpSocket::bind(format!("0.0.0.0:{}", UDP_DISCOVERY_PORT)) {
            Ok(s) => {
                let _ = s.set_broadcast(true);
                let _ = s.set_nonblocking(true);
                s
            }
            Err(e) => {
                eprintln!("⚠️ [LAN Discovery] Failed to bind UDP listener on {}: {}", UDP_DISCOVERY_PORT, e);
                return;
            }
        };

        let mut buf = [0u8; 4096];
        let self_id = get_device_unique_id();

        loop {
            tokio::time::sleep(Duration::from_millis(200)).await;

            while let Ok((amt, src)) = socket.recv_from(&mut buf) {
                if let Ok(packet) = serde_json::from_slice::<LanBeaconPacket>(&buf[..amt]) {
                    if packet.app == "chirasys" {
                        let is_self = packet.device_id == self_id;
                        let peer_ip = match src.ip() {
                            IpAddr::V4(ipv4) => ipv4.to_string(),
                            IpAddr::V6(ipv6) => ipv6.to_string(),
                        };

                        let peer = LanPeer {
                            device_id: packet.device_id.clone(),
                            device_name: packet.device_name,
                            role: packet.role,
                            ip_address: peer_ip,
                            http_port: packet.http_port,
                            workspace_id: packet.workspace_id,
                            last_seen: now_epoch_secs(),
                            is_self,
                            is_paired: false,
                        };

                        {
                            let mut peers = PEER_REGISTRY.write().await;
                            peers.insert(packet.device_id.clone(), peer);
                        }
                    }
                }
            }

            // Prune stale peers (inactive > 10 seconds)
            let now = now_epoch_secs();
            let mut changed = false;
            {
                let mut peers = PEER_REGISTRY.write().await;
                let before_len = peers.len();
                peers.retain(|_, p| p.is_self || (now - p.last_seen) < 10);
                if peers.len() != before_len {
                    changed = true;
                }
            }

            if changed {
                let peers_list = {
                    let peers = PEER_REGISTRY.read().await;
                    peers.values().cloned().collect::<Vec<_>>()
                };
                let _ = app_handle_clone.emit("chirasys:lan_peers_updated", peers_list);
            }
        }
    });

    // Task C: Background LAN Sync Loop
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;

            let role: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_role'")
                .fetch_optional(&pool)
                .await
                .unwrap_or_default()
                .unwrap_or_else(|| "child".to_string());

            if role != "child" {
                continue;
            }

            let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip' AND value != ''")
                .fetch_optional(&pool)
                .await
                .unwrap_or(None);

            let auto_connect_str: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_auto_connect'")
                .fetch_optional(&pool)
                .await
                .unwrap_or_default()
                .unwrap_or_else(|| "true".to_string());

            let auto_connect = auto_connect_str != "false" && auto_connect_str != "0";

            let target_parent: Option<(String, u16, String)> = if let Some(ip) = paired_parent_ip {
                let port_str: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_port'")
                    .fetch_optional(&pool)
                    .await
                    .unwrap_or_default()
                    .unwrap_or_else(|| "3699".to_string());
                let port: u16 = port_str.parse().unwrap_or(DEFAULT_HTTP_PORT);
                let ws_id: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id'")
                    .fetch_optional(&pool)
                    .await
                    .unwrap_or_default()
                    .unwrap_or_default();
                Some((ip, port, ws_id))
            } else if auto_connect {
                let peers = PEER_REGISTRY.read().await;
                peers.values().find(|p| p.role == "parent" && !p.is_self).map(|p| (p.ip_address.clone(), p.http_port, p.workspace_id.clone()))
            } else {
                None
            };

            if let Some((parent_ip, parent_port, parent_ws_id)) = target_parent {
                let mut sync_success = true;
                let mut sync_error_msg = None;

                // Push un-synced queue to Parent
                let pending_rows = sqlx::query(
                    "SELECT id, table_name, record_id, operation, payload FROM sync_queue WHERE synced_at IS NULL AND retry_count < 5 LIMIT 50"
                )
                .fetch_all(&pool)
                .await
                .unwrap_or_default();

                if !pending_rows.is_empty() {
                    let mut items = Vec::new();
                    let mut ids_to_mark = Vec::new();
                    for r in pending_rows {
                        let q_id: String = r.get("id");
                        let t_name: String = r.get("table_name");
                        let p_str: String = r.get("payload");
                        let p_json: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);

                        ids_to_mark.push(q_id);
                        items.push(serde_json::json!({
                            "table_name": t_name,
                            "payload": p_json
                        }));
                    }

                    let push_url = format!("http://{}:{}/api/lan/queue/push", parent_ip, parent_port);
                    let push_payload = PushQueueRequest {
                        device_id: get_device_unique_id(),
                        workspace_id: parent_ws_id,
                        items,
                    };

                    match client.post(&push_url).json(&push_payload).send().await {
                        Ok(res) if res.status().is_success() => {
                            let now_ts = chrono::Utc::now().to_rfc3339();
                            for q_id in ids_to_mark {
                                let _ = sqlx::query("UPDATE sync_queue SET synced_at = ? WHERE id = ?")
                                    .bind(&now_ts)
                                    .bind(&q_id)
                                    .execute(&pool)
                                    .await;
                            }
                        }
                        Ok(res) => {
                            sync_success = false;
                            sync_error_msg = Some(format!("HTTP Push Error: {}", res.status()));
                        }
                        Err(e) => {
                            sync_success = false;
                            sync_error_msg = Some(format!("Network Push Error: {}", e));
                        }
                    }
                }

                // Pull latest queue from Parent
                let last_pull_ts: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_last_pull_at'")
                    .fetch_optional(&pool)
                    .await
                    .unwrap_or_default()
                    .unwrap_or_else(|| "2000-01-01T00:00:00Z".to_string());

                let pull_url = format!("http://{}:{}/api/lan/queue/pull?since={}", parent_ip, parent_port, last_pull_ts);
                match client.get(&pull_url).send().await {
                    Ok(res) if res.status().is_success() => {
                        if let Ok(data) = res.json::<PullQueueResponse>().await {
                            let mut pulled_any = false;
                            for item in data.items {
                                if let (Some(t_name), Some(row_data)) = (
                                    item.get("table_name").and_then(|v| v.as_str()),
                                    item.get("payload"),
                                ) {
                                    if crate::commands::sync::apply_cloud_sync(&pool, t_name, row_data).await.is_ok() {
                                        pulled_any = true;
                                    }
                                }
                            }

                            if data.latest_timestamp > last_pull_ts {
                                let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_pull_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                                    .bind(&data.latest_timestamp)
                                    .execute(&pool)
                                    .await;
                            }

                            if pulled_any {
                                let _ = app_handle.emit("chirasys:sync", ());
                            }
                        }
                    }
                    Ok(res) => {
                        sync_success = false;
                        sync_error_msg = Some(format!("HTTP Pull Error: {}", res.status()));
                    }
                    Err(e) => {
                        sync_success = false;
                        sync_error_msg = Some(format!("Network Pull Error: {}", e));
                    }
                }

                let now_ts = chrono::Utc::now().to_rfc3339();
                let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_time', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                    .bind(&now_ts)
                    .execute(&pool)
                    .await;

                let status_val = if sync_success { "ok" } else { "error" };
                let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_status', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                    .bind(status_val)
                    .execute(&pool)
                    .await;

                if let Some(err) = sync_error_msg {
                    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_error', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                        .bind(&err)
                        .execute(&pool)
                        .await;
                } else {
                    let _ = sqlx::query("DELETE FROM global_settings WHERE key = 'lan_last_sync_error'")
                        .execute(&pool)
                        .await;
                }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// 3. TAURI COMMANDS EXPOSED TO FRONTEND
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn get_lan_status(state: tauri::State<'_, crate::AppState>) -> Result<LanStatus, String> {
    let role: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_role'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "child".to_string());

    let device_name: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_device_name'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "Kasir Terminal".to_string());

    let auto_connect_str: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_auto_connect'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "true".to_string());

    let auto_connect = auto_connect_str != "false" && auto_connect_str != "0";

    let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip' AND value != ''")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .flatten();

    let paired_parent_port: Option<u16> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_port'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .and_then(|s: String| s.parse().ok())
        .or(Some(DEFAULT_HTTP_PORT));

    let paired_parent_name: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_name'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .flatten();

    let last_sync_time: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_last_sync_time'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .flatten();

    let last_sync_status: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_last_sync_status'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .flatten();

    let last_sync_error: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_last_sync_error'")
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?
        .flatten();

    let peers_count = {
        let peers = PEER_REGISTRY.read().await;
        peers.len()
    };

    Ok(LanStatus {
        device_id: get_device_unique_id(),
        device_name,
        role,
        local_ip: get_local_ip(),
        http_port: DEFAULT_HTTP_PORT,
        auto_connect,
        paired_parent_ip,
        paired_parent_port,
        paired_parent_name,
        last_sync_time,
        last_sync_status,
        last_sync_error,
        peers_count,
        is_server_running: true,
    })
}

#[tauri::command]
pub async fn get_lan_peers(state: tauri::State<'_, crate::AppState>) -> Result<Vec<LanPeer>, String> {
    let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip' AND value != ''")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None);

    let peers = PEER_REGISTRY.read().await;
    let mut list = Vec::new();
    for p in peers.values() {
        let mut cloned = p.clone();
        if let Some(ref pip) = paired_parent_ip {
            if &cloned.ip_address == pip {
                cloned.is_paired = true;
            }
        }
        list.push(cloned);
    }
    Ok(list)
}

#[tauri::command]
pub async fn set_lan_role(role: String, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    let normalized = if role.to_lowercase() == "parent" { "parent" } else { "child" };
    sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_role', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(normalized)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn set_lan_device_name(name: String, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Nama perangkat tidak boleh kosong".to_string());
    }

    sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_device_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(trimmed)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn set_lan_auto_connect(enabled: bool, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    let val = if enabled { "true" } else { "false" };
    sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_auto_connect', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(val)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn test_lan_connection(
    ip: String,
    port: Option<u16>,
) -> Result<LanConnectionTestResult, String> {
    let port = port.unwrap_or(DEFAULT_HTTP_PORT);
    let trimmed_ip = ip.trim();
    let url = format!("http://{}:{}/api/lan/info", trimmed_ip, port);
    let start_time = Instant::now();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(&url).send().await {
        Ok(res) if res.status().is_success() => {
            let latency_ms = start_time.elapsed().as_millis() as u64;
            if let Ok(info) = res.json::<serde_json::Value>().await {
                Ok(LanConnectionTestResult {
                    success: true,
                    latency_ms,
                    ip_address: trimmed_ip.to_string(),
                    http_port: port,
                    device_id: info.get("device_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    device_name: info.get("device_name").and_then(|v| v.as_str()).unwrap_or("Server").to_string(),
                    role: info.get("role").and_then(|v| v.as_str()).unwrap_or("parent").to_string(),
                    workspace_id: info.get("workspace_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    items_count: info.get("items_count").and_then(|v| v.as_i64()).unwrap_or(0),
                    version: info.get("version").and_then(|v| v.as_str()).unwrap_or("1.2.0").to_string(),
                    server_time: info.get("timestamp").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    error: None,
                })
            } else {
                Ok(LanConnectionTestResult {
                    success: false,
                    latency_ms: start_time.elapsed().as_millis() as u64,
                    ip_address: trimmed_ip.to_string(),
                    http_port: port,
                    device_id: "".to_string(),
                    device_name: "".to_string(),
                    role: "".to_string(),
                    workspace_id: "".to_string(),
                    items_count: 0,
                    version: "".to_string(),
                    server_time: "".to_string(),
                    error: Some("Format JSON dari Perangkat Induk tidak sesuai".to_string()),
                })
            }
        }
        Ok(res) => {
            Ok(LanConnectionTestResult {
                success: false,
                latency_ms: start_time.elapsed().as_millis() as u64,
                ip_address: trimmed_ip.to_string(),
                http_port: port,
                device_id: "".to_string(),
                device_name: "".to_string(),
                role: "".to_string(),
                workspace_id: "".to_string(),
                items_count: 0,
                version: "".to_string(),
                server_time: "".to_string(),
                error: Some(format!("Server merespons status HTTP {}", res.status())),
            })
        }
        Err(e) => {
            Ok(LanConnectionTestResult {
                success: false,
                latency_ms: start_time.elapsed().as_millis() as u64,
                ip_address: trimmed_ip.to_string(),
                http_port: port,
                device_id: "".to_string(),
                device_name: "".to_string(),
                role: "".to_string(),
                workspace_id: "".to_string(),
                items_count: 0,
                version: "".to_string(),
                server_time: "".to_string(),
                error: Some(format!("Gagal terhubung: {}", e)),
            })
        }
    }
}

#[tauri::command]
pub async fn connect_lan_parent(
    parent_ip: String,
    parent_port: Option<u16>,
    parent_name: Option<String>,
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<LanConnectionTestResult, String> {
    let port = parent_port.unwrap_or(DEFAULT_HTTP_PORT);
    let trimmed_ip = parent_ip.trim().to_string();

    let test_res = test_lan_connection(trimmed_ip.clone(), Some(port)).await?;
    if !test_res.success {
        return Err(test_res.error.unwrap_or_else(|| "Gagal terhubung ke Perangkat Induk.".to_string()));
    }

    let name = parent_name.unwrap_or_else(|| test_res.device_name.clone());

    sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_ip', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&trimmed_ip)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_port', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(port.to_string())
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&name)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if !test_res.workspace_id.is_empty() {
        sqlx::query("INSERT INTO global_settings (key, value) VALUES ('workspace_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(&test_res.workspace_id)
            .execute(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    let _ = app_handle.emit("chirasys:lan_status_updated", ());
    Ok(test_res)
}

#[tauri::command]
pub async fn disconnect_lan_parent(
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
    for key in &["lan_paired_parent_ip", "lan_paired_parent_port", "lan_paired_parent_name"] {
        let _ = sqlx::query("DELETE FROM global_settings WHERE key = ?")
            .bind(key)
            .execute(&state.db_pool)
            .await;
    }

    // Disable auto-connect so it doesn't immediately reconnect
    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_auto_connect', 'false') ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .execute(&state.db_pool)
        .await;

    let _ = app_handle.emit("chirasys:lan_status_updated", ());
    Ok(())
}

#[tauri::command]
pub async fn trigger_lan_sync_now(
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<LanSyncResult, String> {
    let pool = &state.db_pool;
    let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip' AND value != ''")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .flatten();

    let (parent_ip, parent_port, parent_ws_id) = if let Some(ip) = paired_parent_ip {
        let port_str: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_port'")
            .fetch_optional(pool)
            .await
            .unwrap_or_default()
            .unwrap_or_else(|| "3699".to_string());
        let port: u16 = port_str.parse().unwrap_or(DEFAULT_HTTP_PORT);
        let ws_id: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id'")
            .fetch_optional(pool)
            .await
            .unwrap_or_default()
            .unwrap_or_default();
        (ip, port, ws_id)
    } else {
        let peers = PEER_REGISTRY.read().await;
        if let Some(p) = peers.values().find(|p| p.role == "parent" && !p.is_self) {
            (p.ip_address.clone(), p.http_port, p.workspace_id.clone())
        } else {
            return Err("Tidak ada Perangkat Induk yang terhubung atau terdeteksi di jaringan.".to_string());
        }
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let start_time = Instant::now();
    let mut pushed_count = 0;
    let mut pulled_count = 0;

    // 1. Push pending queue
    let pending_rows = sqlx::query(
        "SELECT id, table_name, record_id, operation, payload FROM sync_queue WHERE synced_at IS NULL AND retry_count < 5 LIMIT 100"
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    if !pending_rows.is_empty() {
        let mut items = Vec::new();
        let mut ids_to_mark = Vec::new();
        for r in pending_rows {
            let q_id: String = r.get("id");
            let t_name: String = r.get("table_name");
            let p_str: String = r.get("payload");
            let p_json: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);

            ids_to_mark.push(q_id);
            items.push(serde_json::json!({
                "table_name": t_name,
                "payload": p_json
            }));
        }

        let push_url = format!("http://{}:{}/api/lan/queue/push", parent_ip, parent_port);
        let push_payload = PushQueueRequest {
            device_id: get_device_unique_id(),
            workspace_id: parent_ws_id,
            items,
        };

        let res = client.post(&push_url).json(&push_payload).send().await
            .map_err(|e| format!("Gagal mengirim data ke Induk: {}", e))?;

        if res.status().is_success() {
            let now_ts = chrono::Utc::now().to_rfc3339();
            pushed_count = ids_to_mark.len();
            for q_id in ids_to_mark {
                let _ = sqlx::query("UPDATE sync_queue SET synced_at = ? WHERE id = ?")
                    .bind(&now_ts)
                    .bind(&q_id)
                    .execute(pool)
                    .await;
            }
        } else {
            return Err(format!("Perangkat Induk menolak push data (HTTP {})", res.status()));
        }
    }

    // 2. Pull latest delta
    let last_pull_ts: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_last_pull_at'")
        .fetch_optional(pool)
        .await
        .unwrap_or_default()
        .unwrap_or_else(|| "2000-01-01T00:00:00Z".to_string());

    let pull_url = format!("http://{}:{}/api/lan/queue/pull?since={}", parent_ip, parent_port, last_pull_ts);
    let res = client.get(&pull_url).send().await
        .map_err(|e| format!("Gagal mengambil data dari Induk: {}", e))?;

    if res.status().is_success() {
        if let Ok(data) = res.json::<PullQueueResponse>().await {
            for item in &data.items {
                if let (Some(t_name), Some(row_data)) = (
                    item.get("table_name").and_then(|v| v.as_str()),
                    item.get("payload"),
                ) {
                    if crate::commands::sync::apply_cloud_sync(pool, t_name, row_data).await.is_ok() {
                        pulled_count += 1;
                    }
                }
            }

            if data.latest_timestamp > last_pull_ts {
                let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_pull_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                    .bind(&data.latest_timestamp)
                    .execute(pool)
                    .await;
            }
        }
    }

    let latency_ms = start_time.elapsed().as_millis() as u64;
    let synced_at = chrono::Utc::now().to_rfc3339();

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_time', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&synced_at)
        .execute(pool)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_status', 'ok') ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .execute(pool)
        .await;

    let _ = sqlx::query("DELETE FROM global_settings WHERE key = 'lan_last_sync_error'")
        .execute(pool)
        .await;

    if pushed_count > 0 || pulled_count > 0 {
        let _ = app_handle.emit("chirasys:sync", ());
    }

    Ok(LanSyncResult {
        success: true,
        pushed_count,
        pulled_count,
        latency_ms,
        message: format!("Sinkronisasi berhasil: {} terkirim, {} diterima ({} ms)", pushed_count, pulled_count, latency_ms),
        synced_at,
    })
}

/// OVERWRITE & CLONE DATABASE FROM PARENT MACHINE
#[tauri::command]
pub async fn clone_from_parent(
    parent_ip: String,
    parent_port: Option<u16>,
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<usize, String> {
    let port = parent_port.unwrap_or(DEFAULT_HTTP_PORT);
    let trimmed_ip = parent_ip.trim();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let export_url = format!("http://{}:{}/api/lan/export_snapshot", trimmed_ip, port);
    println!("📥 [LAN Clone] Downloading base database from Parent at {}", export_url);

    let res = client
        .get(&export_url)
        .send()
        .await
        .map_err(|e| format!("Gagal menghubungi Perangkat Induk ({}): {}", export_url, e))?;

    if !res.status().is_success() {
        return Err(format!("Perangkat Induk mengembalikan status error HTTP {}", res.status()));
    }

    let snapshot: DatabaseSnapshot = res
        .json()
        .await
        .map_err(|e| format!("Gagal memproses snapshot dari Induk: {}", e))?;

    let pool = &state.db_pool;
    let mut total_records_imported = 0;

    // Execute within a transaction for atomicity and safety
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Disable foreign key enforcement during full atomic hydration
    let _ = sqlx::query("PRAGMA foreign_keys = OFF;").execute(&mut *tx).await;

    for &table in SNAPSHOT_TABLES {
        if let Some(rows) = snapshot.tables.get(table) {
            let clear_sql = format!("DELETE FROM {}", table);
            let _ = sqlx::query(&clear_sql).execute(&mut *tx).await;

            for r in rows {
                if let Some(obj) = r.as_object() {
                    let columns: Vec<String> = obj.keys().cloned().collect();
                    if columns.is_empty() {
                        continue;
                    }
                    let placeholders = vec!["?"; columns.len()].join(", ");
                    let insert_sql = format!(
                        "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                        table,
                        columns.join(", "),
                        placeholders
                    );

                    let mut q = sqlx::query(&insert_sql);
                    for col in &columns {
                        match &obj[col] {
                            serde_json::Value::Null => q = q.bind(None::<String>),
                            serde_json::Value::Bool(b) => q = q.bind(if *b { 1 } else { 0 }),
                            serde_json::Value::Number(n) => {
                                if let Some(i) = n.as_i64() {
                                    q = q.bind(i);
                                } else if let Some(f) = n.as_f64() {
                                    q = q.bind(f);
                                } else {
                                    q = q.bind(n.to_string());
                                }
                            }
                            serde_json::Value::String(s) => q = q.bind(s),
                            other => q = q.bind(other.to_string()),
                        }
                    }

                    if q.execute(&mut *tx).await.is_ok() {
                        total_records_imported += 1;
                    }
                }
            }
        }
    }

    // Record pairing, parent name, and workspace info
    if !snapshot.workspace_id.is_empty() {
        let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('workspace_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(&snapshot.workspace_id)
            .execute(&mut *tx)
            .await;
    }

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_ip', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(trimmed_ip)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_port', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(port.to_string())
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&snapshot.device_name)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_pull_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&snapshot.timestamp)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_time', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&snapshot.timestamp)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_sync_status', 'ok') ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .execute(&mut *tx)
        .await;

    // Re-enable foreign keys and commit
    let _ = sqlx::query("PRAGMA foreign_keys = ON;").execute(&mut *tx).await;
    tx.commit().await.map_err(|e| e.to_string())?;

    println!("✅ [LAN Clone] Successfully imported {} records from Parent ({}).", total_records_imported, trimmed_ip);

    // Notify UI to refresh all states
    let _ = app_handle.emit("chirasys:sync", ());
    let _ = app_handle.emit("chirasys:lan_status_updated", ());

    Ok(total_records_imported)
}

#[tauri::command]
pub async fn lan_remote_kick_drawer(
    printer_name: Option<String>,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip' AND value != ''")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None);

    let paired_parent_port: u16 = sqlx::query_scalar::<_, String>("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_port'")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None)
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_HTTP_PORT);

    if let Some(parent_ip) = paired_parent_ip {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .map_err(|e| e.to_string())?;

        let url = format!("http://{}:{}/api/lan/remote/kick_drawer", parent_ip, paired_parent_port);
        let payload = RemoteKickDrawerRequest { printer_name: printer_name.clone() };

        if let Ok(res) = client.post(&url).json(&payload).send().await {
            if res.status().is_success() {
                return Ok("Laci kasir server utama berhasil dibuka via LAN!".to_string());
            }
        }
    }

    // Fallback to local
    crate::commands::maintenance::kick_cash_drawer(printer_name.unwrap_or_default()).await
}

#[tauri::command]
pub async fn lan_remote_print_receipt(
    printer_name: Option<String>,
    bytes: Vec<u8>,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip' AND value != ''")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None);

    let paired_parent_port: u16 = sqlx::query_scalar::<_, String>("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_port'")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None)
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_HTTP_PORT);

    if let Some(parent_ip) = paired_parent_ip {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .map_err(|e| e.to_string())?;

        let url = format!("http://{}:{}/api/lan/remote/print_receipt", parent_ip, paired_parent_port);
        let payload = RemotePrintReceiptRequest {
            printer_name: printer_name.clone(),
            bytes: bytes.clone(),
        };

        if let Ok(res) = client.post(&url).json(&payload).send().await {
            if res.status().is_success() {
                return Ok("Struk berhasil dikirim dan dicetak pada server utama via LAN!".to_string());
            }
        }
    }

    // Fallback to local
    crate::commands::maintenance::print_raw_receipt(printer_name.unwrap_or_default(), bytes).await
}
