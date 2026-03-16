-- Add product_type column to client_order_item table
ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_type VARCHAR(255);

-- Add gelato_type column if not exists
ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS gelato_type VARCHAR(255);

-- Update existing records with product_type from product_list
UPDATE client_order_item
SET product_type = product_list.product_type
FROM product_list
WHERE client_order_item.product_id = product_list.id
AND client_order_item.product_type IS NULL;

-- Update existing records with gelato_type from product_list
UPDATE client_order_item
SET gelato_type = product_list.product_gelato_type
FROM product_list
WHERE client_order_item.product_id = product_list.id
AND client_order_item.gelato_type IS NULL;
