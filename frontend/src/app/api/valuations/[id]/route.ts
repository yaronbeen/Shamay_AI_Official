import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const { ShumaDB } = require('@/lib/shumadb.js')
// import { updateValuationSchema } from '@/lib/validations' // Not needed with ShumaDB

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await ShumaDB.getShumaById(params.id, session.user.primaryOrganizationId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ valuation: result.shuma })
  } catch (error) {
    console.error('Error fetching valuation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // For now, we'll just return the existing shuma since ShumaDB handles updates differently
    // In a full implementation, you'd want to update the specific fields
    const result = await ShumaDB.getShumaById(params.id, session.user.primaryOrganizationId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ valuation: result.shuma })
  } catch (error) {
    console.error('Error updating valuation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
