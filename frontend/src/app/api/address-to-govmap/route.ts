import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// GovMap Integration Functions (same as in gis-analysis route)
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
  // ITM projection parameters
  const a = 6378137.0
  const f = 1 / 298.257222101
  const lat0 = 31.7343936111111 * Math.PI / 180
  const lon0 = 35.2045169444444 * Math.PI / 180
  const k0 = 1.0000067
  const falseE = 219529.584
  const falseN = 626907.390

  const latRad = lat * Math.PI / 180
  const lonRad = lon * Math.PI / 180

  const b = a * (1 - f)
  const e2 = (a * a - b * b) / (a * a)
  const n = (a - b) / (a + b)

  const A0 = 1 - n + (5/4) * n * n - (5/4) * n * n * n
  const A2 = 3 * (n - n * n + (7/8) * n * n * n)
  const A4 = (15/8) * (n * n - n * n * n)
  const A6 = (35/24) * n * n * n

  const sigma = a / (1 + n) * (
    A0 * latRad -
    A2 * Math.sin(2 * latRad) +
    A4 * Math.sin(4 * latRad) -
    A6 * Math.sin(6 * latRad)
  )

  const sigma0 = a / (1 + n) * (
    A0 * lat0 -
    A2 * Math.sin(2 * lat0) +
    A4 * Math.sin(4 * lat0) -
    A6 * Math.sin(6 * lat0)
  )

  const dLon = lonRad - lon0
  const sinLat = Math.sin(latRad)
  const cosLat = Math.cos(latRad)
  const tanLat = Math.tan(latRad)

  const nu = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const rho = a * (1 - e2) / Math.pow(1 - e2 * sinLat * sinLat, 1.5)
  const eta2 = nu / rho - 1

  const I = sigma - sigma0
  const II = nu / 2 * sinLat * cosLat
  const III = nu / 24 * sinLat * Math.pow(cosLat, 3) * (5 - tanLat * tanLat + 9 * eta2)
  const IIIA = nu / 720 * sinLat * Math.pow(cosLat, 5) * (61 - 58 * tanLat * tanLat + Math.pow(tanLat, 4))
  const IV = nu * cosLat
  const V = nu / 6 * Math.pow(cosLat, 3) * (nu / rho - tanLat * tanLat)
  const VI = nu / 120 * Math.pow(cosLat, 5) * (5 - 18 * tanLat * tanLat + Math.pow(tanLat, 4))

  const northing = falseN + k0 * (
    I +
    II * dLon * dLon +
    III * Math.pow(dLon, 4) +
    IIIA * Math.pow(dLon, 6)
  )

  const easting = falseE + k0 * (
    IV * dLon +
    V * Math.pow(dLon, 3) +
    VI * Math.pow(dLon, 5)
  )

  return { easting, northing }
}

function buildGovMapUrl(easting: number, northing: number, options: { address?: string, showTazea?: boolean } = {}) {
  const GOVMAP_BASE_URL = 'https://www.govmap.gov.il/'
  const GOVMAP_CENTER_OFFSET = {
    easting: -45,
    northing: +180
  }

  const { address, showTazea = true } = options

  const eastingRounded = easting.toFixed(2)
  const northingRounded = northing.toFixed(2)

  const centerEasting = (easting + GOVMAP_CENTER_OFFSET.easting).toFixed(2)
  const centerNorthing = (northing + GOVMAP_CENTER_OFFSET.northing).toFixed(2)

  const params = new URLSearchParams()
  params.append('c', `${centerEasting},${centerNorthing}`)
  params.append('z', '13')
  
  const layers = showTazea ? '21,15' : '15'
  params.append('lay', layers)

  if (address && address.trim().length > 0) {
    params.append('q', address.trim())
  }

  const bsLayers = showTazea ? '15,21' : '15'
  params.append('bs', `${bsLayers}|${eastingRounded},${northingRounded}`)

  if (showTazea) {
    params.append('b', '1')
  }
  params.append('bb', '1')
  params.append('zb', '1')
  params.append('in', '1')

  const urlString = params.toString().replace(/%2C/g, ',')
  return `${GOVMAP_BASE_URL}?${urlString}`
}

export async function POST(request: NextRequest) {
  try {
    const { address, options = {} } = await request.json()

    if (!address) {
      return NextResponse.json({ 
        success: false, 
        error: 'Address is required' 
      }, { status: 400 })
    }

    console.log(`[1/3] Geocoding address: ${address}`)
    const geocodeResult = await geocodeAddress(address)

    if (!geocodeResult.success) {
      return NextResponse.json({
        success: false,
        error: geocodeResult.error,
        suggestion: geocodeResult.suggestion
      })
    }

    const { lat, lon, displayName, confidence = 0.5, details } = geocodeResult
    console.log(`[1/3] ✓ Found: ${displayName} (confidence: ${(confidence * 100).toFixed(1)}%)`)

    console.log(`[2/3] Converting coordinates: ${lat}, ${lon}`)
    const { easting, northing } = wgs84ToITM(lat || 0, lon || 0)
    console.log(`[2/3] ✓ ITM coordinates: ${easting.toFixed(2)}, ${northing.toFixed(2)}`)

    console.log(`[3/3] Generating GovMap URLs`)
    const govmapUrlWithoutTazea = buildGovMapUrl(easting, northing, { address, showTazea: false })
    const govmapUrlWithTazea = buildGovMapUrl(easting, northing, { address, showTazea: true })

    console.log(`[3/3] ✓ GovMap URLs generated`)

    const result = {
      success: true,
      address: {
        input: address,
        normalized: displayName,
        details
      },
      coordinates: {
        wgs84: { lat, lon },
        itm: {
          easting: parseFloat(easting.toFixed(2)),
          northing: parseFloat(northing.toFixed(2))
        }
      },
      govmap: {
        url: govmapUrlWithoutTazea, // Default to clean map
        urlWithTazea: govmapUrlWithTazea,
        urlWithoutTazea: govmapUrlWithoutTazea
      },
      confidence
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error in address-to-govmap:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process address',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
