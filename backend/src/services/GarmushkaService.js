/**
 * Garmushka Service
 *
 * Handles Garmushka measurement data including floor plans and room measurements.
 * Garmushka is the property measurement tool used to capture floor plan data.
 *
 * @module services/GarmushkaService
 */

const { db, cache, safeParseJSON } = require("./DatabaseClient");
const FileStorageService = require("./FileStorageService");

/**
 * Garmushka Service - Measurement Data Management
 */
class GarmushkaService {
  /**
   * Save Garmushka measurement data.
   *
   * Saves to both shuma.garmushka_measurements (JSONB) and the garmushka table.
   * Converts base64 images to file URLs before saving.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} garmushkaData - Measurement data
   * @param {number} [garmushkaData.totalArea] - Total measured area
   * @param {number} [garmushkaData.mainArea] - Main apartment area
   * @param {number} [garmushkaData.balconyArea] - Balcony area
   * @param {Array} [garmushkaData.rooms] - Room measurements
   * @param {string} [garmushkaData.pngExport] - Floor plan image
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async saveGarmushkaData(sessionId, garmushkaData) {
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

      // Process pngExport: convert base64 to file URL if needed
      let processedData = { ...garmushkaData };

      if (
        garmushkaData.pngExport &&
        typeof garmushkaData.pngExport === "string"
      ) {
        if (
          garmushkaData.pngExport.startsWith("/api/files/") ||
          garmushkaData.pngExport.startsWith("http://") ||
          garmushkaData.pngExport.startsWith("https://")
        ) {
          // Already a URL
          console.log("✅ Garmushka pngExport is already a URL");
        } else if (garmushkaData.pngExport.startsWith("data:image")) {
          // Convert base64 to file
          const filename = `garmushka-export-${sessionId}.png`;
          try {
            const fileResult = await FileStorageService.saveBase64Image(
              garmushkaData.pngExport,
              sessionId,
              filename,
            );
            processedData.pngExport = fileResult.url;
            console.log(
              `✅ Converted Garmushka pngExport to: ${fileResult.url}`,
            );
          } catch (fileError) {
            console.warn("⚠️ Failed to convert pngExport, keeping original");
          }
        }
      }

      // Clean up internal fields
      delete processedData.garmushkaRecords;
      if (
        Array.isArray(processedData.pngExports) &&
        processedData.pngExports.length === 0
      ) {
        delete processedData.pngExports;
      }

      // Update shuma table
      await client.query(
        `UPDATE shuma SET
          garmushka_measurements = $1,
          apartment_sqm = $2,
          updated_at = NOW()
        WHERE session_id = $3`,
        [
          JSON.stringify(processedData),
          processedData.totalArea || processedData.mainArea || null,
          sessionId,
        ],
      );

      // Upsert to garmushka table
      await client.query(
        `
        INSERT INTO garmushka (shuma_id, session_id, measurements, png_export, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          measurements = $3,
          png_export = $4,
          updated_at = NOW()
      `,
        [
          shumaId,
          sessionId,
          JSON.stringify(processedData),
          processedData.pngExport || null,
        ],
      );

      await client.query("COMMIT");

      // Clear cache
      cache.delete(sessionId);

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving Garmushka data:", error);
      return { error: error.message || "Failed to save Garmushka data" };
    } finally {
      client.release();
    }
  }

  /**
   * Delete Garmushka data for a session.
   *
   * @param {string} sessionId - Session identifier
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deleteGarmushkaData(sessionId) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Clear from shuma table
      await client.query(
        `UPDATE shuma SET
          garmushka_measurements = '{}',
          apartment_sqm = NULL,
          updated_at = NOW()
        WHERE session_id = $1`,
        [sessionId],
      );

      // Delete from garmushka table
      await client.query("DELETE FROM garmushka WHERE session_id = $1", [
        sessionId,
      ]);

      await client.query("COMMIT");

      // Clear cache
      cache.delete(sessionId);

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error deleting Garmushka data:", error);
      return { error: error.message || "Failed to delete Garmushka data" };
    } finally {
      client.release();
    }
  }

  /**
   * Get Garmushka data for a session.
   *
   * @param {string} sessionId - Session identifier
   *
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  static async getGarmushkaData(sessionId) {
    try {
      const result = await db.query(
        "SELECT garmushka_measurements FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (result.rows.length === 0) {
        return { error: "Shuma not found" };
      }

      return {
        success: true,
        data: safeParseJSON(result.rows[0].garmushka_measurements, {}),
      };
    } catch (error) {
      console.error("Error getting Garmushka data:", error);
      return { error: error.message };
    }
  }
}

module.exports = GarmushkaService;
