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
    
    // Check if AI extraction was successful
    if (!extractedData.success) {
      console.error('❌ AI extraction failed:', extractedData.error)
      return NextResponse.json({
        success: false,
        error: extractedData.error || 'AI extraction failed'
      }, { status: 500 })
    }
    
    // Map backend response to UI-expected format (camelCase → snake_case)
    const mappedData = {
      gush: extractedData.gush,
      chelka: extractedData.chelka,
      sub_chelka: extractedData.subChelka,
      registration_office: extractedData.registrationOffice,
      ownership_type: extractedData.ownershipType,
      document_type: extractedData.documentType,
      registered_area: extractedData.registeredArea,
      apartment_registered_area: extractedData.apartmentArea,
      balcony_area: extractedData.balconyArea,
      buildings_count: extractedData.buildingsCount,
      address_from_tabu: extractedData.addressFromTabu,
      unit_description: extractedData.unitDescription,
      floor: extractedData.floor,
      building_number: extractedData.buildingNumber,
      attachments: extractedData.attachments,
      attachments_description: extractedData.attachmentsDescription,
      attachments_area: extractedData.attachmentsArea,
      additional_areas: extractedData.additionalAreas,
      owners: extractedData.owners,
      owners_count: extractedData.ownersCount,
      shared_property: extractedData.sharedProperty,
      rights: extractedData.rights,
      plot_notes: extractedData.plotNotes,
      notes_action_type: extractedData.notesActionType,
      notes_beneficiary: extractedData.notesBeneficiary,
      easements_essence: extractedData.easementsEssence,
      easements_description: extractedData.easementsDescription,
      mortgages: extractedData.mortgages,
      mortgage_essence: extractedData.mortgageEssence,
      mortgage_rank: extractedData.mortgageRank,
      mortgage_lenders: extractedData.mortgageLenders,
      mortgage_borrowers: extractedData.mortgageBorrowers,
      mortgage_amount: extractedData.mortgageAmount,
      mortgage_property_share: extractedData.mortgagePropertyShare,
      confidence: extractedData.confidence,
      sub_plots_count: extractedData.subPlotsCount,
      issue_date: extractedData.issueDate,
      tabu_extract_date: extractedData.tabuExtractDate
    }
    
    // Save the extracted data to database
    console.log('💾 Saving land registry extraction to database...')
    const saveResponse = await fetch(`${backendUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'save_land_registry_extraction',
        sessionId: params.sessionId,
        extractedData: mappedData
      })
    })
    
    if (!saveResponse.ok) {
      const saveError = await saveResponse.json().catch(() => ({ error: 'Unknown save error' }))
      console.error('❌ Failed to save land registry extraction:', saveError)
      return NextResponse.json({
        success: false,
        error: 'Failed to save extracted data to database',
        details: saveError.error || 'Database save failed'
      }, { status: 500 })
    }
    
    const saveResult = await saveResponse.json()
    console.log('✅ Land registry extraction saved successfully:', saveResult)
    
    return NextResponse.json({
      success: true,
      extractedData: mappedData,
      saveResult
    })
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to analyze land registry documents',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
