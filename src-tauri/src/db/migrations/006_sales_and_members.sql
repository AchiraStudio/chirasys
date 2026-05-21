-- 006_sales_and_members.sql

-- MEMBERS (Linked to customers but specific for POS loyalty)
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    join_date TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    points REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_members_customer ON members(customer_id);

-- TRANSACTION COUNTERS (To prevent race conditions on invoice generation)
CREATE TABLE IF NOT EXISTS transaction_counters (
    branch_id TEXT NOT NULL REFERENCES branches(id),
    date_str TEXT NOT NULL, -- e.g. YYYYMMDD
    counter INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (branch_id, date_str)
);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    transaction_no TEXT NOT NULL UNIQUE,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    customer_id TEXT REFERENCES customers(id), -- nullable for walk-in
    user_id TEXT REFERENCES users(id),
    total_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'partially_returned', 'returned')),
    price_type TEXT NOT NULL DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale')), -- specifies the base pricing used
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_branch_date ON sales(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

-- SALE LINES
CREATE TABLE IF NOT EXISTS sale_lines (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    unit_id TEXT NOT NULL REFERENCES item_units(id),
    qty REAL NOT NULL,
    price_type TEXT NOT NULL DEFAULT 'retail', -- in case of mixed baskets, though usually sales.price_type dictates
    price REAL NOT NULL, -- base price before discount
    discount_amount REAL NOT NULL DEFAULT 0, -- applied line discount (from promos or manual)
    subtotal REAL NOT NULL, -- (qty * price) - discount_amount
    hpp_value REAL NOT NULL DEFAULT 0, -- COGS at time of sale
    notes TEXT
);

-- SALE PAYMENTS
CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'qris', 'transfer')),
    reference TEXT, -- card approval code, etc
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SALE RETURNS
CREATE TABLE IF NOT EXISTS sale_returns (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    return_total REAL NOT NULL DEFAULT 0,
    refund_amount REAL NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_return_lines (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_line_id TEXT NOT NULL REFERENCES sale_lines(id),
    item_id TEXT NOT NULL REFERENCES items(id),
    qty REAL NOT NULL,
    refund_amount REAL NOT NULL DEFAULT 0
);

-- GLOBAL SETTINGS
CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
