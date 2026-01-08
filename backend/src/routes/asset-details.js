const express = require('express');
const router = express.Router();
const { db } = require('../models/ShumaDB');

/**
 * Field mapping: Spec fields → properties columns (with asset_details join for address)
 * 
 * Spec (Section 5.1)         →  properties table (source of truth)
 * ==========================================
 * block_number               →  Extract from block_of_land (first part)
 * surface                    →  surface (square meters of apartment)
 * year_of_constru            →  year_of_construction
 * sale_value_nis             →  sale_value_nis
 * sale_day                   →  sale_date
 * settlement                 →  settlement (from properties)
 * address                    →  JOIN with asset_details for street, house_number, city (or N/A if missing)
 * rooms                      →  rooms
 * floor                      →  floor
 * asset_type                 →  asset_type
 * price_per_sqm              →  sale_value_nis / surface (calculated)
 * block_of_land              →  block_of_land
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
    const isDev = process.env.NODE_ENV !== 'production';
    const isVercel = process.env.VERCEL === '1';
    
    if (isDev && !isVercel) {
      console.log('🔍 Asset Details Search - Query params:', req.query);
    }
    
    const {
      block_number,
      block_numbers,        // Comma-separated list of block numbers
      block_range_from,     // Block number range start
      block_range_to,       // Block number range end
      surface_min,
      surface_max,
      year_min,
      year_max,
      sale_date_from,
      sale_date_to,
      city,
      street,               // Street name search
      parcel_from,          // Parcel (chelka) range start
      parcel_to,            // Parcel (chelka) range end
      sale_value_min,       // Minimum sale value
      sale_value_max,       // Maximum sale value
      rooms,
      floor,
      asset_type,
      limit = 50,
      offset = 0
    } = req.query;

    // ⚡ CRITICAL OPTIMIZATION: Require at least one primary filter
    // Options: block_number, block_numbers, block_range, city, or street
    const hasBlockFilter = block_number || block_numbers || (block_range_from && block_range_to);
    const hasCityFilter = city && city.trim().length > 0;
    const hasStreetFilter = street && street.trim().length > 0;

    if (!hasBlockFilter && !hasCityFilter && !hasStreetFilter) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין לפחות אחד מהבאים: גוש, טווח גושים, יישוב או רחוב',
        message: 'Performance optimization: at least one primary filter is required'
      });
    }

    // ⚡ Enforce maximum limit to prevent memory issues
    const safeLimit = Math.min(parseInt(limit, 10), 100);
    const safeOffset = Math.max(parseInt(offset, 10), 0);

    // Build optimized query with index-friendly WHERE clauses
    // Order matters: Put most selective filters first
    // properties table is the source of truth, LEFT JOIN asset_details for address
    // Try to join on block_of_land or id - we'll test which works
    let query = `
      SELECT 
        p.id,
        p.sale_day as sale_day,
        COALESCE(
          NULLIF(
            TRIM(
              COALESCE(ad.street, '') || 
              CASE WHEN ad.street IS NOT NULL AND ad.house_number IS NOT NULL THEN ' ' ELSE '' END ||
              COALESCE(ad.house_number::text, '') ||
              CASE WHEN (ad.street IS NOT NULL OR ad.house_number IS NOT NULL) AND ad.city IS NOT NULL THEN ', ' ELSE '' END ||
              COALESCE(ad.city, '')
            ),
            ''
          ),
          p.settlement,
          'N/A'
        ) as address,
        COALESCE(NULLIF(ad.street, ''), 'N/A') as street,
        COALESCE(NULLIF(ad.house_number::text, ''), 'N/A') as house_number,
        COALESCE(NULLIF(ad.city, ''), p.settlement, 'N/A') as city,
        p.settlement,
        p.block_of_land,
        p.rooms,
        COALESCE(ad.floor, NULL) as floor,
        p.surface,
        p.year_of_construction as year_of_constru,
        p.sale_value_nis,
        CASE 
          WHEN p.surface > 0 AND CAST(p.sale_value_nis AS NUMERIC) > 0 
          THEN ROUND(CAST(p.sale_value_nis AS NUMERIC) / p.surface)
          ELSE NULL
        END as price_per_sqm,
        p.asset_type
      FROM properties p
      LEFT JOIN asset_details ad ON p.block_of_land = ad.parcel_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // ⚡ OPTIMIZATION 1: Filter by block_number(s) FIRST (most selective)
    // FIX: Combine block_number and block_numbers if both are provided
    const allBlockNumbers = [];

    // Add single block_number if provided
    if (block_number) {
      allBlockNumbers.push(String(block_number).trim());
    }

    // Add multiple block_numbers if provided (comma-separated)
    if (block_numbers) {
      const blocks = block_numbers.split(',').map(b => b.trim()).filter(b => b);
      allBlockNumbers.push(...blocks);
    }

    // Remove duplicates
    const uniqueBlocks = [...new Set(allBlockNumbers)];

    if (uniqueBlocks.length > 0) {
      // Build conditions for all block numbers
      const blockConditions = uniqueBlocks.map(block => {
        const paddedBlock = String(block).padStart(6, '0');
        params.push(`${paddedBlock}-%`, `%${block}%`, block);
        const conditions = `(
          CAST(p.block_of_land AS TEXT) LIKE $${paramIndex}
          OR CAST(p.block_of_land AS TEXT) LIKE $${paramIndex + 1}
          OR CAST(p.block_of_land AS TEXT) = $${paramIndex + 2}
        )`;
        paramIndex += 3;
        return conditions;
      });
      query += ` AND (${blockConditions.join(' OR ')})`;
    } else if (block_range_from && block_range_to) {
      // Block number range search
      const fromBlock = parseInt(block_range_from, 10);
      const toBlock = parseInt(block_range_to, 10);
      // Extract block number from block_of_land and compare numerically
      query += ` AND (
        CAST(SPLIT_PART(CAST(p.block_of_land AS TEXT), '-', 1) AS INTEGER) >= $${paramIndex}
        AND CAST(SPLIT_PART(CAST(p.block_of_land AS TEXT), '-', 1) AS INTEGER) <= $${paramIndex + 1}
      )`;
      params.push(fromBlock, toBlock);
      paramIndex += 2;
    }

    // ⚡ OPTIMIZATION 2: Settlement/City filter (from properties table)
    if (city) {
      query += ` AND LOWER(p.settlement) LIKE LOWER($${paramIndex})`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    // ⚡ OPTIMIZATION 2b: Street filter (from asset_details table)
    if (street) {
      query += ` AND LOWER(ad.street) LIKE LOWER($${paramIndex})`;
      params.push(`%${street}%`);
      paramIndex++;
    }

    // ⚡ OPTIMIZATION 3: Date range (uses sale_day from properties)
    // Add this early as it's highly selective
    if (sale_date_from) {
      query += ` AND p.sale_day >= $${paramIndex}`;
      params.push(sale_date_from);
      paramIndex++;
    }
    if (sale_date_to) {
      query += ` AND p.sale_day <= $${paramIndex}`;
      params.push(sale_date_to);
      paramIndex++;
    }

    // ⚡ OPTIMIZATION 4: Year range (uses year_of_construction from properties)
    if (year_min) {
      query += ` AND p.year_of_construction >= $${paramIndex}`;
      params.push(parseInt(year_min, 10));
      paramIndex++;
    }
    if (year_max) {
      query += ` AND p.year_of_construction <= $${paramIndex}`;
      params.push(parseInt(year_max, 10));
      paramIndex++;
    }

    // Additional filters (less selective, applied after indexed filters)
    if (surface_min) {
      query += ` AND p.surface >= $${paramIndex}`;
      params.push(parseFloat(surface_min));
      paramIndex++;
    }
    if (surface_max) {
      query += ` AND p.surface <= $${paramIndex}`;
      params.push(parseFloat(surface_max));
      paramIndex++;
    }

    if (rooms) {
      const roomNum = parseFloat(rooms);
      query += ` AND p.rooms >= $${paramIndex} AND p.rooms < $${paramIndex + 1}`;
      params.push(roomNum, roomNum + 1);
      paramIndex += 2;
    }

    if (floor) {
      query += ` AND ad.floor = $${paramIndex}`;
      params.push(parseInt(floor, 10));
      paramIndex++;
    }

    if (asset_type) {
      query += ` AND p.asset_type ILIKE $${paramIndex}`;
      params.push(`%${asset_type}%`);
      paramIndex++;
    }

    // Parcel (chelka) range filter - extract from block_of_land
    if (parcel_from) {
      query += ` AND CAST(SPLIT_PART(CAST(p.block_of_land AS TEXT), '-', 2) AS INTEGER) >= $${paramIndex}`;
      params.push(parseInt(parcel_from, 10));
      paramIndex++;
    }
    if (parcel_to) {
      query += ` AND CAST(SPLIT_PART(CAST(p.block_of_land AS TEXT), '-', 2) AS INTEGER) <= $${paramIndex}`;
      params.push(parseInt(parcel_to, 10));
      paramIndex++;
    }

    // Sale value range filter
    if (sale_value_min) {
      query += ` AND CAST(p.sale_value_nis AS NUMERIC) >= $${paramIndex}`;
      params.push(parseFloat(sale_value_min));
      paramIndex++;
    }
    if (sale_value_max) {
      query += ` AND CAST(p.sale_value_nis AS NUMERIC) <= $${paramIndex}`;
      params.push(parseFloat(sale_value_max));
      paramIndex++;
    }

    // Filter out nulls for critical fields (improves query performance)
    query += ` AND p.surface IS NOT NULL`;
    query += ` AND p.sale_value_nis IS NOT NULL`;
    query += ` AND p.sale_day IS NOT NULL`;
    query += ` AND p.surface > 0`;
    query += ` AND CAST(p.sale_value_nis AS NUMERIC) > 0`;

    // ⚡ OPTIMIZATION 5: Sort by indexed column
    query += ` ORDER BY p.sale_day DESC`;
    
    // ⚡ OPTIMIZATION 6: Aggressive pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(safeLimit, safeOffset);
    
    if (isDev && !isVercel) {
      console.log('📊 Optimized query with', params.length - 2, 'filters');
      console.log('📊 Params:', params);
    }

    // Only run test queries in development (not in Vercel production)
    if (isDev && !isVercel && process.env.DEBUG_DB_SCHEMA === 'true') {
      try {
        const testQuery = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'properties'
          ORDER BY ordinal_position
          LIMIT 20
        `);
        console.log('✅ Properties table columns:', testQuery.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        
        const countQuery = await db.query('SELECT COUNT(*) as count FROM properties');
        console.log('✅ Properties table row count:', countQuery.rows[0]?.count);
      } catch (testError) {
        let errorMsg = 'Unknown error';
        if (testError instanceof Error) {
          errorMsg = testError.message || testError.toString();
        } else if (testError && typeof testError === 'object') {
          errorMsg = testError.message || testError.error?.message || JSON.stringify(testError);
        } else {
          errorMsg = String(testError);
        }
        console.error('❌ Properties table test failed:', errorMsg);
        console.error('❌ Test error code:', testError.code || testError.error?.code);
        console.error('❌ Test error detail:', testError.detail || testError.error?.detail);
        console.error('❌ Test error type:', typeof testError);
        console.error('❌ Test error keys:', Object.keys(testError || {}));
      }
    }

    const startTime = Date.now();
    let result
    try {
      if (isDev && !isVercel) {
        console.log('🔍 Executing query:', query.substring(0, 200) + '...');
      }
      result = await db.query(query, params);
    } catch (queryError) {
      // Handle ErrorEvent from Neon WebSocket - extract actual error message
      let errorMsg = 'Unknown error';
      let errorDetail = '';
      let errorHint = '';
      let errorCode = '';
      
      // Try to extract error information from various possible formats
      if (queryError instanceof Error) {
        errorMsg = queryError.message || queryError.toString();
        errorDetail = queryError.detail || '';
        errorHint = queryError.hint || '';
        errorCode = queryError.code || '';
      } else if (queryError && typeof queryError === 'object') {
        // Try to get message from ErrorEvent or other error objects
        errorMsg = queryError.message || queryError.error?.message || queryError.toString() || JSON.stringify(queryError);
        errorDetail = queryError.detail || queryError.error?.detail || '';
        errorHint = queryError.hint || queryError.error?.hint || '';
        errorCode = queryError.code || queryError.error?.code || '';
        
        // If it's an ErrorEvent, try to get more info
        if (queryError.type === 'error' || queryError.constructor?.name === 'ErrorEvent') {
          errorMsg = queryError.message || queryError.error?.message || 'WebSocket connection error';
        }
      } else {
        errorMsg = String(queryError);
      }
      
      console.error('❌ SQL Query Error:', errorMsg);
      console.error('❌ Error Code:', errorCode);
      console.error('❌ Error Detail:', errorDetail);
      console.error('❌ Error Hint:', errorHint);
      console.error('❌ Error Type:', typeof queryError);
      console.error('❌ Error Constructor:', queryError?.constructor?.name);
      console.error('❌ Full Error Object:', JSON.stringify(queryError, Object.getOwnPropertyNames(queryError)));
      console.error('❌ SQL Query (first 500 chars):', query.substring(0, 500));
      console.error('❌ SQL Params:', params);
      
      throw new Error(`Database query failed: ${errorMsg}${errorDetail ? ' - ' + errorDetail : ''}${errorHint ? ' - Hint: ' + errorHint : ''}`);
    }
    const queryTime = Date.now() - startTime;

    if (isDev && !isVercel) {
      console.log(`⚡ Query executed in ${queryTime}ms, returned ${result.rows.length} rows`);
    }

    // Price per sqm is already calculated in SQL query
    // Parse string values to numbers (sale_value_nis is stored as character varying)
    const processedRows = result.rows.map(row => {
      // Parse sale_value_nis from string to number
      const saleValueNis = typeof row.sale_value_nis === 'string' 
        ? parseFloat(row.sale_value_nis.trim()) 
        : (typeof row.sale_value_nis === 'number' ? row.sale_value_nis : null);
      
      // Ensure price_per_sqm is numeric
      const pricePerSqm = typeof row.price_per_sqm === 'string'
        ? parseFloat(row.price_per_sqm.trim())
        : (typeof row.price_per_sqm === 'number' ? row.price_per_sqm : null);
      
      return {
        ...row,
        sale_value_nis: saleValueNis, // Ensure numeric type
        estimated_price_ils: saleValueNis, // Add estimated_price_ils alias (numeric)
        price_per_sqm: pricePerSqm // Ensure numeric type
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
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error keys:', Object.keys(error));
    if (error.message) console.error('❌ Error message:', error.message);
    if (error.code) console.error('❌ Error code:', error.code);
    if (error.detail) console.error('❌ Error detail:', error.detail);
    if (error.hint) console.error('❌ Error hint:', error.hint);
    if (error.query) console.error('❌ Failed query:', error.query);
    if (error.position) console.error('❌ Error position:', error.position);
    
    return res.status(500).json({
      success: false,
      error: error.message || error.toString() || 'Failed to search asset details',
      details: error.detail || error.hint || 'Unknown database error',
      code: error.code || 'UNKNOWN'
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
        MIN(year_of_construction) as min_year,
        MAX(year_of_construction) as max_year,
        MIN(surface) as min_surface,
        MAX(surface) as max_surface,
        MIN(sale_day) as earliest_transaction,
        MAX(sale_day) as latest_transaction
      FROM properties
      WHERE surface IS NOT NULL
        AND sale_day IS NOT NULL
        AND sale_value_nis IS NOT NULL
        AND surface > 0
        AND CAST(sale_value_nis AS NUMERIC) > 0
    `;

    // Query 2: Get distinct settlements (from properties table, limit to reasonable number)
    const citiesQuery = `
      SELECT DISTINCT settlement
      FROM properties
      WHERE settlement IS NOT NULL
        AND surface IS NOT NULL
        AND sale_day IS NOT NULL
        AND surface > 0
        AND CAST(sale_value_nis AS NUMERIC) > 0
      ORDER BY settlement
      LIMIT 500
    `;

    // Query 3: Approximate count from system catalog (instant!)
    const countQuery = `
      SELECT reltuples::bigint AS approximate_count
      FROM pg_class
      WHERE relname = 'properties'
    `;

    const startTime = Date.now();
    const [rangesResult, citiesResult, countResult] = await Promise.all([
      db.query(rangesQuery),
      db.query(citiesQuery),
      db.query(countQuery)
    ]);
    const queryTime = Date.now() - startTime;

    const settlements = citiesResult.rows.map(r => r.settlement);
    const stats = {
      ...rangesResult.rows[0],
      settlement_count: settlements.length,
      settlements: settlements,
      city_count: settlements.length, // Keep for backward compatibility
      cities: settlements, // Keep for backward compatibility
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
    const { selectedIds, propertyArea, apartmentSqm, balconySqm, balconyCoef } = req.body;

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
        p.id,
        p.sale_day as sale_day,
        COALESCE(
          NULLIF(
            TRIM(
              COALESCE(ad.street, '') || 
              CASE WHEN ad.street IS NOT NULL AND ad.house_number IS NOT NULL THEN ' ' ELSE '' END ||
              COALESCE(ad.house_number::text, '') ||
              CASE WHEN (ad.street IS NOT NULL OR ad.house_number IS NOT NULL) AND ad.city IS NOT NULL THEN ', ' ELSE '' END ||
              COALESCE(ad.city, '')
            ),
            ''
          ),
          p.settlement,
          'N/A'
        ) as address,
        COALESCE(ad.street, 'N/A') as street,
        COALESCE(ad.house_number::text, 'N/A') as house_number,
        COALESCE(ad.city, p.settlement, 'N/A') as city,
        p.settlement,
        p.block_of_land,
        p.rooms,
        COALESCE(ad.floor, NULL) as floor,
        p.surface,
        p.year_of_construction as year_of_constru,
        p.sale_value_nis,
        CASE 
          WHEN p.surface > 0 AND CAST(p.sale_value_nis AS NUMERIC) > 0 
          THEN ROUND(CAST(p.sale_value_nis AS NUMERIC) / p.surface)
          ELSE NULL
        END as price_per_sqm,
        p.asset_type
      FROM properties p
      LEFT JOIN asset_details ad ON p.id = ad.property_id
      WHERE p.id IN (${placeholders})
    `;

    const result = await db.query(query, selectedIds);
    
    // Process comparables: add estimated_price_ils alias and ensure numeric types
    const comparables = result.rows.map(row => {
      // Parse sale_value_nis from string to number (it's stored as character varying)
      const saleValueNis = typeof row.sale_value_nis === 'string' 
        ? parseFloat(row.sale_value_nis.trim()) 
        : (typeof row.sale_value_nis === 'number' ? row.sale_value_nis : null);
      
      // Ensure price_per_sqm is numeric
      const pricePerSqm = typeof row.price_per_sqm === 'string'
        ? parseFloat(row.price_per_sqm.trim())
        : (typeof row.price_per_sqm === 'number' ? row.price_per_sqm : null);
      
      return {
        ...row,
        sale_value_nis: saleValueNis, // Ensure numeric type
        estimated_price_ils: saleValueNis, // Add estimated_price_ils alias (numeric)
        price_per_sqm: pricePerSqm // Ensure numeric type
      };
    });

    const isDev = process.env.NODE_ENV !== 'production';
    const isVercel = process.env.VERCEL === '1';
    
    if (isDev && !isVercel) {
      console.log('📊 Fetched comparables:', comparables.length);
      console.log('📊 Sample comparable:', comparables[0]);
    }

    // Calculate statistics
    // CRITICAL: Parse sale_value_nis from string to number (it's stored as character varying)
    const prices = comparables
      .map(c => {
        const price = c.sale_value_nis;
        // Handle string values from database
        if (typeof price === 'string') {
          const parsed = parseFloat(price.trim());
          return isNaN(parsed) || parsed <= 0 ? null : parsed;
        }
        // Handle numeric values
        return (typeof price === 'number' && price > 0) ? price : null;
      })
      .filter(p => p !== null && p > 0);
    
    if (isDev && !isVercel) {
      console.log('📊 Valid prices:', prices.length, 'values:', prices.slice(0, 3));
    }
    
    // CRITICAL: Parse price_per_sqm to number (might be string or numeric)
    const pricesPerSqm = comparables
      .map(c => {
        const price = c.price_per_sqm;
        // Handle string values
        if (typeof price === 'string') {
          const parsed = parseFloat(price.trim());
          return isNaN(parsed) || parsed <= 0 ? null : parsed;
        }
        // Handle numeric values
        return (typeof price === 'number' && price > 0) ? price : null;
      })
      .filter(p => p !== null && p > 0);

    if (isDev && !isVercel) {
      console.log('📊 Valid prices per sqm:', pricesPerSqm.length, 'values:', pricesPerSqm.slice(0, 3));
    }

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

    // Estimate property value using Section 5.2 calculation logic:
    // effective_sqm = apartment_sqm + (balcony_sqm * balcony_coef)
    // asset_value_nis = final_price_per_sqm * effective_sqm
    
    // Use medianPricePerSqm for more robust estimation (less affected by outliers)
    // Fall back to averagePricePerSqm if median is not available
    const pricePerSqmForEstimation = medianPricePerSqm > 0 ? medianPricePerSqm : averagePricePerSqm;
    
    // Calculate effective area using Section 5.2 logic
    // If apartmentSqm and balconySqm are provided, use them; otherwise fall back to propertyArea
    let effectiveSqm = 0;
    const coef = (balconyCoef !== undefined && balconyCoef !== null) ? parseFloat(balconyCoef) : 0.5; // Default 0.5
    const validCoef = Math.max(0.1, Math.min(1.5, coef)); // Clamp to 0.1-1.5 range
    
    if (apartmentSqm && apartmentSqm > 0) {
      const aptArea = parseFloat(apartmentSqm);
      const balconyArea = (balconySqm && balconySqm > 0) ? parseFloat(balconySqm) : 0;
      // Calculate effective area: apartment + (balcony * coefficient)
      effectiveSqm = Math.ceil(aptArea + (balconyArea * validCoef)); // Round up to whole sqm
    } else if (propertyArea && propertyArea > 0) {
      // Fallback: use propertyArea as effective area (assumes it's already equivalent area)
      effectiveSqm = Math.ceil(parseFloat(propertyArea));
    }
    
    if (effectiveSqm > 0 && pricePerSqmForEstimation > 0) {
      // Calculate asset value: price per sqm * effective sqm
      const rawValue = pricePerSqmForEstimation * effectiveSqm;
      // Round to nearest 1,000 NIS
      analysis.estimatedValue = Math.round(rawValue / 1000) * 1000;
      analysis.estimatedRange = {
        low: Math.round(analysis.estimatedValue * 0.9),
        high: Math.round(analysis.estimatedValue * 1.1)
      };
      
      // Include calculation details for transparency
      analysis.estimationMethod = medianPricePerSqm > 0 ? 'median' : 'average';
      analysis.effectiveSqm = effectiveSqm;
      analysis.apartmentSqm = apartmentSqm ? parseFloat(apartmentSqm) : null;
      analysis.balconySqm = (balconySqm && balconySqm > 0) ? parseFloat(balconySqm) : null;
      analysis.balconyCoef = validCoef;
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
        p.id,
        p.sale_day as sale_day,
        COALESCE(
          NULLIF(
            TRIM(
              COALESCE(ad.street, '') || 
              CASE WHEN ad.street IS NOT NULL AND ad.house_number IS NOT NULL THEN ' ' ELSE '' END ||
              COALESCE(ad.house_number::text, '') ||
              CASE WHEN (ad.street IS NOT NULL OR ad.house_number IS NOT NULL) AND ad.city IS NOT NULL THEN ', ' ELSE '' END ||
              COALESCE(ad.city, '')
            ),
            ''
          ),
          p.settlement,
          'N/A'
        ) as address,
        COALESCE(ad.street, 'N/A') as street,
        COALESCE(ad.house_number::text, 'N/A') as house_number,
        COALESCE(ad.city, p.settlement, 'N/A') as city,
        p.settlement,
        p.block_of_land,
        p.rooms,
        COALESCE(ad.floor, NULL) as floor,
        p.surface,
        p.year_of_construction as year_of_constru,
        p.sale_value_nis,
        CASE 
          WHEN p.surface > 0 AND CAST(p.sale_value_nis AS NUMERIC) > 0 
          THEN ROUND(CAST(p.sale_value_nis AS NUMERIC) / p.surface)
          ELSE NULL
        END as price_per_sqm,
        p.asset_type
      FROM properties p
      LEFT JOIN asset_details ad ON p.id = ad.property_id
      WHERE p.id IN (${placeholders})
      ORDER BY p.sale_day DESC
    `;

    const result = await db.query(query, selectedIds);
    
    // Add estimated_price_ils alias
    const selectedComparables = result.rows.map(row => {
      return {
        ...row,
        estimated_price_ils: row.sale_value_nis, // Add estimated_price_ils alias
        price_per_sqm: row.price_per_sqm // Already calculated in SQL
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

/**
 * GET /api/asset-details/property-types
 * Get distinct property types from the database for filter dropdown
 */
router.get('/property-types', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT asset_type
      FROM properties
      WHERE asset_type IS NOT NULL
        AND asset_type != ''
      ORDER BY asset_type
    `;

    const result = await db.query(query);
    const types = result.rows.map(r => r.asset_type);

    return res.json({
      success: true,
      types: types,
      count: types.length
    });
  } catch (error) {
    console.error('❌ Failed to get property types:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get property types'
    });
  }
});

module.exports = router;

