-- Migration 009: Add Missing Fields to land_registry_extracts_comprehensive Table
-- Date: 2025-01-XX
-- Description: Adds missing fields that are extracted by AI but not yet in database schema
-- Fields added:
--   - total_number_of_entries (INTEGER) - כמה אגפים / כניסות
--   - attachments_shared_with (TEXT) - הצמדות - משותפת לחלקות
--   - sub_chelka_notes_action_type (VARCHAR(200)) - הערות לתת חלקה - מהות פעולה
--   - sub_chelka_notes_beneficiary (VARCHAR(200)) - הערות לתת חלקה - שם המוטב
--   - sub_parcel_easements_essence (TEXT) - זיקות הנאה לתת החלקה - מהות
--   - sub_parcel_easements_description (TEXT) - זיקות הנאה לתת החלקה - תיאור
--   - mortgage_registration_date (DATE) - משכנתאות - תאריך רישום

-- Add missing fields to land_registry_extracts_comprehensive table
ALTER TABLE land_registry_extracts_comprehensive
  ADD COLUMN IF NOT EXISTS total_number_of_entries INTEGER,
  ADD COLUMN IF NOT EXISTS attachments_shared_with TEXT,
  ADD COLUMN IF NOT EXISTS sub_chelka_notes_action_type VARCHAR(200),
  ADD COLUMN IF NOT EXISTS sub_chelka_notes_beneficiary VARCHAR(200),
  ADD COLUMN IF NOT EXISTS sub_parcel_easements_essence TEXT,
  ADD COLUMN IF NOT EXISTS sub_parcel_easements_description TEXT,
  ADD COLUMN IF NOT EXISTS mortgage_registration_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN land_registry_extracts_comprehensive.total_number_of_entries IS 'כמה אגפים / כניסות (Total number of entries/units)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.attachments_shared_with IS 'הצמדות - משותפת לחלקות (Attachments shared with other parcels)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.sub_chelka_notes_action_type IS 'הערות לתת חלקה - מהות פעולה (Sub-plot notes - action type)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.sub_chelka_notes_beneficiary IS 'הערות לתת חלקה - שם המוטב (Sub-plot notes - beneficiary)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.sub_parcel_easements_essence IS 'זיקות הנאה לתת החלקה - מהות (Sub-parcel easements - essence)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.sub_parcel_easements_description IS 'זיקות הנאה לתת החלקה - תיאור (Sub-parcel easements - description)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.mortgage_registration_date IS 'משכנתאות - תאריך רישום (Mortgage registration date)';

-- Migration completed successfully
SELECT 'Migration 009 completed: Added 7 missing fields to land_registry_extracts_comprehensive table' AS migration_status;

