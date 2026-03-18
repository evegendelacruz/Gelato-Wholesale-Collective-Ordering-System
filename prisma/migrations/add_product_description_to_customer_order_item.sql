-- Add product_description column to customer_order_item table
-- This column stores the description/memo for online order items
-- Run this migration: psql -d your_database -f add_product_description_to_customer_order_item.sql

ALTER TABLE customer_order_item
ADD COLUMN IF NOT EXISTS product_description TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_order_item'
AND column_name = 'product_description';
