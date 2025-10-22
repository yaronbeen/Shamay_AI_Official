import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'

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

    const measurementData = loadResult.valuationData.garmushkaMeasurements || null
    
    console.log('📐 Garmushka Measurements GET - Session:', params.sessionId)
    console.log('📐 Measurement Data:', measurementData)
    
    return NextResponse.json({ measurementData })
  } catch (error) {
    console.error('Error fetching garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const measurementData = await request.json()
    
    console.log('📐 Garmushka Measurements POST - Session:', params.sessionId)
    console.log('📐 Saving measurement data:', measurementData)
    
    // Save measurements using ShumaDB
    const saveResult = await ShumaDB.saveGarmushkaData(params.sessionId, measurementData)
    
    if (!saveResult.success) {
      return NextResponse.json({ 
        error: saveResult.error || 'Failed to save measurements' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      measurementData: measurementData 
    })
  } catch (error) {
    console.error('Error saving garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success || !loadResult.valuationData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log('📐 Garmushka Measurements DELETE - Session:', params.sessionId)
    
    // Delete measurements by saving empty/null data
    const saveResult = await ShumaDB.saveGarmushkaData(params.sessionId, {})
    
    if (!saveResult.success) {
      return NextResponse.json({ 
        error: saveResult.error || 'Failed to delete measurements' 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}