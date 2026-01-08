const dotenv = require('dotenv');
dotenv.config();

// Import header mapping utility for supporting both Hebrew and English CSV headers
const headerMapping = require('./header-mapping.js');

// Lazy-load database client based on environment
let ClientClass = null;

function getClientClass() {
  if (ClientClass) return ClientClass;
  
  try {
    // Try Neon serverless first (for Vercel)
    if (process.env.VERCEL || process.env.DATABASE_URL) {
      const neon = require('@neondatabase/serverless');
      ClientClass = neon.Client;
      console.log('✅ Using @neondatabase/serverless for comparable data');
    } else {
      // Use standard pg for local development
      const pg = require('pg');
      ClientClass = pg.Client;
      console.log('✅ Using pg for comparable data (local development)');
    }
  } catch (e) {
    // Fallback to pg if Neon not available
    const pg = require('pg');
    ClientClass = pg.Client;
    console.log('✅ Using pg for comparable data (fallback)');
  }
  
  return ClientClass;
}

class ComparableDataDatabaseClient {
  constructor(organizationId = null, userId = null) {
    const isLocal = process.env.DB_HOST === 'localhost' || !process.env.DB_HOST || process.env.DB_HOST.includes('127.0.0.1');
    const useNeon = process.env.VERCEL || process.env.DATABASE_URL;
    
    // Store organization and user IDs for filtering queries
    this.organizationId = organizationId || process.env.ORGANIZATION_ID || null
    this.userId = userId || process.env.USER_ID || null
    
    // Get the appropriate Client class
    const Client = getClientClass();
    
    // Use DATABASE_URL if available (Vercel/Neon), otherwise use individual env vars
    if (useNeon && process.env.DATABASE_URL) {
      this.client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    } else {
      this.client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'shamay_land_registry',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
        // Add SSL configuration for remote databases
        ssl: isLocal ? false : {
          rejectUnauthorized: false,
          require: true
        }
      });
    }
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      try {
        await this.client.connect();
        this.connected = true;
        console.log('✅ Connected to PostgreSQL database (Comparable Data)');
      } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
      }
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
      console.log('🔌 Disconnected from database');
    }
  }

  /**
   * Parse address to extract city, street, and house number
   */
  parseAddress(addressStr) {
    if (!addressStr) return { city: null, street_name: null, house_number: null };
    
    // Address format: "רחוב הרצל 123, תל אביב" or "שדרות רוטשילד 45, תל אביב"
    const parts = addressStr.split(',').map(p => p.trim());
    const city = parts.length > 1 ? parts[parts.length - 1] : null;
    
    const streetPart = parts[0] || '';
    // Extract house number (digits at the end)
    const houseNumberMatch = streetPart.match(/(\d+)\s*$/);
    const house_number = houseNumberMatch ? houseNumberMatch[1] : null;
    const street_name = houseNumberMatch 
      ? streetPart.substring(0, houseNumberMatch.index).trim()
      : streetPart.trim();
    
    return {
      city: city || null,
      street_name: street_name || null,
      house_number: house_number || null
    };
  }

  /**
   * Parse גו"ח format (e.g., "9905/88/8") to extract gush, chelka, sub_chelka
   */
  parseGushChelka(gushStr) {
    if (!gushStr) return { gush: null, chelka: null, sub_chelka: null };
    
    try {
      const parts = gushStr.split('/').map(p => parseInt(p.trim()));
      return {
        gush: parts[0] || null,
        chelka: parts[1] || null,
        sub_chelka: parts[2] || null
      };
    } catch {
      return { gush: null, chelka: null, sub_chelka: null };
    }
  }

  async insertComparableData(csvData, csvFilename, rowNumber, userId = 'system') {
    // This method is kept for backward compatibility but bulkInsert should be used
    await this.connect();

    try {
      const query = `
        INSERT INTO comparable_data (
          csv_filename, row_number, sale_date, address, gush_chelka_sub,
          rooms, floor_number, apartment_area_sqm, parking_spaces,
          construction_year, declared_price, price_per_sqm_rounded,
          city, street_name, house_number, gush, chelka, sub_chelka
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING id, created_at;
      `;

      // Parse Hebrew date format (DD/MM/YYYY)
      const parseHebrewDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return dateStr;
        } catch {
          return null;
        }
      };

      const address = csvData['כתובת'] || null;
      const parsedAddress = this.parseAddress(address);
      const parsedGush = this.parseGushChelka(csvData['גוח'] || csvData['גו"ח']);

      const values = [
        csvFilename,                                          // 1
        rowNumber,                                           // 2
        parseHebrewDate(csvData['יום מכירה']),                // 3
        address,                                             // 4
        csvData['גוח'] || csvData['גו"ח'] || null,            // 5
        csvData['חדרים'] ? parseFloat(csvData['חדרים']) : null, // 6
        csvData['קומה'] || null,                             // 7
        csvData['שטח דירה במר'] || csvData['שטח דירה במ"ר'] ? parseFloat(csvData['שטח דירה במר'] || csvData['שטח דירה במ"ר']) : null, // 8
        csvData['חניות'] ? parseInt(csvData['חניות']) : null, // 9
        csvData['שנת בניה'] ? parseInt(csvData['שנת בניה']) : null, // 10
        csvData['מחיר מוצהר'] ? parseFloat(csvData['מחיר מוצהר']) : null, // 11
        csvData['מחיר למר במעוגל'] || csvData['מחיר למ"ר, במעוגל'] ? parseFloat(csvData['מחיר למר במעוגל'] || csvData['מחיר למ"ר, במעוגל']) : null, // 12
        parsedAddress.city,                                  // 13
        parsedAddress.street_name,                           // 14
        parsedAddress.house_number,                          // 15
        parsedGush.gush,                                     // 16
        parsedGush.chelka,                                   // 17
        parsedGush.sub_chelka                                // 18
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];

      console.log(`📊 Inserted comparable data record with ID: ${insertedRow.id}`);

      return {
        id: insertedRow.id,
        created_at: insertedRow.created_at
      };

    } catch (error) {
      console.error('❌ Database insertion failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Bulk insert CSV data
   * @param {Array} csvRows - Array of CSV row objects
   * @param {string} csvFilename - Source CSV filename
   * @param {string} userId - User importing the data
   * @param {string} organizationId - Organization/Company ID (optional, can be set via constructor)
   * @returns {Object} - Import results
   */
  async bulkInsertComparableData(csvRows, csvFilename, userId = 'system', organizationId = null) {
    // Store organizationId and userId for use in inserts
    // CRITICAL: Ensure these are strings, not arrays or objects
    this.organizationId = (organizationId || this.organizationId || 'default-org')
    this.userId = (userId || this.userId || 'system')
    
    // Ensure single string value (not array)
    if (Array.isArray(this.userId)) {
      this.userId = this.userId[0] || 'system'
    }
    if (Array.isArray(this.organizationId)) {
      this.organizationId = this.organizationId[0] || 'default-org'
    }
    
    // Convert to string if not already
    this.organizationId = String(this.organizationId)
    this.userId = String(this.userId)
    // Connect once for the entire bulk operation
    await this.connect();
    
    const results = {
      successful: [],
      failed: []
    };

    // Parse date format - supports both Hebrew (DD/MM/YYYY) and ISO (YYYY-MM-DD)
    const parseHebrewDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        const trimmed = dateStr.trim();
        
        // If already in ISO format (YYYY-MM-DD), return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return trimmed;
        }
        
        // Hebrew format (DD/MM/YYYY)
        if (trimmed.includes('/')) {
          const parts = trimmed.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts.map(p => p.trim());
            // Check if it's DD/MM/YYYY or MM/DD/YYYY based on year position
            if (year.length === 4 && parseInt(year) > 1900) {
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (day.length === 4 && parseInt(day) > 1900) {
              // MM/DD/YYYY format
              return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
            }
          }
        }
        
        return trimmed; // Return as-is if format not recognized
      } catch {
        return null;
      }
    };

    // Parse address helper
    const parseAddress = (addressStr) => {
      if (!addressStr) return { city: null, street_name: null, house_number: null };
      
      const parts = addressStr.split(',').map(p => p.trim());
      const city = parts.length > 1 ? parts[parts.length - 1] : null;
      
      const streetPart = parts[0] || '';
      const houseNumberMatch = streetPart.match(/(\d+)\s*$/);
      const house_number = houseNumberMatch ? houseNumberMatch[1] : null;
      const street_name = houseNumberMatch 
        ? streetPart.substring(0, houseNumberMatch.index).trim()
        : streetPart.trim();
      
      return { city: city || null, street_name: street_name || null, house_number: house_number || null };
    };

    // Parse גו"ח helper - supports both formats:
    // Hebrew: "9905/88/8" or "9905/88" 
    // English: "001656-0010-003-00" or "1656-10-3"
    const parseGushChelka = (gushStr) => {
      if (!gushStr) return { gush: null, chelka: null, sub_chelka: null };
      try {
        const trimmed = gushStr.trim();
        
        // Check if it's the English format with dashes (block_of_land format)
        if (trimmed.includes('-')) {
          // Format: "001656-0010-003-00" or "1656-10-3"
          const parts = trimmed.split('-').map(p => {
            // Remove leading zeros
            const num = parseInt(p.trim());
            return isNaN(num) ? null : num;
          }).filter(p => p !== null);
          
          return {
            gush: parts[0] || null,
            chelka: parts[1] || null,
            sub_chelka: parts[2] || null
          };
        }
        
        // Hebrew format with slashes: "9905/88/8" or "9905/88"
        if (trimmed.includes('/')) {
          const parts = trimmed.split('/').map(p => {
            const num = parseInt(p.trim());
            return isNaN(num) ? null : num;
          }).filter(p => p !== null);
          
          return {
            gush: parts[0] || null,
            chelka: parts[1] || null,
            sub_chelka: parts[2] || null
          };
        }
        
        // Try to parse as single number (gush only)
        const singleNum = parseInt(trimmed);
        if (!isNaN(singleNum)) {
          return {
            gush: singleNum,
            chelka: null,
            sub_chelka: null
          };
        }
        
        return { gush: null, chelka: null, sub_chelka: null };
      } catch {
        return { gush: null, chelka: null, sub_chelka: null };
      }
    };

    try {
      for (let i = 0; i < csvRows.length; i++) {
        try {
          const csvData = csvRows[i];
          
          // CRITICAL: Support both Hebrew and English headers
          // Use header mapping to get values regardless of header language
          const getValue = (headerOptions) => {
            for (const header of headerOptions) {
              const value = headerMapping.getValueFromRow(csvData, header);
              if (value !== null && value !== undefined && value !== '') {
                return value;
              }
            }
            return null;
          };
          
          // Try both Hebrew and English headers for address
          // For English format, construct address from street + house_number + city
          const streetValue = getValue(['רחוב', 'שם רחוב', 'street_name', 'street']);
          const houseNumberValue = getValue(['מספר בית', 'house_number']);
          const cityValue = getValue(['עיר', 'city', 'locality_name', 'settlement']);
          
          // If we have separate fields, construct full address
          let address = getValue(['כתובת', 'address']);
          if (!address && streetValue) {
            const parts = [];
            if (streetValue) parts.push(streetValue);
            if (houseNumberValue) parts.push(houseNumberValue);
            if (cityValue) parts.push(cityValue);
            address = parts.join(', ') || null;
          }
          
          const parsedAddress = parseAddress(address || '');
          
          // Override parsed values with direct CSV values if available
          if (cityValue) parsedAddress.city = cityValue;
          if (streetValue) parsedAddress.street_name = streetValue;
          if (houseNumberValue) parsedAddress.house_number = houseNumberValue;
          
          // Try both Hebrew and English headers for gush_chelka
          const gushChelkaValue = getValue(['גו"ח', 'גוח', 'block_of_land', 'gush_chelka']);
          const parsedGush = parseGushChelka(gushChelkaValue);

          // Try both Hebrew and English headers for sale_date
          const saleDateStr = getValue(['יום מכירה', 'sale_date', 'sale_day']);
          const saleDate = parseHebrewDate(saleDateStr);
          
          // Try both Hebrew and English headers for declared_price (total price)
          // This should be the full sale price/total price, not price per sqm
          const declaredPriceStr = getValue([
            'מחיר מוצהר',           // Hebrew: Declared price
            'sale_value_nis',       // English: Sale value in NIS
            'declared_value_nis',   // English: Declared value in NIS
            'price',                 // English: Price (common variation)
            'declared_price'         // English: Declared price (direct mapping)
          ]);
          const declaredPrice = declaredPriceStr ? parseFloat(declaredPriceStr) : null;
          
          // CRITICAL: Check duplicate within same organization/user context
          const duplicateCheckQuery = `
            SELECT id FROM comparable_data 
            WHERE address = $1 
              AND sale_date = $2 
              AND declared_price = $3
              AND (organization_id = $4 OR (organization_id IS NULL AND $4 IS NULL))
              AND (user_id = $5 OR (user_id IS NULL AND $5 IS NULL))
            LIMIT 1
          `;
          
          const duplicateCheck = await this.client.query(duplicateCheckQuery, [
            address,
            saleDate,
            declaredPrice,
            this.organizationId,
            this.userId || userId
          ]);
          
          if (duplicateCheck.rows.length > 0) {
            console.log(`⚠️ Skipping duplicate row ${i + 1}: ${address}`);
            results.failed.push({
              rowNumber: i + 1,
              data: csvData,
              error: 'Duplicate record - already exists in database'
            });
            continue; // Skip this row
          }

          const query = `
            INSERT INTO comparable_data (
              csv_filename, row_number, sale_date, address, gush_chelka_sub,
              rooms, floor_number, apartment_area_sqm, parking_spaces,
              construction_year, declared_price, price_per_sqm_rounded,
              city, street_name, house_number, gush, chelka, sub_chelka,
              organization_id, user_id, imported_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            )
            RETURNING id, created_at;
          `;

          // Extract all values using header mapping (supports both Hebrew and English)
          const roomsValue = getValue(['חדרים', 'rooms']);
          const rooms = roomsValue ? parseFloat(roomsValue) : null;
          
          const floorNumberValue = getValue(['קומה', 'floor_number', 'floor']);
          const floorNumber = floorNumberValue || null;
          
          const areaValue = getValue(['שטח דירה במ"ר', 'שטח דירה במר', 'apartment_area_sqm', 'surface', 'area']);
          const apartmentAreaSqm = areaValue ? parseFloat(areaValue) : null;
          
          const parkingValue = getValue(['חניות', 'parking_spaces', 'parking']);
          const parkingSpaces = parkingValue ? parseInt(parkingValue) : null;
          
          const constructionYearValue = getValue(['שנת בניה', 'שנת בנייה', 'construction_year', 'year_of_construction']);
          const constructionYear = constructionYearValue ? parseInt(constructionYearValue) : null;
          
          // Try both Hebrew and English headers for price_per_sqm_rounded (price per square meter)
          // This should be the price per sqm, either provided directly or calculated from total price / area
          const pricePerSqmValue = getValue([
            'מחיר למ"ר, במעוגל',    // Hebrew: Price per sqm, rounded
            'מחיר למר במעוגל',       // Hebrew: Price per sqm, rounded (alternative)
            'price_per_sqm_rounded', // English: Price per sqm rounded
            'price_per_sqm',         // English: Price per sqm (common variation)
            'price_per_m2',          // English: Price per m2 (alternative)
            'sqm_price'              // English: Sqm price (alternative)
          ]);
          const pricePerSqmRounded = pricePerSqmValue ? parseFloat(pricePerSqmValue) : null;
          
          // Calculate price_per_sqm if not provided but we have total price and area
          // CRITICAL: declared_price = total price, price_per_sqm_rounded = price per sqm
          let finalPricePerSqm = pricePerSqmRounded;
          if (!finalPricePerSqm && declaredPrice && apartmentAreaSqm && apartmentAreaSqm > 0) {
            // Calculate: total price / area = price per sqm
            finalPricePerSqm = Math.round(declaredPrice / apartmentAreaSqm);
            console.log(`  💰 Calculated price_per_sqm: ${declaredPrice} / ${apartmentAreaSqm} = ${finalPricePerSqm}`);
          } else if (pricePerSqmRounded) {
            console.log(`  💰 Using provided price_per_sqm: ${pricePerSqmRounded}`);
          }
          
          // City can come from parsed address or directly from CSV (use already extracted cityValue)
          const finalCity = cityValue || parsedAddress.city;
          
          // Street name can come from parsed address or directly from CSV (use already extracted streetValue)
          const finalStreetName = streetValue || parsedAddress.street_name;
          
          // House number can come from parsed address or directly from CSV (use already extracted houseNumberValue)
          const finalHouseNumber = houseNumberValue || parsedAddress.house_number;

          const values = [
            csvFilename,                                          // 1
            i + 1,                                              // 2
            saleDate,                                           // 3 - already parsed
            address,                                             // 4
            gushChelkaValue,                                    // 5
            rooms,                                              // 6
            floorNumber,                                        // 7
            apartmentAreaSqm,                                  // 8
            parkingSpaces,                                      // 9
            constructionYear,                                   // 10
            declaredPrice,                                     // 11 - already parsed
            finalPricePerSqm,                                  // 12 - calculated if needed
            finalCity,                                          // 13
            finalStreetName,                                    // 14
            finalHouseNumber,                                   // 15
            parsedGush.gush,                                    // 16
            parsedGush.chelka,                                  // 17
            parsedGush.sub_chelka,                              // 18
            this.organizationId || 'default-org',              // 19 - organization_id (ensure string)
            this.userId || 'system',                            // 20 - user_id (ensure string)
            this.userId || 'system'                             // 21 - imported_by (use same userId)
          ];

          const result = await this.client.query(query, values);
          const insertedRow = result.rows[0];

          results.successful.push({
            rowNumber: i + 1,
            id: insertedRow.id,
            address: address || 'Unknown'
          });
        } catch (error) {
          // Try to get address for error reporting
          const errorAddress = csvRows[i]['כתובת'] || 
                              csvRows[i]['address'] || 
                              csvRows[i]['street'] || 
                              'Unknown';
          results.failed.push({
            rowNumber: i + 1,
            address: errorAddress,
            error: error.message
          });
        }
      }
    } finally {
      // Ensure disconnect is called even if there's an error
      await this.disconnect();
    }

    return results;
  }

  /**
   * Bulk upsert CSV data - updates existing records or inserts new ones
   * @param {Array} csvRows - Array of CSV row objects
   * @param {string} csvFilename - Source CSV filename
   * @param {string} userId - User importing the data
   * @param {string} organizationId - Organization/Company ID
   * @returns {Object} - Import results with updated/inserted/failed counts
   */
  async bulkUpsertComparableData(csvRows, csvFilename, userId = 'system', organizationId = null) {
    this.organizationId = String(organizationId || this.organizationId || 'default-org');
    this.userId = String(userId || this.userId || 'system');

    if (Array.isArray(this.userId)) this.userId = this.userId[0] || 'system';
    if (Array.isArray(this.organizationId)) this.organizationId = this.organizationId[0] || 'default-org';

    await this.connect();

    const results = {
      updated: [],
      inserted: [],
      failed: []
    };

    // Parse date format helper
    const parseHebrewDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        const trimmed = dateStr.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        if (trimmed.includes('/')) {
          const parts = trimmed.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts.map(p => p.trim());
            if (year.length === 4 && parseInt(year) > 1900) {
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
        }
        return trimmed;
      } catch {
        return null;
      }
    };

    // Parse address helper
    const parseAddress = (addressStr) => {
      if (!addressStr) return { city: null, street_name: null, house_number: null };
      const parts = addressStr.split(',').map(p => p.trim());
      const city = parts.length > 1 ? parts[parts.length - 1] : null;
      const streetPart = parts[0] || '';
      const houseNumberMatch = streetPart.match(/(\d+)\s*$/);
      const house_number = houseNumberMatch ? houseNumberMatch[1] : null;
      const street_name = houseNumberMatch
        ? streetPart.substring(0, houseNumberMatch.index).trim()
        : streetPart.trim();
      return { city: city || null, street_name: street_name || null, house_number: house_number || null };
    };

    // Parse gush/chelka helper
    const parseGushChelka = (gushStr) => {
      if (!gushStr) return { gush: null, chelka: null, sub_chelka: null };
      try {
        const trimmed = gushStr.trim();
        if (trimmed.includes('-')) {
          const parts = trimmed.split('-').map(p => {
            const num = parseInt(p.trim());
            return isNaN(num) ? null : num;
          }).filter(p => p !== null);
          return { gush: parts[0] || null, chelka: parts[1] || null, sub_chelka: parts[2] || null };
        }
        if (trimmed.includes('/')) {
          const parts = trimmed.split('/').map(p => {
            const num = parseInt(p.trim());
            return isNaN(num) ? null : num;
          }).filter(p => p !== null);
          return { gush: parts[0] || null, chelka: parts[1] || null, sub_chelka: parts[2] || null };
        }
        const singleNum = parseInt(trimmed);
        if (!isNaN(singleNum)) return { gush: singleNum, chelka: null, sub_chelka: null };
        return { gush: null, chelka: null, sub_chelka: null };
      } catch {
        return { gush: null, chelka: null, sub_chelka: null };
      }
    };

    try {
      for (let i = 0; i < csvRows.length; i++) {
        try {
          const csvData = csvRows[i];

          // Helper to get value from Hebrew or English headers
          const getValue = (headerOptions) => {
            for (const header of headerOptions) {
              const value = headerMapping.getValueFromRow(csvData, header);
              if (value !== null && value !== undefined && value !== '') return value;
            }
            return null;
          };

          // Extract fields
          const recordId = getValue(['id', 'ID']);
          const streetValue = getValue(['רחוב', 'שם רחוב', 'street_name', 'street']);
          const houseNumberValue = getValue(['מספר בית', 'house_number']);
          const cityValue = getValue(['עיר', 'city', 'locality_name', 'settlement']);

          let address = getValue(['כתובת', 'address']);
          if (!address && streetValue) {
            const parts = [];
            if (streetValue) parts.push(streetValue);
            if (houseNumberValue) parts.push(houseNumberValue);
            if (cityValue) parts.push(cityValue);
            address = parts.join(', ') || null;
          }

          const parsedAddress = parseAddress(address || '');
          if (cityValue) parsedAddress.city = cityValue;
          if (streetValue) parsedAddress.street_name = streetValue;
          if (houseNumberValue) parsedAddress.house_number = houseNumberValue;

          const gushChelkaValue = getValue(['גו"ח', 'גוח', 'block_of_land', 'gush_chelka', 'גוש/חלקה']);
          const parsedGush = parseGushChelka(gushChelkaValue);

          const saleDateStr = getValue(['יום מכירה', 'sale_date', 'sale_day']);
          const saleDate = parseHebrewDate(saleDateStr);

          const declaredPriceStr = getValue(['מחיר מוצהר', 'מחיר מכירה', 'sale_value_nis', 'declared_value_nis', 'price', 'declared_price']);
          const declaredPrice = declaredPriceStr ? parseFloat(declaredPriceStr) : null;

          const roomsValue = getValue(['חדרים', 'rooms']);
          const rooms = roomsValue ? parseFloat(roomsValue) : null;

          const floorNumberValue = getValue(['קומה', 'floor_number', 'floor']);
          const areaValue = getValue(['שטח דירה במ"ר', 'שטח דירה במר', 'שטח (מ"ר)', 'apartment_area_sqm', 'surface', 'area']);
          const apartmentAreaSqm = areaValue ? parseFloat(areaValue) : null;

          const parkingValue = getValue(['חניות', 'parking_spaces', 'parking']);
          const parkingSpaces = parkingValue ? parseInt(parkingValue) : null;

          const constructionYearValue = getValue(['שנת בניה', 'שנת בנייה', 'construction_year', 'year_of_construction']);
          const constructionYear = constructionYearValue ? parseInt(constructionYearValue) : null;

          const pricePerSqmValue = getValue(['מחיר למ"ר, במעוגל', 'מחיר למר במעוגל', 'מחיר למ"ר', 'price_per_sqm_rounded', 'price_per_sqm']);
          let pricePerSqmRounded = pricePerSqmValue ? parseFloat(pricePerSqmValue) : null;

          if (!pricePerSqmRounded && declaredPrice && apartmentAreaSqm && apartmentAreaSqm > 0) {
            pricePerSqmRounded = Math.round(declaredPrice / apartmentAreaSqm);
          }

          // Check if we should UPDATE (by ID) or check for existing record
          let existingId = null;

          if (recordId) {
            // Check if record with this ID exists
            const idCheckQuery = `SELECT id FROM comparable_data WHERE id = $1`;
            const idCheck = await this.client.query(idCheckQuery, [recordId]);
            if (idCheck.rows.length > 0) {
              existingId = recordId;
            }
          }

          // If no ID match, check by unique key (address + sale_date + declared_price)
          if (!existingId && address && saleDate && declaredPrice) {
            const duplicateCheckQuery = `
              SELECT id FROM comparable_data
              WHERE address = $1
                AND sale_date = $2
                AND declared_price = $3
                AND (organization_id = $4 OR (organization_id IS NULL AND $4 IS NULL))
              LIMIT 1
            `;
            const duplicateCheck = await this.client.query(duplicateCheckQuery, [
              address, saleDate, declaredPrice, this.organizationId
            ]);
            if (duplicateCheck.rows.length > 0) {
              existingId = duplicateCheck.rows[0].id;
            }
          }

          if (existingId) {
            // UPDATE existing record
            const updateQuery = `
              UPDATE comparable_data SET
                csv_filename = $1, row_number = $2, sale_date = $3, address = $4,
                gush_chelka_sub = $5, rooms = $6, floor_number = $7, apartment_area_sqm = $8,
                parking_spaces = $9, construction_year = $10, declared_price = $11,
                price_per_sqm_rounded = $12, city = $13, street_name = $14, house_number = $15,
                gush = $16, chelka = $17, sub_chelka = $18, updated_at = CURRENT_TIMESTAMP
              WHERE id = $19
              RETURNING id;
            `;

            const updateValues = [
              csvFilename, i + 1, saleDate, address, gushChelkaValue,
              rooms, floorNumberValue, apartmentAreaSqm, parkingSpaces,
              constructionYear, declaredPrice, pricePerSqmRounded,
              parsedAddress.city, parsedAddress.street_name, parsedAddress.house_number,
              parsedGush.gush, parsedGush.chelka, parsedGush.sub_chelka, existingId
            ];

            await this.client.query(updateQuery, updateValues);
            results.updated.push({ rowNumber: i + 1, id: existingId, address: address || 'Unknown' });

          } else {
            // INSERT new record
            const insertQuery = `
              INSERT INTO comparable_data (
                csv_filename, row_number, sale_date, address, gush_chelka_sub,
                rooms, floor_number, apartment_area_sqm, parking_spaces,
                construction_year, declared_price, price_per_sqm_rounded,
                city, street_name, house_number, gush, chelka, sub_chelka,
                organization_id, user_id, imported_by
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
              )
              RETURNING id;
            `;

            const insertValues = [
              csvFilename, i + 1, saleDate, address, gushChelkaValue,
              rooms, floorNumberValue, apartmentAreaSqm, parkingSpaces,
              constructionYear, declaredPrice, pricePerSqmRounded,
              parsedAddress.city, parsedAddress.street_name, parsedAddress.house_number,
              parsedGush.gush, parsedGush.chelka, parsedGush.sub_chelka,
              this.organizationId, this.userId, this.userId
            ];

            const result = await this.client.query(insertQuery, insertValues);
            results.inserted.push({ rowNumber: i + 1, id: result.rows[0].id, address: address || 'Unknown' });
          }

        } catch (error) {
          const errorAddress = csvRows[i]['כתובת'] || csvRows[i]['address'] || 'Unknown';
          results.failed.push({ rowNumber: i + 1, address: errorAddress, error: error.message });
        }
      }
    } finally {
      await this.disconnect();
    }

    return results;
  }

  /**
   * Get comparable data by ID
   * @param {number} id - Record ID
   * @returns {Object} - Comparable data record
   */
  async getComparableDataById(id) {
    await this.connect();
    
    try {
      // CRITICAL: Filter by organization_id and user_id for data isolation
      // Show records that match the user's organization OR default-org (shared data)
      let query = `SELECT * FROM comparable_data WHERE id = $1`;
      const params = [id];
      let paramIndex = 2;
      
      if (this.organizationId) {
        // Show user's organization records OR default-org records OR NULL (legacy/unassigned data)
        query += ` AND (organization_id = $${paramIndex} OR organization_id = 'default-org' OR organization_id IS NULL)`;
        params.push(this.organizationId);
        paramIndex++;
      } else {
        // If no organization ID provided, show default-org records and NULL organization_id (legacy/unassigned data)
        query += ` AND (organization_id = 'default-org' OR organization_id IS NULL)`;
      }
      
      if (this.userId) {
        // Show user's records OR shared records (user_id IS NULL or 'system') within the organization
        // CRITICAL: Handle user_id stored as JSON array (legacy bug) - check if it contains the userId
        // Also handle case where user_id is stored as JSON array (like {"1762001339354","dev-user-id"})
        query += ` AND (
          user_id = $${paramIndex} 
          OR user_id IS NULL 
          OR user_id = 'system'
          OR user_id::text LIKE '%"' || $${paramIndex} || '"%'
          OR user_id::text LIKE '%' || $${paramIndex} || '%'
        )`;
        params.push(this.userId);
      } else {
        // If no userId, show shared records (user_id IS NULL or 'system') for the organization
        // But also include JSON array format records
        query += ` AND (
          user_id IS NULL 
          OR user_id = 'system'
          OR user_id::text LIKE '%"system"%'
        )`;
      }
      
      const result = await this.client.query(query, params);
      
      return result.rows[0];
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Search comparable data by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Matching records
   */
  async searchComparableData(criteria) {
    await this.connect();

    try {
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      if (criteria.city) {
        whereClauses.push(`city ILIKE $${paramIndex}`);
        values.push(`%${criteria.city}%`);
        paramIndex++;
      }

      if (criteria.min_rooms) {
        whereClauses.push(`rooms >= $${paramIndex}`);
        values.push(criteria.min_rooms);
        paramIndex++;
      }

      if (criteria.max_rooms) {
        whereClauses.push(`rooms <= $${paramIndex}`);
        values.push(criteria.max_rooms);
        paramIndex++;
      }

      if (criteria.min_area) {
        whereClauses.push(`apartment_area_sqm >= $${paramIndex}`);
        values.push(criteria.min_area);
        paramIndex++;
      }

      if (criteria.max_area) {
        whereClauses.push(`apartment_area_sqm <= $${paramIndex}`);
        values.push(criteria.max_area);
        paramIndex++;
      }

      if (criteria.min_price) {
        whereClauses.push(`declared_price >= $${paramIndex}`);
        values.push(criteria.min_price);
        paramIndex++;
      }

      if (criteria.max_price) {
        whereClauses.push(`declared_price <= $${paramIndex}`);
        values.push(criteria.max_price);
        paramIndex++;
      }

      if (criteria.gush) {
        whereClauses.push(`gush = $${paramIndex}`);
        values.push(criteria.gush);
        paramIndex++;
      }

      // CRITICAL: Add organization_id and user_id filters for data isolation
      // Show records that match the user's organization OR default-org (shared data) OR NULL (legacy data)
      if (this.organizationId) {
        // Show user's organization records OR default-org records OR NULL (legacy/unassigned data)
        whereClauses.push(`(organization_id = $${paramIndex} OR organization_id = 'default-org' OR organization_id IS NULL)`);
        values.push(this.organizationId);
        paramIndex++;
      } else {
        // If no organization ID provided, show default-org records and NULL organization_id (legacy/unassigned data)
        whereClauses.push(`(organization_id = 'default-org' OR organization_id IS NULL)`);
      }
      
      // For user_id: Show user's records OR shared records (user_id IS NULL or 'system') within the organization
      // CRITICAL: Handle user_id stored as JSON array (legacy bug) - check if it contains the userId
      if (this.userId) {
        // Show user's records OR shared records (user_id IS NULL or 'system') within the organization
        // Also handle case where user_id is stored as JSON array (like {"1762001339354","dev-user-id"})
        // We check if the user_id contains the userId as a substring (with quotes for JSON format)
        whereClauses.push(`(
          user_id = $${paramIndex} 
          OR user_id IS NULL 
          OR user_id = 'system'
          OR user_id::text LIKE '%"' || $${paramIndex} || '"%'
          OR user_id::text LIKE '%' || $${paramIndex} || '%'
        )`);
        values.push(this.userId);
        paramIndex++;
      } else {
        // If no userId, show shared records (user_id IS NULL or 'system') for the organization
        // But also include JSON array format records
        whereClauses.push(`(
          user_id IS NULL 
          OR user_id = 'system'
          OR user_id::text LIKE '%"system"%'
        )`);
      }
      
      // Build WHERE clause (table doesn't have status/is_valid columns)
      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';
      
      const query = `
        SELECT 
          id,
          sale_date,
          address,
          gush_chelka_sub,
          gush,
          chelka,
          sub_chelka,
          rooms,
          floor_number,
          apartment_area_sqm as area,
          parking_spaces,
          construction_year,
          declared_price as price,
          price_per_sqm_rounded as price_per_sqm,
          CASE 
            WHEN apartment_area_sqm > 0 AND declared_price > 0 
            THEN ROUND(declared_price / apartment_area_sqm, 2)
            ELSE price_per_sqm_rounded
          END as verified_price_per_sqm,
          city,
          street_name,
          house_number,
          data_quality_score,
          created_at
        FROM comparable_data 
        ${whereClause}
        ORDER BY sale_date DESC
        LIMIT 50
      `;

      const result = await this.client.query(query, values);
      
      // Convert numeric string fields to actual numbers
      const processedRows = result.rows.map(row => ({
        ...row,
        rooms: row.rooms ? parseFloat(row.rooms) : null,
        area: row.area ? parseFloat(row.area) : null,
        price: row.price ? parseFloat(row.price) : null,
        price_per_sqm: row.price_per_sqm ? parseFloat(row.price_per_sqm) : null,
        verified_price_per_sqm: row.verified_price_per_sqm ? parseFloat(row.verified_price_per_sqm) : null,
        gush: row.gush ? parseInt(row.gush) : null,
        chelka: row.chelka ? parseInt(row.chelka) : null,
        sub_chelka: row.sub_chelka ? parseInt(row.sub_chelka) : null,
        parking_spaces: row.parking_spaces ? parseInt(row.parking_spaces) : null,
        construction_year: row.construction_year ? parseInt(row.construction_year) : null
      }));
      
      return processedRows;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Get comparable data statistics
   * @returns {Object} - Statistics
   */
  async getComparableDataStats() {
    await this.connect();
    
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM comparable_data';
      const avgPriceQuery = 'SELECT AVG(declared_price) as avg_price, AVG(price_per_sqm_rounded) as avg_price_per_sqm FROM comparable_data WHERE declared_price IS NOT NULL';
      const byRoomsQuery = 'SELECT FLOOR(rooms) as room_count, COUNT(*) as count, AVG(declared_price) as avg_price FROM comparable_data WHERE rooms IS NOT NULL GROUP BY FLOOR(rooms) ORDER BY room_count';
      const recentQuery = 'SELECT COUNT(*) as count FROM comparable_data WHERE csv_import_date >= CURRENT_DATE - INTERVAL \'30 days\'';
      
      const [totalResult, avgResult, roomsResult, recentResult] = await Promise.all([
        this.client.query(totalQuery),
        this.client.query(avgPriceQuery),
        this.client.query(byRoomsQuery),
        this.client.query(recentQuery)
      ]);
      
      return {
        total: parseInt(totalResult.rows[0].total),
        averagePrice: parseFloat(avgResult.rows[0].avg_price || 0),
        averagePricePerSqm: parseFloat(avgResult.rows[0].avg_price_per_sqm || 0),
        byRooms: roomsResult.rows,
        recentMonth: parseInt(recentResult.rows[0].count)
      };
      
    } catch (error) {
      console.error('❌ Failed to get comparable data statistics:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Get comparable data by city
   * @param {string} city - City name
   * @param {number} limit - Number of records to return
   * @returns {Array} - Records for the city
   */
  async getComparableDataByCity(city, limit = 20) {
    await this.connect();
    
    try {
      const query = `
        SELECT 
          id,
          sale_date,
          address,
          rooms,
          floor_number,
          apartment_area_sqm as area,
          declared_price as price,
          price_per_sqm_rounded as price_per_sqm,
          city,
          created_at
        FROM comparable_data 
        WHERE city ILIKE $1
        ORDER BY sale_date DESC
        LIMIT $2
      `;
      
      const result = await this.client.query(query, [`%${city}%`, limit]);
      return result.rows;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Save comparable data analysis results
   * @param {string} sessionId - Session ID
   * @param {Object} analysisData - Analysis results
   * @returns {Object} - Saved record info
   */
  async saveAnalysisResults(sessionId, analysisData) {
    await this.connect();
    
    try {
      // Find the shuma record by session_id
      const findQuery = `SELECT id FROM shuma WHERE session_id = $1 LIMIT 1`;
      const findResult = await this.client.query(findQuery, [sessionId]);
      
      if (findResult.rows.length === 0) {
        throw new Error(`Session ${sessionId} not found in shuma table`);
      }
      
      const shumaId = findResult.rows[0].id;
      
      // Update market_analysis column with the analysis results
      const updateQuery = `
        UPDATE shuma 
        SET 
          market_analysis = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id
      `;
      
      const updateResult = await this.client.query(updateQuery, [
        JSON.stringify(analysisData), 
        shumaId
      ]);
      
      console.log(`✅ Saved comparable data analysis to shuma.id=${shumaId} for session ${sessionId}`);
      return { id: updateResult.rows[0].id, updated: true };
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Test database connection
   * @returns {boolean} - Connection status
   */
  async testConnection() {
    try {
      await this.connect();
      const result = await this.client.query('SELECT NOW()');
      console.log('🔍 Database test query result:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database test failed:', error.message);
      return false;
    }
  }
}

module.exports = { ComparableDataDatabaseClient };