-- Migration: Add valuation_type field to shuma table
-- Date: 2025-10-28
-- Description: Add valuation_type (סוג השומה) field to store the type of valuation

-- Add valuation_type column to shuma table
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS valuation_type VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN shuma.valuation_type IS 'סוג השומה - Type of valuation (e.g., שומת שווי מלאה, שומת מס רכישה, וכו)';

-- Create index for filtering by valuation type
CREATE INDEX IF NOT EXISTS idx_shuma_valuation_type ON shuma(valuation_type);

COMMIT;

