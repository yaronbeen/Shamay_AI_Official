import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log('🏢 Frontend: Analyzing exterior images for session:', params.sessionId)
    
    // Get session data from database
    const sessionData = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!sessionData.success || !sessionData.valuationData) {
      console.log('❌ Session not found in database:', params.sessionId)
      return NextResponse.json({ error: 'Session not found in database' }, { status: 404 })
    }
    
    console.log('✅ Session found:', params.sessionId)
    const data = sessionData.valuationData
    
    // Find uploaded exterior images
    const uploads = data.uploads || []
    const exteriorUploads = uploads.filter((upload: any) => 
      upload.type === 'exterior' || 
      upload.type === 'exterior_image' ||
      upload.type === 'building_image' || // Handle building_image as exterior
      upload.type === 'building' ||
      (upload.type === 'image' && (upload.name?.toLowerCase().includes('exterior') || upload.name?.toLowerCase().includes('building')))
    )
    
    if (exteriorUploads.length === 0) {
      console.log('🏢 No exterior images found')
      console.log('Available upload types:', uploads.map((u: any) => u.type))
      return NextResponse.json({
        success: false,
        error: 'No exterior images found in session'
      }, { status: 400 })
    }
    
    console.log(`🏢 Found ${exteriorUploads.length} exterior images`)
    
    // Prepare images for backend
    const images = exteriorUploads.map((upload: any) => ({
      name: upload.name || 'exterior_image',
      url: upload.url || upload.path,
      data: upload.data // If base64 data is available
    }))
    
    // Call backend AI API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'
    console.log('🔄 Calling backend AI API:', `${backendUrl}/api/ai/exterior-analysis`)
    
    const aiResponse = await fetch(`${backendUrl}/api/ai/exterior-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        sessionId: params.sessionId
      })
    })
    
    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }))
      console.error('❌ Backend AI error:', errorData)
      throw new Error(errorData.error || `Backend AI failed with status ${aiResponse.status}`)
    }
    
    const result = await aiResponse.json()
    console.log('✅ Received AI analysis result')
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze exterior images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}