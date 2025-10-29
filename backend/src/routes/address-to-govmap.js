const express = require('express');
const router = express.Router();
const { addressToGovMap } = require('../../gis-analysis/govmap-integration');

/**
 * POST /api/address-to-govmap
 * Converts an address to GovMap URLs
 */
router.post('/', async (req, res) => {
  try {
    const { address, options = {} } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    console.log(`🔵 POST /api/address-to-govmap - Processing address: ${address}`);
    
    const result = await addressToGovMap(address, options);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Log what we got from addressToGovMap
    console.log('📊 addressToGovMap result structure:', {
      hasAddress: !!result.address,
      hasCoordinates: !!result.coordinates,
      hasGovmap: !!result.govmap,
      govmapKeys: result.govmap ? Object.keys(result.govmap) : []
    });

    // Format response to match frontend expectations
    const response = {
      success: true,
      address: result.address,
      coordinates: result.coordinates,
      govmap: result.govmap,
      confidence: result.confidence
    };

    console.log(`✅ POST /api/address-to-govmap - Success for: ${response.address.normalized}`);
    console.log(`🔗 Generated URLs:`, {
      url: response.govmap.url?.substring(0, 100) + '...',
      urlWithTazea: response.govmap.urlWithTazea?.substring(0, 100) + '...',
      urlWithoutTazea: response.govmap.urlWithoutTazea?.substring(0, 100) + '...'
    });
    
    res.json(response);

  } catch (error) {
    console.error('❌ Error in /api/address-to-govmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process address',
      details: error.message
    });
  }
});

module.exports = router;

