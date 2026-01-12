-- Migration 015: Extract Valuation Images to Proper Table
-- Purpose: Normalize property_images and interior_images JSONB arrays
-- This improves query performance and enables proper image management

-- Create valuation_images table
CREATE TABLE IF NOT EXISTS valuation_images (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,

  -- Image classification
  image_type VARCHAR(50) NOT NULL, -- 'property' | 'interior' | 'gis' | 'garmushka'
  image_category VARCHAR(100), -- e.g., 'facade', 'entrance', 'living_room', etc.

  -- Image data
  url TEXT NOT NULL,
  filename VARCHAR(255),
  mime_type VARCHAR(100) DEFAULT 'image/jpeg',
  file_size INTEGER,

  -- Display order
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  caption TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique URL per session to avoid duplicates
  UNIQUE(session_id, url)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_valuation_images_shuma ON valuation_images(shuma_id);
CREATE INDEX IF NOT EXISTS idx_valuation_images_session ON valuation_images(session_id);
CREATE INDEX IF NOT EXISTS idx_valuation_images_type ON valuation_images(image_type);
CREATE INDEX IF NOT EXISTS idx_valuation_images_primary ON valuation_images(shuma_id, is_primary) WHERE is_primary = true;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_valuation_images_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_valuation_images_timestamp ON valuation_images;
CREATE TRIGGER trigger_valuation_images_timestamp
BEFORE UPDATE ON valuation_images
FOR EACH ROW EXECUTE FUNCTION update_valuation_images_timestamp();

-- Migration script to populate from existing JSONB data:
-- Run this after creating the table to migrate existing data

-- Migrate property_images
-- INSERT INTO valuation_images (shuma_id, session_id, image_type, url, display_order, is_primary)
-- SELECT
--   s.id as shuma_id,
--   s.session_id,
--   'property' as image_type,
--   img->>'url' as url,
--   (row_number() OVER (PARTITION BY s.id ORDER BY img->>'url'))::integer - 1 as display_order,
--   (row_number() OVER (PARTITION BY s.id ORDER BY img->>'url')) = 1 as is_primary
-- FROM shuma s,
--   jsonb_array_elements(
--     CASE
--       WHEN jsonb_typeof(s.property_images) = 'array' THEN s.property_images
--       ELSE '[]'::jsonb
--     END
--   ) as img
-- WHERE s.property_images IS NOT NULL
--   AND s.property_images != 'null'::jsonb
--   AND s.property_images != '[]'::jsonb
-- ON CONFLICT (session_id, url) DO NOTHING;

-- Migrate interior_images
-- INSERT INTO valuation_images (shuma_id, session_id, image_type, url, display_order)
-- SELECT
--   s.id as shuma_id,
--   s.session_id,
--   'interior' as image_type,
--   img->>'url' as url,
--   (row_number() OVER (PARTITION BY s.id ORDER BY img->>'url'))::integer - 1 as display_order
-- FROM shuma s,
--   jsonb_array_elements(
--     CASE
--       WHEN jsonb_typeof(s.interior_images) = 'array' THEN s.interior_images
--       ELSE '[]'::jsonb
--     END
--   ) as img
-- WHERE s.interior_images IS NOT NULL
--   AND s.interior_images != 'null'::jsonb
--   AND s.interior_images != '[]'::jsonb
-- ON CONFLICT (session_id, url) DO NOTHING;

COMMENT ON TABLE valuation_images IS 'Normalized storage for valuation images. Replaces JSONB property_images and interior_images arrays.';
COMMENT ON COLUMN valuation_images.image_type IS 'Type of image: property, interior, gis, garmushka';
COMMENT ON COLUMN valuation_images.is_primary IS 'True if this is the primary/cover image for this type';
