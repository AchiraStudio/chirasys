-- 013_auth_and_roles.sql

-- Add session tracking and auth columns
ALTER TABLE users ADD COLUMN last_login TEXT;
ALTER TABLE users ADD COLUMN avatar_color TEXT DEFAULT '#3B82F6';
ALTER TABLE users ADD COLUMN supabase_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]';

-- Active local sessions
CREATE TABLE IF NOT EXISTS local_sessions (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL
);

-- Sync Queue (for the background worker to push to Supabase)
CREATE TABLE IF NOT EXISTS sync_queue (
    id          TEXT PRIMARY KEY,
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    operation   TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    payload     TEXT NOT NULL,
    branch_id   TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at   TEXT,
    error       TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(synced_at) WHERE synced_at IS NULL;

-- Ensure default admin has proper permissions
UPDATE users SET role = 'owner', permissions = '["all"]' WHERE id = 'user_001';
