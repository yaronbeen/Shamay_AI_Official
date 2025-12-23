/**
 * Test script to check what loadShumaForWizard returns
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

// Simulate loadShumaForWizard logic
async function testLoadShumaForWizard() {
  const sessionId = 'mock-6216-1766094463518'
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    console.log('🔍 Testing loadShumaForWizard logic...')
    
    // Load from DB (same query as in loadShumaForWizard)
    const result = await client.query(`
      SELECT * FROM shuma WHERE session_id = $1
    `, [sessionId])
    
    if (result.rows.length === 0) {
      console.error('❌ No shuma found for session:', sessionId)
      await client.end()
      return
    }
    
    const shuma = result.rows[0]
    
    console.log('\n📊 Raw DB values:')
    console.log({
      client_title: shuma.client_title,
      client_title_type: typeof shuma.client_title,
      client_title_is_null: shuma.client_title === null,
      client_title_is_empty: shuma.client_title === '',
      valuation_type: shuma.valuation_type,
      valuation_type_type: typeof shuma.valuation_type,
      valuation_type_is_null: shuma.valuation_type === null,
      valuation_type_is_empty: shuma.valuation_type === '',
      client_note: shuma.client_note,
      client_note_type: typeof shuma.client_note,
      client_note_is_null: shuma.client_note === null,
      client_relation: shuma.client_relation,
      client_relation_type: typeof shuma.client_relation,
      client_relation_is_null: shuma.client_relation === null,
      valuation_effective_date: shuma.valuation_effective_date
    })
    
    // Simulate the loadShumaForWizard conversion logic
    const valuationData = {
      clientTitle: shuma.client_title ?? '',
      valuationType: shuma.valuation_type ?? '',
      clientNote: shuma.client_note ?? '',
      clientRelation: shuma.client_relation ?? '',
      valuationEffectiveDate: shuma.valuation_effective_date || ''
    }
    
    console.log('\n📊 Converted values (after ?? \'\'):')
    console.log({
      clientTitle: valuationData.clientTitle,
      clientTitle_type: typeof valuationData.clientTitle,
      valuationType: valuationData.valuationType,
      valuationType_type: typeof valuationData.valuationType,
      clientNote: valuationData.clientNote,
      clientNote_type: typeof valuationData.clientNote,
      clientRelation: valuationData.clientRelation,
      clientRelation_type: typeof valuationData.clientRelation,
      valuationEffectiveDate: valuationData.valuationEffectiveDate
    })
    
    // Test what happens with empty string vs null
    console.log('\n🔍 Testing empty string vs null:')
    console.log('Empty string || \'\':', ('' || ''))
    console.log('Empty string ?? \'\':', ('' ?? ''))
    console.log('null || \'\':', (null || ''))
    console.log('null ?? \'\':', (null ?? ''))
    console.log('undefined || \'\':', (undefined || ''))
    console.log('undefined ?? \'\':', (undefined ?? ''))
    
    await client.end()
    
  } catch (error) {
    console.error('❌ Error:', error)
    await client.end()
    throw error
  }
}

testLoadShumaForWizard()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

