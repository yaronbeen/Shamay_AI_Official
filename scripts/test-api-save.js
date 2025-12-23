import dotenv from 'dotenv'
dotenv.config({ path: './frontend/.env.local' })

const sessionId = process.argv[2] || 'mock-6216-1766094463518'
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testAPISave() {
  const testData = {
    valuationType: 'שווי השקעה',
    clientTitle: 'עו"ד',
    valuationEffectiveDate: '2025-12-11',
    clientName: 'יגאל ספרבר',
    street: 'הרי הגלעד',
    buildingNumber: '9'
  }
  
  console.log('\n🧪 Testing API PUT with data:')
  console.log(JSON.stringify(testData, null, 2))
  
  try {
    const response = await fetch(`${baseUrl}/api/session/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: testData })
    })
    
    const result = await response.json()
    
    console.log('\n📡 API Response:')
    console.log(`   Status: ${response.status}`)
    console.log(`   Result:`, JSON.stringify(result, null, 2))
    
    // Now check DB
    console.log('\n🔍 Checking DB after save...')
    const checkResponse = await fetch(`${baseUrl}/api/session/${sessionId}`)
    const checkResult = await checkResponse.json()
    
    console.log('\n📊 Data in DB:')
    console.log(`   valuationType: ${checkResult.data?.valuationType}`)
    console.log(`   clientTitle: ${checkResult.data?.clientTitle}`)
    console.log(`   valuationEffectiveDate: ${checkResult.data?.valuationEffectiveDate}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testAPISave()

