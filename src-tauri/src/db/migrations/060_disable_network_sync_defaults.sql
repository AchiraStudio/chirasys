-- 060_disable_network_sync_defaults.sql
-- Ensure auto_sync (Cloud) and lan_auto_connect (LAN) are disabled by default

INSERT OR IGNORE INTO global_settings (key, value, description) 
VALUES ('auto_sync', 'false', 'Otomatis sinkronisasi data ke Supabase Cloud');

INSERT OR IGNORE INTO global_settings (key, value, description) 
VALUES ('lan_auto_connect', 'false', 'Otomatis terhubung dan sinkronisasi ke Server Induk LAN');

-- Set existing records to 'false' so unwanted auto-push stops immediately
UPDATE global_settings SET value = 'false' WHERE key = 'auto_sync';
UPDATE global_settings SET value = 'false' WHERE key = 'lan_auto_connect';

