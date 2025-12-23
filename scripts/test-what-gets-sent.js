// Simulate what happens with the data

const testCases = [
  { name: 'Value exists and is set', valuationData: { clientTitle: 'עו"ד', valuationType: 'שווי שוק' } },
  { name: 'Value exists as empty string', valuationData: { clientTitle: '', valuationType: '' } },
  { name: 'Value is undefined', valuationData: { clientTitle: undefined, valuationType: undefined } },
  { name: 'Value does not exist', valuationData: {} },
  { name: 'Value is null', valuationData: { clientTitle: null, valuationType: null } },
]

testCases.forEach(testCase => {
  const valuationData = testCase.valuationData
  
  // Simulate what happens in the UPDATE query values array
  const value1 = valuationData.clientTitle ?? null
  const value2 = valuationData.valuationType ?? null
  
  // Simulate what happens in SQL
  // COALESCE($12, client_title) - if $12 is NULL, keep old value, otherwise use $12
  const sql1 = value1 === null ? 'KEEP_OLD' : `USE_${value1}`
  const sql2 = value2 === null ? 'KEEP_OLD' : `USE_${value2}`
  
  console.log(`\n${testCase.name}:`)
  console.log(`  valuationData:`, JSON.stringify(valuationData))
  console.log(`  clientTitle value: ${value1} (${typeof value1})`)
  console.log(`  valuationType value: ${value2} (${typeof value2})`)
  console.log(`  SQL behavior clientTitle: ${sql1}`)
  console.log(`  SQL behavior valuationType: ${sql2}`)
})

