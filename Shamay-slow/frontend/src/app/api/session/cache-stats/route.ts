/**
 * Cache Statistics API
 * Provides insights into the session cache performance
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionCache } from '@/lib/session-cache'

/**
 * GET /api/session/cache-stats
 * Returns cache statistics for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const cache = getSessionCache()
    const stats = cache.getStats()
    
    return NextResponse.json({
      ...stats,
      ttlSeconds: stats.ttl / 1000,
      utilizationPercent: Math.round((stats.size / stats.maxSize) * 100),
      message: `Cache is ${Math.round((stats.size / stats.maxSize) * 100)}% utilized`
    })
  } catch (error: any) {
    console.error('Cache stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
