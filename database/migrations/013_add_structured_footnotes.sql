-- Migration 013: Add structured_footnotes column to shuma table
-- Date: 2025-01-11
-- Description: Adds JSONB column to store footnotes data for document export

-- Add structured_footnotes column to shuma table
ALTER TABLE shuma
  ADD COLUMN IF NOT EXISTS structured_footnotes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN shuma.structured_footnotes IS 'הערות שוליים מובנות (Structured footnotes for document export)';

-- Add index for potential querying
CREATE INDEX IF NOT EXISTS idx_shuma_structured_footnotes ON shuma USING gin(structured_footnotes);

SELECT 'Migration 013 completed: Added structured_footnotes column to shuma table' AS migration_status;
