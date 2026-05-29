-- 025_fix_sales_sync_trigger.sql
DROP TRIGGER IF EXISTS trg_sales_insert;
DROP TRIGGER IF EXISTS trg_sales_update;

CREATE TRIGGER trg_sales_insert
AFTER INSERT ON sales
WHEN (NEW.user_id != 'system_sync' OR NEW.user_id IS NULL)
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
            'transaction_date', NEW.created_at,
            'total_amount', NEW.total_amount,
            'discount_amount', NEW.discount_amount,
            'tax_amount', NEW.tax_amount,
            'net_amount', NEW.grand_total,
            'status', NEW.status,
            'price_type', NEW.price_type,
            'notes', NEW.notes,
            'created_by', NEW.user_id,
            'created_at', NEW.created_at
        ),
        NEW.branch_id
    );
END;

CREATE TRIGGER trg_sales_update
AFTER UPDATE ON sales
WHEN (NEW.user_id != 'system_sync' OR NEW.user_id IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'sales',
        NEW.id,
        'update',
        json_object(
            'status', NEW.status,
            'notes', NEW.notes
        ),
        NEW.branch_id
    );
END;
