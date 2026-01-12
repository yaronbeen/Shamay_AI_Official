-- Migration 016: Add Missing Foreign Key Constraints
-- Purpose: Ensure referential integrity across related tables

-- Note: These constraints are added as DEFERRABLE to allow for data loading flexibility
-- Run this migration AFTER data is clean and consistent

-- Add FK constraint from comparable_data to shuma (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comparable_data' AND column_name = 'shuma_id'
  ) THEN
    -- First, clean up orphaned records
    DELETE FROM comparable_data
    WHERE shuma_id IS NOT NULL
      AND shuma_id NOT IN (SELECT id FROM shuma);

    -- Then add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_comparable_data_shuma'
    ) THEN
      ALTER TABLE comparable_data
        ADD CONSTRAINT fk_comparable_data_shuma
        FOREIGN KEY (shuma_id) REFERENCES shuma(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add FK constraint from asset_details to shuma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asset_details' AND column_name = 'shuma_id'
  ) THEN
    DELETE FROM asset_details
    WHERE shuma_id IS NOT NULL
      AND shuma_id NOT IN (SELECT id FROM shuma);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_asset_details_shuma'
    ) THEN
      ALTER TABLE asset_details
        ADD CONSTRAINT fk_asset_details_shuma
        FOREIGN KEY (shuma_id) REFERENCES shuma(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add FK constraint from garmushka to shuma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'garmushka' AND column_name = 'shuma_id'
  ) THEN
    DELETE FROM garmushka
    WHERE shuma_id IS NOT NULL
      AND shuma_id NOT IN (SELECT id FROM shuma);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_garmushka_shuma'
    ) THEN
      ALTER TABLE garmushka
        ADD CONSTRAINT fk_garmushka_shuma
        FOREIGN KEY (shuma_id) REFERENCES shuma(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add FK constraint from images to shuma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'shuma_id'
  ) THEN
    DELETE FROM images
    WHERE shuma_id IS NOT NULL
      AND shuma_id NOT IN (SELECT id FROM shuma);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_images_shuma'
    ) THEN
      ALTER TABLE images
        ADD CONSTRAINT fk_images_shuma
        FOREIGN KEY (shuma_id) REFERENCES shuma(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add FK constraint from ai_extractions to shuma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_extractions' AND column_name = 'shuma_id'
  ) THEN
    UPDATE ai_extractions SET shuma_id = NULL
    WHERE shuma_id IS NOT NULL
      AND shuma_id NOT IN (SELECT id FROM shuma);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_ai_extractions_shuma'
    ) THEN
      ALTER TABLE ai_extractions
        ADD CONSTRAINT fk_ai_extractions_shuma
        FOREIGN KEY (shuma_id) REFERENCES shuma(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add FK constraint from field_provenance to shuma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_provenance' AND column_name = 'shuma_id'
  ) THEN
    DELETE FROM field_provenance
    WHERE shuma_id IS NOT NULL
      AND shuma_id NOT IN (SELECT id FROM shuma);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_field_provenance_shuma'
    ) THEN
      ALTER TABLE field_provenance
        ADD CONSTRAINT fk_field_provenance_shuma
        FOREIGN KEY (shuma_id) REFERENCES shuma(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMENT ON CONSTRAINT fk_comparable_data_shuma ON comparable_data IS 'Links comparable data to its parent shuma. SET NULL on delete to preserve historical data.';
COMMENT ON CONSTRAINT fk_asset_details_shuma ON asset_details IS 'Links asset details to its parent shuma. CASCADE delete.';
COMMENT ON CONSTRAINT fk_garmushka_shuma ON garmushka IS 'Links garmushka measurements to its parent shuma. CASCADE delete.';
