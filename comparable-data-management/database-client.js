import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class ComparableDataDatabaseClient {
  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'shamay_land_registry',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
    });
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
   * Insert comparable data from CSV row
   * @param {Object} csvData - Parsed CSV row data
   * @param {string} csvFilename - Source CSV filename
   * @param {number} rowNumber - Row number in CSV
   * @param {string} userId - User importing the data
   * @returns {Object} - Inserted record info
   */
  async insertComparableData(csvData, csvFilename, rowNumber, userId = 'system') {
    await this.connect();

    try {
      const query = `
        INSERT INTO comparable_data (
          csv_filename, row_number, sale_date, address, gush_chelka_sub,
          rooms, floor_number, apartment_area_sqm, parking_spaces,
          construction_year, declared_price, price_per_sqm_rounded,
          imported_by, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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

      const values = [
        csvFilename,                                          // 1
        rowNumber,                                           // 2
        parseHebrewDate(csvData['יום מכירה']),                // 3
        csvData['כתובת'] || null,                            // 4
        csvData['גו"ח'] || null,                             // 5
        csvData['חדרים'] ? parseFloat(csvData['חדרים']) : null, // 6
        csvData['קומה'] || null,                             // 7
        csvData['שטח דירה במ"ר'] ? parseFloat(csvData['שטח דירה במ"ר']) : null, // 8
        csvData['חניות'] ? parseInt(csvData['חניות']) : null, // 9
        csvData['שנת בניה'] ? parseInt(csvData['שנת בניה']) : null, // 10
        csvData['מחיר מוצהר'] ? parseFloat(csvData['מחיר מוצהר']) : null, // 11
        csvData['מחיר למ"ר, במעוגל'] ? parseFloat(csvData['מחיר למ"ר, במעוגל']) : null, // 12
        userId,                                              // 13
        'active'                                             // 14
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
    }
  }

  /**
   * Bulk insert CSV data
   * @param {Array} csvRows - Array of CSV row objects
   * @param {string} csvFilename - Source CSV filename
   * @param {string} userId - User importing the data
   * @returns {Object} - Import results
   */
  async bulkInsertComparableData(csvRows, csvFilename, userId = 'system') {
    const results = {
      successful: [],
      failed: []
    };

    for (let i = 0; i < csvRows.length; i++) {
      try {
        const result = await this.insertComparableData(csvRows[i], csvFilename, i + 1, userId);
        results.successful.push({
          rowNumber: i + 1,
          id: result.id,
          address: csvRows[i]['כתובת']
        });
      } catch (error) {
        results.failed.push({
          rowNumber: i + 1,
          address: csvRows[i]['כתובת'] || 'Unknown',
          error: error.message
        });
      }
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
    
    const query = 'SELECT * FROM active_comparable_data WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  /**
   * Search comparable data by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Matching records
   */
  async searchComparableData(criteria) {
    await this.connect();

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

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM active_comparable_data 
      ${whereClause}
      ORDER BY sale_date DESC
      LIMIT 50
    `;

    const result = await this.client.query(query, values);
    return result.rows;
  }

  /**
   * Get comparable data statistics
   * @returns {Object} - Statistics
   */
  async getComparableDataStats() {
    await this.connect();
    
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM comparable_data WHERE status = $1';
      const avgPriceQuery = 'SELECT AVG(declared_price) as avg_price, AVG(price_per_sqm_rounded) as avg_price_per_sqm FROM comparable_data WHERE status = $1 AND declared_price IS NOT NULL';
      const byRoomsQuery = 'SELECT FLOOR(rooms) as room_count, COUNT(*) as count, AVG(declared_price) as avg_price FROM comparable_data WHERE status = $1 AND rooms IS NOT NULL GROUP BY FLOOR(rooms) ORDER BY room_count';
      const recentQuery = 'SELECT COUNT(*) as count FROM comparable_data WHERE status = $1 AND csv_import_date >= CURRENT_DATE - INTERVAL \'30 days\'';
      
      const [totalResult, avgResult, roomsResult, recentResult] = await Promise.all([
        this.client.query(totalQuery, ['active']),
        this.client.query(avgPriceQuery, ['active']),
        this.client.query(byRoomsQuery, ['active']),
        this.client.query(recentQuery, ['active'])
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
    
    const query = `
      SELECT * FROM active_comparable_data 
      WHERE city ILIKE $1
      ORDER BY sale_date DESC
      LIMIT $2
    `;
    
    const result = await this.client.query(query, [`%${city}%`, limit]);
    return result.rows;
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