-- Migration 052: Performance Indexes for Items, Categories, and Prices
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_brand_id ON items(brand_id);

CREATE INDEX IF NOT EXISTS idx_item_prices_item_tier ON item_prices(item_id, customer_tier);
CREATE INDEX IF NOT EXISTS idx_item_units_item_base ON item_units(item_id, is_base);
CREATE INDEX IF NOT EXISTS idx_item_price_tiers_item_order ON item_price_tiers(item_id, tier_level);
