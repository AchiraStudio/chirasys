-- 057_disable_auto_sync.sql
-- Set auto_sync to false by default for manual sync only

INSERT INTO global_settings (key, value, description) VALUES
('auto_sync', 'false', 'Otomatis sinkronisasi data ke Supabase Cloud')
ON CONFLICT(key) DO UPDATE SET value = 'false';

