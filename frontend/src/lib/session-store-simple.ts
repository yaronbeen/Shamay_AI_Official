


// Simple in-memory session store for development
const sessions = new Map<string, any>()

class SimpleSessionStore {
  createSession() {
    const sessionId = Date.now().toString()
    const sessionData = {
      sessionId,
      step: 1,
      data: {},
      documents: {},
      calculations: {},
      createdAt: new Date().toISOString()
    }
    
    sessions.set(sessionId, sessionData)
    console.log(`✅ Created new session: ${sessionId}`)
    console.log(`📊 Total sessions: ${sessions.size}`)
    console.log(`📊 All sessions:`, Array.from(sessions.keys()))
    
    return sessionData
  }

  getSession(sessionId: string) {
    console.log(`🔍 Looking for session: ${sessionId}`)
    console.log(`📊 Available sessions:`, Array.from(sessions.keys()))
    console.log(`📊 Sessions size:`, sessions.size)
    
    const session = sessions.get(sessionId)
    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`)
      console.log(`📊 Current sessions:`, Array.from(sessions.entries()))
    } else {
      console.log(`✅ Session found:`, session)
    }
    
    return session
  }

  updateSession(sessionId: string, updates: any) {
    const session = sessions.get(sessionId)
    if (session) {
      const updatedSession = { ...session, ...updates }
      sessions.set(sessionId, updatedSession)
      console.log(`📊 Session updated:`, updatedSession)
      return updatedSession
    }
    return null
  }

  getAllSessions() {
    return Array.from(sessions.entries())
  }
}

export const sessionStore = new SimpleSessionStore()