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
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

const UDP_DISCOVERY_PORT: u16 = 3698;
const DEFAULT_HTTP_PORT: u16 = 3699;

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
    pub categories: Vec<serde_json::Value>,
    pub brands: Vec<serde_json::Value>,
    pub items: Vec<serde_json::Value>,
    pub item_units: Vec<serde_json::Value>,
    pub item_prices: Vec<serde_json::Value>,
    pub item_price_tiers: Vec<serde_json::Value>,
    pub customers: Vec<serde_json::Value>,
    pub suppliers: Vec<serde_json::Value>,
    pub promos: Vec<serde_json::Value>,
    pub promo_bogo_rules: Vec<serde_json::Value>,
    pub promo_tiers: Vec<serde_json::Value>,
    pub promo_bundle_items: Vec<serde_json::Value>,
    pub accounts: Vec<serde_json::Value>,
    pub stock_ledger: Vec<serde_json::Value>,
    pub role_default_permissions: Vec<serde_json::Value>,
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
    // Generate or fetch a stable device identifier
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

    Json(serde_json::json!({
        "app": "chirasys",
        "version": "1.0.0",
        "device_id": get_device_unique_id(),
        "device_name": device_name,
        "role": role,
        "workspace_id": workspace_id,
        "items_count": items_count,
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

    // Helper macro / closure to query table rows as generic JSON values
    async fn fetch_table_json(pool: &SqlitePool, table: &str) -> Vec<serde_json::Value> {
        let sql = format!("SELECT * FROM {}", table);
        let rows = sqlx::query(&sql).fetch_all(pool).await.unwrap_or_default();
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
        list
    }

    let categories = fetch_table_json(&ctx.pool, "categories").await;
    let brands = fetch_table_json(&ctx.pool, "brands").await;
    let items = fetch_table_json(&ctx.pool, "items").await;
    let item_units = fetch_table_json(&ctx.pool, "item_units").await;
    let item_prices = fetch_table_json(&ctx.pool, "item_prices").await;
    let item_price_tiers = fetch_table_json(&ctx.pool, "item_price_tiers").await;
    let customers = fetch_table_json(&ctx.pool, "customers").await;
    let suppliers = fetch_table_json(&ctx.pool, "suppliers").await;
    let promos = fetch_table_json(&ctx.pool, "promos").await;
    let promo_bogo_rules = fetch_table_json(&ctx.pool, "promo_bogo_rules").await;
    let promo_tiers = fetch_table_json(&ctx.pool, "promo_tiers").await;
    let promo_bundle_items = fetch_table_json(&ctx.pool, "promo_bundle_items").await;
    let accounts = fetch_table_json(&ctx.pool, "accounts").await;
    let stock_ledger = fetch_table_json(&ctx.pool, "stock_ledger").await;
    let role_default_permissions = fetch_table_json(&ctx.pool, "role_default_permissions").await;

    Ok(Json(DatabaseSnapshot {
        timestamp: chrono::Utc::now().to_rfc3339(),
        device_id: get_device_unique_id(),
        device_name,
        workspace_id,
        categories,
        brands,
        items,
        item_units,
        item_prices,
        item_price_tiers,
        customers,
        suppliers,
        promos,
        promo_bogo_rules,
        promo_tiers,
        promo_bundle_items,
        accounts,
        stock_ledger,
        role_default_permissions,
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

    let _ = ctx.app_handle.emit("chirasys:sync", ());

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
                version: "1.0.0".to_string(),
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

            // Non-blocking read from UDP socket
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

    // Task C: Background LAN Sync Loop (If child has auto_connect enabled, syncs delta with discovered parent)
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

            let auto_connect_str: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_auto_connect'")
                .fetch_optional(&pool)
                .await
                .unwrap_or_default()
                .unwrap_or_else(|| "true".to_string());

            let auto_connect = auto_connect_str != "false" && auto_connect_str != "0";

            if role == "child" && auto_connect {
                // Find online parent in peer registry
                let parent_opt = {
                    let peers = PEER_REGISTRY.read().await;
                    peers.values().find(|p| p.role == "parent" && !p.is_self).cloned()
                };

                if let Some(parent) = parent_opt {
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

                        let push_url = format!("http://{}:{}/api/lan/queue/push", parent.ip_address, parent.http_port);
                        let push_payload = PushQueueRequest {
                            device_id: get_device_unique_id(),
                            workspace_id: parent.workspace_id.clone(),
                            items,
                        };

                        if let Ok(res) = client.post(&push_url).json(&push_payload).send().await {
                            if res.status().is_success() {
                                for q_id in ids_to_mark {
                                    let now_ts = chrono::Utc::now().to_rfc3339();
                                    let _ = sqlx::query("UPDATE sync_queue SET synced_at = ? WHERE id = ?")
                                        .bind(&now_ts)
                                        .bind(&q_id)
                                        .execute(&pool)
                                        .await;
                                }
                            }
                        }
                    }

                    // Pull latest queue from Parent
                    let last_pull_ts: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_last_pull_at'")
                        .fetch_optional(&pool)
                        .await
                        .unwrap_or_default()
                        .unwrap_or_else(|| "2000-01-01T00:00:00Z".to_string());

                    let pull_url = format!("http://{}:{}/api/lan/queue/pull?since={}", parent.ip_address, parent.http_port, last_pull_ts);
                    if let Ok(res) = client.get(&pull_url).send().await {
                        if res.status().is_success() {
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
                    }
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

    let paired_parent_ip: Option<String> = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_ip'")
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
        paired_parent_port: Some(DEFAULT_HTTP_PORT),
        peers_count,
        is_server_running: true,
    })
}

#[tauri::command]
pub async fn get_lan_peers() -> Result<Vec<LanPeer>, String> {
    let peers = PEER_REGISTRY.read().await;
    Ok(peers.values().cloned().collect())
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

/// OVERWRITE & CLONE DATABASE FROM PARENT MACHINE
#[tauri::command]
pub async fn clone_from_parent(
    parent_ip: String,
    parent_port: Option<u16>,
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<usize, String> {
    let port = parent_port.unwrap_or(DEFAULT_HTTP_PORT);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let export_url = format!("http://{}:{}/api/lan/export_snapshot", parent_ip, port);
    println!("📥 [LAN Clone] Downloading base database from Parent at {}", export_url);

    let res = client
        .get(&export_url)
        .send()
        .await
        .map_err(|e| format!("Gagal menghubungi Perangkat Induk ({}): {}", export_url, e))?;

    if !res.status().is_success() {
        return Err(format!("Perangkat Induk mengembalikan status error: {}", res.status()));
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

    // Helper macro to hydrate table rows
    async fn replace_table_rows(
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        table: &str,
        rows: &[serde_json::Value],
    ) -> Result<usize, String> {
        // Clear local table
        let clear_sql = format!("DELETE FROM {}", table);
        sqlx::query(&clear_sql).execute(&mut **tx).await.map_err(|e| e.to_string())?;

        let mut count = 0;
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

                q.execute(&mut **tx).await.map_err(|e| e.to_string())?;
                count += 1;
            }
        }
        Ok(count)
    }

    total_records_imported += replace_table_rows(&mut tx, "categories", &snapshot.categories).await?;
    total_records_imported += replace_table_rows(&mut tx, "brands", &snapshot.brands).await?;
    total_records_imported += replace_table_rows(&mut tx, "items", &snapshot.items).await?;
    total_records_imported += replace_table_rows(&mut tx, "item_units", &snapshot.item_units).await?;
    total_records_imported += replace_table_rows(&mut tx, "item_prices", &snapshot.item_prices).await?;
    total_records_imported += replace_table_rows(&mut tx, "item_price_tiers", &snapshot.item_price_tiers).await?;
    total_records_imported += replace_table_rows(&mut tx, "customers", &snapshot.customers).await?;
    total_records_imported += replace_table_rows(&mut tx, "suppliers", &snapshot.suppliers).await?;
    total_records_imported += replace_table_rows(&mut tx, "promos", &snapshot.promos).await?;
    total_records_imported += replace_table_rows(&mut tx, "promo_bogo_rules", &snapshot.promo_bogo_rules).await?;
    total_records_imported += replace_table_rows(&mut tx, "promo_tiers", &snapshot.promo_tiers).await?;
    total_records_imported += replace_table_rows(&mut tx, "promo_bundle_items", &snapshot.promo_bundle_items).await?;
    total_records_imported += replace_table_rows(&mut tx, "accounts", &snapshot.accounts).await?;
    total_records_imported += replace_table_rows(&mut tx, "stock_ledger", &snapshot.stock_ledger).await?;
    total_records_imported += replace_table_rows(&mut tx, "role_default_permissions", &snapshot.role_default_permissions).await?;

    // Record pairing and workspace info
    if !snapshot.workspace_id.is_empty() {
        let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('workspace_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(&snapshot.workspace_id)
            .execute(&mut *tx)
            .await;
    }

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_ip', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&parent_ip)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_last_pull_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&snapshot.timestamp)
        .execute(&mut *tx)
        .await;

    // Re-enable foreign keys and commit
    let _ = sqlx::query("PRAGMA foreign_keys = ON;").execute(&mut *tx).await;
    tx.commit().await.map_err(|e| e.to_string())?;

    println!("✅ [LAN Clone] Successfully imported {} records from Parent ({}).", total_records_imported, parent_ip);

    // Notify UI to refresh state
    let _ = app_handle.emit("chirasys:sync", ());

    Ok(total_records_imported)
}
