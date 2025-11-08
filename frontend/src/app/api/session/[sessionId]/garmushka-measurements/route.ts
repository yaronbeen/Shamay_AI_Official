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
    console.log('📐 Garmushka Records:', measurementData?.garmushkaRecords || [])
    
    const garmushkaRecords = measurementData?.garmushkaRecords || []
    console.log(`📊 Returning ${garmushkaRecords.length} garmushka records`)
    
    return NextResponse.json({ 
      measurementData,
      garmushkaRecords: garmushkaRecords
    })
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

    // Check if we're deleting a single record or all records
    const url = new URL(request.url)
    const garmushkaId = url.searchParams.get('id')
    
    console.log('📐 Garmushka Measurements DELETE - URL:', request.url)
    console.log('📐 Garmushka Measurements DELETE - garmushkaId param:', garmushkaId)
    
    if (garmushkaId) {
      // Delete a single Garmushka record
      console.log('📐 Garmushka Measurements DELETE - Single Record:', garmushkaId, 'Session:', params.sessionId)
      
      const parsedId = parseInt(garmushkaId)
      console.log('📐 Parsed ID:', parsedId, 'isNaN?', isNaN(parsedId))
      
      if (isNaN(parsedId)) {
        return NextResponse.json({ 
          error: 'Invalid garmushka ID' 
        }, { status: 400 })
      }
      
      const deleteResult = await ShumaDB.deleteGarmushkaRecord(parsedId, params.sessionId)
      
      console.log('📐 Delete result:', deleteResult)
      
      if (!deleteResult.success) {
        return NextResponse.json({ 
          error: deleteResult.error || 'Failed to delete record' 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else {
      // Delete all Garmushka records from garmushka table for this session
      console.log('📐 Garmushka Measurements DELETE - All Records - Session:', params.sessionId)
      
      const deleteResult = await ShumaDB.deleteGarmushkaData(params.sessionId)
      
      if (!deleteResult.success) {
        return NextResponse.json({ 
          error: deleteResult.error || 'Failed to delete measurements' 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Error deleting garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}