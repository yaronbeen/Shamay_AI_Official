/**
 * File Storage Service
 *
 * Handles file storage operations including base64 to file conversion.
 * Supports both local filesystem (development) and Vercel Blob storage (production).
 *
 * Extracted from ShumaDB.js for better separation of concerns.
 *
 * @module services/FileStorageService
 */

const fs = require("fs").promises;
const path = require("path");

/**
 * File Storage Service
 */
class FileStorageService {
  /**
   * Convert base64 image to Buffer and save to file storage.
   * Uses Vercel Blob in production, local filesystem in development.
   * Returns URL instead of base64 to reduce DB size.
   *
   * @param {string} base64Data - Base64 encoded image data (with or without data URI prefix)
   * @param {string} sessionId - Session identifier for organizing files
   * @param {string} filename - Target filename
   *
   * @returns {Promise<{url: string, path: string, size: number}>}
   */
  static async saveBase64ImageToFile(base64Data, sessionId, filename) {
    try {
      // Extract base64 data (remove data:image/png;base64, prefix if present)
      const base64String = base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;

      // Convert base64 to Buffer
      const buffer = Buffer.from(base64String, "base64");

      // Check if we're in Vercel production
      // In Vercel, process.env.VERCEL is truthy (typically '1')
      // ALWAYS try Blob first if we're in Vercel, regardless of token (token might be auto-detected)
      const isVercel =
        !!process.env.VERCEL || process.env.VERCEL_ENV === "production";

      console.log("🔍 [SAVE] Environment check:", {
        isVercel,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        NODE_ENV: process.env.NODE_ENV,
      });

      // ALWAYS try Vercel Blob first if in Vercel (primary storage method)
      if (isVercel) {
        try {
          console.log("🚀 [SAVE] In Vercel - Attempting Blob upload...");
          return await this.saveToVercelBlob(buffer, sessionId, filename);
        } catch (blobError) {
          console.error("❌ [SAVE] Vercel Blob failed:", blobError.message);
          // In Vercel, we should NOT fall back to local filesystem
          // Vercel filesystem is read-only except /tmp, and files won't persist
          throw new Error(
            `Failed to save to Vercel Blob: ${blobError.message}. This is required in Vercel production.`,
          );
        }
      }

      // Use local filesystem in development ONLY
      console.log("📁 [SAVE] Using local filesystem (development)...");
      return await this.saveToLocalFilesystem(buffer, sessionId, filename);
    } catch (error) {
      console.error(`❌ Error saving image file:`, error);
      throw error;
    }
  }

  /**
   * Save file to Vercel Blob (Production).
   * This is the PRIMARY method for production/Vercel deployments.
   *
   * @param {Buffer} buffer - File buffer to upload
   * @param {string} sessionId - Session identifier
   * @param {string} filename - Target filename
   *
   * @returns {Promise<{url: string, path: string, size: number}>}
   */
  static async saveToVercelBlob(buffer, sessionId, filename) {
    try {
      // Try to use @vercel/blob
      let put;
      try {
        const blobModule = require("@vercel/blob");
        put = blobModule.put;
        console.log("✅ [BLOB] @vercel/blob module loaded successfully");
      } catch (e) {
        const errorMsg =
          "@vercel/blob not available. Please install: npm install @vercel/blob";
        console.error("❌ [BLOB] Module load error:", errorMsg);
        throw new Error(errorMsg);
      }

      // Check for required token
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error(
          "BLOB_READ_WRITE_TOKEN environment variable is not set",
        );
      }

      const pathname = `${sessionId}/${filename}`;

      console.log("🔍 [BLOB] Uploading file:", {
        sessionId,
        filename,
        pathname,
        size: buffer.length,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      });

      // CRITICAL: Allow overwrite in case blob already exists (for updates/re-saves)
      const blob = await put(pathname, buffer, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true, // Allow overwriting existing blobs
      });

      console.log("✅ [BLOB] File uploaded successfully:", {
        url: blob.url,
        pathname: blob.pathname || pathname,
        size: buffer.length,
      });

      return {
        url: blob.url,
        path: blob.pathname || pathname,
        size: buffer.length,
      };
    } catch (error) {
      console.error("❌ [BLOB] Upload error:", {
        message: error.message,
        stack: error.stack,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      });
      // Re-throw error so caller can handle fallback
      throw error;
    }
  }

  /**
   * Save file to local filesystem (Development ONLY).
   * Saves to frontend/uploads when running locally (since frontend serves from there).
   * NOTE: This should NEVER be used in Vercel production - use saveToVercelBlob instead.
   *
   * @param {Buffer} buffer - File buffer to save
   * @param {string} sessionId - Session identifier
   * @param {string} filename - Target filename
   *
   * @returns {Promise<{url: string, path: string, size: number}>}
   */
  static async saveToLocalFilesystem(buffer, sessionId, filename) {
    // Warn if called in production (should not happen)
    if (process.env.VERCEL === "1") {
      console.warn(
        "⚠️ [LOCAL] WARNING: saveToLocalFilesystem called in Vercel! This should use Blob instead.",
      );
    }

    // Local dev: Always save to frontend/uploads
    // Use path.resolve to get absolute path from backend/src/services to project root
    // __dirname = backend/src/services
    // Go up 3 levels: services -> src -> backend -> project root
    const projectRoot = path.resolve(__dirname, "../../..");
    const uploadsDir = path.join(projectRoot, "frontend", "uploads", sessionId);

    // Ensure directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`📁 [LOCAL] Using upload directory: ${uploadsDir}`);

    // Save file
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    // Get file stats
    const stats = await fs.stat(filePath);

    // Return URL for local access
    // Use /uploads/ path to match the upload route format
    // This is served by the frontend Next.js app
    const url = `/uploads/${sessionId}/${filename}`;

    console.log(
      `✅ [LOCAL] Saved image file: ${filePath} (${stats.size} bytes)`,
    );
    console.log(`📁 [LOCAL] File URL: ${url}`);

    return {
      url,
      path: `${sessionId}/${filename}`,
      size: stats.size,
    };
  }
}

module.exports = FileStorageService;
