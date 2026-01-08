/**
 * Check what data is currently in DB and what the API returns
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

async function checkSessionData() {
  const sessionId = 'mock-6216-1766094463518'
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    console.log('🔍 Checking DB values...')
    
    // Check current values in DB
    const dbResult = await client.query(`
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
    
    if (dbResult.rows.length === 0) {
      console.error('❌ No shuma found for session:', sessionId)
      await client.end()
      return
    }
    
    console.log('📊 DB Values:')
    console.log(JSON.stringify({
      id: dbResult.rows[0].id,
      client_title: dbResult.rows[0].client_title,
      valuation_type: dbResult.rows[0].valuation_type,
      client_note: dbResult.rows[0].client_note,
      client_relation: dbResult.rows[0].client_relation,
      valuation_effective_date: dbResult.rows[0].valuation_effective_date
    }, null, 2))
    
    // Now test what loadShumaForWizard would return
    console.log('\n🔍 Testing loadShumaForWizard logic...')
    const shuma = dbResult.rows[0]
    
    const loadedData = {
      clientTitle: shuma.client_title || '',
      valuationType: shuma.valuation_type || '',
      clientNote: shuma.client_note || '',
      clientRelation: shuma.client_relation || '',
      valuationEffectiveDate: shuma.valuation_effective_date || ''
    }
    
    console.log('📊 Loaded Data (after || \'\'):')
    console.log(JSON.stringify(loadedData, null, 2))
    
    // Check if empty strings are the issue
    console.log('\n🔍 Raw DB values (no defaults):')
    console.log(JSON.stringify({
      client_title: shuma.client_title,
      valuation_type: shuma.valuation_type,
      client_note: shuma.client_note,
      client_relation: shuma.client_relation,
      valuation_effective_date: shuma.valuation_effective_date
    }, null, 2))
    
    await client.end()
    
  } catch (error) {
    console.error('❌ Error:', error)
    await client.end()
    throw error
  }
}

checkSessionData()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })

