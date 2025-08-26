/**
 * Test building permit extraction on the provided PDF files
 */

const { processDocument } = require('./building-permits/index.cjs');
const path = require('path');

async function testBuildingPermitExtraction() {
  const documentsPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/היתרים מילוליים';
  
  const testFiles = [
    '2263925.PDF',
    '2139294.PDF', 
    '2139394.PDF'
  ];

  console.log('🏗️ Testing Building Permit Document Extraction');
  console.log('='.repeat(50));

  for (const fileName of testFiles) {
    console.log(`\n📄 Processing: ${fileName}`);
    console.log('-'.repeat(30));
    
    try {
      const pdfPath = path.join(documentsPath, fileName);
      const results = await processDocument(pdfPath, 'output/building-permits', {
        useAI: false // Start with regex extraction
      });

      console.log('✅ Extraction completed successfully!');
      console.log(`📊 Overall confidence: ${results.fields.overallConfidence.toFixed(1)}%`);
      console.log(`⏱️  Processing time: ${results.fields.processingTime}ms`);
      
      // Display extracted fields
      console.log('\n📋 Extracted Fields:');
      console.log(`  • Permit Number: ${results.fields.permitNumber?.value || 'Not found'} (${results.fields.permitNumber?.confidence}%)`);
      console.log(`  • Permit Date: ${results.fields.permitDate?.value || 'Not found'} (${results.fields.permitDate?.confidence}%)`);
      console.log(`  • Permitted Usage: ${results.fields.permittedUsage?.value || 'Not found'} (${results.fields.permittedUsage?.confidence}%)`);
      console.log(`  • Issue Date: ${results.fields.permitIssueDate?.value || 'Not found'} (${results.fields.permitIssueDate?.confidence}%)`);
      console.log(`  • Committee: ${results.fields.localCommitteeName?.value || 'Not found'} (${results.fields.localCommitteeName?.confidence}%)`);
      
    } catch (error) {
      console.log(`❌ Error processing ${fileName}:`, error.message);
    }
  }

  console.log('\n🎯 Test completed!');
}

// Run the test
if (require.main === module) {
  testBuildingPermitExtraction()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBuildingPermitExtraction };