import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class BuildingPermitDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Building Permits)');
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

  async insertBuildingPermit(extractionData, filename) {
    await this.connect();

    try {
      const query = `
        INSERT INTO building_permit_extracts (
          document_filename, document_path,
          permit_number, permit_number_confidence, permit_number_context,
          permit_date, permit_date_confidence, permit_date_context,
          permitted_usage, permitted_usage_confidence, permitted_usage_context,
          permit_issue_date, permit_issue_date_confidence, permit_issue_date_context,
          local_committee_name, local_committee_name_confidence, local_committee_name_context,
          processing_method, overall_confidence, processing_time_ms,
          markdown_content, markdown_path
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING id, extracted_at;
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
        extractionData.document_path || filename, // 2
        extractionData.permit_number?.value || extractionData.permit_number || null, // 3
        Math.min((extractionData.permit_number?.confidence || extractionData.confidence_scores?.permit_number || 0) * (extractionData.permit_number?.confidence ? 1 : 100), 100), // 4
        extractionData.extraction_contexts?.permit_number || null, // 5
        parseDate(extractionData.permit_date?.value || extractionData.permit_date), // 6
        Math.min((extractionData.permit_date?.confidence || extractionData.confidence_scores?.permit_date || 0) * (extractionData.permit_date?.confidence ? 1 : 100), 100), // 7
        extractionData.extraction_contexts?.permit_date || null, // 8
        extractionData.permitted_description?.value || extractionData.permitted_description || null, // 9
        Math.min((extractionData.permitted_description?.confidence || extractionData.confidence_scores?.permitted_description || 0) * (extractionData.permitted_description?.confidence ? 1 : 100), 100), // 10
        extractionData.extraction_contexts?.permitted_description || null, // 11
        parseDate(extractionData.permit_issue_date?.value || extractionData.permit_issue_date), // 12
        Math.min((extractionData.permit_issue_date?.confidence || extractionData.confidence_scores?.permit_issue_date || 0) * (extractionData.permit_issue_date?.confidence ? 1 : 100), 100), // 13
        extractionData.extraction_contexts?.permit_issue_date || null, // 14
        extractionData.local_committee_name?.value || extractionData.local_committee_name || null, // 15
        Math.min((extractionData.local_committee_name?.confidence || extractionData.confidence_scores?.local_committee_name || 0) * (extractionData.local_committee_name?.confidence ? 1 : 100), 100), // 16
        extractionData.extraction_contexts?.local_committee_name || null, // 17
        extractionData.extraction_method || extractionData.method || 'anthropic_ai', // 18
        Math.min((extractionData.confidence_scores?.overall || 0) * 100, 100), // 19
        extractionData.processing_time || extractionData.processingTime || 0, // 20
        extractionData.raw_text || '', // 21
        extractionData.markdown_path || null // 22
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📝 Inserted building permit record with ID: ${insertedRow.id}`);
      
      return {
        id: insertedRow.id,
        extracted_at: insertedRow.extracted_at
      };

    } catch (error) {
      console.error('❌ Database insertion failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  }

  async getBuildingPermitById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM building_permit_extracts WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  async getRecentBuildingPermits(limit = 10) {
    await this.connect();
    
    const query = `
      SELECT id, document_filename, permit_number, permit_date, 
             local_committee_name, permitted_usage,
             overall_confidence, extracted_at
      FROM building_permit_extracts 
      ORDER BY extracted_at DESC 
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