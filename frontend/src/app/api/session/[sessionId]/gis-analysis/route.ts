import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'
import axios from 'axios'

// GovMap Integration Functions
async function geocodeAddress(address: string) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address.trim(),
        format: 'json',
        countrycodes: 'il',
        limit: 1,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'Shamay-SaaS/1.0 (Real Estate Document Processing)'
      },
      timeout: 10000
    })

    if (!response.data || response.data.length === 0) {
      return {
        success: false,
        error: 'Address not found',
        suggestion: 'Try a more specific address or check spelling'
      }
    }

    const result = response.data[0]
    const confidence = Math.min(result.importance || 0.5, 1.0)

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
    }
  } catch (error) {
    return {
      success: false,
      error: `Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

function wgs84ToITM(lat: number, lon: number) {
  // ITM projection parameters (EPSG:2039 - Israel Transverse Mercator)
  // Based on official Israeli Survey Authority specifications
  const a = 6378137.0                    // Semi-major axis (WGS84 ellipsoid)
  const f = 1 / 298.257222101            // Flattening
  const lat0 = 31.7343936111111 * Math.PI / 180  // Origin latitude (radians)
  const lon0 = 35.2045169444444 * Math.PI / 180  // Central meridian (radians)
  const k0 = 1.0000067                   // Scale factor
  const falseE = 219529.584              // False easting
  const falseN = 626907.390              // False northing

  // Validate inputs
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('Latitude and longitude must be numbers')
  }
  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    throw new Error('Invalid coordinate values (NaN or Infinity)')
  }

  const latRad = lat * Math.PI / 180
  const lonRad = lon * Math.PI / 180

  const b = a * (1 - f)
  const e2 = (a * a - b * b) / (a * a)
  const n = (a - b) / (a + b)

  // Calculate meridional arc coefficients (improved precision)
  const n2 = n * n
  const n3 = n2 * n
  const A0 = 1 - n + (5/4) * n2 - (5/4) * n3
  const A2 = 3 * (n - n2 + (7/8) * n3)
  const A4 = (15/8) * (n2 - n3)
  const A6 = (35/24) * n3

  // Calculate meridional arc length
  const sin2Lat = Math.sin(2 * latRad)
  const sin4Lat = Math.sin(4 * latRad)
  const sin6Lat = Math.sin(6 * latRad)
  
  const sigma = a / (1 + n) * (
    A0 * latRad -
    A2 * sin2Lat +
    A4 * sin4Lat -
    A6 * sin6Lat
  )

  const sin2Lat0 = Math.sin(2 * lat0)
  const sin4Lat0 = Math.sin(4 * lat0)
  const sin6Lat0 = Math.sin(6 * lat0)
  
  const sigma0 = a / (1 + n) * (
    A0 * lat0 -
    A2 * sin2Lat0 +
    A4 * sin4Lat0 -
    A6 * sin6Lat0
  )

  const dLon = lonRad - lon0
  const sinLat = Math.sin(latRad)
  const cosLat = Math.cos(latRad)
  const tanLat = Math.tan(latRad)
  const cosLat2 = cosLat * cosLat
  const cosLat3 = cosLat2 * cosLat
  const cosLat5 = cosLat3 * cosLat2
  const tanLat2 = tanLat * tanLat
  const tanLat4 = tanLat2 * tanLat2

  const sinLat2 = sinLat * sinLat
  const sqrtTerm = Math.sqrt(1 - e2 * sinLat2)
  const nu = a / sqrtTerm
  const rho = a * (1 - e2) / Math.pow(1 - e2 * sinLat2, 1.5)
  const eta2 = nu / rho - 1

  // Calculate projection coefficients (optimized to reduce floating point errors)
  const I = sigma - sigma0
  const II = nu / 2 * sinLat * cosLat
  const III = nu / 24 * sinLat * cosLat3 * (5 - tanLat2 + 9 * eta2)
  const IIIA = nu / 720 * sinLat * cosLat5 * (61 - 58 * tanLat2 + tanLat4)
  const IV = nu * cosLat
  const V = nu / 6 * cosLat3 * (nu / rho - tanLat2)
  const VI = nu / 120 * cosLat5 * (5 - 18 * tanLat2 + tanLat4)

  // Calculate ITM coordinates (using optimized power calculations)
  const dLon2 = dLon * dLon
  const dLon3 = dLon2 * dLon
  const dLon4 = dLon2 * dLon2
  const dLon5 = dLon3 * dLon2
  const dLon6 = dLon3 * dLon3

  const northing = falseN + k0 * (
    I +
    II * dLon2 +
    III * dLon4 +
    IIIA * dLon6
  )

  const easting = falseE + k0 * (
    IV * dLon +
    V * dLon3 +
    VI * dLon5
  )

  // Validate results
  if (isNaN(easting) || isNaN(northing) || !isFinite(easting) || !isFinite(northing)) {
    throw new Error('Coordinate conversion produced invalid results')
  }

  return { easting, northing }
}

function buildGovMapUrl(easting: number, northing: number, options: { address?: string, showTazea?: boolean, showInfo?: boolean } = {}) {
  const GOVMAP_BASE_URL = 'https://www.govmap.gov.il/'
  // Offset to center the view properly (marker will be at easting, northing)
  // Set to 0 to center directly on the building
  const GOVMAP_CENTER_OFFSET = {
    easting: 0,    // No offset - center directly on building
    northing: 0    // No offset - center directly on building
  }

  const { address, showTazea = true, showInfo = false } = options

  // Round coordinates to 2 decimal places (for marker position)
  // Note: 2 decimal places = ~1cm precision, which is sufficient for GovMap
  const eastingRounded = Math.round(easting * 100) / 100
  const northingRounded = Math.round(northing * 100) / 100

  // Calculate center coordinates with offset
  // Use Math.round for better precision than toFixed
  const centerEasting = Math.round((easting + GOVMAP_CENTER_OFFSET.easting) * 100) / 100
  const centerNorthing = Math.round((northing + GOVMAP_CENTER_OFFSET.northing) * 100) / 100

  const params = new URLSearchParams()
  // Format coordinates with 2 decimal places for URL
  params.append('c', `${centerEasting.toFixed(2)},${centerNorthing.toFixed(2)}`)
  params.append('z', '13') // Increased zoom level for better address visibility
  
  const layers = showTazea ? '21,15' : '15'
  params.append('lay', layers)

  if (address && address.trim().length > 0) {
    params.append('q', address.trim())
  }

  // Building selection layers (bs parameter should only contain layer numbers)
  const bsLayers = showTazea ? '15,21' : '15'
  params.append('bs', bsLayers)

  if (showTazea) {
    params.append('b', '1')
  }
  params.append('bb', '1')
  params.append('zb', '1')
  
  // Only add info panel if explicitly requested
  if (showInfo) {
    params.append('in', '1')
  }

  const urlString = params.toString().replace(/%2C/g, ',')
  return `${GOVMAP_BASE_URL}?${urlString}`
}

async function addressToGovMap(address: string) {
  try {
    console.log(`[1/3] Geocoding address: ${address}`)
    const geocodeResult = await geocodeAddress(address)

    if (!geocodeResult.success) {
      return {
        success: false,
        error: geocodeResult.error,
        suggestion: geocodeResult.suggestion
      }
    }

    const { lat, lon, displayName, confidence = 0.5, details } = geocodeResult
    console.log(`[1/3] ✓ Found: ${displayName} (confidence: ${(confidence * 100).toFixed(1)}%)`)

    console.log(`[2/3] Converting coordinates: ${lat}, ${lon}`)
    const { easting, northing } = wgs84ToITM(lat || 0, lon || 0)
    console.log(`[2/3] ✓ ITM coordinates: ${easting.toFixed(2)}, ${northing.toFixed(2)}`)

    console.log(`[3/3] Generating GovMap URLs`)
    const govmapUrlWithoutTazea = buildGovMapUrl(easting, northing, { address, showTazea: false, showInfo: false })
    const govmapUrlWithTazea = buildGovMapUrl(easting, northing, { address, showTazea: true, showInfo: false })

    console.log(`[3/3] ✓ GovMap URLs generated:`)
    console.log(`  - Without Tazea: ${govmapUrlWithoutTazea}`)
    console.log(`  - With Tazea: ${govmapUrlWithTazea}`)

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
        url: govmapUrlWithoutTazea,
        urlWithTazea: govmapUrlWithTazea,
        urlWithoutTazea: govmapUrlWithoutTazea
      },
      confidence
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      address
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success || !loadResult.valuationData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = loadResult.valuationData
    console.log(`🗺️ Starting GovMap analysis for session ${params.sessionId}`)

    // Get property data from session
    const propertyData = {
      // Address information from Step 1
      street: sessionData.street || '',
      buildingNumber: sessionData.buildingNumber || '',
      city: sessionData.city || '',
      
      // Full address for geocoding
      address: (sessionData.street && sessionData.city) ? 
        `${sessionData.street} ${sessionData.buildingNumber || ''}, ${sessionData.city}`.trim() : 
        '',
      
      // Coordinates (only include if they exist)
      ...((sessionData as any).lat && (sessionData as any).lng ? { lat: (sessionData as any).lat, lng: (sessionData as any).lng } : {}),
      ...((sessionData as any).coordinates ? { coordinates: (sessionData as any).coordinates } : {})
    }

    console.log('📍 Property data for GovMap analysis:', propertyData)
    
    // Check if we have minimum required data
    const hasCoordinates = !!(propertyData.lat && propertyData.lng)
    const hasAddress = !!(propertyData.street && propertyData.city)
    
    if (!hasCoordinates && !hasAddress) {
      return NextResponse.json({
        success: false,
        error: 'No coordinates or address data available for GovMap analysis',
        details: 'Please ensure the property has either coordinates (lat/lng) or address (street/city) data',
        propertyData: propertyData
      }, { status: 400 })
    }

    try {
      let address = propertyData.address
      
      // If we have coordinates but no address, try to reverse geocode
      if (hasCoordinates && !hasAddress) {
        // For now, we'll use a fallback address
        address = `${propertyData.lat}, ${propertyData.lng}`
      }

      console.log('🗺️ Processing address:', address)

      // Use the new GovMap integration
      const result = await addressToGovMap(address)

      if (!result.success) {
        console.error('🗺️ GovMap analysis failed:', result.error)
        return NextResponse.json({ 
          success: false, 
          error: result.error || 'GovMap analysis failed' 
        }, { status: 400 })
      }

      console.log('🗺️ GovMap analysis successful:', result)

      // Format the result for the frontend
      const measurements = {
        coordinates: {
          x: result.coordinates?.itm?.easting || 0,
          y: result.coordinates?.itm?.northing || 0,
          lat: result.coordinates?.wgs84?.lat || 0,
          lng: result.coordinates?.wgs84?.lon || 0
        },
        govmapUrls: {
          cropMode0: result.govmap?.urlWithoutTazea || '',  // Clean map (no תצ"א)
          cropMode1: result.govmap?.urlWithTazea || ''     // With תצ"א overlay
        },
        extractedAt: new Date().toISOString(),
        status: 'success',
        confidence: result.confidence,
        address: typeof result.address === 'string' ? result.address : result.address?.normalized || ''
      }

      console.log('📊 Formatted measurements for storage:')
      console.log(`  - cropMode0 URL: ${measurements.govmapUrls.cropMode0}`)
      console.log(`  - cropMode1 URL: ${measurements.govmapUrls.cropMode1}`)

      // Update session with GovMap analysis results in database
      const updateResult = await ShumaDB.saveShumaFromSession(
        params.sessionId,
        'default-org',
        'system',
        {
          ...sessionData,
          lat: result.coordinates?.wgs84?.lat || 0,
          lng: result.coordinates?.wgs84?.lon || 0,
          coordinates: measurements.coordinates,
          gisAnalysis: measurements
        }
      )

      console.log('🗺️ Updated session with GovMap analysis:', measurements, 'DB result:', updateResult)

      return NextResponse.json({
        success: true,
        message: 'GovMap analysis completed successfully',
        measurements: measurements
      })

    } catch (error) {
      console.error('❌ Error in GovMap analysis:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to run GovMap analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'GovMap analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success || !loadResult.valuationData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = loadResult.valuationData
    const gisAnalysis = sessionData.gisAnalysis || null
    const gisScreenshots = sessionData.gisScreenshots || null

    console.log(`📊 GovMap Analysis GET - Session: ${params.sessionId}`)
    console.log(`📊 GovMap Analysis:`, gisAnalysis)
    console.log(`📊 GovMap Screenshots:`, gisScreenshots)

    return NextResponse.json({
      success: true,
      measurements: gisAnalysis,
      gisScreenshots: gisScreenshots
    })

  } catch (error) {
    console.error('❌ Error retrieving GovMap analysis:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve GovMap analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}