-- Fix foreign key constraints to allow product deletion

-- 1. Make product_id nullable in client_order_item
ALTER TABLE client_order_item
ALTER COLUMN product_id DROP NOT NULL;

-- 2. Drop existing foreign key constraint and recreate with SET NULL
ALTER TABLE client_order_item
DROP CONSTRAINT IF EXISTS client_order_item_product_id_fkey;

ALTER TABLE client_order_item
ADD CONSTRAINT client_order_item_product_id_fkey
FOREIGN KEY (product_id) REFERENCES product_list(id) ON DELETE SET NULL;

-- 3. Make product_id nullable in customer_order_item
ALTER TABLE customer_order_item
ALTER COLUMN product_id DROP NOT NULL;

-- 4. Drop existing foreign key constraint and recreate with SET NULL for customer_order_item
ALTER TABLE customer_order_item
DROP CONSTRAINT IF EXISTS customer_order_item_product_id_fkey;

ALTER TABLE customer_order_item
ADD CONSTRAINT customer_order_item_product_id_fkey
FOREIGN KEY (product_id) REFERENCES product_list(product_id) ON DELETE SET NULL;
