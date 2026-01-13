-- Migration: 002_add_missing_fields.sql
-- Description: Add missing fields that are used in frontend but not saved to database
-- Fields: appraiser_license_number, custom_tables, custom_document_edits
-- Date: 2025-01-13

-- Add appraiser license number field
ALTER TABLE shuma
ADD COLUMN IF NOT EXISTS appraiser_license_number VARCHAR(50);

-- Add custom tables (CSV uploads) - stored as JSONB array
ALTER TABLE shuma
ADD COLUMN IF NOT EXISTS custom_tables JSONB DEFAULT '[]'::jsonb;

-- Add custom document edits (user edits in document preview) - stored as JSONB object
ALTER TABLE shuma
ADD COLUMN IF NOT EXISTS custom_document_edits JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the fields
COMMENT ON COLUMN shuma.appraiser_license_number IS 'Appraiser license number (e.g., "115672")';
COMMENT ON COLUMN shuma.custom_tables IS 'Custom tables uploaded from CSV files';
COMMENT ON COLUMN shuma.custom_document_edits IS 'User edits made in the document preview editor';

-- Verify columns were added
DO $$
BEGIN
  RAISE NOTICE 'Migration 002_add_missing_fields completed successfully';
  RAISE NOTICE 'Added columns: appraiser_license_number, custom_tables, custom_document_edits';
END $$;
