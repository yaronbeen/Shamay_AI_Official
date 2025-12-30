import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'
import { FileStorageService } from '../../../../../lib/file-storage'

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

      if (!govmapUrl) {
        return NextResponse.json({ error: 'GovMap URL is required' }, { status: 400 })
      }

      if (!mode) {
        return NextResponse.json({ error: 'Screenshot type is required' }, { status: 400 })
      }

      // Call backend service to capture screenshot
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
        const screenshotResponse = await fetch(`${backendUrl}/api/gis-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            govmapUrl,
            screenshotType: mode,
            cropMode: mode, // Legacy support
            sessionId: params.sessionId,
            viewport: { width: 1200, height: 800 }
          })
        })

        if (!screenshotResponse.ok) {
          // Check for 501 (serverless limitation)
          if (screenshotResponse.status === 501) {
            return NextResponse.json({
              success: false,
              error: 'Server screenshot not available',
              message: 'צילום שרת אינו זמין בסביבת ענן. השתמש בהעלאת צילום מסך ידנית.'
            }, { status: 501 })
          }
          throw new Error(`Backend screenshot failed: ${screenshotResponse.statusText}`)
        }

        const screenshotData = await screenshotResponse.json()
        
        // Return the screenshot as base64 for immediate display
        // The actual saving to DB will happen after annotation
        return NextResponse.json({
          success: true,
          screenshot: screenshotData.screenshot, // Return base64 data URL
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
