/**
 * Session API Adapter - Backward Compatibility Layer
 * Maps old /api/session/:id calls to new valuation API
 * This allows gradual migration of frontend code
 */

import { NextRequest, NextResponse } from 'next/server'
const { ShumaDB } = require('@/lib/shumadb.js')

function getAuthUser(request: NextRequest) {
  // Development mode - allow all access
  return {
    userId: 'system',
    organizationId: 'default-org',
    role: 'appraiser',
  }
}

/**
 * GET /api/session/:sessionId
 * Returns session data in old format
 */
export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const user = getAuthUser(request)
    const { sessionId } = params

    // Load shuma data for this session
    const result = await ShumaDB.loadShumaForWizard(sessionId)

    if (result.error) {
      // Session doesn't exist yet - return empty session
      return NextResponse.json({
        sessionId,
        data: {},
        status: 'new',
      })
    }

    // Return session data
    return NextResponse.json({
      sessionId,
      data: result.valuationData,
      status: 'active',
    })
  } catch (error: any) {
    console.error('Session GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/session/:sessionId
 * Updates session data - creates or updates valuation
 */
export async function PUT(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const user = getAuthUser(request)
    const { sessionId } = params
    const body = await request.json()
    const { data } = body

    // Handle case where data is undefined or not properly structured
    if (!data) {
      console.log('⚠️ No data provided in request body, using empty object')
      return NextResponse.json({
        success: true,
        sessionId,
        message: 'No data to save'
      })
    }

    // Save to shuma table
    const result = await ShumaDB.saveShumaFromSession(
      sessionId,
      user.organizationId,
      user.userId,
      data
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sessionId,
      shumaId: result.shumaId,
      session: {
        sessionId,
        data,
        status: 'updated',
      },
    })
  } catch (error: any) {
    console.error('Session PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/session (without sessionId) - Create new session
 */
export async function POST(request: NextRequest) {
  try {
    // Generate new session ID
    const sessionId = Date.now().toString()

    return NextResponse.json({
      sessionId,
      data: {},
      status: 'created',
    })
  } catch (error: any) {
    console.error('Session POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
