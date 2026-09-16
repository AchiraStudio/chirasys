-- ============================================================================
-- KIVO CLOUD: FULL SUPABASE BOOTSTRAP SCRIPT (v1.3)
-- ============================================================================
-- This script sets up a 100% complete, sync-ready PostgreSQL database on any
-- brand-new, empty Supabase project for Kivo Platform.
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query", paste this entire script, and click "Run".
-- 3. In Kivo app, enter your Supabase Project URL & Anon Key.
-- ============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. MULTI-TENANCY & AUTHENTICATION
-- ----------------------------------------------------------------------------

-- Workspaces: Top-level multi-tenant store separation
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace Invites: Pairing tokens for remote branches/cashiers
CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'staff',
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users: Synced operators & cashiers per workspace
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    branch_id TEXT,
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    permissions JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TEXT,
    avatar_color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user',
    CONSTRAINT users_workspace_username_unique UNIQUE (workspace_id, username)
);

-- Role Default Permissions Matrix
CREATE TABLE IF NOT EXISTS role_default_permissions (
    role TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT DEFAULT 'user',
    PRIMARY KEY (role, workspace_id)
);

-- ----------------------------------------------------------------------------
-- 2. CATALOG & MASTER DATA
-- ----------------------------------------------------------------------------

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Items (Products Master)
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    generic_name TEXT,
    category_id TEXT,
    brand_id TEXT,
    hpp_method TEXT DEFAULT 'avg',
    min_stock REAL DEFAULT 0,
    has_expiry INTEGER DEFAULT 0,
    requires_prescription INTEGER DEFAULT 0,
    notes TEXT,
    cost_price REAL DEFAULT 0,
    rack_location TEXT,
    item_type TEXT DEFAULT 'product',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Item Units (Multi-satuan: PCS, BOX, STRIP)
CREATE TABLE IF NOT EXISTS item_units (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_name TEXT NOT NULL,
    conversion_factor REAL NOT NULL DEFAULT 1,
    barcode TEXT,
    is_base_unit INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Item Prices (General, Member, VIP per Unit)
CREATE TABLE IF NOT EXISTS item_prices (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    price_tier TEXT NOT NULL DEFAULT 'general',
    price REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Item Price Tiers (Wholesale / Bulk quantity discounts)
CREATE TABLE IF NOT EXISTS item_price_tiers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    min_qty REAL NOT NULL,
    price REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 3. CUSTOMERS & SUPPLIERS
-- ----------------------------------------------------------------------------

-- Customers / Member Loyalty
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 4. SALES & CASHIER POS
-- ----------------------------------------------------------------------------

-- Sales Transaction Header
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    transaction_no TEXT NOT NULL,
    branch_id TEXT,
    customer_id TEXT,
    user_id TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    price_type TEXT NOT NULL DEFAULT 'retail',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Sale Lines (Child of sales)
CREATE TABLE IF NOT EXISTS sale_lines (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    qty REAL NOT NULL,
    price_type TEXT DEFAULT 'retail',
    price REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    hpp_value REAL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Sale Payments
CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'cash',
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Sale Returns
CREATE TABLE IF NOT EXISTS sale_returns (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    sale_id TEXT NOT NULL,
    branch_id TEXT,
    return_total REAL NOT NULL DEFAULT 0,
    refund_amount REAL NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Sale Return Lines
CREATE TABLE IF NOT EXISTS sale_return_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    return_id TEXT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_line_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty REAL NOT NULL,
    refund_amount REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 5. INVENTORY MUTATIONS & STOCK OPNAME
-- ----------------------------------------------------------------------------

-- Stock Ledger (FIFO/Average stock card)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    branch_id TEXT,
    qty_change REAL NOT NULL,
    direction TEXT NOT NULL,
    hpp_value REAL,
    expiry_date TEXT,
    batch_no TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Stock Opname Header (Physical audit)
CREATE TABLE IF NOT EXISTS stock_opnames (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    branch_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Stock Opname Lines
CREATE TABLE IF NOT EXISTS stock_opname_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    opname_id TEXT NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    expected_qty REAL NOT NULL,
    actual_qty REAL NOT NULL,
    diff_qty REAL NOT NULL,
    hpp_value REAL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 6. PURCHASING & SUPPLIER BILLS
-- ----------------------------------------------------------------------------

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    branch_id TEXT,
    supplier_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    expected_date TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchase Order Lines
CREATE TABLE IF NOT EXISTS po_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    qty_ordered REAL NOT NULL,
    qty_received REAL NOT NULL DEFAULT 0,
    price_estimate REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchases / Inward Goods Bills
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    po_id TEXT,
    branch_id TEXT,
    supplier_id TEXT NOT NULL,
    invoice_no TEXT,
    invoice_date TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchase Lines
CREATE TABLE IF NOT EXISTS purchase_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
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

-- Purchase Payments (Supplier debt settlement)
CREATE TABLE IF NOT EXISTS purchase_payments (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchase Returns
CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    purchase_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Purchase Return Lines
CREATE TABLE IF NOT EXISTS purchase_return_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    qty REAL NOT NULL,
    reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 7. PROMOTIONS & DISCOUNTS
-- ----------------------------------------------------------------------------

-- Promos
CREATE TABLE IF NOT EXISTS promos (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    discount_percent REAL NOT NULL DEFAULT 0,
    min_qty REAL NOT NULL DEFAULT 1,
    category_id TEXT,
    item_id TEXT,
    member_only BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TEXT,
    end_date TEXT,
    promo_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value REAL,
    applies_to TEXT NOT NULL DEFAULT 'item',
    max_discount_amount REAL,
    stack_rule TEXT NOT NULL DEFAULT 'best_only',
    priority INTEGER NOT NULL DEFAULT 0,
    member_tier TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Promo BOGO Rules (Buy X Get Y Free)
CREATE TABLE IF NOT EXISTS promo_bogo_rules (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
    buy_qty REAL NOT NULL,
    get_qty REAL NOT NULL,
    free_item_id TEXT,
    free_item_unit_id TEXT,
    free_item_discount_percent REAL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Promo Tiers
CREATE TABLE IF NOT EXISTS promo_tiers (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
    min_qty REAL NOT NULL,
    discount_percent REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Promo Bundle Items
CREATE TABLE IF NOT EXISTS promo_bundle_items (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 8. ACCOUNTING & GENERAL LEDGER
-- ----------------------------------------------------------------------------

-- Chart of Accounts (COA)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT,
    normal_balance TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    entry_no TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    source_type TEXT,
    branch_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- Journal Lines
CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'user'
);

-- ----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_items_workspace ON items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(workspace_id, sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(workspace_id, barcode);
CREATE INDEX IF NOT EXISTS idx_item_units_item ON item_units(item_id);
CREATE INDEX IF NOT EXISTS idx_item_prices_item ON item_prices(item_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_sales_workspace_date ON sales(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_no ON sales(workspace_id, transaction_no);
CREATE INDEX IF NOT EXISTS idx_sale_lines_sale ON sale_lines(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_workspace ON stock_ledger(workspace_id, item_id);
CREATE INDEX IF NOT EXISTS idx_customers_workspace ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_workspace ON suppliers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_purchases_workspace ON purchases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_purchase_lines_purchase ON purchase_lines(purchase_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
    all_synced_tables text[] := ARRAY[
        'workspaces', 'workspace_invites', 'users', 'role_default_permissions',
        'categories', 'brands', 'items', 'item_units', 'item_prices', 'item_price_tiers',
        'customers', 'suppliers',
        'sales', 'sale_lines', 'sale_payments', 'sale_returns', 'sale_return_lines',
        'stock_ledger', 'stock_opnames', 'stock_opname_lines',
        'purchase_orders', 'po_lines', 'purchases', 'purchase_lines', 'purchase_payments', 'purchase_returns', 'purchase_return_lines',
        'promos', 'promo_bogo_rules', 'promo_tiers', 'promo_bundle_items',
        'accounts', 'journal_entries', 'journal_lines'
    ];
BEGIN
    FOR t IN SELECT unnest(all_synced_tables)
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY';
        
        -- Allow authenticated and anon (using desktop API key) full access
        -- All multi-tenant isolation is enforced cleanly via workspace_id at the application layer
        EXECUTE 'DROP POLICY IF EXISTS "Kivo Full Access" ON ' || quote_ident(t);
        EXECUTE 'CREATE POLICY "Kivo Full Access" ON ' || quote_ident(t) || ' FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 11. SUPABASE REALTIME PUBLICATION SETUP
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
    realtime_tables text[] := ARRAY[
        'users', 'role_default_permissions',
        'categories', 'brands', 'items', 'item_units', 'item_prices', 'item_price_tiers',
        'customers', 'suppliers',
        'sales', 'sale_lines', 'sale_payments', 'sale_returns', 'sale_return_lines',
        'stock_ledger', 'stock_opnames', 'stock_opname_lines',
        'purchase_orders', 'po_lines', 'purchases', 'purchase_lines', 'purchase_payments', 'purchase_returns', 'purchase_return_lines',
        'promos', 'promo_bogo_rules', 'promo_tiers', 'promo_bundle_items',
        'accounts', 'journal_entries', 'journal_lines'
    ];
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOR t IN SELECT unnest(realtime_tables)
    LOOP
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || quote_ident(t);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL; -- Already in publication
        END;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 12. DEFAULT CHART OF ACCOUNTS (COA) SEED TEMPLATE
-- ----------------------------------------------------------------------------

INSERT INTO accounts (id, code, name, type, parent_id, normal_balance, is_system, is_active, created_at) VALUES
('acc_kas',    '1-1000', 'Kas Tunai',          'asset',     NULL, 'debit',  1, 1, NOW()),
('acc_bank',   '1-1100', 'Bank & Rekening',    'asset',     NULL, 'debit',  1, 1, NOW()),
('acc_inv',    '1-1200', 'Persediaan Barang',  'asset',     NULL, 'debit',  1, 1, NOW()),
('acc_ar',     '1-1300', 'Piutang Usaha',      'asset',     NULL, 'debit',  1, 1, NOW()),
('acc_ap',     '2-2000', 'Hutang Usaha',       'liability', NULL, 'credit', 1, 1, NOW()),
('acc_equity', '3-3000', 'Modal Usaha',        'equity',    NULL, 'credit', 1, 1, NOW()),
('acc_re',     '3-3100', 'Laba Ditahan',       'equity',    NULL, 'credit', 1, 1, NOW()),
('acc_sales',  '4-4000', 'Pendapatan Penjualan','income',   NULL, 'credit', 1, 1, NOW()),
('acc_cogs',   '5-5000', 'HPP / Beban Pokok',  'expense',   NULL, 'debit',  1, 1, NOW()),
('acc_disc',   '5-5100', 'Diskon Penjualan',   'expense',   NULL, 'debit',  1, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUCCESS: Kivo Cloud Supabase Database is ready!
-- ============================================================================

