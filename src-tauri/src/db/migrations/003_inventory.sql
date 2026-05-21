-- SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    contact_person  TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    payment_terms   TEXT,
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    region          TEXT,
    customer_tier   TEXT NOT NULL DEFAULT 'regular' CHECK (customer_tier IN ('regular','member','vip')),
    loyalty_points  INTEGER NOT NULL DEFAULT 0,
    credit_limit    REAL NOT NULL DEFAULT 0,
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- STOCK LEDGER
CREATE TABLE IF NOT EXISTS stock_ledger (
    id          TEXT PRIMARY KEY,
    item_id     TEXT NOT NULL REFERENCES items(id),
    unit_id     TEXT NOT NULL REFERENCES item_units(id),
    branch_id   TEXT NOT NULL REFERENCES branches(id),
    qty_change  REAL NOT NULL,
    direction   TEXT NOT NULL CHECK (direction IN ('in','out')),
    source_type TEXT NOT NULL CHECK (source_type IN ('purchase','sale','adjustment','opname','initial')),
    source_id   TEXT,
    hpp_value   REAL,
    expiry_date TEXT,
    batch_no    TEXT,
    notes       TEXT,
    created_by  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- STOCK OPNAME
CREATE TABLE IF NOT EXISTS stock_opname (
    id          TEXT PRIMARY KEY,
    branch_id   TEXT NOT NULL REFERENCES branches(id),
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','finalized')),
    notes       TEXT,
    created_by  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    finalized_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_opname_lines (
    id              TEXT PRIMARY KEY,
    opname_id       TEXT NOT NULL REFERENCES stock_opname(id) ON DELETE CASCADE,
    item_id         TEXT NOT NULL REFERENCES items(id),
    unit_id         TEXT NOT NULL REFERENCES item_units(id),
    system_qty      REAL NOT NULL,
    counted_qty     REAL NOT NULL,
    difference      REAL NOT NULL,
    notes           TEXT
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item   ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_unit   ON stock_ledger(unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_branch ON stock_ledger(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date   ON stock_ledger(created_at);