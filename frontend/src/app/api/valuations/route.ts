import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const { ShumaDB } = require('@/lib/shumadb.js')
// import { createValuationSchema } from '@/lib/validations' // Not needed with ShumaDB

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [VALUATIONS API] GET request received')
    const session = await getServerSession(authOptions)
    console.log('🔍 [VALUATIONS API] Session:', session ? 'exists' : 'null')
    
    // For development, use default values if session is not available
    const organizationId = session?.user?.primaryOrganizationId || 'default-org'
    console.log('🔍 [VALUATIONS API] Organization ID:', organizationId)
    
    if (!session?.user && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    console.log('🔍 [VALUATIONS API] Search params - search:', search, 'status:', status)

    console.log('🔍 [VALUATIONS API] Calling searchShumas...')
    const result = await ShumaDB.searchShumas(
      organizationId,
      search || undefined,
      status || undefined
    )
    console.log('🔍 [VALUATIONS API] searchShumas result:', {
      success: result?.success,
      error: result?.error,
      shumasCount: result?.shumas?.length
    })

    if (!result.success || result.error) {
      console.error('❌ [VALUATIONS API] Error searching shumas:', result.error)
      console.error('❌ [VALUATIONS API] Full result:', JSON.stringify(result, null, 2))
      return NextResponse.json({ 
        error: result.error || 'Failed to fetch valuations',
        details: result.error 
      }, { status: 500 })
    }

    console.log('✅ [VALUATIONS API] Returning valuations:', result.shumas?.length || 0)
    return NextResponse.json({ valuations: result.shumas || [] })
  } catch (error: any) {
    console.error('❌ [VALUATIONS API] Exception caught:', error)
    console.error('❌ [VALUATIONS API] Error stack:', error?.stack)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 })
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
      airDirections: body.airDirections || '',
      area: body.area || 0,
      propertyEssence: body.propertyEssence || '',
      clientName: body.clientName || '',
      clientTitle: body.clientTitle || '',
      clientNote: body.clientNote || '',
      clientRelation: body.clientRelation || '',
      visitDate: body.visitDate || new Date().toISOString().split('T')[0],
      valuationDate: body.valuationDate || new Date().toISOString().split('T')[0],
      valuationEffectiveDate: body.valuationEffectiveDate || body.visitDate || new Date().toISOString().split('T')[0],
      valuationType: body.valuationType || '',
      landContamination: body.landContamination || false,
      landContaminationNote: body.landContaminationNote || '',
      shamayName: body.shamayName || '',
      shamaySerialNumber: body.shamaySerialNumber || '',
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