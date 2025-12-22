/**
 * Next.js API Route for Provenance
 * Proxies requests to backend Express server
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const fieldPath = searchParams.get('fieldPath')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 })
    }

    // Get session for auth (optional for now)
    const session = await getServerSession(authOptions)
    
    // Build URL
    let url = `${BACKEND_URL}/api/provenance?sessionId=${encodeURIComponent(sessionId)}`
    if (fieldPath) {
      url += `&fieldPath=${encodeURIComponent(fieldPath)}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.user?.id && { 'X-User-ID': session.user.id })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch provenance' }))
      return NextResponse.json({
        success: false,
        error: error.error || 'Failed to fetch provenance'
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Error in provenance API route:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch provenance'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get session for auth
    const session = await getServerSession(authOptions)
    
    const response = await fetch(`${BACKEND_URL}/api/provenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.user?.id && { 'X-User-ID': session.user.id })
      },
      body: JSON.stringify({
        ...body,
        createdBy: session?.user?.id || 'system'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create provenance' }))
      return NextResponse.json({
        success: false,
        error: error.error || 'Failed to create provenance'
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Error in provenance API route:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create provenance'
    }, { status: 500 })
  }
}

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

