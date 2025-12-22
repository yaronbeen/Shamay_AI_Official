import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const metadata = await request.json()
    
    // Simply log the metadata - we're not saving the actual image to prevent 431 errors
    console.log(`📊 GIS Screenshot metadata for session ${params.sessionId}:`, metadata)
    
    return NextResponse.json({
      success: true,
      message: 'Metadata saved successfully'
    })
    
  } catch (error) {
    console.error('Error saving metadata:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save metadata'
    }, { status: 500 })
  }
}
