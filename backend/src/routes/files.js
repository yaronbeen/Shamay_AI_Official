// File Upload Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { ShumaDB } = require('../models/ShumaDB');
const logger = require('../config/logger');

// Determine upload base path: /tmp for Vercel, local uploads for dev
const getUploadBasePath = () => {
  if (process.env.VERCEL) {
    return '/tmp';
  } else {
    // Local dev: Always save to frontend/uploads
    // __dirname = backend/src/routes
    // Go up 2 levels to backend, then up to project root, then to frontend/uploads
    const projectRoot = path.resolve(__dirname, '../../..');
    return path.join(projectRoot, 'frontend', 'uploads');
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const sessionId = req.params.sessionId || req.body.sessionId || 'default';
    const basePath = getUploadBasePath();
    const uploadPath = path.join(basePath, sessionId);
    
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      logger.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs and images
    const allowedTypes = /pdf|jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// POST /api/files/:sessionId/upload - Upload file
router.post('/:sessionId/upload', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type } = req.body; // Document type: tabu, permit, condo, building_image, interior_image

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${sessionId}/${req.file.filename}`;
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
      status: 'completed',
      uploadedAt: new Date().toISOString()
    };

    // Load current session data
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId);
    if (loadResult.success && loadResult.valuationData) {
      const currentUploads = loadResult.valuationData.uploads || [];
      currentUploads.push(uploadEntry);

      // Update session with new upload
      await ShumaDB.saveShumaFromSession(
        sessionId,
        loadResult.valuationData.organizationId || 'default-org',
        loadResult.valuationData.userId || 'system',
        { ...loadResult.valuationData, uploads: currentUploads }
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
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:sessionId/:fileId - Delete file (must come before GET with :filename)
router.delete('/:sessionId/:fileId', async (req, res) => {
  try {
    const { sessionId, fileId } = req.params;

    const result = await ShumaDB.loadShumaForWizard(sessionId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    const uploads = result.valuationData.uploads || [];
    const fileToDelete = uploads.find(u => u.id === fileId);

    if (!fileToDelete) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    if (fileToDelete.path) {
      try {
        await fs.unlink(fileToDelete.path);
      } catch (err) {
        logger.warn('Could not delete physical file:', err);
      }
    }

    // Update database
    const updatedUploads = uploads.filter(u => u.id !== fileId);
    await ShumaDB.saveShumaFromSession(
      sessionId,
      result.valuationData.organizationId || 'default-org',
      result.valuationData.userId || 'system',
      { ...result.valuationData, uploads: updatedUploads }
    );

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:sessionId - Get all files for session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await ShumaDB.loadShumaForWizard(sessionId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      uploads: result.valuationData.uploads || []
    });
  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:sessionId/:filename - Serve individual file
router.get('/:sessionId/:filename', async (req, res) => {
  try {
    const { sessionId, filename } = req.params;
    
    // Try multiple possible upload locations
    // Priority: frontend/uploads (where files should be saved)
    const projectRoot = path.resolve(__dirname, '../../..');
    const possiblePaths = [
      path.join(projectRoot, 'frontend', 'uploads', sessionId, filename), // frontend/uploads (correct location)
      path.join(__dirname, '../../uploads', sessionId, filename), // backend/uploads (legacy)
      path.join(process.cwd(), 'uploads', sessionId, filename) // from CWD (fallback)
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
      logger.error(`❌ File not found in any location:`, possiblePaths);
      return res.status(404).json({ 
        error: 'File not found', 
        filename,
        sessionId,
        searchedPaths: possiblePaths 
      });
    }
    
    logger.info(`📁 Serving file: ${filePath}`);
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
      case '.json':
        contentType = 'application/json';
        break;
    }
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Stream file
    const readStream = require('fs').createReadStream(filePath);
    readStream.pipe(res);
    
    logger.info(`✅ Served file: ${filename} (${stats.size} bytes, ${contentType})`);
  } catch (error) {
    logger.error('File serving error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

