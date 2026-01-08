import { NextRequest, NextResponse } from 'next/server'
import { sessionStore, ProcessingStatus } from '../../../../../lib/session-store-global'
import { ShumaDB } from '../../../../../lib/shumadb.js'

// Get processing status for all document types
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId

    // Get processing status from session store
    let processingStatus = sessionStore.getProcessingStatus(sessionId)

    // If not in memory, initialize it
    if (!processingStatus) {
      processingStatus = {
        tabu: 'pending',
        condo: 'pending',
        permit: 'pending'
      }
    }

    // Check if all processing is complete
    const allComplete = ['tabu', 'condo', 'permit'].every(
      t => processingStatus![t as keyof ProcessingStatus] === 'completed' ||
           processingStatus![t as keyof ProcessingStatus] === 'error'
    )

    // If there are completed extractions, include the latest data
    let extractedData = null
    if (allComplete || processingStatus.tabu === 'completed' ||
        processingStatus.condo === 'completed' || processingStatus.permit === 'completed') {
      try {
        const sessionData = await ShumaDB.loadShumaForWizard(sessionId)
        if (sessionData.success && sessionData.valuationData) {
          extractedData = sessionData.valuationData.extractedData || null
        }
      } catch (dbError) {
        console.error('Error loading extracted data:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      processingStatus,
      allComplete,
      extractedData
    })

  } catch (error) {
    console.error('❌ Error getting processing status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get processing status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
