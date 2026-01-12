/**
 * GIS Service
 *
 * Handles GIS screenshot management including storage and retrieval.
 * Supports both base64 and URL-based image storage.
 *
 * @module services/GISService
 */

const { db, cache, safeParseJSON } = require("./DatabaseClient");
const FileStorageService = require("./FileStorageService");

/**
 * GIS Service - GIS Screenshot Management
 */
class GISService {
  /**
   * Save GIS screenshots and analysis data.
   *
   * Merges new screenshots with existing ones to avoid data loss.
   * Converts base64 images to file URLs before saving.
   *
   * @param {string} sessionId - Session identifier
   * @param {Object} gisData - GIS screenshot data
   * @param {string} [gisData.cropMode0] - Clean map screenshot
   * @param {string} [gisData.cropMode1] - Taba map screenshot
   *
   * @returns {Promise<{success: boolean, screenshotUrls?: Object, error?: string}>}
   */
  static async saveGISData(sessionId, gisData) {
    const client = await db.client();

    try {
      await client.query("BEGIN");

      // Get shuma ID and existing screenshots
      const shumaResult = await client.query(
        "SELECT id, gis_screenshots FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (shumaResult.rows.length === 0) {
        throw new Error("Shuma not found for session");
      }

      const shumaId = shumaResult.rows[0].id;
      const existingScreenshots = safeParseJSON(
        shumaResult.rows[0].gis_screenshots,
        {},
      );

      // Merge new data with existing
      const mergedScreenshots = {
        ...existingScreenshots,
        ...gisData,
      };

      // Process screenshots - convert base64 to URLs if needed
      const processedScreenshots = {};
      for (const [key, value] of Object.entries(mergedScreenshots)) {
        if (typeof value === "string") {
          if (
            value.startsWith("/api/files/") ||
            value.startsWith("http://") ||
            value.startsWith("https://")
          ) {
            // Already a URL
            processedScreenshots[key] = value;
          } else if (value.startsWith("data:image")) {
            // Convert base64 to file
            const filename = `gis-screenshot-${key === "cropMode0" ? "clean" : "taba"}-${sessionId}.png`;
            try {
              const fileResult = await FileStorageService.saveBase64Image(
                value,
                sessionId,
                filename,
              );
              processedScreenshots[key] = fileResult.url;
              console.log(`✅ Converted ${key} to file URL: ${fileResult.url}`);
            } catch (fileError) {
              console.warn(
                `⚠️ Failed to convert ${key} to file, keeping original`,
              );
              processedScreenshots[key] = value;
            }
          } else {
            processedScreenshots[key] = value;
          }
        } else if (value && typeof value === "object") {
          processedScreenshots[key] = value;
        }
      }

      // Update shuma table
      await client.query(
        `UPDATE shuma SET gis_screenshots = $1, updated_at = NOW() WHERE session_id = $2`,
        [JSON.stringify(processedScreenshots), sessionId],
      );

      // Save to images table
      for (const [key, url] of Object.entries(processedScreenshots)) {
        if (typeof url === "string" && url.startsWith("/api/files/")) {
          await client.query(
            `
            INSERT INTO images (shuma_id, session_id, type, url, metadata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (session_id, type) DO UPDATE SET url = $4, updated_at = NOW()
          `,
            [
              shumaId,
              sessionId,
              `gis_${key}`,
              url,
              JSON.stringify({ source: "gis", key }),
            ],
          );
        }
      }

      await client.query("COMMIT");

      // Clear cache
      cache.delete(sessionId);

      return { success: true, screenshotUrls: processedScreenshots };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving GIS data:", error);
      return { error: error.message || "Failed to save GIS data" };
    } finally {
      client.release();
    }
  }

  /**
   * Get GIS screenshots for a session.
   *
   * @param {string} sessionId - Session identifier
   *
   * @returns {Promise<{success: boolean, screenshots?: Object, error?: string}>}
   */
  static async getGISData(sessionId) {
    try {
      const result = await db.query(
        "SELECT gis_screenshots, gis_analysis FROM shuma WHERE session_id = $1",
        [sessionId],
      );

      if (result.rows.length === 0) {
        return { error: "Shuma not found" };
      }

      return {
        success: true,
        screenshots: safeParseJSON(result.rows[0].gis_screenshots, {}),
        analysis: safeParseJSON(result.rows[0].gis_analysis, {}),
      };
    } catch (error) {
      console.error("Error getting GIS data:", error);
      return { error: error.message };
    }
  }
}

module.exports = GISService;
