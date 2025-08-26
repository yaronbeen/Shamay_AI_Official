import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class SharedBuildingDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Shared Building)');
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

  async insertSharedBuildingOrder(extractionData, filename) {
    await this.connect();

    try {
      const query = `
        INSERT INTO shared_building_order (
          filename, raw_text,
          order_issue_date, order_issue_date_confidence, order_issue_date_context,
          building_description, building_description_confidence, building_description_context,
          building_floors, building_floors_confidence, building_floors_context,
          building_sub_plots_count, building_sub_plots_count_confidence, building_sub_plots_count_context,
          building_address, building_address_confidence, building_address_context,
          total_sub_plots, total_sub_plots_confidence, total_sub_plots_context,
          sub_plots, overall_confidence, extraction_notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING id, processed_at;
      `;

      // Parse date strings to proper format
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
          return dateStr;
        } catch {
          return null;
        }
      };

      const values = [
        filename, // 1
        extractionData.raw_text || '', // 2
        parseDate(extractionData.order_issue_date), // 3
        extractionData.confidence_scores?.order_issue_date || 0, // 4
        extractionData.extraction_contexts?.order_issue_date || null, // 5
        extractionData.building_description || null, // 6
        extractionData.confidence_scores?.building_description || 0, // 7
        extractionData.extraction_contexts?.building_description || null, // 8
        extractionData.building_floors || null, // 9
        extractionData.confidence_scores?.building_floors || 0, // 10
        extractionData.extraction_contexts?.building_floors || null, // 11
        extractionData.building_sub_plots_count || null, // 12
        extractionData.confidence_scores?.building_sub_plots_count || 0, // 13
        extractionData.extraction_contexts?.building_sub_plots_count || null, // 14
        extractionData.building_address || null, // 15
        extractionData.confidence_scores?.building_address || 0, // 16
        extractionData.extraction_contexts?.building_address || null, // 17
        extractionData.total_sub_plots || null, // 18
        extractionData.confidence_scores?.total_sub_plots || 0, // 19
        extractionData.extraction_contexts?.total_sub_plots || null, // 20
        JSON.stringify(extractionData.sub_plots || []), // 21
        extractionData.confidence_scores?.overall || 0, // 22
        `Extracted using ${extractionData.extraction_method} with ${extractionData.model_used}` // 23
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📝 Inserted shared building order record with ID: ${insertedRow.id}`);
      
      return {
        id: insertedRow.id,
        processed_at: insertedRow.processed_at
      };

    } catch (error) {
      console.error('❌ Database insertion failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  }

  async getSharedBuildingOrderById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM shared_building_order WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  async getRecentSharedBuildingOrders(limit = 10) {
    await this.connect();
    
    const query = `
      SELECT id, filename, order_issue_date, building_description, 
             building_address, building_floors, total_sub_plots,
             overall_confidence, processed_at
      FROM shared_building_order 
      ORDER BY processed_at DESC 
      LIMIT $1
    `;
    
    const result = await this.client.query(query, [limit]);
    return result.rows;
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