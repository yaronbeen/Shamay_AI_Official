-- Migration: Add indexes for comparable data search performance
-- Run this migration on your PostgreSQL database to improve search performance
--
-- IMPORTANT: These indexes are CRITICAL for the 250K+ row properties table
-- Without them, searches can take 10+ seconds. With them, searches are <100ms.
--
-- To run: psql -d your_database -f 001_add_search_indexes.sql
-- Or execute in your database admin tool (pgAdmin, Neon console, etc.)

-- ============================================================================
-- INDEX 1: parcel_id on asset_details for JOIN performance
-- This is the most critical index - used in every query that joins properties to asset_details
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_asset_details_parcel_id
ON asset_details(parcel_id);

-- ============================================================================
-- INDEX 2: block_of_land on properties for JOIN and filter performance
-- Used when joining and when filtering by block number
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_block_of_land
ON properties(block_of_land);

-- ============================================================================
-- INDEX 3: Composite index for common search filters
-- Covers the most common filter combinations: date, year, surface area
-- Only includes rows with valid data (WHERE clause matches search query)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_search_filters
ON properties(sale_day DESC, year_of_construction, surface)
WHERE surface IS NOT NULL
  AND sale_day IS NOT NULL
  AND sale_value_nis IS NOT NULL
  AND surface > 0;

-- ============================================================================
-- INDEX 4: Settlement (city) index for city-based searches
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_settlement
ON properties(settlement);

-- ============================================================================
-- INDEX 5: Sale day index for date range queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_sale_day
ON properties(sale_day DESC);

-- ============================================================================
-- INDEX 6: Year of construction for year range filters
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_year_of_construction
ON properties(year_of_construction);

-- ============================================================================
-- INDEX 7: Street index on asset_details for street-based searches
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_asset_details_street
ON asset_details(street);

-- ============================================================================
-- INDEX 8: City index on asset_details
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_asset_details_city
ON asset_details(city);

-- ============================================================================
-- Verify indexes were created
-- ============================================================================
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE tablename IN ('properties', 'asset_details')
      AND indexname LIKE 'idx_%';

    RAISE NOTICE 'Created/verified % search optimization indexes', idx_count;
END $$;

-- ============================================================================
-- Optional: Analyze tables to update statistics for query planner
-- Run this after creating indexes for optimal query plans
-- ============================================================================
ANALYZE properties;
ANALYZE asset_details;

-- Done! Your searches should now be significantly faster.
