-- Migration: Add buyer_rates table for storing rate per buyer per grade per date
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS buyer_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  date DATE NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, grade, date)
);

CREATE INDEX IF NOT EXISTS idx_buyer_rates_lookup ON buyer_rates(buyer_id, date);

-- RLS
ALTER TABLE buyer_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select buyer_rates"
  ON buyer_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert buyer_rates"
  ON buyer_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update buyer_rates"
  ON buyer_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete buyer_rates"
  ON buyer_rates FOR DELETE TO authenticated USING (true);
