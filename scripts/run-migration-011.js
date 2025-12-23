#!/usr/bin/env node
/**
 * Run migration 011: Add all missing Step 1 fields to shuma table
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config({ path: join(__dirname, '../backend/.env') });
dotenv.config({ path: join(__dirname, '../.env') });

// Import database client (CommonJS module)
const { db } = require('../frontend/src/lib/shumadb.js');

async function runMigration() {
  const client = await db.client();
  
  try {
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'database', 'migrations', '011_add_all_missing_step1_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration 011...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully');

    // Verify columns exist
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'shuma'
      AND column_name IN (
        'valuation_type',
        'valuation_date',
        'valuation_effective_date',
        'client_title',
        'client_note',
        'client_relation',
        'land_contamination',
        'land_contamination_note'
      )
      ORDER BY column_name;
    `);

    console.log('\n📊 Verified columns in shuma table:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    if (result.rows.length === 8) {
      console.log('\n✅ All 8 required columns exist!');
    } else {
      console.log(`\n⚠️  Expected 8 columns, found ${result.rows.length}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // If column already exists, that's okay
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('ℹ️  Some columns already exist, continuing...');
    } else {
      console.error(error.stack);
      throw error;
    }
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

