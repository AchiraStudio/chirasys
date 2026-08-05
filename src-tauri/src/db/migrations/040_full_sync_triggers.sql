-- 040_full_sync_triggers.sql

DROP TRIGGER IF EXISTS trg_sales_insert;
DROP TRIGGER IF EXISTS trg_sales_update;
DROP TRIGGER IF EXISTS trg_stock_ledger_insert;
DROP TRIGGER IF EXISTS trg_categories_insert;
DROP TRIGGER IF EXISTS trg_categories_update;
DROP TRIGGER IF EXISTS trg_brands_insert;
DROP TRIGGER IF EXISTS trg_brands_update;
DROP TRIGGER IF EXISTS trg_items_insert;
DROP TRIGGER IF EXISTS trg_items_update;
DROP TRIGGER IF EXISTS trg_item_units_insert;
DROP TRIGGER IF EXISTS trg_item_units_update;
DROP TRIGGER IF EXISTS trg_item_prices_insert;
DROP TRIGGER IF EXISTS trg_item_prices_update;
DROP TRIGGER IF EXISTS trg_sale_payments_insert;

CREATE TRIGGER trg_customers_insert
AFTER INSERT ON customers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'customers', NEW.id, 'insert', json_object('id', NEW.id, 'name', NEW.name, 'phone', NEW.phone, 'email', NEW.email, 'address', NEW.address, 'region', NEW.region, 'customer_tier', NEW.customer_tier, 'loyalty_points', NEW.loyalty_points, 'credit_limit', NEW.credit_limit, 'notes', NEW.notes, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_customers_update
AFTER UPDATE ON customers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'customers', NEW.id, 'update', json_object('id', NEW.id, 'name', NEW.name, 'phone', NEW.phone, 'email', NEW.email, 'address', NEW.address, 'region', NEW.region, 'customer_tier', NEW.customer_tier, 'loyalty_points', NEW.loyalty_points, 'credit_limit', NEW.credit_limit, 'notes', NEW.notes, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_customers_delete
AFTER DELETE ON customers
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'customers', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_suppliers_insert
AFTER INSERT ON suppliers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'suppliers', NEW.id, 'insert', json_object('id', NEW.id, 'name', NEW.name, 'contact_person', NEW.contact_person, 'phone', NEW.phone, 'email', NEW.email, 'address', NEW.address, 'payment_terms', NEW.payment_terms, 'notes', NEW.notes, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_suppliers_update
AFTER UPDATE ON suppliers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'suppliers', NEW.id, 'update', json_object('id', NEW.id, 'name', NEW.name, 'contact_person', NEW.contact_person, 'phone', NEW.phone, 'email', NEW.email, 'address', NEW.address, 'payment_terms', NEW.payment_terms, 'notes', NEW.notes, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_suppliers_delete
AFTER DELETE ON suppliers
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'suppliers', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_purchase_orders_insert
AFTER INSERT ON purchase_orders
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_orders', NEW.id, 'insert', json_object('id', NEW.id, 'branch_id', NEW.branch_id, 'supplier_id', NEW.supplier_id, 'status', NEW.status, 'expected_date', NEW.expected_date, 'notes', NEW.notes, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_orders_update
AFTER UPDATE ON purchase_orders
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_orders', NEW.id, 'update', json_object('id', NEW.id, 'branch_id', NEW.branch_id, 'supplier_id', NEW.supplier_id, 'status', NEW.status, 'expected_date', NEW.expected_date, 'notes', NEW.notes, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_orders_delete
AFTER DELETE ON purchase_orders
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_orders', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_po_lines_insert
AFTER INSERT ON po_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'po_lines', NEW.id, 'insert', json_object('id', NEW.id, 'po_id', NEW.po_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty_ordered', NEW.qty_ordered, 'qty_received', NEW.qty_received, 'price_estimate', NEW.price_estimate, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_po_lines_update
AFTER UPDATE ON po_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'po_lines', NEW.id, 'update', json_object('id', NEW.id, 'po_id', NEW.po_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty_ordered', NEW.qty_ordered, 'qty_received', NEW.qty_received, 'price_estimate', NEW.price_estimate, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_po_lines_delete
AFTER DELETE ON po_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'po_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_purchases_insert
AFTER INSERT ON purchases
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchases', NEW.id, 'insert', json_object('id', NEW.id, 'po_id', NEW.po_id, 'branch_id', NEW.branch_id, 'supplier_id', NEW.supplier_id, 'invoice_no', NEW.invoice_no, 'invoice_date', NEW.invoice_date, 'total_amount', NEW.total_amount, 'status', NEW.status, 'notes', NEW.notes, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchases_update
AFTER UPDATE ON purchases
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchases', NEW.id, 'update', json_object('id', NEW.id, 'po_id', NEW.po_id, 'branch_id', NEW.branch_id, 'supplier_id', NEW.supplier_id, 'invoice_no', NEW.invoice_no, 'invoice_date', NEW.invoice_date, 'total_amount', NEW.total_amount, 'status', NEW.status, 'notes', NEW.notes, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchases_delete
AFTER DELETE ON purchases
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchases', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_purchase_lines_insert
AFTER INSERT ON purchase_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_lines', NEW.id, 'insert', json_object('id', NEW.id, 'purchase_id', NEW.purchase_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty_received', NEW.qty_received, 'price_per_unit', NEW.price_per_unit, 'expiry_date', NEW.expiry_date, 'batch_no', NEW.batch_no, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_lines_update
AFTER UPDATE ON purchase_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_lines', NEW.id, 'update', json_object('id', NEW.id, 'purchase_id', NEW.purchase_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty_received', NEW.qty_received, 'price_per_unit', NEW.price_per_unit, 'expiry_date', NEW.expiry_date, 'batch_no', NEW.batch_no, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_lines_delete
AFTER DELETE ON purchase_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_purchase_payments_insert
AFTER INSERT ON purchase_payments
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_payments', NEW.id, 'insert', json_object('id', NEW.id, 'purchase_id', NEW.purchase_id, 'amount', NEW.amount, 'method', NEW.method, 'reference', NEW.reference, 'notes', NEW.notes, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_payments_update
AFTER UPDATE ON purchase_payments
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_payments', NEW.id, 'update', json_object('id', NEW.id, 'purchase_id', NEW.purchase_id, 'amount', NEW.amount, 'method', NEW.method, 'reference', NEW.reference, 'notes', NEW.notes, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_payments_delete
AFTER DELETE ON purchase_payments
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_payments', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_purchase_returns_insert
AFTER INSERT ON purchase_returns
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_returns', NEW.id, 'insert', json_object('id', NEW.id, 'purchase_id', NEW.purchase_id, 'supplier_id', NEW.supplier_id, 'branch_id', NEW.branch_id, 'reason', NEW.reason, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_returns_update
AFTER UPDATE ON purchase_returns
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_returns', NEW.id, 'update', json_object('id', NEW.id, 'purchase_id', NEW.purchase_id, 'supplier_id', NEW.supplier_id, 'branch_id', NEW.branch_id, 'reason', NEW.reason, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_returns_delete
AFTER DELETE ON purchase_returns
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_returns', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_purchase_return_lines_insert
AFTER INSERT ON purchase_return_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_return_lines', NEW.id, 'insert', json_object('id', NEW.id, 'return_id', NEW.return_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty', NEW.qty, 'reason', NEW.reason, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_return_lines_update
AFTER UPDATE ON purchase_return_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_return_lines', NEW.id, 'update', json_object('id', NEW.id, 'return_id', NEW.return_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty', NEW.qty, 'reason', NEW.reason, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_purchase_return_lines_delete
AFTER DELETE ON purchase_return_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'purchase_return_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_promos_insert
AFTER INSERT ON promos
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promos', NEW.id, 'insert', json_object('id', NEW.id, 'name', NEW.name, 'description', NEW.description, 'discount_percent', NEW.discount_percent, 'min_qty', NEW.min_qty, 'category_id', NEW.category_id, 'item_id', NEW.item_id, 'member_only', NEW.member_only, 'active', NEW.active, 'start_date', NEW.start_date, 'end_date', NEW.end_date, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promos_update
AFTER UPDATE ON promos
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promos', NEW.id, 'update', json_object('id', NEW.id, 'name', NEW.name, 'description', NEW.description, 'discount_percent', NEW.discount_percent, 'min_qty', NEW.min_qty, 'category_id', NEW.category_id, 'item_id', NEW.item_id, 'member_only', NEW.member_only, 'active', NEW.active, 'start_date', NEW.start_date, 'end_date', NEW.end_date, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promos_delete
AFTER DELETE ON promos
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promos', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_promo_bogo_rules_insert
AFTER INSERT ON promo_bogo_rules
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_bogo_rules', NEW.id, 'insert', json_object('id', NEW.id, 'promo_id', NEW.promo_id, 'buy_qty', NEW.buy_qty, 'get_qty', NEW.get_qty, 'free_item_id', NEW.free_item_id, 'free_item_unit_id', NEW.free_item_unit_id, 'free_item_discount_percent', NEW.free_item_discount_percent, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promo_bogo_rules_update
AFTER UPDATE ON promo_bogo_rules
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_bogo_rules', NEW.id, 'update', json_object('id', NEW.id, 'promo_id', NEW.promo_id, 'buy_qty', NEW.buy_qty, 'get_qty', NEW.get_qty, 'free_item_id', NEW.free_item_id, 'free_item_unit_id', NEW.free_item_unit_id, 'free_item_discount_percent', NEW.free_item_discount_percent, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promo_bogo_rules_delete
AFTER DELETE ON promo_bogo_rules
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_bogo_rules', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_promo_tiers_insert
AFTER INSERT ON promo_tiers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_tiers', NEW.id, 'insert', json_object('id', NEW.id, 'promo_id', NEW.promo_id, 'min_qty', NEW.min_qty, 'discount_percent', NEW.discount_percent, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promo_tiers_update
AFTER UPDATE ON promo_tiers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_tiers', NEW.id, 'update', json_object('id', NEW.id, 'promo_id', NEW.promo_id, 'min_qty', NEW.min_qty, 'discount_percent', NEW.discount_percent, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promo_tiers_delete
AFTER DELETE ON promo_tiers
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_tiers', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_promo_bundle_items_insert
AFTER INSERT ON promo_bundle_items
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_bundle_items', NEW.id, 'insert', json_object('id', NEW.id, 'promo_id', NEW.promo_id, 'item_id', NEW.item_id, 'qty', NEW.qty, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promo_bundle_items_update
AFTER UPDATE ON promo_bundle_items
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_bundle_items', NEW.id, 'update', json_object('id', NEW.id, 'promo_id', NEW.promo_id, 'item_id', NEW.item_id, 'qty', NEW.qty, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_promo_bundle_items_delete
AFTER DELETE ON promo_bundle_items
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'promo_bundle_items', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_accounts_insert
AFTER INSERT ON accounts
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'accounts', NEW.id, 'insert', json_object('id', NEW.id, 'code', NEW.code, 'name', NEW.name, 'type', NEW.type, 'parent_id', NEW.parent_id, 'normal_balance', NEW.normal_balance, 'is_system', NEW.is_system, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_accounts_update
AFTER UPDATE ON accounts
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'accounts', NEW.id, 'update', json_object('id', NEW.id, 'code', NEW.code, 'name', NEW.name, 'type', NEW.type, 'parent_id', NEW.parent_id, 'normal_balance', NEW.normal_balance, 'is_system', NEW.is_system, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_accounts_delete
AFTER DELETE ON accounts
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'accounts', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_journal_entries_insert
AFTER INSERT ON journal_entries
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'journal_entries', NEW.id, 'insert', json_object('id', NEW.id, 'entry_no', NEW.entry_no, 'date', NEW.date, 'description', NEW.description, 'source_type', NEW.source_type, 'source_id', NEW.source_id, 'branch_id', NEW.branch_id, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_journal_entries_update
AFTER UPDATE ON journal_entries
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'journal_entries', NEW.id, 'update', json_object('id', NEW.id, 'entry_no', NEW.entry_no, 'date', NEW.date, 'description', NEW.description, 'source_type', NEW.source_type, 'source_id', NEW.source_id, 'branch_id', NEW.branch_id, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_journal_entries_delete
AFTER DELETE ON journal_entries
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'journal_entries', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_journal_lines_insert
AFTER INSERT ON journal_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'journal_lines', NEW.id, 'insert', json_object('id', NEW.id, 'journal_entry_id', NEW.journal_entry_id, 'account_id', NEW.account_id, 'debit', NEW.debit, 'credit', NEW.credit, 'notes', NEW.notes, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_journal_lines_update
AFTER UPDATE ON journal_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'journal_lines', NEW.id, 'update', json_object('id', NEW.id, 'journal_entry_id', NEW.journal_entry_id, 'account_id', NEW.account_id, 'debit', NEW.debit, 'credit', NEW.credit, 'notes', NEW.notes, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_journal_lines_delete
AFTER DELETE ON journal_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'journal_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_sales_insert
AFTER INSERT ON sales
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sales', NEW.id, 'insert', json_object('id', NEW.id, 'transaction_no', NEW.transaction_no, 'branch_id', NEW.branch_id, 'customer_id', NEW.customer_id, 'user_id', NEW.user_id, 'total_amount', NEW.total_amount, 'discount_amount', NEW.discount_amount, 'tax_amount', NEW.tax_amount, 'grand_total', NEW.grand_total, 'status', NEW.status, 'price_type', NEW.price_type, 'notes', NEW.notes, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sales_update
AFTER UPDATE ON sales
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sales', NEW.id, 'update', json_object('id', NEW.id, 'transaction_no', NEW.transaction_no, 'branch_id', NEW.branch_id, 'customer_id', NEW.customer_id, 'user_id', NEW.user_id, 'total_amount', NEW.total_amount, 'discount_amount', NEW.discount_amount, 'tax_amount', NEW.tax_amount, 'grand_total', NEW.grand_total, 'status', NEW.status, 'price_type', NEW.price_type, 'notes', NEW.notes, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sales_delete
AFTER DELETE ON sales
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sales', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_sale_lines_insert
AFTER INSERT ON sale_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_lines', NEW.id, 'insert', json_object('id', NEW.id, 'sale_id', NEW.sale_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty', NEW.qty, 'price_type', NEW.price_type, 'price', NEW.price, 'discount_amount', NEW.discount_amount, 'subtotal', NEW.subtotal, 'hpp_value', NEW.hpp_value, 'notes', NEW.notes, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_lines_update
AFTER UPDATE ON sale_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_lines', NEW.id, 'update', json_object('id', NEW.id, 'sale_id', NEW.sale_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'qty', NEW.qty, 'price_type', NEW.price_type, 'price', NEW.price, 'discount_amount', NEW.discount_amount, 'subtotal', NEW.subtotal, 'hpp_value', NEW.hpp_value, 'notes', NEW.notes, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_lines_delete
AFTER DELETE ON sale_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_sale_payments_insert
AFTER INSERT ON sale_payments
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_payments', NEW.id, 'insert', json_object('id', NEW.id, 'sale_id', NEW.sale_id, 'amount', NEW.amount, 'method', NEW.method, 'reference', NEW.reference, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_payments_update
AFTER UPDATE ON sale_payments
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_payments', NEW.id, 'update', json_object('id', NEW.id, 'sale_id', NEW.sale_id, 'amount', NEW.amount, 'method', NEW.method, 'reference', NEW.reference, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_payments_delete
AFTER DELETE ON sale_payments
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_payments', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_sale_returns_insert
AFTER INSERT ON sale_returns
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_returns', NEW.id, 'insert', json_object('id', NEW.id, 'sale_id', NEW.sale_id, 'branch_id', NEW.branch_id, 'return_total', NEW.return_total, 'refund_amount', NEW.refund_amount, 'reason', NEW.reason, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_returns_update
AFTER UPDATE ON sale_returns
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_returns', NEW.id, 'update', json_object('id', NEW.id, 'sale_id', NEW.sale_id, 'branch_id', NEW.branch_id, 'return_total', NEW.return_total, 'refund_amount', NEW.refund_amount, 'reason', NEW.reason, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_returns_delete
AFTER DELETE ON sale_returns
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_returns', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_sale_return_lines_insert
AFTER INSERT ON sale_return_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_return_lines', NEW.id, 'insert', json_object('id', NEW.id, 'return_id', NEW.return_id, 'sale_line_id', NEW.sale_line_id, 'item_id', NEW.item_id, 'qty', NEW.qty, 'refund_amount', NEW.refund_amount, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_return_lines_update
AFTER UPDATE ON sale_return_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_return_lines', NEW.id, 'update', json_object('id', NEW.id, 'return_id', NEW.return_id, 'sale_line_id', NEW.sale_line_id, 'item_id', NEW.item_id, 'qty', NEW.qty, 'refund_amount', NEW.refund_amount, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_sale_return_lines_delete
AFTER DELETE ON sale_return_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'sale_return_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_stock_opname_insert
AFTER INSERT ON stock_opname
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_opname', NEW.id, 'insert', json_object('id', NEW.id, 'branch_id', NEW.branch_id, 'status', NEW.status, 'notes', NEW.notes, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'finalized_at', NEW.finalized_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_stock_opname_update
AFTER UPDATE ON stock_opname
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_opname', NEW.id, 'update', json_object('id', NEW.id, 'branch_id', NEW.branch_id, 'status', NEW.status, 'notes', NEW.notes, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'finalized_at', NEW.finalized_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_stock_opname_delete
AFTER DELETE ON stock_opname
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_opname', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_stock_opname_lines_insert
AFTER INSERT ON stock_opname_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_opname_lines', NEW.id, 'insert', json_object('id', NEW.id, 'opname_id', NEW.opname_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'expected_qty', NEW.expected_qty, 'actual_qty', NEW.actual_qty, 'diff_qty', NEW.diff_qty, 'hpp_value', NEW.hpp_value, 'notes', NEW.notes, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_stock_opname_lines_update
AFTER UPDATE ON stock_opname_lines
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_opname_lines', NEW.id, 'update', json_object('id', NEW.id, 'opname_id', NEW.opname_id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'expected_qty', NEW.expected_qty, 'actual_qty', NEW.actual_qty, 'diff_qty', NEW.diff_qty, 'hpp_value', NEW.hpp_value, 'notes', NEW.notes, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_stock_opname_lines_delete
AFTER DELETE ON stock_opname_lines
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_opname_lines', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_stock_ledger_insert
AFTER INSERT ON stock_ledger
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_ledger', NEW.id, 'insert', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'branch_id', NEW.branch_id, 'qty_change', NEW.qty_change, 'direction', NEW.direction, 'source_type', NEW.source_type, 'source_id', NEW.source_id, 'hpp_value', NEW.hpp_value, 'expiry_date', NEW.expiry_date, 'batch_no', NEW.batch_no, 'notes', NEW.notes, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_stock_ledger_update
AFTER UPDATE ON stock_ledger
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_ledger', NEW.id, 'update', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'branch_id', NEW.branch_id, 'qty_change', NEW.qty_change, 'direction', NEW.direction, 'source_type', NEW.source_type, 'source_id', NEW.source_id, 'hpp_value', NEW.hpp_value, 'expiry_date', NEW.expiry_date, 'batch_no', NEW.batch_no, 'notes', NEW.notes, 'created_by', NEW.created_by, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_stock_ledger_delete
AFTER DELETE ON stock_ledger
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'stock_ledger', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_items_insert
AFTER INSERT ON items
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'insert', json_object('id', NEW.id, 'sku', NEW.sku, 'barcode', NEW.barcode, 'name', NEW.name, 'generic_name', NEW.generic_name, 'category_id', NEW.category_id, 'brand_id', NEW.brand_id, 'hpp_method', NEW.hpp_method, 'image_blob', NEW.image_blob, 'min_stock', NEW.min_stock, 'has_expiry', NEW.has_expiry, 'requires_prescription', NEW.requires_prescription, 'notes', NEW.notes, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_items_update
AFTER UPDATE ON items
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'update', json_object('id', NEW.id, 'sku', NEW.sku, 'barcode', NEW.barcode, 'name', NEW.name, 'generic_name', NEW.generic_name, 'category_id', NEW.category_id, 'brand_id', NEW.brand_id, 'hpp_method', NEW.hpp_method, 'image_blob', NEW.image_blob, 'min_stock', NEW.min_stock, 'has_expiry', NEW.has_expiry, 'requires_prescription', NEW.requires_prescription, 'notes', NEW.notes, 'is_active', NEW.is_active, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_items_delete
AFTER DELETE ON items
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'items', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_item_units_insert
AFTER INSERT ON item_units
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_units', NEW.id, 'insert', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_name', NEW.unit_name, 'conversion', NEW.conversion, 'is_base', NEW.is_base, 'barcode', NEW.barcode, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_item_units_update
AFTER UPDATE ON item_units
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_units', NEW.id, 'update', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_name', NEW.unit_name, 'conversion', NEW.conversion, 'is_base', NEW.is_base, 'barcode', NEW.barcode, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_item_units_delete
AFTER DELETE ON item_units
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_units', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_item_prices_insert
AFTER INSERT ON item_prices
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_prices', NEW.id, 'insert', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'customer_tier', NEW.customer_tier, 'price', NEW.price, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_item_prices_update
AFTER UPDATE ON item_prices
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_prices', NEW.id, 'update', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'customer_tier', NEW.customer_tier, 'price', NEW.price, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_item_prices_delete
AFTER DELETE ON item_prices
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_prices', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_categories_insert
AFTER INSERT ON categories
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'categories', NEW.id, 'insert', json_object('id', NEW.id, 'parent_id', NEW.parent_id, 'name', NEW.name, 'description', NEW.description, 'color', NEW.color, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_categories_update
AFTER UPDATE ON categories
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'categories', NEW.id, 'update', json_object('id', NEW.id, 'parent_id', NEW.parent_id, 'name', NEW.name, 'description', NEW.description, 'color', NEW.color, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_categories_delete
AFTER DELETE ON categories
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'categories', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

CREATE TRIGGER trg_brands_insert
AFTER INSERT ON brands
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'brands', NEW.id, 'insert', json_object('id', NEW.id, 'name', NEW.name, 'logo_blob', NEW.logo_blob, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_brands_update
AFTER UPDATE ON brands
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'brands', NEW.id, 'update', json_object('id', NEW.id, 'name', NEW.name, 'logo_blob', NEW.logo_blob, 'created_at', NEW.created_at, 'deleted_at', NEW.deleted_at, 'updated_at', NEW.updated_at, 'updated_by', NEW.updated_by), 'global');
END;

CREATE TRIGGER trg_brands_delete
AFTER DELETE ON brands
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'brands', OLD.id, 'delete', json_object('id', OLD.id, 'deleted_at', datetime('now')), 'global');
END;

