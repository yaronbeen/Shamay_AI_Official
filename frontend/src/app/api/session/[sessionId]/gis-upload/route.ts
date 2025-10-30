import { NextRequest, NextResponse } from 'next/server'
import { FileStorageService } from '../../../../../lib/file-storage'

/**
 * Upload GIS screenshot as a file and return the URL
 * This avoids storing large base64 in the database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { imageData, cropMode } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    console.log(`📤 Uploading GIS screenshot for session ${params.sessionId}, crop mode ${cropMode}`)

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64String = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64String, 'base64')

    // Generate filename
    const filename = `gis-screenshot-${cropMode === '1' ? 'taba' : 'clean'}-${params.sessionId}.png`

    // Upload using FileStorageService
    const uploadResult = await FileStorageService.uploadFile(
      buffer,
      params.sessionId,
      filename,
      'image/png'
    )

    console.log(`✅ GIS screenshot uploaded: ${uploadResult.url}`)

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path,
      size: uploadResult.size
    })

  } catch (error) {
    console.error('❌ Error uploading GIS screenshot:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image'
    }, { status: 500 })
  }
}

