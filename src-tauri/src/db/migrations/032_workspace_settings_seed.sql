-- 032_workspace_settings_seed.sql
-- Seed global settings with workspace parameters if they do not already exist
INSERT OR IGNORE INTO global_settings (key, value, description) VALUES
    ('workspace_id',   '', 'UUID of the cloud workspace this installation belongs to'),
    ('workspace_code', '', 'Human-readable workspace join code'),
    ('workspace_name', '', 'Display name of the workspace');
