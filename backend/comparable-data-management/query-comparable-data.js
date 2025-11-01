#!/usr/bin/env node

/**
 * Backend Script: Query Comparable Data
 * 
 * This script is called by the frontend API to query the database
 * using the backend database client for consistent data access
 */

// CRITICAL: Use CommonJS require for Vercel compatibility
// database-client.js uses CommonJS (require/module.exports)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// CRITICAL: Resolve database-client.js path - try multiple locations for Vercel compatibility
let databaseClientPath = resolve(__dirname, 'database-client.js');

// If not found, try alternative paths (for Vercel)
if (!existsSync(databaseClientPath)) {
  const alternatives = [
    join(__dirname, 'database-client.js'),
    join(process.cwd(), 'backend', 'comparable-data-management', 'database-client.js'),
    join(process.cwd(), 'comparable-data-management', 'database-client.js'),
    join('/var/task', 'backend', 'comparable-data-management', 'database-client.js'),
    join('/var/task', 'comparable-data-management', 'database-client.js'),
    // Try relative paths from current working directory
    resolve(process.cwd(), 'backend', 'comparable-data-management', 'database-client.js'),
    resolve(process.cwd(), 'comparable-data-management', 'database-client.js'),
  ];
  
  for (const altPath of alternatives) {
    if (existsSync(altPath)) {
      databaseClientPath = altPath;
      console.log('✅ Found database-client.js at:', databaseClientPath);
      break;
    }
  }
}

console.log('🔍 Loading database-client.js from:', databaseClientPath);
console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 __dirname:', __dirname);
console.log('🔍 File exists?', existsSync(databaseClientPath));

// Use require for CommonJS module - with error handling
let ComparableDataDatabaseClient;
try {
  if (!existsSync(databaseClientPath)) {
    // Last resort: try to require with relative path
    try {
      const relativePath = './database-client.js';
      ComparableDataDatabaseClient = require(relativePath).ComparableDataDatabaseClient;
      console.log('✅ Loaded database-client.js using relative path');
    } catch (relError) {
      console.error('❌ Failed to load with relative path:', relError.message);
      throw new Error(`Cannot find database-client.js. Tried: ${databaseClientPath} and relative path`);
    }
  } else {
    ComparableDataDatabaseClient = require(databaseClientPath).ComparableDataDatabaseClient;
    console.log('✅ Loaded database-client.js successfully');
  }
} catch (requireError) {
  console.error('❌ Failed to require database-client.js:', requireError.message);
  console.error('❌ Require stack:', requireError.stack);
  throw requireError;
}

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
    
    console.log('📊 Query parameters:', { city, neighborhood, rooms, area });
    console.log('🔐 Data isolation:', { organizationId: organizationId || 'NULL', userId: userId || 'NULL' });
    
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
    
    // CRITICAL: Add organization and user filters for data isolation
    // Show records that match the user's organization OR default-org (shared data) OR NULL (legacy data)
    if (organizationId) {
      // Show user's organization records OR default-org records OR NULL (legacy/unassigned data)
      query += ` AND (organization_id = $${paramCount} OR organization_id = 'default-org' OR organization_id IS NULL)`;
      queryParams.push(organizationId);
      paramCount++;
    } else {
      // If no organization ID provided, show default-org records and NULL organization_id (legacy/unassigned data)
      query += ` AND (organization_id = 'default-org' OR organization_id IS NULL)`;
    }
    
    // For user_id: Show user's records OR shared records (user_id IS NULL or 'system') within the organization
    // ALSO include records with NULL user_id (legacy data that hasn't been assigned)
    // CRITICAL: Handle user_id stored as JSON array (legacy bug) - check if it contains the userId
    if (userId) {
      // Show user's records OR shared records (user_id IS NULL or 'system') within the organization
      // Also handle case where user_id is stored as JSON array (like {"1762001339354","dev-user-id"})
      // We check if the user_id contains the userId as a substring
      query += ` AND (
        user_id = $${paramCount} 
        OR user_id IS NULL 
        OR user_id = 'system'
        OR user_id::text LIKE '%"' || $${paramCount} || '"%'
        OR user_id::text LIKE '%' || $${paramCount} || '%'
      )`;
      queryParams.push(userId);
      paramCount++;
    } else {
      // If no userId, show shared records (user_id IS NULL or 'system') for the organization
      // But also include JSON array format records
      query += ` AND (
        user_id IS NULL 
        OR user_id = 'system'
        OR user_id::text LIKE '%"system"%'
      )`;
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
