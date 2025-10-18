import { MiscellaneousDatabaseClient } from './database-client.js';

export class MiscellaneousFunctions {
  constructor() {
    this.dbClient = new MiscellaneousDatabaseClient();
  }

  /**
   * GetToday - Returns today's date and writes it to the database
   * @param {Object} additionalData - Optional additional data to store with today's date
   * @returns {Object} - Object containing today's date and database record
   */
  async GetToday(additionalData = {}) {
    try {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Prepare data for database insertion
      const data = {
        today_date: todayDate,
        created_by: 'GetToday_function',
        status: 'completed',
        ...additionalData
      };

      // Insert into database
      const record = await this.dbClient.insertMiscellaneous(data);

      console.log(`✅ Today's date (${todayDate}) recorded in database with ID: ${record.id}`);

      return {
        today_date: todayDate,
        database_record: record,
        formatted_date: {
          iso: todayDate,
          hebrew: this.formatHebrewDate(today),
          display: today.toLocaleDateString('he-IL')
        }
      };

    } catch (error) {
      console.error('❌ Error in GetToday function:', error.message);
      throw error;
    } finally {
      await this.dbClient.disconnect();
    }
  }

  /**
   * appraisal_id - Generates unique appraisal ID in format ###.MM.YYYY
   * @param {Object} options - Options for ID generation
   * @param {Date} options.date - Optional date to use (defaults to today)
   * @param {Object} options.additionalData - Optional data to store with the appraisal ID
   * @returns {Object} - Object containing generated appraisal ID and database record
   */
  async appraisal_id(options = {}) {
    try {
      const targetDate = options.date || new Date();
      const month = targetDate.getMonth() + 1; // getMonth() returns 0-11
      const year = targetDate.getFullYear();

      // Get next available index for this month/year
      const nextIndex = await this.dbClient.getNextAppraisalIndex(month, year);

      // Format the appraisal ID: ###.MM.YYYY
      const paddedIndex = nextIndex.toString().padStart(3, '0');
      const paddedMonth = month.toString().padStart(2, '0');
      const generatedId = `${paddedIndex}.${paddedMonth}.${year}`;

      // Double-check that this ID doesn't already exist
      const exists = await this.dbClient.appraisalIdExists(generatedId);
      if (exists) {
        throw new Error(`Generated appraisal ID ${generatedId} already exists in database`);
      }

      // Prepare data for database insertion
      const data = {
        appraisal_id: generatedId,
        today_date: targetDate.toISOString().split('T')[0],
        created_by: 'appraisal_id_function',
        status: 'draft',
        ...options.additionalData
      };

      // Insert into database
      const record = await this.dbClient.insertMiscellaneous(data);

      console.log(`✅ Appraisal ID ${generatedId} generated and stored with database ID: ${record.id}`);

      return {
        appraisal_id: generatedId,
        index: nextIndex,
        month: paddedMonth,
        year: year,
        database_record: record,
        metadata: {
          generated_date: targetDate.toISOString().split('T')[0],
          format: '###.MM.YYYY',
          description: 'Index-based appraisal ID for property valuations'
        }
      };

    } catch (error) {
      console.error('❌ Error in appraisal_id function:', error.message);
      throw error;
    } finally {
      await this.dbClient.disconnect();
    }
  }

  /**
   * Helper function to format date in Hebrew
   * @param {Date} date - Date to format
   * @returns {string} - Hebrew formatted date
   */
  formatHebrewDate(date) {
    const hebrewMonths = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    const day = date.getDate();
    const month = hebrewMonths[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ב${month} ${year}`;
  }

  /**
   * Batch function to create multiple appraisal IDs
   * @param {number} count - Number of IDs to generate
   * @param {Object} options - Options for batch generation
   * @returns {Array} - Array of generated appraisal IDs
   */
  async batchGenerateAppraisalIds(count, options = {}) {
    try {
      const results = [];

      for (let i = 0; i < count; i++) {
        const result = await this.appraisal_id({
          date: options.date,
          additionalData: {
            ...options.additionalData,
            batch_number: i + 1,
            total_batch_size: count
          }
        });
        results.push(result);
      }

      console.log(`✅ Generated batch of ${count} appraisal IDs`);
      return results;

    } catch (error) {
      console.error('❌ Error in batch generation:', error.message);
      throw error;
    }
  }

  /**
   * Get statistics about existing appraisal IDs
   * @param {Object} options - Query options
   * @returns {Object} - Statistics object
   */
  async getAppraisalStatistics(options = {}) {
    try {
      const records = await this.dbClient.getAllMiscellaneous(options);
      
      const stats = {
        total_records: records.length,
        with_appraisal_id: records.filter(r => r.appraisal_id).length,
        by_month: {},
        by_year: {},
        by_status: {}
      };

      records.forEach(record => {
        // Group by month/year
        if (record.appraisal_id) {
          const parts = record.appraisal_id.split('.');
          if (parts.length === 3) {
            const month = parts[1];
            const year = parts[2];
            const monthYear = `${month}.${year}`;

            stats.by_month[monthYear] = (stats.by_month[monthYear] || 0) + 1;
            stats.by_year[year] = (stats.by_year[year] || 0) + 1;
          }
        }

        // Group by status
        const status = record.status || 'unknown';
        stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('❌ Error getting appraisal statistics:', error.message);
      throw error;
    } finally {
      await this.dbClient.disconnect();
    }
  }

  /**
   * setLandForm - Set land form (צורת הקרקע) for a miscellaneous record
   * @param {number} recordId - Database record ID to update
   * @param {string} landForm - Land form selection (מלבנית, מרובעת, אי רגולרית)
   * @returns {Object} - Updated record and validation result
   */
  async setLandForm(recordId, landForm) {
    try {
      // Valid options for land form
      const validOptions = ['מלבנית', 'מרובעת', 'אי רגולרית'];
      
      // Validate selection
      if (!validOptions.includes(landForm)) {
        throw new Error(`Invalid land form selection. Must be one of: ${validOptions.join(', ')}`);
      }

      // Update the record
      const updatedRecord = await this.dbClient.updateMiscellaneousField(
        recordId, 
        'land_form', 
        landForm
      );

      console.log(`✅ Land form set to "${landForm}" for record ID: ${recordId}`);

      return {
        record_id: recordId,
        land_form: landForm,
        field_name_hebrew: 'צורת הקרקע',
        valid_options: validOptions,
        updated_record: updatedRecord,
        updated_at: updatedRecord.updated_at
      };

    } catch (error) {
      console.error('❌ Error in setLandForm function:', error.message);
      throw error;
    } finally {
      await this.dbClient.disconnect();
    }
  }

  /**
   * setLandSurface - Set land surface (פני הקרקע) for a miscellaneous record
   * @param {number} recordId - Database record ID to update
   * @param {string} landSurface - Land surface selection (מישוריים, תלולים, משופעים)
   * @returns {Object} - Updated record and validation result
   */
  async setLandSurface(recordId, landSurface) {
    try {
      // Valid options for land surface
      const validOptions = ['מישוריים', 'תלולים', 'משופעים'];
      
      // Validate selection
      if (!validOptions.includes(landSurface)) {
        throw new Error(`Invalid land surface selection. Must be one of: ${validOptions.join(', ')}`);
      }

      // Update the record
      const updatedRecord = await this.dbClient.updateMiscellaneousField(
        recordId, 
        'land_surface', 
        landSurface
      );

      console.log(`✅ Land surface set to "${landSurface}" for record ID: ${recordId}`);

      return {
        record_id: recordId,
        land_surface: landSurface,
        field_name_hebrew: 'פני הקרקע',
        valid_options: validOptions,
        updated_record: updatedRecord,
        updated_at: updatedRecord.updated_at
      };

    } catch (error) {
      console.error('❌ Error in setLandSurface function:', error.message);
      throw error;
    } finally {
      await this.dbClient.disconnect();
    }
  }

  /**
   * Get available options for land form and surface selections
   * @returns {Object} - Available options for both fields
   */
  static getLandOptions() {
    return {
      land_form: {
        hebrew_name: 'צורת הקרקע',
        english_name: 'Land Form',
        options: ['מלבנית', 'מרובעת', 'אי רגולרית']
      },
      land_surface: {
        hebrew_name: 'פני הקרקע', 
        english_name: 'Land Surface',
        options: ['מישוריים', 'תלולים', 'משופעים']
      }
    };
  }
}

// Convenience functions for direct usage
export const GetToday = async (additionalData) => {
  const functions = new MiscellaneousFunctions();
  return await functions.GetToday(additionalData);
};

export const appraisal_id = async (options) => {
  const functions = new MiscellaneousFunctions();
  return await functions.appraisal_id(options);
};

export const setLandForm = async (recordId, landForm) => {
  const functions = new MiscellaneousFunctions();
  return await functions.setLandForm(recordId, landForm);
};

export const setLandSurface = async (recordId, landSurface) => {
  const functions = new MiscellaneousFunctions();
  return await functions.setLandSurface(recordId, landSurface);
};

export const getLandOptions = () => {
  return MiscellaneousFunctions.getLandOptions();
};

// Default export
export default MiscellaneousFunctions;