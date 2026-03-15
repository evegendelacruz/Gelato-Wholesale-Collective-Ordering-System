-- Add sticker columns to product_list table
-- Run this SQL in your Supabase SQL Editor

-- Old sticker columns (if not already present)
ALTER TABLE product_list ADD COLUMN IF NOT EXISTS sticker_bbd_code TEXT;
ALTER TABLE product_list ADD COLUMN IF NOT EXISTS sticker_pbn_code TEXT;
ALTER TABLE product_list ADD COLUMN IF NOT EXISTS sticker_barcode TEXT;

-- New sticker columns
ALTER TABLE product_list ADD COLUMN IF NOT EXISTS barcode_13digit TEXT;
ALTER TABLE product_list ADD COLUMN IF NOT EXISTS sticker_gpbn_code TEXT;

-- Add comments for documentation
COMMENT ON COLUMN product_list.sticker_bbd_code IS 'BBD code for old sticker format (e.g., 30302026)';
COMMENT ON COLUMN product_list.sticker_pbn_code IS 'PBN code for old sticker format (e.g., PBN3000)';
COMMENT ON COLUMN product_list.sticker_barcode IS '30-digit barcode for old sticker format';
COMMENT ON COLUMN product_list.barcode_13digit IS '13-digit barcode starting with 3 for barcode sticker';
COMMENT ON COLUMN product_list.sticker_gpbn_code IS 'GPBN code (e.g., GPBN3000)';

-- ============================================================================
-- GPBN Tracker Table for Order Stickers
-- Tracks the last used GPBN code to ensure sequential numbering across orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_gpbn_tracker (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  last_gpbn_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_gpbn_tracker_created_at ON order_gpbn_tracker(created_at DESC);

COMMENT ON TABLE order_gpbn_tracker IS 'Tracks GPBN codes used for order stickers to ensure sequential numbering';
COMMENT ON COLUMN order_gpbn_tracker.order_id IS 'The order ID that used these GPBN codes';
COMMENT ON COLUMN order_gpbn_tracker.last_gpbn_code IS 'The last GPBN code used for this order (e.g., GPBN3005)';
