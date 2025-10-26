import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'

/**
 * POST /api/session/[sessionId]/export-pdf
 * Generate and export the final valuation report as PDF
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

    // For now, delegate to backend for PDF generation
    // Backend has better support for PDF libraries (puppeteer, pdfkit, etc.)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    
    console.log(`📤 Forwarding PDF generation to backend: ${backendUrl}`)
    
    const backendResponse = await fetch(`${backendUrl}/api/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        valuationData
      })
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error(`❌ Backend PDF generation failed:`, errorText)
      return NextResponse.json({ 
        error: 'PDF generation failed',
        details: errorText
      }, { status: backendResponse.status })
    }

    // Get the PDF blob from backend
    const pdfBlob = await backendResponse.blob()
    console.log(`✅ PDF generated successfully: ${pdfBlob.size} bytes`)

    // Return the PDF with proper headers
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shamay-valuation-${sessionId}.pdf"`,
        'Content-Length': pdfBlob.size.toString()
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

