-- Supabase full schema migration for sync

-- 1. Add deleted_at to all existing synced tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['sales', 'sale_lines', 'stock_ledger', 'categories', 'brands', 'items', 'item_units', 'item_prices', 'sale_payments'])
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
        EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()';
        -- Add updated_by to prevent ping-pong
        EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT ''user''';
    END LOOP;
END $$;

-- 2. Create missing tables
-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    region TEXT,
    customer_tier TEXT NOT NULL DEFAULT 'regular',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    credit_limit REAL NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    membership_expiry TEXT,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    branch_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    expected_date TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS po_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    po_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    qty_ordered REAL NOT NULL,
    qty_received REAL NOT NULL DEFAULT 0,
    price_estimate REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    po_id TEXT,
    branch_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    invoice_no TEXT,
    invoice_date TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS purchase_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    purchase_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    qty_received REAL NOT NULL,
    price_per_unit REAL NOT NULL,
    expiry_date TEXT,
    batch_no TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS purchase_payments (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    purchase_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    purchase_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    return_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    qty REAL NOT NULL,
    reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Promos
CREATE TABLE IF NOT EXISTS promos (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    discount_percent REAL NOT NULL,
    min_qty REAL NOT NULL DEFAULT 1,
    category_id TEXT,
    item_id TEXT,
    member_only BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT,
    promo_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value REAL,
    applies_to TEXT NOT NULL DEFAULT 'item',
    max_discount_amount REAL,
    stack_rule TEXT NOT NULL DEFAULT 'best_only',
    priority INTEGER NOT NULL DEFAULT 0,
    member_tier TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS promo_bogo_rules (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    promo_id TEXT NOT NULL,
    buy_qty REAL NOT NULL,
    get_qty REAL NOT NULL,
    free_item_id TEXT,
    free_item_unit_id TEXT,
    free_item_discount_percent REAL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS promo_tiers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    promo_id TEXT NOT NULL,
    min_qty REAL NOT NULL,
    discount_percent REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS promo_bundle_items (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    promo_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Accounting
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT,
    normal_balance TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    entry_no TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    source_type TEXT,
    source_id TEXT,
    branch_id TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    journal_entry_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Sales extensions
CREATE TABLE IF NOT EXISTS sale_returns (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    sale_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    return_total REAL NOT NULL DEFAULT 0,
    refund_amount REAL NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    created_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS sale_return_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    return_id TEXT NOT NULL,
    sale_line_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty REAL NOT NULL,
    refund_amount REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Stock Opname
CREATE TABLE IF NOT EXISTS stock_opname (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    branch_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    finalized_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS stock_opname_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL,
    opname_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    system_qty REAL NOT NULL,
    counted_qty REAL NOT NULL,
    difference REAL NOT NULL,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Set up RLS for all newly created tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'customers', 'suppliers', 
            'purchase_orders', 'po_lines', 'purchases', 'purchase_lines', 'purchase_payments', 'purchase_returns', 'purchase_return_lines',
            'promos', 'promo_bogo_rules', 'promo_tiers', 'promo_bundle_items',
            'accounts', 'journal_entries', 'journal_lines',
            'sale_returns', 'sale_return_lines',
            'stock_opname', 'stock_opname_lines'
        ])
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY';
        
        -- Create policy for authenticated users (very open, since filtering is by workspace)
        -- We will just use a generic policy that allows all for authenticated users since workspace_id is set/checked by the app
        EXECUTE 'DROP POLICY IF EXISTS "Enable all operations" ON ' || quote_ident(t);
        EXECUTE 'CREATE POLICY "Enable all operations" ON ' || quote_ident(t) || ' FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END LOOP;
END $$;
