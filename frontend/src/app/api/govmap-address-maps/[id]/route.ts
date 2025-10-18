import { NextRequest, NextResponse } from 'next/server'

// Mock database for now - in production this would connect to a real database
// This would be the same as in the main route, but for simplicity we'll use a different approach
let savedMaps: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // In a real application, this would query the database
    // For now, we'll return a mock response
    const mockMap = {
      id,
      address_input: "נורדאו 8, רעננה",
      address_normalized: "נורדאו 8, רעננה, ישראל",
      latitude: 32.1853,
      longitude: 34.8718,
      itm_easting: 180073.06,
      itm_northing: 662013.07,
      confidence: 0.95,
      address_details: {
        city: "רעננה",
        street: "נורדאו",
        houseNumber: "8"
      },
      govmap_url: "https://www.govmap.gov.il/?c=180028.06,662193.07&z=13&lay=15&q=נורדאו 8, רעננה&bs=15|180073.06,662013.07&bb=1&zb=1&in=1",
      govmap_url_with_tazea: "https://www.govmap.gov.il/?c=180028.06,662193.07&z=13&lay=21,15&q=נורדאו 8, רעננה&bs=15,21|180073.06,662013.07&b=1&bb=1&zb=1&in=1",
      govmap_url_without_tazea: "https://www.govmap.gov.il/?c=180028.06,662193.07&z=13&lay=15&q=נורדאו 8, רעננה&bs=15|180073.06,662013.07&bb=1&zb=1&in=1",
      annotations: [],
      annotation_canvas_data: "",
      notes: "",
      zoom_level: 15,
      show_tazea: false,
      created_at: new Date().toISOString(),
      annotation_count: 0
    }

    console.log(`📋 Loading map: ${id}`)

    return NextResponse.json(mockMap)

  } catch (error) {
    console.error('❌ Error loading map:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
