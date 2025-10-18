import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../lib/session-store-global'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = sessionStore.getSession(params.sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  return NextResponse.json(session)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = sessionStore.getSession(params.sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const updates = await request.json()
  const updatedSession = sessionStore.updateSession(params.sessionId, updates)

  return NextResponse.json({ success: true, session: updatedSession })
}