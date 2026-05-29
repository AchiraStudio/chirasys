-- 023_fix_stock_ledger_trigger.sql
-- Fix: trigger was referencing NEW.transaction_date which doesn't exist on stock_ledger
-- The correct column is created_at

DROP TRIGGER IF EXISTS trg_stock_ledger_insert;

CREATE TRIGGER trg_stock_ledger_insert
AFTER INSERT ON stock_ledger
WHEN NEW.created_by != 'system_sync'
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'stock_ledger',
        NEW.id,
        'insert',
        json_object(
            'id', NEW.id,
            'item_id', NEW.item_id,
            'branch_id', NEW.branch_id,
            'source_type', NEW.source_type,
            'source_id', NEW.source_id,
            'qty_change', NEW.qty_change,
            'direction', NEW.direction,
            'hpp_value', NEW.hpp_value,
            'notes', NEW.notes,
            'created_by', NEW.created_by,
            'created_at', NEW.created_at
        ),
        NEW.branch_id
    );
END;
