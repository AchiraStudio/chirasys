-- CATEGORIES (self-referencing tree)
CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    parent_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT,          -- hex, for UI badge coloring
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- BRANDS
CREATE TABLE IF NOT EXISTS brands (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    logo_blob  BLOB,           -- optional brand logo
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ITEMS (medicines / products)
CREATE TABLE IF NOT EXISTS items (
    id              TEXT PRIMARY KEY,
    sku             TEXT NOT NULL UNIQUE,
    barcode         TEXT UNIQUE,
    name            TEXT NOT NULL,
    generic_name    TEXT,                          -- for pharma
    category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    brand_id        TEXT REFERENCES brands(id)     ON DELETE SET NULL,
    hpp_method      TEXT NOT NULL DEFAULT 'avg'    CHECK (hpp_method IN ('fifo','avg','lifo')),
    image_blob      BLOB,
    min_stock       REAL NOT NULL DEFAULT 0,
    has_expiry      INTEGER NOT NULL DEFAULT 0,    -- boolean
    requires_prescription INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ITEM UNITS (multi-conversion)
CREATE TABLE IF NOT EXISTS item_units (
    id              TEXT PRIMARY KEY,
    item_id         TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    unit_name       TEXT NOT NULL,     -- "Tablet", "Strip", "Box"
    conversion      REAL NOT NULL,     -- how many BASE units = 1 of this
    is_base         INTEGER NOT NULL DEFAULT 0,
    barcode         TEXT UNIQUE,       -- each unit can have its own barcode
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(item_id, unit_name)
);

-- ITEM PRICES (per unit, per customer tier)
CREATE TABLE IF NOT EXISTS item_prices (
    id              TEXT PRIMARY KEY,
    item_id         TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    unit_id         TEXT NOT NULL REFERENCES item_units(id) ON DELETE CASCADE,
    customer_tier   TEXT NOT NULL DEFAULT 'regular'
                    CHECK (customer_tier IN ('regular','member','vip')),
    price           REAL NOT NULL DEFAULT 0,
    UNIQUE(item_id, unit_id, customer_tier)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_items_category  ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_brand     ON items(brand_id);
CREATE INDEX IF NOT EXISTS idx_items_sku       ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode   ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_item_units_item ON item_units(item_id);
CREATE INDEX IF NOT EXISTS idx_item_prices_item ON item_prices(item_id);