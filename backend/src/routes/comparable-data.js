const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Dynamic import wrapper since the module uses ES modules
let comparableDataModule = null;

const loadModule = async () => {
  if (!comparableDataModule) {
    comparableDataModule = await import('../../comparable-data-management/index.js');
  }
  return comparableDataModule;
};

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/comparable-data/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * POST /api/comparable-data/import
 * Upload and import CSV file with comparable data
 */
router.post('/import', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided'
      });
    }

    const module = await loadModule();
    const userId = req.body.userId || 'system';
    const csvFilePath = req.file.path;
    
    console.log(`📊 Importing CSV: ${req.file.originalname}`);
    
    const result = await module.importComparableDataCSV(csvFilePath, userId);
    
    // Clean up uploaded file after import
    try {
      await fs.unlink(csvFilePath);
    } catch (error) {
      console.warn('⚠️ Failed to delete uploaded file:', error.message);
    }
    
    return res.json(result);
    
  } catch (error) {
    console.error('❌ CSV import failed:', error);
    
    // Clean up file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to import CSV file'
    });
  }
});

/**
 * POST /api/comparable-data/analyze
 * Analyze comparable data for a property
 */
router.post('/analyze', async (req, res) => {
  try {
    const { propertyData, sessionId } = req.body;
    
    if (!propertyData) {
      return res.status(400).json({
        success: false,
        error: 'Property data is required'
      });
    }
    
    console.log('📈 Analyzing comparable data for property:', propertyData);
    
    const module = await loadModule();
    const analysis = await module.analyzeComparableData(propertyData, sessionId || null);
    
    return res.json(analysis);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze comparable data'
    });
  }
});

/**
 * GET /api/comparable-data/search
 * Search comparable data by criteria
 */
router.get('/search', async (req, res) => {
  try {
    const criteria = {
      city: req.query.city,
      min_rooms: req.query.min_rooms ? parseFloat(req.query.min_rooms) : undefined,
      max_rooms: req.query.max_rooms ? parseFloat(req.query.max_rooms) : undefined,
      min_area: req.query.min_area ? parseFloat(req.query.min_area) : undefined,
      max_area: req.query.max_area ? parseFloat(req.query.max_area) : undefined,
      min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
      gush: req.query.gush
    };
    
    // Remove undefined values
    Object.keys(criteria).forEach(key => {
      if (criteria[key] === undefined) delete criteria[key];
    });
    
    console.log('🔍 Searching comparable data with criteria:', criteria);
    
    const module = await loadModule();
    const results = await module.searchComparableData(criteria);
    
    return res.json({
      success: true,
      count: results.length,
      data: results
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to search comparable data'
    });
  }
});

/**
 * GET /api/comparable-data/stats
 * Get statistics about comparable data
 */
router.get('/stats', async (req, res) => {
  try {
    const module = await loadModule();
    const stats = await module.getComparableDataStats();
    
    return res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Stats retrieval failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics'
    });
  }
});

module.exports = router;

