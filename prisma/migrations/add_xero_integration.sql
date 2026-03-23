-- ============================================================
-- Xero Integration Migration
-- Adds: missing fields for full Xero sync + audit trail
-- ============================================================

-- 1. Add missing fields to client_order
ALTER TABLE client_order
  ADD COLUMN IF NOT EXISTS invoice_due_date     TEXT,
  ADD COLUMN IF NOT EXISTS payment_status       TEXT DEFAULT 'Unpaid',
  ADD COLUMN IF NOT EXISTS payment_date         TEXT,
  ADD COLUMN IF NOT EXISTS gst_amount           DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS xero_invoice_id      TEXT,
  ADD COLUMN IF NOT EXISTS xero_synced_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_modified_by     TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_by_name TEXT;

-- 2. Add missing fields to client_user
ALTER TABLE client_user
  ADD COLUMN IF NOT EXISTS tax_id              TEXT,
  ADD COLUMN IF NOT EXISTS xero_contact_id     TEXT;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_order_xero_invoice ON client_order(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_user_xero_contact  ON client_user(xero_contact_id);
CREATE INDEX IF NOT EXISTS idx_client_order_payment_status ON client_order(payment_status);
