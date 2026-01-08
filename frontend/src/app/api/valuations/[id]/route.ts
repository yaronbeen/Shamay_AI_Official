import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const { ShumaDB } = require('@/lib/shumadb.js')

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

    if (!result.success || result.error) {
      console.error('Error fetching shuma:', result.error)
      return NextResponse.json({ 
        error: result.error || 'Valuation not found',
        details: result.error 
      }, { status: 404 })
    }

    return NextResponse.json({ valuation: result.shuma })
  } catch (error: any) {
    console.error('Error fetching valuation:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 })
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await ShumaDB.deleteShuma(params.id, session.user.primaryOrganizationId)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete valuation' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Valuation deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting valuation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
