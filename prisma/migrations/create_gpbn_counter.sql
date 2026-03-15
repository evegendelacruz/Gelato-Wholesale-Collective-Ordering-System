-- GPBN Counter Table (Prisma-compatible)
-- This table stores the last used GPBN number to ensure sequential numbering across all orders
-- Run this SQL in your Supabase SQL Editor

-- Create the counter table
CREATE TABLE IF NOT EXISTS gpbn_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_gpbn_number INTEGER NOT NULL DEFAULT 2999,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial row (starts at 2999 so first GPBN will be 3000)
INSERT INTO gpbn_counter (id, last_gpbn_number, updated_at)
VALUES (1, 2999, NOW())
ON CONFLICT (id) DO NOTHING;

-- Disable RLS for simplicity
ALTER TABLE gpbn_counter DISABLE ROW LEVEL SECURITY;

-- Grant access to all roles
GRANT ALL ON gpbn_counter TO anon;
GRANT ALL ON gpbn_counter TO authenticated;
GRANT ALL ON gpbn_counter TO service_role;
