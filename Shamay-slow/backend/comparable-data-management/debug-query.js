/**
 * Debug Query Script
 * Check what records exist and their organization_id/user_id values
 */

import { config } from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

config();

function getClientClass() {
  try {
    if (process.env.VERCEL || process.env.DATABASE_URL) {
      try {
        const neon = require('@neondatabase/serverless');
        return neon.Client;
      } catch (e) {
        const pg = require('pg');
        return pg.Client;
      }
    } else {
      const pg = require('pg');
      return pg.Client;
    }
  } catch (e) {
    const pg = require('pg');
    return pg.Client;
  }
}

async function debugQuery() {
  const Client = getClientClass();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.VERCEL || process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check total records
    const totalResult = await client.query('SELECT COUNT(*) as total FROM comparable_data');
    console.log(`\n📊 Total records in database: ${totalResult.rows[0].total}`);

    // Check organization_id distribution
    const orgResult = await client.query(`
      SELECT 
        organization_id, 
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM comparable_data 
      GROUP BY organization_id
      ORDER BY count DESC
    `);
    console.log('\n📊 Organization ID distribution:');
    orgResult.rows.forEach(row => {
      console.log(`   organization_id: ${row.organization_id || 'NULL'} - ${row.count} records (${row.unique_users} unique users)`);
    });

    // Check user_id distribution
    const userResult = await client.query(`
      SELECT 
        user_id, 
        COUNT(*) as count
      FROM comparable_data 
      GROUP BY user_id
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('\n📊 User ID distribution (top 10):');
    userResult.rows.forEach(row => {
      console.log(`   user_id: ${row.user_id || 'NULL'} - ${row.count} records`);
    });

    // Check sample records
    const sampleResult = await client.query(`
      SELECT 
        id, 
        address, 
        city, 
        organization_id, 
        user_id,
        created_at
      FROM comparable_data 
      ORDER BY id DESC
      LIMIT 5
    `);
    console.log('\n📊 Sample records (latest 5):');
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, Address: ${row.address}, City: ${row.city}`);
      console.log(`      organization_id: ${row.organization_id || 'NULL'}, user_id: ${row.user_id || 'NULL'}`);
    });

    // Test the actual query being used
    const organizationId = process.env.ORGANIZATION_ID || 'default-org';
    // CRITICAL: Try with 'dev-user-id' since that's what's in the database
    const userId = process.env.USER_ID || 'dev-user-id';
    
    console.log(`\n🔍 Testing query with:`);
    console.log(`   organizationId: ${organizationId || 'NULL'}`);
    console.log(`   userId: ${userId || 'NULL'}`);

    let testQuery = `
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

    if (organizationId) {
      testQuery += ` AND (organization_id = $${paramCount} OR organization_id = 'default-org' OR organization_id IS NULL)`;
      queryParams.push(organizationId);
      paramCount++;
    } else {
      testQuery += ` AND (organization_id = 'default-org' OR organization_id IS NULL)`;
    }

    if (userId) {
      // CRITICAL: Handle user_id stored as JSON array (legacy bug) - check if it contains the userId
      // Also handle case where user_id is stored as JSON array (like {"1762001339354","dev-user-id"})
      testQuery += ` AND (
        user_id = $${paramCount} 
        OR user_id IS NULL 
        OR user_id = 'system'
        OR user_id::text LIKE '%"' || $${paramCount} || '"%'
        OR user_id::text LIKE '%' || $${paramCount} || '%'
      )`;
      queryParams.push(userId);
      paramCount++;
    } else {
      testQuery += ` AND (
        user_id IS NULL 
        OR user_id = 'system'
        OR user_id::text LIKE '%"system"%'
        OR user_id::text LIKE '%system%'
      )`;
    }

    testQuery += ` ORDER BY sale_date DESC LIMIT 20`;

    console.log(`\n📊 Executing test query:`);
    console.log(testQuery);
    console.log(`📊 Query params:`, queryParams);

    const testResult = await client.query(testQuery, queryParams);
    console.log(`\n✅ Test query result: ${testResult.rows.length} records found`);

    if (testResult.rows.length > 0) {
      console.log('\n📊 Sample results:');
      testResult.rows.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, Address: ${row.address || 'N/A'}, City: ${row.city || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No records found! Checking what might be wrong...');
      
      // Check if records exist without filters
      const noFilterResult = await client.query('SELECT COUNT(*) as total FROM comparable_data WHERE 1=1');
      console.log(`   Records without filters: ${noFilterResult.rows[0].total}`);
      
      // Check records with just org filter
      if (organizationId) {
        const orgFilterResult = await client.query(
          `SELECT COUNT(*) as total FROM comparable_data WHERE (organization_id = $1 OR organization_id = 'default-org' OR organization_id IS NULL)`,
          [organizationId]
        );
        console.log(`   Records with org filter (${organizationId}): ${orgFilterResult.rows[0].total}`);
      }
      
      // Check records with just user filter
      if (userId) {
        const userFilterResult = await client.query(
          `SELECT COUNT(*) as total FROM comparable_data WHERE (user_id = $1 OR user_id IS NULL OR user_id = 'system')`,
          [userId]
        );
        console.log(`   Records with user filter (${userId}): ${userFilterResult.rows[0].total}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

debugQuery();

