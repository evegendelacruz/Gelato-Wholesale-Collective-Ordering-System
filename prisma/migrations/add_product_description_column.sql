-- Add product_description column to client_order_item for storing description
-- This will be shown in reports instead of product_name if provided
ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS product_description TEXT;
