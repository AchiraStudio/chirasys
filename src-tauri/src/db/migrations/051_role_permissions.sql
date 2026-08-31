-- 051_role_permissions.sql
-- Role and User Permission Management

CREATE TABLE IF NOT EXISTS role_default_permissions (
    role        TEXT PRIMARY KEY,
    permissions TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed defaults for each role
INSERT OR REPLACE INTO role_default_permissions (role, permissions) VALUES
('owner', '["*"]'),
('admin', '["sales.create","sales.delete","sales.return","sales.discount","sales.cash_drawer","items.view","items.create","items.edit","items.delete","items.change_price","inventory.view","inventory.adjust","inventory.opname","purchasing.view","purchasing.create","purchasing.receive","purchasing.payment","purchasing.return","crm.customers","crm.suppliers","promos.manage","reports.view","reports.export","accounting.manage","settings.general","settings.hardware","settings.users"]'),
('staff', '["sales.create","sales.return","sales.cash_drawer","items.view","inventory.view","purchasing.view","crm.customers"]');
