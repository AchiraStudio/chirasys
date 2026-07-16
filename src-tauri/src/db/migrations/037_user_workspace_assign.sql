-- 037_user_workspace_assign.sql

-- Add workspace_id to users to map which workspace they are assigned to
ALTER TABLE users ADD COLUMN workspace_id TEXT;
