CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    mode TEXT DEFAULT 'local',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    branch_id TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active BOOLEAN DEFAULT 1,
    FOREIGN KEY(branch_id) REFERENCES branches(id)
);

-- Insert a default admin account and branch
INSERT OR IGNORE INTO branches (id, name, mode) VALUES ('branch_001', 'ChiraSys Main HQ', 'local');
INSERT OR IGNORE INTO users (id, branch_id, name, username, password_hash, role) 
VALUES ('user_001', 'branch_001', 'System Admin', 'admin', 'hashed_password_placeholder', 'owner');