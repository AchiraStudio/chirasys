-- 045_clean_sales_sync_queue.sql
-- Clean up stale created_by keys in sync_queue for sales table to match Supabase schema (user_id)

UPDATE sync_queue 
SET payload = replace(payload, '"created_by":', '"user_id":') 
WHERE table_name = 'sales' AND payload LIKE '%"created_by":%';
