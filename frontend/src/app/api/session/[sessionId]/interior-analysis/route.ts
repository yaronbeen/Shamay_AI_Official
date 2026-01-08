import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log('🏠 Frontend: Analyzing interior images for session:', params.sessionId)
    
    // Get session data from database
    const sessionData = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!sessionData.success || !sessionData.valuationData) {
      console.log('❌ Session not found in database:', params.sessionId)
      return NextResponse.json({ error: 'Session not found in database' }, { status: 404 })
    }
    
    console.log('✅ Session found:', params.sessionId)
    const data = sessionData.valuationData
    
    // Find uploaded interior images
    const uploads = data.uploads || []
    const interiorUploads = uploads.filter((upload: any) => 
      upload.type === 'interior' || 
      upload.type === 'interior_image' ||
      (upload.type === 'image' && upload.name?.toLowerCase().includes('interior'))
    )
    
    if (interiorUploads.length === 0) {
      console.log('🏠 No interior images found')
      console.log('Available upload types:', uploads.map((u: any) => u.type))
      return NextResponse.json({
        success: false,
        error: 'No interior images found in session'
      }, { status: 400 })
    }
    
    console.log(`🏠 Found ${interiorUploads.length} interior images`)
    
    // Prepare images for backend
    const images = interiorUploads.map((upload: any) => ({
      name: upload.name || 'interior_image',
      url: upload.url || upload.path,
      data: upload.data // If base64 data is available
    }))
    
    // Call backend AI API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'
    console.log('🔄 Calling backend AI API:', `${backendUrl}/api/ai/interior-analysis`)
    
    const aiResponse = await fetch(`${backendUrl}/api/ai/interior-analysis`, {
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
      error: 'Failed to analyze interior images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}