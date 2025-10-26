import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'
import { generateDocumentHTML } from '../../../../../lib/document-template'

/**
 * POST /api/session/[sessionId]/export-pdf
 * Generate and export the final valuation report as PDF using the HTML template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    console.log(`📄 PDF Export requested for session: ${sessionId}`)

    // Load session data from database
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId)
    
    if (!loadResult.success || !loadResult.valuationData) {
      console.error(`❌ Session not found: ${sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const valuationData = loadResult.valuationData

    // Generate HTML from template
    console.log(`📝 Generating HTML from document template...`)
    // Cast to ValuationData type (signature field may be missing from DB but template handles it)
    const htmlContent = generateDocumentHTML(valuationData as any, false)

    // For PDF generation, we need to use a library like jsPDF or html2pdf
    // OR return the HTML and let the frontend handle it with window.print()
    // Since this is complex, return the HTML for now and let Step5 handle it

    console.log(`⚠️ Returning HTML - PDF conversion should be done client-side`)
    
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    })

  } catch (error) {
    console.error('❌ Error in PDF export:', error)
    return NextResponse.json({
      error: 'Failed to export PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

