import XLSX from 'xlsx';

const filePath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/6205.6.25.xlsx';

try {
  console.log('📊 Analyzing Excel file:', filePath);
  
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  
  // Get sheet names
  console.log('📋 Sheet names:', workbook.SheetNames);
  
  // Analyze each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n📄 Sheet ${index + 1}: ${sheetName}`);
    console.log('='.repeat(50));
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Get sheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    console.log(`📐 Range: ${range.s.c + 1} columns x ${range.e.r + 1} rows`);
    
    // Convert to JSON to analyze data
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (jsonData.length > 0) {
      // Show first few rows
      console.log('\n🔍 First 10 rows:');
      jsonData.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, row.slice(0, 8)); // Show first 8 columns
      });
      
      // Show headers if available
      if (jsonData[0]) {
        console.log('\n📋 Headers (Row 1):');
        jsonData[0].forEach((header, i) => {
          if (header) console.log(`  Col ${String.fromCharCode(65 + i)} (${i + 1}): ${header}`);
        });
      }
      
      // Show some statistics
      console.log(`\n📊 Total rows: ${jsonData.length}`);
      const nonEmptyRows = jsonData.filter(row => row.some(cell => cell !== '' && cell != null));
      console.log(`📊 Non-empty rows: ${nonEmptyRows.length}`);
      
      // Check for Hebrew content
      const hebrewPattern = /[\u0590-\u05FF]/;
      const hasHebrew = jsonData.some(row => 
        row.some(cell => typeof cell === 'string' && hebrewPattern.test(cell))
      );
      console.log(`🔤 Contains Hebrew text: ${hasHebrew ? 'Yes' : 'No'}`);
      
    } else {
      console.log('⚠️ Sheet appears to be empty');
    }
  });
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  if (error.code === 'ENOENT') {
    console.log('📁 File not found. Please check the path.');
  }
}