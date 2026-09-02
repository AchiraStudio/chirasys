-- 057_deduplicate_categories_and_brands.sql
-- Merges duplicate categories and brands that exist due to multiple Excel imports

-- ==========================================
-- CATEGORIES DEDUPLICATION
-- ==========================================

CREATE TEMP TABLE IF NOT EXISTS temp_cat_winners AS 
SELECT UPPER(TRIM(name)) as uname, MIN(id) as winner_id 
FROM categories 
WHERE name IS NOT NULL AND TRIM(name) != ''
GROUP BY UPPER(TRIM(name));

UPDATE items 
SET category_id = (
    SELECT w.winner_id 
    FROM categories c 
    JOIN temp_cat_winners w ON UPPER(TRIM(c.name)) = w.uname 
    WHERE c.id = items.category_id
)
WHERE category_id IS NOT NULL 
  AND category_id NOT IN (SELECT winner_id FROM temp_cat_winners);

UPDATE categories 
SET parent_id = (
    SELECT w.winner_id 
    FROM categories c 
    JOIN temp_cat_winners w ON UPPER(TRIM(c.name)) = w.uname 
    WHERE c.id = categories.parent_id
)
WHERE parent_id IS NOT NULL 
  AND parent_id NOT IN (SELECT winner_id FROM temp_cat_winners);

DELETE FROM categories 
WHERE id NOT IN (SELECT winner_id FROM temp_cat_winners);

UPDATE categories SET name = UPPER(TRIM(name));

DROP TABLE IF EXISTS temp_cat_winners;

-- ==========================================
-- BRANDS DEDUPLICATION
-- ==========================================

CREATE TEMP TABLE IF NOT EXISTS temp_brand_winners AS 
SELECT UPPER(TRIM(name)) as uname, MIN(id) as winner_id 
FROM brands 
WHERE name IS NOT NULL AND TRIM(name) != ''
GROUP BY UPPER(TRIM(name));

UPDATE items 
SET brand_id = (
    SELECT w.winner_id 
    FROM brands b 
    JOIN temp_brand_winners w ON UPPER(TRIM(b.name)) = w.uname 
    WHERE b.id = items.brand_id
)
WHERE brand_id IS NOT NULL 
  AND brand_id NOT IN (SELECT winner_id FROM temp_brand_winners);

DELETE FROM brands 
WHERE id NOT IN (SELECT winner_id FROM temp_brand_winners);

UPDATE brands SET name = UPPER(TRIM(name));

DROP TABLE IF EXISTS temp_brand_winners;

