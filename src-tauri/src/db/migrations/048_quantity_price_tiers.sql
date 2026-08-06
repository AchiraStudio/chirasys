-- 048_quantity_price_tiers.sql
-- Quantity-tier volume pricing table & items table extension

CREATE TABLE IF NOT EXISTS item_price_tiers (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    unit_id TEXT,
    tier_level INTEGER NOT NULL,
    max_qty REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_price_tiers_item ON item_price_tiers(item_id);

-- Alter items table to include cost_price (Harga Pokok), rack_location (Rak), item_type (Tipe Item)
ALTER TABLE items ADD COLUMN cost_price REAL DEFAULT 0.0;
ALTER TABLE items ADD COLUMN rack_location TEXT;
ALTER TABLE items ADD COLUMN item_type TEXT;
