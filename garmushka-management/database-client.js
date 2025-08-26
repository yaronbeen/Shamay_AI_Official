import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class GarmushkaDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Garmushka)');
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
   * Insert a new garmushka record
   * @param {Object} garmushkaData - Garmushka measurement data
   * @param {string} userId - ID of user creating the record
   * @returns {Object} - Created record with ID
   */
  async insertGarmushka(garmushkaData, userId = 'system') {
    await this.connect();

    try {
      const query = `
        INSERT INTO garmushka (
          document_filename, document_path, garmushka_image_path, garmushka_filename,
          garmushka_issue_date, garmushka_issue_date_confidence, garmushka_issue_date_context,
          built_area, built_area_confidence, built_area_context, built_area_units,
          property_areas_screenshot_path, property_areas_screenshot_filename,
          apartment_area, apartment_area_confidence, apartment_area_context, apartment_area_units,
          balcony_area, balcony_area_confidence, balcony_area_context, balcony_area_units,
          property_assessment_id, building_permit_id,
          processing_method, overall_confidence, extraction_notes,
          created_by, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        )
        RETURNING id, created_at;
      `;

      // Parse date strings to proper format
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          if (dateStr.includes('-') && dateStr.length === 10) {
            return dateStr;
          }
          if (dateStr instanceof Date) {
            return dateStr.toISOString().split('T')[0];
          }
          return dateStr;
        } catch {
          return null;
        }
      };

      const values = [
        garmushkaData.document_filename || null,                         // 1
        garmushkaData.document_path || null,                            // 2
        garmushkaData.garmushka_image_path || null,                     // 3 - גרמושקה
        garmushkaData.garmushka_filename || null,                       // 4
        parseDate(garmushkaData.garmushka_issue_date),                  // 5 - מתי הופקה הגרמושקה
        Math.min((garmushkaData.confidence_scores?.garmushka_issue_date || 0), 1.0), // 6
        garmushkaData.extraction_contexts?.garmushka_issue_date || null, // 7
        garmushkaData.built_area || null,                               // 8 - שטח בנוי
        Math.min((garmushkaData.confidence_scores?.built_area || 0), 1.0), // 9
        garmushkaData.extraction_contexts?.built_area || null,          // 10
        garmushkaData.built_area_units || 'מ"ר',                       // 11
        garmushkaData.property_areas_screenshot_path || null,           // 12 - צילום מסך של השטחים המשוייכים לנכס
        garmushkaData.property_areas_screenshot_filename || null,       // 13
        garmushkaData.apartment_area || null,                           // 14 - שטח דירה
        Math.min((garmushkaData.confidence_scores?.apartment_area || 0), 1.0), // 15
        garmushkaData.extraction_contexts?.apartment_area || null,      // 16
        garmushkaData.apartment_area_units || 'מ"ר',                    // 17
        garmushkaData.balcony_area || null,                             // 18 - שטח מרפסת
        Math.min((garmushkaData.confidence_scores?.balcony_area || 0), 1.0), // 19
        garmushkaData.extraction_contexts?.balcony_area || null,        // 20
        garmushkaData.balcony_area_units || 'מ"ר',                      // 21
        garmushkaData.property_assessment_id || null,                   // 22
        garmushkaData.building_permit_id || null,                       // 23
        garmushkaData.processing_method || 'manual',                    // 24
        Math.min((garmushkaData.overall_confidence || 0), 1.0),         // 25
        garmushkaData.extraction_notes || null,                         // 26
        userId,                                                         // 27
        garmushkaData.status || 'draft'                                 // 28
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📏 Inserted garmushka record with ID: ${insertedRow.id}`);
      
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
   * Get garmushka by ID
   * @param {number} id - Garmushka ID
   * @returns {Object} - Garmushka record
   */
  async getGarmushkaById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM garmushka WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  /**
   * Get garmushka records by property assessment
   * @param {number} propertyAssessmentId - Property assessment ID
   * @returns {Array} - Array of garmushka records
   */
  async getGarmushkaByPropertyAssessment(propertyAssessmentId) {
    await this.connect();
    
    const query = `
      SELECT * FROM garmushka_summary 
      WHERE property_assessment_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.client.query(query, [propertyAssessmentId]);
    return result.rows;
  }

  /**
   * Search garmushka records by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Matching records
   */
  async searchGarmushka(criteria) {
    await this.connect();

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (criteria.document_filename) {
      whereClauses.push(`document_filename ILIKE $${paramIndex}`);
      values.push(`%${criteria.document_filename}%`);
      paramIndex++;
    }

    if (criteria.property_assessment_id) {
      whereClauses.push(`property_assessment_id = $${paramIndex}`);
      values.push(criteria.property_assessment_id);
      paramIndex++;
    }

    if (criteria.building_permit_id) {
      whereClauses.push(`building_permit_id = $${paramIndex}`);
      values.push(criteria.building_permit_id);
      paramIndex++;
    }

    if (criteria.status) {
      whereClauses.push(`status = $${paramIndex}`);
      values.push(criteria.status);
      paramIndex++;
    }

    if (criteria.min_built_area) {
      whereClauses.push(`built_area >= $${paramIndex}`);
      values.push(criteria.min_built_area);
      paramIndex++;
    }

    if (criteria.max_built_area) {
      whereClauses.push(`built_area <= $${paramIndex}`);
      values.push(criteria.max_built_area);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM garmushka_summary 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await this.client.query(query, values);
    return result.rows;
  }

  /**
   * Update garmushka record
   * @param {number} id - Record ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User making the update
   * @returns {Object} - Updated record info
   */
  async updateGarmushka(id, updateData, userId = 'system') {
    await this.connect();

    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      const fieldMapping = {
        document_filename: 'document_filename',
        document_path: 'document_path',
        garmushka_image_path: 'garmushka_image_path',
        garmushka_filename: 'garmushka_filename',
        garmushka_issue_date: 'garmushka_issue_date',
        built_area: 'built_area',
        apartment_area: 'apartment_area',
        balcony_area: 'balcony_area',
        property_areas_screenshot_path: 'property_areas_screenshot_path',
        property_areas_screenshot_filename: 'property_areas_screenshot_filename',
        processing_method: 'processing_method',
        overall_confidence: 'overall_confidence',
        extraction_notes: 'extraction_notes',
        status: 'status'
      };

      Object.entries(fieldMapping).forEach(([key, dbColumn]) => {
        if (updateData.hasOwnProperty(key)) {
          updateFields.push(`${dbColumn} = $${paramIndex}`);
          let value = updateData[key];
          
          // Handle date fields
          if (key === 'garmushka_issue_date' && value) {
            value = this.parseDate(value);
          }
          
          // Handle confidence scores
          if (key === 'overall_confidence' && value) {
            value = Math.min(value, 1.0);
          }
          
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_by parameter
      updateFields.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      values.push(id); // WHERE clause parameter

      const query = `
        UPDATE garmushka 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, updated_at;
      `;

      const result = await this.client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Garmushka with ID ${id} not found`);
      }

      console.log(`📏 Updated garmushka record ID: ${id}`);
      
      return result.rows[0];

    } catch (error) {
      console.error('❌ Database update failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete garmushka record
   * @param {number} id - Record ID
   * @returns {boolean} - Success status
   */
  async deleteGarmushka(id) {
    await this.connect();
    
    const query = 'DELETE FROM garmushka WHERE id = $1 RETURNING id';
    const result = await this.client.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Garmushka with ID ${id} not found`);
    }

    console.log(`🗑️ Deleted garmushka record ID: ${id}`);
    return true;
  }

  /**
   * Get recent garmushka records
   * @param {number} limit - Number of records to return
   * @returns {Array} - Recent records
   */
  async getRecentGarmushka(limit = 10) {
    await this.connect();
    
    const query = `
      SELECT id, document_filename, garmushka_issue_date, built_area, 
             apartment_area, balcony_area, property_assessment_id,
             overall_confidence, status, created_at
      FROM garmushka 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    
    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get garmushka statistics
   * @returns {Object} - Statistics about garmushka records
   */
  async getGarmushkaStats() {
    await this.connect();
    
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM garmushka';
      const statusQuery = 'SELECT status, COUNT(*) as count FROM garmushka GROUP BY status';
      const areaQuery = 'SELECT AVG(built_area) as avg_built, AVG(apartment_area) as avg_apartment, AVG(balcony_area) as avg_balcony FROM garmushka WHERE built_area IS NOT NULL';
      const recentQuery = 'SELECT COUNT(*) as count FROM garmushka WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      
      const [totalResult, statusResult, areaResult, recentResult] = await Promise.all([
        this.client.query(totalQuery),
        this.client.query(statusQuery),
        this.client.query(areaQuery),
        this.client.query(recentQuery)
      ]);
      
      return {
        total: parseInt(totalResult.rows[0].total),
        byStatus: statusResult.rows,
        averageAreas: {
          built: parseFloat(areaResult.rows[0].avg_built || 0),
          apartment: parseFloat(areaResult.rows[0].avg_apartment || 0),
          balcony: parseFloat(areaResult.rows[0].avg_balcony || 0)
        },
        recentMonth: parseInt(recentResult.rows[0].count)
      };
      
    } catch (error) {
      console.error('❌ Failed to get garmushka statistics:', error.message);
      throw error;
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

  /**
   * Helper method to parse date strings
   * @private
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      if (dateStr.includes('-') && dateStr.length === 10) {
        return dateStr;
      }
      if (dateStr instanceof Date) {
        return dateStr.toISOString().split('T')[0];
      }
      return dateStr;
    } catch {
      return null;
    }
  }
}