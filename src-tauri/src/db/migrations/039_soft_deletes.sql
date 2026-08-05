-- 039_soft_deletes.sql

-- Add deleted_at and updated_at to all syncable tables

-- Customers & Suppliers
ALTER TABLE customers ADD COLUMN deleted_at TEXT;
ALTER TABLE customers ADD COLUMN updated_by TEXT DEFAULT 'user';
-- customers already has updated_at

ALTER TABLE suppliers ADD COLUMN deleted_at TEXT;
ALTER TABLE suppliers ADD COLUMN updated_by TEXT DEFAULT 'user';
-- suppliers already has updated_at

-- Purchasing
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

-- Promos
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

-- Accounting
ALTER TABLE accounts ADD COLUMN deleted_at TEXT;
ALTER TABLE accounts ADD COLUMN updated_at TEXT;
ALTER TABLE accounts ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE journal_entries ADD COLUMN deleted_at TEXT;
ALTER TABLE journal_entries ADD COLUMN updated_at TEXT;
ALTER TABLE journal_entries ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE journal_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE journal_lines ADD COLUMN updated_at TEXT;
ALTER TABLE journal_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

-- Sales (sub-tables and new columns)
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
ALTER TABLE sale_returns ADD COLUMN updated_at TEXT;
ALTER TABLE sale_returns ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE sale_return_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE sale_return_lines ADD COLUMN updated_at TEXT;
ALTER TABLE sale_return_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

-- Stock Opname
ALTER TABLE stock_opname ADD COLUMN deleted_at TEXT;
ALTER TABLE stock_opname ADD COLUMN updated_at TEXT;
ALTER TABLE stock_opname ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE stock_opname_lines ADD COLUMN deleted_at TEXT;
ALTER TABLE stock_opname_lines ADD COLUMN updated_at TEXT;
ALTER TABLE stock_opname_lines ADD COLUMN updated_by TEXT DEFAULT 'user';

-- Existing master data and inventory
ALTER TABLE stock_ledger ADD COLUMN deleted_at TEXT;
ALTER TABLE stock_ledger ADD COLUMN updated_at TEXT;
ALTER TABLE stock_ledger ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE items ADD COLUMN deleted_at TEXT;
ALTER TABLE items ADD COLUMN updated_by TEXT DEFAULT 'user';
-- items already has updated_at

ALTER TABLE item_units ADD COLUMN deleted_at TEXT;
ALTER TABLE item_units ADD COLUMN updated_at TEXT;
ALTER TABLE item_units ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE item_prices ADD COLUMN deleted_at TEXT;
ALTER TABLE item_prices ADD COLUMN updated_at TEXT;
ALTER TABLE item_prices ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE categories ADD COLUMN deleted_at TEXT;
ALTER TABLE categories ADD COLUMN updated_at TEXT;
ALTER TABLE categories ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE brands ADD COLUMN deleted_at TEXT;
ALTER TABLE brands ADD COLUMN updated_at TEXT;
ALTER TABLE brands ADD COLUMN updated_by TEXT DEFAULT 'user';
