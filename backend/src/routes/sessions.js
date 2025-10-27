// Valuation Sessions Routes
const express = require('express');
const router = express.Router();
const { ShumaDB } = require('../models/ShumaDB');
const logger = require('../config/logger');

// POST /api/sessions - Handle all session operations
router.post('/', async (req, res) => {
  try {
    const { action, sessionId, organizationId, userId, valuationData, gisData, garmushkaData } = req.body;

    switch (action) {
      case 'save_to_db': {
        // Save complete valuation data to database
        const orgId = organizationId || 'default-org';
        const usrId = userId || 'system';

        const result = await ShumaDB.saveShumaFromSession(
          sessionId,
          orgId,
          usrId,
          valuationData
        );

        if (result.error) {
          return res.status(500).json({ error: result.error });
        }

        return res.json({
          success: true,
          shumaId: result.shumaId
        });
      }

      case 'load_from_db': {
        // Load valuation data from database
        const loadResult = await ShumaDB.loadShumaForWizard(sessionId);

        if (loadResult.error) {
          return res.status(404).json({ error: loadResult.error });
        }

        return res.json({
          success: true,
          valuationData: loadResult.valuationData
        });
      }

      case 'save_gis_data': {
        // Save GIS data
        const gisResult = await ShumaDB.saveGISData(sessionId, gisData);

        if (gisResult.error) {
          return res.status(500).json({ error: gisResult.error });
        }

        return res.json({ success: true });
      }

      case 'save_garmushka': {
        // Save Garmushka measurements
        const garmushkaResult = await ShumaDB.saveGarmushkaData(sessionId, garmushkaData);

        if (garmushkaResult.error) {
          return res.status(500).json({ error: garmushkaResult.error });
        }

        return res.json({ success: true });
      }

      case 'save_permit_extraction': {
        // Save building permit extraction
        const { sessionId: permitSessionId, extractedData } = req.body;
        const permitResult = await ShumaDB.savePermitExtraction(permitSessionId, extractedData, null);

        if (permitResult.error) {
          return res.status(500).json({ error: permitResult.error });
        }

        return res.json({ success: true });
      }

      case 'save_land_registry_extraction': {
        // Save land registry extraction
        const { sessionId: lrSessionId, extractedData: lrData } = req.body;
        const lrResult = await ShumaDB.saveLandRegistryExtraction(lrSessionId, lrData, null);

        if (lrResult.error) {
          return res.status(500).json({ error: lrResult.error });
        }

        return res.json({ success: true });
      }

      case 'save_shared_building_extraction': {
        // Save shared building order extraction
        const { sessionId: sbSessionId, extractedData: sbData } = req.body;
        const sbResult = await ShumaDB.saveSharedBuildingExtraction(sbSessionId, sbData, null);

        if (sbResult.error) {
          return res.status(500).json({ error: sbResult.error });
        }

        return res.json({ success: true });
      }

      case 'save_final_results': {
        // Save final valuation results
        const { sessionId: finalSessionId, results } = req.body;
        const finalResult = await ShumaDB.saveFinalResults(finalSessionId, results);

        if (finalResult.error) {
          return res.status(500).json({ error: finalResult.error });
        }

        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    logger.error('Session operation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:sessionId - Get session by ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await ShumaDB.loadShumaForWizard(sessionId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.valuationData
    });
  } catch (error) {
    logger.error('Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

