/**
 * Enhanced Shuma Database Client
 * Saves data to BOTH:
 * 1. shuma table (for the valuation snapshot)
 * 2. Individual extraction tables (normalized with references)
 */

const { Pool } = require('pg')

// Use DATABASE_URL from environment (Vercel Postgres) or fall back to local config
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'shamay_land_registry',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
      }
)

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

class ShumaDBEnhanced {
  /**
   * Save complete shuma data + create references in extraction tables
   */
  static async saveShumaFromSession(sessionId, organizationId, userId, valuationData) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // 1. Save/Update SHUMA table (main snapshot)
      const shumaResult = await this._saveShumaTable(client, sessionId, organizationId, userId, valuationData)
      const shumaId = shumaResult.shumaId
      
      // 2. Save extracted data to individual tables WITH references
      if (valuationData.extractedData) {
        await this._saveExtractedData(client, shumaId, sessionId, valuationData.extractedData)
      }
      
      // 3. Save Garmushka measurements to garmushka table
      if (valuationData.garmushkaMeasurements) {
        await this._saveGarmushkaData(client, shumaId, sessionId, valuationData.garmushkaMeasurements)
      }
      
      // 4. Save GIS screenshots to images table
      if (valuationData.gisScreenshots) {
        await this._saveGISScreenshots(client, shumaId, sessionId, valuationData.gisScreenshots)
      }
      
      await client.query('COMMIT')
      return { success: true, shumaId }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error in saveShumaFromSession:', error)
      return { error: error.message || 'Failed to save shuma' }
    } finally {
      client.release()
    }
  }

  /**
   * Save to main shuma table
   */
  static async _saveShumaTable(client, sessionId, organizationId, userId, valuationData) {

    // Check if shuma already exists for this session
    const existingShuma = await client.query(
      'SELECT id FROM shuma WHERE session_id = $1',
      [sessionId]
    )

    let shumaId = existingShuma.rows[0]?.id

    if (!shumaId) {
      // Create new shuma
      const result = await client.query(`
        INSERT INTO shuma (
          session_id, organization_id, user_id,
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
          price_per_sqm, is_complete, uploads, gis_analysis, gis_screenshots,
          garmushka_measurements
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61
        ) RETURNING id
      `, [
        sessionId, organizationId, userId,
        valuationData.street, valuationData.buildingNumber, valuationData.city,
        valuationData.neighborhood, valuationData.fullAddress, valuationData.rooms,
        valuationData.floor, valuationData.airDirections, valuationData.area,
        valuationData.propertyEssence, valuationData.clientName, formatDateForDB(valuationData.visitDate),
        formatDateForDB(valuationData.valuationDate), valuationData.referenceNumber, valuationData.shamayName,
        valuationData.shamaySerialNumber, valuationData.gush, valuationData.parcel,
        this._parseNumeric(valuationData.parcelArea), valuationData.parcelShape, valuationData.parcelSurface,
        valuationData.subParcel, this._parseNumeric(valuationData.registeredArea), this._parseNumeric(valuationData.builtArea),
        this._parseNumeric(valuationData.balconyArea), valuationData.buildingPermitNumber, formatDateForDB(valuationData.buildingPermitDate),
        valuationData.buildingDescription, this._parseNumeric(valuationData.buildingFloors), this._parseNumeric(valuationData.buildingUnits),
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
        JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisAnalysis || {}), JSON.stringify(valuationData.gisScreenshots || {}),
        JSON.stringify(valuationData.garmushkaMeasurements || {})
      ])

      shumaId = result.rows[0].id
    } else {
      // Update existing shuma
      await client.query(`
        UPDATE shuma SET
          street = $1, building_number = $2, city = $3, neighborhood = $4,
          full_address = $5, rooms = $6, floor = $7, air_directions = $8, area = $9,
          property_essence = $10, client_name = $11, visit_date = $12, valuation_date = $13,
          reference_number = $14, shamay_name = $15, shamay_serial_number = $16,
          gush = $17, parcel = $18, parcel_area = $19, parcel_shape = $20, parcel_surface = $21,
          sub_parcel = $22, registered_area = $23, built_area = $24, balcony_area = $25,
          building_permit_number = $26, building_permit_date = $27, building_description = $28,
          building_floors = $29, building_units = $30, building_details = $31,
          construction_source = $32, attachments = $33, ownership_rights = $34, notes = $35,
          registry_office = $36, extract_date = $37, internal_layout = $38, finish_standard = $39,
          finish_details = $40, property_images = $41, selected_image_index = $42,
          selected_image_preview = $43, interior_images = $44, signature_preview = $45,
          property_analysis = $46, market_analysis = $47, risk_assessment = $48,
          recommendations = $49, extracted_data = $50, comparable_data = $51,
          final_valuation = $52, price_per_sqm = $53, is_complete = $54, uploads = $55,
          gis_analysis = $56, gis_screenshots = $57, garmushka_measurements = $58, updated_at = NOW()
        WHERE id = $59
      `, [
        valuationData.street, valuationData.buildingNumber,
        valuationData.city, valuationData.neighborhood, valuationData.fullAddress, valuationData.rooms,
        valuationData.floor, valuationData.airDirections, valuationData.area, valuationData.propertyEssence,
        valuationData.clientName, formatDateForDB(valuationData.visitDate), formatDateForDB(valuationData.valuationDate), valuationData.referenceNumber,
        valuationData.shamayName, valuationData.shamaySerialNumber, valuationData.gush, valuationData.parcel,
        this._parseNumeric(valuationData.parcelArea), valuationData.parcelShape, valuationData.parcelSurface, valuationData.subParcel,
        this._parseNumeric(valuationData.registeredArea), this._parseNumeric(valuationData.builtArea), this._parseNumeric(valuationData.balconyArea), valuationData.buildingPermitNumber,
        formatDateForDB(valuationData.buildingPermitDate), valuationData.buildingDescription, this._parseNumeric(valuationData.buildingFloors),
        this._parseNumeric(valuationData.buildingUnits), valuationData.buildingDetails, valuationData.constructionSource,
        valuationData.attachments, valuationData.ownershipRights, valuationData.notes, valuationData.registryOffice,
        formatDateForDB(valuationData.extractDate), valuationData.internalLayout, valuationData.finishStandard, valuationData.finishDetails,
        JSON.stringify(valuationData.propertyImages || []), valuationData.selectedImageIndex, valuationData.selectedImagePreview,
        JSON.stringify(valuationData.interiorImages || []), valuationData.signaturePreview, JSON.stringify(valuationData.propertyAnalysis || {}),
        JSON.stringify(valuationData.marketAnalysis || {}), JSON.stringify(valuationData.riskAssessment || {}),
        JSON.stringify(valuationData.recommendations || []), JSON.stringify(valuationData.extractedData || {}),
        JSON.stringify(valuationData.comparableData || []), valuationData.finalValuation || null, valuationData.pricePerSqm || null,
        valuationData.isComplete || false, JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisAnalysis || {}), JSON.stringify(valuationData.gisScreenshots || {}),
        JSON.stringify(valuationData.garmushkaMeasurements || {}), shumaId
      ])
    }

    return { shumaId }
  }

  /**
   * Save extracted data to relevant extraction tables
   */
  static async _saveExtractedData(client, shumaId, sessionId, extractedData) {
    // Save to land_registry_extracts if we have land registry data
    if (extractedData.gush || extractedData.parcel || extractedData.owners) {
      await client.query(`
        INSERT INTO land_registry_extracts (
          shuma_id, session_id,
          gush, gush_confidence,
          parcel, parcel_confidence,
          sub_parcel, sub_parcel_confidence,
          registered_area, registered_area_confidence,
          registration_office, registration_office_confidence,
          ownership_type, ownership_type_confidence,
          attachments, attachments_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT DO NOTHING
      `, [
        shumaId, sessionId,
        this._truncateString(extractedData.gush, 50),
        this._validateConfidence(extractedData.gushConfidence, 0.95),
        this._truncateString(extractedData.parcel, 50),
        this._validateConfidence(extractedData.parcelConfidence, 0.95),
        this._truncateString(extractedData.subParcel, 50),
        this._validateConfidence(extractedData.subParcelConfidence, 0.95),
        this._parseNumeric(extractedData.registeredArea),
        this._validateConfidence(extractedData.registeredAreaConfidence, 0.95),
        this._truncateString(extractedData.registrationOffice, 255),
        this._validateConfidence(extractedData.registrationOfficeConfidence, 0.95),
        this._truncateString(extractedData.ownershipType, 255),
        this._validateConfidence(extractedData.ownershipTypeConfidence, 0.95),
        extractedData.attachments || null, // TEXT field, no truncation needed
        this._validateConfidence(extractedData.attachmentsConfidence, 0.95)
      ])
    }

    // Save to building_permit_extracts if we have permit data
    if (extractedData.buildingPermitNumber || extractedData.buildingPermitDate) {
      await client.query(`
        INSERT INTO building_permit_extracts (
          shuma_id, session_id,
          permit_number, permit_number_confidence,
          permit_date, permit_date_confidence,
          permitted_use, permitted_use_confidence,
          building_description, building_description_confidence,
          pdf_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        shumaId,
        sessionId,
        this._truncateString(extractedData.buildingPermitNumber, 255),
        this._validateConfidence(extractedData.buildingPermitNumberConfidence, 0.95),
        formatDateForDB(extractedData.buildingPermitDate) || null,
        this._validateConfidence(extractedData.buildingPermitDateConfidence, 0.95),
        this._truncateString(extractedData.permittedUse, 255),
        this._validateConfidence(extractedData.permittedUseConfidence, 0.95),
        extractedData.buildingDescription || null, // TEXT field, no truncation needed
        this._validateConfidence(extractedData.buildingDescriptionConfidence, 0.95),
        null
      ])
    }

    // Save to shared_building_order if we have shared building data
    if (extractedData.buildingDescription || extractedData.buildingFloors) {
      await client.query(`
        INSERT INTO shared_building_order (
          shuma_id, session_id,
          building_description, building_description_confidence,
          number_of_floors, number_of_floors_confidence,
          number_of_units, number_of_units_confidence,
          common_areas, common_areas_confidence,
          pdf_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        shumaId,
        sessionId,
        extractedData.buildingDescription || null,
        this._validateConfidence(extractedData.buildingDescriptionConfidence, 0.95),
        this._parseNumeric(extractedData.buildingFloors || extractedData.numberOfFloors),
        this._validateConfidence(extractedData.buildingFloorsConfidence || extractedData.numberOfFloorsConfidence, 0.95),
        this._parseNumeric(extractedData.buildingUnits || extractedData.numberOfUnits),
        this._validateConfidence(extractedData.buildingUnitsConfidence || extractedData.numberOfUnitsConfidence, 0.95),
        extractedData.commonAreas || null,
        this._validateConfidence(extractedData.commonAreasConfidence, 0.95),
        null
      ])
    }
  }

  /**
   * Validate confidence values to prevent NaN errors
   */
  static _validateConfidence(value, defaultValue) {
    if (value === null || value === undefined || isNaN(value) || value === 'NaN') {
      return defaultValue
    }
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      return defaultValue
    }
    return Math.max(0, Math.min(1, numValue)) // Clamp between 0 and 1
  }

  /**
   * Truncate string to fit in varchar field
   */
  static _truncateString(value, maxLength = 255) {
    if (!value) return null
    const str = String(value)
    return str.length > maxLength ? str.substring(0, maxLength) : str
  }

  /**
   * Parse numeric value, returning null if invalid (e.g., "לא נמצא", "not found", etc.)
   */
  static _parseNumeric(value) {
    if (value === null || value === undefined || value === '') return null
    
    // Convert to string to check
    const str = String(value).trim()
    
    // If it contains Hebrew or common "not found" phrases, return null
    if (
      str.includes('לא נמצא') || 
      str.includes('not found') || 
      str.includes('N/A') ||
      str.includes('n/a') ||
      str === '-' ||
      str === ''
    ) {
      return null
    }
    
    // Try to parse as number
    const num = parseFloat(str)
    
    // If it's NaN or infinite, return null
    if (isNaN(num) || !isFinite(num)) {
      return null
    }
    
    return num
  }

  /**
   * Save Garmushka measurements to garmushka table + shuma
   */
  static async _saveGarmushkaData(client, shumaId, sessionId, garmushkaData) {
    if (!garmushkaData.measurementTable || garmushkaData.measurementTable.length === 0) {
      return
    }

    // Save to garmushka table
    const result = await client.query(`
      INSERT INTO garmushka (
        file_name,
        measurement_table,
        meters_per_pixel,
        unit_mode,
        is_calibrated,
        png_export,
        shuma_id,
        session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      this._truncateString(garmushkaData.fileName || 'measurement.pdf', 255),
      JSON.stringify(garmushkaData.measurementTable || []),
      garmushkaData.metersPerPixel || null,
      this._truncateString(garmushkaData.unitMode || 'metric', 20),
      garmushkaData.isCalibrated || false,
      garmushkaData.pngExport || null, // TEXT field for base64
      shumaId,
      sessionId
    ])

    const garmushkaId = result.rows[0].id

    // Update shuma with reference to garmushka record
    await client.query(`
      UPDATE shuma SET
        garmushka_measurements = jsonb_set(
          COALESCE(garmushka_measurements, '{}'::jsonb),
          '{garmushkaId}',
          to_jsonb($1::integer)
        )
      WHERE id = $2
    `, [garmushkaId, shumaId])
  }

  /**
   * Save GIS screenshots to images table + shuma
   */
  static async _saveGISScreenshots(client, shumaId, sessionId, gisScreenshots) {
    if (!gisScreenshots.cropMode0 && !gisScreenshots.cropMode1) {
      return
    }

    const imagesToSave = []
    
    if (gisScreenshots.cropMode0) {
      imagesToSave.push({
        type: 'סקרין שוט GOVMAP',
        filename: `gis-screenshot-clean-${sessionId}.png`,
        data: gisScreenshots.cropMode0
      })
    }
    
    if (gisScreenshots.cropMode1) {
      imagesToSave.push({
        type: 'סקרין שוט תצ״א',
        filename: `gis-screenshot-taba-${sessionId}.png`,
        data: gisScreenshots.cropMode1
      })
    }

    for (const img of imagesToSave) {
      await client.query(`
        INSERT INTO images (
          shuma_id,
          session_id,
          image_type,
          image_data,
          image_url,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        shumaId,
        sessionId,
        this._truncateString(img.type || 'gis_screenshot', 50),
        img.data || null, // TEXT field for base64
        img.url || `/uploads/${sessionId}/${img.filename || 'screenshot.png'}`, // TEXT field for URLs
        JSON.stringify({
          filename: img.filename,
          mapType: img.mapType,
          timestamp: new Date().toISOString()
        })
      ])
    }
  }

  /**
   * Load shuma data for wizard
   */
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
        propertyImages: typeof shuma.property_images === 'string' ? JSON.parse(shuma.property_images) : (shuma.property_images || []),
        selectedImageIndex: shuma.selected_image_index || 0,
        selectedImagePreview: shuma.selected_image_preview || null,
        interiorImages: typeof shuma.interior_images === 'string' ? JSON.parse(shuma.interior_images) : (shuma.interior_images || []),
        
        // Signature
        signaturePreview: shuma.signature_preview || null,
        
        // Analysis data
        propertyAnalysis: typeof shuma.property_analysis === 'string' ? JSON.parse(shuma.property_analysis) : (shuma.property_analysis || {}),
        marketAnalysis: typeof shuma.market_analysis === 'string' ? JSON.parse(shuma.market_analysis) : (shuma.market_analysis || {}),
        riskAssessment: typeof shuma.risk_assessment === 'string' ? JSON.parse(shuma.risk_assessment) : (shuma.risk_assessment || {}),
        recommendations: typeof shuma.recommendations === 'string' ? JSON.parse(shuma.recommendations) : (shuma.recommendations || []),
        
        // Extracted data
        extractedData: typeof shuma.extracted_data === 'string' ? JSON.parse(shuma.extracted_data) : (shuma.extracted_data || {}),
        
        // Calculations
        comparableData: typeof shuma.comparable_data === 'string' ? JSON.parse(shuma.comparable_data) : (shuma.comparable_data || []),
        finalValuation: parseFloat(shuma.final_valuation) || 0,
        pricePerSqm: parseFloat(shuma.price_per_sqm) || 0,
        
        // Status
        isComplete: shuma.is_complete || false,
        sessionId: shuma.session_id,
        
        // Uploads
        uploads: typeof shuma.uploads === 'string' ? JSON.parse(shuma.uploads) : (shuma.uploads || []),
        
        // GIS Analysis
        gisAnalysis: typeof shuma.gis_analysis === 'string' ? JSON.parse(shuma.gis_analysis) : (shuma.gis_analysis || {}),
        
        // GIS Screenshots
        gisScreenshots: typeof shuma.gis_screenshots === 'string' ? JSON.parse(shuma.gis_screenshots) : (shuma.gis_screenshots || {}),
        
        // Garmushka Measurements
        garmushkaMeasurements: typeof shuma.garmushka_measurements === 'string' ? JSON.parse(shuma.garmushka_measurements) : (shuma.garmushka_measurements || {})
      }

      return { valuationData, success: true }
    } catch (error) {
      console.error('Error loading shuma for wizard:', error)
      return { error: 'Failed to load shuma' }
    }
  }

  /**
   * Save GIS data to shuma + images table
   * Merges with existing screenshots to avoid overwriting
   */
  static async saveGISData(sessionId, gisData) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma ID and existing screenshots
      const shumaResult = await client.query('SELECT id, gis_screenshots FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        throw new Error('Shuma not found for session')
      }
      const shumaId = shumaResult.rows[0].id
      const existingScreenshots = typeof shumaResult.rows[0].gis_screenshots === 'string' 
        ? JSON.parse(shumaResult.rows[0].gis_screenshots) 
        : (shumaResult.rows[0].gis_screenshots || {})
      
      // Merge new data with existing screenshots
      const mergedScreenshots = {
        ...existingScreenshots,
        ...gisData
      }
      
      console.log('📸 GIS Data Save:', {
        sessionId,
        existing: existingScreenshots,
        new: gisData,
        merged: mergedScreenshots
      })
      
      // Update shuma table with merged data
      await client.query(`
        UPDATE shuma SET
          gis_screenshots = $1,
          updated_at = NOW()
        WHERE session_id = $2
      `, [JSON.stringify(mergedScreenshots), sessionId])
      
      // Save to images table
      await this._saveGISScreenshots(client, shumaId, sessionId, mergedScreenshots)
      
      await client.query('COMMIT')
      return { success: true }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error saving GIS data:', error)
      return { error: error.message || 'Failed to save GIS data' }
    } finally {
      client.release()
    }
  }

  /**
   * Save Garmushka data to shuma + garmushka table
   */
  static async saveGarmushkaData(sessionId, garmushkaData) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma ID
      const shumaResult = await client.query('SELECT id FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        throw new Error('Shuma not found for session')
      }
      const shumaId = shumaResult.rows[0].id
      
      // Update shuma table
      await client.query(`
        UPDATE shuma SET
          garmushka_measurements = $1,
          updated_at = NOW()
        WHERE session_id = $2
      `, [JSON.stringify(garmushkaData), sessionId])
      
      // Save to garmushka table
      await this._saveGarmushkaData(client, shumaId, sessionId, garmushkaData)
      
      await client.query('COMMIT')
      return { success: true }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error saving Garmushka data:', error)
      return { error: error.message || 'Failed to save Garmushka data' }
    } finally {
      client.release()
    }
  }

  /**
   * Save building permit data to building_permit_extracts table
   */
  static async savePermitExtraction(sessionId, permitData, documentFilename) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma ID
      const shumaResult = await client.query('SELECT id FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        throw new Error('Shuma not found for session')
      }
      const shumaId = shumaResult.rows[0].id
      
      // Insert into building_permit_extracts
      const result = await client.query(`
        INSERT INTO building_permit_extracts (
          shuma_id, session_id,
          permit_number, permit_number_confidence,
          permit_date, permit_date_confidence,
          permitted_use, permitted_use_confidence,
          building_description, building_description_confidence,
          pdf_path,
          processing_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        shumaId,
        sessionId,
        this._truncateString(permitData.permitNumber, 255),
        this._validateConfidence(permitData.permitNumberConfidence, 0.95),
        formatDateForDB(permitData.permitDate),
        this._validateConfidence(permitData.permitDateConfidence, 0.95),
        this._truncateString(permitData.permittedUsage || permitData.permittedUse, 255),
        this._validateConfidence(permitData.permittedUsageConfidence || permitData.permittedUseConfidence, 0.95),
        permitData.buildingDescription, // TEXT field, no truncation needed
        this._validateConfidence(permitData.buildingDescriptionConfidence, 0.95),
        documentFilename, // Can be TEXT if path is long
        this._truncateString(permitData.processingMethod || 'openai', 50)
      ])
      
      const permitId = result.rows[0].id
      
      // Update shuma with extracted permit data AND reference
      await client.query(`
        UPDATE shuma SET
          building_permit_number = $1,
          building_permit_date = $2,
          extracted_data = jsonb_set(
            COALESCE(extracted_data, '{}'::jsonb),
            '{buildingPermitId}',
            to_jsonb($3::integer)
          ),
          updated_at = NOW()
        WHERE id = $4
      `, [permitData.permitNumber, formatDateForDB(permitData.permitDate), permitId, shumaId])
      
      await client.query('COMMIT')
      return { success: true, permitId }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error saving permit extraction:', error)
      return { error: error.message || 'Failed to save permit extraction' }
    } finally {
      client.release()
    }
  }

  /**
   * Save land registry data to land_registry_extracts table
   */
  static async saveLandRegistryExtraction(sessionId, landRegistryData, documentFilename) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma ID
      const shumaResult = await client.query('SELECT id FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        throw new Error('Shuma not found for session')
      }
      const shumaId = shumaResult.rows[0].id
      
      // Insert into land_registry_extracts
      const result = await client.query(`
        INSERT INTO land_registry_extracts (
          shuma_id, session_id, pdf_path,
          gush, gush_confidence,
          parcel, parcel_confidence,
          sub_parcel, sub_parcel_confidence,
          registered_area, registered_area_confidence,
          registration_office, registration_office_confidence,
          ownership_type, ownership_type_confidence,
          attachments, attachments_confidence,
          raw_extraction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id
      `, [
        shumaId, sessionId, documentFilename,
        landRegistryData.gush || null, this._validateConfidence(landRegistryData.gushConfidence, 0.95),
        landRegistryData.parcel || null, this._validateConfidence(landRegistryData.parcelConfidence, 0.95),
        landRegistryData.subParcel || null, this._validateConfidence(landRegistryData.subParcelConfidence, 0.95),
        landRegistryData.registeredArea || null, this._validateConfidence(landRegistryData.registeredAreaConfidence, 0.95),
        landRegistryData.registrationOffice || null, this._validateConfidence(landRegistryData.registrationOfficeConfidence, 0.95),
        landRegistryData.ownershipType || null, this._validateConfidence(landRegistryData.ownershipTypeConfidence, 0.95),
        landRegistryData.attachments || null, this._validateConfidence(landRegistryData.attachmentsConfidence, 0.95),
        JSON.stringify(landRegistryData)
      ])
      
      const landRegistryId = result.rows[0].id
      
      // Update shuma with extracted data AND reference
      await client.query(`
        UPDATE shuma SET
          gush = $1,
          parcel = $2,
          sub_parcel = $3,
          registered_area = $4,
          extracted_data = jsonb_set(
            COALESCE(extracted_data, '{}'::jsonb),
            '{landRegistryId}',
            to_jsonb($5::integer)
          ),
          updated_at = NOW()
        WHERE id = $6
      `, [
        landRegistryData.gush,
        landRegistryData.parcel,
        landRegistryData.subParcel,
        landRegistryData.registeredArea,
        landRegistryId,
        shumaId
      ])
      
      await client.query('COMMIT')
      return { success: true, landRegistryId }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error saving land registry extraction:', error)
      return { error: error.message || 'Failed to save land registry extraction' }
    } finally {
      client.release()
    }
  }

  /**
   * Save shared building order data to shared_building_order table
   */
  static async saveSharedBuildingExtraction(sessionId, sharedBuildingData, documentFilename) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma ID
      const shumaResult = await client.query('SELECT id FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        throw new Error('Shuma not found for session')
      }
      const shumaId = shumaResult.rows[0].id
      
      // Insert into shared_building_order
      const result = await client.query(`
        INSERT INTO shared_building_order (
          filename,
          order_issue_date, order_issue_date_confidence,
          building_description, building_description_confidence, building_description_context,
          building_floors, building_floors_confidence, building_floors_context,
          building_sub_plots_count, building_sub_plots_count_confidence, building_sub_plots_count_context,
          building_address, building_address_confidence, building_address_context,
          total_sub_plots, total_sub_plots_confidence, total_sub_plots_context,
          sub_plots,
          buildings_info,
          overall_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `, [
        documentFilename,
        formatDateForDB(sharedBuildingData.orderIssueDate), this._validateConfidence(sharedBuildingData.orderIssueDateConfidence, 0.95),
        sharedBuildingData.buildingDescription, this._validateConfidence(sharedBuildingData.buildingDescriptionConfidence, 0.95), sharedBuildingData.buildingDescriptionContext || '',
        sharedBuildingData.buildingFloors, this._validateConfidence(sharedBuildingData.buildingFloorsConfidence, 0.95), sharedBuildingData.buildingFloorsContext || '',
        sharedBuildingData.buildingSubPlotsCount, this._validateConfidence(sharedBuildingData.buildingSubPlotsCountConfidence, 0.95), sharedBuildingData.buildingSubPlotsCountContext || '',
        sharedBuildingData.buildingAddress, this._validateConfidence(sharedBuildingData.buildingAddressConfidence, 0.95), sharedBuildingData.buildingAddressContext || '',
        sharedBuildingData.totalSubPlots, this._validateConfidence(sharedBuildingData.totalSubPlotsConfidence, 0.95), sharedBuildingData.totalSubPlotsContext || '',
        JSON.stringify(sharedBuildingData.subPlots || []),
        JSON.stringify(sharedBuildingData.buildingsInfo || []),
        this._validateConfidence(sharedBuildingData.overallConfidence, 0.90)
      ])
      
      const sharedBuildingId = result.rows[0].id
      
      // Update shuma with extracted data AND reference
      await client.query(`
        UPDATE shuma SET
          building_description = $1,
          building_floors = $2,
          building_units = $3,
          extracted_data = jsonb_set(
            COALESCE(extracted_data, '{}'::jsonb),
            '{sharedBuildingId}',
            to_jsonb($4::integer)
          ),
          updated_at = NOW()
        WHERE id = $5
      `, [
        sharedBuildingData.buildingDescription,
        sharedBuildingData.buildingFloors,
        sharedBuildingData.totalSubPlots,
        sharedBuildingId,
        shumaId
      ])
      
      await client.query('COMMIT')
      return { success: true, sharedBuildingId }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error saving shared building extraction:', error)
      return { error: error.message || 'Failed to save shared building extraction' }
    } finally {
      client.release()
    }
  }

  /**
   * Get all extracted data for a session (from all tables)
   */
  static async getAllExtractedData(sessionId) {
    try {
      // Get shuma
      const shumaResult = await db.query('SELECT id, extracted_data FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        return { error: 'Shuma not found' }
      }
      
      const shuma = shumaResult.rows[0]
      const extractedDataRefs = shuma.extracted_data || {}
      
      // Get related extractions
      const allData = {
        landRegistry: null,
        buildingPermit: null,
        sharedBuilding: null,
        garmushka: null
      }
      
      // Load land registry if reference exists
      if (extractedDataRefs.landRegistryId) {
        const result = await db.query('SELECT * FROM land_registry_extracts WHERE id = $1', [extractedDataRefs.landRegistryId])
        allData.landRegistry = result.rows[0] || null
      }
      
      // Load building permit if reference exists
      if (extractedDataRefs.buildingPermitId) {
        const result = await db.query('SELECT * FROM building_permit_extracts WHERE id = $1', [extractedDataRefs.buildingPermitId])
        allData.buildingPermit = result.rows[0] || null
      }
      
      // Load shared building if reference exists
      if (extractedDataRefs.sharedBuildingId) {
        const result = await db.query('SELECT * FROM shared_building_order WHERE id = $1', [extractedDataRefs.sharedBuildingId])
        allData.sharedBuilding = result.rows[0] || null
      }
      
      // Load garmushka if reference exists
      if (extractedDataRefs.garmushkaId) {
        const result = await db.query('SELECT * FROM garmushka WHERE id = $1', [extractedDataRefs.garmushkaId])
        allData.garmushka = result.rows[0] || null
      }
      
      return { success: true, data: allData }
      
    } catch (error) {
      console.error('Error getting all extracted data:', error)
      return { error: error.message || 'Failed to get extracted data' }
    }
  }

  /**
   * Search shumas by organization, search term, and status
   */
  static async searchShumas(organizationId, search, status) {
    const client = await pool.connect()

    try {

      let query = `
        SELECT 
          id,
          session_id,
          street,
          building_number,
          city,
          neighborhood,
          full_address,
          rooms,
          floor,
          area,
          property_essence,
          client_name,
          visit_date,
          valuation_date,
          gush,
          parcel,
          is_complete,
          created_at,
          updated_at
        FROM shuma 
        WHERE organization_id = $1
      `
      const params = [organizationId]
      let paramIndex = 2

      if (search) {
        query += ` AND (
          full_address ILIKE $${paramIndex} OR 
          client_name ILIKE $${paramIndex} OR
          street ILIKE $${paramIndex} OR
          city ILIKE $${paramIndex}
        )`
        params.push(`%${search}%`)
        paramIndex++
      }

      if (status) {
        if (status === 'complete') {
          query += ` AND is_complete = true`
        } else if (status === 'draft') {
          query += ` AND is_complete = false`
        }
      }

      query += ` ORDER BY updated_at DESC`

      const result = await client.query(query, params)

      return {
        success: true,
        shumas: result.rows.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          address: row.full_address || `${row.street} ${row.building_number}, ${row.city}`,
          clientName: row.client_name,
          rooms: row.rooms,
          area: row.area,
          isComplete: row.is_complete,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      }
    } catch (error) {
      console.error('Error searching shumas:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }

  /**
   * Get a single shuma by ID
   */
  static async getShumaById(shumaId) {
    const client = await pool.connect()

    try {
      const result = await client.query(`
        SELECT 
          id,
          session_id,
          street,
          building_number,
          city,
          neighborhood,
          full_address,
          rooms,
          floor,
          area,
          property_essence,
          client_name,
          visit_date,
          valuation_date,
          gush,
          parcel,
          is_complete,
          created_at,
          updated_at,
          uploads,
          gis_screenshots,
          garmushka_measurements
        FROM shuma 
        WHERE id = $1
      `, [shumaId])

      if (result.rows.length === 0) {
        return { success: false, error: 'Shuma not found' }
      }

      const row = result.rows[0]
      return {
        success: true,
        shuma: {
          id: row.id,
          sessionId: row.session_id,
          address: row.full_address || `${row.street} ${row.building_number}, ${row.city}`,
          clientName: row.client_name,
          rooms: row.rooms,
          area: row.area,
          isComplete: row.is_complete,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          uploads: row.uploads || [],
          gisScreenshots: row.gis_screenshots || {},
          garmushkaMeasurements: row.garmushka_measurements || {}
        }
      }
    } catch (error) {
      console.error('Error getting shuma by ID:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }

  /**
   * Save AI extraction result (original, unmodified data)
   */
  static async saveAIExtraction(sessionId, extractionType, aiResponse, extractedFields, metadata = {}) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma_id if it exists
      const shumaResult = await client.query(
        'SELECT id FROM shuma WHERE session_id = $1',
        [sessionId]
      )
      const shumaId = shumaResult.rows[0]?.id || null
      
      // Insert AI extraction
      const result = await client.query(`
        INSERT INTO ai_extractions (
          shuma_id, session_id, extraction_type,
          raw_ai_response, extracted_fields,
          ai_model, processing_cost, confidence_score, processing_time_ms,
          document_filename, document_path,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        shumaId,
        sessionId,
        extractionType,
        JSON.stringify(aiResponse),
        JSON.stringify(extractedFields),
        metadata.aiModel || 'gpt-4-vision-preview',
        metadata.processingCost || null,
        metadata.confidenceScore || null,
        metadata.processingTimeMs || null,
        metadata.documentFilename || null,
        metadata.documentPath || null,
        true // is_active by default
      ])
      
      await client.query('COMMIT')
      
      return { 
        success: true, 
        extractionId: result.rows[0].id 
      }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error saving AI extraction:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }

  /**
   * Get all AI extractions for a session
   */
  static async getAIExtractions(sessionId, extractionType = null) {
    const client = await db.client()
    
    try {
      let query = `
        SELECT * FROM ai_extractions 
        WHERE session_id = $1
      `
      const params = [sessionId]
      
      if (extractionType) {
        query += ` AND extraction_type = $2`
        params.push(extractionType)
      }
      
      query += ` ORDER BY extraction_date DESC`
      
      const result = await client.query(query, params)
      
      // Parse JSONB fields
      const extractions = result.rows.map(row => ({
        ...row,
        raw_ai_response: typeof row.raw_ai_response === 'string' 
          ? JSON.parse(row.raw_ai_response) 
          : row.raw_ai_response,
        extracted_fields: typeof row.extracted_fields === 'string' 
          ? JSON.parse(row.extracted_fields) 
          : row.extracted_fields
      }))
      
      return { 
        success: true, 
        extractions 
      }
    } catch (error) {
      console.error('Error getting AI extractions:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }

  /**
   * Get the most recent active AI extraction for a type
   */
  static async getLatestAIExtraction(sessionId, extractionType) {
    const client = await db.client()
    
    try {
      const result = await client.query(`
        SELECT * FROM ai_extractions 
        WHERE session_id = $1 
          AND extraction_type = $2 
          AND is_active = true
        ORDER BY extraction_date DESC
        LIMIT 1
      `, [sessionId, extractionType])
      
      if (result.rows.length === 0) {
        return { success: true, extraction: null }
      }
      
      const extraction = {
        ...result.rows[0],
        raw_ai_response: typeof result.rows[0].raw_ai_response === 'string' 
          ? JSON.parse(result.rows[0].raw_ai_response) 
          : result.rows[0].raw_ai_response,
        extracted_fields: typeof result.rows[0].extracted_fields === 'string' 
          ? JSON.parse(result.rows[0].extracted_fields) 
          : result.rows[0].extracted_fields
      }
      
      return { 
        success: true, 
        extraction 
      }
    } catch (error) {
      console.error('Error getting latest AI extraction:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }

  /**
   * Mark AI extraction as inactive (user has overridden)
   */
  static async deactivateAIExtraction(extractionId) {
    const client = await db.client()
    
    try {
      await client.query(`
        UPDATE ai_extractions 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [extractionId])
      
      return { success: true }
    } catch (error) {
      console.error('Error deactivating AI extraction:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }

  /**
   * Restore AI extraction (revert user edits)
   */
  static async restoreAIExtraction(sessionId, extractionId) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get the AI extraction
      const extractionResult = await client.query(
        'SELECT * FROM ai_extractions WHERE id = $1 AND session_id = $2',
        [extractionId, sessionId]
      )
      
      if (extractionResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return { success: false, error: 'AI extraction not found' }
      }
      
      const extraction = extractionResult.rows[0]
      const extractedFields = typeof extraction.extracted_fields === 'string' 
        ? JSON.parse(extraction.extracted_fields) 
        : extraction.extracted_fields
      
      // Load current shuma data
      const loadResult = await this.loadShumaForWizard(sessionId)
      if (!loadResult.success || !loadResult.valuationData) {
        await client.query('ROLLBACK')
        return { success: false, error: 'Session not found' }
      }
      
      // Merge AI extracted fields back into extractedData
      const updatedExtractedData = {
        ...loadResult.valuationData.extractedData,
        ...extractedFields
      }
      
      // Save to shuma
      await this.saveShumaFromSession(
        sessionId,
        loadResult.valuationData.organizationId || 'default-org',
        loadResult.valuationData.userId || 'system',
        {
          ...loadResult.valuationData,
          extractedData: updatedExtractedData
        }
      )
      
      // Reactivate this extraction
      await client.query(`
        UPDATE ai_extractions 
        SET is_active = true, updated_at = NOW()
        WHERE id = $1
      `, [extractionId])
      
      await client.query('COMMIT')
      
      return { 
        success: true, 
        restoredFields: extractedFields 
      }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error restoring AI extraction:', error)
      return { success: false, error: error.message }
    } finally {
      client.release()
    }
  }
}

module.exports = { db, ShumaDB: ShumaDBEnhanced, formatDateForDB }

