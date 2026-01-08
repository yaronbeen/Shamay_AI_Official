/**
 * Provenance API Routes
 * Handles fetching and updating field provenance data
 */

const express = require('express')
const router = express.Router()
const db = require('../config/database')
const logger = require('../config/logger')

/**
 * GET /api/provenance?sessionId=xxx&fieldPath=xxx
 * Fetch provenance records for a session (optionally filtered by field)
 */
router.get('/', async (req, res) => {
  try {
    const { sessionId, fieldPath } = req.query
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId is required' 
      })
    }
    
    const client = await db.getClient()
    
    try {
      let query = `
        SELECT 
          id,
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
          created_by,
          created_at,
          updated_at
        FROM field_provenance
        WHERE session_id = $1
      `
      
      const params = [sessionId]
      let paramCount = 2
      
      // Optional filter by field path
      if (fieldPath) {
        query += ` AND field_path = $${paramCount}`
        params.push(fieldPath)
        paramCount++
      }
      
      // Only return active provenance by default (can be overridden)
      query += ` AND is_active = true`
      
      query += ` ORDER BY field_path, version_number DESC, created_at DESC`
      
      const result = await client.query(query, params)
      
      // Group by field_path for easier frontend consumption
      const grouped = {}
      result.rows.forEach(row => {
        if (!grouped[row.field_path]) {
          grouped[row.field_path] = []
        }
        grouped[row.field_path].push({
          id: row.id,
          shumaId: row.shuma_id,
          sessionId: row.session_id,
          fieldPath: row.field_path,
          fieldValue: row.field_value,
          documentId: row.document_id,
          documentName: row.document_name,
          documentType: row.document_type,
          documentUrl: row.document_url,
          pageNumber: row.page_number,
          bbox: row.bbox,
          confidence: parseFloat(row.confidence) || 0,
          extractionMethod: row.extraction_method,
          modelUsed: row.model_used,
          isActive: row.is_active,
          versionNumber: row.version_number,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })
      })
      
      res.json({
        success: true,
        data: grouped,
        count: result.rows.length
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    logger.error('Error fetching provenance:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch provenance'
    })
  }
})

/**
 * POST /api/provenance
 * Create or update provenance record
 * Body: {
 *   sessionId, fieldPath, fieldValue, documentId, documentName, 
 *   documentType, documentUrl, pageNumber, bbox, confidence, 
 *   extractionMethod, modelUsed, isActive?, versionNumber?
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      fieldPath,
      fieldValue,
      documentId,
      documentName,
      documentType,
      documentUrl,
      pageNumber,
      bbox,
      confidence,
      extractionMethod,
      modelUsed,
      isActive = true,
      versionNumber,
      createdBy = 'system'
    } = req.body
    
    // Validation
    if (!sessionId || !fieldPath || !pageNumber || !bbox) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, fieldPath, pageNumber, bbox'
      })
    }
    
    // Validate bbox structure
    if (!bbox.x !== undefined || !bbox.y !== undefined || 
        !bbox.width !== undefined || !bbox.height !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'bbox must have {x, y, width, height} structure'
      })
    }
    
    const client = await db.getClient()
    
    try {
      await client.query('BEGIN')
      
      // Get shuma_id from session_id
      const shumaResult = await client.query(
        'SELECT id FROM shuma WHERE session_id = $1 LIMIT 1',
        [sessionId]
      )
      
      const shumaId = shumaResult.rows[0]?.id || null
      
      // Determine version number
      let finalVersionNumber = versionNumber
      if (!finalVersionNumber) {
        const versionResult = await client.query(
          `SELECT MAX(version_number) as max_version 
           FROM field_provenance 
           WHERE session_id = $1 AND field_path = $2`,
          [sessionId, fieldPath]
        )
        finalVersionNumber = (versionResult.rows[0]?.max_version || 0) + 1
      }
      
      // If this is a manual correction, mark previous versions as inactive
      if (extractionMethod === 'manual' || extractionMethod === 'user_corrected') {
        await client.query(
          `UPDATE field_provenance 
           SET is_active = false 
           WHERE session_id = $1 AND field_path = $2 AND is_active = true`,
          [sessionId, fieldPath]
        )
      }
      
      // Insert new provenance record
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
        ) RETURNING id, created_at
      `
      
      const insertResult = await client.query(insertQuery, [
        shumaId,
        sessionId,
        fieldPath,
        fieldValue || null,
        documentId || null,
        documentName || null,
        documentType || null,
        documentUrl || null,
        pageNumber,
        JSON.stringify(bbox),
        confidence || 0,
        extractionMethod || 'manual',
        modelUsed || null,
        isActive,
        finalVersionNumber,
        createdBy
      ])
      
      await client.query('COMMIT')
      
      res.json({
        success: true,
        data: {
          id: insertResult.rows[0].id,
          sessionId,
          fieldPath,
          versionNumber: finalVersionNumber,
          createdAt: insertResult.rows[0].created_at
        }
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    logger.error('Error creating provenance:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create provenance'
    })
  }
})

/**
 * PUT /api/provenance/:id
 * Update existing provenance record (e.g., manual bbox correction)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    // Only allow updating specific fields
    const allowedUpdates = [
      'bbox', 'page_number', 'document_id', 'document_name', 
      'document_url', 'confidence', 'field_value', 'is_active'
    ]
    
    const updateFields = []
    const values = []
    let paramCount = 1
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'bbox') {
          updateFields.push(`${key} = $${paramCount}::jsonb`)
          values.push(JSON.stringify(value))
        } else {
          updateFields.push(`${key} = $${paramCount}`)
          values.push(value)
        }
        paramCount++
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      })
    }
    
    values.push(id) // Add id as last parameter
    
    const client = await db.getClient()
    
    try {
      const updateQuery = `
        UPDATE field_provenance 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING id, field_path, session_id, updated_at
      `
      
      const result = await client.query(updateQuery, values)
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Provenance record not found'
        })
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    logger.error('Error updating provenance:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update provenance'
    })
  }
})

/**
 * DELETE /api/provenance/:id
 * Soft delete provenance record (set is_active = false)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const client = await db.getClient()
    
    try {
      const result = await client.query(
        `UPDATE field_provenance 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, field_path, session_id`,
        [id]
      )
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Provenance record not found'
        })
      }
      
      res.json({
        success: true,
        message: 'Provenance record deactivated'
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    logger.error('Error deleting provenance:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete provenance'
    })
  }
})

module.exports = router

