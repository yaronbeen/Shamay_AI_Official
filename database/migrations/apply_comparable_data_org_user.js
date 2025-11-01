#!/usr/bin/env node

/**
 * Migration Script: Apply Organization and User Isolation to Comparable Data
 * 
 * This script:
 * 1. Adds organization_id and user_id columns to comparable_data table
 * 2. Updates existing records with default organization/user if needed
 * 3. Creates indexes for performance
 */

import { config } from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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

async function applyMigration() {
  const isLocal = process.env.DB_HOST === 'localhost' || !process.env.DB_HOST || process.env.DB_HOST.includes('127.0.0.1');
  const useNeon = process.env.VERCEL || process.env.DATABASE_URL;
  
  let client;
  
  try {
    // Get the appropriate Client class
    const Client = getClientClass();
    
    // Create database client
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
        ssl: isLocal ? false : {
          rejectUnauthorized: false,
          require: true
        }
      });
    }
    
    await client.connect();
    console.log('✅ Connected to database');
    
    // Step 1: Add columns if they don't exist
    console.log('\n📊 Step 1: Adding organization_id and user_id columns...');
    await client.query(`
      ALTER TABLE comparable_data 
      ADD COLUMN IF NOT EXISTS organization_id TEXT,
      ADD COLUMN IF NOT EXISTS user_id TEXT;
    `);
    console.log('✅ Columns added (or already exist)');
    
    // Step 2: Create indexes
    console.log('\n📊 Step 2: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comparable_data_organization_id ON comparable_data(organization_id);
      CREATE INDEX IF NOT EXISTS idx_comparable_data_user_id ON comparable_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_comparable_data_org_user ON comparable_data(organization_id, user_id);
    `);
    console.log('✅ Indexes created (or already exist)');
    
    // Step 3: Check for existing records without org/user
    console.log('\n📊 Step 3: Checking for existing records without organization_id/user_id...');
    const checkResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM comparable_data 
      WHERE organization_id IS NULL OR user_id IS NULL
    `);
    
    const recordsNeedingUpdate = parseInt(checkResult.rows[0].count);
    console.log(`📊 Found ${recordsNeedingUpdate} records that need organization_id/user_id`);
    
    // Step 4: Update existing records with default values
    if (recordsNeedingUpdate > 0) {
      console.log('\n📊 Step 4: Updating existing records with default organization/user...');
      const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID || 'default-org';
      const defaultUserId = process.env.DEFAULT_USER_ID || 'system';
      
      const updateResult = await client.query(`
        UPDATE comparable_data 
        SET 
          organization_id = COALESCE(organization_id, $1),
          user_id = COALESCE(user_id, $2)
        WHERE organization_id IS NULL OR user_id IS NULL
      `, [defaultOrgId, defaultUserId]);
      
      console.log(`✅ Updated ${updateResult.rowCount} records with organization_id='${defaultOrgId}' and user_id='${defaultUserId}'`);
    } else {
      console.log('✅ All records already have organization_id and user_id');
    }
    
    // Step 5: Add comments
    console.log('\n📊 Step 5: Adding column comments...');
    await client.query(`
      COMMENT ON COLUMN comparable_data.organization_id IS 'Organization/Company ID that owns this data';
      COMMENT ON COLUMN comparable_data.user_id IS 'User ID who imported/created this record';
    `);
    console.log('✅ Comments added');
    
    // Step 6: Verify migration
    console.log('\n📊 Step 6: Verifying migration...');
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT organization_id) as unique_organizations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE organization_id IS NULL) as null_org_count,
        COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_count
      FROM comparable_data
    `);
    
    const stats = verifyResult.rows[0];
    console.log('✅ Migration verification:');
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Unique organizations: ${stats.unique_organizations}`);
    console.log(`   Unique users: ${stats.unique_users}`);
    console.log(`   Records with NULL organization_id: ${stats.null_org_count}`);
    console.log(`   Records with NULL user_id: ${stats.null_user_count}`);
    
    if (parseInt(stats.null_org_count) > 0 || parseInt(stats.null_user_count) > 0) {
      console.log('\n⚠️  Warning: Some records still have NULL organization_id or user_id');
      console.log('   These records may not be properly isolated');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('   All records now have organization_id and user_id');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('\n🔌 Disconnected from database');
    }
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

