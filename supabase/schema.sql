-- Ginger Trading System - Complete Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Buyers table
CREATE TABLE IF NOT EXISTS buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  vehicle_number TEXT NOT NULL,
  grade_wise_bags JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Bag weights table
CREATE TABLE IF NOT EXISTS bag_weights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  bag_number INTEGER NOT NULL,
  weight NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vehicles_date ON vehicles(date);
CREATE INDEX IF NOT EXISTS idx_bag_weights_lookup ON bag_weights(buyer_id, grade, date, bag_number DESC);
CREATE INDEX IF NOT EXISTS idx_bag_weights_date ON bag_weights(date);
CREATE INDEX IF NOT EXISTS idx_grades_active ON grades(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_buyers_active ON buyers(is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_weights ENABLE ROW LEVEL SECURITY;

-- Grades: authenticated users can CRUD
CREATE POLICY "Authenticated users can select grades"
  ON grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grades"
  ON grades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grades"
  ON grades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete grades"
  ON grades FOR DELETE TO authenticated USING (true);

-- Buyers: authenticated users can CRUD
CREATE POLICY "Authenticated users can select buyers"
  ON buyers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert buyers"
  ON buyers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update buyers"
  ON buyers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete buyers"
  ON buyers FOR DELETE TO authenticated USING (true);

-- Vehicles: authenticated users can CRUD
CREATE POLICY "Authenticated users can select vehicles"
  ON vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vehicles"
  ON vehicles FOR DELETE TO authenticated USING (true);

-- Bag weights: authenticated users can CRUD
CREATE POLICY "Authenticated users can select bag_weights"
  ON bag_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bag_weights"
  ON bag_weights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bag_weights"
  ON bag_weights FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bag_weights"
  ON bag_weights FOR DELETE TO authenticated USING (true);

-- ============================================
-- RPC: Cleanup old records (>15 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date DATE := CURRENT_DATE - INTERVAL '15 days';
BEGIN
  DELETE FROM bag_weights WHERE date < cutoff_date;
  DELETE FROM vehicles WHERE date < cutoff_date;
END;
$$;
