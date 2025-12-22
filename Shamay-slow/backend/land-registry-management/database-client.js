const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

class LandRegistryDatabaseClient {
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
          total_plot_area, regulation_type, sub_plots_count, buildings_count, address_from_tabu, total_number_of_entries,
          unit_description, floor, registered_area, apartment_registered_area, balcony_area,
          shared_property, building_number, additional_areas,
          attachments, attachments_symbol, attachments_color, attachments_description, attachments_area, attachments_shared_with,
          owners, owners_count, ownership_type, rights,
          plot_notes, notes_action_type, notes_beneficiary, sub_chelka_notes_action_type, sub_chelka_notes_beneficiary,
          easements_essence, easements_description, sub_parcel_easements_essence, sub_parcel_easements_description,
          mortgages, mortgage_essence, mortgage_rank, mortgage_lenders, mortgage_borrowers,
          mortgage_amount, mortgage_property_share, mortgage_registration_date,
          confidence_document_info, confidence_property_info, confidence_unit_info,
          confidence_ownership, confidence_attachments, confidence_notes,
          confidence_easements, confidence_mortgages, confidence_overall,
          extraction_method, model_used, text_length, raw_text, raw_response
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56,
          $57, $58, $59, $60, $61, $62
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
        extractionData.total_number_of_entries || null, // 13
        extractionData.unit_description || null, // 14
        extractionData.floor || null, // 15
        extractionData.registered_area || null, // 16
        extractionData.apartment_registered_area || null, // 17
        extractionData.balcony_area || null, // 18
        extractionData.shared_property || null, // 19
        extractionData.building_number || null, // 20
        extractionData.additional_areas ? JSON.stringify(extractionData.additional_areas) : null, // 21
        extractionData.attachments ? JSON.stringify(extractionData.attachments) : null, // 22
        extractionData.attachments_symbol || null, // 23
        extractionData.attachments_color || null, // 24
        extractionData.attachments_description || null, // 25
        extractionData.attachments_area || null, // 26
        extractionData.attachments_shared_with || null, // 27
        extractionData.owners ? JSON.stringify(extractionData.owners) : null, // 28
        extractionData.owners_count || 0, // 29
        extractionData.ownership_type || null, // 30
        extractionData.rights || null, // 31
        extractionData.plot_notes || extractionData.plot_notes_general || null, // 32
        extractionData.notes_action_type || null, // 33
        extractionData.notes_beneficiary || null, // 34
        extractionData.sub_chelka_notes_action_type || null, // 35
        extractionData.sub_chelka_notes_beneficiary || null, // 36
        extractionData.easements_essence || null, // 37
        extractionData.easements_description || null, // 38
        extractionData.sub_parcel_easements_essence || null, // 39
        extractionData.sub_parcel_easements_description || null, // 40
        extractionData.mortgages ? JSON.stringify(extractionData.mortgages) : null, // 41
        extractionData.mortgage_essence || null, // 42
        extractionData.mortgage_rank || null, // 43
        extractionData.mortgage_lenders || null, // 44
        extractionData.mortgage_borrowers || null, // 45
        extractionData.mortgage_amount || null, // 46
        extractionData.mortgage_property_share || null, // 47
        parseDate(extractionData.mortgage_registration_date), // 48
        extractionData.confidence_scores?.document_info || 0, // 49
        extractionData.confidence_scores?.property_info || 0, // 50
        extractionData.confidence_scores?.unit_info || 0, // 51
        extractionData.confidence_scores?.ownership || 0, // 52
        extractionData.confidence_scores?.attachments || 0, // 53
        extractionData.confidence_scores?.notes || 0, // 54
        extractionData.confidence_scores?.easements || 0, // 55
        extractionData.confidence_scores?.mortgages || 0, // 56
        extractionData.confidence_scores?.overall || 0, // 57
        extractionData.extraction_method || 'anthropic_ai', // 58
        extractionData.model_used || 'claude-sonnet-4-20250514', // 59 - Latest Sonnet model
        extractionData.text_length || 0, // 60
        // Add raw_text and raw_response if they fit within reasonable limits
        (extractionData.raw_text || '').length > 50000 ? 
          (extractionData.raw_text || '').substring(0, 50000) : 
          (extractionData.raw_text || ''), // 61
        (extractionData.raw_response || '').length > 50000 ? 
          (extractionData.raw_response || '').substring(0, 50000) : 
          (extractionData.raw_response || '') // 62
      ];

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

module.exports = {
  LandRegistryDatabaseClient
};