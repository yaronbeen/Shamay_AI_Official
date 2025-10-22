// Shuma Database Client - Complete valuation data management
const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shamay_land_registry',
  user: 'postgres',
  password: 'postgres123',
})

const db = {
  query: (text, params) => pool.query(text, params),
  client: () => pool.connect(),
  end: () => pool.end()
}

// Helper function to format dates for PostgreSQL
function formatDateForDB(dateString) {
  if (!dateString) return null
  if (dateString === '') return null
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // Try to parse and format the date
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0] // Returns YYYY-MM-DD
  } catch (error) {
    console.warn('Invalid date format:', dateString)
    return null
  }
}

// Shuma database operations
class ShumaDB {
  // Create or update shuma from session data
  static async saveShumaFromSession(sessionId, organizationId, userId, valuationData) {
    try {
      // Check if shuma already exists for this session
      const existingShuma = await db.query(
        'SELECT id FROM shuma WHERE session_id = $1',
        [sessionId]
      )

      let shumaId = existingShuma.rows[0]?.id

      if (!shumaId) {
        // Create new shuma
        const result = await db.query(`
          INSERT INTO shuma (
            session_id, organization_id, user_id, status,
            street, building_number, city, neighborhood, full_address,
            rooms, floor, air_directions, area, property_essence,
            client_name, visit_date, valuation_date, reference_number,
            shamay_name, shamay_serial_number, gush, parcel, parcel_area,
            parcel_shape, parcel_surface, sub_parcel, registered_area,
            built_area, balcony_area, building_permit_number,
            building_permit_date, building_description, building_floors,
            building_units, building_details, construction_source,
            attachments, ownership_rights, notes, registry_office,
            extract_date, internal_layout, finish_standard, finish_details,
            property_images, selected_image_index, selected_image_preview,
            interior_images, signature_preview, property_analysis,
            market_analysis, risk_assessment, recommendations,
            extracted_data, comparable_data, final_valuation,
            price_per_sqm, is_complete, uploads, gis_screenshots,
            garmushka_measurements
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
            $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
            $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54,
            $55, $56, $57, $58, $59, $60, $61
          ) RETURNING id
        `, [
          sessionId, organizationId, userId, valuationData.isComplete ? 'ready' : 'in_progress',
          valuationData.street, valuationData.buildingNumber, valuationData.city,
          valuationData.neighborhood, valuationData.fullAddress, valuationData.rooms,
          valuationData.floor, valuationData.airDirections, valuationData.area,
          valuationData.propertyEssence,           valuationData.clientName, formatDateForDB(valuationData.visitDate),
          formatDateForDB(valuationData.valuationDate), valuationData.referenceNumber, valuationData.shamayName,
          valuationData.shamaySerialNumber, valuationData.gush, valuationData.parcel,
          valuationData.parcelArea, valuationData.parcelShape, valuationData.parcelSurface,
          valuationData.subParcel, valuationData.registeredArea, valuationData.builtArea,
          valuationData.balconyArea, valuationData.buildingPermitNumber, formatDateForDB(valuationData.buildingPermitDate),
          valuationData.buildingDescription, valuationData.buildingFloors, valuationData.buildingUnits,
          valuationData.buildingDetails, valuationData.constructionSource, valuationData.attachments,
          valuationData.ownershipRights, valuationData.notes, valuationData.registryOffice,
          formatDateForDB(valuationData.extractDate), valuationData.internalLayout, valuationData.finishStandard,
          valuationData.finishDetails, JSON.stringify(valuationData.propertyImages || []),
          valuationData.selectedImageIndex, valuationData.selectedImagePreview,
          JSON.stringify(valuationData.interiorImages || []), valuationData.signaturePreview,
          JSON.stringify(valuationData.propertyAnalysis || {}), JSON.stringify(valuationData.marketAnalysis || {}),
          JSON.stringify(valuationData.riskAssessment || {}), JSON.stringify(valuationData.recommendations || []),
          JSON.stringify(valuationData.extractedData || {}), JSON.stringify(valuationData.comparableData || []),
          valuationData.finalValuation, valuationData.pricePerSqm, valuationData.isComplete,
          JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisScreenshots || {}),
          JSON.stringify(valuationData.garmushkaMeasurements || {})
        ])

        shumaId = result.rows[0].id
      } else {
        // Update existing shuma
        await db.query(`
          UPDATE shuma SET
            status = $1, street = $2, building_number = $3, city = $4, neighborhood = $5,
            full_address = $6, rooms = $7, floor = $8, air_directions = $9, area = $10,
            property_essence = $11, client_name = $12, visit_date = $13, valuation_date = $14,
            reference_number = $15, shamay_name = $16, shamay_serial_number = $17,
            gush = $18, parcel = $19, parcel_area = $20, parcel_shape = $21, parcel_surface = $22,
            sub_parcel = $23, registered_area = $24, built_area = $25, balcony_area = $26,
            building_permit_number = $27, building_permit_date = $28, building_description = $29,
            building_floors = $30, building_units = $31, building_details = $32,
            construction_source = $33, attachments = $34, ownership_rights = $35, notes = $36,
            registry_office = $37, extract_date = $38, internal_layout = $39, finish_standard = $40,
            finish_details = $41, property_images = $42, selected_image_index = $43,
            selected_image_preview = $44, interior_images = $45, signature_preview = $46,
            property_analysis = $47, market_analysis = $48, risk_assessment = $49,
            recommendations = $50, extracted_data = $51, comparable_data = $52,
            final_valuation = $53, price_per_sqm = $54, is_complete = $55, uploads = $56,
            gis_screenshots = $57, garmushka_measurements = $58, updated_at = NOW()
          WHERE id = $59
        `, [
          valuationData.isComplete ? 'ready' : 'in_progress', valuationData.street, valuationData.buildingNumber,
          valuationData.city, valuationData.neighborhood, valuationData.fullAddress, valuationData.rooms,
          valuationData.floor, valuationData.airDirections, valuationData.area, valuationData.propertyEssence,
          valuationData.clientName, formatDateForDB(valuationData.visitDate), formatDateForDB(valuationData.valuationDate), valuationData.referenceNumber,
          valuationData.shamayName, valuationData.shamaySerialNumber, valuationData.gush, valuationData.parcel,
          valuationData.parcelArea, valuationData.parcelShape, valuationData.parcelSurface, valuationData.subParcel,
          valuationData.registeredArea, valuationData.builtArea, valuationData.balconyArea, valuationData.buildingPermitNumber,
          formatDateForDB(valuationData.buildingPermitDate), valuationData.buildingDescription, valuationData.buildingFloors,
          valuationData.buildingUnits, valuationData.buildingDetails, valuationData.constructionSource,
          valuationData.attachments, valuationData.ownershipRights, valuationData.notes, valuationData.registryOffice,
          formatDateForDB(valuationData.extractDate), valuationData.internalLayout, valuationData.finishStandard, valuationData.finishDetails,
          JSON.stringify(valuationData.propertyImages || []), valuationData.selectedImageIndex, valuationData.selectedImagePreview,
          JSON.stringify(valuationData.interiorImages || []), valuationData.signaturePreview, JSON.stringify(valuationData.propertyAnalysis || {}),
          JSON.stringify(valuationData.marketAnalysis || {}), JSON.stringify(valuationData.riskAssessment || {}),
          JSON.stringify(valuationData.recommendations || []), JSON.stringify(valuationData.extractedData || {}),
          JSON.stringify(valuationData.comparableData || []), valuationData.finalValuation, valuationData.pricePerSqm,
          valuationData.isComplete, JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisScreenshots || {}),
          JSON.stringify(valuationData.garmushkaMeasurements || {}), shumaId
        ])
      }

      return { shumaId, success: true }
    } catch (error) {
      console.error('Error saving shuma from session:', error)
      return { error: 'Failed to save shuma' }
    }
  }

  // Load shuma data for wizard
  static async loadShumaForWizard(sessionId) {
    try {
      const result = await db.query(`
        SELECT * FROM shuma WHERE session_id = $1
      `, [sessionId])

      if (result.rows.length === 0) {
        return { error: 'Shuma not found' }
      }

      const shuma = result.rows[0]
      
      // Convert database data back to ValuationData format
      const valuationData = {
        // Basic Property Information
        street: shuma.street || '',
        buildingNumber: shuma.building_number || '',
        city: shuma.city || '',
        neighborhood: shuma.neighborhood || '',
        fullAddress: shuma.full_address || '',
        rooms: shuma.rooms || 0,
        floor: shuma.floor || 0,
        airDirections: shuma.air_directions || '',
        area: parseFloat(shuma.area) || 0,
        propertyEssence: shuma.property_essence || '',
        
        // Cover Page Fields
        clientName: shuma.client_name || '',
        visitDate: shuma.visit_date || '',
        valuationDate: shuma.valuation_date || '',
        referenceNumber: shuma.reference_number || '',
        shamayName: shuma.shamay_name || '',
        shamaySerialNumber: shuma.shamay_serial_number || '',
        
        // Legal Status Fields
        gush: shuma.gush || '',
        parcel: shuma.parcel || '',
        parcelArea: parseFloat(shuma.parcel_area) || 0,
        parcelShape: shuma.parcel_shape || '',
        parcelSurface: shuma.parcel_surface || '',
        subParcel: shuma.sub_parcel || '',
        registeredArea: parseFloat(shuma.registered_area) || 0,
        builtArea: parseFloat(shuma.built_area) || 0,
        balconyArea: parseFloat(shuma.balcony_area) || 0,
        buildingPermitNumber: shuma.building_permit_number || '',
        buildingPermitDate: shuma.building_permit_date || '',
        buildingDescription: shuma.building_description || '',
        buildingFloors: shuma.building_floors || 0,
        buildingUnits: shuma.building_units || 0,
        buildingDetails: shuma.building_details || '',
        constructionSource: shuma.construction_source || '',
        attachments: shuma.attachments || '',
        ownershipRights: shuma.ownership_rights || '',
        notes: shuma.notes || '',
        
        // Registry Information
        registryOffice: shuma.registry_office || '',
        extractDate: shuma.extract_date || '',
        
        // Property Description Fields
        internalLayout: shuma.internal_layout || '',
        finishStandard: shuma.finish_standard || '',
        finishDetails: shuma.finish_details || '',
        
        // Document Uploads
        propertyImages: shuma.property_images || [],
        selectedImageIndex: shuma.selected_image_index || 0,
        selectedImagePreview: shuma.selected_image_preview || null,
        interiorImages: shuma.interior_images || [],
        
        // Signature
        signaturePreview: shuma.signature_preview || null,
        
        // Analysis data
        propertyAnalysis: shuma.property_analysis || {},
        marketAnalysis: shuma.market_analysis || {},
        riskAssessment: shuma.risk_assessment || {},
        recommendations: shuma.recommendations || [],
        
        // Extracted data
        extractedData: shuma.extracted_data || {},
        
        // Calculations
        comparableData: shuma.comparable_data || [],
        finalValuation: parseFloat(shuma.final_valuation) || 0,
        pricePerSqm: parseFloat(shuma.price_per_sqm) || 0,
        
        // Status
        isComplete: shuma.is_complete || false,
        sessionId: shuma.session_id,
        
        // Uploads
        uploads: shuma.uploads || [],
        
        // GIS Screenshots
        gisScreenshots: shuma.gis_screenshots || {},
        
        // Garmushka Measurements
        garmushkaMeasurements: shuma.garmushka_measurements || {}
      }

      return { valuationData, success: true }
    } catch (error) {
      console.error('Error loading shuma for wizard:', error)
      return { error: 'Failed to load shuma' }
    }
  }

  // Save GIS data
  static async saveGISData(sessionId, gisData) {
    try {
      await db.query(`
        UPDATE shuma SET
          gis_screenshots = $1,
          updated_at = NOW()
        WHERE session_id = $2
      `, [JSON.stringify(gisData), sessionId])

      return { success: true }
    } catch (error) {
      console.error('Error saving GIS data:', error)
      return { error: 'Failed to save GIS data' }
    }
  }

  // Save Garmushka data
  static async saveGarmushkaData(sessionId, garmushkaData) {
    try {
      await db.query(`
        UPDATE shuma SET
          garmushka_measurements = $1,
          updated_at = NOW()
        WHERE session_id = $2
      `, [JSON.stringify(garmushkaData), sessionId])

      return { success: true }
    } catch (error) {
      console.error('Error saving Garmushka data:', error)
      return { error: 'Failed to save Garmushka data' }
    }
  }

  // Save final results
  static async saveFinalResults(sessionId, finalValuation, pricePerSqm, comparableData, propertyAnalysis) {
    try {
      await db.query(`
        UPDATE shuma SET
          final_valuation = $1,
          price_per_sqm = $2,
          comparable_data = $3,
          property_analysis = $4,
          status = 'ready',
          is_complete = true,
          updated_at = NOW()
        WHERE session_id = $5
      `, [finalValuation, pricePerSqm, JSON.stringify(comparableData), JSON.stringify(propertyAnalysis), sessionId])

      return { success: true }
    } catch (error) {
      console.error('Error saving final results:', error)
      return { error: 'Failed to save final results' }
    }
  }

  // Get user's shumas
  static async getUserShumas(userId, organizationId) {
    try {
      const result = await db.query(`
        SELECT * FROM shuma 
        WHERE user_id = $1 AND organization_id = $2
        ORDER BY updated_at DESC
      `, [userId, organizationId])

      return { shumas: result.rows, success: true }
    } catch (error) {
      console.error('Error getting user shumas:', error)
      return { error: 'Failed to get shumas' }
    }
  }

  // Get shuma by ID
  static async getShumaById(shumaId, organizationId) {
    try {
      const result = await db.query(`
        SELECT * FROM shuma 
        WHERE id = $1 AND organization_id = $2
      `, [shumaId, organizationId])

      if (result.rows.length === 0) {
        return { error: 'Shuma not found' }
      }

      return { shuma: result.rows[0], success: true }
    } catch (error) {
      console.error('Error getting shuma:', error)
      return { error: 'Failed to get shuma' }
    }
  }

  // Search shumas
  static async searchShumas(organizationId, searchTerm, status) {
    try {
      let query = 'SELECT * FROM shuma WHERE organization_id = $1'
      let params = [organizationId]
      let paramCount = 1

      if (searchTerm) {
        paramCount++
        query += ` AND (client_name ILIKE $${paramCount} OR city ILIKE $${paramCount} OR street ILIKE $${paramCount})`
        params.push(`%${searchTerm}%`)
      }

      if (status && status !== 'all') {
        paramCount++
        query += ` AND status = $${paramCount}`
        params.push(status)
      }

      query += ' ORDER BY updated_at DESC'

      const result = await db.query(query, params)
      return { shumas: result.rows, success: true }
    } catch (error) {
      console.error('Error searching shumas:', error)
      return { error: 'Failed to search shumas' }
    }
  }

  // Complete shuma
  static async completeShuma(sessionId) {
    try {
      await db.query(`
        UPDATE shuma SET
          status = 'signed',
          is_complete = true,
          updated_at = NOW()
        WHERE session_id = $1
      `, [sessionId])

      return { success: true }
    } catch (error) {
      console.error('Error completing shuma:', error)
      return { error: 'Failed to complete shuma' }
    }
  }

  // Archive shuma
  static async archiveShuma(sessionId) {
    try {
      await db.query(`
        UPDATE shuma SET
          status = 'archived',
          updated_at = NOW()
        WHERE session_id = $1
      `, [sessionId])

      return { success: true }
    } catch (error) {
      console.error('Error archiving shuma:', error)
      return { error: 'Failed to archive shuma' }
    }
  }
}

module.exports = { db, ShumaDB }
