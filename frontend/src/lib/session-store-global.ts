// Global session store that persists across Next.js API routes
// This uses a global variable that persists in the Node.js process

export type ProcessingStatusType = 'pending' | 'processing' | 'completed' | 'error';

export interface ProcessingStatus {
  tabu: ProcessingStatusType;
  condo: ProcessingStatusType;
  permit: ProcessingStatusType;
  startedAt?: string;
  completedAt?: string;
  errors?: Record<string, string>;
}

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
      processingStatus: {
        tabu: 'pending' as ProcessingStatusType,
        condo: 'pending' as ProcessingStatusType,
        permit: 'pending' as ProcessingStatusType,
      } as ProcessingStatus,
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

  updateProcessingStatus(
    sessionId: string,
    docType: 'tabu' | 'condo' | 'permit',
    status: ProcessingStatusType,
    error?: string
  ) {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Ensure processingStatus exists (for old sessions)
      if (!session.processingStatus) {
        session.processingStatus = {
          tabu: 'pending',
          condo: 'pending',
          permit: 'pending',
        }
      }

      session.processingStatus[docType] = status

      if (status === 'processing' && !session.processingStatus.startedAt) {
        session.processingStatus.startedAt = new Date().toISOString()
      }

      if (error) {
        session.processingStatus.errors = session.processingStatus.errors || {}
        session.processingStatus.errors[docType] = error
      }

      // Check if all completed
      const allDone = ['tabu', 'condo', 'permit'].every(
        t => session.processingStatus[t] === 'completed' || session.processingStatus[t] === 'error'
      )
      if (allDone && !session.processingStatus.completedAt) {
        session.processingStatus.completedAt = new Date().toISOString()
      }

      this.sessions.set(sessionId, session)
      console.log(`📄 Processing status updated: ${sessionId} - ${docType} = ${status}`)
      return session.processingStatus
    }
    return null
  }

  getProcessingStatus(sessionId: string): ProcessingStatus | null {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Ensure processingStatus exists (for old sessions)
      if (!session.processingStatus) {
        session.processingStatus = {
          tabu: 'pending',
          condo: 'pending',
          permit: 'pending',
        }
      }
      return session.processingStatus
    }
    return null
  }
}

export const sessionStore = new GlobalSessionStore()
