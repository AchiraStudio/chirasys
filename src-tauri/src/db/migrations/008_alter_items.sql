-- 008_alter_items.sql
-- Add wholesale_price to items table for tiered pricing

-- SQLite ALTER TABLE ADD COLUMN is supported, but cannot have a default constraint 
-- that evaluates dynamically. Since items already exist, we add the column with DEFAULT 0.

ALTER TABLE items ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0;
