import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class MiscellaneousDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Miscellaneous)');
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
   * Insert a new miscellaneous record with today's date
   * @param {Object} data - Miscellaneous data object
   * @returns {Object} - Created record with ID
   */
  async insertMiscellaneous(data = {}) {
    await this.connect();

    try {
      const query = `
        INSERT INTO miscellaneous (
          today_date, appraisal_id, opinion_types, land_form, land_surface,
          value_per_sqm, ecological_area, property_value, property_value_in_words,
          environment_description_prompt, plot_description_prompt,
          internal_property_description, property_assessment_id, created_by, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *;
      `;

      const values = [
        data.today_date || null, // Will be set by trigger if null
        data.appraisal_id || null,
        data.opinion_types || null,
        data.land_form || null,
        data.land_surface || null,
        data.value_per_sqm || null,
        data.ecological_area || null,
        data.property_value || null,
        data.property_value_in_words || null,
        data.environment_description_prompt || null,
        data.plot_description_prompt || null,
        data.internal_property_description || null,
        data.property_assessment_id || null,
        data.created_by || 'miscellaneous_functions',
        data.status || 'draft'
      ];

      const result = await this.client.query(query, values);
      console.log('✅ Miscellaneous record inserted successfully');
      return result.rows[0];

    } catch (error) {
      console.error('❌ Failed to insert miscellaneous record:', error.message);
      throw error;
    }
  }

  /**
   * Get the highest index for appraisal ID generation for a specific month/year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year (YYYY)
   * @returns {number} - Next available index
   */
  async getNextAppraisalIndex(month, year) {
    await this.connect();

    try {
      const monthStr = month.toString().padStart(2, '0');
      const pattern = `%.${monthStr}.${year}`;
      
      const query = `
        SELECT appraisal_id 
        FROM miscellaneous 
        WHERE appraisal_id LIKE $1 
        ORDER BY appraisal_id DESC 
        LIMIT 1;
      `;

      const result = await this.client.query(query, [pattern]);
      
      if (result.rows.length === 0) {
        return 1; // First record for this month/year
      }

      // Extract the index from the latest appraisal_id
      const latestId = result.rows[0].appraisal_id;
      const indexPart = latestId.split('.')[0];
      const currentIndex = parseInt(indexPart, 10);
      
      return currentIndex + 1;

    } catch (error) {
      console.error('❌ Failed to get next appraisal index:', error.message);
      throw error;
    }
  }

  /**
   * Check if an appraisal_id already exists
   * @param {string} appraisalId - Appraisal ID to check
   * @returns {boolean} - True if exists, false otherwise
   */
  async appraisalIdExists(appraisalId) {
    await this.connect();

    try {
      const query = 'SELECT id FROM miscellaneous WHERE appraisal_id = $1 LIMIT 1;';
      const result = await this.client.query(query, [appraisalId]);
      return result.rows.length > 0;

    } catch (error) {
      console.error('❌ Failed to check appraisal ID existence:', error.message);
      throw error;
    }
  }

  /**
   * Get all miscellaneous records
   * @param {Object} options - Query options
   * @returns {Array} - Array of miscellaneous records
   */
  async getAllMiscellaneous(options = {}) {
    await this.connect();

    try {
      let query = 'SELECT * FROM miscellaneous';
      const conditions = [];
      const values = [];

      if (options.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(options.status);
      }

      if (options.date_from) {
        conditions.push(`today_date >= $${values.length + 1}`);
        values.push(options.date_from);
      }

      if (options.date_to) {
        conditions.push(`today_date <= $${values.length + 1}`);
        values.push(options.date_to);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (options.limit) {
        query += ` LIMIT ${parseInt(options.limit, 10)}`;
      }

      const result = await this.client.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('❌ Failed to get miscellaneous records:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific miscellaneous record by ID
   * @param {number} id - Record ID
   * @returns {Object|null} - Miscellaneous record or null if not found
   */
  async getMiscellaneousById(id) {
    await this.connect();

    try {
      const query = 'SELECT * FROM miscellaneous WHERE id = $1;';
      const result = await this.client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('❌ Failed to get miscellaneous record:', error.message);
      throw error;
    }
  }

  /**
   * Update a specific field in a miscellaneous record
   * @param {number} id - Record ID
   * @param {string} field - Field name to update
   * @param {any} value - New value
   * @returns {Object} - Updated record
   */
  async updateMiscellaneousField(id, field, value) {
    await this.connect();

    try {
      const query = `UPDATE miscellaneous SET ${field} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;`;
      const result = await this.client.query(query, [value, id]);
      
      if (result.rows.length === 0) {
        throw new Error(`Record with ID ${id} not found`);
      }

      console.log(`✅ Updated ${field} for record ID ${id}`);
      return result.rows[0];

    } catch (error) {
      console.error(`❌ Failed to update ${field}:`, error.message);
      throw error;
    }
  }
}