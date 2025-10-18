import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

/**
 * Database client for garmushka_measurements table
 * Handles interactive measurement sessions on garmushka floor plans
 */
export class GarmushkaMeasurementDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Garmushka Measurements)');
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
   * Create a new measurement session
   * @param {Object} measurementData - Measurement session data
   * @param {string} userId - ID of user creating the session
   * @returns {Object} - Created session with ID
   */
  async createMeasurementSession(measurementData, userId = 'system') {
    await this.connect();

    try {
      const query = `
        INSERT INTO garmushka_measurements (
          asset_id, asset_type, asset_reference,
          garmushka_file_url, garmushka_original_name, garmushka_stored_name,
          garmushka_file_type, garmushka_page_number,
          scale_meters_per_pixel, calibration_line, units,
          distance_measurements, area_measurements, session_data,
          garmushka_id, created_by, status, measurement_notes, measurement_context
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING id, created_at;
      `;

      const values = [
        measurementData.asset_id || null,                                    // 1
        measurementData.asset_type || null,                                  // 2
        measurementData.asset_reference || null,                             // 3
        measurementData.garmushka_file_url || null,                          // 4
        measurementData.garmushka_original_name || null,                     // 5
        measurementData.garmushka_stored_name || null,                       // 6
        measurementData.garmushka_file_type || 'image',                      // 7
        measurementData.garmushka_page_number || 1,                          // 8
        measurementData.scale_meters_per_pixel || null,                      // 9
        measurementData.calibration_line ? JSON.stringify(measurementData.calibration_line) : null, // 10
        measurementData.units || 'metric',                                   // 11
        measurementData.distance_measurements ? JSON.stringify(measurementData.distance_measurements) : '[]', // 12
        measurementData.area_measurements ? JSON.stringify(measurementData.area_measurements) : '[]', // 13
        measurementData.session_data ? JSON.stringify(measurementData.session_data) : null, // 14
        measurementData.garmushka_id || null,                                // 15
        userId,                                                              // 16
        measurementData.status || 'draft',                                   // 17
        measurementData.measurement_notes || null,                           // 18
        measurementData.measurement_context || null                          // 19
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];

      console.log(`📐 Created measurement session with ID: ${insertedRow.id}`);

      return {
        id: insertedRow.id,
        created_at: insertedRow.created_at
      };

    } catch (error) {
      console.error('❌ Failed to create measurement session:', error.message);
      throw error;
    }
  }

  /**
   * Get measurement session by ID
   * @param {string} id - Session UUID
   * @returns {Object} - Measurement session
   */
  async getMeasurementSessionById(id) {
    await this.connect();

    const query = 'SELECT * FROM garmushka_measurements WHERE id = $1';
    const result = await this.client.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error(`Measurement session ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Get all measurement sessions for an asset
   * @param {number} assetId - Asset ID
   * @param {string} assetType - Asset type (e.g., 'garmushka', 'property-assessment')
   * @returns {Array} - Array of measurement sessions
   */
  async getMeasurementSessionsByAsset(assetId, assetType) {
    await this.connect();

    const query = `
      SELECT * FROM garmushka_measurements
      WHERE asset_id = $1 AND asset_type = $2
      ORDER BY created_at DESC
    `;

    const result = await this.client.query(query, [assetId, assetType]);
    return result.rows;
  }

  /**
   * Get measurement sessions by garmushka ID
   * @param {number} garmushkaId - Garmushka record ID
   * @returns {Array} - Array of measurement sessions
   */
  async getMeasurementSessionsByGarmushkaId(garmushkaId) {
    await this.connect();

    const query = `
      SELECT * FROM garmushka_measurements_summary
      WHERE garmushka_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.client.query(query, [garmushkaId]);
    return result.rows;
  }

  /**
   * Update measurement session
   * @param {string} id - Session UUID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User making the update
   * @returns {Object} - Updated session info
   */
  async updateMeasurementSession(id, updateData, userId = 'system') {
    await this.connect();

    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Fields that can be updated
      const fieldMapping = {
        scale_meters_per_pixel: 'scale_meters_per_pixel',
        calibration_line: 'calibration_line',
        units: 'units',
        distance_measurements: 'distance_measurements',
        area_measurements: 'area_measurements',
        session_data: 'session_data',
        status: 'status',
        measurement_notes: 'measurement_notes',
        measurement_context: 'measurement_context'
      };

      Object.entries(fieldMapping).forEach(([key, dbColumn]) => {
        if (updateData.hasOwnProperty(key)) {
          updateFields.push(`${dbColumn} = $${paramIndex}`);
          let value = updateData[key];

          // Convert objects/arrays to JSON
          if (['calibration_line', 'distance_measurements', 'area_measurements', 'session_data'].includes(key)) {
            value = value ? JSON.stringify(value) : null;
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
        UPDATE garmushka_measurements
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, updated_at;
      `;

      const result = await this.client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Measurement session ${id} not found`);
      }

      console.log(`📐 Updated measurement session ID: ${id}`);

      return result.rows[0];

    } catch (error) {
      console.error('❌ Failed to update measurement session:', error.message);
      throw error;
    }
  }

  /**
   * Delete measurement session
   * @param {string} id - Session UUID
   * @returns {boolean} - Success status
   */
  async deleteMeasurementSession(id) {
    await this.connect();

    const query = 'DELETE FROM garmushka_measurements WHERE id = $1 RETURNING id';
    const result = await this.client.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error(`Measurement session ${id} not found`);
    }

    console.log(`🗑️ Deleted measurement session ID: ${id}`);
    return true;
  }

  /**
   * Get all measurement sessions
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Array} - Array of measurement sessions
   */
  async getAllMeasurementSessions(limit = 50) {
    await this.connect();

    const query = `
      SELECT * FROM garmushka_measurements_summary
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get completed measurement sessions
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Array} - Array of completed sessions
   */
  async getCompletedMeasurementSessions(limit = 50) {
    await this.connect();

    const query = `
      SELECT * FROM completed_garmushka_measurements
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  /**
   * Search measurement sessions by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Matching sessions
   */
  async searchMeasurementSessions(criteria) {
    await this.connect();

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (criteria.asset_id) {
      whereClauses.push(`asset_id = $${paramIndex}`);
      values.push(criteria.asset_id);
      paramIndex++;
    }

    if (criteria.asset_type) {
      whereClauses.push(`asset_type = $${paramIndex}`);
      values.push(criteria.asset_type);
      paramIndex++;
    }

    if (criteria.garmushka_id) {
      whereClauses.push(`garmushka_id = $${paramIndex}`);
      values.push(criteria.garmushka_id);
      paramIndex++;
    }

    if (criteria.status) {
      whereClauses.push(`status = $${paramIndex}`);
      values.push(criteria.status);
      paramIndex++;
    }

    if (criteria.created_by) {
      whereClauses.push(`created_by = $${paramIndex}`);
      values.push(criteria.created_by);
      paramIndex++;
    }

    if (criteria.is_calibrated !== undefined) {
      if (criteria.is_calibrated) {
        whereClauses.push(`scale_meters_per_pixel IS NOT NULL`);
      } else {
        whereClauses.push(`scale_meters_per_pixel IS NULL`);
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT * FROM garmushka_measurements_summary
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await this.client.query(query, values);
    return result.rows;
  }

  /**
   * Get measurement statistics
   * @returns {Object} - Statistics about measurement sessions
   */
  async getMeasurementStats() {
    await this.connect();

    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM garmushka_measurements';
      const statusQuery = 'SELECT status, COUNT(*) as count FROM garmushka_measurements GROUP BY status';
      const calibratedQuery = 'SELECT COUNT(*) as count FROM garmushka_measurements WHERE scale_meters_per_pixel IS NOT NULL';
      const recentQuery = 'SELECT COUNT(*) as count FROM garmushka_measurements WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      const avgMeasurementsQuery = `
        SELECT
          AVG(total_distance_measurements) as avg_distances,
          AVG(total_area_measurements) as avg_areas,
          AVG(total_measured_area) as avg_total_area
        FROM garmushka_measurements
        WHERE scale_meters_per_pixel IS NOT NULL
      `;

      const [totalResult, statusResult, calibratedResult, recentResult, avgResult] = await Promise.all([
        this.client.query(totalQuery),
        this.client.query(statusQuery),
        this.client.query(calibratedQuery),
        this.client.query(recentQuery),
        this.client.query(avgMeasurementsQuery)
      ]);

      return {
        total: parseInt(totalResult.rows[0].total),
        byStatus: statusResult.rows,
        calibratedCount: parseInt(calibratedResult.rows[0].count),
        recentMonth: parseInt(recentResult.rows[0].count),
        averages: {
          distanceMeasurements: parseFloat(avgResult.rows[0].avg_distances || 0),
          areaMeasurements: parseFloat(avgResult.rows[0].avg_areas || 0),
          totalMeasuredArea: parseFloat(avgResult.rows[0].avg_total_area || 0)
        }
      };

    } catch (error) {
      console.error('❌ Failed to get measurement statistics:', error.message);
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
}