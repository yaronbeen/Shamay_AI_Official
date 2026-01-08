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

async function testUpdate() {
  const client = await pool.connect()
  const sessionId = process.argv[2] || 'mock-6216-1766094463518'
  
  try {
    console.log(`\n🔍 Testing update for session: ${sessionId}`)
    
    // First, check current values
    console.log('\n📊 BEFORE UPDATE:')
    const beforeResult = await client.query(`
      SELECT id, session_id, valuation_type, client_title, valuation_effective_date
      FROM shuma 
      WHERE session_id = $1
    `, [sessionId])
    
    if (beforeResult.rows.length === 0) {
      console.log('❌ No shuma found for this session')
      return
    }
    
    const row = beforeResult.rows[0]
    console.log(`   id: ${row.id}`)
    console.log(`   valuation_type: ${row.valuation_type} (${typeof row.valuation_type})`)
    console.log(`   client_title: ${row.client_title} (${typeof row.client_title})`)
    console.log(`   valuation_effective_date: ${row.valuation_effective_date}`)
    
    // Test direct SQL update
    console.log('\n🧪 Testing direct SQL UPDATE...')
    const updateResult = await client.query(`
      UPDATE shuma SET
        valuation_type = COALESCE($1, valuation_type),
        client_title = COALESCE($2, client_title),
        valuation_effective_date = COALESCE($3, valuation_effective_date)
      WHERE session_id = $4
      RETURNING id, valuation_type, client_title, valuation_effective_date
    `, [
      'שווי השקעה',  // $1 - valuation_type
      'עו"ד',        // $2 - client_title
      '2025-12-11',  // $3 - valuation_effective_date
      sessionId      // $4
    ])
    
    if (updateResult.rows.length === 0) {
      console.log('❌ UPDATE query returned no rows')
      return
    }
    
    const updatedRow = updateResult.rows[0]
    console.log('\n✅ AFTER UPDATE:')
    console.log(`   id: ${updatedRow.id}`)
    console.log(`   valuation_type: ${updatedRow.valuation_type}`)
    console.log(`   client_title: ${updatedRow.client_title}`)
    console.log(`   valuation_effective_date: ${updatedRow.valuation_effective_date}`)
    
    // Test with NULL
    console.log('\n🧪 Testing UPDATE with NULL values...')
    const updateNullResult = await client.query(`
      UPDATE shuma SET
        valuation_type = COALESCE($1, valuation_type),
        client_title = COALESCE($2, client_title)
      WHERE session_id = $3
      RETURNING id, valuation_type, client_title
    `, [
      null,          // $1 - should keep existing value
      null,          // $2 - should keep existing value
      sessionId      // $3
    ])
    
    console.log('✅ After NULL update (should keep previous values):')
    console.log(`   valuation_type: ${updateNullResult.rows[0].valuation_type}`)
    console.log(`   client_title: ${updateNullResult.rows[0].client_title}`)
    
    // Test with empty string
    console.log('\n🧪 Testing UPDATE with empty strings...')
    const updateEmptyResult = await client.query(`
      UPDATE shuma SET
        valuation_type = COALESCE($1, valuation_type),
        client_title = COALESCE($2, client_title)
      WHERE session_id = $3
      RETURNING id, valuation_type, client_title
    `, [
      '',            // $1 - empty string
      '',            // $2 - empty string
      sessionId      // $3
    ])
    
    console.log('✅ After empty string update:')
    console.log(`   valuation_type: ${updateEmptyResult.rows[0].valuation_type}`)
    console.log(`   client_title: ${updateEmptyResult.rows[0].client_title}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    client.release()
    await pool.end()
  }
}

testUpdate()

