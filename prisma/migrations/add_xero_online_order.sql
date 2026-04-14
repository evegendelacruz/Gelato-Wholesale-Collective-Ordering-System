-- ============================================================
-- Xero Integration for Online Orders (customer_order)
-- Adds xero sync tracking fields to customer_order table
-- ============================================================

ALTER TABLE customer_order
  ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS xero_synced_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customer_order_xero_invoice ON customer_order(xero_invoice_id);
