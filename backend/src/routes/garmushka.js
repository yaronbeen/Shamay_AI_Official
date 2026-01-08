// Garmushka Measurements Routes
const express = require('express');
const router = express.Router();
const ShumaDB = require('../models/ShumaDB');
const logger = require('../config/logger');

// POST /api/garmushka/:sessionId - Save measurements
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const measurementData = req.body;

    const result = await ShumaDB.saveGarmushkaData(sessionId, measurementData);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Save garmushka error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/garmushka/:sessionId - Get measurements
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await ShumaDB.loadShumaForWizard(sessionId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      measurements: result.valuationData.garmushkaMeasurements || {}
    });
  } catch (error) {
    logger.error('Get garmushka error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

