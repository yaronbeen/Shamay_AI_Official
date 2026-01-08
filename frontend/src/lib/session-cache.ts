/**
 * In-memory cache for session data with TTL (Time To Live)
 * This cache helps reduce database queries significantly
 */

interface CacheEntry {
  data: any
  timestamp: number
  etag: string
}

class SessionCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly DEFAULT_TTL = 30000 // 30 seconds
  private readonly MAX_CACHE_SIZE = 100 // Maximum number of cached sessions
  
  /**
   * Generate an ETag based on data content
   */
  private generateETag(data: any): string {
    const content = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `"${hash.toString(16)}"`
  }
  
  /**
   * Get cached data if it exists and is still valid
   */
  get(sessionId: string): { data: any, etag: string } | null {
    const entry = this.cache.get(sessionId)
    
    if (!entry) {
      return null
    }
    
    // Check if cache has expired
    const now = Date.now()
    if (now - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(sessionId)
      return null
    }
    
    return {
      data: entry.data,
      etag: entry.etag
    }
  }
  
  /**
   * Set cache data with automatic TTL and size management
   */
  set(sessionId: string, data: any): string {
    // If cache is too large, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    const etag = this.generateETag(data)
    this.cache.set(sessionId, {
      data,
      timestamp: Date.now(),
      etag
    })
    
    return etag
  }
  
  /**
   * Invalidate cache for a specific session
   */
  invalidate(sessionId: string): void {
    this.cache.delete(sessionId)
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number, maxSize: number, ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.DEFAULT_TTL
    }
  }
}

// Create singleton instance
let cacheInstance: SessionCache | null = null

export function getSessionCache(): SessionCache {
  if (!cacheInstance) {
    cacheInstance = new SessionCache()
  }
  return cacheInstance
}
