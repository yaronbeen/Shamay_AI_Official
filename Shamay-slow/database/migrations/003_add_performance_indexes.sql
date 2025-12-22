-- ============================================
-- PERFORMANCE INDEXES
-- Add indexes on frequently queried columns
-- ============================================

-- Index on session_id in shuma table (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_shuma_session_id ON shuma(session_id);

-- Index on organization_id and status for filtering
CREATE INDEX IF NOT EXISTS idx_shuma_org_status ON shuma(organization_id, status);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_shuma_created_at ON shuma(created_at DESC);

-- Index on session_id in extraction tables
CREATE INDEX IF NOT EXISTS idx_land_registry_session_id ON land_registry_extracts(session_id);
CREATE INDEX IF NOT EXISTS idx_building_permit_session_id ON building_permit_extracts(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_building_session_id ON shared_building_order(session_id);

-- Index on shuma_id in related tables for JOINs
CREATE INDEX IF NOT EXISTS idx_land_registry_shuma_id ON land_registry_extracts(shuma_id);
CREATE INDEX IF NOT EXISTS idx_building_permit_shuma_id ON building_permit_extracts(shuma_id);
CREATE INDEX IF NOT EXISTS idx_shared_building_shuma_id ON shared_building_order(shuma_id);
CREATE INDEX IF NOT EXISTS idx_garmushka_shuma_id ON garmushka(shuma_id);
CREATE INDEX IF NOT EXISTS idx_garmushka_session_id ON garmushka(session_id);
CREATE INDEX IF NOT EXISTS idx_images_shuma_id ON images(shuma_id);
CREATE INDEX IF NOT EXISTS idx_images_session_id ON images(session_id);
CREATE INDEX IF NOT EXISTS idx_images_image_type ON images(image_type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_images_session_type ON images(session_id, image_type);

COMMENT ON INDEX idx_shuma_session_id IS 'Critical index for session lookups - most frequently used query';
COMMENT ON INDEX idx_images_session_type IS 'Optimizes GIS screenshot lookups by session and type';

