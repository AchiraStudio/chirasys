-- 038_member_expiry_and_tier_discount.sql
ALTER TABLE customers ADD COLUMN membership_expiry TEXT;

-- Seed default tier settings
INSERT OR IGNORE INTO global_settings (key, value, description) VALUES ('tier_member_discount', '10', 'Member Discount Percentage');
INSERT OR IGNORE INTO global_settings (key, value, description) VALUES ('tier_vip_discount', '15', 'VIP Discount Percentage');
INSERT OR IGNORE INTO global_settings (key, value, description) VALUES ('tier_member_duration_months', '12', 'Member Duration in Months');
INSERT OR IGNORE INTO global_settings (key, value, description) VALUES ('tier_vip_duration_months', '12', 'VIP Duration in Months');
