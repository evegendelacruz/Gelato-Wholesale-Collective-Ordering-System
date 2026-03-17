-- Migration: Allow NULL values in product_id column of client_order_item table
-- This is needed to support manual/custom order items that don't reference a product from product_list

-- Drop the NOT NULL constraint on product_id column
ALTER TABLE client_order_item ALTER COLUMN product_id DROP NOT NULL;

-- Also check and fix customer_order_item if it has the same issue
ALTER TABLE customer_order_item ALTER COLUMN product_id DROP NOT NULL;
