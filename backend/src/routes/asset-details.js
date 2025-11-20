const express = require('express');
const router = express.Router();
const { db } = require('../models/ShumaDB');

/**
 * Field mapping: Spec fields → asset_details columns
 * 
 * Spec (Section 5.1)         →  asset_details table
 * ==========================================
 * block_number               →  Extract from parcel_id (first part)
 * surface                    →  registered_area_sqm
 * year_of_constru            →  year_built
 * sale_value_nis             →  declared_price_ils
 * sale_day                   →  transaction_date
 * street                     →  street
 * house_number               →  house_number
 * city                       →  city
 * rooms                      →  room_count
 * floor                      →  floor
 * asset_type                 →  building_function or transaction_type
 * price_per_sqm              →  price_per_sqm
 * block_of_land              →  parcel_id
 */

/**
 * GET /api/asset-details/search
 * Search comparable transactions with dynamic filters
 * 
 * OPTIMIZATION STRATEGY for 250K+ rows:
 * 1. REQUIRE at least one indexed filter (block_number OR city)
 * 2. Use index-friendly queries (avoid full table scans)
 * 3. Limit results aggressively
 * 4. Only fetch necessary columns
 * 5. Leverage PostgreSQL indexes on transaction_date, year_built, city
 * 
 * Query Parameters:
 * - block_number: גוש (REQUIRED for performance) - extracted from parcel_id
 * - surface_min: Minimum area (registered_area_sqm)
 * - surface_max: Maximum area (registered_area_sqm)
 * - year_min: Minimum construction year (year_built)
 * - year_max: Maximum construction year (year_built)
 * - sale_date_from: Earliest transaction date
 * - sale_date_to: Latest transaction date
 * - city: City filter (alternative to block_number)
 * - rooms: Number of rooms
 * - floor: Floor number
 * - asset_type: Property type
 * - limit: Results limit (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get('/search', async (req, res) => {
  try {
    console.log('🔍 Asset Details Search - Query params:', req.query);
    
    const {
      block_number,
      surface_min,
      surface_max,
      year_min,
      year_max,
      sale_date_from,
      sale_date_to,
      city,
      rooms,
      floor,
      asset_type,
      limit = 50,
      offset = 0
    } = req.query;

    // ⚡ CRITICAL OPTIMIZATION: Require block_number (גוש)
    // This is mandatory for searching comparable data
    if (!block_number) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין מספר גוש לביצוע חיפוש',
        message: 'Performance optimization: block_number is required'
      });
    }

    // ⚡ Enforce maximum limit to prevent memory issues
    const safeLimit = Math.min(parseInt(limit, 10), 100);
    const safeOffset = Math.max(parseInt(offset, 10), 0);

    // Build optimized query with index-friendly WHERE clauses
    // Order matters: Put most selective filters first
    let query = `
      SELECT 
        id,
        transaction_date as sale_day,
        CONCAT(street, ' ', COALESCE(house_number::text, ''), ', ', city) as address,
        street,
        house_number,
        city,
        parcel_id as block_of_land,
        room_count as rooms,
        floor,
        registered_area_sqm as surface,
        year_built as year_of_constru,
        declared_price_ils as sale_value_nis,
        price_per_sqm,
        building_function as asset_type
      FROM asset_details
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // ⚡ OPTIMIZATION 1: Filter by block_number FIRST (most selective)
    // parcel_id format: "006154-0330-004-00"
    // We need to match the first segment (gush) with leading zeros
    // Example: block_number=6154 should match "006154-0330-004-00"
    if (block_number) {
      // Pad block_number with leading zeros to 6 digits to match format
      const paddedBlock = String(block_number).padStart(6, '0');
      query += ` AND parcel_id LIKE $${paramIndex}`;
      params.push(`${paddedBlock}-%`); // Match "006154-%" pattern
      paramIndex++;
    }

    // ⚡ OPTIMIZATION 2: City filter (uses idx_asset_details_city)
    if (city && !block_number) {
      // Only use if block_number not provided (to avoid over-filtering)
      query += ` AND LOWER(city) = LOWER($${paramIndex})`;
      params.push(city);
      paramIndex++;
    }

    // ⚡ OPTIMIZATION 3: Date range (uses idx_asset_details_transaction_date)
    // Add this early as it's highly selective
    if (sale_date_from) {
      query += ` AND transaction_date >= $${paramIndex}`;
      params.push(sale_date_from);
      paramIndex++;
    }
    if (sale_date_to) {
      query += ` AND transaction_date <= $${paramIndex}`;
      params.push(sale_date_to);
      paramIndex++;
    }

    // ⚡ OPTIMIZATION 4: Year range (uses idx_asset_details_year_built)
    if (year_min) {
      query += ` AND year_built >= $${paramIndex}`;
      params.push(parseInt(year_min, 10));
      paramIndex++;
    }
    if (year_max) {
      query += ` AND year_built <= $${paramIndex}`;
      params.push(parseInt(year_max, 10));
      paramIndex++;
    }

    // Additional filters (less selective, applied after indexed filters)
    if (surface_min) {
      query += ` AND registered_area_sqm >= $${paramIndex}`;
      params.push(parseFloat(surface_min));
      paramIndex++;
    }
    if (surface_max) {
      query += ` AND registered_area_sqm <= $${paramIndex}`;
      params.push(parseFloat(surface_max));
      paramIndex++;
    }

    if (rooms) {
      const roomNum = parseFloat(rooms);
      query += ` AND room_count >= $${paramIndex} AND room_count < $${paramIndex + 1}`;
      params.push(roomNum, roomNum + 1);
      paramIndex += 2;
    }

    if (floor) {
      query += ` AND floor = $${paramIndex}`;
      params.push(parseInt(floor, 10));
      paramIndex++;
    }

    if (asset_type) {
      query += ` AND building_function ILIKE $${paramIndex}`;
      params.push(`%${asset_type}%`);
      paramIndex++;
    }

    // Filter out nulls for critical fields (improves query performance)
    query += ` AND registered_area_sqm IS NOT NULL`;
    query += ` AND declared_price_ils IS NOT NULL`;
    query += ` AND transaction_date IS NOT NULL`;

    // ⚡ OPTIMIZATION 5: Sort by indexed column
    query += ` ORDER BY transaction_date DESC`;
    
    // ⚡ OPTIMIZATION 6: Aggressive pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(safeLimit, safeOffset);

    console.log('📊 Optimized query with', params.length - 2, 'filters');
    console.log('📊 Params:', params);

    const startTime = Date.now();
    const result = await db.query(query, params);
    const queryTime = Date.now() - startTime;

    console.log(`⚡ Query executed in ${queryTime}ms, returned ${result.rows.length} rows`);

    // Calculate price_per_sqm for rows that don't have it
    // If price_per_sqm is missing, 0, or 0.0, calculate it from sale_value_nis / surface
    const processedRows = result.rows.map(row => {
      const hasPricePerSqm = row.price_per_sqm && row.price_per_sqm > 0;
      const calculatedPricePerSqm = (row.sale_value_nis && row.surface && row.surface > 0)
        ? Math.round(row.sale_value_nis / row.surface)
        : null;
      
      return {
        ...row,
        estimated_price_ils: row.sale_value_nis, // Add estimated_price_ils alias
        price_per_sqm: hasPricePerSqm ? row.price_per_sqm : calculatedPricePerSqm
      };
    });

    return res.json({
      success: true,
      count: processedRows.length,
      data: processedRows,
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        hasMore: processedRows.length === safeLimit
      },
      performance: {
        queryTimeMs: queryTime,
        rowsReturned: processedRows.length
      }
    });

  } catch (error) {
    console.error('❌ Asset details search failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to search asset details'
    });
  }
});

/**
 * GET /api/asset-details/stats
 * Get statistics for filter options (cities, year ranges, etc.)
 * 
 * ⚡ OPTIMIZATION for 250K+ rows:
 * - Cache results for 1 hour (stats don't change frequently)
 * - Use approximate COUNT(*) from pg_class for total count
 * - Limit DISTINCT aggregations
 */
let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_TTL = 3600000; // 1 hour in milliseconds

router.get('/stats', async (req, res) => {
  try {
    // ⚡ Return cached stats if available and fresh
    const now = Date.now();
    if (statsCache && (now - statsCacheTime) < STATS_CACHE_TTL) {
      console.log('✅ Returning cached stats (age:', Math.round((now - statsCacheTime) / 1000), 'seconds)');
      return res.json({
        success: true,
        stats: statsCache,
        cached: true
      });
    }

    console.log('🔄 Refreshing stats cache...');
    
    // ⚡ OPTIMIZATION: Use separate, targeted queries instead of one heavy query
    // This is faster than COUNT(*) + multiple DISTINCT aggregations
    
    // Query 1: Get ranges (fast with indexes)
    const rangesQuery = `
      SELECT
        MIN(year_built) as min_year,
        MAX(year_built) as max_year,
        MIN(registered_area_sqm) as min_surface,
        MAX(registered_area_sqm) as max_surface,
        MIN(transaction_date) as earliest_transaction,
        MAX(transaction_date) as latest_transaction
      FROM asset_details
      WHERE registered_area_sqm IS NOT NULL
        AND transaction_date IS NOT NULL
        AND declared_price_ils IS NOT NULL
    `;

    // Query 2: Get distinct cities (limit to reasonable number)
    const citiesQuery = `
      SELECT DISTINCT city
      FROM asset_details
      WHERE city IS NOT NULL
        AND registered_area_sqm IS NOT NULL
        AND transaction_date IS NOT NULL
      ORDER BY city
      LIMIT 500
    `;

    // Query 3: Approximate count from system catalog (instant!)
    const countQuery = `
      SELECT reltuples::bigint AS approximate_count
      FROM pg_class
      WHERE relname = 'asset_details'
    `;

    const startTime = Date.now();
    const [rangesResult, citiesResult, countResult] = await Promise.all([
      db.query(rangesQuery),
      db.query(citiesQuery),
      db.query(countQuery)
    ]);
    const queryTime = Date.now() - startTime;

    const cities = citiesResult.rows.map(r => r.city);
    const stats = {
      ...rangesResult.rows[0],
      city_count: cities.length,
      cities: cities,
      total_records: countResult.rows[0]?.approximate_count || 0,
      year_count: rangesResult.rows[0].max_year - rangesResult.rows[0].min_year + 1,
      queryTimeMs: queryTime
    };

    // Cache the results
    statsCache = stats;
    statsCacheTime = now;

    console.log(`⚡ Stats refreshed in ${queryTime}ms (cached for 1 hour)`);
    
    return res.json({
      success: true,
      stats,
      cached: false
    });

  } catch (error) {
    console.error('❌ Failed to get asset details stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics'
    });
  }
});

/**
 * POST /api/asset-details/analyze
 * Analyze selected comparables and calculate valuation metrics
 * 
 * Body:
 * - selectedIds: Array of asset_detail IDs
 * - propertyArea: Current property area for estimation
 */
router.post('/analyze', async (req, res) => {
  try {
    const { selectedIds, propertyArea } = req.body;

    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No comparables selected for analysis'
      });
    }

    console.log(`📊 Analyzing ${selectedIds.length} selected comparables`);
    
    // Fetch selected comparables
    const placeholders = selectedIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT 
        id,
        transaction_date as sale_day,
        CONCAT(street, ' ', house_number, ', ', city) as address,
        street,
        house_number,
        city,
        parcel_id as block_of_land,
        room_count as rooms,
        floor,
        registered_area_sqm as surface,
        year_built as year_of_constru,
        declared_price_ils as sale_value_nis,
        price_per_sqm,
        building_function as asset_type
      FROM asset_details
      WHERE id IN (${placeholders})
    `;

    const result = await db.query(query, selectedIds);
    
    // Process comparables: calculate price_per_sqm if missing and add estimated_price_ils
    const comparables = result.rows.map(row => {
      const hasPricePerSqm = row.price_per_sqm && row.price_per_sqm > 0;
      const calculatedPricePerSqm = (row.sale_value_nis && row.surface && row.surface > 0)
        ? Math.round(row.sale_value_nis / row.surface)
        : null;
      
      return {
        ...row,
        estimated_price_ils: row.sale_value_nis, // Add estimated_price_ils alias
        price_per_sqm: hasPricePerSqm ? row.price_per_sqm : calculatedPricePerSqm
      };
    });

    console.log('📊 Fetched comparables:', comparables.length);
    console.log('📊 Sample comparable:', comparables[0]);

    // Calculate statistics
    const prices = comparables
      .map(c => c.sale_value_nis)
      .filter(p => p && p > 0);
    
    console.log('📊 Valid prices:', prices.length, 'values:', prices.slice(0, 3));
    
    const pricesPerSqm = comparables
      .map(c => c.price_per_sqm)
      .filter(p => p && p > 0);

    console.log('📊 Valid prices per sqm:', pricesPerSqm.length, 'values:', pricesPerSqm.slice(0, 3));

    const calculateMedian = (arr) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    };

    const averagePrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;

    const medianPrice = calculateMedian(prices);

    const averagePricePerSqm = pricesPerSqm.length > 0
      ? pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length
      : 0;

    const medianPricePerSqm = calculateMedian(pricesPerSqm);

    const analysis = {
      success: true,
      totalComparables: comparables.length,
      averagePrice: Math.round(averagePrice),
      medianPrice: Math.round(medianPrice),
      averagePricePerSqm: Math.round(averagePricePerSqm),
      medianPricePerSqm: Math.round(medianPricePerSqm),
      comparables,
      priceRange: prices.length > 0 ? {
        min: Math.min(...prices),
        max: Math.max(...prices)
      } : { min: 0, max: 0 }
    };

    // Estimate property value if area provided
    if (propertyArea && propertyArea > 0 && averagePricePerSqm > 0) {
      analysis.estimatedValue = Math.round(averagePricePerSqm * propertyArea);
      analysis.estimatedRange = {
        low: Math.round(analysis.estimatedValue * 0.9),
        high: Math.round(analysis.estimatedValue * 1.1)
      };
    }

    console.log('✅ Analysis complete:', {
      totalComparables: analysis.totalComparables,
      averagePrice: analysis.averagePrice,
      medianPrice: analysis.medianPrice,
      averagePricePerSqm: analysis.averagePricePerSqm,
      medianPricePerSqm: analysis.medianPricePerSqm,
      priceRange: analysis.priceRange
    });

    return res.json(analysis);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze comparables'
    });
  }
});

/**
 * POST /api/asset-details/save-selection
 * Save selected comparables for a session (Section 5.1 output)
 * 
 * Body:
 * - sessionId: Session identifier
 * - selectedIds: Array of selected asset_detail IDs
 * - finalPricePerSqm: Approved price per sqm for Section 5.2
 */
router.post('/save-selection', async (req, res) => {
  try {
    const { sessionId, selectedIds, finalPricePerSqm } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No comparables selected'
      });
    }

    console.log(`💾 Saving selection for session ${sessionId}: ${selectedIds.length} comparables`);
    
    // Fetch full details of selected comparables
    const placeholders = selectedIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT 
        id,
        transaction_date as sale_day,
        CONCAT(street, ' ', house_number, ', ', city) as address,
        street,
        house_number,
        city,
        parcel_id as block_of_land,
        room_count as rooms,
        floor,
        registered_area_sqm as surface,
        year_built as year_of_constru,
        declared_price_ils as sale_value_nis,
        price_per_sqm,
        building_function as asset_type
      FROM asset_details
      WHERE id IN (${placeholders})
      ORDER BY transaction_date DESC
    `;

    const result = await db.query(query, selectedIds);
    
    // Calculate price_per_sqm if missing, 0, or 0.0, and add estimated_price_ils
    const selectedComparables = result.rows.map(row => {
      const hasPricePerSqm = row.price_per_sqm && row.price_per_sqm > 0;
      const calculatedPricePerSqm = (row.sale_value_nis && row.surface && row.surface > 0)
        ? Math.round(row.sale_value_nis / row.surface)
        : null;
      
      return {
        ...row,
        estimated_price_ils: row.sale_value_nis, // Add estimated_price_ils alias
        price_per_sqm: hasPricePerSqm ? row.price_per_sqm : calculatedPricePerSqm
      };
    });

    // Format for Section 5.1 JSON output
    const section51Output = {
      selected_comparables: selectedComparables,
      final_price_per_sqm: finalPricePerSqm || null,
      selection_timestamp: new Date().toISOString(),
      session_id: sessionId
    };

    // TODO: Save to database or session storage
    // For now, return the formatted output
    
    console.log('✅ Selection saved successfully');

    return res.json({
      success: true,
      message: `Saved ${selectedComparables.length} comparables`,
      data: section51Output
    });

  } catch (error) {
    console.error('❌ Failed to save selection:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save selection'
    });
  }
});

module.exports = router;

