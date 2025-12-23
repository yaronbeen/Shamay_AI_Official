/**
 * Enhanced Shuma Database Client
 * Saves data to BOTH:
 * 1. shuma table (for the valuation snapshot)
 * 2. Individual extraction tables (normalized with references)
 * 
 * Uses Neon serverless driver for Vercel deployment
 */

const crypto = require('crypto')

// Import based on environment
let Pool, neonConfig
try {
  // Try to import Neon serverless (for production/Vercel)
  const neonModule = require('@neondatabase/serverless')
  neonConfig = neonModule.neonConfig
  Pool = neonModule.Pool
  console.log('✅ Using @neondatabase/serverless')
} catch (e) {
  // Fallback to pg for local development
  const pg = require('pg')
  Pool = pg.Pool
  console.log('✅ Using pg (local development)')
}

// Lazy pool initialization - only create when first used
let pool = null

function getDatabaseConfig() {
  const DATABASE_URL = process.env.DATABASE_URL
  const POSTGRES_URL = process.env.POSTGRES_URL
  const POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL_NON_POOLING
  
  console.log('🔍 DB Config: Checking environment variables...')
  console.log('🔍 DATABASE_URL:', DATABASE_URL ? 'SET ✅' : 'NOT SET ❌')
  console.log('🔍 POSTGRES_URL:', POSTGRES_URL ? 'SET ✅' : 'NOT SET ❌')
  console.log('🔍 POSTGRES_URL_NON_POOLING:', POSTGRES_URL_NON_POOLING ? 'SET ✅' : 'NOT SET ❌')
  console.log('🔍 VERCEL:', process.env.VERCEL ? 'YES' : 'NO')
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
  
  // Prefer DATABASE_URL, then POSTGRES_URL, then POSTGRES_URL_NON_POOLING, then fallback to local
  const connectionString = DATABASE_URL || POSTGRES_URL || POSTGRES_URL_NON_POOLING
  
  if (connectionString) {
    console.log('✅ Using connection string from env:', connectionString.substring(0, 20) + '...')
    return {
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  }
  
  console.log('⚠️ No connection string found, using fallback local config')
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shamay_land_registry',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  }
}

function getPool() {
  if (!pool) {
    console.log('🔍 ShumaDB: Initializing connection pool...')
    
    if (!Pool) {
      console.error('❌ Pool constructor is not available!')
      throw new Error('Database Pool is not initialized. Make sure pg or @neondatabase/serverless is installed.')
    }
    
    const config = getDatabaseConfig()
    console.log('🔍 ShumaDB: Creating pool with config:', {
      hasConnectionString: !!config.connectionString,
      host: config.host,
      database: config.database
    })
    
    // Use Neon serverless in production
    if (process.env.VERCEL && neonConfig) {
      console.log('🚀 Configuring Neon for WebSocket (Vercel)')
      neonConfig.fetchConnectionCache = true
    }
    
    try {
      pool = new Pool(config)
      console.log('✅ Pool created successfully')
      
      // Test the connection
      pool.on('error', (err) => {
        console.error('❌ Unexpected pool error:', err)
      })
      
    } catch (error) {
      console.error('❌ Failed to create pool:', error)
      throw error
    }
  }
  return pool
}

const db = {
  query: async (text, params) => {
    console.log('🔍 db.query called with:', text.substring(0, 50) + '...')
    
    // ALWAYS use Pool for parameterized queries (Neon sql client doesn't support $1, $2 syntax well)
    // The Neon sql client is best for tagged templates, which we're not using
    const poolInstance = getPool()
    if (!poolInstance) {
      throw new Error('Database pool is not initialized')
    }
    return poolInstance.query(text, params)
  },
  client: async () => {
    console.log('🔍 db.client called')
    const poolInstance = getPool()
    if (!poolInstance) {
      throw new Error('Database pool is not initialized')
    }
    console.log('🔍 Connecting to pool...')
    try {
      const client = await poolInstance.connect()
      console.log('✅ Pool client connected')
      return client
    } catch (error) {
      console.error('❌ Failed to get pool client:', error)
      throw error
    }
  },
  end: () => {
    const poolInstance = getPool()
    if (poolInstance) {
      return poolInstance.end()
    }
  }
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
    // Debug: Check what we're about to save
    console.log('🔍 _saveShumaTable - About to save:', {
      clientTitle: valuationData.clientTitle,
      clientTitleType: typeof valuationData.clientTitle,
      clientTitleIn: 'clientTitle' in valuationData,
      valuationType: valuationData.valuationType,
      valuationTypeType: typeof valuationData.valuationType,
      valuationTypeIn: 'valuationType' in valuationData
    })

    // Check if shuma already exists for this session
    const existingShuma = await client.query(
      'SELECT * FROM shuma WHERE session_id = $1',
      [sessionId]
    )

    let shumaId = existingShuma.rows[0]?.id

    if (!shumaId) {
      // Create new shuma - use defaults for missing fields
      const result = await client.query(`
        INSERT INTO shuma (
          session_id, organization_id, user_id,
          street, building_number, city, neighborhood, full_address,
          rooms, floor, air_directions, area, property_essence,
          client_name, client_title, client_note, client_relation,
          visit_date, valuation_date, valuation_type, valuation_effective_date,
          reference_number,
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
          garmushka_measurements, land_contamination, land_contamination_note
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62,
          $63, $64, $65, $66, $67
        ) RETURNING id
      `, [
        sessionId, organizationId, userId,
        valuationData.street || '', valuationData.buildingNumber || '', String(valuationData.city || ''),
        valuationData.neighborhood || '', valuationData.fullAddress || '', valuationData.rooms || '0.0',
        valuationData.floor || '0', valuationData.airDirections || '', valuationData.area || 0,
        valuationData.propertyEssence || '', valuationData.clientName || valuationData.client_name || '', valuationData.clientTitle || valuationData.client_title || '', valuationData.clientNote || valuationData.client_note || '', valuationData.clientRelation || valuationData.client_relation || '',
        formatDateForDB(valuationData.visitDate),
        formatDateForDB(valuationData.valuationDate), valuationData.valuationType || valuationData.valuation_type || '',
        formatDateForDB(valuationData.valuationEffectiveDate),
        valuationData.referenceNumber || '', valuationData.shamayName || '',
        valuationData.shamaySerialNumber || '', valuationData.gush || '', valuationData.parcel || '',
        this._parseNumeric(valuationData.parcelArea), valuationData.parcelShape || '', valuationData.parcelSurface || '',
        valuationData.subParcel || '', this._parseNumeric(valuationData.registeredArea), this._parseNumeric(valuationData.builtArea),
        this._parseNumeric(valuationData.balconyArea), valuationData.buildingPermitNumber || '', formatDateForDB(valuationData.buildingPermitDate),
        valuationData.buildingDescription || '', this._parseNumeric(valuationData.buildingFloors), this._parseNumeric(valuationData.buildingUnits),
        valuationData.buildingDetails || '', valuationData.constructionSource || '', valuationData.attachments || '',
        valuationData.ownershipRights || '', valuationData.notes || '', valuationData.registryOffice || '',
        formatDateForDB(valuationData.extractDate), valuationData.internalLayout || '', valuationData.finishStandard || '',
        valuationData.finishDetails || '', JSON.stringify(valuationData.propertyImages || []),
        valuationData.selectedImageIndex || 0, valuationData.selectedImagePreview || null,
        JSON.stringify(valuationData.interiorImages || []), valuationData.signaturePreview || null,
        JSON.stringify(valuationData.propertyAnalysis || {}), JSON.stringify(valuationData.marketAnalysis || {}),
        JSON.stringify(valuationData.riskAssessment || {}), JSON.stringify(valuationData.recommendations || []),
        JSON.stringify(valuationData.extractedData || {}), JSON.stringify(valuationData.comparableData || []),
        valuationData.finalValuation || 0, valuationData.pricePerSqm || 0, valuationData.isComplete || false,
        JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisAnalysis || {}), JSON.stringify(valuationData.gisScreenshots || {}),
        JSON.stringify(valuationData.garmushkaMeasurements || {}),
        valuationData.landContamination || false, valuationData.landContaminationNote || ''
      ])

      shumaId = result.rows[0].id
    } else {
      // 🚨 CRITICAL: MERGE with existing data instead of overwriting!
      const existingData = existingShuma.rows[0]
      
      // Helper function to safely merge values
      const mergeValue = (newValue, existingValue, defaultValue = '') => {
        // If new value is explicitly provided and not empty/null/undefined, use it
        if (newValue !== undefined && newValue !== null && newValue !== '') {
          return newValue
        }
        // Otherwise keep existing value
        return existingValue !== undefined && existingValue !== null ? existingValue : defaultValue
      }
      
      // Helper for JSON fields - shallow merge
      const mergeJSON = (newValue, existingValue, defaultValue = {}) => {
        if (newValue && Object.keys(newValue).length > 0) {
          // Merge new data with existing
          return { ...existingValue, ...newValue }
        }
        return existingValue || defaultValue
      }
      
      // Deep merge function for nested objects (like extracted_data)
      const deepMergeJSON = (newValue, existingValue, defaultValue = {}) => {
        if (!newValue || (typeof newValue !== 'object') || Array.isArray(newValue)) {
          return newValue || existingValue || defaultValue
        }
        
        if (!existingValue || (typeof existingValue !== 'object') || Array.isArray(existingValue)) {
          return newValue || defaultValue
        }
        
        // Deep merge: recursively merge nested objects
        const merged = { ...existingValue }
        for (const [key, value] of Object.entries(newValue)) {
          if (value !== undefined && value !== null) {
            // If both are objects (not arrays), deep merge them
            if (
              typeof value === 'object' && 
              !Array.isArray(value) && 
              typeof merged[key] === 'object' && 
              !Array.isArray(merged[key])
            ) {
              merged[key] = deepMergeJSON(value, merged[key], {})
            } else {
              // Otherwise, replace (or set if new)
              merged[key] = value
            }
          }
        }
        return merged
      }
      
      // Helper for arrays - concatenate or replace
      const mergeArray = (newValue, existingValue, defaultValue = []) => {
        if (newValue && newValue.length > 0) {
          return newValue // Replace with new array if provided
        }
        return existingValue || defaultValue
      }
      
      console.log('🔄 MERGING data for session:', sessionId)
      console.log('📊 Existing data keys:', Object.keys(existingData))
      console.log('📝 New data keys:', Object.keys(valuationData))
      
      // Deep merge extracted_data BEFORE sending to database
      let mergedExtractedData = {}
      if (existingData.extracted_data) {
        try {
          const existingExtracted = typeof existingData.extracted_data === 'string' 
            ? JSON.parse(existingData.extracted_data) 
            : existingData.extracted_data
          const newExtracted = valuationData.extractedData || {}
          mergedExtractedData = deepMergeJSON(newExtracted, existingExtracted, {})
          console.log('🔀 Deep merged extracted_data:', {
            existingKeys: Object.keys(existingExtracted),
            newKeys: Object.keys(newExtracted),
            mergedKeys: Object.keys(mergedExtractedData),
            hasPlanningRights: !!mergedExtractedData.planning_rights,
            hasPlanningInfo: !!mergedExtractedData.planning_information
          })
        } catch (e) {
          console.error('Error merging extracted_data:', e)
          mergedExtractedData = valuationData.extractedData || existingData.extracted_data || {}
        }
      } else {
        mergedExtractedData = valuationData.extractedData || {}
      }
      
      // Replace valuationData.extractedData with merged version
      valuationData.extractedData = mergedExtractedData
      
      // Update existing shuma with MERGED data
      await client.query(`
        UPDATE shuma SET
          street = COALESCE(NULLIF($1, ''), street),
          building_number = COALESCE(NULLIF($2, ''), building_number),
          city = COALESCE(NULLIF($3, ''), city),
          neighborhood = COALESCE(NULLIF($4, ''), neighborhood),
          full_address = COALESCE(NULLIF($5, ''), full_address),
          rooms = CASE WHEN $6::text IS NOT NULL AND $6::text != '' AND $6::text != '0' THEN $6::numeric ELSE rooms END,
          floor = COALESCE(NULLIF($7, ''), floor),
          air_directions = COALESCE(NULLIF($8, ''), air_directions),
          area = CASE WHEN $9::text IS NOT NULL AND $9::text != '' AND $9::numeric != 0 THEN $9::numeric ELSE area END,
          property_essence = COALESCE($10, property_essence),
          client_name = COALESCE($11, client_name),
          visit_date = COALESCE($12, visit_date),
          valuation_date = COALESCE($13, valuation_date),
          reference_number = COALESCE(NULLIF($14, ''), reference_number),
          shamay_name = COALESCE(NULLIF($15, ''), shamay_name),
          shamay_serial_number = COALESCE(NULLIF($16, ''), shamay_serial_number),
          gush = COALESCE(NULLIF($17, ''), gush),
          parcel = COALESCE(NULLIF($18, ''), parcel),
          parcel_area = CASE WHEN $19::numeric != 0 THEN $19 ELSE parcel_area END,
          parcel_shape = COALESCE(NULLIF($20, ''), parcel_shape),
          parcel_surface = COALESCE(NULLIF($21, ''), parcel_surface),
          sub_parcel = COALESCE(NULLIF($22, ''), sub_parcel),
          registered_area = CASE WHEN $23::numeric != 0 THEN $23 ELSE registered_area END,
          built_area = CASE WHEN $24::numeric != 0 THEN $24 ELSE built_area END,
          balcony_area = CASE WHEN $25::numeric != 0 THEN $25 ELSE balcony_area END,
          building_permit_number = COALESCE(NULLIF($26, ''), building_permit_number),
          building_permit_date = COALESCE($27, building_permit_date),
          building_description = COALESCE(NULLIF($28, ''), building_description),
          building_floors = CASE WHEN $29::integer != 0 THEN $29 ELSE building_floors END,
          building_units = CASE WHEN $30::integer != 0 THEN $30 ELSE building_units END,
          building_details = COALESCE(NULLIF($31, ''), building_details),
          construction_source = COALESCE(NULLIF($32, ''), construction_source),
          attachments = COALESCE(NULLIF($33, ''), attachments),
          ownership_rights = COALESCE(NULLIF($34, ''), ownership_rights),
          notes = COALESCE(NULLIF($35, ''), notes),
          registry_office = COALESCE(NULLIF($36, ''), registry_office),
          extract_date = COALESCE($37, extract_date),
          internal_layout = COALESCE(NULLIF($38, ''), internal_layout),
          finish_standard = COALESCE(NULLIF($39, ''), finish_standard),
          finish_details = COALESCE(NULLIF($40, ''), finish_details),
          property_images = CASE WHEN $41::text != '[]' THEN $41::jsonb ELSE property_images END,
          selected_image_index = CASE WHEN $42::integer IS NOT NULL THEN $42 ELSE selected_image_index END,
          selected_image_preview = COALESCE($43, selected_image_preview),
          interior_images = CASE WHEN $44::text != '[]' THEN $44::jsonb ELSE interior_images END,
          signature_preview = COALESCE($45, signature_preview),
          property_analysis = CASE WHEN $46::text != '{}' THEN COALESCE(property_analysis, '{}'::jsonb) || $46::jsonb ELSE property_analysis END,
          market_analysis = CASE WHEN $47::text != '{}' THEN COALESCE(market_analysis, '{}'::jsonb) || $47::jsonb ELSE market_analysis END,
          risk_assessment = CASE WHEN $48::text != '{}' THEN COALESCE(risk_assessment, '{}'::jsonb) || $48::jsonb ELSE risk_assessment END,
          recommendations = CASE WHEN $49::text != '[]' THEN $49::jsonb ELSE recommendations END,
          extracted_data = CASE WHEN $50::text != '{}' THEN $50::jsonb ELSE extracted_data END,
          comparable_data = CASE WHEN $51::text != '[]' THEN $51::jsonb ELSE comparable_data END,
          final_valuation = CASE WHEN $52::numeric != 0 THEN $52 ELSE final_valuation END,
          price_per_sqm = CASE WHEN $53::numeric != 0 THEN $53 ELSE price_per_sqm END,
          is_complete = COALESCE($54, is_complete),
          uploads = CASE WHEN $55::text != '[]' THEN $55::jsonb ELSE uploads END,
          gis_analysis = CASE WHEN $56::text != '{}' THEN COALESCE(gis_analysis, '{}'::jsonb) || $56::jsonb ELSE gis_analysis END,
          gis_screenshots = CASE WHEN $57::text != '{}' THEN COALESCE(gis_screenshots, '{}'::jsonb) || $57::jsonb ELSE gis_screenshots END,
          garmushka_measurements = CASE WHEN $58::text != '{}' THEN COALESCE(garmushka_measurements, '{}'::jsonb) || $58::jsonb ELSE garmushka_measurements END,
          valuation_type = CASE WHEN $59::text IS NOT NULL THEN $59::text ELSE valuation_type END,
          valuation_effective_date = COALESCE($60, valuation_effective_date),
          client_title = CASE WHEN $61::text IS NOT NULL THEN $61::text ELSE client_title END,
          client_note = CASE WHEN $62::text IS NOT NULL THEN $62::text ELSE client_note END,
          client_relation = CASE WHEN $63::text IS NOT NULL THEN $63::text ELSE client_relation END,
          land_contamination = COALESCE($64, land_contamination),
          land_contamination_note = CASE WHEN $65::text IS NOT NULL THEN $65::text ELSE land_contamination_note END,
          updated_at = NOW()
        WHERE id = $66
      `, [
        valuationData.street, valuationData.buildingNumber,
        valuationData.city, valuationData.neighborhood, valuationData.fullAddress, valuationData.rooms || '0.0',
        valuationData.floor, valuationData.airDirections, valuationData.area || 0, valuationData.propertyEssence,
        valuationData.propertyEssence !== undefined ? (valuationData.propertyEssence || '') : null,
        valuationData.clientName !== undefined ? (valuationData.clientName || '') : (valuationData.client_name !== undefined ? (valuationData.client_name || '') : null),
        formatDateForDB(valuationData.visitDate), formatDateForDB(valuationData.valuationDate),
        valuationData.referenceNumber,
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
        JSON.stringify(valuationData.comparableData || []), valuationData.finalValuation, valuationData.pricePerSqm,
        valuationData.isComplete, JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisAnalysis || {}), JSON.stringify(valuationData.gisScreenshots || {}),
        JSON.stringify(valuationData.garmushkaMeasurements || {}),
        valuationData.valuationType ?? null,
        formatDateForDB(valuationData.valuationEffectiveDate),
        valuationData.clientTitle ?? null,
        valuationData.clientNote ?? null,
        valuationData.clientRelation ?? null,
        valuationData.landContamination ?? false, valuationData.landContaminationNote ?? null,
        shumaId
      ])
      
      // Debug: Check what was actually updated
      const checkResult = await client.query(
        'SELECT client_title, valuation_type, client_note, client_relation FROM shuma WHERE id = $1',
        [shumaId]
      )
      console.log('🔍 After UPDATE - DB values:', {
        clientTitle: checkResult.rows[0]?.client_title,
        valuationType: checkResult.rows[0]?.valuation_type,
        clientNote: checkResult.rows[0]?.client_note,
        clientRelation: checkResult.rows[0]?.client_relation
      })
      
      console.log('✅ Data merged successfully for session:', sessionId)
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
    if (!garmushkaData || !Array.isArray(garmushkaData.measurementTable) || garmushkaData.measurementTable.length === 0) {
      return
    }

    const pngExport = typeof garmushkaData.pngExport === 'string' ? garmushkaData.pngExport.trim() : null
    const pngHash = pngExport ? crypto.createHash('md5').update(pngExport).digest('hex') : null

    const existingRows = await client.query(`
      SELECT id, md5(COALESCE(png_export, '')) AS png_hash
      FROM garmushka
      WHERE session_id = $1
      ORDER BY id DESC
    `, [sessionId])

    const duplicatesToDelete = []
    const seenHashes = new Set()
    let matchedRowId = null

    for (const row of existingRows.rows) {
      const rowHash = row.png_hash || null

      if (rowHash) {
        if (seenHashes.has(rowHash)) {
          duplicatesToDelete.push(row.id)
          continue
        }
        seenHashes.add(rowHash)
        if (!matchedRowId && pngHash && rowHash === pngHash) {
          matchedRowId = row.id
        }
      }
    }

    if (duplicatesToDelete.length > 0) {
      await client.query(
        `DELETE FROM garmushka WHERE id = ANY($1::int[])`,
        [duplicatesToDelete]
      )
    }

    let garmushkaId = matchedRowId || null

    if (garmushkaId) {
      await client.query(`
        UPDATE garmushka SET
          file_name = $1,
          measurement_table = $2,
          meters_per_pixel = $3,
          unit_mode = $4,
          is_calibrated = $5,
          png_export = $6
        WHERE id = $7
      `, [
        this._truncateString(garmushkaData.fileName || 'measurement.pdf', 255),
        JSON.stringify(garmushkaData.measurementTable || []),
        garmushkaData.metersPerPixel || null,
        this._truncateString(garmushkaData.unitMode || 'metric', 20),
        garmushkaData.isCalibrated || false,
        pngExport,
        garmushkaId
      ])
    } else {
      const insertResult = await client.query(`
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
        pngExport,
        shumaId,
        sessionId
      ])

      garmushkaId = insertResult.rows[0].id
    }

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
        clientTitle: shuma.client_title ?? '',
        clientNote: shuma.client_note ?? '',
        clientRelation: shuma.client_relation ?? '',
        visitDate: shuma.visit_date || '',
        valuationDate: shuma.valuation_date || '',
        valuationType: shuma.valuation_type ?? '',
        valuationEffectiveDate: shuma.valuation_effective_date || '',
        referenceNumber: shuma.reference_number || '',
        shamayName: shuma.shamay_name || '',
        shamaySerialNumber: shuma.shamay_serial_number || '',
        
        // Land Contamination
        landContamination: shuma.land_contamination || false,
        landContaminationNote: shuma.land_contamination_note || '',
        
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
        
        // Garmushka Measurements - load latest from shuma table
        garmushkaMeasurements: typeof shuma.garmushka_measurements === 'string' ? JSON.parse(shuma.garmushka_measurements) : (shuma.garmushka_measurements || {})
      }
      
      // If selectedImagePreview is missing but we have uploads, extract it from building_image uploads
      if (!valuationData.selectedImagePreview && valuationData.uploads && Array.isArray(valuationData.uploads)) {
        const buildingImageUploads = valuationData.uploads.filter(upload => 
          upload.type === 'building_image' && upload.status === 'completed' && (upload.preview || upload.url)
        )
        
        if (buildingImageUploads.length > 0) {
          // Find selected upload (isSelected: true) or use first one
          const selectedUpload = buildingImageUploads.find(upload => upload.isSelected) || buildingImageUploads[0]
          valuationData.selectedImagePreview = selectedUpload.preview || selectedUpload.url || null
          
          // Also update selectedImageIndex if needed
          if (selectedUpload && valuationData.propertyImages && Array.isArray(valuationData.propertyImages)) {
            const imageIndex = valuationData.propertyImages.findIndex(img => 
              img.preview === selectedUpload.preview || img.preview === selectedUpload.url
            )
            if (imageIndex >= 0) {
              valuationData.selectedImageIndex = imageIndex
            }
          }
        }
      }

      // Load ALL garmushka records for this session to get all PNG exports (2-4 screenshots)
      try {
        const garmushkaResult = await db.query(`
          SELECT id, png_export, file_name, created_at 
          FROM garmushka 
          WHERE session_id = $1 AND png_export IS NOT NULL AND png_export != ''
          ORDER BY created_at ASC
        `, [sessionId])
        
        if (garmushkaResult.rows.length > 0) {
          // Collect all PNG exports from all garmushka records with their IDs
          const allPngExports = garmushkaResult.rows
            .map(row => row.png_export)
            .filter(url => url && typeof url === 'string' && url.trim().length > 0)
          
          // Collect all garmushka records with full info (for deletion)
          const allGarmushkaRecords = garmushkaResult.rows
            .filter(row => row.png_export && typeof row.png_export === 'string' && row.png_export.trim().length > 0)
            .map(row => ({
              id: row.id,
              url: row.png_export,
              fileName: row.file_name || 'תשריט',
              createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
            }))
          
          console.log(`📊 Loaded ${garmushkaResult.rows.length} garmushka records, ${allGarmushkaRecords.length} with PNG exports`)
          
            // Always add garmushkaRecords if we have any records (even if no PNG exports)
            // This ensures we can delete records even if they don't have PNG exports
            // IMPORTANT: Replace garmushkaMeasurements with fresh data from garmushka table
            // to avoid stale data from shuma.garmushka_measurements
            // IMPORTANT: We're moving to uploaded files, so pngExport/pngExports should NOT be used
            if (allGarmushkaRecords.length > 0) {
              valuationData.garmushkaMeasurements = {
                // Keep other measurement data (like measurementTable, metersPerPixel, etc.)
                measurementTable: valuationData.garmushkaMeasurements?.measurementTable || [],
                metersPerPixel: valuationData.garmushkaMeasurements?.metersPerPixel || 0,
                unitMode: valuationData.garmushkaMeasurements?.unitMode || 'metric',
                isCalibrated: valuationData.garmushkaMeasurements?.isCalibrated || false,
                // Add fresh data from garmushka table (uploaded files, not base64)
                garmushkaRecords: allGarmushkaRecords // Add array of all garmushka records with IDs
                // NOTE: pngExport and pngExports are NOT added - we use garmushkaRecords with file URLs instead
              }
            } else {
            // No records in garmushka table - clear pngExport and pngExports from measurements
            // IMPORTANT: We're moving to uploaded files, so pngExport should be deleted completely
            // but keep other measurement data
            if (valuationData.garmushkaMeasurements) {
              const { pngExport, pngExports, ...otherMeasurements } = valuationData.garmushkaMeasurements
              valuationData.garmushkaMeasurements = {
                ...otherMeasurements,
                garmushkaRecords: []
              }
            }
          }
        } else {
          // No records in garmushka table - clear pngExport and pngExports from measurements
          // IMPORTANT: We're moving to uploaded files, so pngExport should be deleted completely
          // but keep other measurement data
          if (valuationData.garmushkaMeasurements) {
            const { pngExport, pngExports, ...otherMeasurements } = valuationData.garmushkaMeasurements
            valuationData.garmushkaMeasurements = {
              ...otherMeasurements,
              garmushkaRecords: []
            }
          }
        }
      } catch (garmushkaError) {
        console.warn('Failed to load all garmushka PNG exports:', garmushkaError)
        // Continue with just the latest from shuma table
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
      
      const sanitizedGarmushkaData = garmushkaData ? { ...garmushkaData } : {}
      if (sanitizedGarmushkaData) {
        delete sanitizedGarmushkaData.garmushkaRecords
        if (Array.isArray(sanitizedGarmushkaData.pngExports) && sanitizedGarmushkaData.pngExports.length === 0) {
          delete sanitizedGarmushkaData.pngExports
        }
      }

      // Update shuma table
      await client.query(`
        UPDATE shuma SET
          garmushka_measurements = $1,
          updated_at = NOW()
        WHERE session_id = $2
      `, [JSON.stringify(sanitizedGarmushkaData || {}), sessionId])
      
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
   * Delete all Garmushka data for a session
   * Deletes from both shuma table and garmushka table
   */
  static async deleteGarmushkaData(sessionId) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma ID
      const shumaResult = await client.query('SELECT id FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length === 0) {
        throw new Error('Shuma not found for session')
      }
      const shumaId = shumaResult.rows[0].id
      
      // Delete all garmushka records for this session
      const deleteResult = await client.query(`
        DELETE FROM garmushka 
        WHERE session_id = $1
      `, [sessionId])
      
      console.log(`🗑️ Deleted ${deleteResult.rowCount} Garmushka record(s) for session ${sessionId}`)
      
      // Clear garmushka_measurements from shuma table
      await client.query(`
        UPDATE shuma SET
          garmushka_measurements = '{}'::jsonb,
          updated_at = NOW()
        WHERE session_id = $1
      `, [sessionId])
      
      await client.query('COMMIT')
      return { success: true, deletedCount: deleteResult.rowCount }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error deleting Garmushka data:', error)
      return { error: error.message || 'Failed to delete Garmushka data' }
    } finally {
      client.release()
    }
  }

  /**
   * Delete a single Garmushka record by ID
   * Deletes from garmushka table and cleans up shuma.garmushka_measurements
   */
  static async deleteGarmushkaRecord(garmushkaId, sessionId) {
    const client = await db.client()
    
    try {
      await client.query('BEGIN')
      
      // Get the record to find its png_export URL before deleting
      const recordResult = await client.query(`
        SELECT id, png_export FROM garmushka 
        WHERE id = $1 AND session_id = $2
      `, [garmushkaId, sessionId])
      
      if (recordResult.rows.length === 0) {
        throw new Error('Garmushka record not found or does not belong to this session')
      }
      
      const deletedPngExport = recordResult.rows[0].png_export
      
      // Delete the garmushka record
      const deleteResult = await client.query(`
        DELETE FROM garmushka 
        WHERE id = $1 AND session_id = $2
      `, [garmushkaId, sessionId])
      
      console.log(`🗑️ Deleted Garmushka record ${garmushkaId} for session ${sessionId}`)
      
      // Get shuma ID and current garmushka_measurements
      const shumaResult = await client.query('SELECT id, garmushka_measurements FROM shuma WHERE session_id = $1', [sessionId])
      if (shumaResult.rows.length > 0) {
        const shumaId = shumaResult.rows[0].id
        const currentMeasurements = typeof shumaResult.rows[0].garmushka_measurements === 'string'
          ? JSON.parse(shumaResult.rows[0].garmushka_measurements)
          : (shumaResult.rows[0].garmushka_measurements || {})
        
        // Remove the deleted pngExport from garmushka_measurements
        // IMPORTANT: We're moving to uploaded files, so pngExport should be deleted completely
        let updatedMeasurements = { ...currentMeasurements }
        
        // Always remove pngExport (we're moving to uploaded files, not base64)
        delete updatedMeasurements.pngExport
        
        // Remove from pngExports array if it exists
        if (Array.isArray(updatedMeasurements.pngExports)) {
          updatedMeasurements.pngExports = updatedMeasurements.pngExports.filter(url => url !== deletedPngExport)
          // If array is empty, remove it
          if (updatedMeasurements.pngExports.length === 0) {
            delete updatedMeasurements.pngExports
          }
        }
        
        // Remove from garmushkaRecords array if it exists
        if (Array.isArray(updatedMeasurements.garmushkaRecords)) {
          updatedMeasurements.garmushkaRecords = updatedMeasurements.garmushkaRecords.filter(record => record.id !== garmushkaId)
          // If array is empty, remove it
          if (updatedMeasurements.garmushkaRecords.length === 0) {
            delete updatedMeasurements.garmushkaRecords
          }
        }
        
        // If no more measurements, clear the entire field
        if (Object.keys(updatedMeasurements).length === 0) {
          updatedMeasurements = {}
        }
        
        // Update shuma table with cleaned measurements
        await client.query(`
          UPDATE shuma SET
            garmushka_measurements = $1,
            updated_at = NOW()
          WHERE session_id = $2
        `, [JSON.stringify(updatedMeasurements), sessionId])
        
        console.log(`🧹 Cleaned up garmushka_measurements in shuma table for session ${sessionId}`)
      }
      
      await client.query('COMMIT')
      return { success: true }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error deleting Garmushka record:', error)
      return { error: error.message || 'Failed to delete Garmushka record' }
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
    const client = await db.client()

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
          client_title,
          client_note,
          client_relation,
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
          clientTitle: row.client_title,
          clientNote: row.client_note,
          clientRelation: row.client_relation,
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
  static async getShumaById(shumaId, organizationId) {
    const client = await db.client()

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
          client_title,
          client_note,
          client_relation,
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
        WHERE id = $1 ${organizationId ? 'AND organization_id = $2' : ''}
      `, organizationId ? [shumaId, organizationId] : [shumaId])

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
          clientTitle: row.client_title,
          clientNote: row.client_note,
          clientRelation: row.client_relation,
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
   * Delete a shuma by ID
   */
  static async deleteShuma(shumaId, organizationId) {
    const client = await db.client()

    try {
      // First verify the shuma exists and belongs to the organization
      const checkResult = await client.query(`
        SELECT id FROM shuma 
        WHERE id = $1 ${organizationId ? 'AND organization_id = $2' : ''}
      `, organizationId ? [shumaId, organizationId] : [shumaId])

      if (checkResult.rows.length === 0) {
        return { success: false, error: 'Shuma not found' }
      }

      // Delete the shuma
      await client.query('DELETE FROM shuma WHERE id = $1', [shumaId])

      return { success: true }
    } catch (error) {
      console.error('Error deleting shuma:', error)
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

  /**
   * Get organization settings including logos and company info
   */
  static async getOrganizationSettings(organizationId) {
    const client = await db.client()
    
    try {
      const result = await client.query(
        `SELECT id, name, logo_url, settings 
         FROM organizations 
         WHERE id = $1`,
        [organizationId]
      )
      
      if (result.rows.length === 0) {
        return null
      }
      
      const org = result.rows[0]
      const settings = typeof org.settings === 'string' 
        ? JSON.parse(org.settings) 
        : (org.settings || {})
      
      return {
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
        settings: settings
      }
    } catch (error) {
      console.error('Error fetching organization settings:', error)
      return null
    } finally {
      client.release()
    }
  }

  /**
   * Get user settings including logos, signature, and company info
   * @param {string} userId - User ID to search for
   * @param {string} userEmail - Optional email to search for if user not found by ID
   */
  static async getUserSettings(userId, userEmail = null) {
    const client = await db.client()
    
    try {
      // First try to find user by ID
      let result = await client.query(
        `SELECT id, name, email, settings 
         FROM users 
         WHERE id = $1`,
        [userId]
      )
      
      // If not found by ID and email provided, try to find by email
      if (result.rows.length === 0 && userEmail) {
        result = await client.query(
          `SELECT id, name, email, settings 
           FROM users 
           WHERE email = $1`,
          [userEmail]
        )
      }
      
      if (result.rows.length === 0) {
        return null
      }
      
      const user = result.rows[0]
      const settings = typeof user.settings === 'string' 
        ? JSON.parse(user.settings) 
        : (user.settings || {})
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        settings: settings
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
      return null
    } finally {
      client.release()
    }
  }
}

module.exports = { db, ShumaDB: ShumaDBEnhanced, formatDateForDB }
