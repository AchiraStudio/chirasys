-- 054_lan_sync_config.sql
-- Seed default global settings for LAN Auto-Discovery & Sync

INSERT OR IGNORE INTO global_settings (key, value) VALUES ('lan_role', 'child');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('lan_device_name', 'Kasir Terminal');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('lan_auto_connect', 'true');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('lan_http_port', '3699');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('lan_udp_port', '3698');
