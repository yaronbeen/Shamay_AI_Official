import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Client } = pg;

export class ImagesDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Images)');
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
   * Insert a new image record
   * @param {Object} imageData - Image metadata
   * @param {string} userId - ID of user uploading the image
   * @returns {Object} - Created record with ID
   */
  async insertImage(imageData, userId = 'system') {
    await this.connect();

    try {
      const query = `
        INSERT INTO images (
          image_type, title, filename, file_path, file_size, mime_type,
          width, height, property_assessment_id, building_permit_id,
          shared_building_order_id, land_registry_id, captured_date,
          notes, tags, uploaded_by, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING id, created_at;
      `;

      // Parse date string to proper format
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
        imageData.image_type || null,                    // 1 - required
        imageData.title || null,                         // 2
        imageData.filename || null,                      // 3 - required
        imageData.file_path || null,                     // 4 - required
        imageData.file_size || null,                     // 5
        imageData.mime_type || null,                     // 6
        imageData.width || null,                         // 7
        imageData.height || null,                        // 8
        imageData.property_assessment_id || null,        // 9
        imageData.building_permit_id || null,            // 10
        imageData.shared_building_order_id || null,      // 11
        imageData.land_registry_id || null,              // 12
        parseDate(imageData.captured_date),              // 13
        imageData.notes || null,                         // 14
        imageData.tags || null,                          // 15 - PostgreSQL array
        userId,                                          // 16
        imageData.status || 'active'                     // 17
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📸 Inserted image record with ID: ${insertedRow.id}`);
      
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
   * Get image by ID
   * @param {number} id - Image ID
   * @returns {Object} - Image record
   */
  async getImageById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM images WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  /**
   * Get images by type
   * @param {string} imageType - Type of images to retrieve
   * @param {number} limit - Maximum number of results
   * @returns {Array} - Array of image records
   */
  async getImagesByType(imageType, limit = 50) {
    await this.connect();
    
    const query = `
      SELECT * FROM active_images 
      WHERE image_type = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await this.client.query(query, [imageType, limit]);
    return result.rows;
  }

  /**
   * Get images linked to a property assessment
   * @param {number} propertyAssessmentId - Property assessment ID
   * @returns {Array} - Array of linked images
   */
  async getImagesByPropertyAssessment(propertyAssessmentId) {
    await this.connect();
    
    const query = `
      SELECT * FROM active_images 
      WHERE property_assessment_id = $1
      ORDER BY image_type, created_at
    `;
    
    const result = await this.client.query(query, [propertyAssessmentId]);
    return result.rows;
  }

  /**
   * Search images by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Matching image records
   */
  async searchImages(criteria) {
    await this.connect();

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    if (criteria.image_type) {
      whereClauses.push(`image_type = $${paramIndex}`);
      values.push(criteria.image_type);
      paramIndex++;
    }

    if (criteria.filename) {
      whereClauses.push(`filename ILIKE $${paramIndex}`);
      values.push(`%${criteria.filename}%`);
      paramIndex++;
    }

    if (criteria.title) {
      whereClauses.push(`title ILIKE $${paramIndex}`);
      values.push(`%${criteria.title}%`);
      paramIndex++;
    }

    if (criteria.property_assessment_id) {
      whereClauses.push(`property_assessment_id = $${paramIndex}`);
      values.push(criteria.property_assessment_id);
      paramIndex++;
    }

    if (criteria.tags && Array.isArray(criteria.tags)) {
      whereClauses.push(`tags && $${paramIndex}`);
      values.push(criteria.tags);
      paramIndex++;
    }

    if (criteria.uploaded_by) {
      whereClauses.push(`uploaded_by = $${paramIndex}`);
      values.push(criteria.uploaded_by);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM active_images 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await this.client.query(query, values);
    return result.rows;
  }

  /**
   * Update image metadata
   * @param {number} id - Image ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User making the update
   * @returns {Object} - Updated record info
   */
  async updateImage(id, updateData, userId = 'system') {
    await this.connect();

    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = [
        'image_type', 'title', 'notes', 'tags', 'captured_date', 'status'
      ];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          updateFields.push(`${field} = $${paramIndex}`);
          let value = updateData[field];
          
          // Handle date fields
          if (field === 'captured_date' && value) {
            value = this.parseDate(value);
          }
          
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id); // WHERE clause parameter

      const query = `
        UPDATE images 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, updated_at;
      `;

      const result = await this.client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Image with ID ${id} not found`);
      }

      console.log(`📸 Updated image record ID: ${id}`);
      
      return result.rows[0];

    } catch (error) {
      console.error('❌ Database update failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete image record (soft delete by changing status)
   * @param {number} id - Image ID
   * @param {boolean} hardDelete - True for permanent deletion
   * @returns {boolean} - Success status
   */
  async deleteImage(id, hardDelete = false) {
    await this.connect();
    
    try {
      let query, result;
      
      if (hardDelete) {
        query = 'DELETE FROM images WHERE id = $1 RETURNING id, file_path';
        result = await this.client.query(query, [id]);
        
        if (result.rows.length > 0) {
          const filePath = result.rows[0].file_path;
          // Optionally delete physical file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted physical file: ${filePath}`);
          }
        }
      } else {
        query = 'UPDATE images SET status = $1 WHERE id = $2 RETURNING id';
        result = await this.client.query(query, ['deleted', id]);
      }
      
      if (result.rows.length === 0) {
        throw new Error(`Image with ID ${id} not found`);
      }

      console.log(`🗑️ ${hardDelete ? 'Hard deleted' : 'Soft deleted'} image record ID: ${id}`);
      return true;
      
    } catch (error) {
      console.error('❌ Delete operation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get image statistics
   * @returns {Object} - Statistics about images
   */
  async getImageStats() {
    await this.connect();
    
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM images WHERE status = $1';
      const byTypeQuery = 'SELECT * FROM images_by_type';
      const recentQuery = 'SELECT COUNT(*) as count FROM images WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\' AND status = $1';
      const sizeQuery = 'SELECT SUM(file_size) as total_size, AVG(file_size) as avg_size FROM images WHERE status = $1';
      
      const [totalResult, byTypeResult, recentResult, sizeResult] = await Promise.all([
        this.client.query(totalQuery, ['active']),
        this.client.query(byTypeQuery),
        this.client.query(recentQuery, ['active']),
        this.client.query(sizeQuery, ['active'])
      ]);
      
      return {
        total: parseInt(totalResult.rows[0].total),
        byType: byTypeResult.rows,
        recentWeek: parseInt(recentResult.rows[0].count),
        totalSizeBytes: parseInt(sizeResult.rows[0].total_size || 0),
        avgSizeBytes: parseInt(sizeResult.rows[0].avg_size || 0)
      };
      
    } catch (error) {
      console.error('❌ Failed to get image statistics:', error.message);
      throw error;
    }
  }

  /**
   * Get all supported image types
   * @returns {Array} - List of valid image types
   */
  getImageTypes() {
    return [
      'תמונה חיצונית',
      'סקרין שוט GOVMAP',
      'סקרין שוט תצ״א',
      'סקרין שוט תצ״א 2',
      'תמונות פנימיות',
      'סקרין שוט מהצו בית משותף',
      'צילום תשריט מהתב״ע'
    ];
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