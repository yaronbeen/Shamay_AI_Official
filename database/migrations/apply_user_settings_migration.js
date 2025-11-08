/**
 * Migration script to add settings JSONB column to users table
 * Run this script to add user settings support
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get database connection from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING must be set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') 
    ? false 
    : { rejectUnauthorized: false }
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Starting migration: Add settings column to users table...')
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '005_add_user_settings.sql'),
      'utf8'
    )
    
    // Run migration
    await client.query('BEGIN')
    
    console.log('📝 Adding settings column to users table...')
    await client.query(migrationSQL)
    
    await client.query('COMMIT')
    
    console.log('✅ Migration completed successfully!')
    console.log('✅ Users table now has settings JSONB column')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error.message)
    
    // If column already exists, that's okay
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('ℹ️  Column already exists, skipping...')
      return
    }
    
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })

