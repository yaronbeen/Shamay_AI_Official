/**
 * Test script to check API and DB for clientTitle and valuationType
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

async function testAPIAndDB() {
  const sessionId = 'mock-6216-1766094463518'
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    console.log('\n🔍 STEP 1: Check what\'s in DB...')
    const dbResult = await client.query(`
      SELECT 
        id,
        session_id,
        client_name,
        client_title,
        valuation_type,
        client_note,
        client_relation,
        valuation_effective_date,
        street,
        city
      FROM shuma 
      WHERE session_id = $1
    `, [sessionId])
    
    if (dbResult.rows.length === 0) {
      console.error('❌ No shuma found for session:', sessionId)
      await client.end()
      return
    }
    
    const shuma = dbResult.rows[0]
    console.log('📊 DB Values:')
    console.log(JSON.stringify({
      id: shuma.id,
      client_name: shuma.client_name,
      client_name_type: typeof shuma.client_name,
      client_title: shuma.client_title,
      client_title_type: typeof shuma.client_title,
      client_title_is_null: shuma.client_title === null,
      client_title_is_empty: shuma.client_title === '',
      valuation_type: shuma.valuation_type,
      valuation_type_type: typeof shuma.valuation_type,
      valuation_type_is_null: shuma.valuation_type === null,
      valuation_type_is_empty: shuma.valuation_type === '',
      street: shuma.street,
      street_type: typeof shuma.street,
      city: shuma.city,
      city_type: typeof shuma.city
    }, null, 2))
    
    console.log('\n🔍 STEP 2: Check column definitions...')
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'shuma'
        AND column_name IN ('client_name', 'client_title', 'valuation_type', 'street', 'city')
      ORDER BY column_name
    `)
    
    console.log('📊 Column Info:')
    columnInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}, default: ${row.column_default}`)
    })
    
    console.log('\n🔍 STEP 3: Test UPDATE query (same as in shumadb.js)...')
    
    // Test update with explicit cast (like in shumadb.js)
    const testUpdate = await client.query(`
      UPDATE shuma SET
        client_title = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE client_title END,
        valuation_type = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE valuation_type END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        client_title,
        valuation_type
    `, ['TEST_TITLE', 'TEST_TYPE', shuma.id])
    
    console.log('📊 After UPDATE with TEST values:')
    console.log(JSON.stringify({
      client_title: testUpdate.rows[0].client_title,
      valuation_type: testUpdate.rows[0].valuation_type
    }, null, 2))
    
    // Restore original values
    await client.query(`
      UPDATE shuma SET
        client_title = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE client_title END,
        valuation_type = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE valuation_type END,
        updated_at = NOW()
      WHERE id = $3
    `, [shuma.client_title, shuma.valuation_type, shuma.id])
    
    console.log('\n✅ Restored original values')
    
    console.log('\n🔍 STEP 4: Test loadShumaForWizard logic...')
    // Simulate loadShumaForWizard
    const loadedData = {
      clientName: shuma.client_name || '',
      clientTitle: shuma.client_title ?? '',
      valuationType: shuma.valuation_type ?? '',
      street: shuma.street || '',
      city: shuma.city || ''
    }
    
    console.log('📊 Loaded Data (simulated):')
    console.log(JSON.stringify(loadedData, null, 2))
    
    console.log('\n🔍 STEP 5: Compare working vs non-working fields...')
    console.log('Working fields (client_name, street, city):')
    console.log(`  client_name: "${shuma.client_name}" (type: ${typeof shuma.client_name})`)
    console.log(`  street: "${shuma.street}" (type: ${typeof shuma.street})`)
    console.log(`  city: "${shuma.city}" (type: ${typeof shuma.city})`)
    console.log('\nNon-working fields (client_title, valuation_type):')
    console.log(`  client_title: "${shuma.client_title}" (type: ${typeof shuma.client_title}, null: ${shuma.client_title === null}, empty: ${shuma.client_title === ''})`)
    console.log(`  valuation_type: "${shuma.valuation_type}" (type: ${typeof shuma.valuation_type}, null: ${shuma.valuation_type === null}, empty: ${shuma.valuation_type === ''})`)
    
    await client.end()
    
  } catch (error) {
    console.error('❌ Error:', error)
    await client.end()
    throw error
  }
}

testAPIAndDB()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

