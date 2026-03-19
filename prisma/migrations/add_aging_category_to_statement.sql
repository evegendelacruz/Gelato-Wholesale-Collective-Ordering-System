-- Add aging_category column to client_statement table
ALTER TABLE client_statement
ADD COLUMN IF NOT EXISTS aging_category VARCHAR(50) DEFAULT '1-30_days';
