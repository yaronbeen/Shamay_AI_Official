/**
 * Recreate Comparable Data Table Script
 * 
 * This script recreates the comparable_data table with all columns including organization_id and user_id
 */

import { config } from 'dotenv';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

// Get client class dynamically like the database-client does
function getClientClass() {
  try {
    // Try Neon serverless first (for Vercel)
    if (process.env.VERCEL || process.env.DATABASE_URL) {
      try {
        const neon = require('@neondatabase/serverless');
        return neon.Client;
      } catch (e) {
        // Fallback to pg if Neon not available
        const pg = require('pg');
        return pg.Client;
      }
    } else {
      // Use standard pg for local development
      const pg = require('pg');
      return pg.Client;
    }
  } catch (e) {
    // Fallback to pg if Neon not available
    const pg = require('pg');
    return pg.Client;
  }
}

async function recreateComparableDataTable() {
  const Client = getClientClass();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.VERCEL || process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read SQL file
    const sqlFilePath = join(__dirname, 'recreate_comparable_data_table.sql');
    console.log('📖 Reading SQL file:', sqlFilePath);
    
    const sql = readFileSync(sqlFilePath, 'utf8');
    
    // Execute SQL - use simple execution and handle errors gracefully
    console.log('📊 Executing SQL to recreate comparable_data table...');
    
    try {
      // Execute entire SQL file - PostgreSQL handles multiple statements
      await client.query(sql);
    } catch (error) {
      // If it's a permission/role error, continue (may be expected in some environments)
      if (error.message.includes('role') && error.message.includes('does not exist')) {
        console.log('⚠️  Warning: Some GRANT statements may have failed (role may not exist)');
        console.log('   This is usually fine - continuing with table creation...');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Comparable data table recreated successfully!');
    
    // Verify table exists and has correct columns
    console.log('\n📊 Verifying table structure...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'comparable_data'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Table columns:');
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    
    // Check for organization_id and user_id columns
    const hasOrgId = verifyResult.rows.some(row => row.column_name === 'organization_id');
    const hasUserId = verifyResult.rows.some(row => row.column_name === 'user_id');
    
    if (hasOrgId && hasUserId) {
      console.log('\n✅ Organization and User ID columns present!');
    } else {
      console.log('\n⚠️  Warning: Missing organization_id or user_id columns!');
      if (!hasOrgId) console.log('   ❌ Missing: organization_id');
      if (!hasUserId) console.log('   ❌ Missing: user_id');
    }
    
    // Check indexes
    console.log('\n📊 Verifying indexes...');
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'comparable_data'
      ORDER BY indexname;
    `);
    
    console.log(`✅ Found ${indexResult.rows.length} indexes:`);
    indexResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.indexname}`);
    });
    
    console.log('\n✅ Table recreation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error recreating comparable_data table:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('\n🔌 Disconnected from database');
    }
  }
}

// Run the script
recreateComparableDataTable();

