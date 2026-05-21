-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
    expected_date TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS po_lines (
    id TEXT PRIMARY KEY,
    po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    unit_id TEXT NOT NULL REFERENCES item_units(id),
    qty_ordered REAL NOT NULL,
    qty_received REAL NOT NULL DEFAULT 0, -- FIXED: Track partial receipts
    price_estimate REAL NOT NULL
);

-- PURCHASES (Goods Received)
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    po_id TEXT REFERENCES purchase_orders(id),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    invoice_no TEXT,
    invoice_date TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_lines (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    unit_id TEXT NOT NULL REFERENCES item_units(id),
    qty_received REAL NOT NULL,
    price_per_unit REAL NOT NULL,
    expiry_date TEXT,
    batch_no TEXT
);

-- PURCHASE PAYMENTS
CREATE TABLE IF NOT EXISTS purchase_payments (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'cheque')),
    reference TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PURCHASE RETURNS
CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES purchases(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    unit_id TEXT NOT NULL REFERENCES item_units(id),
    qty REAL NOT NULL,
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_po ON purchases(po_id);