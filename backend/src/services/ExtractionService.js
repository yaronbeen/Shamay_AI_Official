/**
 * Extraction Service
 *
 * Handles AI extraction operations including saving extraction results,
 * retrieving extraction history, and managing extraction lifecycle.
 *
 * @module services/ExtractionService
 */

const { db, safeParseJSON } = require("./DatabaseClient");

/**
 * Extraction Service - AI Extraction Management
 */
class ExtractionService {
  /**
   * Save AI extraction result for auditing and history tracking.
   *
   * Stores raw AI response and extracted fields. Each new extraction
   * is marked as 'active'. Previous extractions for same session/type
   * are automatically deactivated.
   *
   * @param {string} sessionId - Session identifier
   * @param {string} extractionType - Type: 'tabu' | 'permit' | 'garmushka' | etc.
   * @param {Object} aiResponse - Raw AI model response
   * @param {Object} extractedFields - Parsed/structured fields
   * @param {Object} [metadata={}] - Additional metadata
   *
   * @returns {Promise<{success: boolean, extractionId?: number, error?: string}>}
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

      // Deactivate previous extractions of same type
      await client.query(
        `UPDATE ai_extractions SET is_active = false
         WHERE session_id = $1 AND extraction_type = $2`,
        [sessionId, extractionType],
      );

      // Insert new extraction
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
          true,
        ],
      );

      await client.query("COMMIT");

      return { success: true, extractionId: result.rows[0].id };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving AI extraction:", error);
      return { error: error.message || "Failed to save AI extraction" };
    } finally {
      client.release();
    }
  }

  /**
   * Get all AI extractions for a session.
   *
   * @param {string} sessionId - Session identifier
   * @param {string} [extractionType] - Optional type filter
   *
   * @returns {Promise<{success: boolean, extractions?: Array, error?: string}>}
   */
  static async getAIExtractions(sessionId, extractionType = null) {
    try {
      let query = `
        SELECT id, extraction_type, extracted_fields, is_active,
               ai_model, confidence_score, document_filename,
               created_at as extraction_date
        FROM ai_extractions
        WHERE session_id = $1
      `;
      const params = [sessionId];

      if (extractionType) {
        query += " AND extraction_type = $2";
        params.push(extractionType);
      }

      query += " ORDER BY created_at DESC";

      const result = await db.query(query, params);

      return {
        success: true,
        extractions: result.rows.map((row) => ({
          id: row.id,
          extractionType: row.extraction_type,
          extractedFields: safeParseJSON(row.extracted_fields, {}),
          isActive: row.is_active,
          aiModel: row.ai_model,
          confidenceScore: row.confidence_score,
          documentFilename: row.document_filename,
          extractionDate: row.extraction_date,
        })),
      };
    } catch (error) {
      console.error("Error getting AI extractions:", error);
      return { error: error.message };
    }
  }

  /**
   * Get the latest active AI extraction for a session/type.
   *
   * @param {string} sessionId - Session identifier
   * @param {string} extractionType - Extraction type
   *
   * @returns {Promise<{success: boolean, extraction?: Object, error?: string}>}
   */
  static async getLatestAIExtraction(sessionId, extractionType) {
    try {
      const result = await db.query(
        `
        SELECT id, extracted_fields, raw_ai_response, is_active,
               ai_model, confidence_score, document_filename,
               created_at as extraction_date
        FROM ai_extractions
        WHERE session_id = $1 AND extraction_type = $2 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [sessionId, extractionType],
      );

      if (result.rows.length === 0) {
        return { success: false, error: "No extraction found" };
      }

      const row = result.rows[0];

      return {
        success: true,
        extraction: {
          id: row.id,
          extractedFields: safeParseJSON(row.extracted_fields, {}),
          rawResponse: safeParseJSON(row.raw_ai_response, {}),
          isActive: row.is_active,
          aiModel: row.ai_model,
          confidenceScore: row.confidence_score,
          documentFilename: row.document_filename,
          extractionDate: row.extraction_date,
        },
      };
    } catch (error) {
      console.error("Error getting latest AI extraction:", error);
      return { error: error.message };
    }
  }

  /**
   * Deactivate an AI extraction.
   *
   * @param {number} extractionId - Extraction ID
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deactivateAIExtraction(extractionId) {
    try {
      await db.query(
        "UPDATE ai_extractions SET is_active = false WHERE id = $1",
        [extractionId],
      );
      return { success: true };
    } catch (error) {
      console.error("Error deactivating AI extraction:", error);
      return { error: error.message };
    }
  }

  /**
   * Restore a previous AI extraction (make it active).
   *
   * @param {string} sessionId - Session identifier
   * @param {number} extractionId - Extraction ID to restore
   *
   * @returns {Promise<{success: boolean, restoredFields?: Object, error?: string}>}
   */
  static async restoreAIExtraction(sessionId, extractionId) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get the extraction to restore
      const extractionResult = await client.query(
        `SELECT extraction_type, extracted_fields FROM ai_extractions
         WHERE id = $1 AND session_id = $2`,
        [extractionId, sessionId],
      );

      if (extractionResult.rows.length === 0) {
        throw new Error("Extraction not found");
      }

      const { extraction_type, extracted_fields } = extractionResult.rows[0];
      const fields = safeParseJSON(extracted_fields, {});

      // Deactivate other extractions of same type
      await client.query(
        `UPDATE ai_extractions SET is_active = false
         WHERE session_id = $1 AND extraction_type = $2`,
        [sessionId, extraction_type],
      );

      // Activate the target extraction
      await client.query(
        "UPDATE ai_extractions SET is_active = true WHERE id = $1",
        [extractionId],
      );

      await client.query("COMMIT");

      return { success: true, restoredFields: fields };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error restoring AI extraction:", error);
      return { error: error.message || "Failed to restore extraction" };
    } finally {
      client.release();
    }
  }

  /**
   * Save permit extraction data.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} permitData - Extracted permit data
   * @param {string} [documentFilename] - Source document filename
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async savePermitExtraction(sessionId, permitData, documentFilename) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma ID
      const shumaResult = await client.query(
        "SELECT id, extracted_data FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }

      const shumaId = shumaResult.rows[0].id;
      const existingExtracted = safeParseJSON(
        shumaResult.rows[0].extracted_data,
        {},
      );

      // Merge permit data into extracted_data
      const updatedExtracted = {
        ...existingExtracted,
        building_permit: permitData,
      };

      // Update shuma
      await client.query(
        `UPDATE shuma SET extracted_data = $1, updated_at = NOW()
         WHERE session_id = $2`,
        [JSON.stringify(updatedExtracted), sessionId],
      );

      // Save to AI extractions for history
      await this.saveAIExtraction(sessionId, "permit", permitData, permitData, {
        documentFilename,
      });

      await client.query("COMMIT");

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving permit extraction:", error);
      return { error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Save land registry (tabu) extraction data.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} tabuData - Extracted tabu data
   * @param {string} [documentFilename] - Source document filename
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async saveLandRegistryExtraction(
    sessionId,
    tabuData,
    documentFilename,
  ) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma ID
      const shumaResult = await client.query(
        "SELECT id, extracted_data FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }

      const shumaId = shumaResult.rows[0].id;
      const existingExtracted = safeParseJSON(
        shumaResult.rows[0].extracted_data,
        {},
      );

      // Merge tabu data into extracted_data
      const updatedExtracted = {
        ...existingExtracted,
        land_registry: tabuData,
        // Also populate top-level fields
        gush: tabuData.gush || existingExtracted.gush,
        chelka: tabuData.chelka || existingExtracted.chelka,
        subChelka: tabuData.subChelka || existingExtracted.subChelka,
      };

      // Update shuma
      await client.query(
        `UPDATE shuma SET
          extracted_data = $1,
          gush = COALESCE($2, gush),
          parcel = COALESCE($3, parcel),
          sub_parcel = COALESCE($4, sub_parcel),
          updated_at = NOW()
         WHERE session_id = $5`,
        [
          JSON.stringify(updatedExtracted),
          tabuData.gush,
          tabuData.chelka,
          tabuData.subChelka,
          sessionId,
        ],
      );

      // Save to AI extractions for history
      await this.saveAIExtraction(sessionId, "tabu", tabuData, tabuData, {
        documentFilename,
      });

      await client.query("COMMIT");

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving land registry extraction:", error);
      return { error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Save shared building order extraction data.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} sharedBuildingData - Extracted data
   * @param {string} [documentFilename] - Source document filename
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async saveSharedBuildingExtraction(
    sessionId,
    sharedBuildingData,
    documentFilename,
  ) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      const shumaResult = await client.query(
        "SELECT id, extracted_data FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }

      const existingExtracted = safeParseJSON(
        shumaResult.rows[0].extracted_data,
        {},
      );

      const updatedExtracted = {
        ...existingExtracted,
        shared_building: sharedBuildingData,
      };

      await client.query(
        `UPDATE shuma SET extracted_data = $1, updated_at = NOW()
         WHERE session_id = $2`,
        [JSON.stringify(updatedExtracted), sessionId],
      );

      await this.saveAIExtraction(
        sessionId,
        "shared_building",
        sharedBuildingData,
        sharedBuildingData,
        { documentFilename },
      );

      await client.query("COMMIT");

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving shared building extraction:", error);
      return { error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Get all extracted data for a session (from all sources).
   *
   * @param {string} sessionId - Session identifier
   *
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  static async getAllExtractedData(sessionId) {
    try {
      const result = await db.query(
        "SELECT extracted_data FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (result.rows.length === 0) {
        return { error: "Shuma not found" };
      }

      return {
        success: true,
        data: safeParseJSON(result.rows[0].extracted_data, {}),
      };
    } catch (error) {
      console.error("Error getting all extracted data:", error);
      return { error: error.message };
    }
  }
}

module.exports = ExtractionService;
