-- 022_users_created_at.sql
-- Add created_at column to users table for proper user management display

ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
