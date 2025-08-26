import fs from 'fs';
import csv from 'csv-parser';

const csvPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/compareblae_Data_csv_6205.6.25.csv';

console.log('📊 Analyzing Hebrew CSV file...');

// First, let's read the raw file to understand encoding
const rawContent = fs.readFileSync(csvPath, 'utf8');
console.log('\n📄 Raw first line (headers):');
console.log(rawContent.split('\n')[0]);

console.log('\n📄 Raw second line (first data row):');
console.log(rawContent.split('\n')[1]);

// Try different encodings
try {
  const utf8Content = fs.readFileSync(csvPath, 'utf8');
  console.log('\n🔤 UTF-8 headers:', utf8Content.split('\n')[0].split(','));
} catch (e) {
  console.log('UTF-8 failed:', e.message);
}

// Parse as CSV and analyze structure
console.log('\n📋 Analyzing CSV structure...');

const results = [];
fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    results.push(row);
  })
  .on('end', () => {
    console.log(`\n📊 Total rows parsed: ${results.length}`);
    
    if (results.length > 0) {
      console.log('\n🔍 Column headers detected:');
      Object.keys(results[0]).forEach((header, index) => {
        console.log(`  ${index + 1}. "${header}"`);
      });
      
      console.log('\n🔍 First row data:');
      console.log(results[0]);
      
      console.log('\n🔍 Sample values analysis:');
      const firstRow = results[0];
      Object.entries(firstRow).forEach(([header, value]) => {
        console.log(`  "${header}": "${value}" (type: ${typeof value})`);
      });
    }
  })
  .on('error', (error) => {
    console.error('❌ CSV parsing error:', error.message);
  });