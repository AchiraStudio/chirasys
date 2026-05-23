-- 016_sync_triggers_fix.sql

DROP TRIGGER IF EXISTS trg_sales_insert;
DROP TRIGGER IF EXISTS trg_sales_update;
DROP TRIGGER IF EXISTS trg_stock_ledger_insert;

CREATE TRIGGER trg_sales_insert
AFTER INSERT ON sales
WHEN NEW.created_by != 'system_sync'
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'sales',
        NEW.id,
        'insert',
        json_object(
            'id', NEW.id,
            'branch_id', NEW.branch_id,
            'customer_id', NEW.customer_id,
            'transaction_no', NEW.transaction_no,
            'transaction_date', NEW.transaction_date,
            'payment_method', NEW.payment_method,
            'total_amount', NEW.total_amount,
            'discount_amount', NEW.discount_amount,
            'tax_amount', NEW.tax_amount,
            'net_amount', NEW.net_amount,
            'paid_amount', NEW.paid_amount,
            'change_amount', NEW.change_amount,
            'status', NEW.status,
            'notes', NEW.notes,
            'created_by', NEW.created_by,
            'created_at', NEW.created_at
        ),
        NEW.branch_id
    );
END;

CREATE TRIGGER trg_sales_update
AFTER UPDATE ON sales
WHEN NEW.created_by != 'system_sync'
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'sales',
        NEW.id,
        'update',
        json_object(
            'status', NEW.status,
            'payment_method', NEW.payment_method,
            'paid_amount', NEW.paid_amount,
            'change_amount', NEW.change_amount,
            'notes', NEW.notes
        ),
        NEW.branch_id
    );
END;

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
            'transaction_date', NEW.transaction_date,
            'source_type', NEW.source_type,
            'source_id', NEW.source_id,
            'qty_change', NEW.qty_change,
            'hpp_value', NEW.hpp_value,
            'notes', NEW.notes,
            'created_by', NEW.created_by,
            'created_at', NEW.created_at
        ),
        NEW.branch_id
    );
END;
