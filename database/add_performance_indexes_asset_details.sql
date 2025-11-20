-- =====================================================
-- Performance Indexes for asset_details Table
-- Critical for 250K+ row queries
-- 
-- Run this file to add all performance indexes:
-- psql -d your_database_name -f add_performance_indexes_asset_details.sql
-- 
-- After running, execute: ANALYZE asset_details;
-- =====================================================

\echo '=========================================='
\echo 'Adding Performance Indexes to asset_details'
\echo 'This may take a few minutes for 250K+ rows...'
\echo '=========================================='
\echo ''

-- =====================================================
-- INDEX 1: parcel_id (MOST CRITICAL!)
-- =====================================================
-- Enables fast block_number (gush) searches
-- Format: "006154-0330-004-00" → search by "006154"
-- Uses text_pattern_ops for efficient LIKE queries
\echo 'Creating idx_asset_details_parcel_id...'
CREATE INDEX IF NOT EXISTS idx_asset_details_parcel_id 
ON asset_details(parcel_id text_pattern_ops) 
WHERE parcel_id IS NOT NULL;
\echo '✓ idx_asset_details_parcel_id created'
\echo ''

-- =====================================================
-- INDEX 2: city
-- =====================================================
-- Enables fast city searches (alternative to block_number)
\echo 'Creating idx_asset_details_city...'
CREATE INDEX IF NOT EXISTS idx_asset_details_city 
ON asset_details(city) 
WHERE city IS NOT NULL;
\echo '✓ idx_asset_details_city created'
\echo ''

-- =====================================================
-- INDEX 3: transaction_date
-- =====================================================
-- Enables fast date range queries (DESC for recent-first)
\echo 'Creating idx_asset_details_transaction_date...'
CREATE INDEX IF NOT EXISTS idx_asset_details_transaction_date 
ON asset_details(transaction_date DESC) 
WHERE transaction_date IS NOT NULL;
\echo '✓ idx_asset_details_transaction_date created'
\echo ''

-- =====================================================
-- INDEX 4: year_built
-- =====================================================
-- Enables fast construction year filtering
\echo 'Creating idx_asset_details_year_built...'
CREATE INDEX IF NOT EXISTS idx_asset_details_year_built 
ON asset_details(year_built) 
WHERE year_built IS NOT NULL;
\echo '✓ idx_asset_details_year_built created'
\echo ''

-- =====================================================
-- INDEX 5: Composite index for common query patterns
-- =====================================================
-- Optimizes queries that filter by date + year + area together
\echo 'Creating idx_asset_details_common_filters...'
CREATE INDEX IF NOT EXISTS idx_asset_details_common_filters 
ON asset_details(
  transaction_date DESC,
  year_built,
  registered_area_sqm
) 
WHERE transaction_date IS NOT NULL 
  AND year_built IS NOT NULL
  AND registered_area_sqm IS NOT NULL
  AND declared_price_ils IS NOT NULL;
\echo '✓ idx_asset_details_common_filters created'
\echo ''

-- =====================================================
-- INDEX 6: Price calculations
-- =====================================================
-- Speeds up price per sqm calculations
\echo 'Creating idx_asset_details_price_calculations...'
CREATE INDEX IF NOT EXISTS idx_asset_details_price_calculations 
ON asset_details(declared_price_ils, registered_area_sqm) 
WHERE declared_price_ils IS NOT NULL 
  AND registered_area_sqm IS NOT NULL
  AND registered_area_sqm > 0;
\echo '✓ idx_asset_details_price_calculations created'
\echo ''

-- =====================================================
-- INDEX 7: Recent transactions (PARTIAL INDEX)
-- =====================================================
-- Optimized for recent data queries (last 24 months)
-- Partial index = smaller & faster for common use case
\echo 'Creating idx_asset_details_recent_transactions...'
CREATE INDEX IF NOT EXISTS idx_asset_details_recent_transactions 
ON asset_details(transaction_date DESC, city, year_built) 
WHERE transaction_date >= CURRENT_DATE - INTERVAL '24 months'
  AND registered_area_sqm IS NOT NULL
  AND declared_price_ils IS NOT NULL;
\echo '✓ idx_asset_details_recent_transactions created'
\echo ''

-- =====================================================
-- OPTIONAL: Data isolation indexes (multi-tenant)
-- =====================================================
-- Uncomment if you're using organization_id and user_id filtering

-- \echo 'Creating idx_asset_details_organization_id...'
-- CREATE INDEX IF NOT EXISTS idx_asset_details_organization_id 
-- ON asset_details(organization_id) 
-- WHERE organization_id IS NOT NULL;
-- \echo '✓ idx_asset_details_organization_id created'

-- \echo 'Creating idx_asset_details_user_id...'
-- CREATE INDEX IF NOT EXISTS idx_asset_details_user_id 
-- ON asset_details(user_id) 
-- WHERE user_id IS NOT NULL;
-- \echo '✓ idx_asset_details_user_id created'

-- =====================================================
-- UPDATE TABLE STATISTICS (CRITICAL!)
-- =====================================================
-- This tells PostgreSQL about data distribution
-- Must run after creating indexes!
\echo ''
\echo 'Updating table statistics (ANALYZE)...'
ANALYZE asset_details;
\echo '✓ Statistics updated'
\echo ''

-- =====================================================
-- VERIFY INDEXES WERE CREATED
-- =====================================================
\echo '=========================================='
\echo 'Verifying indexes...'
\echo '=========================================='

SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'asset_details'
  AND indexname LIKE 'idx_asset_details_%'
ORDER BY indexname;

\echo ''
\echo '=========================================='
\echo '✓ All indexes created successfully!'
\echo '=========================================='
\echo ''
\echo 'Next steps:'
\echo '1. Test a query to verify performance'
\echo '2. Run: EXPLAIN ANALYZE SELECT * FROM asset_details WHERE parcel_id LIKE ''006154-%'' LIMIT 50;'
\echo '3. Look for "Index Scan" in the output (good!)'
\echo '4. Execution time should be < 100ms'
\echo ''
\echo 'Index creation complete! 🚀'
\echo ''

-- Add comments for documentation
COMMENT ON INDEX idx_asset_details_parcel_id IS 'Critical for block_number (גוש) filtering - enables fast LIKE queries on parcel_id';
COMMENT ON INDEX idx_asset_details_city IS 'Enables fast city-based searches';
COMMENT ON INDEX idx_asset_details_transaction_date IS 'Enables fast date range queries (recent transactions first)';
COMMENT ON INDEX idx_asset_details_year_built IS 'Enables fast filtering by construction year';
COMMENT ON INDEX idx_asset_details_common_filters IS 'Optimizes most common query pattern (date + year + area together)';
COMMENT ON INDEX idx_asset_details_price_calculations IS 'Speeds up price per sqm calculations';
COMMENT ON INDEX idx_asset_details_recent_transactions IS 'Partial index optimized for recent data queries (last 24 months)';

