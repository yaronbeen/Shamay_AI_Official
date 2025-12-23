#!/usr/bin/env node
/**
 * Migration script to add settings JSONB column to users table
 * This script uses the same database connection logic as the app
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import database client (CommonJS module)
const { db } = require('../../frontend/src/lib/shumadb.js');

async function runMigration() {
  const client = await db.client();
  
  try {
    console.log('🚀 Starting migration: Add settings column to users table...');
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '005_add_user_settings.sql'),
      'utf8'
    );
    
    // Run migration
    console.log('📝 Adding settings column to users table...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Users table now has settings JSONB column');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // If column already exists, that's okay
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('ℹ️  Column already exists, skipping...');
      return;
    }
    
    throw error;
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

