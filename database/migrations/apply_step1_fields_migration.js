/**
 * Migration: Add Step 1 fields to shuma table
 * Run with: node apply_step1_fields_migration.js
 */

import pg from 'pg'
import dotenv from 'dotenv'
const { Pool } = pg
dotenv.config({ path: './frontend/.env.local' })

async function runMigration() {
  // Try multiple connection string sources
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_URL_NON_POOLING

  if (!connectionString) {
    console.error('❌ No database connection string found!')
    console.log('Please ensure DATABASE_URL or POSTGRES_URL is set in frontend/.env.local')
    process.exit(1)
  }

  console.log('🔌 Connecting to database...')
  console.log('   Connection:', connectionString.substring(0, 30) + '...')

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const client = await pool.connect()
    console.log('✅ Connected to database')

    console.log('\n📝 Running migration: 010_add_step1_fields...\n')

    // Run migration statements one by one
    const migrations = [
      {
        name: 'valuation_type',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS valuation_type VARCHAR(255)`
      },
      {
        name: 'valuation_effective_date',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS valuation_effective_date DATE`
      },
      {
        name: 'client_title',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS client_title VARCHAR(255)`
      },
      {
        name: 'client_note',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS client_note TEXT`
      },
      {
        name: 'client_relation',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS client_relation VARCHAR(255)`
      },
      {
        name: 'land_contamination',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS land_contamination BOOLEAN DEFAULT FALSE`
      },
      {
        name: 'land_contamination_note',
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS land_contamination_note TEXT`
      },
      {
        name: 'idx_valuation_effective_date',
        sql: `CREATE INDEX IF NOT EXISTS idx_shuma_valuation_effective_date ON shuma(valuation_effective_date)`
      },
      {
        name: 'idx_valuation_type',
        sql: `CREATE INDEX IF NOT EXISTS idx_shuma_valuation_type ON shuma(valuation_type)`
      }
    ]

    for (const migration of migrations) {
      try {
        await client.query(migration.sql)
        console.log(`   ✅ Added ${migration.name}`)
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`   ⚠️  ${migration.name} already exists (skipping)`)
        } else {
          throw err
        }
      }
    }

    // Verify the columns exist
    console.log('\n🔍 Verifying columns...')
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shuma' 
      AND column_name IN (
        'valuation_type', 'valuation_effective_date', 
        'client_title', 'client_note', 'client_relation',
        'land_contamination', 'land_contamination_note'
      )
      ORDER BY column_name
    `)

    console.log('\n📋 New columns in shuma table:')
    for (const row of verifyResult.rows) {
      console.log(`   - ${row.column_name} (${row.data_type})`)
    }

    client.release()
    console.log('\n✅ Migration completed successfully!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()

