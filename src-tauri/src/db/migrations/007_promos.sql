-- 007_promos.sql
-- Simplified Promo Engine for Phase 5 (Percentage discount on item/category with min qty)

CREATE TABLE IF NOT EXISTS promos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    discount_percent REAL NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
    min_qty REAL NOT NULL DEFAULT 1,
    
    -- Targets: either category or specific item
    category_id TEXT REFERENCES item_categories(id),
    item_id TEXT REFERENCES items(id),
    
    -- Requirements
    member_only BOOLEAN NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT 1,
    
    start_date TEXT, -- NULL means no start limit
    end_date TEXT,   -- NULL means no end limit
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    CHECK (category_id IS NOT NULL OR item_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_promos_category ON promos(category_id);
CREATE INDEX IF NOT EXISTS idx_promos_item ON promos(item_id);
