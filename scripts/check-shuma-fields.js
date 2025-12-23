import pg from 'pg'
import dotenv from 'dotenv'
const { Pool } = pg
dotenv.config({ path: './frontend/.env.local' })

const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  console.error('❌ No database connection string found!')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function checkShumaFields() {
  const client = await pool.connect()
  
  try {
    // Check columns exist
    console.log('\n📋 Checking if columns exist...')
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'shuma' 
      AND column_name IN ('valuation_type', 'client_title', 'valuation_effective_date', 'client_note', 'client_relation', 'land_contamination', 'land_contamination_note')
      ORDER BY column_name
    `)
    
    console.log('\n✅ Columns found:')
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
    })
    
    // Check actual data for a specific session
    const sessionId = process.argv[2] || 'mock-6216-1766094463518'
    console.log(`\n📊 Checking data for session: ${sessionId}`)
    
    const dataResult = await client.query(`
      SELECT 
        id, session_id,
        valuation_type,
        client_title,
        valuation_effective_date,
        client_note,
        client_relation,
        land_contamination,
        land_contamination_note
      FROM shuma 
      WHERE session_id = $1
    `, [sessionId])
    
    if (dataResult.rows.length === 0) {
      console.log('❌ No shuma found for this session')
    } else {
      const row = dataResult.rows[0]
      console.log('\n📝 Current values in DB:')
      console.log(`   valuation_type: ${row.valuation_type} (${typeof row.valuation_type})`)
      console.log(`   client_title: ${row.client_title} (${typeof row.client_title})`)
      console.log(`   valuation_effective_date: ${row.valuation_effective_date}`)
      console.log(`   client_note: ${row.client_note}`)
      console.log(`   client_relation: ${row.client_relation}`)
      console.log(`   land_contamination: ${row.land_contamination}`)
      console.log(`   land_contamination_note: ${row.land_contamination_note}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

checkShumaFields()

