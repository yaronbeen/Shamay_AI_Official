/**
 * GovMap Integration - Main Module
 *
 * Complete workflow: Address → Geocoding → Coordinate Conversion → GovMap URL
 *
 * This module orchestrates the entire process of converting an Israeli address
 * into a GovMap URL with proper coordinates and markers.
 */

const axios = require('axios');

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Sleep function for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert WGS84 coordinates to ITM coordinates
 * @param {number} lat - Latitude in decimal degrees (e.g., 32.0853)
 * @param {number} lon - Longitude in decimal degrees (e.g., 34.7818)
 * @returns {Object} - { easting, northing } in meters
 */
function wgs84ToITM(lat, lon) {
    // ITM projection parameters
    const a = 6378137.0;                    // Semi-major axis (WGS84 ellipsoid)
    const f = 1 / 298.257222101;            // Flattening
    const lat0 = 31.7343936111111 * Math.PI / 180;  // Origin latitude (radians)
    const lon0 = 35.2045169444444 * Math.PI / 180;  // Central meridian (radians)
    const k0 = 1.0000067;                   // Scale factor
    const falseE = 219529.584;              // False easting
    const falseN = 626907.390;              // False northing

    // Convert input coordinates to radians
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;

    // Calculate ellipsoid parameters
    const b = a * (1 - f);                  // Semi-minor axis
    const e2 = (a * a - b * b) / (a * a);  // First eccentricity squared
    const n = (a - b) / (a + b);           // Third flattening

    // Calculate meridional arc coefficients
    const A0 = 1 - n + (5/4) * n * n - (5/4) * n * n * n;
    const A2 = 3 * (n - n * n + (7/8) * n * n * n);
    const A4 = (15/8) * (n * n - n * n * n);
    const A6 = (35/24) * n * n * n;

    // Calculate meridional arc length
    const sigma = a / (1 + n) * (
        A0 * latRad -
        A2 * Math.sin(2 * latRad) +
        A4 * Math.sin(4 * latRad) -
        A6 * Math.sin(6 * latRad)
    );

    const sigma0 = a / (1 + n) * (
        A0 * lat0 -
        A2 * Math.sin(2 * lat0) +
        A4 * Math.sin(4 * lat0) -
        A6 * Math.sin(6 * lat0)
    );

    // Calculate trigonometric functions
    const dLon = lonRad - lon0;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const tanLat = Math.tan(latRad);

    // Calculate radii of curvature
    const nu = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    const rho = a * (1 - e2) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
    const eta2 = nu / rho - 1;

    // Calculate projection coefficients
    const I = sigma - sigma0;
    const II = nu / 2 * sinLat * cosLat;
    const III = nu / 24 * sinLat * Math.pow(cosLat, 3) * (5 - tanLat * tanLat + 9 * eta2);
    const IIIA = nu / 720 * sinLat * Math.pow(cosLat, 5) * (61 - 58 * tanLat * tanLat + Math.pow(tanLat, 4));
    const IV = nu * cosLat;
    const V = nu / 6 * Math.pow(cosLat, 3) * (nu / rho - tanLat * tanLat);
    const VI = nu / 120 * Math.pow(cosLat, 5) * (5 - 18 * tanLat * tanLat + Math.pow(tanLat, 4));

    // Calculate ITM coordinates
    const northing = falseN + k0 * (
        I +
        II * dLon * dLon +
        III * Math.pow(dLon, 4) +
        IIIA * Math.pow(dLon, 6)
    );

    const easting = falseE + k0 * (
        IV * dLon +
        V * Math.pow(dLon, 3) +
        VI * Math.pow(dLon, 5)
    );

    return { easting, northing };
}

/**
 * Validate WGS84 coordinates for Israel
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} - True if coordinates are within Israel's approximate bounds
 */
function validateIsraeliCoordinates(lat, lon) {
    // Approximate bounds of Israel
    const LAT_MIN = 29.5;  // Eilat area
    const LAT_MAX = 33.3;  // Northern border
    const LON_MIN = 34.3;  // Mediterranean coast
    const LON_MAX = 35.9;  // Jordan Valley

    return lat >= LAT_MIN && lat <= LAT_MAX && lon >= LON_MIN && lon <= LON_MAX;
}

/**
 * Convert WGS84 to ITM with validation
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} - { easting, northing, isValid, error }
 */
function convertWithValidation(lat, lon) {
    // Validate input types
    if (typeof lat !== 'number' || typeof lon !== 'number') {
        return {
            easting: null,
            northing: null,
            isValid: false,
            error: 'Coordinates must be numbers'
        };
    }

    // Validate ranges
    if (lat < -90 || lat > 90) {
        return {
            easting: null,
            northing: null,
            isValid: false,
            error: 'Latitude must be between -90 and 90'
        };
    }

    if (lon < -180 || lon > 180) {
        return {
            easting: null,
            northing: null,
            isValid: false,
            error: 'Longitude must be between -180 and 180'
        };
    }

    // Check if coordinates are in Israel
    if (!validateIsraeliCoordinates(lat, lon)) {
        return {
            easting: null,
            northing: null,
            isValid: false,
            error: 'Coordinates appear to be outside Israel',
            warning: true  // Soft warning, conversion still possible
        };
    }

    try {
        const { easting, northing } = wgs84ToITM(lat, lon);
        return {
            easting,
            northing,
            isValid: true,
            error: null
        };
    } catch (error) {
        return {
            easting: null,
            northing: null,
            isValid: false,
            error: `Conversion failed: ${error.message}`
        };
    }
}

/**
 * Geocode an Israeli address using Nominatim
 * @param {string} address - Address to geocode (Hebrew or English)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - { lat, lon, displayName, confidence }
 */
async function geocodeAddress(address, options = {}) {
    const {
        userAgent = 'Shamay-SaaS/1.0 (Real Estate Document Processing)',
        timeout = 10000,
        retries = 2
    } = options;

    // Validate input
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
        throw new Error('Invalid address: must be a non-empty string');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();

    // Make request with retries
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: address.trim(),
                    format: 'json',
                    countrycodes: 'il',  // Restrict to Israel
                    limit: 1,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': userAgent
                },
                timeout
            });

            // Check if we got results
            if (!response.data || response.data.length === 0) {
                return {
                    success: false,
                    error: 'Address not found',
                    suggestion: 'Try a more specific address or check spelling'
                };
            }

            const result = response.data[0];

            // Parse importance as confidence score
            const confidence = Math.min(result.importance || 0.5, 1.0);

            return {
                success: true,
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                displayName: result.display_name,
                confidence,
                details: {
                    city: result.address?.city || result.address?.town || result.address?.village,
                    street: result.address?.road,
                    houseNumber: result.address?.house_number,
                    postcode: result.address?.postcode,
                    type: result.type,
                    osmId: result.osm_id,
                    osmType: result.osm_type
                }
            };

        } catch (error) {
            lastError = error;

            // Don't retry on certain errors
            if (error.response?.status === 403 || error.response?.status === 429) {
                throw new Error(`Nominatim API error: ${error.response.status} - Rate limit or access denied`);
            }

            // Wait before retry
            if (attempt < retries) {
                await sleep(2000 * (attempt + 1)); // Exponential backoff
            }
        }
    }

    // All retries failed
    throw new Error(`Geocoding failed after ${retries + 1} attempts: ${lastError.message}`);
}

/**
 * Build GovMap URL
 * @param {number} easting - ITM easting coordinate
 * @param {number} northing - ITM northing coordinate
 * @param {Object} options - Configuration options
 * @returns {string} - Complete GovMap URL
 */
function buildGovMapUrl(easting, northing, options = {}) {
    const GOVMAP_BASE_URL = 'https://www.govmap.gov.il/';
    
    // Map center offset from marker position
    const GOVMAP_CENTER_OFFSET = {
        easting: -45,   // Move center 45m west of marker
        northing: +180  // Move center 180m north of marker
    };

    const config = {
        zoom: 13,
        showTazea: true,      // Show land registry overlay (affects lay and bs parameters)
        showBorder: true,     // bb=1
        showZoomBorder: true, // zb=1
        showInfo: true,       // in=1
        ...options
    };

    const { address, zoom, showTazea } = config;

    // Validate coordinates
    if (typeof easting !== 'number' || typeof northing !== 'number') {
        throw new Error('Invalid coordinates: easting and northing must be numbers');
    }

    // Round coordinates to 2 decimal places (for marker position)
    const eastingRounded = easting.toFixed(2);
    const northingRounded = northing.toFixed(2);

    // Calculate center coordinates with offset
    const centerEasting = (easting + GOVMAP_CENTER_OFFSET.easting).toFixed(2);
    const centerNorthing = (northing + GOVMAP_CENTER_OFFSET.northing).toFixed(2);

    // Build URL parameters
    const params = new URLSearchParams();

    // Center coordinates (with offset for better framing)
    params.append('c', `${centerEasting},${centerNorthing}`);

    // Zoom level
    params.append('z', zoom.toString());

    // Layers
    const layers = showTazea ? '21,15' : '15';
    params.append('lay', layers);

    // Address query (if provided)
    if (address && typeof address === 'string' && address.trim().length > 0) {
        params.append('q', address.trim());
    }

    // Marker position (bs uses reversed layer order: 15,21 instead of 21,15)
    const bsLayers = showTazea ? '15,21' : '15';
    params.append('bs', `${bsLayers}|${eastingRounded},${northingRounded}`);

    // Additional toggles
    if (showTazea) {
        params.append('b', '1');  // Show תצ"א overlay
    }
    if (config.showBorder) {
        params.append('bb', '1');
    }
    if (config.showZoomBorder) {
        params.append('zb', '1');
    }
    if (config.showInfo) {
        params.append('in', '1');
    }

    // URLSearchParams encodes commas as %2C, but GovMap expects raw commas
    // Only pipes (|) should be encoded as %7C
    const urlString = params.toString().replace(/%2C/g, ',');
    return `${GOVMAP_BASE_URL}?${urlString}`;
}

/**
 * Convert address to GovMap URL (complete workflow)
 * @param {string} address - Israeli address (Hebrew or English)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Complete result with coordinates and URLs
 */
async function addressToGovMap(address, options = {}) {
    const startTime = Date.now();

    try {
        // Step 1: Geocode the address (add ", Israel" for better Nominatim results)
        const geocodingAddress = address.includes('Israel') ? address : `${address}, Israel`;
        console.log(`[1/3] Geocoding address: ${geocodingAddress}`);
        const geocodeResult = await geocodeAddress(geocodingAddress, options);

        if (!geocodeResult.success) {
            return {
                success: false,
                error: geocodeResult.error,
                suggestion: geocodeResult.suggestion,
                processingTime: Date.now() - startTime
            };
        }

        const { lat, lon, displayName, confidence, details } = geocodeResult;
        console.log(`[1/3] ✓ Found: ${displayName} (confidence: ${(confidence * 100).toFixed(1)}%)`);

        // Step 2: Convert WGS84 to ITM
        console.log(`[2/3] Converting coordinates: ${lat}, ${lon}`);
        const itmResult = convertWithValidation(lat, lon);

        if (!itmResult.isValid) {
            return {
                success: false,
                error: itmResult.error,
                warning: itmResult.warning,
                wgs84: { lat, lon },
                processingTime: Date.now() - startTime
            };
        }

        const { easting, northing } = itmResult;
        console.log(`[2/3] ✓ ITM coordinates: ${easting.toFixed(2)}, ${northing.toFixed(2)}`);

        // Step 3: Generate GovMap URLs
        console.log(`[3/3] Generating GovMap URLs`);

        // Generate URL without land registry overlay (for drawing - cleaner view)
        const govmapUrlWithoutTazea = buildGovMapUrl(easting, northing, {
            ...options,
            address,
            showTazea: false
        });

        // Generate URL with land registry overlay (for viewing land parcels)
        const govmapUrlWithTazea = buildGovMapUrl(easting, northing, {
            ...options,
            address,
            showTazea: true
        });

        // Use the non-tazea URL as default (easier for drawing)
        const govmapUrl = govmapUrlWithoutTazea;

        console.log(`[3/3] ✓ GovMap URLs generated (with and without תצ"א overlay)`);

        // Return complete result
        return {
            success: true,
            address: {
                input: address,
                normalized: displayName,
                details
            },
            coordinates: {
                wgs84: {
                    lat,
                    lon
                },
                itm: {
                    easting: parseFloat(easting.toFixed(2)),
                    northing: parseFloat(northing.toFixed(2))
                }
            },
            govmap: {
                url: govmapUrl,  // Default URL (without tazea for drawing)
                urlWithTazea: govmapUrlWithTazea,  // URL with land registry overlay
                urlWithoutTazea: govmapUrlWithoutTazea,  // URL without overlay
            },
            confidence,
            processingTime: Date.now() - startTime
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            address,
            processingTime: Date.now() - startTime
        };
    }
}

module.exports = {
    addressToGovMap,
    wgs84ToITM,
    convertWithValidation,
    geocodeAddress,
    buildGovMapUrl
};
