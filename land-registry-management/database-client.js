import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class LandRegistryDatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database (Land Registry)');
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
   * Insert a new comprehensive land registry extraction record
   * @param {Object} extractionData - Comprehensive land registry extraction data
   * @param {string} filename - Document filename
   * @returns {Object} - Created record with ID
   */
  async insertLandRegistryExtract(extractionData, filename) {
    await this.connect();

    try {
      const query = `
        INSERT INTO land_registry_extracts_comprehensive (
          document_filename,
          registration_office, issue_date, tabu_extract_date,
          gush, chelka, sub_chelka,
          total_plot_area, regulation_type, sub_plots_count, buildings_count, address_from_tabu,
          unit_description, floor, registered_area, apartment_registered_area, balcony_area,
          shared_property, building_number, additional_areas,
          attachments, attachments_symbol, attachments_color, attachments_description, attachments_area,
          owners, owners_count, ownership_type, rights,
          plot_notes, notes_action_type, notes_beneficiary,
          easements_essence, easements_description,
          mortgages, mortgage_essence, mortgage_rank, mortgage_lenders, mortgage_borrowers,
          mortgage_amount, mortgage_property_share,
          confidence_document_info, confidence_property_info, confidence_unit_info,
          confidence_ownership, confidence_attachments, confidence_notes,
          confidence_easements, confidence_mortgages, confidence_overall,
          extraction_method, model_used, text_length, raw_text, raw_response
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52
        )
        RETURNING id, created_at;
      `;

      // Helper function to parse dates
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
          return dateStr;
        } catch {
          return null;
        }
      };

      const values = [
        filename, // 1
        extractionData.registration_office || null, // 2
        parseDate(extractionData.issue_date), // 3
        parseDate(extractionData.tabu_extract_date), // 4
        extractionData.gush || null, // 5
        extractionData.chelka || null, // 6
        extractionData.sub_chelka || null, // 7
        extractionData.total_plot_area || null, // 8
        extractionData.regulation_type || null, // 9
        extractionData.sub_plots_count || null, // 10
        extractionData.buildings_count || null, // 11
        extractionData.address_from_tabu || null, // 12
        extractionData.unit_description || null, // 13
        extractionData.floor || null, // 14
        extractionData.registered_area || null, // 15
        extractionData.apartment_registered_area || null, // 16
        extractionData.balcony_area || null, // 17
        extractionData.shared_property || null, // 18
        extractionData.building_number || null, // 19
        extractionData.additional_areas ? JSON.stringify(extractionData.additional_areas) : null, // 20
        extractionData.attachments ? JSON.stringify(extractionData.attachments) : null, // 21
        extractionData.attachments_symbol || null, // 22
        extractionData.attachments_color || null, // 23
        extractionData.attachments_description || null, // 24
        extractionData.attachments_area || null, // 25
        extractionData.owners ? JSON.stringify(extractionData.owners) : null, // 26
        extractionData.owners_count || 0, // 27
        extractionData.ownership_type || null, // 28
        extractionData.rights || null, // 29
        extractionData.plot_notes || null, // 30
        extractionData.notes_action_type || null, // 31
        extractionData.notes_beneficiary || null, // 32
        extractionData.easements_essence || null, // 33
        extractionData.easements_description || null, // 34
        extractionData.mortgages ? JSON.stringify(extractionData.mortgages) : null, // 35
        extractionData.mortgage_essence || null, // 36
        extractionData.mortgage_rank || null, // 37
        extractionData.mortgage_lenders || null, // 38
        extractionData.mortgage_borrowers || null, // 39
        extractionData.mortgage_amount || null, // 40
        extractionData.mortgage_property_share || null, // 41
        extractionData.confidence_scores?.document_info || 0, // 42
        extractionData.confidence_scores?.property_info || 0, // 43
        extractionData.confidence_scores?.unit_info || 0, // 44
        extractionData.confidence_scores?.ownership || 0, // 45
        extractionData.confidence_scores?.attachments || 0, // 46
        extractionData.confidence_scores?.notes || 0, // 47
        extractionData.confidence_scores?.easements || 0, // 48
        extractionData.confidence_scores?.mortgages || 0, // 49
        extractionData.confidence_scores?.overall || 0, // 50
        extractionData.extraction_method || 'anthropic_ai', // 51
        extractionData.model_used || 'claude-opus-4-1-20250805', // 52
        extractionData.text_length || 0 // 53
      ];

      // Add raw_text and raw_response if they fit within reasonable limits
      const rawText = extractionData.raw_text || '';
      const rawResponse = extractionData.raw_response || '';
      
      // Add the final values
      values.push(rawText.length > 50000 ? rawText.substring(0, 50000) : rawText); // 54
      values.push(rawResponse.length > 50000 ? rawResponse.substring(0, 50000) : rawResponse); // 55
      
      // Fix the values array length to match query parameters
      while (values.length < 52) {
        values.push(null);
      }

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📝 Inserted land registry record with ID: ${insertedRow.id}`);
      
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

  async getLandRegistryExtractById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM land_registry_extracts_comprehensive WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  async getRecentLandRegistryExtracts(limit = 10) {
    await this.connect();
    
    const query = `
      SELECT id, document_filename, registration_office, gush, chelka, sub_chelka, 
             address_from_tabu, unit_description, apartment_registered_area, 
             confidence_overall, created_at
      FROM land_registry_extracts_comprehensive 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    
    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  async searchByGushChelka(gush, chelka = null) {
    await this.connect();
    
    let query = 'SELECT * FROM land_registry_extracts_comprehensive WHERE gush = $1';
    const params = [gush];
    
    if (chelka !== null) {
      query += ' AND chelka = $2';
      params.push(chelka);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.client.query(query, params);
    return result.rows;
  }

  async getComprehensiveStatistics() {
    await this.connect();
    
    const query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN confidence_overall >= 0.8 THEN 1 END) as high_confidence,
        COUNT(CASE WHEN confidence_overall >= 0.6 THEN 1 END) as medium_confidence,
        AVG(confidence_overall) as avg_confidence,
        COUNT(DISTINCT registration_office) as unique_offices,
        COUNT(DISTINCT CONCAT(gush, '-', chelka)) as unique_properties
      FROM land_registry_extracts_comprehensive
    `;
    
    const result = await this.client.query(query);
    return result.rows[0];
  }

  async searchByRegistrationOffice(office) {
    await this.connect();
    
    const query = `
      SELECT id, document_filename, gush, chelka, sub_chelka, address_from_tabu,
             confidence_overall, created_at
      FROM land_registry_extracts_comprehensive 
      WHERE registration_office ILIKE $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.client.query(query, [`%${office}%`]);
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