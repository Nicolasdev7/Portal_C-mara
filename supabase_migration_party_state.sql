-- ADD PARTY AND STATE COLUMNS
-- Run this SQL in your Supabase SQL Editor to add new columns to expenses table

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS party TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS state TEXT;

-- Create indexes for new columns to allow fast filtering
CREATE INDEX IF NOT EXISTS idx_expenses_party ON expenses(party);
CREATE INDEX IF NOT EXISTS idx_expenses_state ON expenses(state);

-- Fix for RLS if not already applied (ensure anon can read/write if using anon key logic, 
-- though we switched to service key for write, read must be public)
GRANT SELECT ON expenses TO anon;
GRANT SELECT ON sync_runs TO anon;
