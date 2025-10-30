import { NextRequest, NextResponse } from 'next/server'
import { FileStorageService } from '../../../../../lib/file-storage'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Convert PDF first page to image using Puppeteer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { pdfUrl, pageNumber = 1 } = await request.json()

    if (!pdfUrl) {
      return NextResponse.json({ error: 'No PDF URL provided' }, { status: 400 })
    }

    console.log(`📄 Converting PDF to image: ${pdfUrl} (page ${pageNumber})`)

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    
    // Call backend to convert PDF to image
    const response = await fetch(`${backendUrl}/api/pdf-to-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfUrl, pageNumber, sessionId: params.sessionId })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Backend conversion failed: ${errorText}`)
    }

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      path: result.path
    })

  } catch (error) {
    console.error('❌ Error converting PDF to image:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert PDF to image'
    }, { status: 500 })
  }
}

