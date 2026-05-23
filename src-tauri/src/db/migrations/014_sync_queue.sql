-- 014_sync_queue.sql

-- Sync Queue (for the background worker to push to Supabase)
-- Created here because migration 13 failed halfway previously
CREATE TABLE IF NOT EXISTS sync_queue (
    id          TEXT PRIMARY KEY,
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    operation   TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    payload     TEXT NOT NULL,
    branch_id   TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at   TEXT,
    error       TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(synced_at) WHERE synced_at IS NULL;
