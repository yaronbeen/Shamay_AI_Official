-- Migration 012: Add All Missing Step3 UI Fields to Database
-- Date: 2025-01-XX
-- Description: Adds all fields that exist in Step3 UI but are missing from database schema
-- This ensures every Step3 field can be persisted to the database

-- =====================================================
-- SECTION 1: Tabu Fields - DB Only (Prompt already exists)
-- =====================================================

ALTER TABLE land_registry_extracts_comprehensive
  ADD COLUMN IF NOT EXISTS built_area DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS shared_areas TEXT,
  ADD COLUMN IF NOT EXISTS sub_chelka_notes TEXT,
  ADD COLUMN IF NOT EXISTS construction_year INTEGER,
  ADD COLUMN IF NOT EXISTS property_condition VARCHAR(100),
  ADD COLUMN IF NOT EXISTS finish_standard VARCHAR(100);

COMMENT ON COLUMN land_registry_extracts_comprehensive.built_area IS 'שטח בנוי במ"ר (Built area in sqm)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.shared_areas IS 'שטחים משותפים (Shared areas description)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.sub_chelka_notes IS 'הערות לתת חלקה (Sub-plot notes)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.construction_year IS 'שנת בנייה (Construction year)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.property_condition IS 'מצב הנכס (Property condition)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.finish_standard IS 'רמת גימור (Finish standard/level)';

-- =====================================================
-- SECTION 2: Tabu Fields - DB + Prompt (need to add both)
-- =====================================================

ALTER TABLE land_registry_extracts_comprehensive
  ADD COLUMN IF NOT EXISTS building_units INTEGER,
  ADD COLUMN IF NOT EXISTS bylaws TEXT,
  ADD COLUMN IF NOT EXISTS general_notes TEXT,
  ADD COLUMN IF NOT EXISTS building_description TEXT,
  ADD COLUMN IF NOT EXISTS finish_details TEXT,
  ADD COLUMN IF NOT EXISTS air_directions VARCHAR(50),
  ADD COLUMN IF NOT EXISTS property_essence VARCHAR(100);

COMMENT ON COLUMN land_registry_extracts_comprehensive.building_units IS 'מספר יחידות בבניין (Number of units in building)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.bylaws IS 'תקנון (Bylaws/regulations text)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.general_notes IS 'הערות כלליות (General notes)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.building_description IS 'תיאור הבניין (Building description)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.finish_details IS 'פרטי גימור (Finish details)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.air_directions IS 'כיווני אוויר (Air directions - N/S/E/W)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.property_essence IS 'מהות הנכס (Property essence/type)';

-- =====================================================
-- SECTION 3: Manual/Parcel Description Fields (no AI extraction)
-- =====================================================

ALTER TABLE land_registry_extracts_comprehensive
  ADD COLUMN IF NOT EXISTS parcel_shape TEXT,
  ADD COLUMN IF NOT EXISTS parcel_terrain TEXT,
  ADD COLUMN IF NOT EXISTS parcel_boundary_north TEXT,
  ADD COLUMN IF NOT EXISTS parcel_boundary_south TEXT,
  ADD COLUMN IF NOT EXISTS parcel_boundary_east TEXT,
  ADD COLUMN IF NOT EXISTS parcel_boundary_west TEXT;

COMMENT ON COLUMN land_registry_extracts_comprehensive.parcel_shape IS 'צורת החלקה (Parcel shape - manual field)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.parcel_terrain IS 'פני הקרקע (Parcel terrain/surface - manual field)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.parcel_boundary_north IS 'גבול צפון (North boundary - manual field)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.parcel_boundary_south IS 'גבול דרום (South boundary - manual field)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.parcel_boundary_east IS 'גבול מזרח (East boundary - manual field)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.parcel_boundary_west IS 'גבול מערב (West boundary - manual field)';

-- =====================================================
-- SECTION 4: Image AI Analysis Fields
-- =====================================================

ALTER TABLE land_registry_extracts_comprehensive
  ADD COLUMN IF NOT EXISTS property_layout_description TEXT,
  ADD COLUMN IF NOT EXISTS condition_assessment TEXT,
  ADD COLUMN IF NOT EXISTS building_condition_assessment TEXT,
  ADD COLUMN IF NOT EXISTS building_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS building_features TEXT,
  ADD COLUMN IF NOT EXISTS overall_assessment TEXT,
  ADD COLUMN IF NOT EXISTS environment_description TEXT;

COMMENT ON COLUMN land_registry_extracts_comprehensive.property_layout_description IS 'תיאור פריסת הנכס (Property layout from image AI)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.condition_assessment IS 'הערכת מצב (Condition assessment from image AI)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.building_condition_assessment IS 'הערכת מצב הבניין (Building condition from exterior AI)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.building_type IS 'סוג הבניין (Building type from image AI)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.building_features IS 'מאפייני הבניין (Building features from image AI)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.overall_assessment IS 'הערכה כוללת (Overall assessment from image AI)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.environment_description IS 'תיאור הסביבה (Environment description from image AI)';

-- =====================================================
-- SECTION 5: Planning Rights Fields
-- =====================================================

ALTER TABLE land_registry_extracts_comprehensive
  ADD COLUMN IF NOT EXISTS planning_usage TEXT,
  ADD COLUMN IF NOT EXISTS planning_min_lot_size DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS planning_build_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS planning_max_floors INTEGER,
  ADD COLUMN IF NOT EXISTS planning_max_units INTEGER,
  ADD COLUMN IF NOT EXISTS planning_building_lines TEXT;

COMMENT ON COLUMN land_registry_extracts_comprehensive.planning_usage IS 'ייעוד תכנוני (Planning usage)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.planning_min_lot_size IS 'גודל מגרש מינימלי (Minimum lot size)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.planning_build_percentage IS 'אחוזי בנייה (Build percentage)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.planning_max_floors IS 'מספר קומות מקסימלי (Maximum floors)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.planning_max_units IS 'מספר יחידות מקסימלי (Maximum units)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.planning_building_lines IS 'קווי בניין (Building lines)';

-- =====================================================
-- Summary: Added 32 new columns
-- =====================================================
-- Section 1: 6 columns (Tabu - DB only)
-- Section 2: 7 columns (Tabu - DB + Prompt)
-- Section 3: 6 columns (Manual fields)
-- Section 4: 7 columns (Image AI)
-- Section 5: 6 columns (Planning)

SELECT 'Migration 012 completed: Added 32 missing Step3 UI fields to land_registry_extracts_comprehensive table' AS migration_status;
