-- 005_fix_source_type.sql
-- Rebuild stock_ledger with updated CHECK for source_type
-- SQLite doesn't support ALTER COLUMN, so we recreate
-- Note: No triggers exist on stock_ledger currently, so none are backed up or recreated.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS stock_ledger_new;

CREATE TABLE IF NOT EXISTS stock_ledger_new (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id),
    unit_id TEXT NOT NULL REFERENCES item_units(id),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    qty_change REAL NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('in','out')),
    source_type TEXT NOT NULL CHECK (
        source_type IN ('purchase','sale','adjustment','opname','initial',
                        'purchase_return','sale_return')
    ),
    source_id TEXT,
    hpp_value REAL,
    expiry_date TEXT,
    batch_no TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO stock_ledger_new SELECT * FROM stock_ledger;
DROP TABLE IF EXISTS stock_ledger;
ALTER TABLE stock_ledger_new RENAME TO stock_ledger;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_unit ON stock_ledger(unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_branch ON stock_ledger(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON stock_ledger(created_at);

PRAGMA foreign_keys = ON;
