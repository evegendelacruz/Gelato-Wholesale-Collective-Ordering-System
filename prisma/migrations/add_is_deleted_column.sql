-- Add is_deleted column to product_list for soft delete functionality
ALTER TABLE product_list
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_product_list_is_deleted ON product_list(is_deleted);
