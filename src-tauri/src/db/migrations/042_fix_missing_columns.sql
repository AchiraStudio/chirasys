-- 042_fix_missing_columns.sql
-- Re-run column additions statement-by-statement to fix databases where 039 was aborted early.

ALTER TABLE customers ADD COLUMN deleted_at TEXT;
ALTER TABLE customers ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE suppliers ADD COLUMN deleted_at TEXT;
ALTER TABLE suppliers ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE purchase_orders ADD COLUMN deleted_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN updated_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE po_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE po_lines ADD COLUMN updated_at TEXT;
ALTER TABLE po_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE purchases ADD COLUMN deleted_at TEXT;
ALTER TABLE purchases ADD COLUMN updated_at TEXT;
ALTER TABLE purchases ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE purchase_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE purchase_lines ADD COLUMN updated_at TEXT;
ALTER TABLE purchase_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE purchase_payments ADD COLUMN deleted_at TEXT;
ALTER TABLE purchase_payments ADD COLUMN updated_at TEXT;
ALTER TABLE purchase_payments ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE purchase_returns ADD COLUMN deleted_at TEXT;
ALTER TABLE purchase_returns ADD COLUMN updated_at TEXT;
ALTER TABLE purchase_returns ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE purchase_return_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE purchase_return_lines ADD COLUMN updated_at TEXT;
ALTER TABLE purchase_return_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE promos ADD COLUMN deleted_at TEXT;
ALTER TABLE promos ADD COLUMN updated_at TEXT;
ALTER TABLE promos ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE promo_bogo_rules ADD COLUMN deleted_at TEXT;
ALTER TABLE promo_bogo_rules ADD COLUMN updated_at TEXT;
ALTER TABLE promo_bogo_rules ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE promo_tiers ADD COLUMN deleted_at TEXT;
ALTER TABLE promo_tiers ADD COLUMN updated_at TEXT;
ALTER TABLE promo_tiers ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE promo_bundle_items ADD COLUMN deleted_at TEXT;
ALTER TABLE promo_bundle_items ADD COLUMN updated_at TEXT;
ALTER TABLE promo_bundle_items ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE accounts ADD COLUMN deleted_at TEXT;
ALTER TABLE accounts ADD COLUMN updated_at TEXT;
ALTER TABLE accounts ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE journal_entries ADD COLUMN deleted_at TEXT;
ALTER TABLE journal_entries ADD COLUMN updated_at TEXT;
ALTER TABLE journal_entries ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE journal_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE journal_lines ADD COLUMN updated_at TEXT;
ALTER TABLE journal_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE sales ADD COLUMN deleted_at TEXT;
ALTER TABLE sales ADD COLUMN updated_at TEXT;
ALTER TABLE sales ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE sale_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE sale_lines ADD COLUMN updated_at TEXT;
ALTER TABLE sale_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE sale_payments ADD COLUMN deleted_at TEXT;
ALTER TABLE sale_payments ADD COLUMN updated_at TEXT;
ALTER TABLE sale_payments ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE sale_returns ADD COLUMN deleted_at TEXT;
ALTER TABLE sale_returns ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE sale_returns ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE sale_return_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE sale_return_lines ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE sale_return_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE stock_opname ADD COLUMN deleted_at TEXT;
ALTER TABLE stock_opname ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE stock_opname ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE stock_opname_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE stock_opname_lines ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE stock_opname_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE stock_ledger ADD COLUMN deleted_at TEXT;
ALTER TABLE stock_ledger ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE stock_ledger ADD COLUMN updated_by TEXT DEFAULT 'user';
