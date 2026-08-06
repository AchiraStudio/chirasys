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

    let mut errors: Vec<String> = Vec::new();
    let mut rows_imported = 0;

    if let Ok(range) = workbook.worksheet_range(first_sheet) {
        let mut row_iter = range.rows();

        // --- Read header row and build a name → column-index map ---
        let header_row = match row_iter.next() {
            Some(h) => h,
            None => return Err("Excel file has no header row".to_string()),
        };

        // Normalize header: lowercase + underscores
        let normalize = |s: &str| s.trim().to_lowercase().replace(' ', "_");

        let mut col_map: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        for (i, cell) in header_row.iter().enumerate() {
            if let Data::String(s) = cell {
                col_map.insert(normalize(s), i);
            }
        }

        // Helper: get cell value as String (handles numeric SKUs like "000001")
        let cell_str = |d: &Data| -> String {
            match d {
                Data::Float(f) => {
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

        let get_float = |d: &Data| -> f64 {
            match d {
                Data::Float(f) => *f,
                Data::Int(i) => *i as f64,
                Data::String(s) => s.replace([',', '.'], "").parse::<f64>().unwrap_or(0.0),
                _ => 0.0,
            }
        };

        // Find column index by trying multiple possible header names
        let find_col = |aliases: &[&str]| -> Option<usize> {
            for alias in aliases {
                if let Some(&idx) = col_map.get(*alias) {
                    return Some(idx);
                }
            }
            None
        };

        let col_sku      = find_col(&["kode_item", "sku", "kode"]);
        let col_barcode  = find_col(&["barcode", "kode_barcode"]);
        let col_name     = find_col(&["nama_item", "nama", "name"]);
        let col_jenis    = find_col(&["jenis", "jenis_item"]);
        let col_merek    = find_col(&["merek", "brand", "merk"]);
        let col_kategori = find_col(&["kategori", "category", "kategori_item"]);
        let col_rak      = find_col(&["rak", "rack", "lokasi"]);
        let col_tipe     = find_col(&["tipe_item", "tipe", "type"]);
        let col_konversi = find_col(&["konversi", "conversion"]);
        let col_satuan   = find_col(&["satuan", "unit", "unit_name"]);
        let col_hpp      = find_col(&["harga_pokok", "hpp", "cost_price"]);
        let col_jml_1    = find_col(&["jml_1", "jml1", "jumlah_1"]);
        let col_harga_1  = find_col(&["harga_jml_1", "hargajml1", "harga_1", "harga_jual"]);
        let col_jml_2    = find_col(&["jml_2", "jml2", "jumlah_2"]);
        let col_harga_2  = find_col(&["harga_jml_2", "hargajml2", "harga_2"]);
        let col_jml_3    = find_col(&["jml_3", "jml3", "jumlah_3"]);
        let col_harga_3  = find_col(&["harga_jml_3", "hargajml3", "harga_3"]);
        let col_jml_4    = find_col(&["jml_4", "jml4", "jumlah_4"]);
        let col_harga_4  = find_col(&["harga_jml_4", "hargajml4", "harga_4"]);
        let col_notes    = find_col(&["keterangan", "notes", "catatan"]);

        if col_sku.is_none() {
            return Err("Kolom 'Kode Item' atau 'SKU' tidak ditemukan di header Excel.".to_string());
        }
        if col_name.is_none() {
            return Err("Kolom 'Nama Item' atau 'Nama' tidak ditemukan di header Excel.".to_string());
        }

        for (row_idx, row) in row_iter.enumerate() {
            if row.is_empty() {
                continue;
            }

            let get = |col_opt: Option<usize>| -> &Data {
                col_opt.and_then(|c| row.get(c)).unwrap_or(&Data::Empty)
            };

            let sku = cell_str(get(col_sku));
            if sku.trim().is_empty() {
                continue;
            }

            let barcode_raw = cell_str(get(col_barcode));
            let barcode = if barcode_raw.trim().is_empty() { sku.clone() } else { barcode_raw };
            let name = cell_str(get(col_name));
            if name.trim().is_empty() {
                errors.push(format!("Row {}: Nama item kosong, dilewati.", row_idx + 2));
                continue;
            }

            let jenis     = cell_str(get(col_jenis));
            let mut merek     = cell_str(get(col_merek));
            let kategori  = cell_str(get(col_kategori));
            let rak       = cell_str(get(col_rak));
            let tipe_item = cell_str(get(col_tipe));
            let konversi  = { let v = get_float(get(col_konversi)); if v <= 0.0 { 1.0 } else { v } };
            let satuan    = cell_str(get(col_satuan));
            let harga_pokok = get_float(get(col_hpp));

            let jml_1   = get_float(get(col_jml_1));
            let harga_1 = get_float(get(col_harga_1));
            let jml_2   = get_float(get(col_jml_2));
            let harga_2 = get_float(get(col_harga_2));
            let jml_3   = get_float(get(col_jml_3));
            let harga_3 = get_float(get(col_harga_3));
            let jml_4   = get_float(get(col_jml_4));
            let harga_4 = get_float(get(col_harga_4));

            let ket_raw = cell_str(get(col_notes));
            let notes = if ket_raw.trim().is_empty() {
                format!("Jenis: {} | Rak: {} | Tipe: {}", jenis, rak, tipe_item)
            } else {
                ket_raw
            };

            // Extremely strict validation: Merek should NEVER be a unit name like "PCS", "BOX", "STRIP"
            let merek_upper = merek.trim().to_uppercase();
            if merek_upper == "PCS" || merek_upper == "BOX" || merek_upper == "STRIP" || merek_upper == "BOTOL" || merek_upper == "TUBE" || merek_upper == satuan.trim().to_uppercase() {
                merek = String::new();
            }

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
                let _ = sqlx::query(
                    "UPDATE items SET name = ?, barcode = ?, generic_name = ?, category_id = ?, brand_id = ?, cost_price = ?, rack_location = ?, item_type = ?, notes = ? WHERE id = ?"
                ).bind(&name).bind(&barcode).bind(&jenis).bind(&category_id).bind(&brand_id).bind(harga_pokok).bind(&rak).bind(&tipe_item).bind(&notes).bind(r.get::<String, _>("id"))
                .execute(&state.db_pool).await;
                r.get::<String, _>("id")
            } else {
                let new_id = Uuid::new_v4().to_string();
                let _ = sqlx::query(
                    "INSERT INTO items (id, sku, barcode, name, generic_name, category_id, brand_id, cost_price, rack_location, item_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(&new_id).bind(&sku).bind(&barcode).bind(&name).bind(&jenis).bind(&category_id).bind(&brand_id).bind(harga_pokok).bind(&rak).bind(&tipe_item).bind(&notes)
                .execute(&state.db_pool).await;
                new_id
            };

            // 4. Upsert Unit (normalise to uppercase e.g. "pcs" → "PCS")
            let unit_name = if satuan.trim().is_empty() {
                "PCS".to_string()
            } else {
                satuan.trim().to_uppercase()
            };
            let unit_res = sqlx::query(
                "SELECT id FROM item_units WHERE item_id = ? AND unit_name = ?"
            ).bind(&item_id).bind(&unit_name)
            .fetch_optional(&state.db_pool).await.unwrap_or(None);

            let unit_id = if let Some(r) = unit_res {
                let _ = sqlx::query(
                    "UPDATE item_units SET conversion = ? WHERE id = ?"
                ).bind(konversi).bind(r.get::<String, _>("id"))
                .execute(&state.db_pool).await;
                r.get::<String, _>("id")
            } else {
                let new_unit_id = Uuid::new_v4().to_string();
                let is_base = if konversi == 1.0 { 1 } else { 0 };
                let _ = sqlx::query(
                    "INSERT INTO item_units (id, item_id, unit_name, conversion, is_base) VALUES (?, ?, ?, ?, ?)"
                ).bind(&new_unit_id).bind(&item_id).bind(&unit_name).bind(konversi).bind(is_base)
                .execute(&state.db_pool).await;
                new_unit_id
            };

            // 5. Update HPP in ledger
            if harga_pokok > 0.0 {
                let _ = sqlx::query(
                    "UPDATE stock_ledger SET hpp_value = ? WHERE item_id = ? AND branch_id = 'branch_001'"
                ).bind(harga_pokok).bind(&item_id)
                .execute(&state.db_pool).await;
            }

            // 6. Upsert Quantity Price Tiers
            let _ = sqlx::query("DELETE FROM item_price_tiers WHERE item_id = ?")
                .bind(&item_id)
                .execute(&state.db_pool)
                .await;

            let mut tier_lvl = 1i64;
            if jml_1 > 0.0 && harga_1 > 0.0 {
                let _ = sqlx::query(
                    "INSERT INTO item_price_tiers (id, item_id, unit_id, tier_level, max_qty, price) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(Uuid::new_v4().to_string()).bind(&item_id).bind(&unit_id).bind(tier_lvl).bind(jml_1).bind(harga_1)
                .execute(&state.db_pool).await;
                tier_lvl += 1;
            }
            if jml_2 > 0.0 && harga_2 > 0.0 {
                let _ = sqlx::query(
                    "INSERT INTO item_price_tiers (id, item_id, unit_id, tier_level, max_qty, price) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(Uuid::new_v4().to_string()).bind(&item_id).bind(&unit_id).bind(tier_lvl).bind(jml_2).bind(harga_2)
                .execute(&state.db_pool).await;
                tier_lvl += 1;
            }
            if jml_3 > 0.0 && harga_3 > 0.0 {
                let _ = sqlx::query(
                    "INSERT INTO item_price_tiers (id, item_id, unit_id, tier_level, max_qty, price) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(Uuid::new_v4().to_string()).bind(&item_id).bind(&unit_id).bind(tier_lvl).bind(jml_3).bind(harga_3)
                .execute(&state.db_pool).await;
                tier_lvl += 1;
            }
            if jml_4 > 0.0 && harga_4 > 0.0 {
                let _ = sqlx::query(
                    "INSERT INTO item_price_tiers (id, item_id, unit_id, tier_level, max_qty, price) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(Uuid::new_v4().to_string()).bind(&item_id).bind(&unit_id).bind(tier_lvl).bind(jml_4).bind(harga_4)
                .execute(&state.db_pool).await;
            }

            // 7. Default Regular Item Price (Harga Jml 1)
            let default_price = if harga_1 > 0.0 { harga_1 } else { harga_pokok };
            if default_price > 0.0 {
                let _ = sqlx::query(
                    "INSERT INTO item_prices (id, item_id, unit_id, customer_tier, price) VALUES (?, ?, ?, 'regular', ?)
                     ON CONFLICT(item_id, unit_id, customer_tier) DO UPDATE SET price = excluded.price"
                ).bind(Uuid::new_v4().to_string()).bind(&item_id).bind(&unit_id).bind(default_price)
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

    // Fetch items with cost_price, rack_location, item_type and unit
    let items = sqlx::query(
        "SELECT 
            i.id,
            i.sku,
            i.barcode,
            i.name,
            i.generic_name,
            b.name as brand_name,
            c.name as category_name,
            i.rack_location,
            i.item_type,
            u.conversion,
            u.unit_name,
            i.cost_price,
            i.notes,
            i.is_active
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN item_units u ON u.item_id = i.id AND u.is_base = 1
        ORDER BY i.name ASC"
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Daftar Item").map_err(|e| e.to_string())?;

    let header_format = Format::new().set_bold().set_background_color(Color::RGB(0xD9E1F2));
    let money_format = Format::new().set_num_format("#,##0.00");
    let qty_format = Format::new().set_num_format("#,##0.00");

    let headers = [
        "Kode Item", "Barcode", "Nama Item", "Jenis", "Merek", "Kategori", "Rak", "Tipe Item",
        "Konversi", "Satuan", "Harga Pokok", "Jml 1", "Harga Jml 1", "Jml 2", "Harga Jml 2",
        "Jml 3", "Harga Jml 3", "Jml 4", "Harga Jml 4", "Keterangan"
    ];

    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format).map_err(|e| e.to_string())?;
    }

    for (row, item) in items.iter().enumerate() {
        let row_idx = (row + 1) as u32;
        let item_id: String = item.try_get("id").unwrap_or_default();
        let sku: String = item.try_get("sku").unwrap_or_default();
        let barcode: Option<String> = item.try_get("barcode").unwrap_or(None);
        let name: String = item.try_get("name").unwrap_or_default();
        let generic_name: Option<String> = item.try_get("generic_name").unwrap_or(None);
        let brand: Option<String> = item.try_get("brand_name").unwrap_or(None);
        let category: Option<String> = item.try_get("category_name").unwrap_or(None);
        let rack: Option<String> = item.try_get("rack_location").unwrap_or(None);
        let item_type: Option<String> = item.try_get("item_type").unwrap_or(None);
        let conversion: f64 = item.try_get("conversion").unwrap_or(1.0);
        let unit: Option<String> = item.try_get("unit_name").unwrap_or(None);
        let cost_price: f64 = item.try_get("cost_price").unwrap_or(0.0);
        let notes: Option<String> = item.try_get("notes").unwrap_or(None);

        // Fetch up to 4 tiers
        let tiers = sqlx::query(
            "SELECT max_qty, price FROM item_price_tiers WHERE item_id = ? ORDER BY tier_level ASC LIMIT 4"
        )
        .bind(&item_id)
        .fetch_all(&state.db_pool)
        .await
        .unwrap_or_default();

        let t1_qty = tiers.get(0).map(|t| t.try_get::<f64, _>("max_qty").unwrap_or(0.0)).unwrap_or(0.0);
        let t1_price = tiers.get(0).map(|t| t.try_get::<f64, _>("price").unwrap_or(0.0)).unwrap_or(0.0);

        let t2_qty = tiers.get(1).map(|t| t.try_get::<f64, _>("max_qty").unwrap_or(0.0)).unwrap_or(0.0);
        let t2_price = tiers.get(1).map(|t| t.try_get::<f64, _>("price").unwrap_or(0.0)).unwrap_or(0.0);

        let t3_qty = tiers.get(2).map(|t| t.try_get::<f64, _>("max_qty").unwrap_or(0.0)).unwrap_or(0.0);
        let t3_price = tiers.get(2).map(|t| t.try_get::<f64, _>("price").unwrap_or(0.0)).unwrap_or(0.0);

        let t4_qty = tiers.get(3).map(|t| t.try_get::<f64, _>("max_qty").unwrap_or(0.0)).unwrap_or(0.0);
        let t4_price = tiers.get(3).map(|t| t.try_get::<f64, _>("price").unwrap_or(0.0)).unwrap_or(0.0);

        worksheet.write_string(row_idx, 0, &sku).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 1, &barcode.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 2, &name).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 3, &generic_name.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 4, &brand.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 5, &category.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 6, &rack.unwrap_or_default()).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 7, &item_type.unwrap_or_else(|| "INV".to_string())).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 8, conversion, &qty_format).map_err(|e| e.to_string())?;
        worksheet.write_string(row_idx, 9, &unit.unwrap_or_else(|| "PCS".to_string())).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 10, cost_price, &money_format).map_err(|e| e.to_string())?;

        worksheet.write_number_with_format(row_idx, 11, t1_qty, &qty_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 12, t1_price, &money_format).map_err(|e| e.to_string())?;

        worksheet.write_number_with_format(row_idx, 13, t2_qty, &qty_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 14, t2_price, &money_format).map_err(|e| e.to_string())?;

        worksheet.write_number_with_format(row_idx, 15, t3_qty, &qty_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 16, t3_price, &money_format).map_err(|e| e.to_string())?;

        worksheet.write_number_with_format(row_idx, 17, t4_qty, &qty_format).map_err(|e| e.to_string())?;
        worksheet.write_number_with_format(row_idx, 18, t4_price, &money_format).map_err(|e| e.to_string())?;

        worksheet.write_string(row_idx, 19, &notes.unwrap_or_default()).map_err(|e| e.to_string())?;
    }

    worksheet.autofit();
    workbook.save(file_path).map_err(|e| e.to_string())?;

    Ok("Export success".to_string())
}

#[tauri::command]
pub async fn export_stock_excel(
    file_path: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<String, String> {
    use rust_xlsxwriter::{Workbook, Format, Color};

    // 1. Fetch data
    let stock_data = sqlx::query(
        "SELECT 
            i.sku,
            i.name,
            c.name as category_name,
            u.unit_name,
            sl.batch_no,
            sl.expiry_date,
            SUM(CASE sl.direction WHEN 'in' THEN sl.qty_change WHEN 'out' THEN -sl.qty_change ELSE 0 END) as current_qty
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN item_units u ON u.item_id = i.id AND u.is_base = 1
        JOIN stock_ledger sl ON sl.item_id = i.id AND sl.unit_id = u.id
        GROUP BY i.id, sl.batch_no, sl.expiry_date
        HAVING current_qty > 0
        ORDER BY i.name ASC, sl.expiry_date ASC"
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = Format::new()
        .set_bold()
        .set_background_color(Color::RGB(0x4F46E5))
        .set_font_color(Color::White);

    let headers = vec![
        "SKU", "Item Name", "Category", "Unit", "Batch No", "Expiry Date", "Current Qty"
    ];
    for (col, &h) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, h, &header_format).map_err(|e| e.to_string())?;
    }

    for (row, record) in stock_data.iter().enumerate() {
        let r = (row + 1) as u32;
        let sku: String = record.get::<Option<String>, _>("sku").unwrap_or_default();
        let name: String = record.get("name");
        let cat: String = record.get::<Option<String>, _>("category_name").unwrap_or_default();
        let unit: String = record.get::<Option<String>, _>("unit_name").unwrap_or_default();
        let batch: String = record.get::<Option<String>, _>("batch_no").unwrap_or_default();
        let expiry: String = record.get::<Option<String>, _>("expiry_date").unwrap_or_default();
        let qty: f64 = record.get("current_qty");

        worksheet.write_string(r, 0, &sku).map_err(|e| e.to_string())?;
        worksheet.write_string(r, 1, &name).map_err(|e| e.to_string())?;
        worksheet.write_string(r, 2, &cat).map_err(|e| e.to_string())?;
        worksheet.write_string(r, 3, &unit).map_err(|e| e.to_string())?;
        worksheet.write_string(r, 4, &batch).map_err(|e| e.to_string())?;
        worksheet.write_string(r, 5, &expiry).map_err(|e| e.to_string())?;
        worksheet.write_number(r, 6, qty).map_err(|e| e.to_string())?;
    }

    workbook.save(file_path).map_err(|e| e.to_string())?;
    Ok("Export success".to_string())
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
