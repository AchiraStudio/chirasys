-- 050_auto_sync_setting.sql
-- Seed default auto_sync setting if not exists

INSERT OR IGNORE INTO global_settings (key, value, description) VALUES
('auto_sync', 'true', 'Otomatis sinkronisasi data ke Supabase Cloud');
