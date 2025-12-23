// Test JavaScript 'in' operator behavior

const testCases = [
  { name: 'Property exists with value', obj: { clientTitle: 'עו"ד' } },
  { name: 'Property exists with empty string', obj: { clientTitle: '' } },
  { name: 'Property exists with null', obj: { clientTitle: null } },
  { name: 'Property exists with undefined', obj: { clientTitle: undefined } },
  { name: 'Property does not exist', obj: {} },
]

testCases.forEach(testCase => {
  const obj = testCase.obj
  const hasProperty = 'clientTitle' in obj
  const value = obj.clientTitle
  const result = 'clientTitle' in obj ? obj.clientTitle : null
  
  console.log(`\n${testCase.name}:`)
  console.log(`  obj:`, obj)
  console.log(`  'clientTitle' in obj:`, hasProperty)
  console.log(`  obj.clientTitle:`, value, `(type: ${typeof value})`)
  console.log(`  Result ('clientTitle' in obj ? obj.clientTitle : null):`, result, `(type: ${typeof result})`)
})

