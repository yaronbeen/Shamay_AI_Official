import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class PropertyAssessmentDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Property Assessments)');
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
   * Insert a new property assessment record
   * @param {Object} assessmentData - Property assessment data
   * @param {string} userId - ID of user creating the record
   * @returns {Object} - Created record with ID
   */
  async insertPropertyAssessment(assessmentData, userId = 'system') {
    await this.connect();

    try {
      const query = `
        INSERT INTO property_assessments (
          assessment_type, street_name, house_number, neighborhood, city,
          client_name, visit_date, visitor_name, presenter_name,
          rooms, floor_number, free_text_additions,
          air_directions, north_description, south_description, east_description, west_description,
          relevant_plans_table, user_sections_count, eco_coefficient,
          created_by, status, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING id, created_at;
      `;

      // Parse date string to proper format
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          // Handle DD/MM/YYYY format
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // Handle YYYY-MM-DD format
          if (dateStr.includes('-') && dateStr.length === 10) {
            return dateStr;
          }
          // Handle Date objects
          if (dateStr instanceof Date) {
            return dateStr.toISOString().split('T')[0];
          }
          return dateStr;
        } catch {
          return null;
        }
      };

      const values = [
        assessmentData.assessment_type || null,           // 1 - סוג שומה
        assessmentData.street_name || null,               // 2 - רחוב
        assessmentData.house_number || null,              // 3 - מספר
        assessmentData.neighborhood || null,              // 4 - שכונה
        assessmentData.city || null,                      // 5 - עיר
        assessmentData.client_name || null,               // 6 - שם הלקוח
        parseDate(assessmentData.visit_date),             // 7 - תאריך ביקור
        assessmentData.visitor_name || null,              // 8 - המבקר
        assessmentData.presenter_name || null,            // 9 - המציג
        assessmentData.rooms || null,                     // 10 - חדרים
        assessmentData.floor_number || null,              // 11 - קומה
        assessmentData.free_text_additions || null,       // 12 - טקסט חופשי להשלמות
        assessmentData.air_directions || null,            // 13 - כיווני אוויר
        assessmentData.north_description || null,         // 14 - תיאור חופשי - צפון
        assessmentData.south_description || null,         // 15 - תיאור חופשי - דרום
        assessmentData.east_description || null,          // 16 - תיאור חופשי - מזרח
        assessmentData.west_description || null,          // 17 - תיאור חופשי - מערב
        assessmentData.relevant_plans_table || null,      // 18 - טבלת ריכוז תוכניות רלוונטיות
        assessmentData.user_sections_count || null,       // 19 - מספר סעיפים למילוי על ידי היוזר
        assessmentData.eco_coefficient || null,           // 20 - מקדם אקו
        userId,                                           // 21 - created_by
        assessmentData.status || 'draft',                 // 22 - status
        assessmentData.notes || null                      // 23 - notes
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📝 Inserted property assessment record with ID: ${insertedRow.id}`);
      
      return {
        id: insertedRow.id,
        created_at: insertedRow.created_at
      };

    } catch (error) {
      console.error('❌ Database insertion failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Update an existing property assessment record
   * @param {number} id - Record ID
   * @param {Object} assessmentData - Updated data
   * @param {string} userId - ID of user updating the record
   * @returns {Object} - Updated record
   */
  async updatePropertyAssessment(id, assessmentData, userId = 'system') {
    await this.connect();

    try {
      // Build dynamic update query based on provided fields
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      const fieldMapping = {
        assessment_type: 'assessment_type',
        street_name: 'street_name',
        house_number: 'house_number',
        neighborhood: 'neighborhood',
        city: 'city',
        client_name: 'client_name',
        visit_date: 'visit_date',
        visitor_name: 'visitor_name',
        presenter_name: 'presenter_name',
        rooms: 'rooms',
        floor_number: 'floor_number',
        free_text_additions: 'free_text_additions',
        air_directions: 'air_directions',
        north_description: 'north_description',
        south_description: 'south_description',
        east_description: 'east_description',
        west_description: 'west_description',
        relevant_plans_table: 'relevant_plans_table',
        user_sections_count: 'user_sections_count',
        eco_coefficient: 'eco_coefficient',
        status: 'status',
        notes: 'notes'
      };

      Object.entries(fieldMapping).forEach(([key, dbColumn]) => {
        if (assessmentData.hasOwnProperty(key)) {
          updateFields.push(`${dbColumn} = $${paramIndex}`);
          let value = assessmentData[key];
          
          // Handle date fields
          if (key === 'visit_date' && value) {
            value = this.parseDate(value);
          }
          
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_by and id parameters
      updateFields.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      values.push(id); // WHERE clause parameter

      const query = `
        UPDATE property_assessments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, updated_at;
      `;

      const result = await this.client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Property assessment with ID ${id} not found`);
      }

      console.log(`📝 Updated property assessment record ID: ${id}`);
      
      return result.rows[0];

    } catch (error) {
      console.error('❌ Database update failed:', error.message);
      throw error;
    }
  }

  /**
   * Get property assessment by ID
   * @param {number} id - Record ID
   * @returns {Object} - Property assessment record
   */
  async getPropertyAssessmentById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM property_assessments WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  /**
   * Get recent property assessments
   * @param {number} limit - Number of records to return
   * @returns {Array} - Array of property assessment records
   */
  async getRecentPropertyAssessments(limit = 10) {
    await this.connect();
    
    const query = `
      SELECT id, assessment_type, client_name, 
             CONCAT(street_name, ' ', house_number, ', ', city) as address,
             visit_date, visitor_name, rooms, status, created_at
      FROM property_assessments 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    
    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  /**
   * Search property assessments by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Matching records
   */
  async searchPropertyAssessments(criteria) {
    await this.connect();

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (criteria.client_name) {
      whereClauses.push(`client_name ILIKE $${paramIndex}`);
      values.push(`%${criteria.client_name}%`);
      paramIndex++;
    }

    if (criteria.city) {
      whereClauses.push(`full_address ILIKE $${paramIndex}`);
      values.push(`%${criteria.city}%`);
      paramIndex++;
    }

    if (criteria.street_name) {
      whereClauses.push(`full_address ILIKE $${paramIndex}`);
      values.push(`%${criteria.street_name}%`);
      paramIndex++;
    }

    if (criteria.status) {
      whereClauses.push(`status = $${paramIndex}`);
      values.push(criteria.status);
      paramIndex++;
    }

    if (criteria.assessment_type) {
      whereClauses.push(`assessment_type ILIKE $${paramIndex}`);
      values.push(`%${criteria.assessment_type}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM property_assessments_summary 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await this.client.query(query, values);
    return result.rows;
  }

  /**
   * Delete property assessment by ID
   * @param {number} id - Record ID
   * @returns {boolean} - Success status
   */
  async deletePropertyAssessment(id) {
    await this.connect();
    
    const query = 'DELETE FROM property_assessments WHERE id = $1 RETURNING id';
    const result = await this.client.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Property assessment with ID ${id} not found`);
    }

    console.log(`🗑️ Deleted property assessment record ID: ${id}`);
    return true;
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