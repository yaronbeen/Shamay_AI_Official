/**
 * Simple test for building permit extraction
 */

const { processDocument } = require('./building-permits/index.cjs');

async function simpleTest() {
  console.log('🏗️ Testing Building Permit Document Extraction');
  
  const pdfPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/היתרים מילוליים/2263925.PDF';
  
  try {
    console.log('📄 Processing: 2263925.PDF');
    const results = await processDocument(pdfPath, 'output/building-permits');
    
    console.log('✅ Success! Results:');
    console.log('Fields extracted:', Object.keys(results.fields));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simpleTest();