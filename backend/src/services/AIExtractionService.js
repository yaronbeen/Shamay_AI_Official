/**
 * AI Extraction Service
 *
 * Handles AI-generated extraction data operations including saving extraction results,
 * retrieving extraction history, and managing extraction lifecycle.
 *
 * Extracted from ShumaDB.js for better separation of concerns.
 *
 * @module services/AIExtractionService
 */

const { db, safeParseJSON } = require("./DatabaseClient");

/**
 * AI Extraction Service - AI-Generated Extraction Management
 */
class AIExtractionService {
  /**
   * Save AI extraction result for auditing and history tracking.
   *
   * Stores raw AI response and extracted fields in the ai_extractions table.
   * Each new extraction is marked as 'active' (is_active = true).
   *
   * @param {string} sessionId - Session identifier
   * @param {string} extractionType - Type of extraction ('tabu', 'permit', 'garmushka', etc.)
   * @param {Object} aiResponse - Raw AI model response object
   * @param {Object} extractedFields - Parsed/structured fields from AI response
   * @param {Object} [metadata={}] - Additional metadata
   * @param {string} [metadata.aiModel] - AI model used (default: 'gpt-4-vision-preview')
   * @param {number} [metadata.processingCost] - Cost of processing
   * @param {number} [metadata.confidenceScore] - Confidence score (0-1)
   * @param {number} [metadata.processingTimeMs] - Processing time in milliseconds
   * @param {string} [metadata.documentFilename] - Source document filename
   * @param {string} [metadata.documentPath] - Source document path
   *
   * @returns {Promise<{success: boolean, extractionId?: number, error?: string}>}
   *
   * @example
   * const result = await AIExtractionService.saveAIExtraction(
   *   'session-123',
   *   'tabu',
   *   { raw: '...AI response...' },
   *   { gush: '1234', chelka: '56', owners: [...] },
   *   {
   *     aiModel: 'claude-3-opus',
   *     confidenceScore: 0.95,
   *     documentFilename: 'nesach-tabu.pdf'
   *   }
   * );
   */
  static async saveAIExtraction(
    sessionId,
    extractionType,
    aiResponse,
    extractedFields,
    metadata = {},
  ) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma_id if it exists
      const shumaResult = await client.query(
        "SELECT id FROM shuma WHERE session_id = $1",
        [sessionId],
      );
      const shumaId = shumaResult.rows[0]?.id || null;

      // Insert AI extraction
      const result = await client.query(
        `
        INSERT INTO ai_extractions (
          shuma_id, session_id, extraction_type,
          raw_ai_response, extracted_fields,
          ai_model, processing_cost, confidence_score, processing_time_ms,
          document_filename, document_path,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `,
        [
          shumaId,
          sessionId,
          extractionType,
          JSON.stringify(aiResponse),
          JSON.stringify(extractedFields),
          metadata.aiModel || "gpt-4-vision-preview",
          metadata.processingCost || null,
          metadata.confidenceScore || null,
          metadata.processingTimeMs || null,
          metadata.documentFilename || null,
          metadata.documentPath || null,
          true, // is_active by default
        ],
      );

      await client.query("COMMIT");

      return {
        success: true,
        extractionId: result.rows[0].id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving AI extraction:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Get all AI extractions for a session.
   *
   * Retrieves all AI extractions for a given session, optionally filtered by extraction type.
   * Results are ordered by extraction_date descending (most recent first).
   *
   * @param {string} sessionId - Session identifier
   * @param {string} [extractionType=null] - Optional type filter ('tabu', 'permit', etc.)
   *
   * @returns {Promise<{success: boolean, extractions?: Array, error?: string}>}
   */
  static async getAIExtractions(sessionId, extractionType = null) {
    const client = await db.client();

    try {
      let query = `
        SELECT * FROM ai_extractions
        WHERE session_id = $1
      `;
      const params = [sessionId];

      if (extractionType) {
        query += ` AND extraction_type = $2`;
        params.push(extractionType);
      }

      query += ` ORDER BY extraction_date DESC`;

      const result = await client.query(query, params);

      // Parse JSONB fields
      const extractions = result.rows.map((row) => ({
        ...row,
        raw_ai_response:
          typeof row.raw_ai_response === "string"
            ? JSON.parse(row.raw_ai_response)
            : row.raw_ai_response,
        extracted_fields:
          typeof row.extracted_fields === "string"
            ? JSON.parse(row.extracted_fields)
            : row.extracted_fields,
      }));

      return {
        success: true,
        extractions,
      };
    } catch (error) {
      console.error("Error getting AI extractions:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Get the most recent active AI extraction for a session and type.
   *
   * Retrieves the latest AI extraction that is marked as active (is_active = true)
   * for the given session and extraction type.
   *
   * @param {string} sessionId - Session identifier
   * @param {string} extractionType - Type of extraction ('tabu', 'permit', etc.)
   *
   * @returns {Promise<{success: boolean, extraction?: Object|null, error?: string}>}
   */
  static async getLatestAIExtraction(sessionId, extractionType) {
    const client = await db.client();

    try {
      const result = await client.query(
        `
        SELECT * FROM ai_extractions
        WHERE session_id = $1
          AND extraction_type = $2
          AND is_active = true
        ORDER BY extraction_date DESC
        LIMIT 1
      `,
        [sessionId, extractionType],
      );

      if (result.rows.length === 0) {
        return { success: true, extraction: null };
      }

      const extraction = {
        ...result.rows[0],
        raw_ai_response:
          typeof result.rows[0].raw_ai_response === "string"
            ? JSON.parse(result.rows[0].raw_ai_response)
            : result.rows[0].raw_ai_response,
        extracted_fields:
          typeof result.rows[0].extracted_fields === "string"
            ? JSON.parse(result.rows[0].extracted_fields)
            : result.rows[0].extracted_fields,
      };

      return {
        success: true,
        extraction,
      };
    } catch (error) {
      console.error("Error getting latest AI extraction:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Mark AI extraction as inactive (user has overridden the extraction).
   *
   * Sets is_active = false for the given extraction, indicating that the user
   * has manually edited or overridden the AI-extracted data.
   *
   * @param {number} extractionId - Database ID of the extraction to deactivate
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deactivateAIExtraction(extractionId) {
    const client = await db.client();

    try {
      await client.query(
        `
        UPDATE ai_extractions
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `,
        [extractionId],
      );

      return { success: true };
    } catch (error) {
      console.error("Error deactivating AI extraction:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Restore AI extraction (revert user edits to original AI-extracted values).
   *
   * Retrieves the AI extraction record, merges its extracted fields back into
   * the shuma's extractedData, saves the updated data, and reactivates the extraction.
   *
   * Note: This method depends on ValuationService for loading and saving shuma data.
   * It should be used carefully as it will overwrite user edits with AI-extracted values.
   *
   * @param {string} sessionId - Session identifier
   * @param {number} extractionId - Database ID of the extraction to restore
   *
   * @returns {Promise<{success: boolean, restoredFields?: Object, error?: string}>}
   */
  static async restoreAIExtraction(sessionId, extractionId) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get the AI extraction
      const extractionResult = await client.query(
        "SELECT * FROM ai_extractions WHERE id = $1 AND session_id = $2",
        [extractionId, sessionId],
      );

      if (extractionResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "AI extraction not found" };
      }

      const extraction = extractionResult.rows[0];
      const extractedFields =
        typeof extraction.extracted_fields === "string"
          ? JSON.parse(extraction.extracted_fields)
          : extraction.extracted_fields;

      // Load current shuma data
      // Note: This requires ValuationService - import it dynamically to avoid circular deps
      const ValuationService = require("./ValuationService");
      const loadResult = await ValuationService.loadShumaForWizard(sessionId);

      if (!loadResult.success || !loadResult.valuationData) {
        await client.query("ROLLBACK");
        return { success: false, error: "Session not found" };
      }

      // Merge AI extracted fields back into extractedData
      const updatedExtractedData = {
        ...loadResult.valuationData.extractedData,
        ...extractedFields,
      };

      // Save to shuma
      await ValuationService.saveShumaFromSession(
        sessionId,
        loadResult.valuationData.organizationId || "default-org",
        loadResult.valuationData.userId || "system",
        {
          ...loadResult.valuationData,
          extractedData: updatedExtractedData,
        },
      );

      // Reactivate this extraction
      await client.query(
        `
        UPDATE ai_extractions
        SET is_active = true, updated_at = NOW()
        WHERE id = $1
      `,
        [extractionId],
      );

      await client.query("COMMIT");

      return {
        success: true,
        restoredFields: extractedFields,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error restoring AI extraction:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
}

module.exports = AIExtractionService;
