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
    let rowNumber = 0;
    let headers = [];
    
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        skipEmptyLines: true,
        trim: true
      }))
      .on('headers', (parsedHeaders) => {
        headers = parsedHeaders;
        console.log('📋 CSV Headers detected:', headers);
      })
      .on('data', (row) => {
        rowNumber++;
        
        // Debug: log first row to see data
        if (rowNumber === 1) {
          console.log('📋 First row raw:', row);
        }
        
        // Clean up any BOM or encoding issues
        const cleanRow = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.replace(/^\uFEFF/, '').trim();
          const value = row[key] ? row[key].toString().trim() : null;
          cleanRow[cleanKey] = value;
        });
        
        // Skip empty rows (all values are null or empty)
        const hasData = Object.values(cleanRow).some(val => val && val.length > 0);
        if (hasData) {
          results.push(cleanRow);
          if (rowNumber === 1) {
            console.log('📋 First row cleaned:', cleanRow);
          }
        } else {
          console.log(`⚠️ Skipping empty row ${rowNumber}`);
        }
      })
      .on('end', () => {
        console.log(`📊 Parsed ${results.length} valid rows from CSV (skipped ${rowNumber - results.length} empty rows)`);
        if (results.length > 0) {
          console.log('📋 Final sample row keys:', Object.keys(results[0]));
        }
        resolve(results);
      })
      .on('error', (error) => {
        console.error('❌ CSV parsing error:', error);
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
 * @param {string} sessionId - Optional session ID to save results
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeComparableData(propertyData, sessionId = null) {
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
        analysis: {
          analysis_results: {
            comparables: [],
            market_trends: "לא נמצא",
            adjustment_factor: 1,
            avg_price_per_sqm: 0,
            median_price_per_sqm: 0
          }
        },
        extractedData: {
          comparables: [],
          market_trends: "לא נמצא",
          adjustment_factor: 1,
          avg_price_per_sqm: 0,
          median_price_per_sqm: 0
        }
      };
    }
    
    // Calculate statistics
    console.log(`📊 Found ${similarProperties.length} similar properties`);
    if (similarProperties.length > 0) {
      console.log('📊 Sample property:', similarProperties[0]);
    }
    
    const pricesPerSqm = similarProperties
      .filter(p => p.verified_price_per_sqm && parseFloat(p.verified_price_per_sqm) > 0)
      .map(p => parseFloat(p.verified_price_per_sqm));
    
    console.log(`📊 Extracted ${pricesPerSqm.length} price per sqm values:`, pricesPerSqm);
    
    // Format comparables to match expected structure
    const comparables = similarProperties.map(p => {
      // Parse floor_number - handle both string and numeric
      let floor = 0;
      if (p.floor_number) {
        const floorStr = String(p.floor_number).trim();
        const floorMatch = floorStr.match(/(\d+)/);
        if (floorMatch) {
          floor = parseInt(floorMatch[1]) || 0;
        }
      }
      
      return {
        address: p.address || p.street_name || '',
        size: Math.round(parseFloat(p.area || p.apartment_area_sqm || 0)),
        floor: floor,
        price: Math.round(parseFloat(p.price || p.declared_price || 0)),
        rooms: parseFloat(p.rooms) || 0,
        price_per_sqm: Math.round(parseFloat(p.verified_price_per_sqm || p.price_per_sqm_rounded || 0))
      };
    });
    
    // Calculate prices (total prices, not per sqm)
    const prices = similarProperties
      .filter(p => p.price && parseFloat(p.price) > 0)
      .map(p => parseFloat(p.price));
    
    // Calculate average and median price per sqm
    const avg_price_per_sqm = pricesPerSqm.length > 0 
      ? pricesPerSqm.reduce((a, b) => a + b) / pricesPerSqm.length 
      : 0;
    const median_price_per_sqm = pricesPerSqm.length > 0 
      ? calculateMedian(pricesPerSqm) 
      : 0;
    
    // Calculate average and median total price
    const avg_price = prices.length > 0 
      ? prices.reduce((a, b) => a + b) / prices.length 
      : 0;
    const median_price = prices.length > 0 
      ? calculateMedian(prices) 
      : 0;
    
    // Calculate market trends based on price per sqm variance
    let market_trends = "יציב";
    if (pricesPerSqm.length > 2) {
      const variance = pricesPerSqm.reduce((sum, price) => {
        return sum + Math.pow(price - avg_price_per_sqm, 2);
      }, 0) / pricesPerSqm.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avg_price_per_sqm) * 100;
      
      if (coefficientOfVariation > 15) {
        market_trends = "משתנה - פערים משמעותיים במחירים";
      } else if (coefficientOfVariation > 8) {
        market_trends = "תנודתי במידה בינונית";
      } else {
        market_trends = "יציב - מחירים עקביים";
      }
    }
    
    // Build analysis_results structure
    const analysis_results = {
      comparables: comparables,
      market_trends: market_trends,
      adjustment_factor: 1,
      avg_price_per_sqm: Math.round(avg_price_per_sqm),
      median_price_per_sqm: Math.round(median_price_per_sqm),
      avg_price: Math.round(avg_price),
      median_price: Math.round(median_price),
      total_comparables: comparables.length,
      price_range: prices.length > 0 ? {
        min: Math.round(Math.min(...prices)),
        max: Math.round(Math.max(...prices))
      } : null
    };
    
    // Build the full response structure
    const response = {
      success: true,
      message: "Comparable sales data processed successfully",
      analysis: {
        analysis_results: analysis_results,
        created_at: new Date().toISOString()
      },
      extractedData: {
        avg_price_per_sqm: Math.round(avg_price_per_sqm),
        median_price_per_sqm: Math.round(median_price_per_sqm),
        avg_price: Math.round(avg_price),
        median_price: Math.round(median_price),
        adjustment_factor: 1,
        comparables: comparables,
        market_trends: market_trends,
        total_comparables: comparables.length,
        price_range: prices.length > 0 ? {
          min: Math.round(Math.min(...prices)),
          max: Math.round(Math.max(...prices))
        } : null
      }
    };
    
    // Save to database if sessionId provided
    if (sessionId) {
      try {
        const db = new ComparableDataDatabaseClient();
        // Save the analysis_results structure
        await db.saveAnalysisResults(sessionId, analysis_results);
        await db.disconnect();
        console.log(`✅ Analysis results saved to database for session ${sessionId}`);
      } catch (saveError) {
        console.warn('⚠️ Failed to save analysis to database:', saveError.message);
        // Don't fail the whole operation if save fails
      }
    }
    
    console.log(`✅ Analysis completed with ${comparables.length} comparables`);
    return response;
    
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