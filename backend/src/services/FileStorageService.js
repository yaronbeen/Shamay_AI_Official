/**
 * File Storage Service
 *
 * Handles file storage operations including base64 to file conversion.
 * Supports both local filesystem and Vercel Blob storage.
 *
 * @module services/FileStorageService
 */

const crypto = require("crypto");
const path = require("path");
const fs = require("fs").promises;

/**
 * File Storage Service
 */
class FileStorageService {
  /**
   * Save a base64 image to file storage.
   *
   * Automatically chooses between Vercel Blob (production) and
   * local filesystem (development) based on environment.
   *
   * @param {string} base64Data - Base64 encoded image data
   * @param {string} sessionId - Session identifier for organizing files
   * @param {string} filename - Target filename
   *
   * @returns {Promise<{url: string, size: number}>}
   */
  static async saveBase64Image(base64Data, sessionId, filename) {
    // Extract base64 content
    const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid base64 image format");
    }

    const mimeType = base64Match[1];
    const base64Content = base64Match[2];
    const buffer = Buffer.from(base64Content, "base64");

    // Determine storage method based on environment
    const isProduction = process.env.NODE_ENV === "production";
    const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (isProduction && hasVercelBlob) {
      return await this.saveToVercelBlob(buffer, sessionId, filename, mimeType);
    } else {
      return await this.saveToLocalFilesystem(buffer, sessionId, filename);
    }
  }

  /**
   * Save buffer to Vercel Blob storage.
   *
   * @param {Buffer} buffer - File buffer
   * @param {string} sessionId - Session identifier
   * @param {string} filename - Target filename
   * @param {string} [mimeType='image/png'] - MIME type
   *
   * @returns {Promise<{url: string, size: number}>}
   */
  static async saveToVercelBlob(
    buffer,
    sessionId,
    filename,
    mimeType = "image/png",
  ) {
    try {
      const { put } = require("@vercel/blob");

      const blobPath = `sessions/${sessionId}/${filename}`;
      const blob = await put(blobPath, buffer, {
        access: "public",
        contentType: mimeType,
      });

      console.log(`✅ Saved to Vercel Blob: ${blob.url}`);

      return {
        url: blob.url,
        size: buffer.length,
      };
    } catch (error) {
      console.error("Error saving to Vercel Blob:", error);
      throw error;
    }
  }

  /**
   * Save buffer to local filesystem.
   *
   * @param {Buffer} buffer - File buffer
   * @param {string} sessionId - Session identifier
   * @param {string} filename - Target filename
   *
   * @returns {Promise<{url: string, size: number}>}
   */
  static async saveToLocalFilesystem(buffer, sessionId, filename) {
    try {
      // Determine upload directory
      const uploadsDir =
        process.env.UPLOADS_DIR ||
        path.join(process.cwd(), "public", "uploads", "sessions", sessionId);

      // Ensure directory exists
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename to avoid collisions
      const uniqueFilename = `${Date.now()}-${filename}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Write file
      await fs.writeFile(filePath, buffer);

      // Generate URL
      const url = `/api/files/sessions/${sessionId}/${uniqueFilename}`;

      console.log(`✅ Saved to local filesystem: ${url}`);

      return {
        url,
        size: buffer.length,
      };
    } catch (error) {
      console.error("Error saving to local filesystem:", error);
      throw error;
    }
  }

  /**
   * Delete a file from storage.
   *
   * @param {string} url - File URL to delete
   *
   * @returns {Promise<{success: boolean}>}
   */
  static async deleteFile(url) {
    try {
      if (url.startsWith("https://") && url.includes("vercel-storage.com")) {
        // Vercel Blob
        const { del } = require("@vercel/blob");
        await del(url);
      } else if (url.startsWith("/api/files/")) {
        // Local file
        const relativePath = url.replace("/api/files/", "");
        const filePath = path.join(
          process.cwd(),
          "public",
          "uploads",
          relativePath,
        );
        await fs.unlink(filePath);
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a unique file identifier.
   *
   * @returns {string} Unique identifier
   */
  static generateFileId() {
    return crypto.randomBytes(16).toString("hex");
  }
}

module.exports = FileStorageService;
