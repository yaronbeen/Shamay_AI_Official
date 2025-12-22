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

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to try resolving module from multiple paths
async function tryImportNeon() {
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV === 'production';
  
  if (isVercel) {
    // CRITICAL: In Vercel, when we spawn a script, it doesn't have direct access to
    // the parent process's node_modules. We need to find the actual path first.
    
    // Step 1: Try to find the package by checking actual file system
    // This is more reliable than relying on module resolution
    const possibleNodeModulesDirs = [
      '/var/task/.next/server/node_modules', // Next.js bundled (MOST LIKELY)
      '/var/task/frontend/.next/server/node_modules',
      '/var/task/node_modules',
      '/var/task/frontend/node_modules',
      '/var/task/backend/node_modules',
      join(process.cwd(), '.next', 'server', 'node_modules'),
      join(process.cwd(), 'node_modules'),
      join(process.cwd(), 'frontend', 'node_modules'),
      join(__dirname, '..', '..', '.next', 'server', 'node_modules'),
      join(__dirname, '..', '..', 'node_modules'),
      join(__dirname, '..', '..', 'frontend', 'node_modules')
    ];
    
    // First, find where the package actually exists
    let foundPath = null;
    for (const nodeModulesDir of possibleNodeModulesDirs) {
      const packagePath = join(nodeModulesDir, '@neondatabase', 'serverless');
      const indexPath = join(packagePath, 'index.js');
      const packageJsonPath = join(packagePath, 'package.json');
      
      if (existsSync(packagePath) || existsSync(indexPath) || existsSync(packageJsonPath)) {
        foundPath = packagePath;
        console.log(`✅ Found package at: ${foundPath}`);
        break;
      }
    }
    
    // Step 2: If we found the path, use it directly
    if (foundPath) {
      try {
        // Try using createRequire with the found path
        const require = createRequire(import.meta.url);
        
        // Try to require the package directly from the found path
        try {
          const neon = require(foundPath);
          if (neon.Client || neon.default?.Client) {
            console.log(`✅ Successfully imported from found path: ${foundPath}`);
            return neon;
          }
        } catch (requireError) {
          // If direct require fails, try importing the index.js file
          try {
            const indexPath = join(foundPath, 'index.js');
            if (existsSync(indexPath)) {
              const neon = require(indexPath);
              if (neon.Client || neon.default?.Client) {
                console.log(`✅ Successfully imported from index: ${indexPath}`);
                return neon;
              }
            }
          } catch (indexError) {
            console.log(`❌ Failed to require from ${foundPath}: ${indexError.message}`);
          }
        }
        
        // Try ES module import from the found path
        try {
          const indexPath = join(foundPath, 'index.js');
          if (existsSync(indexPath)) {
            const neon = await import('file://' + indexPath);
            if (neon.Client || neon.default?.Client) {
              console.log(`✅ Successfully imported using ES import from: ${indexPath}`);
              return neon;
            }
          }
        } catch (importError) {
          console.log(`❌ Failed to ES import from ${foundPath}: ${importError.message}`);
        }
      } catch (e) {
        console.log(`❌ Failed to import from found path ${foundPath}: ${e.message}`);
      }
    }
    
    // Step 3: Fallback to createRequire with resolve (uses NODE_PATH)
    try {
      console.log('🔍 Trying createRequire with resolve: @neondatabase/serverless');
      const require = createRequire(import.meta.url);
      
      // Try to resolve the module - this will find it if it exists anywhere in the path
      try {
        const resolvedPath = require.resolve('@neondatabase/serverless');
        console.log(`✅ Resolved to: ${resolvedPath}`);
        const neon = require(resolvedPath);
        if (neon.Client || neon.default?.Client) {
          console.log('✅ Successfully imported using createRequire resolve');
          return neon;
        }
      } catch (resolveError) {
        console.log('❌ createRequire resolve failed:', resolveError.message);
      }
      
      // Fallback: try direct require
      try {
        const neon = require('@neondatabase/serverless');
        if (neon.Client || neon.default?.Client) {
          console.log('✅ Successfully imported using direct require');
          return neon;
        }
      } catch (requireError) {
        console.log('❌ Direct require failed:', requireError.message);
      }
    } catch (e) {
      console.log('❌ createRequire failed:', e.message);
    }
    
    // Try standard ES import (uses NODE_PATH)
    try {
      console.log('🔍 Trying standard import: @neondatabase/serverless');
      const neon = await import('@neondatabase/serverless');
      if (neon.Client || neon.default?.Client) {
        console.log('✅ Successfully imported using standard import');
        return neon;
      }
    } catch (e) {
      console.log('❌ Standard import failed:', e.message);
    }
    
    // Try absolute paths with file existence check
    // CRITICAL: In Vercel, Next.js bundles node_modules in .next/server/node_modules
    const possiblePaths = [
      '/var/task/.next/server/node_modules/@neondatabase/serverless', // Next.js bundled - MOST IMPORTANT
      '/var/task/frontend/.next/server/node_modules/@neondatabase/serverless',
      '/var/task/node_modules/@neondatabase/serverless',
      '/var/task/frontend/node_modules/@neondatabase/serverless',
      '/var/task/backend/node_modules/@neondatabase/serverless',
      join(process.cwd(), '.next', 'server', 'node_modules', '@neondatabase', 'serverless'),
      join(process.cwd(), 'node_modules', '@neondatabase', 'serverless'),
      join(process.cwd(), 'frontend', 'node_modules', '@neondatabase', 'serverless'),
      join(__dirname, '..', '..', '.next', 'server', 'node_modules', '@neondatabase', 'serverless'),
      join(__dirname, '..', '..', 'node_modules', '@neondatabase', 'serverless'),
      join(__dirname, '..', '..', 'frontend', 'node_modules', '@neondatabase', 'serverless')
    ];
    
    for (const modulePath of possiblePaths) {
      try {
        // Check if directory exists first
        const indexPath = join(modulePath, 'index.js');
        const packageJsonPath = join(modulePath, 'package.json');
        
        if (existsSync(modulePath) || existsSync(indexPath) || existsSync(packageJsonPath)) {
          console.log(`🔍 Trying path (exists): ${modulePath}`);
          try {
            // Try as directory import
            const neon = await import('file://' + join(modulePath, 'index.js'));
            if (neon.Client || neon.default?.Client) {
              console.log(`✅ Successfully imported from: ${modulePath}`);
              return neon;
            }
          } catch (e) {
            // Try with require
            try {
              const require = createRequire(import.meta.url);
              const neon = require(modulePath);
              if (neon.Client || neon.default?.Client) {
                console.log(`✅ Successfully imported using require from: ${modulePath}`);
                return neon;
              }
            } catch (reqError) {
              console.log(`❌ Failed to import from ${modulePath}: ${reqError.message}`);
            }
          }
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    // Last resort: Check NODE_PATH and try to use it
    const nodePath = process.env.NODE_PATH || '';
    if (nodePath) {
      console.log(`🔍 NODE_PATH is set: ${nodePath}`);
      const paths = nodePath.split(':').filter(Boolean);
      for (const basePath of paths) {
        const fullPath = join(basePath, '@neondatabase', 'serverless');
        if (existsSync(fullPath)) {
          try {
            const require = createRequire(import.meta.url);
            const neon = require(fullPath);
            if (neon.Client || neon.default?.Client) {
              console.log(`✅ Successfully imported from NODE_PATH: ${fullPath}`);
              return neon;
            }
          } catch (e) {
            console.log(`❌ Failed to import from NODE_PATH ${fullPath}: ${e.message}`);
          }
        }
      }
    }
    
    throw new Error('Cannot find @neondatabase/serverless in any location. Check that it is installed in package.json.');
  } else {
    // Local: just try standard import
    return await import('@neondatabase/serverless');
  }
}

// Lazy-load database client based on environment
let ClientClass = null;

async function getClientClass() {
  if (ClientClass) return ClientClass;
  
  // CRITICAL: In Vercel, only use Neon - never try to import pg
  // pg is not available in Vercel serverless environment
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV === 'production';
  
  if (isVercel) {
    // Vercel: Only use Neon, don't try pg at all
    try {
      const neon = await tryImportNeon();
      ClientClass = neon.Client || neon.default?.Client;
      if (!ClientClass) {
        throw new Error('Client class not found in @neondatabase/serverless');
      }
      console.log('✅ Using @neondatabase/serverless for comparable data (Vercel)');
      return ClientClass;
    } catch (e) {
      console.error('❌ Failed to import @neondatabase/serverless in Vercel:', e.message);
      throw new Error('Cannot use pg in Vercel. @neondatabase/serverless must be available.');
    }
  } else {
    // Local development: Try Neon first, fallback to pg
    try {
      const neon = await import('@neondatabase/serverless');
      ClientClass = neon.Client;
      console.log('✅ Using @neondatabase/serverless for comparable data (local)');
      return ClientClass;
    } catch (neonError) {
      // Fallback to pg only in local development
      try {
        const pg = await import('pg');
        ClientClass = pg.Client;
        console.log('✅ Using pg for comparable data (local fallback)');
        return ClientClass;
      } catch (pgError) {
        console.error('❌ Failed to import both Neon and pg:', pgError.message);
        throw new Error('Cannot import database client. Need either @neondatabase/serverless or pg.');
      }
    }
  }
}

async function createDatabaseClient(organizationId, userId) {
  const Client = await getClientClass();
  
  // CRITICAL: In Vercel, MUST use DATABASE_URL - never fallback to individual env vars
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV === 'production';
  
  let client;
  
  if (isVercel) {
    // Vercel: Must use DATABASE_URL - no fallback
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in Vercel environment');
    }
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    // Local development: Use DATABASE_URL if available, otherwise use individual env vars
    if (process.env.DATABASE_URL) {
      client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    } else {
      const isLocal = process.env.DB_HOST === 'localhost' || !process.env.DB_HOST || process.env.DB_HOST?.includes('127.0.0.1');
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
    // CRITICAL: Neon serverless Client doesn't have .end() - connections are managed automatically
    // Only call .end() if it exists (for pg Client in local dev)
    if (typeof client.end === 'function') {
      await client.end();
      console.log('🔌 Disconnected from database');
    } else {
      // Neon serverless manages connections automatically - no need to close
      console.log('✅ Neon connection managed automatically');
    }
    
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
    // CRITICAL: Neon serverless Client doesn't have .end() - connections are managed automatically
    if (client && typeof client.end === 'function') {
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
