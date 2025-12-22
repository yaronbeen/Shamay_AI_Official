/**
 * Session API - Create new session
 * Backward compatibility endpoint
 */

import { NextRequest, NextResponse } from 'next/server'

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
