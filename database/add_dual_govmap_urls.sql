-- Database Migration: Add Dual GovMap URLs
-- This migration adds support for dual GovMap URLs (with and without תצ"א overlay)

-- Add new columns to support dual GovMap URLs
ALTER TABLE govmap_address_maps 
ADD COLUMN IF NOT EXISTS govmap_url_with_tazea TEXT,
ADD COLUMN IF NOT EXISTS govmap_url_without_tazea TEXT;

-- Add index for better performance on URL lookups
CREATE INDEX IF NOT EXISTS idx_govmap_url_with_tazea ON govmap_address_maps(govmap_url_with_tazea);
CREATE INDEX IF NOT EXISTS idx_govmap_url_without_tazea ON govmap_address_maps(govmap_url_without_tazea);

-- Update existing records to populate the new columns
-- For existing records, copy the main govmap_url to both new columns
UPDATE govmap_address_maps 
SET 
  govmap_url_with_tazea = govmap_url,
  govmap_url_without_tazea = govmap_url
WHERE govmap_url_with_tazea IS NULL OR govmap_url_without_tazea IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN govmap_address_maps.govmap_url_with_tazea IS 'GovMap URL with תצ"א (land registry) overlay (b=1 parameter)';
COMMENT ON COLUMN govmap_address_maps.govmap_url_without_tazea IS 'GovMap URL without תצ"א overlay (clean map for drawing)';

-- Create a view for easy access to both URL types
CREATE OR REPLACE VIEW govmap_address_maps_with_dual_urls AS
SELECT 
  id,
  address_input,
  address_normalized,
  latitude,
  longitude,
  itm_easting,
  itm_northing,
  confidence,
  govmap_url,                    -- Original URL (for backward compatibility)
  govmap_url_with_tazea,         -- URL with תצ"א overlay
  govmap_url_without_tazea,      -- URL without תצ"א overlay
  annotations,
  annotation_canvas_data,
  zoom_level,
  show_tazea,
  notes,
  tags,
  created_at,
  updated_at,
  created_by,
  updated_by,
  status
FROM govmap_address_maps
WHERE status = 'active';

-- Add a function to get the appropriate URL based on show_tazea flag
CREATE OR REPLACE FUNCTION get_govmap_url(
  p_id UUID,
  p_show_tazea BOOLEAN DEFAULT TRUE
) RETURNS TEXT AS $$
DECLARE
  result_url TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN p_show_tazea THEN govmap_url_with_tazea
      ELSE govmap_url_without_tazea
    END
  INTO result_url
  FROM govmap_address_maps
  WHERE id = p_id AND status = 'active';
  
  RETURN result_url;
END;
$$ LANGUAGE plpgsql;

-- Add a function to update both URLs at once
CREATE OR REPLACE FUNCTION update_dual_govmap_urls(
  p_id UUID,
  p_url_with_tazea TEXT,
  p_url_without_tazea TEXT,
  p_updated_by TEXT DEFAULT 'system'
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE govmap_address_maps
  SET 
    govmap_url_with_tazea = p_url_with_tazea,
    govmap_url_without_tazea = p_url_without_tazea,
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE id = p_id AND status = 'active';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add a function to get statistics about dual URL usage
CREATE OR REPLACE FUNCTION get_dual_govmap_stats() RETURNS TABLE(
  total_records BIGINT,
  with_tazea_count BIGINT,
  without_tazea_count BIGINT,
  both_urls_count BIGINT,
  missing_urls_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_records,
    COUNT(govmap_url_with_tazea) as with_tazea_count,
    COUNT(govmap_url_without_tazea) as without_tazea_count,
    COUNT(CASE WHEN govmap_url_with_tazea IS NOT NULL AND govmap_url_without_tazea IS NOT NULL THEN 1 END) as both_urls_count,
    COUNT(CASE WHEN govmap_url_with_tazea IS NULL OR govmap_url_without_tazea IS NULL THEN 1 END) as missing_urls_count
  FROM govmap_address_maps
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE ON govmap_address_maps TO your_app_user;
-- GRANT USAGE ON SCHEMA public TO your_app_user;

-- Log the migration
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  'add_dual_govmap_urls', 
  NOW(), 
  'Added support for dual GovMap URLs (with and without תצ"א overlay)'
) ON CONFLICT DO NOTHING;

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);
