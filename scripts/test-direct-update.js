/**
 * Test script to directly update fields in DB to check if the issue is with the DB or the code
 */

import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') })
dotenv.config({ path: path.join(__dirname, '../backend/.env') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const { Client } = pg

function createDbConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  }
  
  const host = process.env.DB_HOST || 'localhost'
  const isRemote = host.includes('neon.tech') || host.includes('aws') || host.includes('cloud')
  
  return {
    host: host,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: isRemote ? { rejectUnauthorized: false } : false
  }
}

const client = new Client(createDbConfig())

async function testDirectUpdate() {
  const sessionId = 'mock-6216-1766094463518'
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    console.log('🔍 Checking current values in DB...')
    
    // Check current values
    const current = await client.query(`
      SELECT 
        id,
        session_id,
        client_title,
        valuation_type,
        client_note,
        client_relation,
        valuation_effective_date
      FROM shuma 
      WHERE session_id = $1
    `, [sessionId])
    
    if (current.rows.length === 0) {
      console.error('❌ No shuma found for session:', sessionId)
      await client.end()
      return
    }
    
    const shumaId = current.rows[0].id
    console.log('📊 Current values:')
    console.log({
      id: current.rows[0].id,
      client_title: current.rows[0].client_title,
      valuation_type: current.rows[0].valuation_type,
      client_note: current.rows[0].client_note,
      client_relation: current.rows[0].client_relation,
      valuation_effective_date: current.rows[0].valuation_effective_date
    })
    
    console.log('\n🔄 Updating fields directly...')
    
    // Update directly using the same logic as in the code
    const testValues = {
      valuation_type: 'שומת מקרקעין',
      client_title: 'מר',
      client_note: 'Test note',
      client_relation: 'לקוח',
      valuation_effective_date: '2024-01-15'
    }
    
    const updateResult = await client.query(`
      UPDATE shuma SET
        valuation_type = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE valuation_type END,
        valuation_effective_date = COALESCE($2::date, valuation_effective_date),
        client_title = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE client_title END,
        client_note = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE client_note END,
        client_relation = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE client_relation END,
        updated_at = NOW()
      WHERE id = $6
      RETURNING 
        id,
        client_title,
        valuation_type,
        client_note,
        client_relation,
        valuation_effective_date
    `, [
      testValues.valuation_type,
      testValues.valuation_effective_date,
      testValues.client_title,
      testValues.client_note,
      testValues.client_relation,
      shumaId
    ])
    
    if (updateResult.rows.length === 0) {
      console.error('❌ Update failed - no rows affected')
      await client.end()
      return
    }
    
    console.log('✅ Update successful! New values:')
    console.log({
      id: updateResult.rows[0].id,
      client_title: updateResult.rows[0].client_title,
      valuation_type: updateResult.rows[0].valuation_type,
      client_note: updateResult.rows[0].client_note,
      client_relation: updateResult.rows[0].client_relation,
      valuation_effective_date: updateResult.rows[0].valuation_effective_date
    })
    
    // Now test with null values
    console.log('\n🔄 Testing with null values...')
    const nullUpdateResult = await client.query(`
      UPDATE shuma SET
        valuation_type = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE valuation_type END,
        client_title = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE client_title END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        client_title,
        valuation_type
    `, [null, null, shumaId])
    
    console.log('✅ Null update result (should keep existing values):')
    console.log({
      client_title: nullUpdateResult.rows[0].client_title,
      valuation_type: nullUpdateResult.rows[0].valuation_type
    })
    
    // Test with empty string
    console.log('\n🔄 Testing with empty string...')
    const emptyUpdateResult = await client.query(`
      UPDATE shuma SET
        client_title = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE client_title END,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        client_title
    `, ['', shumaId])
    
    console.log('✅ Empty string update result:')
    console.log({
      client_title: emptyUpdateResult.rows[0].client_title
    })
    
    await client.end()
    
  } catch (error) {
    console.error('❌ Error:', error)
    await client.end()
    throw error
  }
}

testDirectUpdate()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

