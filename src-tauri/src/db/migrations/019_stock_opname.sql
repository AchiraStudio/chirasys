-- 019_stock_opname.sql

CREATE TABLE IF NOT EXISTS stock_opnames (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    status TEXT NOT NULL CHECK (status IN ('draft', 'completed')),
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_opname_lines (
    id TEXT PRIMARY KEY,
    opname_id TEXT NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    unit_id TEXT NOT NULL REFERENCES item_units(id),
    expected_qty REAL NOT NULL,
    actual_qty REAL NOT NULL,
    diff_qty REAL NOT NULL,
    hpp_value REAL NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_opnames_branch ON stock_opnames(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_opnames_status ON stock_opnames(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_lines_opname ON stock_opname_lines(opname_id);
