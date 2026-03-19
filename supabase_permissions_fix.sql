-- FIX PERMISSIONS FOR SYNC
-- Run this SQL in your Supabase SQL Editor if you are using only the ANON KEY
-- This allows anonymous users (the API) to insert data into the tables

CREATE POLICY "anon_insert_sync_runs" ON sync_runs
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_sync_runs" ON sync_runs
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "anon_insert_expenses" ON expenses
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_expenses" ON expenses
  FOR UPDATE TO anon
  USING (true);
