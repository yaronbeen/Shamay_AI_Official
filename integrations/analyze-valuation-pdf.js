import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function analyzePDF() {
  try {
    const pdfPath = './test_documents/6216.6.25.pdf';
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('📄 PDF Analysis Results:');
    console.log('=' .repeat(60));
    console.log(`Total Pages: ${pdfData.numpages}`);
    console.log(`Total Text Length: ${pdfData.text.length}`);
    console.log('\n--- First 2000 characters ---');
    console.log(pdfData.text.substring(0, 2000));
    console.log('\n--- Page Structure ---');
    
    // Try to extract sections
    const text = pdfData.text;
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log('\n--- Key Sections Found ---');
    const keyPhrases = [
      'חוות דעת',
      'אומדן שווי',
      'תיאור הנכס',
      'מצב משפטי',
      'ניתוח',
      'מסקנות',
      'שווי שוק',
      'השוואה',
      'הערכה',
      'סיכום',
      'נספחים'
    ];
    
    keyPhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        console.log(`✓ Found: ${phrase}`);
      }
    });
    
    // Save full text to file for detailed analysis
    fs.writeFileSync('pdf-extracted-text.txt', pdfData.text);
    console.log('\n✅ Full text saved to pdf-extracted-text.txt');
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error);
  }
}

analyzePDF();

