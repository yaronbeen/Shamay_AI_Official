import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log('🔍 Frontend: Analyzing building permit documents for session:', params.sessionId)
    
    // Get session data from database
    const sessionData = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!sessionData.success || !sessionData.valuationData) {
      return NextResponse.json({ 
        success: false,
        error: 'Session not found in database' 
      }, { status: 404 })
    }

    const data = sessionData.valuationData
    
    // Debug: Log the actual session data structure
    console.log('🔍 Session data structure:', JSON.stringify(data, null, 2))
    console.log('🔍 Available data keys:', Object.keys(data))
    
    // Find uploaded building permit documents
    const uploads = data.uploads || []
    const buildingPermitUploads = uploads.filter((upload: any) => upload.type === 'building_permit' || upload.type === 'permit')
    
    if (buildingPermitUploads.length === 0) {
      console.log('❌ No building permit documents found')
      console.log('Available upload types:', uploads.map((u: any) => u.type))
      return NextResponse.json({
        success: false,
        error: 'No building permit documents found in session'
      }, { status: 400 })
    }
    
    // Use the first building permit document
    const upload = buildingPermitUploads[0]
    const fileUrl = upload.url || upload.path
    
    if (!fileUrl) {
      console.log('❌ No file URL found in upload data')
      return NextResponse.json({ 
        success: false,
        error: 'No file URL found for building permit document' 
      }, { status: 400 })
    }
    
    console.log('📄 Processing file URL:', fileUrl)
    
    // Call backend AI API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'
    console.log('🔄 Calling backend AI API:', `${backendUrl}/api/ai/building-permit`)
    
    const aiResponse = await fetch(`${backendUrl}/api/ai/building-permit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl,
        sessionId: params.sessionId
      })
    })
    
    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }))
      console.error('❌ Backend AI error:', errorData)
      throw new Error(errorData.error || `Backend AI failed with status ${aiResponse.status}`)
    }
    
    const result = await aiResponse.json()
    console.log('✅ Received AI extraction result:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to analyze building permit documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}