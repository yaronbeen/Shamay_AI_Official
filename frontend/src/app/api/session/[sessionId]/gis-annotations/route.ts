import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { annotations, annotationCanvasData, govmapUrls } = await request.json()

    console.log('📝 Saving GIS annotations for session:', params.sessionId)
    console.log('📝 Annotations count:', annotations?.length || 0)

    // Update session with annotations
    sessionStore.updateSession(params.sessionId, {
      gisAnalysis: {
        ...session.gisAnalysis,
        annotations,
        annotationCanvasData
      },
      data: {
        ...session.data,
        gisScreenshots: {
          cropMode0: annotationCanvasData, // Clean map with annotations
          cropMode1: annotationCanvasData  // תצ"א map with same annotations
        }
      }
    })

    console.log('✅ GIS annotations saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Annotations saved successfully',
      annotationsCount: annotations?.length || 0
    })

  } catch (error) {
    console.error('❌ Error saving GIS annotations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save annotations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const gisAnalysis = session.gisAnalysis || null
    const annotations = gisAnalysis?.annotations || []
    const annotationCanvasData = gisAnalysis?.annotationCanvasData || null

    console.log(`📝 GIS Annotations GET - Session: ${params.sessionId}`)
    console.log(`📝 Annotations:`, annotations)
    console.log(`📝 Canvas data available:`, !!annotationCanvasData)

    return NextResponse.json({
      success: true,
      annotations,
      annotationCanvasData
    })

  } catch (error) {
    console.error('❌ Error retrieving GIS annotations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve annotations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
