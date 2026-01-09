import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Test WMS endpoint for GovMap static map images
 *
 * Usage: GET /api/test-wms?easting=178500&northing=662500&size=500
 *
 * This fetches a static map image from GovMap's WMS service
 * Works on Vercel - no Puppeteer needed!
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Get center coordinates (ITM - Israeli Transverse Mercator)
    const easting = parseFloat(searchParams.get('easting') || '178500')  // Default: Tel Aviv area
    const northing = parseFloat(searchParams.get('northing') || '662500')
    const size = parseInt(searchParams.get('size') || '500')  // Size in meters
    const width = parseInt(searchParams.get('width') || '800')  // Image width in pixels
    const height = parseInt(searchParams.get('height') || '800')  // Image height in pixels
    const layer = searchParams.get('layer') || 'PARCEL_ALL'  // Layer to show

    // Calculate bounding box (center ± size/2)
    const halfSize = size / 2
    const bbox = [
      easting - halfSize,   // minX
      northing - halfSize,  // minY
      easting + halfSize,   // maxX
      northing + halfSize   // maxY
    ].join(',')

    console.log(`📍 WMS Request: center=(${easting}, ${northing}), size=${size}m, bbox=${bbox}`)

    // Construct WMS GetMap URL
    const wmsUrl = new URL('https://open.govmap.gov.il/geoserver/opendata/wms')
    wmsUrl.searchParams.set('SERVICE', 'WMS')
    wmsUrl.searchParams.set('VERSION', '1.1.1')
    wmsUrl.searchParams.set('REQUEST', 'GetMap')
    wmsUrl.searchParams.set('LAYERS', layer)
    wmsUrl.searchParams.set('BBOX', bbox)
    wmsUrl.searchParams.set('WIDTH', width.toString())
    wmsUrl.searchParams.set('HEIGHT', height.toString())
    wmsUrl.searchParams.set('SRS', 'EPSG:2039')  // ITM projection
    wmsUrl.searchParams.set('FORMAT', 'image/png')

    console.log(`🌐 Fetching: ${wmsUrl.toString()}`)

    // Fetch the map image
    const response = await fetch(wmsUrl.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ WMS Error: ${response.status}`, errorText)
      return NextResponse.json({
        success: false,
        error: `WMS request failed: ${response.status}`,
        details: errorText
      }, { status: 500 })
    }

    // Check content type
    const contentType = response.headers.get('content-type')
    console.log(`✅ WMS Response: ${contentType}, ${response.headers.get('content-length')} bytes`)

    if (contentType?.includes('image')) {
      // Return the image directly
      const imageBuffer = await response.arrayBuffer()

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        }
      })
    } else {
      // Probably an error message in XML
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: 'WMS returned non-image response',
        details: errorText
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ WMS Test Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
