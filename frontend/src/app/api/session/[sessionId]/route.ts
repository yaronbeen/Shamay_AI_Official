/**
 * Session API Adapter - Backward Compatibility Layer
 * Maps old /api/session/:id calls to new valuation API
 * This allows gradual migration of frontend code
 * 
 * Enhanced with caching to reduce database load:
 * - In-memory cache with 30-second TTL
 * - ETag support for client-side caching
 * - Automatic cache invalidation on updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionCache } from '@/lib/session-cache'

const { ShumaDB } = require('@/lib/shumadb.js')

function getAuthUser(request: NextRequest) {
  // Development mode - allow all access
  return {
    userId: 'system',
    organizationId: 'default-org',
    role: 'appraiser',
  }
}

/**
 * GET /api/session/:sessionId
 * Returns session data in old format with caching support
 */
export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const user = getAuthUser(request)
    const { sessionId } = params
    const cache = getSessionCache()
    
    // Check if client has cached version (via If-None-Match header)
    const clientETag = request.headers.get('if-none-match')
    
    // Try to get from cache first
    const cached = cache.get(sessionId)
    if (cached) {
      // If client has same version, return 304 Not Modified
      if (clientETag && clientETag === cached.etag) {
        console.log(`✅ Cache hit (304): Session ${sessionId}`)
        return new NextResponse(null, {
          status: 304,
          headers: {
            'ETag': cached.etag,
            'Cache-Control': 'private, max-age=30, must-revalidate',
          }
        })
      }
      
      // Return cached data with ETag
      console.log(`✅ Cache hit: Session ${sessionId}`)
      console.log('🔍 [API GET] Cached data keys:', Object.keys(cached.data || {}))
      console.log('🔍 [API GET] Cached critical fields:', {
        clientTitle: cached.data?.clientTitle,
        valuationType: cached.data?.valuationType,
        clientNote: cached.data?.clientNote,
        clientRelation: cached.data?.clientRelation,
        valuationEffectiveDate: cached.data?.valuationEffectiveDate
      })
      return NextResponse.json(
        {
          sessionId,
          data: cached.data,
          status: 'active',
        },
        {
          headers: {
            'ETag': cached.etag,
            'Cache-Control': 'private, max-age=30, must-revalidate',
            'X-Cache': 'HIT',
          }
        }
      )
    }
    
    // Cache miss - load from database
    console.log(`⚠️ Cache miss: Session ${sessionId} - Loading from DB`)
    const result = await ShumaDB.loadShumaForWizard(sessionId)

    if (result.error) {
      // Session doesn't exist yet - return empty session (don't cache)
      return NextResponse.json({
        sessionId,
        data: {},
        status: 'new',
      })
    }

    // Store in cache and get ETag
    const etag = cache.set(sessionId, result.valuationData)
    
    // Return session data with caching headers
    return NextResponse.json(
      {
        sessionId,
        data: result.valuationData,
        status: 'active',
      },
      {
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=30, must-revalidate',
          'X-Cache': 'MISS',
        }
      }
    )
  } catch (error: any) {
    console.error('Session GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/session/:sessionId
 * Updates session data - creates or updates valuation
 */
export async function PUT(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const user = getAuthUser(request)
    const { sessionId } = params
    const body = await request.json()
    const { data } = body
    const cache = getSessionCache()

    // Handle case where data is undefined or not properly structured
    if (!data) {
      console.log('⚠️ No data provided in request body, using empty object')
      return NextResponse.json({
        success: true,
        sessionId,
        message: 'No data to save'
      })
    }

    // Validate and sanitize extractedData if present
    if (data.extractedData) {
      try {
        // Ensure extractedData can be serialized
        JSON.stringify(data.extractedData)
        
        // Clean up any undefined values, null values in arrays, and circular references
        const cleanExtractedData = (obj: any, seen = new WeakSet()): any => {
          if (obj === null || obj === undefined) {
            return null
          }
          
          // Handle circular references
          if (typeof obj === 'object') {
            if (seen.has(obj)) {
              return null // Break circular reference
            }
            seen.add(obj)
          }
          
          if (Array.isArray(obj)) {
            return obj.map(item => cleanExtractedData(item, seen)).filter(item => item !== undefined && item !== null)
          }
          
          if (typeof obj === 'object') {
            const cleaned: any = {}
            for (const [key, value] of Object.entries(obj)) {
              // Skip functions and undefined
              if (value !== undefined && typeof value !== 'function') {
                const cleanedValue = cleanExtractedData(value, seen)
                if (cleanedValue !== undefined) {
                  cleaned[key] = cleanedValue
                }
              }
            }
            return cleaned
          }
          
          // Handle special values
          if (typeof obj === 'number' && (isNaN(obj) || !isFinite(obj))) {
            return null
          }
          
          return obj
        }
        
        data.extractedData = cleanExtractedData(data.extractedData)
        
        // Final validation - ensure it can still be serialized after cleaning
        JSON.stringify(data.extractedData)
      } catch (error) {
        console.error('Error validating extractedData:', error)
        console.error('Problematic extractedData:', JSON.stringify(data.extractedData, null, 2).substring(0, 500))
        return NextResponse.json({ 
          error: 'Invalid extractedData format - cannot serialize',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 })
      }
    }

    // Debug: Check what we're about to save
    console.log('🔍 API PUT - About to save:', {
      clientTitle: data.clientTitle,
      clientTitleType: typeof data.clientTitle,
      clientTitleIn: 'clientTitle' in data,
      valuationType: data.valuationType,
      valuationTypeType: typeof data.valuationType,
      valuationTypeIn: 'valuationType' in data
    })
    
    // Save to shuma table
    const result = await ShumaDB.saveShumaFromSession(
      sessionId,
      user.organizationId,
      user.userId,
      data
    )

    if (result.error) {
      console.error('ShumaDB.saveShumaFromSession error:', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    // Invalidate cache for this session after successful update
    cache.invalidate(sessionId)
    console.log(`🗑️ Cache invalidated for session ${sessionId} after update`)

    return NextResponse.json({
      success: true,
      sessionId,
      shumaId: result.shumaId,
      session: {
        sessionId,
        data,
        status: 'updated',
      },
    })
  } catch (error: any) {
    console.error('Session PUT error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    }, { status: 500 })
  }
}

/**
 * POST /api/session (without sessionId) - Create new session
 */
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
