const express = require('express');
const router = express.Router();
const { ShumaDB } = require('../models/ShumaDB');

/**
 * POST /api/export/pdf
 * Generate PDF using Puppeteer to render the HTML template
 * This is delegated back to frontend which has the template
 */
router.post('/pdf', async (req, res) => {
  try {
    const { sessionId, valuationData } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }

    console.log(`📄 PDF export requested for session: ${sessionId}`);
    console.log(`⚠️ Backend PDF generation not implemented - use frontend template`);

    // Return error - PDF should be generated in frontend using the document template
    return res.status(501).json({
      success: false,
      error: 'PDF generation should use frontend template',
      message: 'Please use the frontend /wizard route for PDF export with proper HTML template'
    });

  } catch (error) {
    console.error('❌ Error in PDF export route:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process PDF export request',
      details: error.message
    });
  }
});

module.exports = router;

