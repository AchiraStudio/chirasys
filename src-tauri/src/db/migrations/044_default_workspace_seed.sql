-- 044_default_workspace_seed.sql
-- Seed default workspace parameters so app connects online by default

INSERT INTO global_settings (key, value, description) VALUES
    ('workspace_id',   'cc96fd13-2061-45f3-9c21-27506f70cdf0', 'UUID of the cloud workspace this installation belongs to'),
    ('workspace_code', 'STORE-01', 'Human-readable workspace join code'),
    ('workspace_name', 'Apotek Main', 'Display name of the workspace')
ON CONFLICT(key) DO UPDATE SET value = excluded.value WHERE global_settings.value = '';
