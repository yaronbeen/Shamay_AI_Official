/**
 * Test script to check what the API returns for loadShumaForWizard
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') })
dotenv.config({ path: path.join(__dirname, '../backend/.env') })
dotenv.config({ path: path.join(__dirname, '../.env') })

// Import ShumaDB
const { ShumaDB } = await import('../frontend/src/lib/shumadb.js')

async function testLoadFromAPI() {
  const sessionId = 'mock-6216-1766094463518'
  
  try {
    console.log('🔍 Testing loadShumaForWizard...')
    
    const result = await ShumaDB.loadShumaForWizard(sessionId)
    
    if (result.error) {
      console.error('❌ Error:', result.error)
      return
    }
    
    if (!result.success) {
      console.error('❌ Not successful:', result)
      return
    }
    
    console.log('✅ Success!')
    console.log('\n📊 Returned valuationData:')
    console.log(JSON.stringify({
      clientName: result.valuationData.clientName,
      clientName_type: typeof result.valuationData.clientName,
      clientTitle: result.valuationData.clientTitle,
      clientTitle_type: typeof result.valuationData.clientTitle,
      clientTitle_is_null: result.valuationData.clientTitle === null,
      clientTitle_is_empty: result.valuationData.clientTitle === '',
      clientTitle_is_undefined: result.valuationData.clientTitle === undefined,
      valuationType: result.valuationData.valuationType,
      valuationType_type: typeof result.valuationData.valuationType,
      valuationType_is_null: result.valuationData.valuationType === null,
      valuationType_is_empty: result.valuationData.valuationType === '',
      valuationType_is_undefined: result.valuationData.valuationType === undefined,
      street: result.valuationData.street,
      street_type: typeof result.valuationData.street,
      city: result.valuationData.city,
      city_type: typeof result.valuationData.city
    }, null, 2))
    
    console.log('\n🔍 Comparing working vs non-working fields:')
    console.log('Working field (clientName):')
    console.log(`  Value: "${result.valuationData.clientName}"`)
    console.log(`  Type: ${typeof result.valuationData.clientName}`)
    console.log(`  In object: ${'clientName' in result.valuationData}`)
    
    console.log('\nNon-working field (clientTitle):')
    console.log(`  Value: "${result.valuationData.clientTitle}"`)
    console.log(`  Type: ${typeof result.valuationData.clientTitle}`)
    console.log(`  In object: ${'clientTitle' in result.valuationData}`)
    console.log(`  === null: ${result.valuationData.clientTitle === null}`)
    console.log(`  === '': ${result.valuationData.clientTitle === ''}`)
    console.log(`  === undefined: ${result.valuationData.clientTitle === undefined}`)
    
    console.log('\nNon-working field (valuationType):')
    console.log(`  Value: "${result.valuationData.valuationType}"`)
    console.log(`  Type: ${typeof result.valuationData.valuationType}`)
    console.log(`  In object: ${'valuationType' in result.valuationData}`)
    console.log(`  === null: ${result.valuationData.valuationType === null}`)
    console.log(`  === '': ${result.valuationData.valuationType === ''}`)
    console.log(`  === undefined: ${result.valuationData.valuationType === undefined}`)
    
    // Check if the fields are actually in the returned object
    console.log('\n🔍 Checking object keys:')
    console.log('All keys in valuationData:', Object.keys(result.valuationData).filter(k => k.includes('client') || k.includes('valuation')))
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

testLoadFromAPI()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

