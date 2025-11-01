import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get organization and user IDs from session
    const session = await getServerSession(authOptions)
    const organizationId = session?.user?.primaryOrganizationId || 'default-org'
    const userId = session?.user?.id || 'system'

    console.log('📤 CSV Import Request')
    console.log('📊 Organization/User:', { organizationId, userId })

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    
    // Forward the FormData to the backend
    const formData = await request.formData()
    
    // Add organizationId and userId to formData
    formData.append('organizationId', organizationId)
    formData.append('userId', userId)

    // Forward to backend
    const backendResponse = await fetch(`${backendUrl}/api/comparable-data/import`, {
      method: 'POST',
      body: formData
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('❌ Backend import error:', errorText)
      return NextResponse.json({
        success: false,
        error: errorText || 'Failed to import CSV file'
      }, { status: backendResponse.status })
    }

    const result = await backendResponse.json()
    console.log('✅ CSV import completed:', result)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ CSV import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

