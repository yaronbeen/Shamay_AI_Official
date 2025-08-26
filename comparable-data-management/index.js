/**
 * Comparable Data Management Module
 * 
 * Main module for managing comparable property sales data from CSV imports
 * Handles Hebrew CSV data processing, validation, and analysis
 */

import { ComparableDataDatabaseClient } from './database-client.js';
import fs from 'fs';
import csv from 'csv-parser';

/**
 * Import CSV data into comparable_data table
 * @param {string} csvFilePath - Path to CSV file
 * @param {string} userId - ID of user importing the data
 * @returns {Promise<Object>} - Import results
 */
async function importComparableDataCSV(csvFilePath, userId = 'system') {
  try {
    console.log(`📊 Importing CSV data from: ${csvFilePath}`);
    
    const csvData = await parseCSVFile(csvFilePath);
    const filename = csvFilePath.split('/').pop();
    
    const db = new ComparableDataDatabaseClient();
    const results = await db.bulkInsertComparableData(csvData, filename, userId);
    await db.disconnect();
    
    console.log(`✅ CSV import completed!`);
    console.log(`  Successful: ${results.successful.length} records`);
    console.log(`  Failed: ${results.failed.length} records`);
    
    return {
      success: true,
      filename: filename,
      totalRows: csvData.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results: results
    };
    
  } catch (error) {
    console.error('❌ Failed to import CSV data:', error.message);
    throw error;
  }
}

/**
 * Parse CSV file with Hebrew headers
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of row objects
 */
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Clean up any BOM or encoding issues
        const cleanRow = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.replace(/^\uFEFF/, '').trim();
          cleanRow[cleanKey] = row[key] ? row[key].toString().trim() : null;
        });
        results.push(cleanRow);
      })
      .on('end', () => {
        console.log(`📊 Parsed ${results.length} rows from CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Get comparable data by ID
 * @param {number} id - Record ID
 * @returns {Promise<Object>} - Comparable data record
 */
async function getComparableData(id) {
  try {
    const db = new ComparableDataDatabaseClient();
    const result = await db.getComparableDataById(id);
    await db.disconnect();
    
    if (!result) {
      throw new Error(`Comparable data with ID ${id} not found`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to get comparable data:', error.message);
    throw error;
  }
}

/**
 * Search comparable data by criteria
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Array>} - Matching records
 */
async function searchComparableData(criteria) {
  try {
    const db = new ComparableDataDatabaseClient();
    const results = await db.searchComparableData(criteria);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to search comparable data:', error.message);
    throw error;
  }
}

/**
 * Get comparable data by city
 * @param {string} city - City name
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} - Records for the city
 */
async function getComparableDataByCity(city, limit = 20) {
  try {
    const db = new ComparableDataDatabaseClient();
    const results = await db.getComparableDataByCity(city, limit);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get comparable data by city:', error.message);
    throw error;
  }
}

/**
 * Get comparable data statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getComparableDataStats() {
  try {
    const db = new ComparableDataDatabaseClient();
    const stats = await db.getComparableDataStats();
    await db.disconnect();
    
    return stats;
    
  } catch (error) {
    console.error('❌ Failed to get comparable data statistics:', error.message);
    throw error;
  }
}

/**
 * Analyze comparable data for property valuation
 * @param {Object} propertyData - Property data to compare
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeComparableData(propertyData) {
  try {
    console.log('📈 Analyzing comparable data...');
    
    // Search for similar properties
    const criteria = {};
    
    if (propertyData.city) {
      criteria.city = propertyData.city;
    }
    
    if (propertyData.rooms) {
      criteria.min_rooms = Math.max(propertyData.rooms - 0.5, 1);
      criteria.max_rooms = propertyData.rooms + 0.5;
    }
    
    if (propertyData.area) {
      criteria.min_area = propertyData.area * 0.8;
      criteria.max_area = propertyData.area * 1.2;
    }
    
    const similarProperties = await searchComparableData(criteria);
    
    if (similarProperties.length === 0) {
      return {
        success: false,
        message: 'No comparable data found for analysis',
        comparables: []
      };
    }
    
    // Calculate statistics
    const prices = similarProperties
      .filter(p => p.declared_price && p.declared_price > 0)
      .map(p => p.declared_price);
      
    const pricesPerSqm = similarProperties
      .filter(p => p.verified_price_per_sqm && p.verified_price_per_sqm > 0)
      .map(p => p.verified_price_per_sqm);
    
    const analysis = {
      success: true,
      totalComparables: similarProperties.length,
      averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : null,
      medianPrice: prices.length > 0 ? calculateMedian(prices) : null,
      averagePricePerSqm: pricesPerSqm.length > 0 ? pricesPerSqm.reduce((a, b) => a + b) / pricesPerSqm.length : null,
      medianPricePerSqm: pricesPerSqm.length > 0 ? calculateMedian(pricesPerSqm) : null,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      comparables: similarProperties.slice(0, 10) // Top 10 most relevant
    };
    
    // Estimate value if property area is provided
    if (propertyData.area && analysis.averagePricePerSqm) {
      analysis.estimatedValue = Math.round(analysis.averagePricePerSqm * propertyData.area);
      analysis.estimatedRange = {
        low: Math.round(analysis.estimatedValue * 0.9),
        high: Math.round(analysis.estimatedValue * 1.1)
      };
    }
    
    console.log(`✅ Analysis completed with ${analysis.totalComparables} comparables`);
    return analysis;
    
  } catch (error) {
    console.error('❌ Failed to analyze comparable data:', error.message);
    throw error;
  }
}

/**
 * Calculate median value from array
 * @param {Array} values - Array of numbers
 * @returns {number} - Median value
 */
function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Format price for display
 * @param {number} price - Price value
 * @returns {string} - Formatted price string
 */
function formatPrice(price) {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

/**
 * Create sample CSV data for testing
 * @param {string} outputPath - Path to save sample CSV
 * @returns {Promise<string>} - Path to created file
 */
async function createSampleCSV(outputPath = './sample_comparable_data.csv') {
  const sampleData = [
    {
      'יום מכירה': '15/01/2024',
      'כתובת': 'רחוב הרצל 123, תל אביב',
      'גו"ח': '9905/88/8',
      'חדרים': '3.5',
      'קומה': '2',
      'שטח דירה במ"ר': '85.5',
      'חניות': '1',
      'שנת בניה': '2010',
      'מחיר מוצהר': '2850000',
      'מחיר למ"ר, במעוגל': '33300'
    },
    {
      'יום מכירה': '22/01/2024',
      'כתובת': 'שדרות רוטשילד 45, תל אביב',
      'גו"ח': '9905/89/12',
      'חדרים': '4',
      'קומה': '5',
      'שטח דירה במ"ר': '105.2',
      'חניות': '1',
      'שנת בניה': '2015',
      'מחיר מוצהר': '4200000',
      'מחיר למ"ר, במעוגל': '39900'
    },
    {
      'יום מכירה': '28/01/2024',
      'כתובת': 'רחוב יפו 67, ירושלים',
      'גו"ח': '30123/45/7',
      'חדרים': '3',
      'קומה': '1',
      'שטח דירה במ"ר': '78.3',
      'חניות': '0',
      'שנת בניה': '1985',
      'מחיר מוצהר': '2100000',
      'מחיר למ"ר, במעוגל': '26800'
    }
  ];
  
  // Convert to CSV format
  const headers = Object.keys(sampleData[0]);
  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => headers.map(header => `"${row[header]}"`).join(','))
  ].join('\n');
  
  await fs.promises.writeFile(outputPath, csvContent, 'utf8');
  console.log(`📄 Sample CSV created at: ${outputPath}`);
  
  return outputPath;
}

export {
  // Main operations
  importComparableDataCSV,
  parseCSVFile,
  getComparableData,
  searchComparableData,
  getComparableDataByCity,
  
  // Analytics
  analyzeComparableData,
  getComparableDataStats,
  
  // Utility functions
  formatPrice,
  calculateMedian,
  createSampleCSV,
  
  // Database client for advanced usage
  ComparableDataDatabaseClient
};