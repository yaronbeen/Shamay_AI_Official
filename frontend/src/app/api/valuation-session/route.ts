// API route for managing valuation sessions and database integration
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const { ShumaDB } = require('@/lib/shumadb.js')
import { sessionStore } from '@/lib/session-store-global'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { sessionId, action, data } = requestBody

    // Skip authentication for load_from_db and save_to_db in development
    let session = null
    if (action !== 'load_from_db' && action !== 'save_to_db') {
      session = await getServerSession(authOptions)
      if (!session?.user?.primaryOrganizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    switch (action) {
      case 'save_to_db':
        // Save session data to database
        const { organizationId: requestOrgId, userId: requestUserId, valuationData } = requestBody

        // Use values from request or defaults for development
        const organizationId = requestOrgId || session?.user?.primaryOrganizationId || 'default-org'
        const userId = requestUserId || session?.user?.id || 'system'

        const result = await ShumaDB.saveShumaFromSession(
          sessionId,
          organizationId,
          userId,
          valuationData
        )

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ 
          shumaId: result.shumaId,
          success: true 
        })

      case 'load_from_db':
        // Load shuma data into session
        const loadResult = await ShumaDB.loadShumaForWizard(sessionId)
        
        if (loadResult.error) {
          return NextResponse.json({ error: loadResult.error }, { status: 404 })
        }

        // Update session with loaded data
        sessionStore.updateSession(sessionId, {
          data: loadResult.valuationData
        })

        return NextResponse.json({ 
          valuationData: loadResult.valuationData,
          success: true 
        })

      case 'save_gis_data':
        // Save GIS data to database + images table
        const { sessionId: gisSessionId, gisData } = requestBody
        const gisResult = await ShumaDB.saveGISData(gisSessionId, gisData)
        
        if (gisResult.error) {
          return NextResponse.json({ error: gisResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })
      
      case 'save_permit_extraction':
        // Save building permit extraction to building_permit_extracts + shuma
        const { sessionId: permitSessionId, permitData, documentFilename: permitFilename } = requestBody
        const permitResult = await ShumaDB.savePermitExtraction(permitSessionId, permitData, permitFilename)
        
        if (permitResult.error) {
          return NextResponse.json({ error: permitResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, permitId: permitResult.permitId })
      
      case 'save_land_registry_extraction':
        // Save land registry extraction to land_registry_extracts + shuma
        const { sessionId: landSessionId, landRegistryData, documentFilename: landFilename } = requestBody
        const landResult = await ShumaDB.saveLandRegistryExtraction(landSessionId, landRegistryData, landFilename)
        
        if (landResult.error) {
          return NextResponse.json({ error: landResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, landRegistryId: landResult.landRegistryId })
      
      case 'save_shared_building_extraction':
        // Save shared building extraction to shared_building_order + shuma
        const { sessionId: sharedSessionId, sharedBuildingData, documentFilename: sharedFilename } = requestBody
        const sharedResult = await ShumaDB.saveSharedBuildingExtraction(sharedSessionId, sharedBuildingData, sharedFilename)
        
        if (sharedResult.error) {
          return NextResponse.json({ error: sharedResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, sharedBuildingId: sharedResult.sharedBuildingId })
      
      case 'get_all_extracted_data':
        // Get all extracted data from all tables
        const { sessionId: getAllSessionId } = requestBody
        const allDataResult = await ShumaDB.getAllExtractedData(getAllSessionId)
        
        if (allDataResult.error) {
          return NextResponse.json({ error: allDataResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: allDataResult.data })

      case 'save_garmushka_data':
        // Save Garmushka data to database
        const { sessionId: garmushkaSessionId, garmushkaData } = data
        const garmushkaResult = await ShumaDB.saveGarmushkaData(garmushkaSessionId, garmushkaData)
        
        if (garmushkaResult.error) {
          return NextResponse.json({ error: garmushkaResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })

      case 'save_final_results':
        // Save final valuation results
        const { sessionId: finalSessionId, finalValuation, pricePerSqm, comparableData, propertyAnalysis } = data
        const finalResult = await ShumaDB.saveFinalResults(
          finalSessionId,
          finalValuation,
          pricePerSqm,
          comparableData,
          propertyAnalysis
        )
        
        if (finalResult.error) {
          return NextResponse.json({ error: finalResult.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Valuation session API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const valuationId = searchParams.get('valuationId')

    switch (action) {
      case 'get_valuations':
        // Get user's shumas
        const shumasResult = await ShumaDB.getUserShumas(
          session.user.id,
          session.user.primaryOrganizationId
        )
        
        if (shumasResult.error) {
          return NextResponse.json({ error: shumasResult.error }, { status: 500 })
        }

        return NextResponse.json({ 
          shumas: shumasResult.shumas,
          success: true 
        })

      case 'get_valuation':
        // Get specific shuma
        if (!valuationId) {
          return NextResponse.json({ error: 'Shuma ID required' }, { status: 400 })
        }

        const shumaResult = await ShumaDB.getShumaById(
          valuationId,
          session.user.primaryOrganizationId
        )
        
        if (shumaResult.error) {
          return NextResponse.json({ error: shumaResult.error }, { status: 404 })
        }

        return NextResponse.json({ 
          shuma: shumaResult.shuma,
          success: true 
        })

      case 'search_valuations':
        // Search shumas
        const searchTerm = searchParams.get('search')
        const status = searchParams.get('status')
        
        const searchResult = await ShumaDB.searchShumas(
          session.user.primaryOrganizationId,
          searchTerm || undefined,
          status || undefined
        )
        
        if (searchResult.error) {
          return NextResponse.json({ error: searchResult.error }, { status: 500 })
        }

        return NextResponse.json({ 
          shumas: searchResult.shumas,
          success: true 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Valuation session GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
