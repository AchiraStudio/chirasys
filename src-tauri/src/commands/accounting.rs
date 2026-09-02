use crate::db::models::accounting::*;
use crate::AppState;
use chrono::Local;
use sqlx::FromRow;
use tauri::State;
use uuid::Uuid;

// ==========================================
// LOCAL RAW QUERY STRUCTS (module-level required for derive)
// ==========================================

#[derive(Debug, FromRow)]
struct PLRaw {
    account_code: String,
    account_name: String,
    account_type: String,
    normal_balance: String,
    total_debit: f64,
    total_credit: f64,
}

#[derive(Debug, FromRow)]
struct BSRaw {
    account_code: String,
    account_name: String,
    account_type: String,
    normal_balance: String,
    total_debit: f64,
    total_credit: f64,
}

// ==========================================
// ACCOUNTS CRUD
// ==========================================

#[tauri::command]
pub async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, String> {
    sqlx::query_as::<_, Account>("SELECT * FROM accounts ORDER BY code ASC")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_account(
    input: CreateAccountInput,
    state: State<'_, AppState>,
) -> Result<Account, String> {
    // Validate unique code
    let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM accounts WHERE code = ?")
        .bind(&input.code)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if exists.is_some() {
        return Err(format!("Account code {} already exists", input.code));
    }

    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO accounts (id, code, name, type, parent_id, normal_balance, is_system, is_active) VALUES (?, ?, ?, ?, ?, ?, 0, 1)"
    )
    .bind(&id).bind(&input.code).bind(&input.name).bind(&input.r#type)
    .bind(&input.parent_id).bind(&input.normal_balance)
    .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Account>("SELECT * FROM accounts WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_account(
    id: String,
    input: CreateAccountInput,
    state: State<'_, AppState>,
) -> Result<Account, String> {
    // Check if system account
    let current = sqlx::query_as::<_, Account>("SELECT * FROM accounts WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if current.is_system == 1
        && (current.r#type != input.r#type || current.normal_balance != input.normal_balance)
    {
        return Err("Cannot change type or normal balance of a system account".into());
    }

    // Check code unique
    if current.code != input.code {
        let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM accounts WHERE code = ?")
            .bind(&input.code)
            .fetch_optional(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;
        if exists.is_some() {
            return Err(format!("Account code {} already exists", input.code));
        }
    }

    sqlx::query(
        "UPDATE accounts SET code = ?, name = ?, type = ?, parent_id = ?, normal_balance = ? WHERE id = ?"
    )
    .bind(&input.code).bind(&input.name).bind(&input.r#type).bind(&input.parent_id).bind(&input.normal_balance).bind(&id)
    .execute(&state.db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Account>("SELECT * FROM accounts WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_account(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let current = sqlx::query_as::<_, Account>("SELECT * FROM accounts WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    if current.is_system == 1 {
        return Err("Cannot delete or deactivate system accounts".into());
    }

    // Check journal lines
    let in_use: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM journal_lines WHERE account_id = ? LIMIT 1")
            .bind(&id)
            .fetch_optional(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

    if in_use.is_some() {
        return Err("Cannot delete account because it has journal entries".into());
    }

    sqlx::query(
        "UPDATE accounts SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
    )
    .bind(&id)
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn generate_unique_journal_entry_no(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    branch_id: Option<&str>,
) -> Result<String, String> {
    // 1. Resolve a valid branch_id
    let branch_str = match branch_id {
        Some(b) if !b.is_empty() => b.to_string(),
        _ => {
            let default_b: Option<String> = sqlx::query_scalar("SELECT id FROM branches LIMIT 1")
                .fetch_optional(&mut **tx)
                .await
                .unwrap_or(None);
            default_b.unwrap_or_else(|| "main".to_string())
        }
    };

    let date_str = format!("JV_{}", Local::now().format("%Y%m"));
    let display_date = Local::now().format("%y%m").to_string();

    let mut counter: i64 = match sqlx::query_scalar::<_, i64>(
        "SELECT counter FROM transaction_counters WHERE branch_id = ? AND date_str = ?"
    )
    .bind(&branch_str)
    .bind(&date_str)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())? {
        Some(c) => c,
        None => 0,
    };

    loop {
        counter += 1;
        let candidate_no = format!("{:04}/JV/{}", counter, display_date);

        let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM journal_entries WHERE entry_no = ?")
            .bind(&candidate_no)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

        if exists.is_none() {
            // Update counter in transaction_counters table
            sqlx::query(
                "INSERT INTO transaction_counters (branch_id, date_str, counter) VALUES (?, ?, ?)
                 ON CONFLICT(branch_id, date_str) DO UPDATE SET counter = excluded.counter"
            )
            .bind(&branch_str)
            .bind(&date_str)
            .bind(counter)
            .execute(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

            return Ok(candidate_no);
        }
    }
}

// ==========================================
// INTERNAL POSTING (Used by other modules)
// ==========================================

pub(crate) async fn post_journal(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    source_type: &str,
    source_id: &str,
    branch_id: Option<&str>,
    description: &str,
    lines: Vec<(&str, f64, f64, Option<&str>)>, // (account_id, debit, credit, notes)
) -> Result<String, String> {
    let entry_no = generate_unique_journal_entry_no(tx, branch_id).await?;
    let entry_id = Uuid::new_v4().to_string();
    let date_iso = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    sqlx::query(
        "INSERT INTO journal_entries (id, entry_no, date, description, source_type, source_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&entry_id).bind(&entry_no).bind(&date_iso).bind(description)
    .bind(source_type).bind(source_id).bind(branch_id)
    .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    let mut total_debit = 0.0;
    let mut total_credit = 0.0;

    for (acc_id, debit, credit, notes) in lines {
        if debit == 0.0 && credit == 0.0 {
            continue;
        }

        total_debit += debit;
        total_credit += credit;

        let line_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, notes) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&line_id).bind(&entry_id).bind(acc_id).bind(debit).bind(credit).bind(notes)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;
    }

    if (total_debit - total_credit).abs() > 0.01 {
        return Err(format!(
            "Journal entry is not balanced. Debit: {}, Credit: {}",
            total_debit, total_credit
        ));
    }

    Ok(entry_id)
}

// ==========================================
// JOURNAL QUERIES & MANUAL ENTRY
// ==========================================

#[tauri::command]
pub async fn create_manual_journal(
    input: ManualJournalInput,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut total_debit = 0.0;
    let mut total_credit = 0.0;

    for l in &input.lines {
        total_debit += l.debit;
        total_credit += l.credit;

        let is_system: i32 = sqlx::query_scalar("SELECT is_system FROM accounts WHERE id = ?")
            .bind(&l.account_id)
            .fetch_one(&state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

        if is_system == 1 {
            return Err(format!(
                "Cannot post manually to system account: {}",
                l.account_id
            ));
        }
    }

    if (total_debit - total_credit).abs() > 0.01 {
        return Err(format!(
            "Journal entry is not balanced. Debit: {}, Credit: {}",
            total_debit, total_credit
        ));
    }

    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;

    let mut lines = Vec::new();
    for l in &input.lines {
        lines.push((l.account_id.as_str(), l.debit, l.credit, l.notes.as_deref()));
    }

    let entry_id = post_journal(
        &mut tx,
        "manual",
        "manual",
        input.branch_id.as_deref(),
        input
            .description
            .as_deref()
            .unwrap_or("Manual Journal Entry"),
        lines,
    )
    .await?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(entry_id)
}

#[tauri::command]
pub async fn get_journal_entries(state: State<'_, AppState>) -> Result<Vec<JournalEntry>, String> {
    sqlx::query_as::<_, JournalEntry>(
        "SELECT * FROM journal_entries ORDER BY date DESC, created_at DESC LIMIT 500",
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_journal_detail(
    id: String,
    state: State<'_, AppState>,
) -> Result<JournalEntryWithLines, String> {
    let entry = sqlx::query_as::<_, JournalEntry>("SELECT * FROM journal_entries WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let lines = sqlx::query_as::<_, JournalLine>(
        r#"SELECT jl.*, a.code as account_code, a.name as account_name 
           FROM journal_lines jl 
           JOIN accounts a ON jl.account_id = a.id 
           WHERE jl.journal_entry_id = ?"#,
    )
    .bind(&id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(JournalEntryWithLines { entry, lines })
}

// ==========================================
// REPORTS
// ==========================================

#[tauri::command]
pub async fn get_trial_balance(
    as_of_date: String,
    state: State<'_, AppState>,
) -> Result<Vec<TrialBalanceRow>, String> {
    let query = r#"
        SELECT 
            a.id as account_id, 
            a.code, 
            a.name, 
            a.type, 
            COALESCE(SUM(jl.debit), 0) as total_debit, 
            COALESCE(SUM(jl.credit), 0) as total_credit,
            CASE 
                WHEN a.normal_balance = 'debit' THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
                ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0)
            END as balance
        FROM accounts a
        LEFT JOIN journal_lines jl ON a.id = jl.account_id
        LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND date(je.date) <= date(?)
        GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
        HAVING total_debit > 0 OR total_credit > 0 OR balance != 0
        ORDER BY a.code ASC
    "#;

    sqlx::query_as::<_, TrialBalanceRow>(query)
        .bind(&as_of_date)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_profit_loss(
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> Result<ProfitLossReport, String> {
    // Alias `a.type` as `account_type` to match PLRaw field name
    let query = r#"
        SELECT 
            a.code as account_code, 
            a.name as account_name,
            a.type as account_type,
            a.normal_balance,
            COALESCE(SUM(jl.debit), 0) as total_debit, 
            COALESCE(SUM(jl.credit), 0) as total_credit
        FROM accounts a
        JOIN journal_lines jl ON a.id = jl.account_id
        JOIN journal_entries je ON jl.journal_entry_id = je.id 
        WHERE date(je.date) >= date(?) AND date(je.date) <= date(?)
        AND a.type IN ('income', 'expense')
        GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
        ORDER BY a.code ASC
    "#;

    let rows = sqlx::query_as::<_, PLRaw>(query)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut revenue_rows = Vec::new();
    let mut cogs_rows = Vec::new();
    let mut exp_rows = Vec::new();

    let mut rev_total = 0.0;
    let mut cogs_total = 0.0;
    let mut exp_total = 0.0;

    for r in rows {
        let bal = if r.normal_balance == "credit" {
            r.total_credit - r.total_debit
        } else {
            r.total_debit - r.total_credit
        };

        let pl_row = PLRow {
            account_code: r.account_code.clone(),
            account_name: r.account_name.clone(),
            amount: bal,
        };

        if r.account_type == "income" {
            rev_total += bal;
            revenue_rows.push(pl_row);
        } else if r.account_type == "expense" {
            // Very simplified COGS check based on our standard COA seed
            if pl_row.account_code.starts_with("5-50") {
                cogs_total += bal;
                cogs_rows.push(pl_row);
            } else {
                exp_total += bal;
                exp_rows.push(pl_row);
            }
        }
    }

    let gross = rev_total - cogs_total;
    let net = gross - exp_total;

    Ok(ProfitLossReport {
        revenue: ProfitLossGroup {
            group_name: "Revenue".to_string(),
            rows: revenue_rows,
            total: rev_total,
        },
        cogs: ProfitLossGroup {
            group_name: "Cost of Goods Sold".to_string(),
            rows: cogs_rows,
            total: cogs_total,
        },
        gross_profit: gross,
        expenses: ProfitLossGroup {
            group_name: "Operating Expenses".to_string(),
            rows: exp_rows,
            total: exp_total,
        },
        net_profit: net,
    })
}

#[tauri::command]
pub async fn get_balance_sheet(
    as_of_date: String,
    state: State<'_, AppState>,
) -> Result<BalanceSheet, String> {
    // Alias `a.type` as `account_type` to match BSRaw field name
    let query = r#"
        SELECT 
            a.code as account_code, 
            a.name as account_name,
            a.type as account_type,
            a.normal_balance,
            COALESCE(SUM(jl.debit), 0) as total_debit, 
            COALESCE(SUM(jl.credit), 0) as total_credit
        FROM accounts a
        JOIN journal_lines jl ON a.id = jl.account_id
        JOIN journal_entries je ON jl.journal_entry_id = je.id 
        WHERE date(je.date) <= date(?)
        AND a.type IN ('asset', 'liability', 'equity')
        GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
        ORDER BY a.code ASC
    "#;

    let rows = sqlx::query_as::<_, BSRaw>(query)
        .bind(&as_of_date)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut asset_rows = Vec::new();
    let mut liab_rows = Vec::new();
    let mut equity_rows = Vec::new();

    let mut a_total = 0.0;
    let mut l_total = 0.0;
    let mut e_total = 0.0;

    for r in rows {
        let bal = if r.normal_balance == "debit" {
            r.total_debit - r.total_credit
        } else {
            r.total_credit - r.total_debit
        };
        let bs_row = BSRow {
            account_code: r.account_code,
            account_name: r.account_name,
            amount: bal,
        };

        match r.account_type.as_str() {
            "asset" => {
                a_total += bal;
                asset_rows.push(bs_row);
            }
            "liability" => {
                l_total += bal;
                liab_rows.push(bs_row);
            }
            "equity" => {
                e_total += bal;
                equity_rows.push(bs_row);
            }
            _ => {}
        }
    }

    Ok(BalanceSheet {
        assets: asset_rows,
        total_assets: a_total,
        liabilities: liab_rows,
        equity: equity_rows,
        total_liabilities_equity: l_total + e_total,
    })
}

// ==========================================
// CASH IN / CASH OUT
// ==========================================

/// Kas Masuk — Cash received (e.g. owner deposit, misc income)
/// DR: Kas/Bank  →  CR: specified contra-account
#[tauri::command]
pub async fn cash_in(
    account_id: String,
    cash_account_id: String,
    amount: f64,
    description: String,
    branch_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if amount <= 0.0 {
        return Err("Jumlah harus lebih dari 0".into());
    }
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
    let lines = vec![
        (cash_account_id.as_str(), amount, 0.0, Some("Kas Masuk")),
        (account_id.as_str(), 0.0, amount, Some("Kas Masuk")),
    ];
    let entry_id = post_journal(
        &mut tx,
        "manual",
        "cash_in",
        branch_id.as_deref(),
        &description,
        lines,
    )
    .await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(entry_id)
}

/// Kas Keluar — Cash paid out (e.g. expenses, purchases)
/// DR: specified account  →  CR: Kas/Bank
#[tauri::command]
pub async fn cash_out(
    account_id: String,
    cash_account_id: String,
    amount: f64,
    description: String,
    branch_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if amount <= 0.0 {
        return Err("Jumlah harus lebih dari 0".into());
    }
    let mut tx = state.db_pool.begin().await.map_err(|e| e.to_string())?;
    let lines = vec![
        (account_id.as_str(), amount, 0.0, Some("Kas Keluar")),
        (cash_account_id.as_str(), 0.0, amount, Some("Kas Keluar")),
    ];
    let entry_id = post_journal(
        &mut tx,
        "manual",
        "cash_out",
        branch_id.as_deref(),
        &description,
        lines,
    )
    .await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(entry_id)
}
