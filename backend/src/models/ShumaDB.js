/**
 * Enhanced Shuma Database Client
 * Saves data to BOTH:
 * 1. shuma table (for the valuation snapshot)
 * 2. Individual extraction tables (normalized with references)
 * 
 * Uses Neon serverless driver for Vercel deployment
 */

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

// In-memory cache for loadShumaForWizard to reduce repeated queries
// Cache TTL: 5 seconds (balances freshness with performance)
const shumaCache = new Map()
const CACHE_TTL_MS = 5000 // 5 seconds

// Helper to safely parse JSON (handles both string and already-parsed objects)
function safeParseJSON(value, defaultValue) {
  if (!value) return defaultValue
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return defaultValue
    }
  }
  return value
}

function getDatabaseConfig() {
  const DATABASE_URL = process.env.DATABASE_URL
  const POSTGRES_URL = process.env.POSTGRES_URL
  const POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL_NON_POOLING
  
  const isDev = process.env.NODE_ENV !== 'production'
  const debugConfig = process.env.DEBUG_DB_CONFIG === 'true'
  
  // Only log config details in dev mode with debug flag
  if (isDev && debugConfig) {
    console.log('🔍 DB Config: Checking environment variables...')
    console.log('🔍 DATABASE_URL:', DATABASE_URL ? 'SET ✅' : 'NOT SET ❌')
    console.log('🔍 POSTGRES_URL:', POSTGRES_URL ? 'SET ✅' : 'NOT SET ❌')
    console.log('🔍 POSTGRES_URL_NON_POOLING:', POSTGRES_URL_NON_POOLING ? 'SET ✅' : 'NOT SET ❌')
    console.log('🔍 VERCEL:', process.env.VERCEL ? 'YES' : 'NO')
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
  }
  
  // Prefer DATABASE_URL, then POSTGRES_URL, then POSTGRES_URL_NON_POOLING, then fallback to local
  const connectionString = DATABASE_URL || POSTGRES_URL || POSTGRES_URL_NON_POOLING
  
  if (connectionString) {
    if (isDev && debugConfig) {
      console.log('✅ Using connection string from env:', connectionString.substring(0, 20) + '...')
    }
    return {
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  }
  
  if (isDev && debugConfig) {
    console.log('⚠️ No connection string found, using fallback local config')
  }
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
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) {
      console.log('🔍 ShumaDB: Initializing connection pool...')
    }
    
    if (!Pool) {
      console.error('❌ Pool constructor is not available!')
      throw new Error('Database Pool is not initialized. Make sure pg or @neondatabase/serverless is installed.')
    }
    
    const config = getDatabaseConfig()
    
    // Add connection pool optimization settings
    if (!config.connectionString) {
      // Local development: configure pool limits
      config.min = parseInt(process.env.DB_POOL_MIN || '2')
      config.max = parseInt(process.env.DB_POOL_MAX || '10')
      config.idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000')
      config.connectionTimeoutMillis = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000')
    }
    
    if (isDev) {
      console.log('🔍 ShumaDB: Creating pool with config:', {
        hasConnectionString: !!config.connectionString,
        host: config.host,
        database: config.database,
        min: config.min,
        max: config.max
      })
    }
    
    // Use Neon serverless in production
    if (process.env.VERCEL && neonConfig) {
      if (isDev) {
        console.log('🚀 Configuring Neon for WebSocket (Vercel)')
      }
      neonConfig.fetchConnectionCache = true
    }
    
    try {
      pool = new Pool(config)
      if (isDev) {
        console.log('✅ Pool created successfully')
      }
      
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
    // Only log queries in development mode
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev && process.env.DEBUG_DB_QUERIES === 'true') {
      console.log('🔍 db.query:', text.substring(0, 50) + '...')
    }
    
    // ALWAYS use Pool for parameterized queries (Neon sql client doesn't support $1, $2 syntax well)
    // The Neon sql client is best for tagged templates, which we're not using
    const poolInstance = getPool()
    if (!poolInstance) {
      throw new Error('Database pool is not initialized')
    }
    return poolInstance.query(text, params)
  },
  client: async () => {
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev && process.env.DEBUG_DB_QUERIES === 'true') {
      console.log('🔍 db.client called')
    }
    const poolInstance = getPool()
    if (!poolInstance) {
      throw new Error('Database pool is not initialized')
    }
    if (isDev && process.env.DEBUG_DB_QUERIES === 'true') {
      console.log('🔍 Connecting to pool...')
    }
    try {
      const client = await poolInstance.connect()
      if (isDev && process.env.DEBUG_DB_QUERIES === 'true') {
        console.log('✅ Pool client connected')
      }
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
      
      // Clear cache for this session after saving to ensure fresh data
      this.clearShumaCache(sessionId)
      
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
        valuationData.street || '', valuationData.buildingNumber || '', valuationData.city || '',
        valuationData.neighborhood || '', valuationData.fullAddress || '', valuationData.rooms || '0.0',
        valuationData.floor || '0', valuationData.airDirections || '', valuationData.area || 0,
        valuationData.propertyEssence || '', valuationData.clientName || '', formatDateForDB(valuationData.visitDate),
        formatDateForDB(valuationData.valuationDate), valuationData.referenceNumber || '', valuationData.shamayName || '',
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
        JSON.stringify(valuationData.propertyAnalysis || {}), JSON.stringify(valuationData.comparableDataAnalysis || valuationData.marketAnalysis || {}),
        JSON.stringify(valuationData.riskAssessment || {}), JSON.stringify(valuationData.recommendations || []),
        JSON.stringify(valuationData.extractedData || {}), JSON.stringify(valuationData.comparableData || []),
        valuationData.finalValuation || 0, valuationData.pricePerSqm || 0, valuationData.isComplete || false,
        JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisAnalysis || {}), JSON.stringify(valuationData.gisScreenshots || {}),
        JSON.stringify(valuationData.garmushkaMeasurements || {})
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
      
      // Helper for JSON fields - deep merge
      const mergeJSON = (newValue, existingValue, defaultValue = {}) => {
        if (newValue && Object.keys(newValue).length > 0) {
          // Merge new data with existing
          return { ...existingValue, ...newValue }
        }
        return existingValue || defaultValue
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
          property_essence = COALESCE(NULLIF($10, ''), property_essence),
          client_name = COALESCE(NULLIF($11, ''), client_name),
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
          property_analysis = CASE WHEN $46::text != '{}' THEN $46::jsonb ELSE property_analysis END,
          market_analysis = CASE WHEN $47::text != '{}' THEN $47::jsonb ELSE market_analysis END,
          risk_assessment = CASE WHEN $48::text != '{}' THEN $48::jsonb ELSE risk_assessment END,
          recommendations = CASE WHEN $49::text != '[]' THEN $49::jsonb ELSE recommendations END,
          extracted_data = CASE WHEN $50::text != '{}' THEN $50::jsonb ELSE extracted_data END,
          comparable_data = CASE WHEN $51::text != '[]' THEN $51::jsonb ELSE comparable_data END,
          final_valuation = CASE WHEN $52::numeric != 0 THEN $52 ELSE final_valuation END,
          price_per_sqm = CASE WHEN $53::numeric != 0 THEN $53 ELSE price_per_sqm END,
          is_complete = COALESCE($54, is_complete),
          uploads = CASE WHEN $55::text != '[]' THEN $55::jsonb ELSE uploads END,
          gis_analysis = CASE WHEN $56::text != '{}' THEN $56::jsonb ELSE gis_analysis END,
          gis_screenshots = CASE WHEN $57::text != '{}' THEN $57::jsonb ELSE gis_screenshots END,
          garmushka_measurements = CASE WHEN $58::text != '{}' THEN $58::jsonb ELSE garmushka_measurements END,
          updated_at = NOW()
        WHERE id = $59
      `, [
        valuationData.street, valuationData.buildingNumber,
        valuationData.city, valuationData.neighborhood, valuationData.fullAddress, valuationData.rooms || '0.0',
        valuationData.floor, valuationData.airDirections, valuationData.area || 0, valuationData.propertyEssence,
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
        JSON.stringify(valuationData.comparableDataAnalysis || valuationData.marketAnalysis || {}), JSON.stringify(valuationData.riskAssessment || {}),
        JSON.stringify(valuationData.recommendations || []), JSON.stringify(valuationData.extractedData || {}),
        JSON.stringify(valuationData.comparableData || []), valuationData.finalValuation, valuationData.pricePerSqm,
        valuationData.isComplete, JSON.stringify(valuationData.uploads || []), JSON.stringify(valuationData.gisAnalysis || {}), JSON.stringify(valuationData.gisScreenshots || {}),
        JSON.stringify(valuationData.garmushkaMeasurements || {}), shumaId
      ])
      
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
   * Parse floor value to integer, handling ranges like "8-9" by taking the first number
   */
  static _parseFloorsToInteger(floorsValue) {
    if (!floorsValue) return null;

    // Handle string values like "8-9" by extracting the first number
    if (typeof floorsValue === 'string') {
      // Extract first number from range like "8-9" -> 8
      const match = floorsValue.match(/^(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
      // Try to parse the entire string as a number
      const parsed = parseInt(floorsValue, 10);
      return isNaN(parsed) ? null : parsed;
    }

    // If it's already a number, return it
    if (typeof floorsValue === 'number') {
      return floorsValue;
    }

    return null;
  }

  /**
   * Save Garmushka measurements to garmushka table + shuma
   * Note: pngExport should be a file URL (not base64) after processing in saveGarmushkaData
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
      garmushkaData.pngExport || null, // TEXT field - now stores URL instead of base64
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
  /**
   * Convert base64 image to Buffer and save to file storage
   * Uses Vercel Blob in production, local filesystem in development
   * Returns URL instead of base64 to reduce DB size
   */
  static async _saveBase64ImageToFile(base64Data, sessionId, filename) {
    try {
      // Extract base64 data (remove data:image/png;base64, prefix if present)
      const base64String = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data
      
      // Convert base64 to Buffer
      const buffer = Buffer.from(base64String, 'base64')
      
      // Check if we're in Vercel production
      // In Vercel, process.env.VERCEL is truthy (typically '1')
      // ALWAYS try Blob first if we're in Vercel, regardless of token (token might be auto-detected)
      const isVercel = !!process.env.VERCEL || process.env.VERCEL_ENV === 'production'
      
      console.log('🔍 [SAVE] Environment check:', {
        isVercel,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        NODE_ENV: process.env.NODE_ENV
      })
      
      // ALWAYS try Vercel Blob first if in Vercel (primary storage method)
      if (isVercel) {
        try {
          console.log('🚀 [SAVE] In Vercel - Attempting Blob upload...')
          return await this._saveToVercelBlob(buffer, sessionId, filename)
        } catch (blobError) {
          console.error('❌ [SAVE] Vercel Blob failed:', blobError.message)
          // In Vercel, we should NOT fall back to local filesystem
          // Vercel filesystem is read-only except /tmp, and files won't persist
          throw new Error(`Failed to save to Vercel Blob: ${blobError.message}. This is required in Vercel production.`)
        }
      }
      
      // Use local filesystem in development ONLY
      console.log('📁 [SAVE] Using local filesystem (development)...')
      return await this._saveToLocalFilesystem(buffer, sessionId, filename)
    } catch (error) {
      console.error(`❌ Error saving image file:`, error)
      throw error
    }
  }
  
  /**
   * Save file to Vercel Blob (Production)
   * This is the PRIMARY method for production/Vercel deployments
   */
  static async _saveToVercelBlob(buffer, sessionId, filename) {
    try {
      // Try to use @vercel/blob
      let put
      try {
        const blobModule = require('@vercel/blob')
        put = blobModule.put
        console.log('✅ [BLOB] @vercel/blob module loaded successfully')
      } catch (e) {
        const errorMsg = '@vercel/blob not available. Please install: npm install @vercel/blob'
        console.error('❌ [BLOB] Module load error:', errorMsg)
        throw new Error(errorMsg)
      }
      
      // Check for required token
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set')
      }
      
      const pathname = `${sessionId}/${filename}`
      
      console.log('🔍 [BLOB] Uploading file:', {
        sessionId,
        filename,
        pathname,
        size: buffer.length,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      })
      
      // CRITICAL: Allow overwrite in case blob already exists (for updates/re-saves)
      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true, // Allow overwriting existing blobs
      })
      
      console.log('✅ [BLOB] File uploaded successfully:', {
        url: blob.url,
        pathname: blob.pathname || pathname,
        size: buffer.length
      })
      
      return {
        url: blob.url,
        path: blob.pathname || pathname,
        size: buffer.length
      }
    } catch (error) {
      console.error('❌ [BLOB] Upload error:', {
        message: error.message,
        stack: error.stack,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      })
      // Re-throw error so caller can handle fallback
      throw error
    }
  }
  
  /**
   * Save file to local filesystem (Development ONLY)
   * Saves to frontend/uploads when running locally (since frontend serves from there)
   * NOTE: This should NEVER be used in Vercel production - use _saveToVercelBlob instead
   */
  static async _saveToLocalFilesystem(buffer, sessionId, filename) {
    const fs = require('fs').promises
    const path = require('path')
    
    // Warn if called in production (should not happen)
    if (process.env.VERCEL === '1') {
      console.warn('⚠️ [LOCAL] WARNING: _saveToLocalFilesystem called in Vercel! This should use Blob instead.')
    }
    
    // Local dev: Always save to frontend/uploads
    // Use path.resolve to get absolute path from backend/src/models to project root
    // __dirname = backend/src/models
    // Go up 3 levels: models -> src -> backend -> project root
    const projectRoot = path.resolve(__dirname, '../../..')
    const uploadsDir = path.join(projectRoot, 'frontend', 'uploads', sessionId)
    
    // Ensure directory exists
    await fs.mkdir(uploadsDir, { recursive: true })
    console.log(`📁 [LOCAL] Using upload directory: ${uploadsDir}`)
    
    // Save file
    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, buffer)
    
    // Get file stats
    const stats = await fs.stat(filePath)
    
    // Return URL for local access
    // Use /uploads/ path to match the upload route format
    // This is served by the frontend Next.js app
    const url = `/uploads/${sessionId}/${filename}`
    
    console.log(`✅ [LOCAL] Saved image file: ${filePath} (${stats.size} bytes)`)
    console.log(`📁 [LOCAL] File URL: ${url}`)
    
    return { 
      url, 
      path: `${sessionId}/${filename}`, 
      size: stats.size 
    }
  }

  /**
   * Save GIS screenshots metadata to images table using URLs (files already saved)
   */
  static async _saveGISScreenshotsWithUrls(client, shumaId, sessionId, screenshotUrls, originalScreenshots) {
    // screenshotUrls has URLs, originalScreenshots has base64 (for size info)
    const imagesToSave = []
    
    if (screenshotUrls.cropMode0) {
      const originalSize = originalScreenshots.cropMode0 ? originalScreenshots.cropMode0.length : 0
      imagesToSave.push({
        type: 'סקרין שוט GOVMAP',
        filename: `gis-screenshot-clean-${sessionId}.png`,
        url: screenshotUrls.cropMode0,
        cropMode: '0',
        originalSize
      })
    }
    
    if (screenshotUrls.cropMode1) {
      const originalSize = originalScreenshots.cropMode1 ? originalScreenshots.cropMode1.length : 0
      imagesToSave.push({
        type: 'סקרין שוט תצ״א',
        filename: `gis-screenshot-taba-${sessionId}.png`,
        url: screenshotUrls.cropMode1,
        cropMode: '1',
        originalSize
      })
    }

    for (const img of imagesToSave) {
      try {
        console.log(`💾 Saving image metadata: ${img.filename}, URL: ${img.url}`)
        
        // Save metadata to images table (no base64, just URL)
        const imageType = this._truncateString(img.type || 'gis_screenshot', 50)
        const metadataJson = JSON.stringify({
          filename: img.filename,
          mapType: img.mapType,
          cropMode: img.cropMode,
          timestamp: new Date().toISOString(),
          storedAs: 'file',
          originalBase64Size: img.originalSize
        })
        
        const updateResult = await client.query(`
          UPDATE images 
          SET 
            image_data = NULL,
            image_url = $1,
            metadata = $2
          WHERE session_id = $3 AND image_type = $4
        `, [
          img.url, // Store URL, not base64
          metadataJson,
          sessionId,
          imageType
        ])
        
        // If no rows were updated, insert new record
        if (updateResult.rowCount === 0) {
          await client.query(`
            INSERT INTO images (
              shuma_id,
              session_id,
              image_type,
              image_data,
              image_url,
              metadata
            ) VALUES ($1, $2, $3, NULL, $4, $5)
          `, [
            shumaId,
            sessionId,
            imageType,
            img.url, // Store URL, not base64
            metadataJson
          ])
        }
        console.log(`✅ Successfully saved image metadata: ${img.filename} (URL: ${img.url})`)
      } catch (imgError) {
        console.error(`❌ Error saving individual image ${img.filename}:`, imgError.message)
        continue
      }
    }
  }

  static async _saveGISScreenshots(client, shumaId, sessionId, gisScreenshots) {
    if (!gisScreenshots.cropMode0 && !gisScreenshots.cropMode1) {
      return
    }

    const imagesToSave = []
    
    if (gisScreenshots.cropMode0) {
      imagesToSave.push({
        type: 'סקרין שוט GOVMAP',
        filename: `gis-screenshot-clean-${sessionId}.png`,
        data: gisScreenshots.cropMode0,
        cropMode: '0'
      })
    }
    
    if (gisScreenshots.cropMode1) {
      imagesToSave.push({
        type: 'סקרין שוט תצ״א',
        filename: `gis-screenshot-taba-${sessionId}.png`,
        data: gisScreenshots.cropMode1,
        cropMode: '1'
      })
    }

    for (const img of imagesToSave) {
      const savepointName = `sp_image_${img.cropMode || 'unknown'}`
      try {
        // Create savepoint for this image so errors don't abort entire transaction
        await client.query(`SAVEPOINT ${savepointName}`)
        
        const dataSize = img.data ? img.data.length : 0
        console.log(`💾 Processing image: ${img.filename}, base64 size: ${dataSize} characters`)
        
        // Save image to file storage instead of storing base64 in DB
        let imageUrl = null
        try {
          const fileResult = await this._saveBase64ImageToFile(img.data, sessionId, img.filename)
          imageUrl = fileResult.url
          console.log(`✅ Image saved to file storage: ${imageUrl}`)
        } catch (fileError) {
          console.error(`❌ Failed to save image file:`, fileError.message)
          // Fallback: continue without file URL (save will continue with URL as null)
        }
        
        // CRITICAL FIX: Check if image URL already exists for this session/image_type
        // This prevents overwriting existing images when saving the same screenshot multiple times
        const imageType = this._truncateString(img.type || 'gis_screenshot', 50)
        const existingCheck = await client.query(`
          SELECT id, image_url FROM images 
          WHERE session_id = $1 AND image_type = $2
          LIMIT 1
        `, [sessionId, imageType])
        
        // If image exists and URL is the same, skip update to prevent deletion/overwrite
        if (existingCheck.rows.length > 0 && existingCheck.rows[0].image_url === imageUrl) {
          console.log(`⏭️ Image already exists with same URL, skipping update: ${img.filename}`)
          await client.query(`RELEASE SAVEPOINT ${savepointName}`)
          continue
        }
        
        // If existing record has a different URL, we'll update it (old file will remain in storage)
        // In production, you might want to delete the old file, but that's handled separately
        const metadataJson = JSON.stringify({
          filename: img.filename,
          mapType: img.mapType,
          cropMode: img.cropMode,
          timestamp: new Date().toISOString(),
          storedAs: 'file',
          originalSize: dataSize
        })
        
        // CRITICAL: Don't set updated_at as the column doesn't exist in images table
        const updateResult = await client.query(`
          UPDATE images 
          SET 
            image_data = NULL,
            image_url = $1,
            metadata = $2
          WHERE session_id = $3 AND image_type = $4
        `, [
          imageUrl,
          metadataJson,
          sessionId,
          imageType
        ])
        
        // If no rows were updated, insert new record
        if (updateResult.rowCount === 0) {
          await client.query(`
            INSERT INTO images (
              shuma_id,
              session_id,
              image_type,
              image_data,
              image_url,
              metadata
            ) VALUES ($1, $2, $3, NULL, $4, $5)
          `, [
            shumaId,
            sessionId,
            imageType,
            imageUrl,
            metadataJson
          ])
        }
        
        // Release savepoint on success
        await client.query(`RELEASE SAVEPOINT ${savepointName}`)
        console.log(`✅ Successfully saved image metadata: ${img.filename} (URL: ${imageUrl})`)
      } catch (imgError) {
        // Rollback to savepoint to continue with other images
        try {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`)
        } catch (rollbackError) {
          console.error(`❌ Failed to rollback to savepoint:`, rollbackError.message)
        }
        console.error(`❌ Error saving individual image ${img.filename}:`, imgError.message)
        console.error(`❌ Image error stack:`, imgError.stack)
        // Continue with other images even if one fails
        continue
      }
    }
  }

  /**
   * Load shuma data for wizard
   * Uses in-memory cache to reduce repeated database queries
   */
  static async loadShumaForWizard(sessionId, skipCache = false) {
    try {
      // Check cache first (unless explicitly skipped)
      if (!skipCache) {
        const cached = shumaCache.get(sessionId)
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
          return cached.data
        }
      }

      const result = await db.query(`
        SELECT * FROM shuma WHERE session_id = $1
      `, [sessionId])

      if (result.rows.length === 0) {
        const notFound = { error: 'Shuma not found' }
        // Cache not found result briefly to avoid repeated queries
        shumaCache.set(sessionId, { data: notFound, timestamp: Date.now() })
        return notFound
      }

      const shuma = result.rows[0]
      
      // Convert database data back to ValuationData format
      // Optimize JSON parsing: only parse strings, use already-parsed objects
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
        
        // Document Uploads (optimized JSON parsing)
        propertyImages: safeParseJSON(shuma.property_images, []),
        selectedImageIndex: shuma.selected_image_index || 0,
        selectedImagePreview: shuma.selected_image_preview || null,
        interiorImages: safeParseJSON(shuma.interior_images, []),
        
        // Signature
        signaturePreview: shuma.signature_preview || null,
        
        // Analysis data (optimized JSON parsing)
        propertyAnalysis: safeParseJSON(shuma.property_analysis, {}),
        marketAnalysis: safeParseJSON(shuma.market_analysis, {}),
        // Also populate comparableDataAnalysis from marketAnalysis for frontend compatibility
        comparableDataAnalysis: safeParseJSON(shuma.market_analysis, {}),
        riskAssessment: safeParseJSON(shuma.risk_assessment, {}),
        recommendations: safeParseJSON(shuma.recommendations, []),
        
        // Extracted data
        extractedData: safeParseJSON(shuma.extracted_data, {}),
        
        // Calculations
        comparableData: safeParseJSON(shuma.comparable_data, []),
        finalValuation: parseFloat(shuma.final_valuation) || 0,
        pricePerSqm: parseFloat(shuma.price_per_sqm) || 0,
        
        // Status
        isComplete: shuma.is_complete || false,
        sessionId: shuma.session_id,
        
        // Uploads
        uploads: safeParseJSON(shuma.uploads, []),
        
        // GIS Analysis
        gisAnalysis: safeParseJSON(shuma.gis_analysis, {}),
        
        // GIS Screenshots
        gisScreenshots: safeParseJSON(shuma.gis_screenshots, {}),
        
        // Garmushka Measurements
        garmushkaMeasurements: safeParseJSON(shuma.garmushka_measurements, {})
      }

      const resultData = { valuationData, success: true }
      
      // Cache the result
      shumaCache.set(sessionId, { data: resultData, timestamp: Date.now() })
      
      return resultData
    } catch (error) {
      console.error('Error loading shuma for wizard:', error)
      return { error: 'Failed to load shuma' }
    }
  }
  
  /**
   * Clear cache for a session (call after saving to ensure fresh data)
   */
  static clearShumaCache(sessionId) {
    if (sessionId) {
      shumaCache.delete(sessionId)
    } else {
      shumaCache.clear()
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
      let mergedScreenshots = {
        ...existingScreenshots,
        ...gisData
      }
      
      // Process screenshots - convert base64 to URLs if needed (frontend now sends URLs directly)
      const processedScreenshots = {}
      for (const [key, value] of Object.entries(mergedScreenshots)) {
        if (typeof value === 'string') {
          // If it's already a URL (from file storage), use it directly
          if (value.startsWith('/api/files/') || value.startsWith('http://') || value.startsWith('https://')) {
            processedScreenshots[key] = value // Already a URL, no conversion needed
            console.log(`✅ ${key} is already a URL: ${value.substring(0, 50)}...`)
          } else if (value.startsWith('data:image')) {
            // It's base64 - convert to file (for backwards compatibility)
            const filename = `gis-screenshot-${key === 'cropMode0' ? 'clean' : 'taba'}-${sessionId}.png`
            try {
              const fileResult = await this._saveBase64ImageToFile(value, sessionId, filename)
              processedScreenshots[key] = fileResult.url // Store URL instead of base64
              console.log(`✅ Converted ${key} from base64 to file URL: ${fileResult.url}`)
            } catch (fileError) {
              console.warn(`⚠️ Failed to convert ${key} to file, keeping original:`, fileError.message)
              processedScreenshots[key] = value // Fallback to original if file save fails
            }
          } else {
            // Other string value, keep as-is
            processedScreenshots[key] = value
          }
        } else {
          // Non-string value, keep as-is
          processedScreenshots[key] = value
        }
      }
      
      console.log('📸 GIS Data Save:', {
        sessionId,
        existing: existingScreenshots,
        new: gisData,
        processed: processedScreenshots
      })
      
      // Update shuma table with processed screenshots (URLs instead of base64)
      const mergedJson = JSON.stringify(processedScreenshots)
      console.log(`📊 Processed JSON size: ${mergedJson.length} characters (much smaller than base64!)`)
      
      try {
        await client.query(`
          UPDATE shuma SET
            gis_screenshots = $1,
            updated_at = NOW()
          WHERE session_id = $2
        `, [mergedJson, sessionId])
        console.log('✅ Updated shuma table with GIS screenshots')
      } catch (updateError) {
        console.error('❌ Error updating shuma table:', updateError.message)
        throw updateError
      }
      
      // Save to images table - files are already saved, just store URLs and metadata
      // Use processedScreenshots which has URLs, not base64
      try {
        await this._saveGISScreenshotsWithUrls(client, shumaId, sessionId, processedScreenshots, mergedScreenshots)
        console.log('✅ Saved GIS screenshots metadata to images table')
      } catch (imagesError) {
        console.error('❌ Error saving to images table:', imagesError.message)
        // Don't fail the entire operation if images table save fails
        // The main data is already in shuma.gis_screenshots
        console.warn('⚠️ Continuing despite images table error')
      }
      
      await client.query('COMMIT')
      return { success: true }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('❌ Error saving GIS data:', error)
      console.error('❌ Error stack:', error.stack)
      return { error: error.message || 'Failed to save GIS data' }
    } finally {
      client.release()
    }
  }

  /**
   * Save Garmushka data to shuma + garmushka table
   * Converts base64 pngExport to file URL before saving
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
      
      // Process pngExport: convert base64 to file URL if needed
      let processedGarmushkaData = { ...garmushkaData }
      
      if (garmushkaData.pngExport && typeof garmushkaData.pngExport === 'string') {
        // If it's already a URL, use it directly
        if (garmushkaData.pngExport.startsWith('/api/files/') || 
            garmushkaData.pngExport.startsWith('http://') || 
            garmushkaData.pngExport.startsWith('https://')) {
          console.log('✅ Garmushka pngExport is already a URL:', garmushkaData.pngExport.substring(0, 50))
          processedGarmushkaData.pngExport = garmushkaData.pngExport
        } else if (garmushkaData.pngExport.startsWith('data:image')) {
          // It's base64 - convert to file
          const filename = `garmushka-export-${sessionId}.png`
          try {
            const fileResult = await this._saveBase64ImageToFile(garmushkaData.pngExport, sessionId, filename)
            processedGarmushkaData.pngExport = fileResult.url // Store URL instead of base64
            console.log(`✅ Converted Garmushka pngExport from base64 to file URL: ${fileResult.url}`)
          } catch (fileError) {
            console.warn(`⚠️ Failed to convert Garmushka pngExport to file, keeping original:`, fileError.message)
            processedGarmushkaData.pngExport = garmushkaData.pngExport // Fallback to original
          }
        }
      }
      
      // Update shuma table with processed data (may contain URL instead of base64)
      await client.query(`
        UPDATE shuma SET
          garmushka_measurements = $1,
          updated_at = NOW()
        WHERE session_id = $2
      `, [JSON.stringify(processedGarmushkaData), sessionId])
      
      // Save to garmushka table (with processed pngExport as URL)
      await this._saveGarmushkaData(client, shumaId, sessionId, processedGarmushkaData)
      
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
      // Production schema has shuma_id and session_id, not filename
      const result = await client.query(`
        INSERT INTO shared_building_order (
          shuma_id, session_id,
          building_description, building_description_confidence,
          number_of_floors, number_of_floors_confidence,
          number_of_units, number_of_units_confidence,
          common_areas, common_areas_confidence,
          raw_extraction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        shumaId,
        sessionId,
        sharedBuildingData.buildingDescription || sharedBuildingData.building_description,
        this._validateConfidence(sharedBuildingData.buildingDescriptionConfidence || sharedBuildingData.confidence, 0.95),
        this._parseFloorsToInteger(sharedBuildingData.buildingFloors || sharedBuildingData.building_floors),
        this._validateConfidence(sharedBuildingData.buildingFloorsConfidence || sharedBuildingData.confidence, 0.95),
        sharedBuildingData.buildingSubPlotsCount || sharedBuildingData.building_sub_plots_count || sharedBuildingData.total_sub_plots,
        this._validateConfidence(sharedBuildingData.buildingSubPlotsCountConfidence || sharedBuildingData.confidence, 0.95),
        sharedBuildingData.buildingAddress || sharedBuildingData.building_address || null,
        this._validateConfidence(sharedBuildingData.confidence, 0.95),
        JSON.stringify(sharedBuildingData) // Store all raw data
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