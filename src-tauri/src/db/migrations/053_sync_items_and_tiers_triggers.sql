-- 053_sync_items_and_tiers_triggers.sql
-- Update items sync triggers to include cost_price, rack_location, item_type
-- Create sync triggers for item_price_tiers

DROP TRIGGER IF EXISTS trg_items_insert;
DROP TRIGGER IF EXISTS trg_items_update;
DROP TRIGGER IF EXISTS trg_items_delete;

CREATE TRIGGER trg_items_insert
AFTER INSERT ON items
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))), 
        'items', 
        NEW.id, 
        'insert', 
        json_object(
            'id', NEW.id, 
            'sku', NEW.sku, 
            'barcode', NEW.barcode, 
            'name', NEW.name, 
            'generic_name', NEW.generic_name, 
            'category_id', NEW.category_id, 
            'brand_id', NEW.brand_id, 
            'hpp_method', NEW.hpp_method, 
            'image_blob', NEW.image_blob, 
            'min_stock', NEW.min_stock, 
            'has_expiry', NEW.has_expiry, 
            'requires_prescription', NEW.requires_prescription, 
            'notes', NEW.notes, 
            'cost_price', NEW.cost_price, 
            'rack_location', NEW.rack_location, 
            'item_type', NEW.item_type, 
            'is_active', NEW.is_active, 
            'created_at', NEW.created_at, 
            'updated_at', NEW.updated_at, 
            'deleted_at', NEW.deleted_at, 
            'updated_by', NEW.updated_by
        ), 
        'global'
    );
END;

CREATE TRIGGER trg_items_update
AFTER UPDATE ON items
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))), 
        'items', 
        NEW.id, 
        'update', 
        json_object(
            'id', NEW.id, 
            'sku', NEW.sku, 
            'barcode', NEW.barcode, 
            'name', NEW.name, 
            'generic_name', NEW.generic_name, 
            'category_id', NEW.category_id, 
            'brand_id', NEW.brand_id, 
            'hpp_method', NEW.hpp_method, 
            'image_blob', NEW.image_blob, 
            'min_stock', NEW.min_stock, 
            'has_expiry', NEW.has_expiry, 
            'requires_prescription', NEW.requires_prescription, 
            'notes', NEW.notes, 
            'cost_price', NEW.cost_price, 
            'rack_location', NEW.rack_location, 
            'item_type', NEW.item_type, 
            'is_active', NEW.is_active, 
            'created_at', NEW.created_at, 
            'updated_at', NEW.updated_at, 
            'deleted_at', NEW.deleted_at, 
            'updated_by', NEW.updated_by
        ), 
        'global'
    );
END;

CREATE TRIGGER trg_items_delete
AFTER DELETE ON items
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))), 
        'items', 
        OLD.id, 
        'delete', 
        json_object('id', OLD.id, 'deleted_at', datetime('now')), 
        'global'
    );
END;

-- Sync triggers for item_price_tiers
DROP TRIGGER IF EXISTS trg_item_price_tiers_insert;
DROP TRIGGER IF EXISTS trg_item_price_tiers_update;
DROP TRIGGER IF EXISTS trg_item_price_tiers_delete;

CREATE TRIGGER trg_item_price_tiers_insert
AFTER INSERT ON item_price_tiers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))), 
        'item_price_tiers', 
        NEW.id, 
        'insert', 
        json_object(
            'id', NEW.id, 
            'item_id', NEW.item_id, 
            'unit_id', NEW.unit_id, 
            'tier_level', NEW.tier_level, 
            'max_qty', NEW.max_qty, 
            'price', NEW.price, 
            'created_at', NEW.created_at, 
            'updated_at', NEW.updated_at, 
            'deleted_at', NEW.deleted_at, 
            'updated_by', NEW.updated_by
        ), 
        'global'
    );
END;

CREATE TRIGGER trg_item_price_tiers_update
AFTER UPDATE ON item_price_tiers
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))), 
        'item_price_tiers', 
        NEW.id, 
        'update', 
        json_object(
            'id', NEW.id, 
            'item_id', NEW.item_id, 
            'unit_id', NEW.unit_id, 
            'tier_level', NEW.tier_level, 
            'max_qty', NEW.max_qty, 
            'price', NEW.price, 
            'created_at', NEW.created_at, 
            'updated_at', NEW.updated_at, 
            'deleted_at', NEW.deleted_at, 
            'updated_by', NEW.updated_by
        ), 
        'global'
    );
END;

CREATE TRIGGER trg_item_price_tiers_delete
AFTER DELETE ON item_price_tiers
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))), 
        'item_price_tiers', 
        OLD.id, 
        'delete', 
        json_object('id', OLD.id, 'deleted_at', datetime('now')), 
        'global'
    );
END;
