import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../../lib/shumadb'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const cropMode = formData.get('cropMode') as string
    const annotationsJson = formData.get('annotations') as string
    const address = formData.get('address') as string
    const coordinatesJson = formData.get('coordinates') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('💾 Saving final annotated screenshot to database...')

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
    const existingScreenshots = sessionData.gisScreenshots || {}

    // Update screenshots with final annotated version (as base64)
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
          ...(sessionData.gisScreenshotMetadata || {}),
          [`cropMode${cropMode}`]: {
            address,
            coordinates,
            annotations,
            savedAt: new Date().toISOString(),
            fileName: file.name
          }
        }
      }
    )

    console.log('✅ Final annotated screenshot saved to database')

    return NextResponse.json({
      success: true,
      message: 'Annotated screenshot saved successfully',
      screenshot: {
        cropMode,
        hasAnnotations: annotations.length > 0,
        address,
        coordinates
      }
    })

  } catch (error) {
    console.error('❌ Error saving annotated screenshot:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save annotated screenshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

