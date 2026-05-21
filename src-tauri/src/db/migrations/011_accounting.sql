-- 011_accounting.sql

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
    parent_id TEXT REFERENCES accounts(id),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit','credit')),
    is_system INTEGER NOT NULL DEFAULT 0,  -- system accounts cannot be deleted
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Journal Headers
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    entry_no TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    description TEXT,
    source_type TEXT CHECK (source_type IN ('sale','purchase','sale_payment','purchase_payment','return','manual','adjustment', 'purchase_return')),
    source_id TEXT,
    branch_id TEXT REFERENCES branches(id),
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Journal Lines (always balanced: SUM(debit) = SUM(credit) per entry)
CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    notes TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))  -- only one side per line
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- Seed: Indonesian Retail COA
INSERT OR IGNORE INTO accounts (id, code, name, type, parent_id, normal_balance, is_system, is_active, created_at) VALUES
('acc_kas',   '1-1000', 'Kas',              'asset',     NULL, 'debit',  1, 1, datetime('now')),
('acc_bank',  '1-1100', 'Bank',             'asset',     NULL, 'debit',  1, 1, datetime('now')),
('acc_inv',   '1-1200', 'Persediaan',       'asset',     NULL, 'debit',  1, 1, datetime('now')),
('acc_ar',    '1-1300', 'Piutang Usaha',    'asset',     NULL, 'debit',  1, 1, datetime('now')),
('acc_ap',    '2-2000', 'Hutang Usaha',     'liability', NULL, 'credit', 1, 1, datetime('now')),
('acc_equity','3-3000', 'Modal',            'equity',    NULL, 'credit', 1, 1, datetime('now')),
('acc_re',    '3-3100', 'Laba Ditahan',     'equity',    NULL, 'credit', 1, 1, datetime('now')),
('acc_sales', '4-4000', 'Penjualan',        'income',    NULL, 'credit', 1, 1, datetime('now')),
('acc_cogs',  '5-5000', 'HPP',              'expense',   NULL, 'debit',  1, 1, datetime('now')),
('acc_disc',  '5-5100', 'Diskon Penjualan', 'expense',   NULL, 'debit',  1, 1, datetime('now'));
