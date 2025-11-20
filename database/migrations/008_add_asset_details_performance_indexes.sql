-- =====================================================
-- Migration: 008_add_asset_details_performance_indexes
-- Description: Add critical performance indexes for 250K+ rows
-- Date: 2025-11-16
-- 
-- This migration adds 7 performance indexes to asset_details table
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

\echo ''
\echo '=========================================='
\echo 'Migration 008: Adding Performance Indexes'
\echo 'to asset_details table (250K+ rows)'
\echo '=========================================='
\echo ''
\echo 'This will take 2-5 minutes...'
\echo ''

-- Start transaction
BEGIN;

-- =====================================================
-- INDEX 1: parcel_id (MOST CRITICAL!)
-- =====================================================
\echo '1/7 Creating idx_asset_details_parcel_id...'
CREATE INDEX IF NOT EXISTS idx_asset_details_parcel_id 
ON asset_details(parcel_id text_pattern_ops) 
WHERE parcel_id IS NOT NULL;
\echo '    ✓ Created'

-- =====================================================
-- INDEX 2: city
-- =====================================================
\echo '2/7 Creating idx_asset_details_city...'
CREATE INDEX IF NOT EXISTS idx_asset_details_city 
ON asset_details(city) 
WHERE city IS NOT NULL;
\echo '    ✓ Created'

-- =====================================================
-- INDEX 3: transaction_date
-- =====================================================
\echo '3/7 Creating idx_asset_details_transaction_date...'
CREATE INDEX IF NOT EXISTS idx_asset_details_transaction_date 
ON asset_details(transaction_date DESC) 
WHERE transaction_date IS NOT NULL;
\echo '    ✓ Created'

-- =====================================================
-- INDEX 4: year_built
-- =====================================================
\echo '4/7 Creating idx_asset_details_year_built...'
CREATE INDEX IF NOT EXISTS idx_asset_details_year_built 
ON asset_details(year_built) 
WHERE year_built IS NOT NULL;
\echo '    ✓ Created'

-- =====================================================
-- INDEX 5: Composite index (date + year + area)
-- =====================================================
\echo '5/7 Creating idx_asset_details_common_filters...'
CREATE INDEX IF NOT EXISTS idx_asset_details_common_filters 
ON asset_details(transaction_date DESC, year_built, registered_area_sqm) 
WHERE transaction_date IS NOT NULL 
  AND year_built IS NOT NULL
  AND registered_area_sqm IS NOT NULL
  AND declared_price_ils IS NOT NULL;
\echo '    ✓ Created'

-- =====================================================
-- INDEX 6: Price calculations
-- =====================================================
\echo '6/7 Creating idx_asset_details_price_calculations...'
CREATE INDEX IF NOT EXISTS idx_asset_details_price_calculations 
ON asset_details(declared_price_ils, registered_area_sqm) 
WHERE declared_price_ils IS NOT NULL 
  AND registered_area_sqm IS NOT NULL
  AND registered_area_sqm > 0;
\echo '    ✓ Created'

-- =====================================================
-- INDEX 7: Recent transactions (partial index)
-- =====================================================
\echo '7/7 Creating idx_asset_details_recent_transactions...'
CREATE INDEX IF NOT EXISTS idx_asset_details_recent_transactions 
ON asset_details(transaction_date DESC, city, year_built) 
WHERE transaction_date >= CURRENT_DATE - INTERVAL '24 months'
  AND registered_area_sqm IS NOT NULL
  AND declared_price_ils IS NOT NULL;
\echo '    ✓ Created'

-- =====================================================
-- Update statistics
-- =====================================================
\echo ''
\echo 'Updating table statistics (ANALYZE)...'
ANALYZE asset_details;
\echo '✓ Statistics updated'

-- Commit transaction
COMMIT;

\echo ''
\echo '=========================================='
\echo '✓ Migration 008 Complete!'
\echo '=========================================='
\echo ''
\echo 'Verifying indexes...'
\echo ''

-- Verify indexes were created
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'asset_details'
  AND indexname LIKE 'idx_asset_details_%'
ORDER BY indexname;

\echo ''
\echo 'All 7 indexes created successfully! 🚀'
\echo ''
\echo 'Test performance with:'
\echo '  EXPLAIN ANALYZE'
\echo '  SELECT * FROM asset_details'
\echo '  WHERE parcel_id LIKE ''006154-%'''
\echo '  LIMIT 50;'
\echo ''
\echo 'Expected: "Index Scan" and < 100ms execution time'
\echo ''

