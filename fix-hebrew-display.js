import { ComparableDataDatabaseClient } from './comparable-data-management/database-client.js';

// Map of corrupted Hebrew addresses to their correct Hebrew equivalents
const hebrewAddressMap = {
  '????? 3': 'תאשור 3',
  '??? ?????? 6': 'הרב איפרגן 6', 
  '????? 17': 'נתניה 17',
  '???? 10': 'אייר 10',
  '??? ???? 19': 'בני רייך 19',
  '???? 13': 'אייר 13',
  '??? ???? 21': 'בני רייך 21',
  '????? 5': 'תאשור 5',
  '????? 7': 'תאשור 7',
  '??? ?????? 3': 'הרב איפרגן 3',
  '?????? 10': 'קריניצי 10'
};

async function fixHebrewDisplay() {
  try {
    console.log('🔧 Fixing Hebrew display in database...');
    
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    // Get all records with corrupted Hebrew
    const query = 'SELECT id, address FROM comparable_data WHERE address LIKE \'%?%\'';
    const result = await db.client.query(query);
    
    console.log(`📊 Found ${result.rows.length} records with corrupted Hebrew`);
    
    let fixed = 0;
    let notFound = 0;
    
    for (const row of result.rows) {
      const correctHebrew = hebrewAddressMap[row.address];
      
      if (correctHebrew) {
        // Update the address with correct Hebrew
        const updateQuery = 'UPDATE comparable_data SET address = $1 WHERE id = $2';
        await db.client.query(updateQuery, [correctHebrew, row.id]);
        
        console.log(`✅ Fixed ID ${row.id}: "${row.address}" → "${correctHebrew}"`);
        fixed++;
      } else {
        console.log(`❓ No mapping found for: "${row.address}" (ID: ${row.id})`);
        notFound++;
      }
    }
    
    await db.disconnect();
    
    console.log(`\n🎯 Fix Summary:`);
    console.log(`  ✅ Fixed: ${fixed} records`);
    console.log(`  ❓ Not mapped: ${notFound} records`);
    
    // Now let's verify the fix
    console.log('\n🔍 Verifying Hebrew display...');
    await verifyHebrewDisplay();
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

async function verifyHebrewDisplay() {
  try {
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    const query = `
      SELECT id, sale_date, address, gush_chelka_sub, rooms, apartment_area_sqm, 
             declared_price, price_per_sqm_rounded 
      FROM comparable_data 
      ORDER BY sale_date DESC 
      LIMIT 5
    `;
    
    const result = await db.client.query(query);
    
    console.log('\n📋 Updated Records (Top 5):');
    console.log('='.repeat(80));
    
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Date: ${row.sale_date?.toISOString().split('T')[0]}`);
      console.log(`Address: ${row.address}`); // This should now show Hebrew
      console.log(`Gush/Chelka: ${row.gush_chelka_sub}`);
      console.log(`Rooms: ${row.rooms}, Area: ${row.apartment_area_sqm} sqm`);
      console.log(`Price: ₪${row.declared_price?.toLocaleString()}, Per sqm: ₪${row.price_per_sqm_rounded?.toLocaleString()}`);
      console.log('-'.repeat(40));
    });
    
    await db.disconnect();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Also create a function to properly import CSV with correct Hebrew encoding
async function reImportWithCorrectHebrew() {
  try {
    console.log('\n🔄 Re-importing CSV with correct Hebrew mapping...');
    
    // First, let's clear existing data
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    await db.client.query('DELETE FROM comparable_data');
    console.log('🗑️ Cleared existing data');
    
    // Sample data with correct Hebrew (based on your Excel analysis)
    const correctData = [
      {
        'יום מכירה': '2025-02-20',
        'כתובת': 'תאשור 3',
        'גו"ח': '9905/85',
        'חדרים': 4,
        'קומה': '2',
        'שטח דירה במ"ר': 109,
        'חניות': 1,
        'שנת בניה': 2008,
        'מחיר מוצהר': 2600000,
        'מחיר למ"ר, במעוגל': 23900
      },
      {
        'יום מכירה': '2024-11-03',
        'כתובת': 'הרב איפרגן 6',
        'גו"ח': '9905/79',
        'חדרים': 4,
        'קומה': '3',
        'שטח דירה במ"ר': 106,
        'חניות': 1,
        'שנת בניה': 2011,
        'מחיר מוצהר': 2570000,
        'מחיר למ"ר, במעוגל': 24200
      },
      {
        'יום מכירה': '2024-09-18',
        'כתובת': 'נתניה 17',
        'גו"ח': '9905/89',
        'חדרים': 4,
        'קומה': '4',
        'שטח דירה במ"ר': 117,
        'חניות': 2,
        'שנת בניה': 2012,
        'מחיר מוצהר': 2720000,
        'מחיר למ"ר, במעוגל': 23200
      }
      // Add more data as needed...
    ];
    
    console.log(`📥 Importing ${correctData.length} sample records with correct Hebrew...`);
    
    let imported = 0;
    for (let i = 0; i < correctData.length; i++) {
      try {
        const result = await db.insertComparableData(
          correctData[i],
          'corrected_hebrew_data.csv',
          i + 1,
          'hebrew-fix-importer'
        );
        
        console.log(`✅ Imported record ${i + 1} (ID: ${result.id}): ${correctData[i]['כתובת']}`);
        imported++;
      } catch (error) {
        console.error(`❌ Failed to import record ${i + 1}:`, error.message);
      }
    }
    
    await db.disconnect();
    
    console.log(`\n🎯 Re-import completed: ${imported} records with correct Hebrew`);
    
  } catch (error) {
    console.error('❌ Re-import failed:', error.message);
  }
}

// Run the fix
console.log('🚀 Starting Hebrew display fix...');

// Option 1: Fix existing corrupted data
fixHebrewDisplay()
  .then(() => {
    console.log('\n💡 Tip: To prevent encoding issues in the future:');
    console.log('  1. Save CSV files as UTF-8 with BOM');
    console.log('  2. Use proper Hebrew text editors');
    console.log('  3. Verify encoding before import');
  })
  .catch(error => {
    console.error('❌ Fix process failed:', error.message);
  });

// Uncomment this if you want to re-import with clean data:
// reImportWithCorrectHebrew();