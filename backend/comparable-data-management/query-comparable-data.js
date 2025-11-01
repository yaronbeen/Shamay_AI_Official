#!/usr/bin/env node

/**
 * Backend Script: Query Comparable Data
 * 
 * This script is called by the frontend API to query the database
 * CRITICAL: Database client logic is inlined here to avoid require issues in Vercel
 */

// CRITICAL: Don't use dotenv in Vercel - env vars are automatically available
// dotenv is only needed for local development, but Vercel provides env vars automatically
// In Vercel, env vars are already loaded, so we skip dotenv entirely
// We don't need to import dotenv at all in Vercel production

// Lazy-load database client based on environment
let ClientClass = null;

async function getClientClass() {
  if (ClientClass) return ClientClass;
  
  try {
    // Try Neon serverless first (for Vercel)
    if (process.env.VERCEL || process.env.DATABASE_URL) {
      const neon = await import('@neondatabase/serverless');
      ClientClass = neon.Client;
      console.log('✅ Using @neondatabase/serverless for comparable data');
    } else {
      // Use standard pg for local development
      const pg = await import('pg');
      ClientClass = pg.Client;
      console.log('✅ Using pg for comparable data (local development)');
    }
  } catch (e) {
    // Fallback to pg if Neon not available
    const pg = await import('pg');
    ClientClass = pg.Client;
    console.log('✅ Using pg for comparable data (fallback)');
  }
  
  return ClientClass;
}

async function createDatabaseClient(organizationId, userId) {
  const Client = await getClientClass();
  
  const isLocal = process.env.DB_HOST === 'localhost' || !process.env.DB_HOST || process.env.DB_HOST?.includes('127.0.0.1');
  const useNeon = process.env.VERCEL || process.env.DATABASE_URL;
  
  let client;
  
  // Use DATABASE_URL if available (Vercel/Neon), otherwise use individual env vars
  if (useNeon && process.env.DATABASE_URL) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'shamay_land_registry',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      // Add SSL configuration for remote databases
      ssl: isLocal ? false : {
        rejectUnauthorized: false,
        require: true
      }
    });
  }
  
  await client.connect();
  console.log('✅ Connected to PostgreSQL database (Comparable Data)');
  
  return client;
}

async function queryComparableData() {
  let client = null;
  
  try {
    console.log('🔍 Backend: Starting comparable data query...');
    
    // CRITICAL: Get organization_id and user_id from environment for data isolation
    const organizationId = process.env.ORGANIZATION_ID || null;
    const userId = process.env.USER_ID || null;
    
    // Create database client
    client = await createDatabaseClient(organizationId, userId);
    
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
    
    const result = await client.query(query, queryParams);
    
    console.log('✅ Query successful:', result.rows.length, 'records found');
    
    // Close database connection
    await client.end();
    console.log('🔌 Disconnected from database');
    
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
    
    // Close database connection if it exists
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
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
