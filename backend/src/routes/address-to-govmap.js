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
    
    // Default coordinates that indicate a fallback/default value
    const DEFAULT_COORDS = { easting: 219143.61, northing: 618345.06 };
    const TOLERANCE = 100; // 100m tolerance
    
    const maxRetries = options.maxRetries || 3;
    let lastResult = null;
    let lastError = null;

    // Retry loop
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`[Retry ${attempt}/${maxRetries - 1}] Retrying geocoding for: ${address}`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const result = await addressToGovMap(address, options);

      if (!result.success) {
        lastError = result.error;
        // Don't retry on certain errors
        if (result.error && (
          result.error.includes('Rate limit') ||
          result.error.includes('access denied') ||
          result.error.includes('Invalid address')
        )) {
          return res.status(404).json(result);
        }
        continue; // Try again
      }

      // Check if coordinates are default/fallback coordinates
      const easting = result.coordinates?.itm?.easting;
      const northing = result.coordinates?.itm?.northing;
      
      if (easting && northing) {
        const isDefault = Math.abs(easting - DEFAULT_COORDS.easting) < TOLERANCE && 
                         Math.abs(northing - DEFAULT_COORDS.northing) < TOLERANCE;
        
        if (isDefault) {
          console.log(`⚠️ Default coordinates detected: ${easting.toFixed(2)}, ${northing.toFixed(2)} - Retrying...`);
          lastError = 'Default coordinates detected';
          lastResult = result;
          continue; // Try again
        }
      }

      // Check if coordinates are undefined or invalid
      if (!easting || !northing || isNaN(easting) || isNaN(northing)) {
        console.log(`⚠️ Invalid coordinates detected: easting=${easting}, northing=${northing} - Retrying...`);
        lastError = 'Invalid coordinates received';
        continue; // Try again
      }

      // Check if URL contains default coordinates
      const url = result.govmap?.url || result.govmap?.urlWithoutTazea || '';
      if (url.includes(`c=${DEFAULT_COORDS.easting.toFixed(2)}`) || 
          url.includes(`c=${DEFAULT_COORDS.easting}`)) {
        console.log(`⚠️ URL contains default coordinates - Retrying...`);
        lastError = 'URL contains default coordinates';
        lastResult = result;
        continue; // Try again
      }

      // Success - valid coordinates
      console.log('📊 addressToGovMap result structure:', {
        hasAddress: !!result.address,
        hasCoordinates: !!result.coordinates,
        hasGovmap: !!result.govmap,
        govmapKeys: result.govmap ? Object.keys(result.govmap) : [],
        easting: easting.toFixed(2),
        northing: northing.toFixed(2)
      });

      const response = {
        success: true,
        address: result.address,
        coordinates: result.coordinates,
        govmap: result.govmap,
        confidence: result.confidence,
        attempts: attempt + 1
      };

      console.log(`✅ POST /api/address-to-govmap - Success for: ${response.address.normalized} (attempt ${attempt + 1})`);
      console.log(`🔗 Generated URLs:`, {
        url: response.govmap.url?.substring(0, 100) + '...',
        urlWithTazea: response.govmap.urlWithTazea?.substring(0, 100) + '...',
        urlWithoutTazea: response.govmap.urlWithoutTazea?.substring(0, 100) + '...'
      });
      
      return res.json(response);
    }

    // All retries failed
    console.error(`❌ All ${maxRetries} attempts failed for address: ${address}`);
    return res.status(404).json({
      success: false,
      error: lastError || 'Geocoding failed after all retries',
      address,
      lastResult
    });

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

