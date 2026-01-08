import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'
import { FileStorageService } from '../../../../../lib/file-storage'

/**
 * Fetch static map image from GovMap WMS (parcels) or ESRI (aerial)
 * Works on Vercel serverless - no Puppeteer needed!
 */
async function fetchMapImage(
  coordinates: { itm?: { easting: number; northing: number }; wgs84?: { lat: number; lon: number } },
  screenshotType: string
): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
  try {
    // For zoomedWithTazea, use ESRI World Imagery (aerial/satellite)
    if (screenshotType === 'zoomedWithTazea') {
      return await fetchESRIAerialImage(coordinates, screenshotType)
    }

    // For other types, use GovMap WMS (parcels layer)
    return await fetchGovMapWMSImage(coordinates, screenshotType)
  } catch (error) {
    console.error('❌ Map fetch error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch aerial/satellite imagery from ESRI World Imagery
 */
async function fetchESRIAerialImage(
  coordinates: { itm?: { easting: number; northing: number }; wgs84?: { lat: number; lon: number } },
  screenshotType: string
): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
  try {
    // Need WGS84 coordinates for ESRI
    if (!coordinates.wgs84?.lat || !coordinates.wgs84?.lon) {
      return { success: false, error: 'WGS84 coordinates required for aerial imagery' }
    }

    const { lat, lon } = coordinates.wgs84

    // Calculate bounding box (in degrees, ~300m area)
    const delta = 0.002 // ~200m in each direction
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`

    console.log(`🛰️ ESRI Aerial Request: center=(${lat}, ${lon}), bbox=${bbox}`)

    // ESRI World Imagery export endpoint
    const esriUrl = new URL('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export')
    esriUrl.searchParams.set('bbox', bbox)
    esriUrl.searchParams.set('bboxSR', '4326')
    esriUrl.searchParams.set('imageSR', '4326')
    esriUrl.searchParams.set('size', '800,800')
    esriUrl.searchParams.set('format', 'png')
    esriUrl.searchParams.set('f', 'image')

    console.log(`🌐 Fetching ESRI: ${esriUrl.toString()}`)

    const response = await fetch(esriUrl.toString())

    if (!response.ok) {
      return { success: false, error: `ESRI request failed: ${response.status}` }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('image')) {
      return { success: false, error: 'ESRI returned non-image response' }
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    console.log(`✅ ESRI Aerial Success: ${arrayBuffer.byteLength} bytes`)

    return { success: true, imageBase64: base64 }
  } catch (error) {
    console.error('❌ ESRI fetch error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch parcel map from GovMap WMS
 */
async function fetchGovMapWMSImage(
  coordinates: { itm?: { easting: number; northing: number }; wgs84?: { lat: number; lon: number } },
  screenshotType: string
): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
  try {
    // Need ITM coordinates for GovMap WMS
    if (!coordinates.itm?.easting || !coordinates.itm?.northing) {
      return { success: false, error: 'ITM coordinates required for GovMap WMS' }
    }

    const { easting, northing } = coordinates.itm

    // Determine size based on screenshot type
    // wideArea = larger area (1000m), zoomed = smaller area (300m)
    const size = screenshotType === 'wideArea' ? 1000 : 300
    const halfSize = size / 2

    // Calculate bounding box
    const bbox = [
      easting - halfSize,
      northing - halfSize,
      easting + halfSize,
      northing + halfSize
    ].join(',')

    console.log(`📍 GovMap WMS Request: type=${screenshotType}, center=(${easting}, ${northing}), size=${size}m`)

    // Construct WMS GetMap URL
    const wmsUrl = new URL('https://open.govmap.gov.il/geoserver/opendata/wms')
    wmsUrl.searchParams.set('SERVICE', 'WMS')
    wmsUrl.searchParams.set('VERSION', '1.1.1')
    wmsUrl.searchParams.set('REQUEST', 'GetMap')
    wmsUrl.searchParams.set('LAYERS', 'PARCEL_ALL')
    wmsUrl.searchParams.set('BBOX', bbox)
    wmsUrl.searchParams.set('WIDTH', '800')
    wmsUrl.searchParams.set('HEIGHT', '800')
    wmsUrl.searchParams.set('SRS', 'EPSG:2039')
    wmsUrl.searchParams.set('FORMAT', 'image/png')

    console.log(`🌐 Fetching GovMap WMS: ${wmsUrl.toString()}`)

    const response = await fetch(wmsUrl.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ WMS Error: ${response.status}`, errorText)
      return { success: false, error: `WMS request failed: ${response.status}` }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('image')) {
      const errorText = await response.text()
      return { success: false, error: `WMS returned non-image: ${errorText.substring(0, 200)}` }
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    console.log(`✅ GovMap WMS Success: ${arrayBuffer.byteLength} bytes`)

    return { success: true, imageBase64: base64 }
  } catch (error) {
    console.error('❌ WMS fetch error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const contentType = request.headers.get('content-type')

    // Handle JSON request (for server screenshot)
    if (contentType?.includes('application/json')) {
      const body = await request.json()
      const { cropMode, screenshotType, govmapUrl, coordinates, annotations } = body

      // Support both screenshotType (new) and cropMode (legacy)
      const mode = screenshotType || cropMode

      if (!mode) {
        return NextResponse.json({ error: 'Screenshot type is required' }, { status: 400 })
      }

      // Use WMS/ESRI if we have coordinates (ITM or WGS84)
      if (coordinates?.itm || coordinates?.wgs84) {
        const source = mode === 'zoomedWithTazea' ? 'ESRI Aerial' : 'GovMap WMS'
        console.log(`📸 Using ${source} for screenshot: ${mode}`)

        const mapResult = await fetchMapImage(coordinates, mode)

        if (mapResult.success && mapResult.imageBase64) {
          // Save image to storage and get URL
          const buffer = Buffer.from(mapResult.imageBase64, 'base64')
          const filename = `gis-${mode}-${Date.now()}.png`

          try {
            const uploadResult = await FileStorageService.uploadFile(
              buffer,
              params.sessionId,
              filename,
              'image/png'
            )

            console.log(`✅ Screenshot saved to storage: ${uploadResult.url}`)

            // Also save to session gisScreenshots
            const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
            if (loadResult.success) {
              const sessionData = loadResult.valuationData || {}
              const existingScreenshots = (sessionData as any).gisScreenshots || {}

              // Update with new screenshot
              const updatedScreenshots = {
                ...existingScreenshots,
                [mode]: uploadResult.url
              }

              await ShumaDB.saveShumaFromSession(
                params.sessionId,
                'default-org',
                'system',
                {
                  ...sessionData,
                  gisScreenshots: updatedScreenshots
                } as any
              )
              console.log(`💾 Updated gisScreenshots in session: ${mode} = ${uploadResult.url}`)
            }

            return NextResponse.json({
              success: true,
              screenshot: mapResult.imageBase64,
              screenshotUrl: uploadResult.url,
              message: `${source} screenshot captured and saved successfully`
            })
          } catch (uploadError) {
            console.error('❌ Failed to save screenshot:', uploadError)
            // Still return the image even if save failed
            return NextResponse.json({
              success: true,
              screenshot: mapResult.imageBase64,
              message: `${source} screenshot captured (save failed)`
            })
          }
        } else {
          console.warn('⚠️ Map capture failed, coordinates were:', coordinates)
          return NextResponse.json({
            success: false,
            error: mapResult.error || 'Map capture failed',
            message: 'צילום מפה נכשל. נסה להעלות צילום מסך ידנית.'
          }, { status: 500 })
        }
      }

      // Fallback: If no coordinates, try backend (won't work on Vercel but might locally)
      if (!govmapUrl) {
        return NextResponse.json({ error: 'GovMap URL or coordinates required' }, { status: 400 })
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
        const screenshotResponse = await fetch(`${backendUrl}/api/gis-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            govmapUrl,
            screenshotType: mode,
            cropMode: mode,
            sessionId: params.sessionId,
            viewport: { width: 1200, height: 800 }
          })
        })

        if (!screenshotResponse.ok) {
          if (screenshotResponse.status === 501) {
            return NextResponse.json({
              success: false,
              error: 'Server screenshot not available',
              message: 'צילום שרת אינו זמין. השתמש בהעלאת צילום מסך ידנית.'
            }, { status: 501 })
          }
          throw new Error(`Backend screenshot failed: ${screenshotResponse.statusText}`)
        }

        const screenshotData = await screenshotResponse.json()

        return NextResponse.json({
          success: true,
          screenshot: screenshotData.screenshot,
          message: 'Server screenshot captured successfully'
        })

      } catch (error) {
        console.error('Server screenshot error:', error)
        return NextResponse.json({
          success: false,
          error: 'Server screenshot failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Handle FormData request (for file upload)
    const formData = await request.formData()
    const file = formData.get('file') as File
    const cropMode = formData.get('cropMode') as string
    const annotationsJson = formData.get('annotations') as string
    const address = formData.get('address') as string
    const coordinatesJson = formData.get('coordinates') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const base64DataUrl = `data:image/png;base64,${base64}`

    // Parse annotations and coordinates
    const annotations = annotationsJson ? JSON.parse(annotationsJson) : []
    const coordinates = coordinatesJson ? JSON.parse(coordinatesJson) : null

    // Load session data
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = loadResult.valuationData || {}
    const existingScreenshots = (sessionData as any).gisScreenshots || {}

    // Update screenshots
    const updatedScreenshots = {
      ...existingScreenshots,
      [`cropMode${cropMode}`]: base64DataUrl
    }

    // Save to session
    await ShumaDB.saveShumaFromSession(
      params.sessionId,
      'default-org',
      'system',
      {
        ...sessionData,
        gisScreenshots: updatedScreenshots,
        gisScreenshotMetadata: {
          ...((sessionData as any).gisScreenshotMetadata || {}),
          [`cropMode${cropMode}`]: {
            address,
            coordinates,
            annotations,
            capturedAt: new Date().toISOString(),
            fileName: file.name
          }
        }
      } as any
    )

    // Here you could also save the file to storage (S3, local storage, etc.)
    // For now, we're saving only base64 in the database

    return NextResponse.json({
      success: true,
      message: 'Screenshot saved successfully',
      screenshot: {
        cropMode,
        base64: base64DataUrl.substring(0, 100) + '...', // Preview only
        address,
        coordinates
      }
    })

  } catch (error) {
    console.error('❌ Error saving screenshot:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save screenshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
