import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const { ShumaDB } = require('@/lib/shumadb.js')
// import { createValuationSchema } from '@/lib/validations' // Not needed with ShumaDB

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // For development, use default values if session is not available
    const organizationId = session?.user?.primaryOrganizationId || 'default-org'
    
    if (!session?.user && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const result = await ShumaDB.searchShumas(
      organizationId,
      search || undefined,
      status || undefined
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ valuations: result.shumas })
  } catch (error) {
    console.error('Error fetching valuations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Create a basic valuation data structure for ShumaDB
    const valuationData = {
      street: body.street || '',
      buildingNumber: body.buildingNumber || '',
      city: body.city || '',
      neighborhood: body.neighborhood || '',
      fullAddress: body.addressFull || '',
      rooms: body.rooms || 0,
      floor: body.floor || 0,
      area: body.area || 0,
      propertyEssence: body.propertyEssence || '',
      clientName: body.clientName || '',
      visitDate: body.visitDate || new Date().toISOString().split('T')[0],
      valuationDate: body.valuationDate || new Date().toISOString().split('T')[0],
      gush: body.gush || '',
      parcel: body.parcel || '',
      isComplete: false,
      // Add other fields as needed
      propertyImages: [],
      interiorImages: [],
      comparableData: [],
      finalValuation: 0,
      pricePerSqm: 0,
      uploads: [],
      gisScreenshots: {},
      garmushkaMeasurements: {}
    }

    // Create the shuma
    const result = await ShumaDB.saveShumaFromSession(
      body.sessionId || `session-${Date.now()}`,
      session.user.primaryOrganizationId,
      session.user.id,
      valuationData
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      valuation: { 
        id: result.shumaId,
        sessionId: body.sessionId 
      } 
    })
  } catch (error) {
    console.error('Error creating valuation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}