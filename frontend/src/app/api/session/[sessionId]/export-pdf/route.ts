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

    // Send to backend for PDF generation using Puppeteer
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    console.log(`📤 Sending HTML to backend for PDF generation...`)
    
    const response = await fetch(`${backendUrl}/api/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        htmlContent
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Backend PDF generation failed:', error)
      return NextResponse.json({ 
        error: 'PDF generation failed',
        details: error 
      }, { status: 500 })
    }

    // Get the PDF buffer from backend
    const pdfBuffer = await response.arrayBuffer()
    console.log(`✅ PDF received from backend: ${pdfBuffer.byteLength} bytes`)

    // Return the PDF with proper headers for download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shamay-valuation-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString()
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

