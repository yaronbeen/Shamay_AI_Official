#!/usr/bin/env node

/**
 * Backend Script: Query Comparable Data
 * 
 * This script is called by the frontend API to query the database
 * using the backend database client for consistent data access
 */

import { ComparableDataDatabaseClient } from './database-client.js';

async function queryComparableData() {
  try {
    console.log('🔍 Backend: Starting comparable data query...');
    
    // CRITICAL: Get organization_id and user_id from environment for data isolation
    const organizationId = process.env.ORGANIZATION_ID || null;
    const userId = process.env.USER_ID || null;
    
    const db = new ComparableDataDatabaseClient(organizationId, userId);
    await db.connect();
    
    // Get query parameters from environment variables
    const city = process.env.QUERY_CITY || '';
    const neighborhood = process.env.QUERY_NEIGHBORHOOD || '';
    const rooms = process.env.QUERY_ROOMS || '';
    const area = process.env.QUERY_AREA || '';
    
    console.log('📊 Query parameters:', { city, neighborhood, rooms, area, organizationId, userId });
    
    // Build query based on parameters
    // CRITICAL: Add organization_id and user_id filters for data isolation
    // NOTE: Removed is_valid and status filters as they don't exist in all schema versions
    let query = `
      SELECT 
        id, 
        address, 
        rooms, 
        floor_number as floor, 
        apartment_area_sqm as area, 
        declared_price as price, 
        price_per_sqm_rounded as price_per_sqm, 
        sale_date,
        city, 
        construction_year as building_year,
        parking_spaces as parking,
        data_quality_score
      FROM comparable_data 
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // CRITICAL: Add organization and user filters
    if (organizationId) {
      query += ` AND (organization_id = $${paramCount} OR (organization_id IS NULL AND $${paramCount} IS NULL))`;
      queryParams.push(organizationId);
      paramCount++;
    }
    
    if (userId) {
      query += ` AND (user_id = $${paramCount} OR (user_id IS NULL AND $${paramCount} IS NULL))`;
      queryParams.push(userId);
      paramCount++;
    }
    
    // Add search filters
    if (city) {
      query += ` AND city ILIKE $${paramCount}`;
      queryParams.push(`%${city}%`);
      paramCount++;
    }
    
    if (neighborhood) {
      query += ` AND street_name ILIKE $${paramCount}`;
      queryParams.push(`%${neighborhood}%`);
      paramCount++;
    }
    
    if (rooms) {
      query += ` AND rooms = $${paramCount}`;
      queryParams.push(parseInt(rooms));
      paramCount++;
    }
    
    if (area) {
      const areaNum = parseInt(area);
      query += ` AND apartment_area_sqm BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(areaNum - 20, areaNum + 20);
      paramCount += 2;
    }
    
    query += ` ORDER BY sale_date DESC LIMIT 20`;
    
    console.log('📊 Executing query:', query);
    console.log('📊 Query params:', queryParams);
    
    const result = await db.client.query(query, queryParams);
    
    console.log('✅ Query successful:', result.rows.length, 'records found');
    
    await db.disconnect();
    
    // Return results in JSON format
    console.log(JSON.stringify({
      success: true,
      data: result.rows,
      count: result.rows.length,
      query: {
        city,
        neighborhood,
        rooms,
        area
      }
    }));
    
  } catch (error) {
    console.error('❌ Backend query error:', error);
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }));
    process.exit(1);
  }
}

// Run the query
queryComparableData();
