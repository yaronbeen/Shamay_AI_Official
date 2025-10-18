import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../lib/session-store-global'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Creating new session...')
    
    // Parse request body if provided
    let initialData = {}
    try {
      const body = await request.json()
      if (body.data) {
        initialData = body.data
        console.log('📊 Initial data provided:', initialData)
      }
    } catch (e) {
      console.log('📊 No initial data provided')
    }
    
    const sessionData = sessionStore.createSession()
    
    // Update session with initial data if provided
    if (Object.keys(initialData).length > 0) {
      sessionStore.updateSession(sessionData.sessionId, {
        ...sessionData,
        data: initialData
      })
      console.log('📊 Session updated with initial data')
    }
    
    console.log('✅ Session created successfully:', sessionData.sessionId)
    return NextResponse.json({ sessionId: sessionData.sessionId })
  } catch (error) {
    console.error('❌ Session creation error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }
  
  console.log(`🔍 GET request for session: ${sessionId}`)
  const session = sessionStore.getSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  return NextResponse.json(session)
}