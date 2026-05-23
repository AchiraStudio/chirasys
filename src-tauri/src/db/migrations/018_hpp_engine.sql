-- Add qty_consumed to stock_ledger for FIFO/LIFO consumption tracking
ALTER TABLE stock_ledger ADD COLUMN qty_consumed REAL NOT NULL DEFAULT 0;

-- Ensure system_settings table exists (created in earlier migrations, just ensuring safe access)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default hpp_method if not exists
INSERT OR IGNORE INTO system_settings (key, value, description)
VALUES ('hpp_method', 'avg', 'Cost Valuation Method: avg, fifo, lifo');
