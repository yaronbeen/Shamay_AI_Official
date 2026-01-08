import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShumaDB } from '../../../../../../lib/shumadb'
import { FileStorageService } from '../../../../../../lib/file-storage'

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

    // Get userId from session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || 'dev-user-id'

    console.log('💾 Saving final annotated screenshot to database...')
    console.log(`📍 Environment: ${FileStorageService.isProduction() ? 'PRODUCTION (Vercel Blob)' : 'DEVELOPMENT (Local FS)'}`)

    // Upload file to storage (Blob in Vercel, local filesystem in dev)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Generate filename
    const timestamp = Date.now()
    const filename = `gis-screenshot-mode${cropMode}-${timestamp}.png`
    
    // Upload using FileStorageService (handles Blob in Vercel automatically)
    const uploadResult = await FileStorageService.uploadFile(
      buffer,
      params.sessionId,
      filename,
      file.type,
      userId
    )

    console.log(`✅ Screenshot uploaded to storage:`, uploadResult)

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

    // Update screenshots with file URL (not base64!)
    // Blob URL in production, local path in development
    const updatedScreenshots = {
      ...existingScreenshots,
      [`cropMode${cropMode}`]: uploadResult.url
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

