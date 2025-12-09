-- ============================================
-- ADD FIELD_LOCATIONS COLUMNS
-- Adds field_locations JSONB columns to building_permit_extracts and shared_building_order tables
-- ============================================

-- Building Permits table
ALTER TABLE building_permit_extracts
ADD COLUMN IF NOT EXISTS field_locations JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_building_permits_field_locations
ON building_permit_extracts USING GIN (field_locations);

COMMENT ON COLUMN building_permit_extracts.field_locations IS 'JSONB object storing field locations for scroll-to-source: {"field_name": {"page": number, "y_percent": number}}';

-- Shared Building Order table
ALTER TABLE shared_building_order
ADD COLUMN IF NOT EXISTS field_locations JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_shared_building_field_locations
ON shared_building_order USING GIN (field_locations);

COMMENT ON COLUMN shared_building_order.field_locations IS 'JSONB object storing field locations for scroll-to-source: {"field_name": {"page": number, "y_percent": number}}';

-- Land Registry table
ALTER TABLE land_registry_extracts
ADD COLUMN IF NOT EXISTS field_locations JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_land_registry_field_locations
ON land_registry_extracts USING GIN (field_locations);

COMMENT ON COLUMN land_registry_extracts.field_locations IS 'JSONB object storing field locations for scroll-to-source: {"field_name": {"page": number, "y_percent": number}}';

