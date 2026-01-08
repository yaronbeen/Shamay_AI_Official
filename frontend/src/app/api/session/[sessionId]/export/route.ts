import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for sessions (use Redis in production)
const sessions = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = sessions.get(params.sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  const reportData = {
    title: 'הערכת שווי זכויות נדל"ן',
    address: session.data.address || '[כתובת]',
    clientName: session.data.clientName || '[מבקש השומה]',
    reportDate: new Date().toLocaleDateString('he-IL'),
    propertyDetails: session.data,
    calculations: session.calculations,
    documents: session.documents
  }
  
  return NextResponse.json({ success: true, reportData })
}
