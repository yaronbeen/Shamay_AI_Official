/**
 * Next.js API Route for Provenance (by ID)
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/provenance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update provenance' }))
      return NextResponse.json({
        success: false,
        error: error.error || 'Failed to update provenance'
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Error in provenance API route:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update provenance'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    const response = await fetch(`${BACKEND_URL}/api/provenance/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete provenance' }))
      return NextResponse.json({
        success: false,
        error: error.error || 'Failed to delete provenance'
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Error in provenance API route:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete provenance'
    }, { status: 500 })
  }
}

