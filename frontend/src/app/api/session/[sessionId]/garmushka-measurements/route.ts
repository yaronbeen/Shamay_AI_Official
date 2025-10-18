import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const measurementData = session.data?.garmushkaMeasurements || null
    return NextResponse.json({ measurementData })
  } catch (error) {
    console.error('Error fetching garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const measurementData = await request.json()
    
    const updatedSession = sessionStore.updateSession(params.sessionId, {
      data: {
        garmushkaMeasurements: measurementData
      }
    })

    if (!updatedSession) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      measurementData: updatedSession.data?.garmushkaMeasurements 
    })
  } catch (error) {
    console.error('Error saving garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const updatedSession = sessionStore.updateSession(params.sessionId, {
      data: {
        garmushkaMeasurements: null
      }
    })

    if (!updatedSession) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting garmushka measurements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}