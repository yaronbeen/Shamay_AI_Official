import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'

type DocType = 'tabu' | 'condo' | 'permit'

// Fire-and-forget document processing endpoint
// Returns immediately (202 Accepted) and processes in background
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId

    // SECURITY: Validate session exists before processing
    const session = sessionStore.getSession(sessionId)
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON body'
      }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || !('type' in body)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: type'
      }, { status: 400 })
    }

    const { type } = body as { type: unknown }

    if (typeof type !== 'string' || !['tabu', 'condo', 'permit'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document type. Must be: tabu, condo, or permit'
      }, { status: 400 })
    }

    const docType = type as DocType
    console.log(`🚀 Starting background processing for ${docType} in session ${sessionId}`)

    // Update status to 'processing'
    sessionStore.updateProcessingStatus(sessionId, docType, 'processing')

    // Fire-and-forget: Start processing without awaiting
    processDocumentInBackground(sessionId, docType).catch(error => {
      console.error(`❌ Background processing failed for ${docType}:`, error)
      sessionStore.updateProcessingStatus(
        sessionId,
        docType,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      )
    })

    // Return immediately with 202 Accepted
    return NextResponse.json({
      success: true,
      message: `Processing ${docType} in background`,
      status: 'processing'
    }, { status: 202 })

  } catch (error) {
    console.error('❌ Error starting background processing:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start document processing',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// Background processing function
async function processDocumentInBackground(sessionId: string, type: DocType) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Map document type to the corresponding analysis endpoint
  const endpointMap: Record<DocType, string> = {
    tabu: 'land-registry-analysis',
    condo: 'shared-building-analysis',
    permit: 'building-permit-analysis'
  }

  const endpoint = endpointMap[type]
  const url = `${baseUrl}/api/session/${sessionId}/${endpoint}`

  console.log(`📄 Background processing: calling ${url}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (response.ok && result.success) {
      console.log(`✅ Background processing completed for ${type}`)
      sessionStore.updateProcessingStatus(sessionId, type, 'completed')
    } else {
      console.error(`❌ Processing failed for ${type}:`, result.error)
      sessionStore.updateProcessingStatus(
        sessionId,
        type,
        'error',
        result.error || 'Processing failed'
      )
    }
  } catch (error) {
    console.error(`❌ Network error processing ${type}:`, error)
    sessionStore.updateProcessingStatus(
      sessionId,
      type,
      'error',
      error instanceof Error ? error.message : 'Network error'
    )
    throw error
  }
}
