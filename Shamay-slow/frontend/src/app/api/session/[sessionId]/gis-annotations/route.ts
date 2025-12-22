import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success || !loadResult.valuationData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = loadResult.valuationData
    const { annotations, annotationCanvasData, govmapUrls } = await request.json()

    console.log('📝 Saving GIS annotations for session:', params.sessionId)
    console.log('📝 Annotations count:', annotations?.length || 0)

    // Update gisAnalysis with annotations
    const updatedGisAnalysis = {
      ...sessionData.gisAnalysis,
      annotations,
      annotationCanvasData
    }

    // Save updated data to database
    const saveResult = await ShumaDB.saveShumaFromSession(
      params.sessionId,
      'default-org',
      'system',
      {
        ...sessionData,
        gisAnalysis: updatedGisAnalysis
      }
    )

    if (!saveResult.success) {
      throw new Error('Failed to save annotations to database')
    }

    console.log('✅ GIS annotations saved successfully to database')

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
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success || !loadResult.valuationData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = loadResult.valuationData
    const gisAnalysis = sessionData.gisAnalysis || null
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
