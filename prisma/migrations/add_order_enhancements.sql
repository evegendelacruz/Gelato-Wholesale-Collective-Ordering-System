-- Add published_to_client column to client_order table
ALTER TABLE client_order
ADD COLUMN IF NOT EXISTS published_to_client BOOLEAN DEFAULT true;

-- Make product_id nullable in client_order_item to allow manual items
ALTER TABLE client_order_item
ALTER COLUMN product_id DROP NOT NULL;

-- Add new columns to client_order_item for enhanced order items
ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS gelato_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS product_weight FLOAT,
ADD COLUMN IF NOT EXISTS calculated_weight FLOAT,
ADD COLUMN IF NOT EXISTS product_cost FLOAT,
ADD COLUMN IF NOT EXISTS product_milkbase FLOAT,
ADD COLUMN IF NOT EXISTS product_sugarbase FLOAT,
ADD COLUMN IF NOT EXISTS product_ingredient TEXT,
ADD COLUMN IF NOT EXISTS product_notes TEXT;

-- Drop the foreign key constraint temporarily and recreate it to allow NULL values
ALTER TABLE client_order_item
DROP CONSTRAINT IF EXISTS client_order_item_product_id_fkey;

ALTER TABLE client_order_item
ADD CONSTRAINT client_order_item_product_id_fkey
FOREIGN KEY (product_id) REFERENCES product_list(id) ON DELETE RESTRICT;
