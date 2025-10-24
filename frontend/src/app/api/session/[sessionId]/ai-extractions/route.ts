import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'

// POST - Save AI extraction
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json()
    const { extractionType, aiResponse, extractedFields, metadata } = body

    const result = await ShumaDB.saveAIExtraction(
      params.sessionId,
      extractionType,
      aiResponse || extractedFields, // Use extractedFields as fallback for aiResponse
      extractedFields,
      metadata || {}
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        extractionId: result.extractionId
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Error saving AI extraction:', error)
    return NextResponse.json({ 
      error: 'Failed to save AI extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Get AI extractions for session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const extractionType = searchParams.get('type')

    const result = await ShumaDB.getAIExtractions(
      params.sessionId,
      extractionType
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        extractions: result.extractions
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Error getting AI extractions:', error)
    return NextResponse.json({ 
      error: 'Failed to get AI extractions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Restore AI extraction (revert to original)
export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json()
    const { extractionId, action } = body

    if (action === 'restore') {
      const result = await ShumaDB.restoreAIExtraction(
        params.sessionId,
        extractionId
      )

      if (result.success) {
        return NextResponse.json({
          success: true,
          restoredFields: result.restoredFields
        })
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    } else if (action === 'deactivate') {
      const result = await ShumaDB.deactivateAIExtraction(extractionId)

      if (result.success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating AI extraction:', error)
    return NextResponse.json({ 
      error: 'Failed to update AI extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

