-- 058_staff_lan_permission.sql
-- Add settings.lan permission to admin and staff default permissions

UPDATE role_default_permissions 
SET permissions = '["sales.create","sales.delete","sales.return","sales.discount","sales.cash_drawer","items.view","items.create","items.edit","items.delete","items.change_price","inventory.view","inventory.adjust","inventory.opname","purchasing.view","purchasing.create","purchasing.receive","purchasing.payment","purchasing.return","crm.customers","crm.suppliers","promos.manage","reports.view","reports.export","accounting.manage","settings.general","settings.hardware","settings.users","settings.lan"]'
WHERE role = 'admin';

UPDATE role_default_permissions 
SET permissions = '["sales.create","sales.return","sales.cash_drawer","items.view","inventory.view","purchasing.view","crm.customers","settings.lan"]'
WHERE role = 'staff';
