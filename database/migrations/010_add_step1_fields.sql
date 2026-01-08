-- Migration: Add missing Step 1 fields to shuma table
-- Date: 2025-12-18
-- Description: Add valuation_effective_date (המועד הקובע), client_title (תואר), client_note (הערה), client_relation (קשר למזמין)

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

ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS land_contamination_note TEXT;

COMMENT ON COLUMN shuma.land_contamination IS 'האם יש זיהום קרקע';
COMMENT ON COLUMN shuma.land_contamination_note IS 'הערות על זיהום קרקע';

-- Ensure valuation_type column exists (from previous migration)
ALTER TABLE shuma 
ADD COLUMN IF NOT EXISTS valuation_type VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shuma_valuation_effective_date ON shuma(valuation_effective_date);
CREATE INDEX IF NOT EXISTS idx_shuma_valuation_type ON shuma(valuation_type);

