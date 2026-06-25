-- 033_payments_sync_trigger.sql
-- Add sync trigger for sale_payments table

CREATE TRIGGER IF NOT EXISTS trg_sale_payments_insert
AFTER INSERT ON sale_payments
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'sale_payments',
        NEW.id,
        'insert',
        json_object(
            'id', NEW.id,
            'sale_id', NEW.sale_id,
            'amount', NEW.amount,
            'method', NEW.method,
            'reference', NEW.reference,
            'created_at', NEW.created_at
        ),
        'global'
    );
END;
