-- 056_openai_settings.sql
-- Seed default global settings for OpenAI Integration

INSERT OR IGNORE INTO global_settings (key, value) VALUES ('openai_api_key', '');
INSERT OR IGNORE INTO global_settings (key, value) VALUES ('openai_model', 'gpt-4o-mini');
