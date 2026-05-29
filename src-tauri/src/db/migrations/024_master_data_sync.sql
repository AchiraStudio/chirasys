-- 024_master_data_sync.sql

-- First, add created_by column to master data tables to prevent infinite sync loops
ALTER TABLE categories ADD COLUMN created_by TEXT DEFAULT 'user';
ALTER TABLE brands ADD COLUMN created_by TEXT DEFAULT 'user';
ALTER TABLE items ADD COLUMN created_by TEXT DEFAULT 'user';
ALTER TABLE item_units ADD COLUMN created_by TEXT DEFAULT 'user';
ALTER TABLE item_prices ADD COLUMN created_by TEXT DEFAULT 'user';

-- CATEGORIES
CREATE TRIGGER trg_categories_insert
AFTER INSERT ON categories
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'categories', NEW.id, 'insert', json_object('id', NEW.id, 'parent_id', NEW.parent_id, 'name', NEW.name, 'description', NEW.description, 'color', NEW.color, 'created_at', NEW.created_at, 'created_by', NEW.created_by), 'global');
END;

CREATE TRIGGER trg_categories_update
AFTER UPDATE ON categories
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'categories', NEW.id, 'update', json_object('parent_id', NEW.parent_id, 'name', NEW.name, 'description', NEW.description, 'color', NEW.color, 'created_by', NEW.created_by), 'global');
END;

-- BRANDS
CREATE TRIGGER trg_brands_insert
AFTER INSERT ON brands
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'brands', NEW.id, 'insert', json_object('id', NEW.id, 'name', NEW.name, 'created_at', NEW.created_at, 'created_by', NEW.created_by), 'global');
END;

CREATE TRIGGER trg_brands_update
AFTER UPDATE ON brands
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'brands', NEW.id, 'update', json_object('name', NEW.name, 'created_by', NEW.created_by), 'global');
END;

-- ITEMS
CREATE TRIGGER trg_items_insert
AFTER INSERT ON items
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'insert', json_object('id', NEW.id, 'sku', NEW.sku, 'barcode', NEW.barcode, 'name', NEW.name, 'generic_name', NEW.generic_name, 'category_id', NEW.category_id, 'brand_id', NEW.brand_id, 'hpp_method', NEW.hpp_method, 'min_stock', NEW.min_stock, 'has_expiry', NEW.has_expiry, 'requires_prescription', NEW.requires_prescription, 'notes', NEW.notes, 'is_active', NEW.is_active, 'wholesale_price', NEW.wholesale_price, 'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'created_by', NEW.created_by), 'global');
END;

CREATE TRIGGER trg_items_update
AFTER UPDATE ON items
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'update', json_object('sku', NEW.sku, 'barcode', NEW.barcode, 'name', NEW.name, 'generic_name', NEW.generic_name, 'category_id', NEW.category_id, 'brand_id', NEW.brand_id, 'hpp_method', NEW.hpp_method, 'min_stock', NEW.min_stock, 'has_expiry', NEW.has_expiry, 'requires_prescription', NEW.requires_prescription, 'notes', NEW.notes, 'is_active', NEW.is_active, 'wholesale_price', NEW.wholesale_price, 'updated_at', NEW.updated_at, 'created_by', NEW.created_by), 'global');
END;

-- ITEM UNITS
CREATE TRIGGER trg_item_units_insert
AFTER INSERT ON item_units
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_units', NEW.id, 'insert', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_name', NEW.unit_name, 'conversion', NEW.conversion, 'is_base', NEW.is_base, 'barcode', NEW.barcode, 'created_at', NEW.created_at, 'created_by', NEW.created_by), 'global');
END;

CREATE TRIGGER trg_item_units_update
AFTER UPDATE ON item_units
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_units', NEW.id, 'update', json_object('item_id', NEW.item_id, 'unit_name', NEW.unit_name, 'conversion', NEW.conversion, 'is_base', NEW.is_base, 'barcode', NEW.barcode, 'created_by', NEW.created_by), 'global');
END;

-- ITEM PRICES
CREATE TRIGGER trg_item_prices_insert
AFTER INSERT ON item_prices
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_prices', NEW.id, 'insert', json_object('id', NEW.id, 'item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'customer_tier', NEW.customer_tier, 'price', NEW.price, 'created_by', NEW.created_by), 'global');
END;

CREATE TRIGGER trg_item_prices_update
AFTER UPDATE ON item_prices
WHEN (NEW.created_by != 'system_sync' OR NEW.created_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (lower(hex(randomblob(16))), 'item_prices', NEW.id, 'update', json_object('item_id', NEW.item_id, 'unit_id', NEW.unit_id, 'customer_tier', NEW.customer_tier, 'price', NEW.price, 'created_by', NEW.created_by), 'global');
END;
