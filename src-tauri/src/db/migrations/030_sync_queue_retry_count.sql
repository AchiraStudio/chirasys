-- 030_sync_queue_retry_count.sql
-- Add retry tracking to sync_queue to track and skip permanently failed items
ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
