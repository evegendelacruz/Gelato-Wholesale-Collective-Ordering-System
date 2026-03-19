-- Add GST percentage column to client_order table
-- This stores the GST rate applied to each order (default 9%)
-- Historical orders will maintain their GST rate when the default changes

ALTER TABLE client_order ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 9.00;

-- Add GST percentage column to customer_order table
ALTER TABLE customer_order ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 9.00;

-- Create system_settings table to store default GST percentage and other settings
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default GST setting (9%)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('default_gst_percentage', '9.00', 'Default GST percentage for new orders')
ON CONFLICT (setting_key) DO NOTHING;
