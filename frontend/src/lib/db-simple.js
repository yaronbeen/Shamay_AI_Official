// Simple PostgreSQL database client using your existing shamay_land_registry database
const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shamay_land_registry',
  user: 'postgres',
  password: 'postgres123', // Add password if needed
})

const db = {
  query: (text, params) => pool.query(text, params),
  client: () => pool.connect(),
  end: () => pool.end()
}

// Simple valuation database operations
class ValuationDB {
  // Create or update valuation from session data
  static async saveValuationFromSession(sessionId, organizationId, userId, wizardData) {
    try {
      // Check if valuation already exists for this session
      const existingSession = await db.query(
        'SELECT valuation_id FROM valuation_sessions WHERE session_id = $1',
        [sessionId]
      )

      let valuationId = existingSession.rows[0]?.valuation_id

      if (!valuationId) {
        // Create new valuation
        const result = await db.query(`
          INSERT INTO property_assessments (
            street_name, house_number, city, neighborhood, client_name, 
            visit_date, visitor_name, presenter_name, rooms, floor_number,
            free_text_additions, air_directions, north_description, south_description,
            east_description, west_description, relevant_plans_table, user_sections_count,
            eco_coefficient, created_by, updated_by, notes, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
          ) RETURNING id
        `, [
          wizardData.step1?.streetName || '',
          wizardData.step1?.buildingNumber || '',
          wizardData.step1?.city || '',
          wizardData.step1?.neighborhood || '',
          wizardData.step1?.clientName || '',
          wizardData.step1?.visitDate || new Date().toISOString().split('T')[0],
          wizardData.step1?.visitorName || '',
          wizardData.step1?.presenterName || '',
          wizardData.step1?.rooms || 0,
          wizardData.step1?.floorNumber || '',
          JSON.stringify(wizardData.step1?.freeTextAdditions || ''),
          JSON.stringify(wizardData.step1?.airDirections || ''),
          JSON.stringify(wizardData.step1?.northDescription || ''),
          JSON.stringify(wizardData.step1?.southDescription || ''),
          JSON.stringify(wizardData.step1?.eastDescription || ''),
          JSON.stringify(wizardData.step1?.westDescription || ''),
          JSON.stringify(wizardData.step1?.relevantPlansTable || ''),
          wizardData.step1?.userSectionsCount || 0,
          wizardData.step1?.ecoCoefficient || 0,
          'system',
          'system',
          JSON.stringify(wizardData.notes || {}),
          'draft'
        ])

        valuationId = result.rows[0].id

        // Create session record
        await db.query(`
          INSERT INTO valuation_sessions (session_id, valuation_id, organization_id, user_id, status, step_data, wizard_data, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [sessionId, valuationId, organizationId, userId, 'ACTIVE', JSON.stringify(wizardData), JSON.stringify(wizardData)])
      } else {
        // Update existing valuation
        await db.query(`
          UPDATE property_assessments SET
            street_name = $1,
            house_number = $2,
            city = $3,
            neighborhood = $4,
            client_name = $5,
            visit_date = $6,
            visitor_name = $7,
            presenter_name = $8,
            rooms = $9,
            floor_number = $10,
            free_text_additions = $11,
            air_directions = $12,
            north_description = $13,
            south_description = $14,
            east_description = $15,
            west_description = $16,
            relevant_plans_table = $17,
            user_sections_count = $18,
            eco_coefficient = $19,
            updated_by = $20,
            notes = $21,
            status = $22,
            updated_at = NOW()
          WHERE id = $23
        `, [
          wizardData.step1?.streetName || '',
          wizardData.step1?.buildingNumber || '',
          wizardData.step1?.city || '',
          wizardData.step1?.neighborhood || '',
          wizardData.step1?.clientName || '',
          wizardData.step1?.visitDate || new Date().toISOString().split('T')[0],
          wizardData.step1?.visitorName || '',
          wizardData.step1?.presenterName || '',
          wizardData.step1?.rooms || 0,
          wizardData.step1?.floorNumber || '',
          JSON.stringify(wizardData.step1?.freeTextAdditions || ''),
          JSON.stringify(wizardData.step1?.airDirections || ''),
          JSON.stringify(wizardData.step1?.northDescription || ''),
          JSON.stringify(wizardData.step1?.southDescription || ''),
          JSON.stringify(wizardData.step1?.eastDescription || ''),
          JSON.stringify(wizardData.step1?.westDescription || ''),
          JSON.stringify(wizardData.step1?.relevantPlansTable || ''),
          wizardData.step1?.userSectionsCount || 0,
          wizardData.step1?.ecoCoefficient || 0,
          'system',
          JSON.stringify(wizardData.notes || {}),
          'draft',
          valuationId
        ])

        // Update session data
        await db.query(`
          UPDATE valuation_sessions SET
            step_data = $1,
            wizard_data = $2,
            updated_at = NOW()
          WHERE session_id = $3
        `, [JSON.stringify(wizardData), JSON.stringify(wizardData), sessionId])
      }

      return { valuationId, success: true }
    } catch (error) {
      console.error('Error saving valuation from session:', error)
      return { error: 'Failed to save valuation' }
    }
  }

  // Save GIS data
  static async saveGISData(valuationId, gisData) {
    try {
      await db.query(`
        UPDATE property_assessments SET
          notes = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ gisScreenshots: gisData.screenshots, gisAnalysis: gisData.analysis }), valuationId])

      return { success: true }
    } catch (error) {
      console.error('Error saving GIS data:', error)
      return { error: 'Failed to save GIS data' }
    }
  }

  // Save Garmushka data
  static async saveGarmushkaData(valuationId, garmushkaData) {
    try {
      await db.query(`
        UPDATE property_assessments SET
          notes = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ garmushkaMeasurements: garmushkaData.measurements, garmushkaImages: garmushkaData.images }), valuationId])

      return { success: true }
    } catch (error) {
      console.error('Error saving Garmushka data:', error)
      return { error: 'Failed to save Garmushka data' }
    }
  }

  // Save final results
  static async saveFinalResults(valuationId, finalValuation, pricePerSqm, comparableData, propertyAnalysis) {
    try {
      await db.query(`
        UPDATE property_assessments SET
          notes = $1,
          status = 'ready',
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ finalValuation, pricePerSqm, comparableData, propertyAnalysis }), valuationId])

      return { success: true }
    } catch (error) {
      console.error('Error saving final results:', error)
      return { error: 'Failed to save final results' }
    }
  }

  // Get user's valuations
  static async getUserValuations(userId, organizationId) {
    try {
      const result = await db.query(`
        SELECT 
          pa.*,
          vs.session_id,
          vs.status as session_status
        FROM property_assessments pa
        LEFT JOIN valuation_sessions vs ON pa.id = vs.valuation_id
        WHERE vs.user_id = $1 AND vs.organization_id = $2
        ORDER BY pa.updated_at DESC
      `, [userId, organizationId])

      return { valuations: result.rows, success: true }
    } catch (error) {
      console.error('Error getting user valuations:', error)
      return { error: 'Failed to get valuations' }
    }
  }

  // Get valuation by ID
  static async getValuationById(valuationId, organizationId) {
    try {
      const result = await db.query(`
        SELECT 
          pa.*,
          vs.session_id,
          vs.status as session_status
        FROM property_assessments pa
        LEFT JOIN valuation_sessions vs ON pa.id = vs.valuation_id
        WHERE pa.id = $1 AND vs.organization_id = $2
      `, [valuationId, organizationId])

      if (result.rows.length === 0) {
        return { error: 'Valuation not found' }
      }

      return { valuation: result.rows[0], success: true }
    } catch (error) {
      console.error('Error getting valuation:', error)
      return { error: 'Failed to get valuation' }
    }
  }
}

module.exports = { db, ValuationDB }
