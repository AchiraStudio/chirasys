-- 027_deduplicate_masters.sql
-- Merges duplicate categories and brands that only differ by case (e.g. 'Vitamin' and 'VITAMIN')

-- ==========================================
-- CATEGORIES DEDUPLICATION
-- ==========================================

-- 1. Identify the 'winner' ID for each case-insensitive name (we pick the minimum ID)
CREATE TEMP TABLE category_winners AS 
SELECT UPPER(TRIM(name)) as uname, MIN(id) as winner_id 
FROM categories 
GROUP BY UPPER(TRIM(name));

-- 2. Map existing item categories to the winner ID
UPDATE items 
SET category_id = (
    SELECT w.winner_id 
    FROM categories c 
    JOIN category_winners w ON UPPER(TRIM(c.name)) = w.uname 
    WHERE c.id = items.category_id
)
WHERE category_id IS NOT NULL;

-- 3. Map parent categories to the winner ID
UPDATE categories 
SET parent_id = (
    SELECT w.winner_id 
    FROM categories c 
    JOIN category_winners w ON UPPER(TRIM(c.name)) = w.uname 
    WHERE c.id = categories.parent_id
)
WHERE parent_id IS NOT NULL;

-- 4. Delete the duplicate (loser) categories
DELETE FROM categories 
WHERE id NOT IN (SELECT winner_id FROM category_winners);

-- 5. Uppercase the remaining categories
UPDATE categories SET name = UPPER(TRIM(name));

DROP TABLE category_winners;


-- ==========================================
-- BRANDS DEDUPLICATION
-- ==========================================

CREATE TEMP TABLE brand_winners AS 
SELECT UPPER(TRIM(name)) as uname, MIN(id) as winner_id 
FROM brands 
GROUP BY UPPER(TRIM(name));

UPDATE items 
SET brand_id = (
    SELECT w.winner_id 
    FROM brands b 
    JOIN brand_winners w ON UPPER(TRIM(b.name)) = w.uname 
    WHERE b.id = items.brand_id
)
WHERE brand_id IS NOT NULL;

DELETE FROM brands 
WHERE id NOT IN (SELECT winner_id FROM brand_winners);

UPDATE brands SET name = UPPER(TRIM(name));

DROP TABLE brand_winners;
