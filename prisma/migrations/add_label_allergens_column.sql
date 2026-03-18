-- Add label_ingredients column if it doesn't exist (for storing ingredients in order items)
ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS label_ingredients TEXT;

-- Add label_allergens column to client_order_item for storing allergen information
ALTER TABLE client_order_item
ADD COLUMN IF NOT EXISTS label_allergens TEXT;
