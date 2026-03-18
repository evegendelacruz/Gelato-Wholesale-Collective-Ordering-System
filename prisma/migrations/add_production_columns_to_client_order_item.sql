-- Add production-related columns to client_order_item table
-- These columns store product details at the time of ordering,
-- so report calculations work correctly even for manually added products

ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_weight NUMERIC(10, 2) NULL;

ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_cost NUMERIC(10, 2) NULL;

ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_milkbase NUMERIC(5, 2) NULL DEFAULT 0;

ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_sugarbase NUMERIC(5, 2) NULL DEFAULT 0;
