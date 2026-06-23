-- 026_workspace.sql
-- Add workspace fields to track which cloud workspace this installation belongs to

ALTER TABLE global_settings ADD COLUMN description TEXT;

-- Store workspace config as global settings keys:
-- workspace_id   -> UUID of the workspace in Supabase
-- workspace_code -> Human-readable code (e.g. APOTEK-MAJU-01)
-- workspace_name -> Display name

INSERT OR IGNORE INTO global_settings (key, value, description)
VALUES
    ('workspace_id',   '', 'UUID of the cloud workspace this installation belongs to'),
    ('workspace_code', '', 'Human-readable workspace join code'),
    ('workspace_name', '', 'Display name of the workspace');

-- Add retry tracking to sync_queue so we can skip permanently failed items
ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_queue ADD COLUMN workspace_id TEXT;
