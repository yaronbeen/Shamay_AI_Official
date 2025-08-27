import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class EnvironmentDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Environment Analysis)');
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
   * Store environment analysis in database
   * @param {Object} analysisData - Environment analysis data
   * @returns {string} - Analysis ID
   */
  async storeAnalysis(analysisData) {
    await this.connect();

    try {
      const query = `
        INSERT INTO environment_analyses (
          street, neighborhood, city,
          location_overview, infrastructure_transportation, amenities_services,
          demographics_lifestyle, real_estate_market, advantages_disadvantages,
          safety_environment, confidence_scores,
          confidence_score, processing_time, tokens_used, cost,
          analysis_method, model_used, raw_response, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING id;
      `;

      const values = [
        analysisData.street || null, // 1
        analysisData.neighborhood || null, // 2
        analysisData.city || null, // 3
        analysisData.analysis_data?.location_overview ? JSON.stringify(analysisData.analysis_data.location_overview) : null, // 4
        analysisData.analysis_data?.infrastructure_transportation ? JSON.stringify(analysisData.analysis_data.infrastructure_transportation) : null, // 5
        analysisData.analysis_data?.amenities_services ? JSON.stringify(analysisData.analysis_data.amenities_services) : null, // 6
        analysisData.analysis_data?.demographics_lifestyle ? JSON.stringify(analysisData.analysis_data.demographics_lifestyle) : null, // 7
        analysisData.analysis_data?.real_estate_market ? JSON.stringify(analysisData.analysis_data.real_estate_market) : null, // 8
        analysisData.analysis_data?.advantages_disadvantages ? JSON.stringify(analysisData.analysis_data.advantages_disadvantages) : null, // 9
        analysisData.analysis_data?.safety_environment ? JSON.stringify(analysisData.analysis_data.safety_environment) : null, // 10
        analysisData.analysis_data?.confidence_scores ? JSON.stringify(analysisData.analysis_data.confidence_scores) : null, // 11
        analysisData.confidence_score || 0, // 12
        analysisData.processing_time || 0, // 13
        analysisData.tokens_used || 0, // 14
        analysisData.cost || 0, // 15
        'anthropic_claude_environment', // 16
        'claude-opus-4-1-20250805', // 17
        (analysisData.raw_response || '').length > 50000 ? 
          (analysisData.raw_response || '').substring(0, 50000) : 
          (analysisData.raw_response || ''), // 18
        analysisData.created_at || new Date() // 19
      ];

      const result = await this.client.query(query, values);
      const insertedId = result.rows[0].id;
      
      console.log(`📝 Inserted environment analysis with ID: ${insertedId}`);
      
      return insertedId;

    } catch (error) {
      console.error('❌ Database insertion failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Get analysis by location
   * @param {string} street - Street name
   * @param {string} neighborhood - Neighborhood name
   * @param {string} city - City name
   * @returns {Object|null} - Analysis data or null
   */
  async getAnalysisByLocation(street, neighborhood, city) {
    await this.connect();
    
    const query = `
      SELECT * FROM environment_analyses 
      WHERE street = $1 AND neighborhood = $2 AND city = $3 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.client.query(query, [street, neighborhood, city]);
    
    return result.rows[0] || null;
  }

  /**
   * Get analysis by ID
   * @param {string} id - Analysis ID
   * @returns {Object|null} - Analysis data or null
   */
  async getAnalysisById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM environment_analyses WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0] || null;
  }

  /**
   * Get all analyses
   * @param {number} limit - Number of results to return
   * @returns {Array} - List of analyses
   */
  async getAllAnalyses(limit = 50) {
    await this.connect();
    
    const query = `
      SELECT id, street, neighborhood, city, confidence_score, created_at,
             location_overview, real_estate_market
      FROM environment_analyses 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    
    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  /**
   * Search analyses by city
   * @param {string} city - City name
   * @returns {Array} - List of analyses for the city
   */
  async getAnalysesByCity(city) {
    await this.connect();
    
    const query = `
      SELECT id, street, neighborhood, city, confidence_score, created_at,
             location_overview, real_estate_market
      FROM environment_analyses 
      WHERE city ILIKE $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.client.query(query, [`%${city}%`]);
    return result.rows;
  }

  /**
   * Get statistics about environment analyses
   * @returns {Object} - Statistics data
   */
  async getStatistics() {
    await this.connect();
    
    const query = `
      SELECT 
        COUNT(*) as total_analyses,
        COUNT(DISTINCT city) as unique_cities,
        COUNT(DISTINCT neighborhood) as unique_neighborhoods,
        COUNT(DISTINCT street) as unique_streets,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence,
        COUNT(CASE WHEN confidence_score >= 0.6 THEN 1 END) as medium_confidence
      FROM environment_analyses
    `;
    
    const result = await this.client.query(query);
    return result.rows[0];
  }

  /**
   * Delete analysis by ID
   * @param {string} id - Analysis ID
   * @returns {boolean} - Success status
   */
  async deleteAnalysis(id) {
    await this.connect();
    
    try {
      const query = 'DELETE FROM environment_analyses WHERE id = $1 RETURNING id';
      const result = await this.client.query(query, [id]);
      
      if (result.rows.length > 0) {
        console.log(`🗑️ Deleted environment analysis with ID: ${id}`);
        return true;
      } else {
        console.log(`⚠️ No analysis found with ID: ${id}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to delete analysis:', error.message);
      throw error;
    }
  }

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