// Simple PostgreSQL database client using your existing shamay_land_registry database
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shamay_land_registry',
  user: 'postgres',
  password: 'postgres123', // Add password if needed
})

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  client: () => pool.connect(),
  end: () => pool.end()
}

// Simple valuation database operations
export class ValuationDB {
  // Create or update valuation from session data
  static async saveValuationFromSession(
    sessionId: string,
    organizationId: string,
    userId: string,
    wizardData: any
  ) {
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
            address, client_name, valuation_date, shamay_name, shamay_serial_number,
            rooms, floor, area, balcony, parking, elevator,
            final_valuation, price_per_sqm, property_analysis, market_analysis,
            risk_assessment, recommendations, selected_image_preview,
            selected_image_name, selected_image_index, total_images,
            signature_preview, status, notes, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
          ) RETURNING id
        `, [
          wizardData.step1?.addressFull || '',
          wizardData.step1?.clientName || '',
          wizardData.step1?.valuationDate || new Date().toISOString().split('T')[0],
          wizardData.step1?.shamayName || '',
          wizardData.step1?.referenceNumber || '',
          wizardData.step1?.rooms || 0,
          wizardData.step1?.floor || 0,
          wizardData.step1?.area || 0,
          wizardData.step1?.balconyArea || 0,
          wizardData.step1?.parking || false,
          wizardData.step1?.elevator || false,
          wizardData.finalValuation || 0,
          wizardData.pricePerSqm || 0,
          JSON.stringify(wizardData.step3 || {}),
          JSON.stringify(wizardData.step4 || {}),
          JSON.stringify(wizardData.riskAssessment || {}),
          JSON.stringify(wizardData.recommendations || []),
          wizardData.selectedImagePreview || '',
          wizardData.selectedImageName || '',
          wizardData.selectedImageIndex || 0,
          wizardData.totalImages || 0,
          wizardData.signaturePreview || '',
          'draft',
          JSON.stringify(wizardData.notes || {})
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
            address = $1,
            client_name = $2,
            valuation_date = $3,
            shamay_name = $4,
            shamay_serial_number = $5,
            rooms = $6,
            floor = $7,
            area = $8,
            balcony = $9,
            parking = $10,
            elevator = $11,
            final_valuation = $12,
            price_per_sqm = $13,
            property_analysis = $14,
            market_analysis = $15,
            risk_assessment = $16,
            recommendations = $17,
            selected_image_preview = $18,
            selected_image_name = $19,
            selected_image_index = $20,
            total_images = $21,
            signature_preview = $22,
            status = $23,
            notes = $24,
            updated_at = NOW()
          WHERE id = $25
        `, [
          wizardData.step1?.addressFull || '',
          wizardData.step1?.clientName || '',
          wizardData.step1?.valuationDate || new Date().toISOString().split('T')[0],
          wizardData.step1?.shamayName || '',
          wizardData.step1?.referenceNumber || '',
          wizardData.step1?.rooms || 0,
          wizardData.step1?.floor || 0,
          wizardData.step1?.area || 0,
          wizardData.step1?.balconyArea || 0,
          wizardData.step1?.parking || false,
          wizardData.step1?.elevator || false,
          wizardData.finalValuation || 0,
          wizardData.pricePerSqm || 0,
          JSON.stringify(wizardData.step3 || {}),
          JSON.stringify(wizardData.step4 || {}),
          JSON.stringify(wizardData.riskAssessment || {}),
          JSON.stringify(wizardData.recommendations || []),
          wizardData.selectedImagePreview || '',
          wizardData.selectedImageName || '',
          wizardData.selectedImageIndex || 0,
          wizardData.totalImages || 0,
          wizardData.signaturePreview || '',
          'draft',
          JSON.stringify(wizardData.notes || {}),
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
  static async saveGISData(valuationId: number, gisData: any) {
    try {
      await db.query(`
        UPDATE property_assessments SET
          property_analysis = COALESCE(property_analysis, '{}'::jsonb) || $1::jsonb,
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
  static async saveGarmushkaData(valuationId: number, garmushkaData: any) {
    try {
      await db.query(`
        UPDATE property_assessments SET
          property_analysis = COALESCE(property_analysis, '{}'::jsonb) || $1::jsonb,
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
  static async saveFinalResults(
    valuationId: number,
    finalValuation: number,
    pricePerSqm: number,
    comparableData: any,
    propertyAnalysis: any
  ) {
    try {
      await db.query(`
        UPDATE property_assessments SET
          final_valuation = $1,
          price_per_sqm = $2,
          property_analysis = $3,
          market_analysis = $4,
          status = 'ready',
          updated_at = NOW()
        WHERE id = $5
      `, [finalValuation, pricePerSqm, JSON.stringify(propertyAnalysis), JSON.stringify(comparableData), valuationId])

      return { success: true }
    } catch (error) {
      console.error('Error saving final results:', error)
      return { error: 'Failed to save final results' }
    }
  }

  // Get user's valuations
  static async getUserValuations(userId: string, organizationId: string) {
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
  static async getValuationById(valuationId: number, organizationId: string) {
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
