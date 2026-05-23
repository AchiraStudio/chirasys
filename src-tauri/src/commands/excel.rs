use crate::AppState;
use calamine::{open_workbook_auto, Data, Reader};
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, serde::Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub rows_imported: usize,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn import_items_excel(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<ImportResult, String> {
    let mut workbook = open_workbook_auto(&file_path).map_err(|e| {
        format!(
            "Gagal membuka file Excel: {}. Pastikan file berformat .xlsx atau .xls yang valid.",
            e
        )
    })?;

    // Read the first sheet
    let sheet_names = workbook.sheet_names().to_owned();
    let first_sheet = sheet_names.first().ok_or("Excel file is empty")?;

    let errors: Vec<String> = Vec::new();
    let mut rows_imported = 0;

    if let Ok(range) = workbook.worksheet_range(first_sheet) {
        let mut row_iter = range.rows();

        // Skip header
        row_iter.next();

        for (_i, row) in row_iter.enumerate() {
            if row.is_empty() {
                continue;
            }

            // Expected Format:
            // 0: Kode Item (SKU)
            // 1: Barcode
            // 2: Nama Item
            // 3: Jenis (notes)
            // 4: Merek (Brand)
            // 5: Kategori (Category)
            // 6: Rak (notes)
            // 7: Tipe Item (notes)
            // 8: Konversi (Unit conversion)
            // 9: Satuan (Unit Name)
            // 10: Harga Pokok (avg_hpp)
            // 11: Harga Jual (Retail price)

            // Converts any cell type to a string (handles numeric SKUs like "000001")
            let cell_str = |d: &Data| -> String {
                match d {
                    Data::Float(f) => {
                        // Format numbers without decimal if they are whole numbers
                        if *f == f.floor() && f.abs() < 1e15 {
                            format!("{:06.0}", f)
                        } else {
                            format!("{}", f)
                        }
                    }
                    Data::Int(i) => format!("{:06}", i),
                    Data::String(s) => s.trim().to_string(),
                    Data::Bool(b) => b.to_string(),
                    Data::Empty => String::new(),
                    _ => d.to_string(),
                }
            };

            let sku = cell_str(row.get(0).unwrap_or(&Data::Empty));
            if sku.trim().is_empty() {
                continue;
            }

            let barcode_raw = cell_str(row.get(1).unwrap_or(&Data::Empty));
            // Use SKU as barcode fallback if barcode column is empty
            let barcode = if barcode_raw.trim().is_empty() { sku.clone() } else { barcode_raw };
            let name = cell_str(row.get(2).unwrap_or(&Data::Empty));
            if name.trim().is_empty() { continue; } // Skip rows with no name
            let jenis = cell_str(row.get(3).unwrap_or(&Data::Empty));
            let merek = cell_str(row.get(4).unwrap_or(&Data::Empty));
            let kategori = cell_str(row.get(5).unwrap_or(&Data::Empty));
            let rak = cell_str(row.get(6).unwrap_or(&Data::Empty));
            let tipe_item = cell_str(row.get(7).unwrap_or(&Data::Empty));

            // Handle numeric parsing safely
            let get_float = |d: &Data| -> f64 {
                match d {
                    Data::Float(f) => *f,
                    Data::Int(i) => *i as f64,
                    Data::String(s) => s.replace(",", "").parse::<f64>().unwrap_or(1.0),
                    _ => 1.0,
                }
            };

            let konversi = get_float(row.get(8).unwrap_or(&Data::Empty));
            let satuan = cell_str(row.get(9).unwrap_or(&Data::Empty));
            let harga_pokok = get_float(row.get(10).unwrap_or(&Data::Empty));
            let harga_jual = get_float(row.get(11).unwrap_or(&Data::Empty));

            // Notes aggregation
            let notes = format!("Jenis: {} | Rak: {} | Tipe: {}", jenis, rak, tipe_item);

            // 1. Resolve Category
            let mut category_id: Option<String> = None;
            if !kategori.trim().is_empty() {
                let cat_res = sqlx::query("SELECT id FROM categories WHERE name = ?")
                    .bind(&kategori)
                    .fetch_optional(&state.db_pool)
                    .await
                    .unwrap_or(None);

                if let Some(r) = cat_res {
                    category_id = Some(r.get::<String, _>("id"));
                } else {
                    let new_id = Uuid::new_v4().to_string();
                    let _ = sqlx::query("INSERT INTO categories (id, name) VALUES (?, ?)")
                        .bind(&new_id).bind(&kategori)
                        .execute(&state.db_pool).await;
                    category_id = Some(new_id);
                }
            }

            // 2. Resolve Brand
            let mut brand_id: Option<String> = None;
            if !merek.trim().is_empty() {
                let brand_res = sqlx::query("SELECT id FROM brands WHERE name = ?")
                    .bind(&merek)
                    .fetch_optional(&state.db_pool)
                    .await
                    .unwrap_or(None);

                if let Some(r) = brand_res {
                    brand_id = Some(r.get::<String, _>("id"));
                } else {
                    let new_id = Uuid::new_v4().to_string();
                    let _ = sqlx::query("INSERT INTO brands (id, name) VALUES (?, ?)")
                        .bind(&new_id).bind(&merek)
                        .execute(&state.db_pool)
                        .await;
                    brand_id = Some(new_id);
                }
            }

            // 3. Upsert Item
            let item_res = sqlx::query("SELECT id FROM items WHERE sku = ?")
                .bind(&sku)
                .fetch_optional(&state.db_pool)
                .await
                .unwrap_or(None);

            let item_id = if let Some(r) = item_res {
                // Update existing
                let _ = sqlx::query(
                    "UPDATE items SET name = ?, barcode = ?, category_id = ?, brand_id = ?, notes = ? WHERE id = ?"
                ).bind(&name).bind(&barcode).bind(&category_id).bind(&brand_id).bind(&notes).bind(r.get::<String, _>("id"))
                .execute(&state.db_pool).await;
                r.get::<String, _>("id")
            } else {
                // Insert new
                let new_id = Uuid::new_v4().to_string();
                let _ = sqlx::query(
                    "INSERT INTO items (id, sku, barcode, name, category_id, brand_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
                ).bind(&new_id).bind(&sku).bind(&barcode).bind(&name).bind(&category_id).bind(&brand_id).bind(&notes)
                .execute(&state.db_pool).await;
                new_id
            };

            // 4. Upsert Unit
            let unit_name = if satuan.trim().is_empty() {
                "PCS".to_string()
            } else {
                satuan
            };
            let unit_res = sqlx::query(
                "SELECT id FROM item_units WHERE item_id = ? AND unit_name = ?"
            ).bind(&item_id).bind(&unit_name)
            .fetch_optional(&state.db_pool).await.unwrap_or(None);

            let unit_id = if let Some(r) = unit_res {
                // Update
                let _ = sqlx::query(
                    "UPDATE item_units SET conversion = ? WHERE id = ?"
                ).bind(konversi).bind(r.get::<String, _>("id"))
                .execute(&state.db_pool).await;
                r.get::<String, _>("id")
            } else {
                // Insert
                let new_unit_id = Uuid::new_v4().to_string();
                let is_base = if konversi == 1.0 { 1 } else { 0 };
                let _ = sqlx::query(
                    "INSERT INTO item_units (id, item_id, unit_name, conversion, is_base) VALUES (?, ?, ?, ?, ?)"
                ).bind(&new_unit_id).bind(&item_id).bind(&unit_name).bind(konversi).bind(is_base)
                .execute(&state.db_pool).await;
                new_unit_id
            };

            // 5. Update Stock HPP (via fake ledger entry if avg_hpp > 0)
            if harga_pokok > 0.0 {
                // Simplest way is to just inject an initial stock or adjust an existing ledger row.
                // We'll update the most recent ledger entry or insert a baseline one.
                let _ = sqlx::query(
                    "UPDATE stock_ledger SET hpp_value = ? WHERE item_id = ? AND branch_id = 'branch_001'"
                ).bind(harga_pokok).bind(&item_id)
                .execute(&state.db_pool).await;
            }

            // 6. Upsert Price
            if harga_jual > 0.0 {
                let _ = sqlx::query(
                    "INSERT INTO item_prices (id, item_id, unit_id, customer_tier, price) VALUES (?, ?, ?, 'regular', ?)
                     ON CONFLICT(item_id, unit_id, customer_tier) DO UPDATE SET price = excluded.price"
                ).bind(Uuid::new_v4().to_string()).bind(&item_id).bind(&unit_id).bind(harga_jual)
                .execute(&state.db_pool).await;
            }

            rows_imported += 1;
        }
    } else {
        return Err("Failed to read worksheet range".to_string());
    }

    Ok(ImportResult {
        success: true,
        rows_imported,
        errors,
    })
}

#[tauri::command]
pub async fn export_items_excel(
    file_path: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    use rust_xlsxwriter::{Workbook, Format, Color};

    // 1. Fetch data
    let items = sqlx::query(
        "SELECT 
            i.sku,
            i.barcode,
            i.name,
            c.name as category_name,
            b.name as brand_name,
            i.item_type,
            u.unit_name as unit_name,
            p.price,
            i.is_active
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN item_units u ON u.item_id = i.id AND u.is_base = 1
        LEFT JOIN item_prices p ON p.item_id = i.id AND p.unit_id = u.id AND p.customer_tier = 'regular'
        ORDER BY i.name ASC"
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    // 2. Create workbook
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Daftar Item").map_err(|e| e.to_string())?;

    // 3. Formats
    let header_format = Format::new().set_bold().set_background_color(Color::RGB(0xD9E1F2));
    let money_format = Format::new().set_num_format("#,##0.00");

    // 4. Write Headers
    let headers = ["SKU", "Barcode", "Nama Item", "Kategori", "Merek", "Tipe", "Satuan Dasar", "Harga Jual", "Status"];
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format).map_err(|e| e.to_string())?;
    }

    // 5. Write Data
    for (row, item) in items.iter().enumerate() {
        let row_idx = (row + 1) as u32;
        
        let sku: String = item.try_get("sku").unwrap_or_default();
        let barcode: Option<String> = item.try_get("barcode").unwrap_or(None);
        let name: String = item.try_get("name").unwrap_or_default();
        let category: Option<String> = item.try_get("category_name").unwrap_or(None);
        let brand: Option<String> = item.try_get("brand_name").unwrap_or(None);
        let item_type: String = item.try_get("item_type").unwrap_or_default();
        let unit: Option<String> = item.try_get("unit_name").unwrap_or(None);
        let price: f64 = item.try_get("price").unwrap_or(0.0);
        let is_active: bool = item.try_get("is_active").unwrap_or(true);

        worksheet.write_string(row_idx, 0, &sku).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 1, &barcode.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 2, &name).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 3, &category.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 4, &brand.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 5, &item_type).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 6, &unit.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 7, price, &money_format).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 8, if is_active { "Aktif" } else { "Non-Aktif" }).map_err(|e| e.to_string())?;
    }

    // 6. Autofit
    worksheet.autofit();

    // 7. Save
    workbook.save(&file_path).map_err(|e| e.to_string())?;

    Ok(file_path)
}

#[tauri::command]
pub async fn export_sales_excel(
    file_path: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    use rust_xlsxwriter::{Workbook, Format, Color};

    let sales = sqlx::query(
        "SELECT 
            transaction_date,
            transaction_no,
            payment_method,
            total_amount,
            discount_amount,
            net_amount,
            status
        FROM sales
        ORDER BY transaction_date DESC"
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Laporan Penjualan").map_err(|e| e.to_string())?;

    let header_format = Format::new().set_bold().set_background_color(Color::RGB(0xD9E1F2));
    let money_format = Format::new().set_num_format("#,##0.00");

    let headers = ["Tanggal", "No. Transaksi", "Metode Pembayaran", "Subtotal", "Diskon", "Total Bersih", "Status"];
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format).map_err(|e| e.to_string())?;
    }

    for (row, sale) in sales.iter().enumerate() {
        let row_idx = (row + 1) as u32;
        
        let date: String = sale.try_get("transaction_date").unwrap_or_default();
        let tx_no: String = sale.try_get("transaction_no").unwrap_or_default();
        let method: String = sale.try_get("payment_method").unwrap_or_default();
        let total: f64 = sale.try_get("total_amount").unwrap_or(0.0);
        let disc: f64 = sale.try_get("discount_amount").unwrap_or(0.0);
        let net: f64 = sale.try_get("net_amount").unwrap_or(0.0);
        let status: String = sale.try_get("status").unwrap_or_default();

        worksheet.write_string(row_idx, 0, &date).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 1, &tx_no).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 2, &method).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 3, total, &money_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 4, disc, &money_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 5, net, &money_format).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 6, &status).map_err(|e| e.to_string())?;
    }

    worksheet.autofit();
    workbook.save(&file_path).map_err(|e| e.to_string())?;
    Ok(file_path)
}
