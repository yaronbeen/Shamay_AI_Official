/**
 * Header Mapping Utility
 * Maps both Hebrew and English CSV headers to database columns
 */

// Mapping from English CSV headers to database columns
const ENGLISH_TO_DB_MAP = {
  // English headers from the user's example
  'id': 'id', // Internal ID - skip on import
  'block_number': 'block_number', // Not in current schema, but preserve
  'locality_name': 'city', // Maps to city
  'region_name': 'region_name', // Not in current schema, but preserve
  'block_of_land': 'gush_chelka_sub', // Maps to gush_chelka_sub
  'settlement': 'city', // Alternative city field
  'asset_type': 'asset_type', // Not in current schema, but preserve
  'essence': 'essence', // Not in current schema, but preserve
  'rooms': 'rooms', // Direct mapping
  'surface': 'apartment_area_sqm', // Maps to apartment_area_sqm
  'year_of_construction': 'construction_year', // Maps to construction_year
  'sale_value_nis': 'declared_price', // Maps to declared_price (total price)
  'declared_value_nis': 'declared_price', // Alternative name for declared_price (total price)
  'price': 'declared_price', // Common variation for total price
  'sale_day': 'sale_date', // Maps to sale_date
  'part_sold': 'part_sold', // Not in current schema, but preserve
  'street': 'street_name', // Maps to street_name
  'house_number': 'house_number', // Direct mapping
  'floor': 'floor_number', // Maps to floor_number
  'total_floors': 'total_floors', // Not in current schema, but preserve
  'screenshot_url': 'screenshot_url', // Not in current schema, but preserve
  'city': 'city', // Direct mapping
  'apartment_number': 'apartment_number', // Not in current schema, but preserve
  'entrance': 'entrance', // Not in current schema, but preserve
  'created_at': 'created_at', // Skip on import (auto-generated)
  
  // Common English variations
  'address': 'address',
  'sale_date': 'sale_date',
  'price': 'declared_price', // Total price (maps to declared_price)
  'price_per_sqm': 'price_per_sqm_rounded', // Price per sqm (maps to price_per_sqm_rounded)
  'price_per_m2': 'price_per_sqm_rounded', // Price per m2 (alternative)
  'sqm_price': 'price_per_sqm_rounded', // Sqm price (alternative)
  'area': 'apartment_area_sqm',
  'construction_year': 'construction_year',
  'parking': 'parking_spaces',
  'parking_spaces': 'parking_spaces',
  'gush_chelka': 'gush_chelka_sub',
  'gush': 'gush',
  'chelka': 'chelka'
};

// Mapping from Hebrew CSV headers to database columns
const HEBREW_TO_DB_MAP = {
  'כתובת': 'address',
  'יום מכירה': 'sale_date',
  'גו"ח': 'gush_chelka_sub',
  'גוח': 'gush_chelka_sub',
  'חדרים': 'rooms',
  'קומה': 'floor_number',
  'שטח דירה במ"ר': 'apartment_area_sqm',
  'שטח דירה במר': 'apartment_area_sqm',
  'חניות': 'parking_spaces',
  'שנת בניה': 'construction_year',
  'שנת בנייה': 'construction_year',
  'מחיר מוצהר': 'declared_price',
  'מחיר למ"ר, במעוגל': 'price_per_sqm_rounded',
  'מחיר למר במעוגל': 'price_per_sqm_rounded',
  'עיר': 'city',
  'רחוב': 'street_name',
  'שם רחוב': 'street_name',
  'מספר בית': 'house_number',
  'גוש': 'gush',
  'חלקה': 'chelka',
  'תת חלקה': 'sub_chelka'
};

// Reverse mapping: Database column to English display name
const DB_TO_ENGLISH_DISPLAY = {
  'address': 'Address',
  'sale_date': 'Sale Date',
  'rooms': 'Rooms',
  'floor_number': 'Floor',
  'apartment_area_sqm': 'Area (sqm)',
  'parking_spaces': 'Parking',
  'construction_year': 'Construction Year',
  'declared_price': 'Price',
  'price_per_sqm_rounded': 'Price per sqm',
  'city': 'City',
  'street_name': 'Street',
  'house_number': 'House Number',
  'gush': 'Gush',
  'chelka': 'Chelka',
  'sub_chelka': 'Sub Chelka',
  'gush_chelka_sub': 'Gush/Chelka/Sub'
};

// Reverse mapping: Database column to Hebrew display name
const DB_TO_HEBREW_DISPLAY = {
  'address': 'כתובת',
  'sale_date': 'יום מכירה',
  'rooms': 'חדרים',
  'floor_number': 'קומה',
  'apartment_area_sqm': 'שטח דירה (מ"ר)',
  'parking_spaces': 'חניות',
  'construction_year': 'שנת בניה',
  'declared_price': 'מחיר מוצהר',
  'price_per_sqm_rounded': 'מחיר למ"ר',
  'city': 'עיר',
  'street_name': 'רחוב',
  'house_number': 'מספר בית',
  'gush': 'גוש',
  'chelka': 'חלקה',
  'sub_chelka': 'תת חלקה',
  'gush_chelka_sub': 'גו"ח'
};

/**
 * Get database column name from CSV header (supports both Hebrew and English)
 * @param {string} csvHeader - CSV header (can be Hebrew or English)
 * @returns {string} - Database column name
 */
function getDbColumnFromHeader(csvHeader) {
  if (!csvHeader) return null;
  
  // Clean header
  const cleanHeader = csvHeader.trim().replace(/^\uFEFF/, '');
  
  // Check if it's Hebrew
  const isHebrew = /[\u0590-\u05FF]/.test(cleanHeader);
  
  if (isHebrew) {
    // Use Hebrew mapping
    return HEBREW_TO_DB_MAP[cleanHeader] || cleanHeader;
  } else {
    // Use English mapping (normalize to lowercase)
    const normalized = cleanHeader.toLowerCase();
    return ENGLISH_TO_DB_MAP[normalized] || ENGLISH_TO_DB_MAP[cleanHeader] || cleanHeader;
  }
}

/**
 * Check if a CSV header is a Hebrew header
 * @param {string} header - CSV header
 * @returns {boolean} - True if Hebrew
 */
function isHebrewHeader(header) {
  if (!header) return false;
  return /[\u0590-\u05FF]/.test(header);
}

/**
 * Get display name for database column (Hebrew or English)
 * @param {string} dbColumn - Database column name
 * @param {boolean} useHebrew - If true, return Hebrew display name
 * @returns {string} - Display name
 */
function getDisplayName(dbColumn, useHebrew = true) {
  if (useHebrew) {
    return DB_TO_HEBREW_DISPLAY[dbColumn] || dbColumn;
  } else {
    return DB_TO_ENGLISH_DISPLAY[dbColumn] || dbColumn;
  }
}

/**
 * Extract value from CSV row using header mapping
 * @param {Object} csvRow - CSV row object
 * @param {string} csvHeader - CSV header (Hebrew or English)
 * @returns {any} - Extracted value
 */
function getValueFromRow(csvRow, csvHeader) {
  if (!csvRow || !csvHeader) return null;
  
  // Try exact match first
  if (csvRow[csvHeader] !== undefined) {
    return csvRow[csvHeader];
  }
  
  // Try normalized match (case-insensitive for English)
  const isHebrew = isHebrewHeader(csvHeader);
  if (!isHebrew) {
    const normalized = csvHeader.toLowerCase();
    for (const key in csvRow) {
      if (key.toLowerCase() === normalized) {
        return csvRow[key];
      }
    }
  }
  
  return null;
}

module.exports = {
  ENGLISH_TO_DB_MAP,
  HEBREW_TO_DB_MAP,
  DB_TO_ENGLISH_DISPLAY,
  DB_TO_HEBREW_DISPLAY,
  getDbColumnFromHeader,
  isHebrewHeader,
  getDisplayName,
  getValueFromRow
};

