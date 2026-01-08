import { NextRequest, NextResponse } from 'next/server'
const { ShumaDB } = require('../../../../../lib/shumadb.js')
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { renderDocxToBuffer } from '@/lib/docx/render'
import { convertValuationDataToReportData } from '@/lib/pdf/converter'

/**
 * POST /api/session/[sessionId]/export-docx
 * Generate and export the final valuation report as DOCX (Word) document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    // Validate sessionId format to prevent injection attacks
    // Accept UUID format or alphanumeric with dashes (for legacy IDs)
    const VALID_SESSION_ID = /^[a-zA-Z0-9-]+$/
    if (!sessionId || !VALID_SESSION_ID.test(sessionId) || sessionId.length > 100) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 })
    }

    const userSession = await getServerSession(authOptions)

    // In production, require authentication
    const isDev = process.env.NODE_ENV === 'development'
    if (!userSession?.user?.id && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userSession?.user?.id || 'dev-user-id'

    // Load session data from database
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId)

    if (!loadResult.success || !loadResult.valuationData) {
      console.error(`❌ Session not found: ${sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const valuationData = loadResult.valuationData

    // Verify session ownership (skip in development mode for testing)
    if (!isDev && valuationData.userId && valuationData.userId !== userId) {
      console.warn(`⚠️ Unauthorized access attempt: user ${userId} tried to export session ${sessionId}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch user settings for company logos, signature, and contact info
    let companySettings:
      | {
          companyLogo?: string
          footerLogo?: string
          companyName?: string
          signature?: string
        }
      | undefined = undefined

    try {
      if (userSession?.user?.id) {
        const userEmail = userSession?.user?.email || null
        const userSettings = await ShumaDB.getUserSettings(userSession.user.id, userEmail)

        if (userSettings) {
          companySettings = {
            companyLogo: userSettings.settings?.companyLogo,
            footerLogo: userSettings.settings?.footerLogo,
            companyName: userSettings.settings?.companyName || userSettings.name,
            signature: userSettings.settings?.signature,
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }

    // Convert ValuationData to ReportData format
    const reportData = convertValuationDataToReportData(valuationData, companySettings)

    // Render DOCX with error tracking
    const { buffer: docxBuffer, imageErrors, stats } = await renderDocxToBuffer(reportData)

    // Log image loading stats
    console.log(`📄 DOCX Export: Loaded ${stats.loaded}/${stats.attempted} images` +
      (stats.placeholders > 0 ? ` (${stats.placeholders} placeholders)` : ''))
    if (imageErrors.length > 0) {
      console.warn(`⚠️ Failed to load ${imageErrors.length} images:`,
        imageErrors.map(e => `${e.key}: ${e.error}`).join(', ')
      )
    }

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const docxUint8Array = new Uint8Array(docxBuffer)

    // Sanitize sessionId for use in filename to prevent header injection
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, '')

    // Return the DOCX with proper headers for download
    return new NextResponse(docxUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="shamay-valuation-${safeSessionId}.docx"`,
        'Content-Length': docxBuffer.length.toString(),
        'X-Images-Loaded': `${stats.loaded}/${stats.attempted}`,
        'X-Images-Failed': imageErrors.length.toString(),
        'X-Images-Placeholders': stats.placeholders.toString(),
      },
    })
  } catch (error) {
    // Log full error internally for debugging
    console.error('❌ Error in DOCX export:', error)
    // Return generic error to client to avoid information leakage
    return NextResponse.json(
      {
        error: 'Failed to export DOCX',
      },
      { status: 500 }
    )
  }
}
