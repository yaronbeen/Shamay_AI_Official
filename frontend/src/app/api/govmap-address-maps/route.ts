import { NextRequest, NextResponse } from 'next/server'

// Mock database for now - in production this would connect to a real database
let savedMaps: any[] = []
let nextId = 1

export async function POST(request: NextRequest) {
  try {
    const addressMapData = await request.json()

    // Generate a new ID
    const id = nextId.toString()
    nextId++

    // Create the saved map object
    const savedMap = {
      id,
      ...addressMapData,
      created_at: new Date().toISOString(),
      annotation_count: addressMapData.annotations?.length || 0
    }

    // Add to our mock database
    savedMaps.push(savedMap)

    console.log('✅ Map saved:', id)

    return NextResponse.json({
      success: true,
      id,
      message: 'Map saved successfully'
    })

  } catch (error) {
    console.error('❌ Error saving map:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Return saved maps (most recent first)
    const maps = savedMaps
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    console.log(`📋 Returning ${maps.length} saved maps`)

    return NextResponse.json(maps)

  } catch (error) {
    console.error('❌ Error loading maps:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load maps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
