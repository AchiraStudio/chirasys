use crate::db::models::promos::*;
use crate::AppState;
use tauri::State;
use uuid::Uuid;

// ==========================================
// PROMO CRUD
// ==========================================

#[tauri::command]
pub async fn get_promos(
    active_only: bool,
    state: State<'_, AppState>,
) -> Result<Vec<Promo>, String> {
    let query = if active_only {
        "SELECT * FROM promos WHERE active = 1 ORDER BY priority ASC, created_at DESC"
    } else {
        "SELECT * FROM promos ORDER BY active DESC, priority ASC, created_at DESC"
    };

    sqlx::query_as::<_, Promo>(query)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_promo_detail(
    id: String,
    state: State<'_, AppState>,
) -> Result<PromoDetail, String> {
    let promo = sqlx::query_as::<_, Promo>("SELECT * FROM promos WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let bogo_rules =
        sqlx::query_as::<_, PromoBogoRule>("SELECT * FROM promo_bogo_rules WHERE promo_id = ?")
            .bind(&id)
            .fetch_all(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

    let tiers = sqlx::query_as::<_, PromoTier>(
        "SELECT * FROM promo_tiers WHERE promo_id = ? ORDER BY min_qty ASC",
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PromoDetail {
        promo,
        bogo_rules,
        tiers,
    })
}

#[tauri::command]
pub async fn create_promo(
    input: CreatePromoInput,
    state: State<'_, AppState>,
) -> Result<Promo, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let promo_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"INSERT INTO promos (
            id, name, description, discount_percent, min_qty, category_id, item_id, member_only, 
            start_date, end_date, active, promo_type, discount_value, applies_to, max_discount_amount, 
            stack_rule, priority, member_tier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(&promo_id).bind(&input.name).bind(&input.description).bind(input.discount_percent)
    .bind(input.min_qty).bind(&input.category_id).bind(&input.item_id).bind(input.member_only)
    .bind(&input.start_date).bind(&input.end_date).bind(&input.promo_type).bind(input.discount_value)
    .bind(&input.applies_to).bind(input.max_discount_amount).bind(&input.stack_rule)
    .bind(input.priority).bind(&input.member_tier)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for bogo in input.bogo_rules {
        let bogo_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO promo_bogo_rules (id, promo_id, buy_qty, get_qty, free_item_id, free_item_unit_id, free_item_discount_percent) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&bogo_id).bind(&promo_id).bind(bogo.buy_qty).bind(bogo.get_qty)
        .bind(&bogo.free_item_id).bind(&bogo.free_item_unit_id).bind(bogo.free_item_discount_percent)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for tier in input.tiers {
        let tier_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO promo_tiers (id, promo_id, min_qty, discount_percent) VALUES (?, ?, ?, ?)",
        )
        .bind(&tier_id)
        .bind(&promo_id)
        .bind(tier.min_qty)
        .bind(tier.discount_percent)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Promo>("SELECT * FROM promos WHERE id = ?")
        .bind(&promo_id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_promo(
    id: String,
    input: CreatePromoInput,
    state: State<'_, AppState>,
) -> Result<Promo, String> {
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"UPDATE promos SET 
            name=?, description=?, discount_percent=?, min_qty=?, category_id=?, item_id=?, member_only=?, 
            start_date=?, end_date=?, promo_type=?, discount_value=?, applies_to=?, max_discount_amount=?, 
            stack_rule=?, priority=?, member_tier=?
        WHERE id=?"#
    )
    .bind(&input.name).bind(&input.description).bind(input.discount_percent).bind(input.min_qty)
    .bind(&input.category_id).bind(&input.item_id).bind(input.member_only).bind(&input.start_date)
    .bind(&input.end_date).bind(&input.promo_type).bind(input.discount_value).bind(&input.applies_to)
    .bind(input.max_discount_amount).bind(&input.stack_rule).bind(input.priority).bind(&input.member_tier)
    .bind(&id)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    // Replace bogo rules
    sqlx::query("DELETE FROM promo_bogo_rules WHERE promo_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for bogo in input.bogo_rules {
        let bogo_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO promo_bogo_rules (id, promo_id, buy_qty, get_qty, free_item_id, free_item_unit_id, free_item_discount_percent) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&bogo_id).bind(&id).bind(bogo.buy_qty).bind(bogo.get_qty)
        .bind(&bogo.free_item_id).bind(&bogo.free_item_unit_id).bind(bogo.free_item_discount_percent)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    // Replace tiers
    sqlx::query("DELETE FROM promo_tiers WHERE promo_id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for tier in input.tiers {
        let tier_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO promo_tiers (id, promo_id, min_qty, discount_percent) VALUES (?, ?, ?, ?)",
        )
        .bind(&tier_id)
        .bind(&id)
        .bind(tier.min_qty)
        .bind(tier.discount_percent)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Promo>("SELECT * FROM promos WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_promo(id: String, state: State<'_, AppState>) -> Result<(), String> {
    // Delete if no applications, otherwise just set active=0
    let in_use: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM sale_promo_applications WHERE promo_id = ? LIMIT 1")
            .bind(&id)
            .fetch_optional(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

    if in_use.is_some() {
        // Soft delete (deactivate)
        sqlx::query("UPDATE promos SET active = 0 WHERE id = ?")
            .bind(&id)
            .execute(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM promo_bogo_rules WHERE promo_id = ?")
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM promo_tiers WHERE promo_id = ?")
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM promos WHERE id = ?")
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        tx.commit().await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn toggle_promo_active(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE promos SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?")
        .bind(&id)
        .execute(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// DISCOUNT ENGINE
// ==========================================

#[tauri::command]
pub async fn calculate_discounts(
    lines: Vec<CartLineForDiscount>,
    customer_tier: Option<String>,
    state: State<'_, AppState>,
) -> Result<DiscountResult, String> {
    calculate_discounts_internal(&state.db_pool, lines, customer_tier).await
}

pub async fn calculate_discounts_internal(
    pool: &sqlx::SqlitePool,
    lines: Vec<CartLineForDiscount>,
    customer_tier: Option<String>,
) -> Result<DiscountResult, String> {
    let mut applied_discounts: Vec<AppliedDiscount> = Vec::new();
    let mut cart_discount = 0.0;
    let mut cart_discount_promo_id: Option<String> = None;

    // Fetch active promos valid today
    let promos_query = r#"
        SELECT * FROM promos 
        WHERE active = 1 
        AND (start_date IS NULL OR start_date <= date('now', 'localtime'))
        AND (end_date IS NULL OR end_date >= date('now', 'localtime'))
        ORDER BY priority ASC, created_at DESC
    "#;

    let active_promos = sqlx::query_as::<_, Promo>(promos_query)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Fetch bogo and tier rules for these promos to avoid N+1 querying in the loop
    // But for simplicity of implementation here, we'll fetch them on demand if needed,
    // or we can fetch all of them. Let's fetch all active bogo/tiers to memory.

    let bogo_rules = sqlx::query_as::<_, PromoBogoRule>(
        "SELECT b.* FROM promo_bogo_rules b JOIN promos p ON p.id = b.promo_id WHERE p.active = 1",
    )
    .fetch_all(pool)
    .await
    .unwrap_or(vec![]);

    let tiers = sqlx::query_as::<_, PromoTier>(
        "SELECT t.* FROM promo_tiers t JOIN promos p ON p.id = t.promo_id WHERE p.active = 1 ORDER BY t.min_qty DESC"
    ).fetch_all(pool).await.unwrap_or(vec![]);

    // We will track the discount applied per line index so we can handle stacking rules
    let mut line_discounts_map: std::collections::HashMap<usize, Vec<AppliedDiscount>> =
        std::collections::HashMap::new();

    for promo in &active_promos {
        // Filter by member tier
        if promo.member_tier.is_some() && promo.member_tier != customer_tier {
            continue;
        }

        // Apply promo based on applies_to
        if promo.applies_to == "cart" {
            // Cart-level discount logic
            let cart_total: f64 = lines.iter().map(|l| l.price * l.qty).sum();
            if cart_total >= promo.min_qty {
                // using min_qty as min_amount for cart
                let mut d = 0.0;
                if promo.promo_type == "percentage" {
                    d = cart_total * promo.discount_value.unwrap_or(0.0) / 100.0;
                } else if promo.promo_type == "fixed_amount" {
                    d = promo.discount_value.unwrap_or(0.0);
                }
                if let Some(cap) = promo.max_discount_amount {
                    if d > cap {
                        d = cap;
                    }
                }
                // Find the best cart discount if multiple apply (best_only logic simplified for cart)
                if d > cart_discount {
                    cart_discount = d;
                    cart_discount_promo_id = Some(promo.id.clone());
                }
            }
        } else {
            // Item or Category level
            for line in &lines {
                let matches_target = match promo.applies_to.as_str() {
                    "item" => {
                        promo.item_id.is_none() || promo.item_id.as_deref() == Some(&line.item_id)
                    }
                    "category" => {
                        promo.category_id.is_none()
                            || promo.category_id.as_deref() == line.category_id.as_deref()
                    }
                    _ => false,
                };

                if matches_target && line.qty >= promo.min_qty {
                    let mut line_disc_val = 0.0;
                    let mut is_bogo = false;
                    let mut bogo_qty = 0.0;
                    let mut free_item_id = None;
                    let mut free_unit_id = None;

                    match promo.promo_type.as_str() {
                        "percentage" => {
                            line_disc_val = (line.price * line.qty)
                                * promo.discount_value.unwrap_or(promo.discount_percent)
                                / 100.0;
                        }
                        "fixed_amount" => {
                            line_disc_val = promo.discount_value.unwrap_or(0.0);
                        }
                        "tiered" => {
                            // find highest tier where min_qty <= line.qty
                            if let Some(tier) = tiers
                                .iter()
                                .find(|t| t.promo_id == promo.id && line.qty >= t.min_qty)
                            {
                                line_disc_val =
                                    (line.price * line.qty) * tier.discount_percent / 100.0;
                            }
                        }
                        "bogo" => {
                            if let Some(bogo) = bogo_rules.iter().find(|b| b.promo_id == promo.id) {
                                let times = (line.qty / bogo.buy_qty).floor();
                                if times > 0.0 {
                                    is_bogo = true;
                                    bogo_qty = times * bogo.get_qty;
                                    free_item_id =
                                        bogo.free_item_id.clone().or(Some(line.item_id.clone()));
                                    free_unit_id = bogo
                                        .free_item_unit_id
                                        .clone()
                                        .or(Some(line.unit_id.clone()));
                                    // For BOGO we return a special applied discount instructing frontend to add a line,
                                    // we don't discount the current line's price.
                                    line_disc_val = 0.0;
                                }
                            }
                        }
                        _ => {}
                    }

                    if let Some(cap) = promo.max_discount_amount {
                        if line_disc_val > cap {
                            line_disc_val = cap;
                        }
                    }

                    // Round to 2 decimal places
                    line_disc_val = (line_disc_val * 100.0).round() / 100.0;

                    if line_disc_val > 0.0 || is_bogo {
                        let applied = AppliedDiscount {
                            line_index: line.line_index,
                            discount_amount: line_disc_val,
                            promo_id: promo.id.clone(),
                            promo_name: promo.name.clone(),
                            is_bogo_free_item: is_bogo,
                            free_item_qty: bogo_qty,
                            free_item_id,
                            free_item_unit_id: free_unit_id,
                        };

                        line_discounts_map
                            .entry(line.line_index)
                            .or_insert(Vec::new())
                            .push(applied);
                    }
                }
            }
        }
    }

    // Now resolve stacking per line
    for (line_idx, applied_list) in line_discounts_map {
        let line = lines.iter().find(|l| l.line_index == line_idx).unwrap();
        let max_line_total = line.price * line.qty;

        let mut final_list = Vec::new();

        // We evaluate promos in order of priority (which they were inserted in)
        let mut current_total_discount = 0.0;

        // Let's sort applied_list by discount amount descending for best_only comparison,
        // but we also need to respect stacking rules.
        // For simplicity: If ANY promo applies best_only, we take the absolute max discount among all promos for this line.
        // If ALL promos are additive, we sum them.
        let has_best_only = applied_list.iter().any(|d| {
            active_promos
                .iter()
                .find(|p| p.id == d.promo_id)
                .map(|p| p.stack_rule.as_str() == "best_only")
                .unwrap_or(false)
        });

        if has_best_only {
            // Find the single best discount
            if let Some(best) = applied_list
                .into_iter()
                .max_by(|a, b| a.discount_amount.partial_cmp(&b.discount_amount).unwrap())
            {
                final_list.push(best);
            }
        } else {
            // Additive or none. Just sum them up, cap at max_line_total
            for mut d in applied_list {
                let p_rule = active_promos
                    .iter()
                    .find(|p| p.id == d.promo_id)
                    .map(|p| p.stack_rule.clone())
                    .unwrap_or("additive".to_string());

                if p_rule == "none" && current_total_discount > 0.0 {
                    continue; // skip if another discount already applied
                }

                if current_total_discount + d.discount_amount > max_line_total {
                    d.discount_amount = max_line_total - current_total_discount;
                }

                if d.discount_amount > 0.0 || d.is_bogo_free_item {
                    current_total_discount += d.discount_amount;
                    final_list.push(d);
                }
            }
        }

        applied_discounts.extend(final_list);
    }

    let total_line_discount: f64 = applied_discounts.iter().map(|d| d.discount_amount).sum();

    Ok(DiscountResult {
        line_discounts: applied_discounts,
        cart_discount,
        cart_discount_promo_id,
        total_discount: total_line_discount + cart_discount,
    })
}
