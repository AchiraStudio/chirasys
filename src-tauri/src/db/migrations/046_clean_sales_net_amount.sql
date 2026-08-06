-- 046_clean_sales_net_amount.sql
-- Clean up stale net_amount keys in sync_queue for sales table to prevent Supabase PGRST204 errors

UPDATE sync_queue 
SET payload = replace(payload, ',"net_amount":0', '')
WHERE table_name = 'sales' AND payload LIKE '%"net_amount":%';

UPDATE sync_queue 
SET payload = replace(payload, '"net_amount":0,', '')
WHERE table_name = 'sales' AND payload LIKE '%"net_amount":%';

UPDATE sync_queue 
SET payload = replace(payload, '"net_amount":0', '')
WHERE table_name = 'sales' AND payload LIKE '%"net_amount":%';
