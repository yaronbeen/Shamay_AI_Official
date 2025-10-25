import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log('🔍 Frontend: Analyzing land registry documents for session:', params.sessionId)
    
    // Get session data from database
    const sessionData = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!sessionData.success || !sessionData.valuationData) {
      return NextResponse.json({ 
        success: false,
        error: 'Session not found in database' 
      }, { status: 404 })
    }

    const data = sessionData.valuationData
    
    // Find uploaded land registry documents
    const uploads = data.uploads || []
    const landRegistryUploads = uploads.filter((upload: any) => upload.type === 'land_registry' || upload.type === 'tabu')
    
    if (landRegistryUploads.length === 0) {
      console.log('❌ No land registry documents found')
      return NextResponse.json({ 
        success: false,
        error: 'No land registry documents found. Please upload a land registry (Tabu) document first.',
      }, { status: 400 })
    }
    
    // Use the first land registry document
    const upload = landRegistryUploads[0]
    const fileUrl = upload.url || upload.blobUrl
    
    if (!fileUrl) {
      return NextResponse.json({
        success: false,
        error: 'Land registry file URL not found',
      }, { status: 404 })
    }
    
    console.log('🔍 Using uploaded PDF from blob:', fileUrl)
    
    // Call the backend API for AI processing
    console.log('🤖 Calling backend AI API...')
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    const aiResponse = await fetch(`${backendUrl}/api/ai/land-registry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileUrl: fileUrl,
        sessionId: params.sessionId
      })
    })
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('❌ Backend AI API error:', aiResponse.status, errorText)
      return NextResponse.json({
        success: false,
        error: `Backend AI API failed: ${aiResponse.status}`,
        details: errorText
      }, { status: 500 })
    }
    
    const extractedData = await aiResponse.json()
    console.log('✅ AI extraction completed:', extractedData)
    
    return NextResponse.json(extractedData)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to analyze land registry documents',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
