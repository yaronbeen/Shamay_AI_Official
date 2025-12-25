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
    // ITM projection parameters (EPSG:2039 - Israel Transverse Mercator)
    // Based on official Israeli Survey Authority specifications
    const a = 6378137.0;                    // Semi-major axis (WGS84 ellipsoid)
    const f = 1 / 298.257222101;            // Flattening
    const lat0 = 31.7343936111111 * Math.PI / 180;  // Origin latitude (radians)
    const lon0 = 35.2045169444444 * Math.PI / 180;  // Central meridian (radians)
    const k0 = 1.0000067;                   // Scale factor
    const falseE = 219529.584;              // False easting
    const falseN = 626907.390;              // False northing

    // Validate inputs
    if (typeof lat !== 'number' || typeof lon !== 'number') {
        throw new Error('Latitude and longitude must be numbers');
    }
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        throw new Error('Invalid coordinate values (NaN or Infinity)');
    }

    // Convert input coordinates to radians
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;

    // Calculate ellipsoid parameters
    const b = a * (1 - f);                  // Semi-minor axis
    const e2 = (a * a - b * b) / (a * a);  // First eccentricity squared
    const n = (a - b) / (a + b);           // Third flattening

    // Calculate meridional arc coefficients (improved precision)
    const n2 = n * n;
    const n3 = n2 * n;
    const A0 = 1 - n + (5/4) * n2 - (5/4) * n3;
    const A2 = 3 * (n - n2 + (7/8) * n3);
    const A4 = (15/8) * (n2 - n3);
    const A6 = (35/24) * n3;

    // Calculate meridional arc length
    const sin2Lat = Math.sin(2 * latRad);
    const sin4Lat = Math.sin(4 * latRad);
    const sin6Lat = Math.sin(6 * latRad);
    
    const sigma = a / (1 + n) * (
        A0 * latRad -
        A2 * sin2Lat +
        A4 * sin4Lat -
        A6 * sin6Lat
    );

    const sin2Lat0 = Math.sin(2 * lat0);
    const sin4Lat0 = Math.sin(4 * lat0);
    const sin6Lat0 = Math.sin(6 * lat0);
    
    const sigma0 = a / (1 + n) * (
        A0 * lat0 -
        A2 * sin2Lat0 +
        A4 * sin4Lat0 -
        A6 * sin6Lat0
    );

    // Calculate trigonometric functions
    const dLon = lonRad - lon0;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const tanLat = Math.tan(latRad);
    const cosLat2 = cosLat * cosLat;
    const cosLat3 = cosLat2 * cosLat;
    const cosLat5 = cosLat3 * cosLat2;
    const tanLat2 = tanLat * tanLat;
    const tanLat4 = tanLat2 * tanLat2;

    // Calculate radii of curvature
    const sinLat2 = sinLat * sinLat;
    const sqrtTerm = Math.sqrt(1 - e2 * sinLat2);
    const nu = a / sqrtTerm;
    const rho = a * (1 - e2) / Math.pow(1 - e2 * sinLat2, 1.5);
    const eta2 = nu / rho - 1;

    // Calculate projection coefficients (optimized to reduce floating point errors)
    const I = sigma - sigma0;
    const II = nu / 2 * sinLat * cosLat;
    const III = nu / 24 * sinLat * cosLat3 * (5 - tanLat2 + 9 * eta2);
    const IIIA = nu / 720 * sinLat * cosLat5 * (61 - 58 * tanLat2 + tanLat4);
    const IV = nu * cosLat;
    const V = nu / 6 * cosLat3 * (nu / rho - tanLat2);
    const VI = nu / 120 * cosLat5 * (5 - 18 * tanLat2 + tanLat4);

    // Calculate ITM coordinates (using optimized power calculations)
    const dLon2 = dLon * dLon;
    const dLon3 = dLon2 * dLon;
    const dLon4 = dLon2 * dLon2;
    const dLon5 = dLon3 * dLon2;
    const dLon6 = dLon3 * dLon3;

    const northing = falseN + k0 * (
        I +
        II * dLon2 +
        III * dLon4 +
        IIIA * dLon6
    );

    const easting = falseE + k0 * (
        IV * dLon +
        V * dLon3 +
        VI * dLon5
    );

    // Validate results
    if (isNaN(easting) || isNaN(northing) || !isFinite(easting) || !isFinite(northing)) {
        throw new Error('Coordinate conversion produced invalid results');
    }

    return { easting, northing };
}

/**
 * Validate WGS84 coordinates for Israel
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} - True if coordinates are within Israel's approximate bounds
 */
function validateIsraeliCoordinates(lat, lon) {
    // More accurate bounds of Israel (including territories)
    // Based on official Israeli Survey Authority data
    const LAT_MIN = 29.45;  // Southernmost point (Eilat area)
    const LAT_MAX = 33.35;  // Northernmost point (Golan Heights)
    const LON_MIN = 34.22;  // Westernmost point (Mediterranean coast)
    const LON_MAX = 35.95;  // Easternmost point (Jordan Valley, Dead Sea)

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
        
        // Additional validation: check if ITM coordinates are within reasonable bounds for Israel
        // ITM coordinates for Israel typically range:
        // Easting: ~100000 to ~300000
        // Northing: ~500000 to ~800000
        const ITM_EASTING_MIN = 50000;
        const ITM_EASTING_MAX = 350000;
        const ITM_NORTHING_MIN = 400000;
        const ITM_NORTHING_MAX = 900000;
        
        if (easting < ITM_EASTING_MIN || easting > ITM_EASTING_MAX ||
            northing < ITM_NORTHING_MIN || northing > ITM_NORTHING_MAX) {
            return {
                easting,
                northing,
                isValid: true, // Still valid, but outside typical range
                error: null,
                warning: 'ITM coordinates are outside typical Israeli bounds'
            };
        }
        
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
                    limit: 3,            // Get multiple results to find best match
                    addressdetails: 1,
                    extratags: 1,         // Get extra tags for better matching
                    namedetails: 1       // Get name details
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

            // Find the best match from results
            // Prefer results with house numbers and exact street matches
            let bestResult = response.data[0];
            let bestScore = 0;

            for (const result of response.data) {
                let score = result.importance || 0.5;
                
                // Boost score if it has a house number (more specific)
                if (result.address?.house_number) {
                    score += 0.2;
                }
                
                // Boost score if it's a building or house type
                if (result.type === 'house' || result.type === 'building' || result.class === 'building') {
                    score += 0.15;
                }
                
                // Boost score if it has a street name
                if (result.address?.road) {
                    score += 0.1;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestResult = result;
                }
            }

            const result = bestResult;

            // Calculate confidence score (normalized to 0-1)
            const confidence = Math.min(bestScore, 1.0);

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
        zoom: 11,             // Higher zoom level (16-17) for better building visibility
        showTazea: true,      // Show land registry overlay (affects lay and bs parameters)
        showBorder: true,     // bb=1
        showZoomBorder: true, // zb=1
        showInfo: false,      // Don't show info panel by default
        ...options
    };

    const { address, zoom, showTazea } = config;

    // Validate coordinates
    if (typeof easting !== 'number' || typeof northing !== 'number') {
        throw new Error('Invalid coordinates: easting and northing must be numbers');
    }

    // Round coordinates to 2 decimal places (for marker position)
    // Note: 2 decimal places = ~1cm precision, which is sufficient for GovMap
    const eastingRounded = Math.round(easting * 100) / 100;
    const northingRounded = Math.round(northing * 100) / 100;

    // Calculate center coordinates with offset
    // Use Math.round for better precision than toFixed
    const centerEasting = Math.round((easting + GOVMAP_CENTER_OFFSET.easting) * 100) / 100;
    const centerNorthing = Math.round((northing + GOVMAP_CENTER_OFFSET.northing) * 100) / 100;

    // Build URL parameters
    const params = new URLSearchParams();

    // Center coordinates (with offset for better framing)
    // Format coordinates with 2 decimal places for URL
    params.append('c', `${centerEasting.toFixed(2)},${centerNorthing.toFixed(2)}`);

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
    // Format coordinates with 2 decimal places for URL
    params.append('bs', `${bsLayers}|${eastingRounded.toFixed(2)},${northingRounded.toFixed(2)}`);

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
                    lat: Math.round(lat * 1000000) / 1000000, // 6 decimal places = ~10cm precision
                    lon: Math.round(lon * 1000000) / 1000000
                },
                itm: {
                    easting: Math.round(easting * 100) / 100, // 2 decimal places = ~1cm precision
                    northing: Math.round(northing * 100) / 100
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
