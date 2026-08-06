-- 047_fix_null_is_active.sql
-- Fix items, units, customers, suppliers, accounts saved with NULL is_active/is_base from cloud sync boolean deserialization

UPDATE items SET is_active = 1 WHERE is_active IS NULL;
UPDATE item_units SET is_base = 1 WHERE is_base IS NULL AND (SELECT COUNT(*) FROM item_units u2 WHERE u2.item_id = item_units.item_id AND u2.is_base = 1) = 0;
UPDATE customers SET is_active = 1 WHERE is_active IS NULL;
UPDATE suppliers SET is_active = 1 WHERE is_active IS NULL;
UPDATE accounts SET is_active = 1 WHERE is_active IS NULL;
