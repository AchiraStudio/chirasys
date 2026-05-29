-- 022_users_created_at.sql
-- Add created_at column to users table for proper user management display
-- SQLite does not allow ADD COLUMN with non-constant defaults (datetime('now') is not constant)
-- Use a static fallback date instead; new rows will get the real value from the INSERT statement

ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT '2024-01-01T00:00:00';
