import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

export class DatabaseClient {
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
        console.log('✅ Connected to PostgreSQL database');
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

  async insertExtraction(extractionData) {
    await this.connect();

    try {
      const query = `
        INSERT INTO land_registry_extracts_comprehensive (
          registration_office, issue_date, tabu_extract_date, document_filename,
          gush, chelka, sub_chelka, total_plot_area, regulation_type, 
          sub_plots_count, buildings_count, address_from_tabu,
          unit_description, floor, registered_area, apartment_registered_area, 
          balcony_area, shared_property, building_number, additional_areas,
          attachments, attachments_symbol, attachments_color, attachments_description, attachments_area,
          owners, owners_count, ownership_type, rights,
          plot_notes, notes_action_type, notes_beneficiary,
          easements_essence, easements_description,
          mortgages, mortgage_essence, mortgage_rank, mortgage_lenders, 
          mortgage_borrowers, mortgage_amount, mortgage_property_share,
          confidence_document_info, confidence_property_info, confidence_unit_info,
          confidence_ownership, confidence_attachments, confidence_notes,
          confidence_easements, confidence_mortgages, confidence_overall,
          extraction_method, model_used, text_length, raw_text, raw_response, extracted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, 
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56
        )
        RETURNING id, created_at;
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
          return dateStr;
        } catch {
          return null;
        }
      };

      // Extract primary mortgage data for individual fields
      const primaryMortgage = extractionData.mortgages?.[0] || {};
      
      // Extract primary attachment data for individual fields
      const primaryAttachment = extractionData.attachments?.[0] || {};

      const values = [
        // 1-4: Document Information
        extractionData.registration_office || null,
        parseDate(extractionData.issue_date),
        parseDate(extractionData.tabu_extract_date),
        extractionData.document_filename || null,
        
        // 5-12: Property Information
        extractionData.gush || null,
        extractionData.chelka || null,
        extractionData.sub_chelka || null,
        extractionData.total_plot_area || null,
        extractionData.regulation_type || null,
        extractionData.sub_plots_count || null,
        extractionData.buildings_count || null,
        extractionData.address_from_tabu || null,
        
        // 13-20: Unit/Apartment Information
        extractionData.unit_description || null,
        extractionData.floor || null,
        extractionData.registered_area || null,
        extractionData.apartment_registered_area || null,
        extractionData.balcony_area || null,
        extractionData.shared_property || null,
        extractionData.building_number || null,
        JSON.stringify(extractionData.additional_areas || []),
        
        // 21-25: Attachments
        JSON.stringify(extractionData.attachments || []),
        primaryAttachment.symbol || null,
        primaryAttachment.color || null,
        primaryAttachment.description || null,
        primaryAttachment.area || null,
        
        // 26-29: Ownership
        JSON.stringify(extractionData.owners || []),
        extractionData.owners?.length || 0,
        extractionData.ownership_type || null,
        extractionData.rights || null,
        
        // 30-32: Notes and Comments
        extractionData.plot_notes || null,
        extractionData.notes_action_type || null,
        extractionData.notes_beneficiary || null,
        
        // 33-34: Easements
        extractionData.easements_essence || null,
        extractionData.easements_description || null,
        
        // 35-41: Mortgages
        JSON.stringify(extractionData.mortgages || []),
        primaryMortgage.essence || null,
        primaryMortgage.rank || null,
        Array.isArray(primaryMortgage.lenders) ? primaryMortgage.lenders.join(', ') : primaryMortgage.lenders || null,
        Array.isArray(primaryMortgage.borrowers) ? primaryMortgage.borrowers.join(', ') : primaryMortgage.borrowers || null,
        primaryMortgage.amount || null,
        primaryMortgage.property_share || null,
        
        // 42-50: Confidence Scores
        extractionData.confidence_scores?.document_info || 0,
        extractionData.confidence_scores?.property_info || 0,
        extractionData.confidence_scores?.apartment_info || extractionData.confidence_scores?.unit_info || 0,
        extractionData.confidence_scores?.ownership || 0,
        extractionData.confidence_scores?.attachments || 0,
        extractionData.confidence_scores?.notes || 0,
        extractionData.confidence_scores?.easements || 0,
        extractionData.confidence_scores?.mortgages || 0,
        extractionData.confidence_scores?.overall || 0,
        
        // 50-56: Processing Metadata
        extractionData.extraction_method || null,
        extractionData.model_used || null,
        extractionData.text_length || null,
        extractionData.raw_text || null,
        extractionData.raw_response || null,
        extractionData.extracted_at || new Date().toISOString()
      ];

      const result = await this.client.query(query, values);
      const insertedRow = result.rows[0];
      
      console.log(`📝 Inserted comprehensive extraction record with ID: ${insertedRow.id}`);
      
      return {
        id: insertedRow.id,
        processed_at: insertedRow.created_at
      };

    } catch (error) {
      console.error('❌ Database insertion failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  }

  async getExtractionById(id) {
    await this.connect();
    
    const query = 'SELECT * FROM land_registry_extracts_comprehensive WHERE id = $1';
    const result = await this.client.query(query, [id]);
    
    return result.rows[0];
  }

  async getExtractionsByProperty(gush, chelka, sub_chelka = null) {
    await this.connect();
    
    let query = 'SELECT * FROM land_registry_extracts_comprehensive WHERE gush = $1 AND chelka = $2';
    const values = [gush, chelka];
    
    if (sub_chelka !== null) {
      query += ' AND sub_chelka = $3';
      values.push(sub_chelka);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.client.query(query, values);
    return result.rows;
  }

  async getRecentExtractions(limit = 10) {
    await this.connect();
    
    const query = `
      SELECT id, gush, chelka, sub_chelka, apartment_registered_area, 
             owners_count, confidence_overall, document_filename, created_at,
             registration_office, issue_date, address_from_tabu
      FROM land_registry_extracts_comprehensive 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    
    const result = await this.client.query(query, [limit]);
    return result.rows;
  }

  async getPropertySummary() {
    await this.connect();
    
    const query = 'SELECT * FROM property_summary LIMIT 20';
    const result = await this.client.query(query);
    return result.rows;
  }

  async getMortgageSummary() {
    await this.connect();
    
    const query = 'SELECT * FROM mortgage_summary LIMIT 20';
    const result = await this.client.query(query);
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