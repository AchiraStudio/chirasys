mod db {
    pub mod connection;
    pub mod models;
}
mod commands;

use sqlx::SqlitePool;
use tauri::Manager;
pub struct AppState {
    pub db_pool: SqlitePool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename(".env");
    let _ = dotenvy::from_filename("../.env");

    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let pool = match tauri::async_runtime::block_on(db::connection::establish_connection(&handle)) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("❌ DATABASE FATAL ERROR: {}", e);
                    if let Ok(app_dir) = handle.path().app_data_dir() {
                        let _ = std::fs::create_dir_all(&app_dir);
                        let crash_log = app_dir.join("crash.log");
                        let timestamp = chrono::Local::now().to_rfc3339();
                        let msg = format!("[{}] DATABASE FATAL ERROR:\n{}\n\n", timestamp, e);
                        let _ = std::fs::write(&crash_log, msg);
                    }
                    if let Some(appdata) = std::env::var_os("APPDATA") {
                        let _ = std::fs::write(
                            std::path::Path::new(&appdata).join("chirasys_crash.log"),
                            format!("DATABASE ERROR: {}", e),
                        );
                    }
                    panic!("❌ DATABASE FATAL ERROR: {}", e);
                }
            };

            app.manage(AppState { db_pool: pool.clone() });

            println!("✅ Database connected & AppState managed.");
            commands::sync::spawn_sync_worker(pool.clone());
            commands::sync::spawn_pull_worker(pool.clone(), handle.clone());

            // Spawn LAN Auto-Discovery and Embedded Local Server
            let pool_for_lan = pool.clone();
            let handle_for_lan = handle.clone();
            tauri::async_runtime::spawn(async move {
                commands::lan::start_lan_http_server(pool_for_lan.clone(), handle_for_lan.clone(), 3699).await;
                commands::lan::spawn_lan_discovery_service(pool_for_lan, handle_for_lan).await;
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::masters::get_brands,
            commands::masters::add_brand,
            commands::masters::update_brand,
            commands::masters::delete_brand,
            commands::masters::auto_assign_brands,
            commands::masters::discover_potential_brands,
            commands::masters::get_categories,
            commands::masters::add_category,
            commands::masters::update_category,
            commands::masters::delete_category,
            commands::masters::get_banks,
            commands::masters::get_settings,
            commands::masters::set_setting,
            commands::items::get_items_filtered,
            commands::items::get_item,
            commands::items::add_item,
            commands::items::update_item,
            commands::items::delete_item,
            commands::items::toggle_item_active,
            commands::items::bulk_update_category,
            commands::items::add_item_unit,
            commands::items::update_item_unit,
            commands::items::delete_item_unit,
            commands::items::set_item_price,
            commands::items::set_item_cost_price,
            commands::items::update_item_wholesale_price,
            commands::items::save_item_price_tiers,
            commands::items::get_item_price_tiers,
            commands::inventory::get_stock_overview,
            commands::inventory::get_low_stock_alerts,
            commands::inventory::get_stock_movements,
            commands::inventory::adjust_stock,
            commands::inventory::set_initial_stock,
            commands::inventory::apply_hpp_retroactive,
            commands::inventory::bulk_add_stock,
            commands::inventory::create_opname_session,
            commands::inventory::submit_opname_lines,
            commands::inventory::finalize_opname,
            commands::suppliers::get_suppliers,
            commands::suppliers::add_supplier,
            commands::suppliers::update_supplier,
            commands::suppliers::toggle_supplier_active,
            commands::customers::get_customers,
            commands::customers::add_customer,
            commands::customers::update_customer,
            commands::customers::toggle_customer_active,
            // Phase 4
            commands::purchasing::get_purchase_orders,
            commands::purchasing::get_po_lines,
            commands::purchasing::create_purchase_order,
            commands::purchasing::receive_goods,
            commands::purchasing::receive_goods_direct,
            commands::purchasing::cancel_purchase_order,
            commands::purchasing::add_purchase_payment, // ADDED
            commands::purchasing::create_purchase_return, // ADDED
            commands::purchasing::get_purchases,
            commands::purchasing::get_purchase_detail,
            // Phase 5
            commands::sales::create_sale,
            commands::sales::get_sales,
            commands::sales::get_sale_detail,
            commands::sales::create_sale_return,
            commands::sales::get_next_transaction_no,
            commands::sales::open_cash_drawer,
            commands::sales::delete_sale,
            // Phase 6
            commands::promos::get_promos,
            commands::promos::get_promo_detail,
            commands::promos::create_promo,
            commands::promos::update_promo,
            commands::promos::delete_promo,
            commands::promos::toggle_promo_active,
            commands::promos::calculate_discounts,
            // Phase 7
            commands::accounting::get_accounts,
            commands::accounting::create_account,
            commands::accounting::update_account,
            commands::accounting::delete_account,
            commands::accounting::get_journal_entries,
            commands::accounting::get_journal_detail,
            commands::accounting::create_manual_journal,
            commands::accounting::get_trial_balance,
            commands::accounting::get_profit_loss,
            commands::accounting::get_balance_sheet,
            commands::accounting::cash_in,
            commands::accounting::cash_out,
            // Phase 8 — Reports
            commands::reports::get_sales_summary,
            commands::reports::get_top_selling_items,
            commands::reports::get_sales_by_payment_method,
            commands::reports::get_stock_valuation,
            commands::reports::get_expiring_items,
            commands::reports::get_outstanding_payables,
            commands::reports::get_purchase_summary,
            commands::reports::get_customer_report,
            commands::reports::get_sales_recap_report,
            commands::reports::get_detailed_sales_lines,
            commands::reports::get_sales_by_cashier_summary,
            commands::reports::get_daily_sales_recap,
            // Phase 9 - Excel Import/Export
            commands::excel::import_items_excel,
            commands::excel::export_items_excel,
            commands::excel::export_stock_excel,
            commands::excel::export_sales_excel,
            commands::excel::export_receive_template,
            commands::excel::parse_receive_excel,

            // Phase 9 - Auth
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::get_users,
            commands::auth::create_user,
            commands::auth::toggle_user_active,
            commands::auth::reset_user_password,
            commands::auth::update_user,
            commands::auth::delete_user,
            commands::auth::assign_user_workspace,
            commands::auth::get_permission_definitions,
            commands::auth::get_role_default_permissions,
            commands::auth::update_role_default_permissions,
            commands::auth::get_user_permissions,
            commands::auth::update_user_permissions,
            
            // Phase 9 - Sync
            commands::sync::receive_cloud_sync,
            commands::sync::join_workspace,
            commands::sync::create_workspace,
            commands::sync::create_workspace_invite,
            commands::sync::nuke_cloud_workspace_data,
            commands::sync::get_sync_status,
            commands::sync::trigger_sync_push,
            commands::sync::trigger_sync_pull,
            commands::sync::leave_workspace,
            commands::sync::sysadmin_login,
            commands::sync::sysadmin_get_workspaces,
            commands::sync::sysadmin_create_workspace,
            commands::sync::sysadmin_create_workspace_invite,
            commands::sync::sysadmin_update_workspace_password,

            // Phase 10 - Maintenance
            commands::maintenance::optimize_database,
            commands::maintenance::export_database,
            commands::maintenance::open_devtools,
            commands::maintenance::list_printers,
            commands::maintenance::kick_cash_drawer,
            commands::maintenance::print_raw_receipt,
            commands::admin::reset_db_specific,
            // Phase 11 - Local Network (LAN) Offline Discovery & Sync
            commands::lan::get_lan_status,
            commands::lan::get_lan_peers,
            commands::lan::scan_lan_subnet,
            commands::lan::set_lan_role,
            commands::lan::set_lan_device_name,
            commands::lan::set_lan_auto_connect,
            commands::lan::connect_lan_parent,
            commands::lan::disconnect_lan_parent,
            commands::lan::parent_request_connect_child,
            commands::lan::test_lan_connection,
            commands::lan::trigger_lan_sync_now,
            commands::lan::clone_from_parent,
            commands::lan::lan_remote_kick_drawer,
            commands::lan::lan_remote_print_receipt,

            // AI Native Request
            commands::ai::send_ai_chat_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
