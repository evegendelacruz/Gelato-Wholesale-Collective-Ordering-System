-- Add product_milkbase and product_sugarbase columns to customer_order_item table
-- This allows storing these values for manually inputted products
-- Run this migration: psql -d your_database -f add_milkbase_sugarbase_to_customer_order_item.sql

ALTER TABLE customer_order_item
ADD COLUMN IF NOT EXISTS product_milkbase FLOAT;

ALTER TABLE customer_order_item
ADD COLUMN IF NOT EXISTS product_sugarbase FLOAT;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_order_item'
AND column_name IN ('product_milkbase', 'product_sugarbase');
