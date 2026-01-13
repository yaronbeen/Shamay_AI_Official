/**
 * Extraction Service
 *
 * Handles document extraction operations including saving extraction results
 * to dedicated tables (permits, land registry, shared building orders),
 * retrieving extraction history, and managing extraction lifecycle.
 *
 * @module services/ExtractionService
 */

const { db, safeParseJSON } = require("./DatabaseClient");

/**
 * Helper function to format dates for PostgreSQL
 * @param {string} dateString - Date string to format
 * @returns {string|null} Formatted date (YYYY-MM-DD) or null
 */
function formatDateForDB(dateString) {
  if (!dateString) return null;
  if (dateString === "") return null;

  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Try to parse and format the date
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  } catch (error) {
    console.warn("Invalid date format:", dateString);
    return null;
  }
}

/**
 * Extraction Service - Document Extraction Management
 */
class ExtractionService {
  /**
   * Validate confidence values to prevent NaN errors
   * @param {number|string} value - Confidence value
   * @param {number} defaultValue - Default value if invalid
   * @returns {number} Valid confidence value between 0 and 1
   */
  static _validateConfidence(value, defaultValue) {
    if (
      value === null ||
      value === undefined ||
      isNaN(value) ||
      value === "NaN"
    ) {
      return defaultValue;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return defaultValue;
    }
    return Math.max(0, Math.min(1, numValue)); // Clamp between 0 and 1
  }

  /**
   * Truncate string to fit in varchar field
   * @param {string} value - String to truncate
   * @param {number} maxLength - Maximum length (default 255)
   * @returns {string|null} Truncated string or null
   */
  static _truncateString(value, maxLength = 255) {
    if (!value) return null;
    const str = String(value);
    return str.length > maxLength ? str.substring(0, maxLength) : str;
  }

  /**
   * Parse floor value to integer, handling ranges like "8-9" by taking the first number
   * @param {string|number} floorsValue - Floor value to parse
   * @returns {number|null} Parsed integer or null
   */
  static _parseFloorsToInteger(floorsValue) {
    if (!floorsValue) return null;

    // Handle string values like "8-9" by extracting the first number
    if (typeof floorsValue === "string") {
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
    if (typeof floorsValue === "number") {
      return floorsValue;
    }

    return null;
  }

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
   * Save building permit data to building_permit_extracts table.
   *
   * Saves extracted permit data to the dedicated extraction table with
   * confidence scores, then updates the shuma table with the permit
   * reference ID and key fields.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} permitData - Extracted permit data
   * @param {string} [permitData.permitNumber] - Permit number
   * @param {number} [permitData.permitNumberConfidence] - Confidence (0-1)
   * @param {string} [permitData.permitDate] - Permit date
   * @param {number} [permitData.permitDateConfidence] - Confidence (0-1)
   * @param {string} [permitData.permittedUsage] - Permitted use/usage
   * @param {string} [permitData.permittedUse] - Alias for permittedUsage
   * @param {number} [permitData.permittedUsageConfidence] - Confidence (0-1)
   * @param {string} [permitData.buildingDescription] - Building description
   * @param {number} [permitData.buildingDescriptionConfidence] - Confidence (0-1)
   * @param {string} [permitData.processingMethod] - Processing method (default: 'openai')
   * @param {string} [documentFilename] - Source document filename/path
   *
   * @returns {Promise<{success: boolean, permitId?: number, error?: string}>}
   */
  static async savePermitExtraction(sessionId, permitData, documentFilename) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma ID
      const shumaResult = await client.query(
        "SELECT id FROM shuma WHERE session_id = $1",
        [sessionId],
      );
      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }
      const shumaId = shumaResult.rows[0].id;

      // Insert into building_permit_extracts
      const result = await client.query(
        `
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
      `,
        [
          shumaId,
          sessionId,
          this._truncateString(permitData.permitNumber, 255),
          this._validateConfidence(permitData.permitNumberConfidence, 0.95),
          formatDateForDB(permitData.permitDate),
          this._validateConfidence(permitData.permitDateConfidence, 0.95),
          this._truncateString(
            permitData.permittedUsage || permitData.permittedUse,
            255,
          ),
          this._validateConfidence(
            permitData.permittedUsageConfidence ||
              permitData.permittedUseConfidence,
            0.95,
          ),
          permitData.buildingDescription, // TEXT field, no truncation needed
          this._validateConfidence(
            permitData.buildingDescriptionConfidence,
            0.95,
          ),
          documentFilename, // Can be TEXT if path is long
          this._truncateString(permitData.processingMethod || "openai", 50),
        ],
      );

      const permitId = result.rows[0].id;

      // Update shuma with extracted permit data AND reference
      await client.query(
        `
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
      `,
        [
          permitData.permitNumber,
          formatDateForDB(permitData.permitDate),
          permitId,
          shumaId,
        ],
      );

      await client.query("COMMIT");
      return { success: true, permitId };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving permit extraction:", error);
      return { error: error.message || "Failed to save permit extraction" };
    } finally {
      client.release();
    }
  }

  /**
   * Save land registry data to land_registry_extracts table.
   *
   * Saves extracted land registry (tabu) data to the dedicated extraction
   * table with confidence scores, then updates the shuma table with the
   * registry reference ID and key fields (gush, parcel, sub_parcel).
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} landRegistryData - Extracted land registry data
   * @param {string} [landRegistryData.gush] - Block number (gush)
   * @param {number} [landRegistryData.gushConfidence] - Confidence (0-1)
   * @param {string} [landRegistryData.parcel] - Parcel number (chelka)
   * @param {number} [landRegistryData.parcelConfidence] - Confidence (0-1)
   * @param {string} [landRegistryData.subParcel] - Sub-parcel number
   * @param {number} [landRegistryData.subParcelConfidence] - Confidence (0-1)
   * @param {string} [landRegistryData.registeredArea] - Registered area
   * @param {number} [landRegistryData.registeredAreaConfidence] - Confidence (0-1)
   * @param {string} [landRegistryData.registrationOffice] - Registration office
   * @param {number} [landRegistryData.registrationOfficeConfidence] - Confidence (0-1)
   * @param {string} [landRegistryData.ownershipType] - Type of ownership
   * @param {number} [landRegistryData.ownershipTypeConfidence] - Confidence (0-1)
   * @param {string} [landRegistryData.attachments] - Attachments info
   * @param {number} [landRegistryData.attachmentsConfidence] - Confidence (0-1)
   * @param {string} [documentFilename] - Source document filename/path
   *
   * @returns {Promise<{success: boolean, landRegistryId?: number, error?: string}>}
   */
  static async saveLandRegistryExtraction(
    sessionId,
    landRegistryData,
    documentFilename,
  ) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma ID
      const shumaResult = await client.query(
        "SELECT id FROM shuma WHERE session_id = $1",
        [sessionId],
      );
      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }
      const shumaId = shumaResult.rows[0].id;

      // Insert into land_registry_extracts
      const result = await client.query(
        `
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
      `,
        [
          shumaId,
          sessionId,
          documentFilename,
          landRegistryData.gush || null,
          this._validateConfidence(landRegistryData.gushConfidence, 0.95),
          landRegistryData.parcel || null,
          this._validateConfidence(landRegistryData.parcelConfidence, 0.95),
          landRegistryData.subParcel || null,
          this._validateConfidence(landRegistryData.subParcelConfidence, 0.95),
          landRegistryData.registeredArea || null,
          this._validateConfidence(
            landRegistryData.registeredAreaConfidence,
            0.95,
          ),
          landRegistryData.registrationOffice || null,
          this._validateConfidence(
            landRegistryData.registrationOfficeConfidence,
            0.95,
          ),
          landRegistryData.ownershipType || null,
          this._validateConfidence(
            landRegistryData.ownershipTypeConfidence,
            0.95,
          ),
          landRegistryData.attachments || null,
          this._validateConfidence(
            landRegistryData.attachmentsConfidence,
            0.95,
          ),
          JSON.stringify(landRegistryData),
        ],
      );

      const landRegistryId = result.rows[0].id;

      // Update shuma with extracted data AND reference
      await client.query(
        `
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
      `,
        [
          landRegistryData.gush,
          landRegistryData.parcel,
          landRegistryData.subParcel,
          landRegistryData.registeredArea,
          landRegistryId,
          shumaId,
        ],
      );

      await client.query("COMMIT");
      return { success: true, landRegistryId };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving land registry extraction:", error);
      return {
        error: error.message || "Failed to save land registry extraction",
      };
    } finally {
      client.release();
    }
  }

  /**
   * Save shared building order data to shared_building_order table.
   *
   * Saves extracted shared building order (tzav bayit meshutaf) data to the
   * dedicated table with confidence scores, then updates the shuma table
   * with the reference ID and key fields.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} sharedBuildingData - Extracted shared building data
   * @param {string} [sharedBuildingData.buildingDescription] - Building description
   * @param {string} [sharedBuildingData.building_description] - Alias
   * @param {number} [sharedBuildingData.buildingDescriptionConfidence] - Confidence (0-1)
   * @param {string|number} [sharedBuildingData.buildingFloors] - Number of floors
   * @param {string|number} [sharedBuildingData.building_floors] - Alias
   * @param {number} [sharedBuildingData.buildingFloorsConfidence] - Confidence (0-1)
   * @param {number} [sharedBuildingData.buildingSubPlotsCount] - Number of units
   * @param {number} [sharedBuildingData.building_sub_plots_count] - Alias
   * @param {number} [sharedBuildingData.total_sub_plots] - Alias
   * @param {number} [sharedBuildingData.buildingSubPlotsCountConfidence] - Confidence (0-1)
   * @param {string} [sharedBuildingData.buildingAddress] - Building address (common areas)
   * @param {string} [sharedBuildingData.building_address] - Alias
   * @param {number} [sharedBuildingData.confidence] - General confidence (0-1)
   * @param {string} [documentFilename] - Source document filename/path
   *
   * @returns {Promise<{success: boolean, sharedBuildingId?: number, error?: string}>}
   */
  static async saveSharedBuildingExtraction(
    sessionId,
    sharedBuildingData,
    documentFilename,
  ) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma ID
      const shumaResult = await client.query(
        "SELECT id FROM shuma WHERE session_id = $1",
        [sessionId],
      );
      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }
      const shumaId = shumaResult.rows[0].id;

      // Insert into shared_building_order
      // Production schema has shuma_id and session_id, not filename
      const result = await client.query(
        `
        INSERT INTO shared_building_order (
          shuma_id, session_id,
          building_description, building_description_confidence,
          number_of_floors, number_of_floors_confidence,
          number_of_units, number_of_units_confidence,
          common_areas, common_areas_confidence,
          raw_extraction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
        [
          shumaId,
          sessionId,
          sharedBuildingData.buildingDescription ||
            sharedBuildingData.building_description,
          this._validateConfidence(
            sharedBuildingData.buildingDescriptionConfidence ||
              sharedBuildingData.confidence,
            0.95,
          ),
          this._parseFloorsToInteger(
            sharedBuildingData.buildingFloors ||
              sharedBuildingData.building_floors,
          ),
          this._validateConfidence(
            sharedBuildingData.buildingFloorsConfidence ||
              sharedBuildingData.confidence,
            0.95,
          ),
          sharedBuildingData.buildingSubPlotsCount ||
            sharedBuildingData.building_sub_plots_count ||
            sharedBuildingData.total_sub_plots,
          this._validateConfidence(
            sharedBuildingData.buildingSubPlotsCountConfidence ||
              sharedBuildingData.confidence,
            0.95,
          ),
          sharedBuildingData.buildingAddress ||
            sharedBuildingData.building_address ||
            null,
          this._validateConfidence(sharedBuildingData.confidence, 0.95),
          JSON.stringify(sharedBuildingData), // Store all raw data
        ],
      );

      const sharedBuildingId = result.rows[0].id;

      // Update shuma with extracted data AND reference
      await client.query(
        `
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
      `,
        [
          sharedBuildingData.buildingDescription,
          sharedBuildingData.buildingFloors,
          sharedBuildingData.totalSubPlots,
          sharedBuildingId,
          shumaId,
        ],
      );

      await client.query("COMMIT");
      return { success: true, sharedBuildingId };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving shared building extraction:", error);
      return {
        error: error.message || "Failed to save shared building extraction",
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all extracted data for a session (from all tables).
   *
   * Retrieves extracted data from all dedicated extraction tables
   * (land_registry_extracts, building_permit_extracts, shared_building_order,
   * garmushka) using the reference IDs stored in shuma.extracted_data.
   *
   * @param {string} sessionId - Session identifier
   *
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   * @returns {Object} data.landRegistry - Land registry extraction data or null
   * @returns {Object} data.buildingPermit - Building permit extraction data or null
   * @returns {Object} data.sharedBuilding - Shared building order data or null
   * @returns {Object} data.garmushka - Garmushka measurements data or null
   */
  static async getAllExtractedData(sessionId) {
    try {
      // Get shuma
      const shumaResult = await db.query(
        "SELECT id, extracted_data FROM shuma WHERE session_id = $1",
        [sessionId],
      );
      if (shumaResult.rows.length === 0) {
        return { error: "Shuma not found" };
      }

      const shuma = shumaResult.rows[0];
      const extractedDataRefs = shuma.extracted_data || {};

      // Get related extractions
      const allData = {
        landRegistry: null,
        buildingPermit: null,
        sharedBuilding: null,
        garmushka: null,
      };

      // Load land registry if reference exists
      if (extractedDataRefs.landRegistryId) {
        const result = await db.query(
          "SELECT * FROM land_registry_extracts WHERE id = $1",
          [extractedDataRefs.landRegistryId],
        );
        allData.landRegistry = result.rows[0] || null;
      }

      // Load building permit if reference exists
      if (extractedDataRefs.buildingPermitId) {
        const result = await db.query(
          "SELECT * FROM building_permit_extracts WHERE id = $1",
          [extractedDataRefs.buildingPermitId],
        );
        allData.buildingPermit = result.rows[0] || null;
      }

      // Load shared building if reference exists
      if (extractedDataRefs.sharedBuildingId) {
        const result = await db.query(
          "SELECT * FROM shared_building_order WHERE id = $1",
          [extractedDataRefs.sharedBuildingId],
        );
        allData.sharedBuilding = result.rows[0] || null;
      }

      // Load garmushka if reference exists
      if (extractedDataRefs.garmushkaId) {
        const result = await db.query("SELECT * FROM garmushka WHERE id = $1", [
          extractedDataRefs.garmushkaId,
        ]);
        allData.garmushka = result.rows[0] || null;
      }

      return { success: true, data: allData };
    } catch (error) {
      console.error("Error getting all extracted data:", error);
      return { error: error.message || "Failed to get extracted data" };
    }
  }
}

module.exports = ExtractionService;
