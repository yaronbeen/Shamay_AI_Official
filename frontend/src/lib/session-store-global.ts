// Global session store that persists across Next.js API routes
// This uses a global variable that persists in the Node.js process

// Global variable that persists across API routes
declare global {
  var __SHAMAY_SESSIONS__: Map<string, any> | undefined
}

// Initialize the global sessions Map
if (!global.__SHAMAY_SESSIONS__) {
  global.__SHAMAY_SESSIONS__ = new Map()
}

class GlobalSessionStore {
  private get sessions() {
    return global.__SHAMAY_SESSIONS__!
  }

  createSession() {
    const sessionId = Date.now().toString()
    const sessionData = {
      sessionId,
      step: 1,
      data: {},
      documents: {},
      uploads: [],
      calculations: {},
      createdAt: new Date().toISOString()
    }
    
    this.sessions.set(sessionId, sessionData)
    console.log(`✅ Created new session: ${sessionId}`)
    console.log(`📊 Total sessions: ${this.sessions.size}`)
    console.log(`📊 All sessions:`, Array.from(this.sessions.keys()))
    
    return sessionData
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId)
  }

  updateSession(sessionId: string, updates: any) {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Deep merge for data object, shallow merge for other properties
      const updatedSession = {
        ...session,
        ...updates,
        data: {
          ...session.data,
          ...(updates.data || {}),
          // Deep merge for gisScreenshots specifically
          gisScreenshots: updates.data?.gisScreenshots ? {
            ...session.data?.gisScreenshots,
            ...updates.data.gisScreenshots
          } : session.data?.gisScreenshots
        }
      }
      
      this.sessions.set(sessionId, updatedSession)
      return updatedSession
    }
    return null
  }

  getAllSessions() {
    return Array.from(this.sessions.entries())
  }
}

export const sessionStore = new GlobalSessionStore()
