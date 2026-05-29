-- 021_tax_account.sql

INSERT OR IGNORE INTO accounts (id, code, name, type, normal_balance, is_system, is_active, created_at)
VALUES ('acc_tax', '2-2100', 'Hutang Pajak (PPN)', 'liability', 'credit', 1, 1, datetime('now'));
