#!/usr/bin/env node

/**
 * Hebrew Data Viewer CLI
 * View comparable data with proper Hebrew text display
 */

import { ComparableDataDatabaseClient } from './comparable-data-management/database-client.js';

async function viewHebrewData() {
  try {
    console.log('🏠 נתוני השוואה - Hebrew Property Data Viewer');
    console.log('='.repeat(60));
    
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    // Get all data with proper Hebrew display
    const query = `
      SELECT id, sale_date, address, gush_chelka_sub, rooms, 
             apartment_area_sqm, declared_price, price_per_sqm_rounded,
             data_quality_score
      FROM comparable_data 
      ORDER BY declared_price DESC
    `;
    
    const result = await db.client.query(query);
    
    console.log(`\n📊 מצאנו ${result.rows.length} נכסים (Found ${result.rows.length} properties)\n`);
    
    // Display with Hebrew formatting
    result.rows.forEach((row, index) => {
      console.log(`🏡 נכס #${index + 1} (Property #${index + 1})`);
      console.log(`   📅 תאריך מכירה: ${row.sale_date?.toISOString().split('T')[0]} (Sale Date)`);
      console.log(`   🏠 כתובת: ${row.address} (Address)`);
      console.log(`   📍 גו"ח: ${row.gush_chelka_sub} (Gush/Chelka)`);
      console.log(`   🚪 חדרים: ${row.rooms} (Rooms)`);
      console.log(`   📐 שטח: ${row.apartment_area_sqm} מ"ר (${row.apartment_area_sqm} sqm)`);
      console.log(`   💰 מחיר: ₪${row.declared_price?.toLocaleString()} (Price)`);
      console.log(`   💹 מחיר למ"ר: ₪${row.price_per_sqm_rounded?.toLocaleString()} (Price/sqm)`);
      console.log(`   ⭐ איכות נתונים: ${row.data_quality_score}% (Data Quality)`);
      console.log('-'.repeat(50));
    });
    
    // Summary statistics in Hebrew
    console.log('\n📊 סטטיסטיקות (Statistics):');
    console.log('='.repeat(30));
    
    const prices = result.rows.map(r => r.declared_price).filter(p => p);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    console.log(`📈 מחיר ממוצע: ₪${avgPrice.toLocaleString()} (Average Price)`);
    console.log(`🔝 מחיר מקסימלי: ₪${maxPrice.toLocaleString()} (Max Price)`);
    console.log(`🔻 מחיר מינימלי: ₪${minPrice.toLocaleString()} (Min Price)`);
    console.log(`📊 טווח מחירים: ₪${(maxPrice - minPrice).toLocaleString()} (Price Range)`);
    
    // Group by street
    const byStreet = {};
    result.rows.forEach(row => {
      const street = row.address.split(' ')[0]; // Get street name
      if (!byStreet[street]) byStreet[street] = [];
      byStreet[street].push(row);
    });
    
    console.log('\n🏘️ לפי רחוב (By Street):');
    console.log('-'.repeat(30));
    Object.entries(byStreet).forEach(([street, properties]) => {
      const avgStreetPrice = properties.reduce((sum, p) => sum + (p.declared_price || 0), 0) / properties.length;
      console.log(`   ${street}: ${properties.length} נכסים, ממוצע ₪${avgStreetPrice.toLocaleString()}`);
      console.log(`   ${street}: ${properties.length} properties, avg ₪${avgStreetPrice.toLocaleString()}`);
    });
    
    await db.disconnect();
    
    console.log('\n✅ הצגת נתונים הושלמה (Data display completed)');
    
  } catch (error) {
    console.error('❌ שגיאה בהצגת נתונים (Data display error):', error.message);
  }
}

// Run the viewer
if (import.meta.url === `file://${process.argv[1]}`) {
  viewHebrewData();
}

export { viewHebrewData };