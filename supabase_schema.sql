-- Supabase Schema for Portal de Gastos da Câmara

-- 1. Create table for sync execution logs
CREATE TABLE sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  period_key TEXT NOT NULL,
  fetched_count INTEGER DEFAULT 0,
  upserted_count INTEGER DEFAULT 0,
  error_message TEXT
);

-- 2. Create table for expenses
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  expense_date DATE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category TEXT,
  supplier TEXT,
  org_unit TEXT,
  description TEXT,
  source_url TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX idx_expenses_year_month ON expenses(year, month);
CREATE INDEX idx_expenses_supplier ON expenses(supplier);
CREATE INDEX idx_expenses_category ON expenses(category);

-- 4. Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_expenses" ON expenses
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_read_sync_runs" ON sync_runs
  FOR SELECT TO anon
  USING (true);

-- Only authenticated users (or service role) can insert/update
-- If using Service Role Key in API, RLS is bypassed.

GRANT SELECT ON expenses TO anon;
GRANT ALL PRIVILEGES ON expenses TO authenticated;
GRANT SELECT ON sync_runs TO anon;
GRANT ALL PRIVILEGES ON sync_runs TO authenticated;
