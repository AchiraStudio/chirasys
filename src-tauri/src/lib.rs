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
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                match db::connection::establish_connection(&handle).await {
                    Ok(pool) => {
                        println!("✅ Database connected successfully.");
                        commands::sync::spawn_sync_worker(pool.clone());
                        handle.manage(AppState { db_pool: pool });
                    }
                    Err(e) => {
                        panic!("❌ DATABASE FATAL ERROR: {}", e);
                    }
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::masters::get_brands,
            commands::masters::add_brand,
            commands::masters::update_brand,
            commands::masters::delete_brand,
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
            commands::items::add_item_unit,
            commands::items::update_item_unit,
            commands::items::delete_item_unit,
            commands::items::set_item_price,
            commands::inventory::get_stock_overview,
            commands::inventory::get_low_stock_alerts,
            commands::inventory::get_stock_movements,
            commands::inventory::adjust_stock,
            commands::inventory::set_initial_stock,
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
            // Phase 9 - Excel Import/Export
            commands::excel::import_items_excel,
            commands::excel::export_items_excel,
            commands::excel::export_sales_excel,

            // Phase 9 - Auth
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            
            // Phase 9 - Sync
            commands::sync::receive_cloud_sync,

            // Phase 10 - Maintenance
            commands::maintenance::optimize_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
