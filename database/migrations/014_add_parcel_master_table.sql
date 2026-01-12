-- Migration 014: Add Parcel Master Table
-- Purpose: Normalize parcel data (gush/chelka/sub_chelka) into a master table
-- This eliminates duplicate parcel references across multiple tables

-- Create parcel master table
CREATE TABLE IF NOT EXISTS parcel_master (
  id SERIAL PRIMARY KEY,
  gush INTEGER NOT NULL,
  chelka INTEGER NOT NULL,
  sub_chelka INTEGER,

  -- Parcel metadata
  parcel_area DECIMAL(12,2),
  parcel_shape VARCHAR(255),
  parcel_surface VARCHAR(255),

  -- Registry information
  registry_office VARCHAR(255),
  municipality VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique combination
  UNIQUE(gush, chelka, sub_chelka)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_parcel_master_gush_chelka ON parcel_master(gush, chelka);
CREATE INDEX IF NOT EXISTS idx_parcel_master_municipality ON parcel_master(municipality);

-- Add parcel_master_id to shuma table (optional FK, not enforced for backward compat)
ALTER TABLE shuma ADD COLUMN IF NOT EXISTS parcel_master_id INTEGER;

-- Create index for FK relationship
CREATE INDEX IF NOT EXISTS idx_shuma_parcel_master ON shuma(parcel_master_id);

-- Migration script note:
-- To populate parcel_master from existing shuma data, run:
-- INSERT INTO parcel_master (gush, chelka, sub_chelka, parcel_area, parcel_shape)
-- SELECT DISTINCT
--   CAST(gush AS INTEGER),
--   CAST(COALESCE(parcel, chelka) AS INTEGER),
--   CAST(NULLIF(sub_parcel, '') AS INTEGER),
--   parcel_area,
--   parcel_shape
-- FROM shuma
-- WHERE gush IS NOT NULL AND gush != ''
-- ON CONFLICT (gush, chelka, sub_chelka) DO NOTHING;

COMMENT ON TABLE parcel_master IS 'Master table for parcel (gush/chelka) data. Normalizes parcel references across the system.';
COMMENT ON COLUMN parcel_master.gush IS 'Block number (גוש)';
COMMENT ON COLUMN parcel_master.chelka IS 'Parcel number (חלקה)';
COMMENT ON COLUMN parcel_master.sub_chelka IS 'Sub-parcel number (תת-חלקה), nullable';
