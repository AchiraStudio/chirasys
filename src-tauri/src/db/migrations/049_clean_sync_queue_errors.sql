-- 049_clean_sync_queue_errors.sql
-- Reset failed sync queue retries after fixing updated_at and image_blob payload sanitization

UPDATE sync_queue SET retry_count = 0, error = NULL WHERE synced_at IS NULL AND error IS NOT NULL;
