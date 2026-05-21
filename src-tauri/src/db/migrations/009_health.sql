-- 009_health.sql
-- Optional Member Health Logs (Pom) for Phase 5 / Phase 6

CREATE TABLE IF NOT EXISTS member_health_logs (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    checkup_date TEXT NOT NULL DEFAULT (datetime('now')),
    blood_pressure TEXT, -- e.g., '120/80'
    blood_sugar REAL,
    cholesterol REAL,
    uric_acid REAL,
    weight REAL,
    height REAL,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_logs_member ON member_health_logs(member_id);
