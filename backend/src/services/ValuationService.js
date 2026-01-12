/**
 * Valuation Service
 *
 * Core CRUD operations for valuation (shuma) data.
 * Handles save, load, search, and get operations for the main shuma table.
 *
 * @module services/ValuationService
 */

const { db, cache, safeParseJSON } = require("./DatabaseClient");

/**
 * Valuation Service - Core CRUD operations
 */
class ValuationService {
  /**
   * Save complete shuma data to database.
   *
   * This is the primary save operation for valuation data. It saves to the
   * main shuma table (69+ columns) using UPSERT semantics.
   *
   * @param {Object} client - Database client (for transaction support)
   * @param {string} sessionId - Unique session identifier
   * @param {string} organizationId - Organization ID for multi-tenant isolation
   * @param {string} userId - User ID who initiated the save
   * @param {Object} valuationData - Complete valuation data object
   *
   * @returns {Promise<{shumaId: number}>} The database ID of the saved record
   */
  static async saveShumaTable(
    client,
    sessionId,
    organizationId,
    userId,
    valuationData,
  ) {
    // Get existing shuma to determine insert or update
    const existingResult = await client.query(
      "SELECT id FROM shuma WHERE session_id = $1",
      [sessionId],
    );

    const isUpdate = existingResult.rows.length > 0;
    const existingId = isUpdate ? existingResult.rows[0].id : null;

    // Build the data object for saving
    const data = {
      session_id: sessionId,
      organization_id: organizationId,
      user_id: userId,

      // Basic Property Information
      street: valuationData.street || null,
      building_number: valuationData.buildingNumber || null,
      city: valuationData.city || null,
      neighborhood: valuationData.neighborhood || null,
      full_address: valuationData.fullAddress || null,
      rooms: valuationData.rooms || null,
      floor: valuationData.floor || null,
      air_directions: valuationData.airDirections || null,
      area: valuationData.area || null,
      property_essence: valuationData.propertyEssence || null,

      // Cover Page Fields
      client_name: valuationData.clientName || null,
      client_title: valuationData.clientTitle ?? null,
      client_note: valuationData.clientNote ?? null,
      client_relation: valuationData.clientRelation ?? null,
      visit_date: valuationData.visitDate || null,
      valuation_date: valuationData.valuationDate || null,
      valuation_type: valuationData.valuationType ?? null,
      valuation_effective_date: valuationData.valuationEffectiveDate || null,
      reference_number: valuationData.referenceNumber || null,
      shamay_name: valuationData.shamayName || null,
      shamay_serial_number: valuationData.shamaySerialNumber || null,

      // Land Contamination
      land_contamination: valuationData.landContamination || false,
      land_contamination_note: valuationData.landContaminationNote || null,

      // Legal Status Fields
      gush: valuationData.gush || null,
      parcel: valuationData.parcel || null,
      parcel_area: valuationData.parcelArea || null,
      parcel_shape: valuationData.parcelShape || null,
      parcel_surface: valuationData.parcelSurface || null,
      sub_parcel: valuationData.subParcel || null,
      registered_area: valuationData.registeredArea || null,
      built_area: valuationData.builtArea || null,
      balcony_area: valuationData.balconyArea || null,
      building_permit_number: valuationData.buildingPermitNumber || null,
      building_permit_date: valuationData.buildingPermitDate || null,
      building_description: valuationData.buildingDescription || null,
      building_floors: valuationData.buildingFloors || null,
      building_units: valuationData.buildingUnits || null,
      building_details: valuationData.buildingDetails || null,
      construction_source: valuationData.constructionSource || null,
      attachments: valuationData.attachments || null,
      ownership_rights: valuationData.ownershipRights || null,
      notes: valuationData.notes || null,

      // Registry Information
      registry_office: valuationData.registryOffice || null,
      extract_date: valuationData.extractDate || null,

      // Property Description
      internal_layout: valuationData.internalLayout || null,
      finish_standard: valuationData.finishStandard || null,
      finish_details: valuationData.finishDetails || null,

      // JSONB fields
      property_images: JSON.stringify(valuationData.propertyImages || []),
      selected_image_index: valuationData.selectedImageIndex || 0,
      selected_image_preview: valuationData.selectedImagePreview || null,
      interior_images: JSON.stringify(valuationData.interiorImages || []),
      signature_preview: valuationData.signaturePreview || null,
      property_analysis: JSON.stringify(valuationData.propertyAnalysis || {}),
      market_analysis: JSON.stringify(
        valuationData.marketAnalysis ||
          valuationData.comparableDataAnalysis ||
          {},
      ),
      risk_assessment: JSON.stringify(valuationData.riskAssessment || {}),
      recommendations: JSON.stringify(valuationData.recommendations || []),
      extracted_data: JSON.stringify(valuationData.extractedData || {}),
      comparable_data: JSON.stringify(valuationData.comparableData || []),
      uploads: JSON.stringify(valuationData.uploads || []),
      gis_analysis: JSON.stringify(valuationData.gisAnalysis || {}),
      gis_screenshots: JSON.stringify(valuationData.gisScreenshots || {}),
      garmushka_measurements: JSON.stringify(
        valuationData.garmushkaMeasurements || {},
      ),
      structured_footnotes: JSON.stringify(
        valuationData.structuredFootnotes || [],
      ),

      // Calculations
      final_valuation: valuationData.finalValuation || null,
      price_per_sqm: valuationData.pricePerSqm || null,
      apartment_sqm: valuationData.apartmentSqm || null,

      // Status
      is_complete: valuationData.isComplete || false,
    };

    let shumaId;

    if (isUpdate) {
      // Update existing record
      const setClauses = Object.keys(data)
        .filter((key) => key !== "session_id")
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      const values = [
        sessionId,
        ...Object.keys(data)
          .filter((key) => key !== "session_id")
          .map((key) => data[key]),
      ];

      await client.query(
        `UPDATE shuma SET ${setClauses}, updated_at = NOW() WHERE session_id = $1`,
        values,
      );
      shumaId = existingId;
    } else {
      // Insert new record
      const columns = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = Object.values(data);

      const result = await client.query(
        `INSERT INTO shuma (${columns}) VALUES (${placeholders}) RETURNING id`,
        values,
      );
      shumaId = result.rows[0].id;
    }

    return { shumaId };
  }

  /**
   * Load shuma data for the valuation wizard.
   *
   * @param {string} sessionId - The session ID to load data for
   * @param {boolean} [skipCache=false] - Bypass cache and query DB directly
   *
   * @returns {Promise<{valuationData?: Object, success?: boolean, error?: string}>}
   */
  static async loadShumaForWizard(sessionId, skipCache = false) {
    try {
      // Check cache first
      if (!skipCache) {
        const cached = cache.get(sessionId);
        if (cached) {
          return cached;
        }
      }

      const result = await db.query(
        "SELECT * FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (result.rows.length === 0) {
        const notFound = { error: "Shuma not found" };
        cache.set(sessionId, notFound);
        return notFound;
      }

      const shuma = result.rows[0];

      // Convert to ValuationData format (snake_case to camelCase)
      const valuationData = {
        street: shuma.street || "",
        buildingNumber: shuma.building_number || "",
        city: shuma.city || "",
        neighborhood: shuma.neighborhood || "",
        fullAddress: shuma.full_address || "",
        rooms: shuma.rooms || 0,
        floor: shuma.floor || 0,
        airDirections: shuma.air_directions || "",
        area: parseFloat(shuma.area) || 0,
        propertyEssence: shuma.property_essence || "",

        clientName: shuma.client_name || "",
        clientTitle: shuma.client_title ?? "",
        clientNote: shuma.client_note ?? "",
        clientRelation: shuma.client_relation ?? "",
        visitDate: shuma.visit_date || "",
        valuationDate: shuma.valuation_date || "",
        valuationType: shuma.valuation_type ?? "",
        valuationEffectiveDate: shuma.valuation_effective_date || "",
        referenceNumber: shuma.reference_number || "",
        shamayName: shuma.shamay_name || "",
        shamaySerialNumber: shuma.shamay_serial_number || "",

        landContamination: shuma.land_contamination || false,
        landContaminationNote: shuma.land_contamination_note || "",

        gush: shuma.gush || "",
        parcel: shuma.parcel || "",
        parcelArea: parseFloat(shuma.parcel_area) || 0,
        parcelShape: shuma.parcel_shape || "",
        parcelSurface: shuma.parcel_surface || "",
        subParcel: shuma.sub_parcel || "",
        registeredArea: parseFloat(shuma.registered_area) || 0,
        builtArea: parseFloat(shuma.built_area) || 0,
        balconyArea: parseFloat(shuma.balcony_area) || 0,
        buildingPermitNumber: shuma.building_permit_number || "",
        buildingPermitDate: shuma.building_permit_date || "",
        buildingDescription: shuma.building_description || "",
        buildingFloors: shuma.building_floors || 0,
        buildingUnits: shuma.building_units || 0,
        buildingDetails: shuma.building_details || "",
        constructionSource: shuma.construction_source || "",
        attachments: shuma.attachments || "",
        ownershipRights: shuma.ownership_rights || "",
        notes: shuma.notes || "",

        registryOffice: shuma.registry_office || "",
        extractDate: shuma.extract_date || "",

        internalLayout: shuma.internal_layout || "",
        finishStandard: shuma.finish_standard || "",
        finishDetails: shuma.finish_details || "",

        propertyImages: safeParseJSON(shuma.property_images, []),
        selectedImageIndex: shuma.selected_image_index || 0,
        selectedImagePreview: shuma.selected_image_preview || null,
        interiorImages: safeParseJSON(shuma.interior_images, []),
        signaturePreview: shuma.signature_preview || null,

        propertyAnalysis: safeParseJSON(shuma.property_analysis, {}),
        marketAnalysis: safeParseJSON(shuma.market_analysis, {}),
        comparableDataAnalysis: safeParseJSON(shuma.market_analysis, {}),
        riskAssessment: safeParseJSON(shuma.risk_assessment, {}),
        recommendations: safeParseJSON(shuma.recommendations, []),

        extractedData: safeParseJSON(shuma.extracted_data, {}),
        comparableData: safeParseJSON(shuma.comparable_data, []),
        finalValuation: parseFloat(shuma.final_valuation) || 0,
        pricePerSqm: parseFloat(shuma.price_per_sqm) || 0,
        apartmentSqm: parseFloat(shuma.apartment_sqm) || 0,

        isComplete: shuma.is_complete || false,
        sessionId: shuma.session_id,

        uploads: safeParseJSON(shuma.uploads, []),
        gisAnalysis: safeParseJSON(shuma.gis_analysis, {}),
        gisScreenshots: safeParseJSON(shuma.gis_screenshots, {}),
        garmushkaMeasurements: safeParseJSON(shuma.garmushka_measurements, {}),
        structuredFootnotes: safeParseJSON(shuma.structured_footnotes, []),
      };

      const resultData = { valuationData, success: true };
      cache.set(sessionId, resultData);

      return resultData;
    } catch (error) {
      console.error("Error loading shuma for wizard:", error);
      return { error: "Failed to load shuma" };
    }
  }

  /**
   * Search and list valuations for an organization.
   *
   * @param {string} organizationId - Organization ID
   * @param {string} [search] - Optional search term
   * @param {string} [status] - Optional status filter: 'complete' | 'draft'
   *
   * @returns {Promise<{success: boolean, shumas?: Array, error?: string}>}
   */
  static async searchShumas(organizationId, search, status) {
    const client = await db.client();

    try {
      let query = `
        SELECT
          id, session_id, street, building_number, city, neighborhood,
          full_address, rooms, floor, area, property_essence, client_name,
          visit_date, valuation_date, gush, parcel, is_complete,
          created_at, updated_at
        FROM shuma
        WHERE organization_id = $1
      `;
      const params = [organizationId];
      let paramIndex = 2;

      if (search) {
        query += ` AND (
          full_address ILIKE $${paramIndex} OR
          client_name ILIKE $${paramIndex} OR
          street ILIKE $${paramIndex} OR
          city ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status === "complete") {
        query += ` AND is_complete = true`;
      } else if (status === "draft") {
        query += ` AND is_complete = false`;
      }

      query += ` ORDER BY updated_at DESC`;

      const result = await client.query(query, params);

      return {
        success: true,
        shumas: result.rows.map((row) => ({
          id: row.id,
          sessionId: row.session_id,
          address:
            row.full_address ||
            `${row.street} ${row.building_number}, ${row.city}`,
          clientName: row.client_name,
          rooms: row.rooms,
          area: row.area,
          isComplete: row.is_complete,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          gush: row.gush,
          parcel: row.parcel,
        })),
      };
    } catch (error) {
      console.error("Error searching shumas:", error);
      return { error: error.message || "Failed to search shumas" };
    } finally {
      client.release();
    }
  }

  /**
   * Get a single valuation by its database ID.
   *
   * @param {number|string} shumaId - The database ID
   *
   * @returns {Promise<{success: boolean, shuma?: Object, error?: string}>}
   */
  static async getShumaById(shumaId) {
    const client = await db.client();

    try {
      const result = await client.query(
        `
        SELECT
          id, session_id, street, building_number, city, neighborhood,
          full_address, rooms, floor, area, property_essence, client_name,
          visit_date, valuation_date, gush, parcel, is_complete,
          created_at, updated_at, uploads, gis_screenshots,
          garmushka_measurements, extracted_data
        FROM shuma
        WHERE id = $1
      `,
        [shumaId],
      );

      if (result.rows.length === 0) {
        return { success: false, error: "Shuma not found" };
      }

      const row = result.rows[0];

      return {
        success: true,
        shuma: {
          id: row.id,
          sessionId: row.session_id,
          address:
            row.full_address ||
            `${row.street} ${row.building_number}, ${row.city}`,
          clientName: row.client_name,
          rooms: row.rooms,
          floor: row.floor,
          area: row.area,
          visitDate: row.visit_date,
          valuationDate: row.valuation_date,
          gush: row.gush,
          parcel: row.parcel,
          isComplete: row.is_complete,
          uploads: safeParseJSON(row.uploads, []),
          gisScreenshots: safeParseJSON(row.gis_screenshots, {}),
          garmushkaMeasurements: safeParseJSON(row.garmushka_measurements, {}),
          extractedData: safeParseJSON(row.extracted_data, {}),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      };
    } catch (error) {
      console.error("Error getting shuma by ID:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Clear cache for a session
   * @param {string} [sessionId] - Session ID (clears all if not provided)
   */
  static clearCache(sessionId) {
    cache.delete(sessionId);
  }
}

module.exports = ValuationService;
