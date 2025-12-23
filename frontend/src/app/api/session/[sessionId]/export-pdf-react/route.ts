import { NextRequest, NextResponse } from 'next/server'
const { ShumaDB } = require('../../../../../lib/shumadb.js')
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { renderPdfToBuffer } from '@/lib/pdf/render'
import { convertValuationDataToReportData } from '@/lib/pdf/converter'

/**
 * POST /api/session/[sessionId]/export-pdf-react
 * Generate and export the final valuation report as PDF using React-PDF renderer
 * This is an alternative to the Puppeteer-based export-pdf route
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    const userSession = await getServerSession(authOptions)
    const userId = userSession?.user?.id || 'dev-user-id'

    // Load session data from database
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId)
    
    if (!loadResult.success || !loadResult.valuationData) {
      console.error(`❌ Session not found: ${sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const valuationData = loadResult.valuationData

    // Fetch user settings for company logos, signature, and contact info
    let companySettings: {
      companyLogo?: string
      footerLogo?: string
      companyName?: string
      signature?: string
    } | undefined = undefined
    
    try {
      if (userSession?.user?.id) {
        const userEmail = userSession?.user?.email || null
        const userSettings = await ShumaDB.getUserSettings(userSession.user.id, userEmail)
        
        if (userSettings) {
          companySettings = {
            companyLogo: userSettings.settings?.companyLogo,
            footerLogo: userSettings.settings?.footerLogo,
            companyName: userSettings.settings?.companyName || userSettings.name,
            signature: userSettings.settings?.signature
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }

    // Convert ValuationData to ReportData format
    const reportData = convertValuationDataToReportData(valuationData, companySettings)

    // Render PDF using React-PDF
    const pdfBuffer = await renderPdfToBuffer(reportData)

    // Return the PDF with proper headers for download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shamay-valuation-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Error in React-PDF export:', error)
    return NextResponse.json({
      error: 'Failed to export PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

