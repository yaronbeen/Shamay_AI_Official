/**
 * Test script to check what loadShumaForWizard actually returns
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

async function testLoadShumaForWizard() {
  const sessionId = 'mock-6216-1766094463518'
  
  try {
    console.log('🔍 Testing ShumaDB.loadShumaForWizard...')
    
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
      clientTitle: result.valuationData.clientTitle,
      clientTitle_type: typeof result.valuationData.clientTitle,
      valuationType: result.valuationData.valuationType,
      valuationType_type: typeof result.valuationData.valuationType,
      clientNote: result.valuationData.clientNote,
      clientNote_type: typeof result.valuationData.clientNote,
      clientRelation: result.valuationData.clientRelation,
      clientRelation_type: typeof result.valuationData.clientRelation,
      valuationEffectiveDate: result.valuationData.valuationEffectiveDate
    }, null, 2))
    
    // Check if values are actually there
    console.log('\n🔍 Value checks:')
    console.log('clientTitle === "":', result.valuationData.clientTitle === '')
    console.log('clientTitle === null:', result.valuationData.clientTitle === null)
    console.log('clientTitle === undefined:', result.valuationData.clientTitle === undefined)
    console.log('valuationType:', result.valuationData.valuationType)
    console.log('valuationType === "שומת מקרקעין":', result.valuationData.valuationType === 'שומת מקרקעין')
    
  } catch (error) {
    console.error('❌ Error:', error)
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

