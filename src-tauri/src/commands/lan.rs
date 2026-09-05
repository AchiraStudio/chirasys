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
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

const UDP_DISCOVERY_PORT: u16 = 3698;
const DEFAULT_HTTP_PORT: u16 = 3699;

pub const SNAPSHOT_TABLES: &[&str] = &[
    "branches",
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
    "stock_opnames",
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
        .route("/api/lan/rpc", post(handle_lan_rpc))
        .route("/api/lan/export_snapshot", get(handle_export_snapshot))
        .route("/api/lan/queue/push", post(handle_queue_push))
        .route("/api/lan/queue/pull", get(handle_queue_pull))
        .route("/api/lan/remote/kick_drawer", post(handle_remote_kick_drawer))
        .route("/api/lan/remote/print_receipt", post(handle_remote_print_receipt))
        .route("/api/lan/pair_with_parent", post(handle_pair_with_parent))
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

// ---------------------------------------------------------------------------
// 1.5. REMOTE RPC GATEWAY (MODEL B CLIENT-SERVER FOR ZERO-COPY CHILDREN)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct LanRpcRequest {
    pub command: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct LanRpcResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

async fn handle_lan_rpc(
    AxumState(ctx): AxumState<ServerContext>,
    Json(req): Json<LanRpcRequest>,
) -> (StatusCode, Json<LanRpcResponse>) {
    let state = ctx.app_handle.state::<crate::AppState>();
    let cmd = req.command.as_str();
    let p = req.params;

    let res: Result<serde_json::Value, String> = match cmd {
        // --- ITEMS ---
        "get_items_filtered" => {
            let search: Option<String> = p.get("search").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let category_id: Option<String> = p.get("categoryId").or_else(|| p.get("category_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let brand_id: Option<String> = p.get("brandId").or_else(|| p.get("brand_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let active_only: bool = p.get("activeOnly").or_else(|| p.get("active_only")).and_then(|v| v.as_bool()).unwrap_or(false);
            let page: i64 = p.get("page").and_then(|v| v.as_i64()).unwrap_or(1);
            let per_page: i64 = p.get("perPage").or_else(|| p.get("per_page")).and_then(|v| v.as_i64()).unwrap_or(20);
            let sort_by: Option<String> = p.get("sortBy").or_else(|| p.get("sort_by")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let sort_order: Option<String> = p.get("sortOrder").or_else(|| p.get("sort_order")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();

            crate::commands::items::get_items_filtered(
                search, category_id, brand_id, active_only, page, per_page, sort_by, sort_order, state
            ).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_item" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::items::get_item(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_item" => {
            let sku: String = p.get("sku").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let barcode: Option<String> = p.get("barcode").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let generic_name: Option<String> = p.get("genericName").or_else(|| p.get("generic_name")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let category_id: Option<String> = p.get("categoryId").or_else(|| p.get("category_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let brand_id: Option<String> = p.get("brandId").or_else(|| p.get("brand_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let hpp_method: String = p.get("hppMethod").or_else(|| p.get("hpp_method")).and_then(|v| v.as_str()).unwrap_or("avg").to_string();
            let min_stock: f64 = p.get("minStock").or_else(|| p.get("min_stock")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let has_expiry: i32 = p.get("hasExpiry").or_else(|| p.get("has_expiry")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let requires_prescription: i32 = p.get("requiresPrescription").or_else(|| p.get("requires_prescription")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let cost_price: Option<f64> = p.get("costPrice").or_else(|| p.get("cost_price")).and_then(|v| v.as_f64());
            let rack_location: Option<String> = p.get("rackLocation").or_else(|| p.get("rack_location")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let item_type: Option<String> = p.get("itemType").or_else(|| p.get("item_type")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();

            crate::commands::items::add_item(
                sku, barcode, name, generic_name, category_id, brand_id, hpp_method,
                min_stock, has_expiry, requires_prescription, cost_price, rack_location, item_type, notes, state
            ).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_item" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let sku: String = p.get("sku").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let barcode: Option<String> = p.get("barcode").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let generic_name: Option<String> = p.get("genericName").or_else(|| p.get("generic_name")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let category_id: Option<String> = p.get("categoryId").or_else(|| p.get("category_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let brand_id: Option<String> = p.get("brandId").or_else(|| p.get("brand_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let hpp_method: String = p.get("hppMethod").or_else(|| p.get("hpp_method")).and_then(|v| v.as_str()).unwrap_or("avg").to_string();
            let min_stock: f64 = p.get("minStock").or_else(|| p.get("min_stock")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let has_expiry: i32 = p.get("hasExpiry").or_else(|| p.get("has_expiry")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let requires_prescription: i32 = p.get("requiresPrescription").or_else(|| p.get("requires_prescription")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let cost_price: Option<f64> = p.get("costPrice").or_else(|| p.get("cost_price")).and_then(|v| v.as_f64());
            let rack_location: Option<String> = p.get("rackLocation").or_else(|| p.get("rack_location")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let item_type: Option<String> = p.get("itemType").or_else(|| p.get("item_type")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();

            crate::commands::items::update_item(
                id, sku, barcode, name, generic_name, category_id, brand_id, hpp_method,
                min_stock, has_expiry, requires_prescription, cost_price, rack_location, item_type, notes, state
            ).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "delete_item" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::items::delete_item(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "toggle_item_active" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::items::toggle_item_active(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "bulk_update_category" => {
            let item_ids: Vec<String> = p.get("itemIds").or_else(|| p.get("item_ids")).and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            let category_id: String = p.get("categoryId").or_else(|| p.get("category_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::items::bulk_update_category(item_ids, category_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_item_unit" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let unit_name: String = p.get("unitName").or_else(|| p.get("unit_name")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let conversion: f64 = p.get("conversion").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let is_base: i32 = p.get("isBase").or_else(|| p.get("is_base")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let barcode: Option<String> = p.get("barcode").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();

            crate::commands::items::add_item_unit(item_id, unit_name, conversion, is_base, barcode, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_item_unit" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let unit_name: String = p.get("unitName").or_else(|| p.get("unit_name")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let conversion: f64 = p.get("conversion").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let is_base: i32 = p.get("isBase").or_else(|| p.get("is_base")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let barcode: Option<String> = p.get("barcode").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();

            crate::commands::items::update_item_unit(id, unit_name, conversion, is_base, barcode, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "delete_item_unit" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::items::delete_item_unit(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "set_item_price" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let unit_id: String = p.get("unitId").or_else(|| p.get("unit_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let customer_tier: String = p.get("customerTier").or_else(|| p.get("customer_tier")).and_then(|v| v.as_str()).unwrap_or("regular").to_string();
            let price: f64 = p.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);

            crate::commands::items::set_item_price(item_id, unit_id, customer_tier, price, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "set_item_cost_price" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let cost_price: f64 = p.get("costPrice").or_else(|| p.get("cost_price")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            crate::commands::items::set_item_cost_price(item_id, cost_price, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_item_wholesale_price" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let wholesale_price: f64 = p.get("wholesalePrice").or_else(|| p.get("wholesale_price")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            crate::commands::items::update_item_wholesale_price(item_id, wholesale_price, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "save_item_price_tiers" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let unit_id: Option<String> = p.get("unitId").or_else(|| p.get("unit_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let tiers: Vec<serde_json::Value> = p.get("tiers").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            crate::commands::items::save_item_price_tiers(item_id, unit_id, tiers, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_item_price_tiers" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::items::get_item_price_tiers(item_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- SALES & POS ---
        "create_sale" => {
            match serde_json::from_value(p.get("input").cloned().unwrap_or(p.clone())) {
                Ok(input) => crate::commands::sales::create_sale(input, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "get_sales" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let customer_id: Option<String> = p.get("customerId").or_else(|| p.get("customer_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::sales::get_sales(branch_id, customer_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_sale_detail" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::sales::get_sale_detail(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_sale_return" => {
            let sale_id: String = p.get("saleId").or_else(|| p.get("sale_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            let reason: String = p.get("reason").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::sales::create_sale_return(sale_id, lines, reason, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_next_transaction_no" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            crate::commands::sales::get_next_transaction_no(branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "delete_sale" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::sales::delete_sale(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- INVENTORY ---
        "get_stock_overview" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            crate::commands::inventory::get_stock_overview(branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_low_stock_alerts" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            crate::commands::inventory::get_low_stock_alerts(branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_stock_movements" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let limit: i64 = p.get("limit").and_then(|v| v.as_i64()).unwrap_or(100);
            crate::commands::inventory::get_stock_movements(item_id, branch_id, limit, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "adjust_stock" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let unit_id: String = p.get("unitId").or_else(|| p.get("unit_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let qty: f64 = p.get("qty").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let direction: String = p.get("direction").and_then(|v| v.as_str()).unwrap_or("in").to_string();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let created_by: Option<String> = p.get("createdBy").or_else(|| p.get("created_by")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::inventory::adjust_stock(item_id, unit_id, branch_id, qty, direction, notes, created_by, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "set_initial_stock" => {
            let item_id: String = p.get("itemId").or_else(|| p.get("item_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let unit_id: String = p.get("unitId").or_else(|| p.get("unit_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let qty: f64 = p.get("qty").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let hpp_value: Option<f64> = p.get("hppValue").or_else(|| p.get("hpp_value")).and_then(|v| v.as_f64());
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::inventory::set_initial_stock(item_id, unit_id, branch_id, qty, hpp_value, notes, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_opname_session" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let created_by: Option<String> = p.get("createdBy").or_else(|| p.get("created_by")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::inventory::create_opname_session(branch_id, created_by, notes, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "submit_opname_lines" => {
            let opname_id: String = p.get("opnameId").or_else(|| p.get("opname_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            crate::commands::inventory::submit_opname_lines(opname_id, lines, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "finalize_opname" => {
            let opname_id: String = p.get("opnameId").or_else(|| p.get("opname_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::inventory::finalize_opname(opname_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- MASTERS ---
        "get_categories" => {
            crate::commands::masters::get_categories(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_category" => {
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let description: Option<String> = p.get("description").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let color: Option<String> = p.get("color").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let parent_id: Option<String> = p.get("parentId").or_else(|| p.get("parent_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::masters::add_category(name, description, color, parent_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_category" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::masters::update_category(id, name, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "delete_category" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::masters::delete_category(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_brands" => {
            crate::commands::masters::get_brands(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_brand" => {
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::masters::add_brand(name, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_brand" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::masters::update_brand(id, name, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "delete_brand" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::masters::delete_brand(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_banks" => {
            crate::commands::masters::get_banks(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_settings" => {
            crate::commands::masters::get_settings(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "set_setting" => {
            let key: String = p.get("key").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let value: String = p.get("value").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::masters::set_setting(key, value, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- CUSTOMERS ---
        "get_customers" => {
            let search: Option<String> = p.get("search").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let tier: Option<String> = p.get("tier").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let active_only: bool = p.get("activeOnly").or_else(|| p.get("active_only")).and_then(|v| v.as_bool()).unwrap_or(false);
            crate::commands::customers::get_customers(search, tier, active_only, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_customer" => {
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let phone: Option<String> = p.get("phone").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let email: Option<String> = p.get("email").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let address: Option<String> = p.get("address").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let region: Option<String> = p.get("region").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let customer_tier: String = p.get("customerTier").or_else(|| p.get("customer_tier")).and_then(|v| v.as_str()).unwrap_or("regular").to_string();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let membership_expiry: Option<String> = p.get("membershipExpiry").or_else(|| p.get("membership_expiry")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::customers::add_customer(name, phone, email, address, region, customer_tier, notes, membership_expiry, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_customer" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let phone: Option<String> = p.get("phone").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let email: Option<String> = p.get("email").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let address: Option<String> = p.get("address").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let region: Option<String> = p.get("region").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let customer_tier: String = p.get("customerTier").or_else(|| p.get("customer_tier")).and_then(|v| v.as_str()).unwrap_or("regular").to_string();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let membership_expiry: Option<String> = p.get("membershipExpiry").or_else(|| p.get("membership_expiry")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::customers::update_customer(id, name, phone, email, address, region, customer_tier, notes, membership_expiry, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "toggle_customer_active" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::customers::toggle_customer_active(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- SUPPLIERS ---
        "get_suppliers" => {
            let search: Option<String> = p.get("search").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let active_only: bool = p.get("activeOnly").or_else(|| p.get("active_only")).and_then(|v| v.as_bool()).unwrap_or(false);
            crate::commands::suppliers::get_suppliers(search, active_only, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_supplier" => {
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let contact_person: Option<String> = p.get("contactPerson").or_else(|| p.get("contact_person")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let phone: Option<String> = p.get("phone").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let email: Option<String> = p.get("email").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let address: Option<String> = p.get("address").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let payment_terms: Option<String> = p.get("paymentTerms").or_else(|| p.get("payment_terms")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::suppliers::add_supplier(name, contact_person, phone, email, address, payment_terms, notes, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "update_supplier" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let name: String = p.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let contact_person: Option<String> = p.get("contactPerson").or_else(|| p.get("contact_person")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let phone: Option<String> = p.get("phone").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let email: Option<String> = p.get("email").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let address: Option<String> = p.get("address").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let payment_terms: Option<String> = p.get("paymentTerms").or_else(|| p.get("payment_terms")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::suppliers::update_supplier(id, name, contact_person, phone, email, address, payment_terms, notes, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "toggle_supplier_active" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::suppliers::toggle_supplier_active(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- PURCHASING ---
        "get_purchases" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let supplier_id: Option<String> = p.get("supplierId").or_else(|| p.get("supplier_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let status: Option<String> = p.get("status").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::purchasing::get_purchases(branch_id, supplier_id, status, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_purchase_detail" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::purchasing::get_purchase_detail(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "receive_goods" => {
            let po_id: String = p.get("poId").or_else(|| p.get("po_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let supplier_id: String = p.get("supplierId").or_else(|| p.get("supplier_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let invoice_no: Option<String> = p.get("invoiceNo").or_else(|| p.get("invoice_no")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            crate::commands::purchasing::receive_goods(po_id, branch_id, supplier_id, invoice_no, lines, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "receive_goods_direct" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let supplier_id: String = p.get("supplierId").or_else(|| p.get("supplier_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let invoice_no: Option<String> = p.get("invoiceNo").or_else(|| p.get("invoice_no")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            crate::commands::purchasing::receive_goods_direct(branch_id, supplier_id, invoice_no, lines, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "add_purchase_payment" => {
            let purchase_id: String = p.get("purchaseId").or_else(|| p.get("purchase_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let amount: f64 = p.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let method: String = p.get("method").and_then(|v| v.as_str()).unwrap_or("cash").to_string();
            let reference: Option<String> = p.get("reference").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::purchasing::add_purchase_payment(purchase_id, amount, method, reference, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_purchase_return" => {
            let purchase_id: String = p.get("purchaseId").or_else(|| p.get("purchase_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            let reason: String = p.get("reason").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::purchasing::create_purchase_return(purchase_id, lines, reason, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_purchase_orders" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            crate::commands::purchasing::get_purchase_orders(branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_po_lines" => {
            let po_id: String = p.get("poId").or_else(|| p.get("po_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::purchasing::get_po_lines(po_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_purchase_order" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let supplier_id: String = p.get("supplierId").or_else(|| p.get("supplier_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let expected_date: Option<String> = p.get("expectedDate").or_else(|| p.get("expected_date")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let notes: Option<String> = p.get("notes").and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            crate::commands::purchasing::create_purchase_order(branch_id, supplier_id, expected_date, notes, lines, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- PROMOS ---
        "get_promos" => {
            let active_only: bool = p.get("activeOnly").or_else(|| p.get("active_only")).and_then(|v| v.as_bool()).unwrap_or(false);
            crate::commands::promos::get_promos(active_only, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_promo_detail" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::promos::get_promo_detail(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_promo" => {
            match serde_json::from_value(p.get("input").cloned().unwrap_or(p.clone())) {
                Ok(input) => crate::commands::promos::create_promo(input, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "update_promo" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            match serde_json::from_value(p.get("input").cloned().unwrap_or(p.clone())) {
                Ok(input) => crate::commands::promos::update_promo(id, input, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "delete_promo" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::promos::delete_promo(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "toggle_promo_active" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::promos::toggle_promo_active(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "calculate_discounts" => {
            let lines = p.get("lines").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
            let customer_tier: Option<String> = p.get("customerTier").or_else(|| p.get("customer_tier")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::promos::calculate_discounts(lines, customer_tier, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- REPORTS ---
        "get_sales_summary" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let date_from: String = p.get("dateFrom").or_else(|| p.get("date_from")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let date_to: String = p.get("dateTo").or_else(|| p.get("date_to")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::reports::get_sales_summary(branch_id, date_from, date_to, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_top_selling_items" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let date_from: String = p.get("dateFrom").or_else(|| p.get("date_from")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let date_to: String = p.get("dateTo").or_else(|| p.get("date_to")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let limit: i64 = p.get("limit").and_then(|v| v.as_i64()).unwrap_or(10);
            crate::commands::reports::get_top_selling_items(branch_id, date_from, date_to, limit, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_sales_by_payment_method" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let date_from: String = p.get("dateFrom").or_else(|| p.get("date_from")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let date_to: String = p.get("dateTo").or_else(|| p.get("date_to")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::reports::get_sales_by_payment_method(branch_id, date_from, date_to, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_stock_valuation" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            crate::commands::reports::get_stock_valuation(branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_expiring_items" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let days_ahead: i64 = p.get("daysAhead").or_else(|| p.get("days_ahead")).and_then(|v| v.as_i64()).unwrap_or(90);
            crate::commands::reports::get_expiring_items(branch_id, days_ahead, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_outstanding_payables" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            crate::commands::reports::get_outstanding_payables(branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_purchase_summary" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let date_from: String = p.get("dateFrom").or_else(|| p.get("date_from")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let date_to: String = p.get("dateTo").or_else(|| p.get("date_to")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::reports::get_purchase_summary(branch_id, date_from, date_to, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_customer_report" => {
            let branch_id: String = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| v.as_str()).unwrap_or("branch_001").to_string();
            let date_from: String = p.get("dateFrom").or_else(|| p.get("date_from")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let date_to: String = p.get("dateTo").or_else(|| p.get("date_to")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let limit: i64 = p.get("limit").and_then(|v| v.as_i64()).unwrap_or(20);
            crate::commands::reports::get_customer_report(branch_id, date_from, date_to, limit, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_sales_recap_report" => {
            match serde_json::from_value(p.get("filter").cloned().unwrap_or(p.clone())) {
                Ok(filter) => crate::commands::reports::get_sales_recap_report(filter, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "get_detailed_sales_lines" => {
            match serde_json::from_value(p.get("filter").cloned().unwrap_or(p.clone())) {
                Ok(filter) => crate::commands::reports::get_detailed_sales_lines(filter, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "get_sales_by_cashier_summary" => {
            match serde_json::from_value(p.get("filter").cloned().unwrap_or(p.clone())) {
                Ok(filter) => crate::commands::reports::get_sales_by_cashier_summary(filter, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "get_daily_sales_recap" => {
            match serde_json::from_value(p.get("filter").cloned().unwrap_or(p.clone())) {
                Ok(filter) => crate::commands::reports::get_daily_sales_recap(filter, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }

        // --- ACCOUNTING ---
        "get_accounts" => {
            crate::commands::accounting::get_accounts(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_account" => {
            match serde_json::from_value(p.get("input").cloned().unwrap_or(p.clone())) {
                Ok(input) => crate::commands::accounting::create_account(input, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "update_account" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            match serde_json::from_value(p.get("input").cloned().unwrap_or(p.clone())) {
                Ok(input) => crate::commands::accounting::update_account(id, input, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "delete_account" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::accounting::delete_account(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_journal_entries" => {
            crate::commands::accounting::get_journal_entries(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_journal_detail" => {
            let id: String = p.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::accounting::get_journal_detail(id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "create_manual_journal" => {
            match serde_json::from_value(p.get("input").cloned().unwrap_or(p.clone())) {
                Ok(input) => crate::commands::accounting::create_manual_journal(input, state).await.map(|d| serde_json::to_value(d).unwrap_or_default()),
                Err(e) => Err(e.to_string()),
            }
        }
        "cash_in" => {
            let account_id: String = p.get("accountId").or_else(|| p.get("account_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let cash_account_id: String = p.get("cashAccountId").or_else(|| p.get("cash_account_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let amount: f64 = p.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let description: String = p.get("description").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let branch_id: Option<String> = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::accounting::cash_in(account_id, cash_account_id, amount, description, branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "cash_out" => {
            let account_id: String = p.get("accountId").or_else(|| p.get("account_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let cash_account_id: String = p.get("cashAccountId").or_else(|| p.get("cash_account_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let amount: f64 = p.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let description: String = p.get("description").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let branch_id: Option<String> = p.get("branchId").or_else(|| p.get("branch_id")).and_then(|v| serde_json::from_value(v.clone()).ok()).flatten();
            crate::commands::accounting::cash_out(account_id, cash_account_id, amount, description, branch_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_trial_balance" => {
            let as_of_date: String = p.get("asOfDate").or_else(|| p.get("as_of_date")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::accounting::get_trial_balance(as_of_date, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_profit_loss" => {
            let start_date: String = p.get("startDate").or_else(|| p.get("start_date")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let end_date: String = p.get("endDate").or_else(|| p.get("end_date")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::accounting::get_profit_loss(start_date, end_date, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_balance_sheet" => {
            let as_of_date: String = p.get("asOfDate").or_else(|| p.get("as_of_date")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::accounting::get_balance_sheet(as_of_date, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        // --- AUTH ---
        "login" => {
            let username: String = p.get("username").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let password_guess: String = p.get("passwordGuess").or_else(|| p.get("password_guess")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::auth::login(username, password_guess, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_current_user" => {
            let token: String = p.get("token").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::auth::get_current_user(token, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_users" => {
            crate::commands::auth::get_users(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_permission_definitions" => {
            Ok(serde_json::to_value(crate::commands::auth::get_permission_definitions()).unwrap_or_default())
        }
        "get_role_default_permissions" => {
            crate::commands::auth::get_role_default_permissions(state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }
        "get_user_permissions" => {
            let user_id: String = p.get("userId").or_else(|| p.get("user_id")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
            crate::commands::auth::get_user_permissions(user_id, state).await.map(|d| serde_json::to_value(d).unwrap_or_default())
        }

        unknown => Err(format!("Perintah RPC '{}' tidak didukung oleh Server Induk", unknown)),
    };

    match res {
        Ok(data) => (StatusCode::OK, Json(LanRpcResponse { success: true, data: Some(data), error: None })),
        Err(err) => (StatusCode::OK, Json(LanRpcResponse { success: false, data: None, error: Some(err) })),
    }
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
    AxumState(ctx): AxumState<ServerContext>,
    Json(payload): Json<RemoteKickDrawerRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut printer = payload.printer_name.unwrap_or_default();
    if printer.is_empty() || printer.starts_with("LAN") || printer.starts_with("[LAN]") {
        if let Ok(Some(saved_p)) = sqlx::query_scalar::<_, String>("SELECT value FROM global_settings WHERE key = 'printer_name'")
            .fetch_optional(&ctx.pool).await {
            printer = saved_p;
        }
    }
    match crate::commands::maintenance::kick_cash_drawer(printer).await {
        Ok(msg) => Ok(Json(serde_json::json!({ "success": true, "message": msg }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

async fn handle_remote_print_receipt(
    AxumState(ctx): AxumState<ServerContext>,
    Json(payload): Json<RemotePrintReceiptRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut printer = payload.printer_name.unwrap_or_default();
    if printer.is_empty() || printer.starts_with("LAN") || printer.starts_with("[LAN]") {
        if let Ok(Some(saved_p)) = sqlx::query_scalar::<_, String>("SELECT value FROM global_settings WHERE key = 'printer_name'")
            .fetch_optional(&ctx.pool).await {
            printer = saved_p;
        }
    }
    match crate::commands::maintenance::print_raw_receipt(printer, payload.bytes).await {
        Ok(msg) => Ok(Json(serde_json::json!({ "success": true, "message": msg }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

#[derive(Debug, Deserialize)]
pub struct PairWithParentRequest {
    pub parent_ip: String,
    pub parent_port: Option<u16>,
    pub parent_name: Option<String>,
    pub workspace_id: Option<String>,
}

async fn handle_pair_with_parent(
    AxumState(ctx): AxumState<ServerContext>,
    Json(payload): Json<PairWithParentRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let port = payload.parent_port.unwrap_or(DEFAULT_HTTP_PORT);
    let name = payload.parent_name.unwrap_or_else(|| "Server Induk".to_string());

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_ip', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&payload.parent_ip)
        .execute(&ctx.pool)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_port', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(port.to_string())
        .execute(&ctx.pool)
        .await;

    let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('lan_paired_parent_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&name)
        .execute(&ctx.pool)
        .await;

    if let Some(ref ws) = payload.workspace_id {
        if !ws.is_empty() {
            let _ = sqlx::query("INSERT INTO global_settings (key, value) VALUES ('workspace_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
                .bind(ws)
                .execute(&ctx.pool)
                .await;
        }
    }

    let _ = ctx.app_handle.emit("chirasys:lan_status_updated", ());

    // Auto-hydrate from parent if child DB is empty
    let pool_clone = ctx.pool.clone();
    let app_handle_clone = ctx.app_handle.clone();
    let parent_ip = payload.parent_ip.clone();
    tauri::async_runtime::spawn(async move {
        let local_items: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM items WHERE deleted_at IS NULL")
            .fetch_one(&pool_clone)
            .await
            .unwrap_or(0);
        if local_items == 0 {
            let _ = clone_from_parent_internal(&pool_clone, &app_handle_clone, &parent_ip, port).await;
        }
    });

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Terminal kasir klien berhasil dihubungkan ke Server Induk!"
    })))
}

// ---------------------------------------------------------------------------
// 2. UDP BROADCAST DISCOVERY BEACON & LISTENER
// ---------------------------------------------------------------------------

pub async fn spawn_lan_discovery_service(pool: SqlitePool, app_handle: AppHandle) {
    let device_id = get_device_unique_id();
    let pool_clone = pool.clone();
    let app_handle_listener = app_handle.clone();
    let app_handle_sync = app_handle.clone();

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
                    let target_global = format!("255.255.255.255:{}", UDP_DISCOVERY_PORT);
                    let _ = socket.send_to(&bytes, &target_global);

                    // Also broadcast on local subnet if IPv4
                    let local_ip_str = get_local_ip();
                    let parts: Vec<&str> = local_ip_str.split('.').collect();
                    if parts.len() == 4 {
                        let target_subnet = format!("{}.{}.{}.255:{}", parts[0], parts[1], parts[2], UDP_DISCOVERY_PORT);
                        let _ = socket.send_to(&bytes, &target_subnet);
                    }
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
                let _ = app_handle_listener.emit("chirasys:lan_peers_updated", peers_list);
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
            tokio::time::sleep(Duration::from_secs(2)).await;

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
                                let _ = app_handle_sync.emit("chirasys:sync", ());
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

    let paired_parent_port: u16 = sqlx::query_scalar::<_, String>("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_port'")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None)
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_HTTP_PORT);

    let paired_parent_name: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_paired_parent_name'")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or(None)
        .unwrap_or_else(|| "Server Induk".to_string());

    let peers = PEER_REGISTRY.read().await;
    let mut list = Vec::new();
    let mut found_paired = false;

    for p in peers.values() {
        let mut cloned = p.clone();
        if let Some(ref pip) = paired_parent_ip {
            if &cloned.ip_address == pip {
                cloned.is_paired = true;
                found_paired = true;
            }
        }
        list.push(cloned);
    }

    // If paired parent is configured in settings but not yet discovered in memory, include it
    if let Some(ref pip) = paired_parent_ip {
        if !found_paired {
            list.push(LanPeer {
                device_id: format!("paired_{}", pip.replace('.', "_")),
                device_name: paired_parent_name,
                role: "parent".to_string(),
                ip_address: pip.clone(),
                http_port: paired_parent_port,
                workspace_id: "".to_string(),
                last_seen: now_epoch_secs(),
                is_self: false,
                is_paired: true,
            });
        }
    }

    Ok(list)
}

#[tauri::command]
pub async fn scan_lan_subnet(
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AppState>,
) -> Result<Vec<LanPeer>, String> {
    let local_ip_str = get_local_ip();
    let parts: Vec<&str> = local_ip_str.split('.').collect();
    if parts.len() != 4 {
        return get_lan_peers(state).await;
    }

    let subnet_prefix = format!("{}.{}.{}.", parts[0], parts[1], parts[2]);
    let self_id = get_device_unique_id();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(650))
        .build()
        .map_err(|e| e.to_string())?;

    let mut join_set = tokio::task::JoinSet::new();

    for host in 1..=254 {
        let ip = format!("{}{}", subnet_prefix, host);
        let client_clone = client.clone();
        join_set.spawn(async move {
            let url = format!("http://{}:{}/api/lan/info", ip, DEFAULT_HTTP_PORT);
            if let Ok(res) = client_clone.get(&url).send().await {
                if res.status().is_success() {
                    if let Ok(info) = res.json::<serde_json::Value>().await {
                        if info.get("app").and_then(|v| v.as_str()) == Some("chirasys") {
                            let dev_id = info.get("device_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let dev_name = info.get("device_name").and_then(|v| v.as_str()).unwrap_or("Server").to_string();
                            let role = info.get("role").and_then(|v| v.as_str()).unwrap_or("parent").to_string();
                            let ws_id = info.get("workspace_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let port = info.get("http_port").and_then(|v| v.as_u64()).unwrap_or(DEFAULT_HTTP_PORT as u64) as u16;
                            return Some(LanPeer {
                                device_id: dev_id,
                                device_name: dev_name,
                                role,
                                ip_address: ip,
                                http_port: port,
                                workspace_id: ws_id,
                                last_seen: now_epoch_secs(),
                                is_self: false,
                                is_paired: false,
                            });
                        }
                    }
                }
            }
            None
        });
    }

    while let Some(res) = join_set.join_next().await {
        if let Ok(Some(mut peer)) = res {
            peer.is_self = peer.device_id == self_id;
            let mut peers = PEER_REGISTRY.write().await;
            peers.insert(peer.device_id.clone(), peer);
        }
    }

    let peers_list = {
        let peers = PEER_REGISTRY.read().await;
        peers.values().cloned().collect::<Vec<_>>()
    };
    let _ = app_handle.emit("chirasys:lan_peers_updated", &peers_list);

    get_lan_peers(state).await
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

    // AUTOMATIC INITIAL HYDRATION:
    println!("🔗 [LAN Connect] Successfully connected to Parent Host at {}:{} (Model B: Live Direct Query Active)", trimmed_ip, port);

    let _ = app_handle.emit("chirasys:lan_status_updated", ());
    let _ = app_handle.emit("chirasys:sync", ());
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
pub async fn parent_request_connect_child(
    child_ip: String,
    child_port: Option<u16>,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    let port = child_port.unwrap_or(DEFAULT_HTTP_PORT);
    let parent_ip = get_local_ip();
    let parent_name: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'lan_device_name'")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or_default()
        .unwrap_or_else(|| "Server Induk".to_string());

    let workspace_id: String = sqlx::query_scalar("SELECT value FROM global_settings WHERE key = 'workspace_id'")
        .fetch_optional(&state.db_pool)
        .await
        .unwrap_or_default()
        .unwrap_or_default();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("http://{}:{}/api/lan/pair_with_parent", child_ip.trim(), port);
    let payload = serde_json::json!({
        "parent_ip": parent_ip,
        "parent_port": DEFAULT_HTTP_PORT,
        "parent_name": parent_name,
        "workspace_id": workspace_id,
    });

    let res = client.post(&url).json(&payload).send().await
        .map_err(|e| format!("Gagal mengirim perintah koneksi ke kasir klien: {}", e))?;

    if res.status().is_success() {
        Ok("Berhasil menghubungkan kasir klien ke Server Induk ini!".to_string())
    } else {
        Err(format!("Kasir klien merespons dengan status {}", res.status()))
    }
}

pub async fn clone_from_parent_internal(
    pool: &SqlitePool,
    app_handle: &AppHandle,
    parent_ip: &str,
    port: u16,
) -> Result<usize, String> {
    let trimmed_ip = parent_ip.trim();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let export_url = format!("http://{}:{}/api/lan/export_snapshot", trimmed_ip, port);
    println!("📥 [LAN Sync/Clone] Downloading full snapshot from Parent at {}", export_url);

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

    let mut total_records_imported = 0;

    // Execute within a transaction for atomicity and safety
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Disable foreign key enforcement during full atomic hydration
    let _ = sqlx::query("PRAGMA foreign_keys = OFF;").execute(&mut *tx).await;

    for &table in SNAPSHOT_TABLES {
        if let Some(rows) = snapshot.tables.get(table) {
            // IMPORTANT: Never delete local users or role_default_permissions.
            // Deleting users would log out the currently active session on the child device.
            // We use INSERT OR IGNORE for users so local accounts are preserved.
            let skip_delete = table == "users" || table == "role_default_permissions";
            if !skip_delete {
                let clear_sql = format!("DELETE FROM {}", table);
                let _ = sqlx::query(&clear_sql).execute(&mut *tx).await;
            }

            for r in rows {
                if let Some(obj) = r.as_object() {
                    let columns: Vec<String> = obj.keys().cloned().collect();
                    if columns.is_empty() {
                        continue;
                    }
                    let placeholders = vec!["?"; columns.len()].join(", ");
                    // Preserve local users & permissions — use IGNORE so existing local
                    // accounts (including the currently logged-in user) are not overwritten.
                    let insert_verb = if table == "users" || table == "role_default_permissions" {
                        "INSERT OR IGNORE"
                    } else {
                        "INSERT OR REPLACE"
                    };
                    let insert_sql = format!(
                        "{} INTO {} ({}) VALUES ({})",
                        insert_verb,
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

    let _ = sqlx::query("DELETE FROM global_settings WHERE key = 'lan_last_sync_error'")
        .execute(&mut *tx)
        .await;

    // Re-enable foreign keys and commit
    let _ = sqlx::query("PRAGMA foreign_keys = ON;").execute(&mut *tx).await;
    tx.commit().await.map_err(|e| e.to_string())?;

    println!("✅ [LAN Sync/Clone] Successfully imported {} records from Parent ({}).", total_records_imported, trimmed_ip);

    // Notify UI to refresh all states
    let _ = app_handle.emit("chirasys:sync", ());
    let _ = app_handle.emit("chirasys:lan_status_updated", ());

    Ok(total_records_imported)
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

    // Check if local database is empty: perform initial snapshot import first
    let local_items_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM items WHERE deleted_at IS NULL")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if local_items_count == 0 {
        if let Ok(imported) = clone_from_parent_internal(pool, &app_handle, &parent_ip, parent_port).await {
            pulled_count += imported;
        }
    }

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
    clone_from_parent_internal(&state.db_pool, &app_handle, &parent_ip, port).await
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
