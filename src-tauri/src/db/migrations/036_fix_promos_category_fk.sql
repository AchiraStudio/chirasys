-- 036_fix_promos_category_fk.sql
-- Fix: migration 035 used wrong FK name (item_categories vs categories).
-- Re-create the promos table with the correct FK reference.

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS promos_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    discount_percent REAL NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
    min_qty REAL NOT NULL DEFAULT 1,
    category_id TEXT REFERENCES categories(id),
    item_id TEXT REFERENCES items(id),
    member_only BOOLEAN NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    promo_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value REAL,
    applies_to TEXT NOT NULL DEFAULT 'item',
    max_discount_amount REAL,
    stack_rule TEXT NOT NULL DEFAULT 'best_only',
    priority INTEGER NOT NULL DEFAULT 0,
    member_tier TEXT
);

INSERT OR IGNORE INTO promos_new (
    id, name, description, discount_percent, min_qty, category_id, item_id,
    member_only, active, start_date, end_date, created_at, promo_type,
    discount_value, applies_to, max_discount_amount, stack_rule, priority, member_tier
)
SELECT
    id, name, description, discount_percent, min_qty, category_id, item_id,
    member_only, active, start_date, end_date, created_at, promo_type,
    discount_value, applies_to, max_discount_amount, stack_rule, priority, member_tier
FROM promos;

DROP TABLE promos;

ALTER TABLE promos_new RENAME TO promos;

CREATE INDEX IF NOT EXISTS idx_promos_category ON promos(category_id);
CREATE INDEX IF NOT EXISTS idx_promos_item ON promos(item_id);
CREATE INDEX IF NOT EXISTS idx_promos_dates ON promos(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promos_active ON promos(active);

PRAGMA foreign_keys=ON;
