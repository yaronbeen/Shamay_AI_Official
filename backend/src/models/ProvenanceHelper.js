/**
 * Provenance Helper Functions
 * Automatically creates provenance records from AI extraction results
 */

const db = require('../config/database')
const logger = require('../config/logger')

/**
 * Create provenance records from AI extraction results
 * @param {string} sessionId - Session ID
 * @param {Object} extractedFields - Extracted fields (e.g., { gush: "9905", chelka: "42", ... })
 * @param {Object} metadata - Metadata about the extraction
 * @param {string} metadata.documentId - Document ID from uploads
 * @param {string} metadata.documentName - Document name
 * @param {string} metadata.documentType - Document type (tabu, permit, condo)
 * @param {string} metadata.documentUrl - Document URL
 * @param {Object} metadata.confidenceScores - Confidence scores per field (optional)
 * @param {string} metadata.extractionMethod - 'ai_auto' or 'manual'
 * @param {string} metadata.modelUsed - AI model used (e.g., 'claude-3-5-sonnet')
 * @param {number} metadata.defaultPage - Default page number (default: 1)
 * @returns {Promise<{success: boolean, recordsCreated: number, errors?: Array}>}
 */
async function createProvenanceFromAIExtraction(sessionId, extractedFields, metadata = {}) {
  const {
    documentId,
    documentName,
    documentType,
    documentUrl,
    confidenceScores = {},
    extractionMethod = 'ai_auto',
    modelUsed = 'claude-3-5-sonnet',
    defaultPage = 1
  } = metadata

  if (!sessionId || !extractedFields) {
    return {
      success: false,
      error: 'sessionId and extractedFields are required',
      recordsCreated: 0
    }
  }

  const client = await db.getClient()
  const createdRecords = []
  const errors = []

  try {
    await client.query('BEGIN')

    // Get shuma_id from session_id
    const shumaResult = await client.query(
      'SELECT id FROM shuma WHERE session_id = $1 LIMIT 1',
      [sessionId]
    )
    const shumaId = shumaResult.rows[0]?.id || null

    // Helper to flatten nested objects (e.g., land_registry.gush)
    function flattenFields(obj, prefix = '') {
      const flattened = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined || value === '') {
          continue // Skip null/empty values
        }
        
        const fieldPath = prefix ? `${prefix}.${key}` : key
        
        // If value is an object but not an array, recurse
        if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
          Object.assign(flattened, flattenFields(value, fieldPath))
        } else {
          // Store the value with its path
          flattened[fieldPath] = value
        }
      }
      return flattened
    }

    // Flatten extracted fields
    const flatFields = flattenFields(extractedFields)

    // Create provenance records for each field
    for (const [fieldPath, fieldValue] of Object.entries(flatFields)) {
      // Skip complex objects/arrays - only process simple values
      if ((typeof fieldValue === 'object' && !Array.isArray(fieldValue)) || 
          (Array.isArray(fieldValue) && fieldValue.length === 0)) {
        continue
      }

      // Convert field value to string if needed
      const valueString = Array.isArray(fieldValue) 
        ? JSON.stringify(fieldValue) 
        : String(fieldValue)

      // Get confidence for this field (from confidenceScores or use default)
      const confidence = confidenceScores[fieldPath] || 
                        confidenceScores[fieldPath.replace('.', '_')] ||
                        confidenceScores[fieldPath.split('.').pop()] ||
                        0.7 // Default confidence if not provided

      // Determine version number
      const versionResult = await client.query(
        `SELECT MAX(version_number) as max_version 
         FROM field_provenance 
         WHERE session_id = $1 AND field_path = $2`,
        [sessionId, fieldPath]
      )
      const versionNumber = (versionResult.rows[0]?.max_version || 0) + 1

      // Mark previous versions as inactive (if this is from AI extraction)
      if (extractionMethod === 'ai_auto') {
        await client.query(
          `UPDATE field_provenance 
           SET is_active = false 
           WHERE session_id = $1 AND field_path = $2 AND is_active = true AND extraction_method = 'ai_auto'`,
          [sessionId, fieldPath]
        )
      }

      // Create provenance record with approximate/unknown bbox
      // Note: Since Claude doesn't provide exact bbox coordinates,
      // we set bbox to null and page to defaultPage
      // Users can manually correct these later
      const insertQuery = `
        INSERT INTO field_provenance (
          shuma_id,
          session_id,
          field_path,
          field_value,
          document_id,
          document_name,
          document_type,
          document_url,
          page_number,
          bbox,
          confidence,
          extraction_method,
          model_used,
          is_active,
          version_number,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING id
      `

      // Use null bbox initially (user can correct via manual editing)
      const bbox = null // Will be null JSONB - user can update later

      const result = await client.query(insertQuery, [
        shumaId,
        sessionId,
        fieldPath,
        valueString,
        documentId || null,
        documentName || null,
        documentType || null,
        documentUrl || null,
        defaultPage, // Default to page 1
        JSON.stringify(bbox), // null bbox - user can correct
        Math.min(Math.max(confidence, 0), 1), // Clamp to 0-1
        extractionMethod,
        modelUsed || null,
        true, // is_active
        versionNumber,
        'system'
      ])

      createdRecords.push({
        id: result.rows[0].id,
        fieldPath,
        fieldValue: valueString,
        versionNumber
      })
    }

    await client.query('COMMIT')

    logger.info(`✅ Created ${createdRecords.length} provenance records for session ${sessionId}`)

    return {
      success: true,
      recordsCreated: createdRecords.length,
      records: createdRecords
    }

  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Error creating provenance from AI extraction:', error)
    return {
      success: false,
      error: error.message,
      recordsCreated: createdRecords.length,
      errors: errors
    }
  } finally {
    client.release()
  }
}

/**
 * Create provenance records from AI extraction result with field-level metadata
 * This version allows passing field-specific page numbers and bboxes if available
 * @param {string} sessionId - Session ID
 * @param {Object} fieldMetadata - Field metadata: { fieldPath: { value, page?, bbox?, confidence? }, ... }
 * @param {Object} documentMetadata - Document metadata
 * @returns {Promise<{success: boolean, recordsCreated: number}>}
 */
async function createProvenanceFromAIExtractionWithMetadata(sessionId, fieldMetadata, documentMetadata = {}) {
  const {
    documentId,
    documentName,
    documentType,
    documentUrl,
    extractionMethod = 'ai_auto',
    modelUsed = 'claude-3-5-sonnet'
  } = documentMetadata

  if (!sessionId || !fieldMetadata) {
    return {
      success: false,
      error: 'sessionId and fieldMetadata are required',
      recordsCreated: 0
    }
  }

  const client = await db.getClient()
  const createdRecords = []

  try {
    await client.query('BEGIN')

    // Get shuma_id from session_id
    const shumaResult = await client.query(
      'SELECT id FROM shuma WHERE session_id = $1 LIMIT 1',
      [sessionId]
    )
    const shumaId = shumaResult.rows[0]?.id || null

    for (const [fieldPath, fieldData] of Object.entries(fieldMetadata)) {
      // Handle both object format { value, page?, bbox?, confidence? } and direct value
      const value = typeof fieldData === 'object' && fieldData !== null ? fieldData.value : fieldData
      const pageNumber = (typeof fieldData === 'object' && fieldData.page !== undefined) ? fieldData.page : 1
      const bbox = (typeof fieldData === 'object' && fieldData.bbox) ? fieldData.bbox : null
      const confidence = (typeof fieldData === 'object' && fieldData.confidence !== undefined) 
        ? fieldData.confidence 
        : 0.7

      if (value === null || value === undefined || value === '') {
        continue // Skip null/empty values
      }

      const valueString = Array.isArray(value) ? JSON.stringify(value) : String(value)

      // Determine version number
      const versionResult = await client.query(
        `SELECT MAX(version_number) as max_version 
         FROM field_provenance 
         WHERE session_id = $1 AND field_path = $2`,
        [sessionId, fieldPath]
      )
      const versionNumber = (versionResult.rows[0]?.max_version || 0) + 1

      // Mark previous AI versions as inactive
      if (extractionMethod === 'ai_auto') {
        await client.query(
          `UPDATE field_provenance 
           SET is_active = false 
           WHERE session_id = $1 AND field_path = $2 AND is_active = true AND extraction_method = 'ai_auto'`,
          [sessionId, fieldPath]
        )
      }

      // Insert provenance record
      const insertQuery = `
        INSERT INTO field_provenance (
          shuma_id,
          session_id,
          field_path,
          field_value,
          document_id,
          document_name,
          document_type,
          document_url,
          page_number,
          bbox,
          confidence,
          extraction_method,
          model_used,
          is_active,
          version_number,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING id
      `

      const result = await client.query(insertQuery, [
        shumaId,
        sessionId,
        fieldPath,
        valueString,
        documentId || null,
        documentName || null,
        documentType || null,
        documentUrl || null,
        pageNumber,
        bbox ? JSON.stringify(bbox) : null,
        Math.min(Math.max(confidence, 0), 1),
        extractionMethod,
        modelUsed || null,
        true,
        versionNumber,
        'system'
      ])

      createdRecords.push({
        id: result.rows[0].id,
        fieldPath,
        valueString,
        pageNumber,
        hasBbox: bbox !== null,
        versionNumber
      })
    }

    await client.query('COMMIT')

    logger.info(`✅ Created ${createdRecords.length} provenance records with metadata for session ${sessionId}`)

    return {
      success: true,
      recordsCreated: createdRecords.length,
      records: createdRecords
    }

  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Error creating provenance with metadata:', error)
    return {
      success: false,
      error: error.message,
      recordsCreated: createdRecords.length
    }
  } finally {
    client.release()
  }
}

module.exports = {
  createProvenanceFromAIExtraction,
  createProvenanceFromAIExtractionWithMetadata
}

