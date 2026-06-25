-- 031_sync_queue_workspace_id.sql
-- Add workspace_id column to sync_queue to track which workspace the sync entries belong to
ALTER TABLE sync_queue ADD COLUMN workspace_id TEXT;
