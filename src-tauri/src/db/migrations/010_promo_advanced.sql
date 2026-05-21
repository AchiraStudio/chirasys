-- 010_promo_advanced.sql

-- Extend existing promos table (safe ADDs only, idempotent)
ALTER TABLE promos ADD COLUMN promo_type TEXT NOT NULL DEFAULT 'percentage';
-- Note: SQLite ALTER TABLE ADD COLUMN does not support adding constraints that aren't satisfied by the default value, 
-- or CHECK constraints that apply to the new column immediately on old rows in a strict way without table recreation.
-- We'll just add the columns with defaults.

ALTER TABLE promos ADD COLUMN discount_value REAL;          -- for percentage / fixed_amount
ALTER TABLE promos ADD COLUMN applies_to TEXT NOT NULL DEFAULT 'item';
ALTER TABLE promos ADD COLUMN max_discount_amount REAL;         -- cap
ALTER TABLE promos ADD COLUMN stack_rule TEXT NOT NULL DEFAULT 'best_only';
ALTER TABLE promos ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN member_tier TEXT;                  -- 'regular', 'member', 'vip', or NULL for all

-- BOGO rules
CREATE TABLE IF NOT EXISTS promo_bogo_rules (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
    buy_qty REAL NOT NULL,
    get_qty REAL NOT NULL,
    free_item_id TEXT,                 -- NULL = same item
    free_item_unit_id TEXT,
    free_item_discount_percent REAL DEFAULT 100
);

-- Tiered thresholds
CREATE TABLE IF NOT EXISTS promo_tiers (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
    min_qty REAL NOT NULL,
    discount_percent REAL NOT NULL
);

-- Audit: which promos were applied to which sale
CREATE TABLE IF NOT EXISTS sale_promo_applications (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    promo_id TEXT NOT NULL REFERENCES promos(id),
    discount_amount REAL NOT NULL,
    applied_to TEXT -- line_id or 'cart'
);

CREATE INDEX IF NOT EXISTS idx_promos_dates ON promos(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promos_active ON promos(active);
