-- 059_disable_auto_connect.sql
-- Ensure new/unconfigured installs don't auto-connect to cloud or use dummy workspace credentials

UPDATE global_settings SET value = 'false' WHERE key = 'auto_sync';
UPDATE global_settings SET value = 'false' WHERE key = 'lan_auto_connect';
UPDATE global_settings SET value = '' WHERE key = 'workspace_id' AND NOT EXISTS (SELECT 1 FROM global_settings WHERE key = 'has_completed_setup' AND value = 'true');
UPDATE global_settings SET value = '' WHERE key = 'workspace_code' AND NOT EXISTS (SELECT 1 FROM global_settings WHERE key = 'has_completed_setup' AND value = 'true');
UPDATE global_settings SET value = '' WHERE key = 'workspace_name' AND NOT EXISTS (SELECT 1 FROM global_settings WHERE key = 'has_completed_setup' AND value = 'true');
