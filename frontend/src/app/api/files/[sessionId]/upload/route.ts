import { NextRequest, NextResponse } from 'next/server'
import { FileStorageService } from '../../../../../lib/file-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`📤 [Upload API] Uploading file: ${file.name} (${file.size} bytes) for session: ${sessionId}`)
    console.log(`📤 [Upload API] Environment: ${FileStorageService.isProduction() ? 'Production (Vercel Blob)' : 'Development (Local)'}`)

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename with timestamp to avoid conflicts
    const timestamp = Date.now()
    const randomSuffix = Math.floor(Math.random() * 1000000000)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueFilename = `${sanitizedName.replace(/\.[^.]+$/, '')}-${timestamp}-${randomSuffix}${sanitizedName.match(/\.[^.]+$/)?.[0] || ''}`

    // Upload using FileStorageService (automatically uses Vercel Blob in production)
    const result = await FileStorageService.uploadFile(
      buffer,
      sessionId,
      uniqueFilename,
      file.type
    )

    console.log(`✅ [Upload API] File uploaded successfully:`, {
      url: result.url,
      path: result.path,
      size: result.size
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
      size: result.size,
      originalName: file.name,
      filename: uniqueFilename
    })

  } catch (error: any) {
    console.error('❌ [Upload API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Upload failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

// Also handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
