-- Migration: Add all missing Step 1 fields to shuma table
-- Date: 2025-01-20
-- Description: Ensure all Step 1 fields exist in shuma table

-- valuation_type - סוג השומה
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS valuation_type VARCHAR(255);

COMMENT ON COLUMN shuma.valuation_type IS 'סוג השומה - Type of valuation (e.g., שומת מקרקעין, שומת מס רכישה)';

-- valuation_effective_date - המועד הקובע לשומה
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS valuation_effective_date DATE;

COMMENT ON COLUMN shuma.valuation_effective_date IS 'המועד הקובע לשומה - Effective valuation date';

-- client_title - תואר המזמין
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS client_title VARCHAR(255);

COMMENT ON COLUMN shuma.client_title IS 'תואר המזמין - Client title (e.g., עו"ד, רו"ח)';

-- client_note - הערה על המזמין
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS client_note TEXT;

COMMENT ON COLUMN shuma.client_note IS 'הערה על המזמין - Note about the client';

-- client_relation - קשר המזמין לנכס
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS client_relation VARCHAR(255);

COMMENT ON COLUMN shuma.client_relation IS 'קשר המזמין לנכס - Client relation to property (e.g., בעלים, קונה)';

-- land_contamination - זיהום קרקע
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS land_contamination BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN shuma.land_contamination IS 'האם יש זיהום קרקע - Is there land contamination';

-- land_contamination_note - הערות על זיהום קרקע
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS land_contamination_note TEXT;

COMMENT ON COLUMN shuma.land_contamination_note IS 'הערות על זיהום קרקע - Notes about land contamination';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shuma_valuation_type ON shuma(valuation_type);
CREATE INDEX IF NOT EXISTS idx_shuma_valuation_effective_date ON shuma(valuation_effective_date);
CREATE INDEX IF NOT EXISTS idx_shuma_client_title ON shuma(client_title);

-- Verify valuation_date exists (should already exist, but ensure it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shuma' AND column_name = 'valuation_date'
  ) THEN
    ALTER TABLE shuma ADD COLUMN valuation_date DATE;
    COMMENT ON COLUMN shuma.valuation_date IS 'מועד כתיבת השומה - Valuation report date';
  END IF;
END $$;

