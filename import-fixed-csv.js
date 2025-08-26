import { ComparableDataDatabaseClient } from './comparable-data-management/database-client.js';
import fs from 'fs';

const csvPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/compareblae_Data_csv_6205.6.25.csv';

async function importFixedCSV() {
  try {
    console.log('📊 Importing CSV with proper field mapping...');
    
    // Read and parse manually
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length - 1} data rows (excluding header)`);
    
    // Parse each data row (skip header)
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV manually to handle quotes properly
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Don't forget the last value
      
      console.log(`\nRow ${i}: Found ${values.length} values:`, values);
      
      // Map to our database fields based on actual CSV structure:
      // 0: יום מכירה (Sale date) - format M/D/YYYY
      // 1: כתובת (Address) 
      // 2: גו"ח (Gush/Chelka)
      // 3: חדרים (Rooms)
      // 4: קומה (Floor) 
      // 5: שטח דירה במ"ר (Apartment area)
      // 6: חניות (Parking)
      // 7: שנת בניה (Construction year)
      // 8: מחיר מוצהר (Declared price)
      // 9: מחיר למ"ר (Price per sqm)
      
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          const [month, day, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch {
          return null;
        }
      };
      
      const cleanPrice = (priceStr) => {
        if (!priceStr) return null;
        // Remove ₪, spaces, commas and any other non-numeric chars except decimal point
        const cleaned = priceStr.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || null;
      };
      
      const mappedData = {
        'יום מכירה': parseDate(values[0]),
        'כתובת': values[1] || null,
        'גו"ח': values[2] || null,
        'חדרים': values[3] ? parseFloat(values[3]) : null,
        'קומה': values[4] || null,
        'שטח דירה במ"ר': values[5] ? parseFloat(values[5]) : null,
        'חניות': values[6] ? parseInt(values[6]) : null,
        'שנת בניה': values[7] ? parseInt(values[7]) : null,
        'מחיר מוצהר': cleanPrice(values[8]),
        'מחיר למ"ר, במעוגל': cleanPrice(values[9])
      };
      
      console.log('Mapped data:', mappedData);
      results.push(mappedData);
    }
    
    // Import to database
    console.log(`\n📥 Importing ${results.length} records to database...`);
    
    const db = new ComparableDataDatabaseClient();
    const importResults = {
      successful: [],
      failed: []
    };
    
    for (let i = 0; i < results.length; i++) {
      try {
        const result = await db.insertComparableData(
          results[i],
          'compareblae_Data_csv_6205.6.25.csv',
          i + 1,
          'fixed-csv-importer'
        );
        
        importResults.successful.push({
          rowNumber: i + 1,
          id: result.id,
          address: results[i]['כתובת']
        });
        
        console.log(`✅ Row ${i + 1} imported successfully (ID: ${result.id})`);
        
      } catch (error) {
        console.error(`❌ Failed to import row ${i + 1}:`, error.message);
        importResults.failed.push({
          rowNumber: i + 1,
          data: results[i],
          error: error.message
        });
      }
    }
    
    await db.disconnect();
    
    console.log(`\n🎯 Import Summary:`);
    console.log(`  ✅ Successful: ${importResults.successful.length} records`);
    console.log(`  ❌ Failed: ${importResults.failed.length} records`);
    
    if (importResults.successful.length > 0) {
      console.log('\n📋 Successfully imported:');
      importResults.successful.forEach(item => {
        console.log(`  - ID ${item.id}: Row ${item.rowNumber} (${item.address})`);
      });
    }
    
    if (importResults.failed.length > 0) {
      console.log('\n❌ Failed imports:');
      importResults.failed.forEach(item => {
        console.log(`  - Row ${item.rowNumber}: ${item.error}`);
      });
    }
    
    return importResults;
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

// Run the import
importFixedCSV()
  .then(() => {
    console.log('\n🎯 Import process completed!');
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
  });