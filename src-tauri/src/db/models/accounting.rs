use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Account {
    pub id: String,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub parent_id: Option<String>,
    pub normal_balance: String,
    pub is_system: i32,
    pub is_active: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct JournalEntry {
    pub id: String,
    pub entry_no: String,
    pub date: String,
    pub description: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<String>,
    pub branch_id: Option<String>,
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct JournalLine {
    pub id: String,
    pub journal_entry_id: String,
    pub account_id: String,
    pub debit: f64,
    pub credit: f64,
    pub notes: Option<String>,
    // Virtual fields joined from accounts table
    pub account_code: Option<String>,
    pub account_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JournalEntryWithLines {
    pub entry: JournalEntry,
    pub lines: Vec<JournalLine>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct TrialBalanceRow {
    pub account_id: String,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub balance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PLRow {
    pub account_code: String,
    pub account_name: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfitLossGroup {
    pub group_name: String,
    pub rows: Vec<PLRow>,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfitLossReport {
    pub revenue: ProfitLossGroup,
    pub cogs: ProfitLossGroup,
    pub gross_profit: f64,
    pub expenses: ProfitLossGroup,
    pub net_profit: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BSRow {
    pub account_code: String,
    pub account_name: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BalanceSheet {
    pub assets: Vec<BSRow>,
    pub total_assets: f64,
    pub liabilities: Vec<BSRow>,
    pub equity: Vec<BSRow>,
    pub total_liabilities_equity: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountInput {
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub parent_id: Option<String>,
    pub normal_balance: String,
}

#[derive(Debug, Deserialize)]
pub struct ManualJournalLineInput {
    pub account_id: String,
    pub debit: f64,
    pub credit: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ManualJournalInput {
    pub date: String,
    pub branch_id: Option<String>,
    pub description: Option<String>,
    pub lines: Vec<ManualJournalLineInput>,
}
