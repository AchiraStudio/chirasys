-- 055_sync_users_and_permissions.sql
-- Add sync tracking columns and triggers for users and role_default_permissions

ALTER TABLE users ADD COLUMN updated_at TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN updated_by TEXT DEFAULT 'user';

ALTER TABLE role_default_permissions ADD COLUMN updated_by TEXT DEFAULT 'user';

-- Triggers for users
DROP TRIGGER IF EXISTS trg_users_insert;
DROP TRIGGER IF EXISTS trg_users_update;
DROP TRIGGER IF EXISTS trg_users_delete;

CREATE TRIGGER trg_users_insert
AFTER INSERT ON users
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'users',
        NEW.id,
        'insert',
        json_object(
            'id', NEW.id,
            'branch_id', NEW.branch_id,
            'name', NEW.name,
            'username', NEW.username,
            'password_hash', NEW.password_hash,
            'role', NEW.role,
            'permissions', NEW.permissions,
            'active', NEW.active,
            'last_login', NEW.last_login,
            'avatar_color', NEW.avatar_color,
            'workspace_id', NEW.workspace_id,
            'created_at', COALESCE(NEW.created_at, datetime('now')),
            'updated_at', COALESCE(NEW.updated_at, datetime('now')),
            'deleted_at', NEW.deleted_at,
            'updated_by', NEW.updated_by
        ),
        'global'
    );
END;

CREATE TRIGGER trg_users_update
AFTER UPDATE ON users
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'users',
        NEW.id,
        'update',
        json_object(
            'id', NEW.id,
            'branch_id', NEW.branch_id,
            'name', NEW.name,
            'username', NEW.username,
            'password_hash', NEW.password_hash,
            'role', NEW.role,
            'permissions', NEW.permissions,
            'active', NEW.active,
            'last_login', NEW.last_login,
            'avatar_color', NEW.avatar_color,
            'workspace_id', NEW.workspace_id,
            'created_at', COALESCE(NEW.created_at, datetime('now')),
            'updated_at', COALESCE(NEW.updated_at, datetime('now')),
            'deleted_at', NEW.deleted_at,
            'updated_by', NEW.updated_by
        ),
        'global'
    );
END;

CREATE TRIGGER trg_users_delete
AFTER DELETE ON users
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'users',
        OLD.id,
        'delete',
        json_object(
            'id', OLD.id,
            'deleted_at', datetime('now')
        ),
        'global'
    );
END;

-- Triggers for role_default_permissions
DROP TRIGGER IF EXISTS trg_role_default_permissions_insert;
DROP TRIGGER IF EXISTS trg_role_default_permissions_update;

CREATE TRIGGER trg_role_default_permissions_insert
AFTER INSERT ON role_default_permissions
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'role_default_permissions',
        NEW.role,
        'insert',
        json_object(
            'role', NEW.role,
            'permissions', NEW.permissions,
            'updated_at', COALESCE(NEW.updated_at, datetime('now')),
            'updated_by', NEW.updated_by
        ),
        'global'
    );
END;

CREATE TRIGGER trg_role_default_permissions_update
AFTER UPDATE ON role_default_permissions
WHEN (NEW.updated_by != 'system_sync' OR NEW.updated_by IS NULL)
BEGIN
    INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
    VALUES (
        lower(hex(randomblob(16))),
        'role_default_permissions',
        NEW.role,
        'update',
        json_object(
            'role', NEW.role,
            'permissions', NEW.permissions,
            'updated_at', COALESCE(NEW.updated_at, datetime('now')),
            'updated_by', NEW.updated_by
        ),
        'global'
    );
END;

-- Enqueue existing users to sync_queue immediately so they sync on first connection
INSERT INTO sync_queue (id, table_name, record_id, operation, payload, branch_id)
SELECT 
    lower(hex(randomblob(16))),
    'users',
    u.id,
    'insert',
    json_object(
        'id', u.id,
        'branch_id', u.branch_id,
        'name', u.name,
        'username', u.username,
        'password_hash', u.password_hash,
        'role', u.role,
        'permissions', u.permissions,
        'active', u.active,
        'last_login', u.last_login,
        'avatar_color', u.avatar_color,
        'workspace_id', u.workspace_id,
        'created_at', COALESCE(u.created_at, datetime('now')),
        'updated_at', COALESCE(u.updated_at, datetime('now')),
        'deleted_at', u.deleted_at,
        'updated_by', 'init_sync'
    ),
    'global'
FROM users u
WHERE u.username != 'admin' OR u.password_hash != 'hashed_password_placeholder';
