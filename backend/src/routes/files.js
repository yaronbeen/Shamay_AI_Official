// File Upload Routes
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { ShumaDB } = require("../models/ShumaDB");
const logger = require("../config/logger");

// Determine upload base path: /tmp for Vercel, local uploads for dev
const getUploadBasePath = () => {
  if (process.env.VERCEL) {
    return "/tmp";
  } else {
    // Local dev: Always save to frontend/uploads
    // __dirname = backend/src/routes
    // Go up 2 levels to backend, then up to project root, then to frontend/uploads
    const projectRoot = path.resolve(__dirname, "../../..");
    return path.join(projectRoot, "frontend", "uploads");
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const sessionId = req.params.sessionId || req.body.sessionId || "default";
    const userId = req.body.userId || req.headers["x-user-id"] || "dev-user-id";
    const basePath = getUploadBasePath();
    // New structure: users/{userId}/{sessionId}
    const uploadPath = path.join(basePath, "users", userId, sessionId);

    // Create directory if it doesn't exist
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      logger.error("Error creating upload directory:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs and images
    const allowedTypes = /pdf|jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"));
    }
  },
});

// POST /api/files/:sessionId/upload - Upload file
router.post("/:sessionId/upload", upload.single("file"), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type } = req.body; // Document type: tabu, permit, condo, building_image, interior_image

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.body.userId || req.headers["x-user-id"] || "dev-user-id";
    const fileUrl = `/uploads/users/${userId}/${sessionId}/${req.file.filename}`;
    const filePath = req.file.path;

    // Create upload entry
    const uploadEntry = {
      id: `upload_${Date.now()}`,
      type: type,
      name: req.file.originalname,
      fileName: req.file.filename,
      path: filePath,
      url: fileUrl,
      size: req.file.size,
      mimeType: req.file.mimetype,
      status: "completed",
      uploadedAt: new Date().toISOString(),
    };

    // Load current session data
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId);
    if (loadResult.success && loadResult.valuationData) {
      const currentUploads = loadResult.valuationData.uploads || [];
      currentUploads.push(uploadEntry);

      // Update session with new upload
      await ShumaDB.saveShumaFromSession(
        sessionId,
        loadResult.valuationData.organizationId || "default-org",
        loadResult.valuationData.userId || "system",
        { ...loadResult.valuationData, uploads: currentUploads },
      );
    }

    res.json({
      success: true,
      uploadEntry: uploadEntry,
      file: {
        name: req.file.originalname,
        fileName: req.file.filename,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("File upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:sessionId/:fileId - Delete file (must come before GET with :filename)
router.delete("/:sessionId/:fileId", async (req, res) => {
  try {
    const { sessionId, fileId } = req.params;

    const result = await ShumaDB.loadShumaForWizard(sessionId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    const uploads = result.valuationData.uploads || [];
    const fileToDelete = uploads.find((u) => u.id === fileId);

    if (!fileToDelete) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete physical file
    if (fileToDelete.path) {
      try {
        await fs.unlink(fileToDelete.path);
      } catch (err) {
        logger.warn("Could not delete physical file:", err);
      }
    }

    // Update database
    const updatedUploads = uploads.filter((u) => u.id !== fileId);
    await ShumaDB.saveShumaFromSession(
      sessionId,
      result.valuationData.organizationId || "default-org",
      result.valuationData.userId || "system",
      { ...result.valuationData, uploads: updatedUploads },
    );

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    logger.error("Delete file error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:sessionId - Get all files for session
router.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await ShumaDB.loadShumaForWizard(sessionId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      uploads: result.valuationData.uploads || [],
    });
  } catch (error) {
    logger.error("Get files error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:sessionId/:filename - Serve individual file
router.get("/:sessionId/:filename", async (req, res) => {
  try {
    const { sessionId, filename } = req.params;

    // Security: Sanitize inputs to prevent path traversal attacks
    const sanitizedFilename = path.basename(filename);
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");

    // Validate inputs
    if (
      sanitizedFilename !== filename ||
      filename.includes("..") ||
      filename.includes("\0")
    ) {
      logger.warn(
        `⚠️ Potential path traversal attempt blocked: filename=${filename}`,
      );
      return res.status(400).json({ error: "Invalid filename" });
    }
    if (
      sanitizedSessionId !== sessionId ||
      sessionId.includes("..") ||
      sessionId.length > 128
    ) {
      logger.warn(
        `⚠️ Potential path traversal attempt blocked: sessionId=${sessionId}`,
      );
      return res.status(400).json({ error: "Invalid session ID" });
    }

    // Check if we're in Vercel production
    const isProduction =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    // In Vercel production, try to load file URL from database (might be Blob URL)
    if (isProduction && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        // Load session data to get file URL
        const result = await ShumaDB.loadShumaForWizard(sessionId);
        if (result.success && result.valuationData) {
          // Check uploads array for matching filename
          const uploads = result.valuationData.uploads || [];
          const fileEntry = uploads.find(
            (u) =>
              u.fileName === filename || (u.url && u.url.includes(filename)),
          );

          // Check gisScreenshots for matching filename
          let blobUrl = null;
          if (
            fileEntry &&
            fileEntry.url &&
            (fileEntry.url.startsWith("http://") ||
              fileEntry.url.startsWith("https://"))
          ) {
            blobUrl = fileEntry.url;
          } else {
            const gisScreenshots = result.valuationData.gisScreenshots || {};
            if (
              gisScreenshots.cropMode0 &&
              gisScreenshots.cropMode0.includes(filename) &&
              (gisScreenshots.cropMode0.startsWith("http://") ||
                gisScreenshots.cropMode0.startsWith("https://"))
            ) {
              blobUrl = gisScreenshots.cropMode0;
            } else if (
              gisScreenshots.cropMode1 &&
              gisScreenshots.cropMode1.includes(filename) &&
              (gisScreenshots.cropMode1.startsWith("http://") ||
                gisScreenshots.cropMode1.startsWith("https://"))
            ) {
              blobUrl = gisScreenshots.cropMode1;
            }
          }

          // If we found a Blob URL, download and serve it
          if (blobUrl) {
            try {
              // Download the blob (Blob URLs are public, so we can fetch them directly)
              const response = await fetch(blobUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch blob: ${response.statusText}`);
              }

              const buffer = await response.arrayBuffer();
              const fileBuffer = Buffer.from(buffer);

              // Determine content type
              const ext = path.extname(filename).toLowerCase();
              let contentType = "application/octet-stream";

              switch (ext) {
                case ".pdf":
                  contentType = "application/pdf";
                  break;
                case ".jpg":
                case ".jpeg":
                  contentType = "image/jpeg";
                  break;
                case ".png":
                  contentType = "image/png";
                  break;
                case ".gif":
                  contentType = "image/gif";
                  break;
                case ".webp":
                  contentType = "image/webp";
                  break;
                case ".txt":
                  contentType = "text/plain";
                  break;
                case ".json":
                  contentType = "application/json";
                  break;
              }

              logger.info(
                `✅ [BLOB] Serving file from Blob: ${blobUrl} (${fileBuffer.length} bytes, ${contentType})`,
              );

              res.setHeader("Content-Type", contentType);
              res.setHeader("Content-Length", fileBuffer.length);
              res.setHeader("Cache-Control", "public, max-age=3600");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Access-Control-Allow-Methods", "GET");

              return res.send(fileBuffer);
            } catch (blobError) {
              logger.warn(
                `⚠️ [BLOB] Failed to download from Blob, falling back to local: ${blobError.message}`,
              );
              // Fall through to local filesystem
            }
          }
        }
      } catch (dbError) {
        logger.warn(
          `⚠️ [BLOB] Failed to load from DB, falling back to local: ${dbError.message}`,
        );
        // Fall through to local filesystem
      }
    }

    // Local development OR fallback: Read from /frontend/uploads
    // Try new structure first: users/{userId}/{sessionId}/{filename}
    // Then fall back to old structure: {sessionId}/{filename}
    const userId =
      req.query.userId || req.headers["x-user-id"] || "dev-user-id";
    const projectRoot = path.resolve(__dirname, "../../..");
    const possiblePaths = [
      path.join(
        projectRoot,
        "frontend",
        "uploads",
        "users",
        userId,
        sessionId,
        filename,
      ), // New structure
      path.join(projectRoot, "frontend", "uploads", sessionId, filename), // Old structure (backward compatibility)
      path.join(__dirname, "../../uploads", sessionId, filename), // backend/uploads (legacy)
      path.join(process.cwd(), "uploads", sessionId, filename), // from CWD (fallback)
    ];

    let filePath = null;

    // Find the first path that exists
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        break;
      } catch (err) {
        // Continue to next path
      }
    }

    if (!filePath) {
      // Log full details for debugging, but don't expose to client
      logger.error(`❌ [LOCAL] File not found in any location:`, possiblePaths);
      // Security: Don't expose internal paths in response
      return res.status(404).json({ error: "File not found" });
    }

    logger.info(`📁 [LOCAL] Serving file: ${filePath}`);

    // Get file stats
    const stats = await fs.stat(filePath);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".webp":
        contentType = "image/webp";
        break;
      case ".txt":
        contentType = "text/plain";
        break;
      case ".json":
        contentType = "application/json";
        break;
    }

    // Set headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // Stream file
    const readStream = require("fs").createReadStream(filePath);
    readStream.pipe(res);

    logger.info(
      `✅ [LOCAL] Served file: ${filename} (${stats.size} bytes, ${contentType})`,
    );
  } catch (error) {
    logger.error("❌ File serving error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
