-- Migration: Add product_milkbase and product_sugarbase columns to client_order_item
-- These columns allow overriding the production values for individual order items

ALTER TABLE client_order_item ADD COLUMN IF NOT EXISTS product_milkbase numeric NULL;
ALTER TABLE client_order_item ADD COLUMN IF NOT EXISTS product_sugarbase numeric NULL;

-- Also add to customer_order_item for consistency
ALTER TABLE customer_order_item ADD COLUMN IF NOT EXISTS product_milkbase numeric NULL;
ALTER TABLE customer_order_item ADD COLUMN IF NOT EXISTS product_sugarbase numeric NULL;
