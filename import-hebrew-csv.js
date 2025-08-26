import { ComparableDataDatabaseClient } from './comparable-data-management/database-client.js';
import fs from 'fs';
import csv from 'csv-parser';

const csvPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/compareblae_Data_csv_6205.6.25.csv';

async function importHebrewCSV() {
  try {
    console.log('📊 Importing Hebrew CSV with custom parser...');
    
    const results = [];
    
    // Parse CSV
    const parsePromise = new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    const csvData = await parsePromise;
    console.log(`📊 Parsed ${csvData.length} rows from CSV`);
    
    // Map corrupted headers to proper field names based on position and data
    const mapRowToDatabase = (row) => {
      const values = Object.values(row);
      
      // Parse date from format like "2/20/2025"
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          const [month, day, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch {
          return null;
        }
      };
      
      // Clean price strings like "₪ 2,600,000"
      const cleanPrice = (priceStr) => {
        if (!priceStr) return null;
        const cleaned = priceStr.replace(/[₪,? ]/g, '');
        return parseFloat(cleaned) || null;
      };
      
      // Based on the analysis, map positions to fields:
      // 0: יום מכירה (Sale date)
      // 1: כתובת (Address) 
      // 2: גו"ח (Gush/Chelka)
      // 3: חדרים (Rooms)
      // 4: קומה (Floor)
      // 5: שטח דירה במ"ר (Area)
      // 6: חניות (Parking)
      // 7: שנת בניה (Construction year)
      // 8: מחיר מוצהר (Declared price)
      // 9: מחיר למ"ר (Price per sqm)
      
      return {
        'יום מכירה': values[0] || null,
        'כתובת': values[1] || null,
        'גו"ח': values[2] || null,
        'חדרים': values[3] || null,
        'קומה': values[4] || null,
        'שטח דירה במ"ר': values[5] || null,
        'חניות': values[6] || null,
        'שנת בניה': values[7] || null,
        'מחיר מוצהר': values[8] || null,
        'מחיר למ"ר, במעוגל': values[9] || null
      };
    };
    
    // Import each row
    const db = new ComparableDataDatabaseClient();
    const importResults = {
      successful: [],
      failed: []
    };
    
    for (let i = 0; i < csvData.length; i++) {
      try {
        const mappedRow = mapRowToDatabase(csvData[i]);
        console.log(`\nProcessing row ${i + 1}:`, mappedRow);
        
        const result = await db.insertComparableData(
          mappedRow,
          'compareblae_Data_csv_6205.6.25.csv',
          i + 1,
          'hebrew-csv-importer'
        );
        
        importResults.successful.push({
          rowNumber: i + 1,
          id: result.id,
          address: mappedRow['כתובת']
        });
        
      } catch (error) {
        console.error(`❌ Failed to import row ${i + 1}:`, error.message);
        importResults.failed.push({
          rowNumber: i + 1,
          error: error.message
        });
      }
    }
    
    await db.disconnect();
    
    console.log(`\n✅ Import completed:`);
    console.log(`  Successful: ${importResults.successful.length} records`);
    console.log(`  Failed: ${importResults.failed.length} records`);
    
    return importResults;
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

// Run the import
importHebrewCSV()
  .then((results) => {
    console.log('\n🎯 Final results:', results);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
  });