const dotenv = require('dotenv');
dotenv.config();

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
    this.organizationId = organizationId || this.organizationId
    this.userId = userId || this.userId
    // Connect once for the entire bulk operation
    await this.connect();
    
    const results = {
      successful: [],
      failed: []
    };

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

    // Parse גו"ח helper
    const parseGushChelka = (gushStr) => {
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
    };

    try {
      for (let i = 0; i < csvRows.length; i++) {
        try {
          const csvData = csvRows[i];
          const address = csvData['כתובת'] || null;
          const parsedAddress = parseAddress(address);
          const parsedGush = parseGushChelka(csvData['גוח'] || csvData['גו"ח']);

          // Check for duplicate based on address, sale_date, and price
          const saleDate = parseHebrewDate(csvData['יום מכירה']);
          const declaredPrice = csvData['מחיר מוצהר'] ? parseFloat(csvData['מחיר מוצהר']) : null;
          
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

          const values = [
            csvFilename,                                          // 1
            i + 1,                                              // 2
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
            parsedGush.sub_chelka,                                // 18
            this.organizationId || null,                         // 19 - organization_id
            this.userId || userId || null,                        // 20 - user_id
            userId || 'system'                                    // 21 - imported_by
          ];

          const result = await this.client.query(query, values);
          const insertedRow = result.rows[0];

          results.successful.push({
            rowNumber: i + 1,
            id: insertedRow.id,
            address: csvData['כתובת'] || 'Unknown'
          });
        } catch (error) {
          results.failed.push({
            rowNumber: i + 1,
            address: csvRows[i]['כתובת'] || 'Unknown',
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
        // Show user's organization records OR default-org records (shared across all organizations)
        query += ` AND (organization_id = $${paramIndex} OR organization_id = 'default-org')`;
        params.push(this.organizationId);
        paramIndex++;
      } else {
        // If no organization ID provided, show default-org records and NULL organization_id (legacy/unassigned data)
        query += ` AND (organization_id = 'default-org' OR organization_id IS NULL)`;
      }
      
      if (this.userId) {
        // Show user's records OR shared records (user_id IS NULL or 'system') within the organization
        query += ` AND (user_id = $${paramIndex} OR user_id IS NULL OR user_id = 'system')`;
        params.push(this.userId);
      } else {
        // If no userId, show shared records (user_id IS NULL or 'system') for the organization
        query += ` AND (user_id IS NULL OR user_id = 'system')`;
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
      // Show records that match the user's organization OR default-org (shared data)
      if (this.organizationId) {
        // Show user's organization records OR default-org records (shared across all organizations)
        whereClauses.push(`(organization_id = $${paramIndex} OR organization_id = 'default-org')`);
        values.push(this.organizationId);
        paramIndex++;
      } else {
        // If no organization ID provided, show default-org records and NULL organization_id (legacy/unassigned data)
        whereClauses.push(`(organization_id = 'default-org' OR organization_id IS NULL)`);
      }
      
      // For user_id: Show user's records OR shared records (user_id IS NULL or 'system') within the organization
      if (this.userId) {
        // Show user's records OR shared records (user_id IS NULL or 'system') within the organization
        whereClauses.push(`(user_id = $${paramIndex} OR user_id IS NULL OR user_id = 'system')`);
        values.push(this.userId);
        paramIndex++;
      } else {
        // If no userId, show shared records (user_id IS NULL or 'system') for the organization
        whereClauses.push(`(user_id IS NULL OR user_id = 'system')`);
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