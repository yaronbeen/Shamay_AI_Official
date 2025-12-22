import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Session store using file system for persistence
class SessionStore {
  private sessionsDir: string

  constructor() {
    this.sessionsDir = join(process.cwd(), 'sessions')
    this.ensureSessionsDir()
  }

  private async ensureSessionsDir() {
    try {
      await mkdir(this.sessionsDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create sessions directory:', error)
    }
  }

  private getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`)
  }

  async createSession() {
    const sessionId = Date.now().toString()
    const sessionData = {
      sessionId,
      step: 1,
      data: {},
      documents: {},
      calculations: {},
      createdAt: new Date().toISOString()
    }
    
    try {
      await writeFile(
        this.getSessionPath(sessionId), 
        JSON.stringify(sessionData, null, 2)
      )
      console.log(`✅ Created new session: ${sessionId}`)
      return sessionData
    } catch (error) {
      console.error('Failed to create session:', error)
      throw error
    }
  }

  async getSession(sessionId: string) {
    try {
      console.log(`🔍 Looking for session: ${sessionId}`)
      const sessionPath = this.getSessionPath(sessionId)
      const sessionData = await readFile(sessionPath, 'utf-8')
      const session = JSON.parse(sessionData)
      console.log(`✅ Session found:`, session)
      return session
    } catch (error) {
      console.error(`❌ Session not found: ${sessionId}`, error)
      return null
    }
  }

  async updateSession(sessionId: string, updates: any) {
    try {
      const session = await this.getSession(sessionId)
      if (session) {
        const updatedSession = { ...session, ...updates }
        await writeFile(
          this.getSessionPath(sessionId),
          JSON.stringify(updatedSession, null, 2)
        )
        console.log(`📊 Session updated:`, updatedSession)
        return updatedSession
      }
      return null
    } catch (error) {
      console.error('Failed to update session:', error)
      return null
    }
  }

  async getAllSessions() {
    try {
      const files = await readFile(this.sessionsDir, 'utf-8')
      return files
    } catch (error) {
      console.error('Failed to get all sessions:', error)
      return []
    }
  }
}

// Export a singleton instance
export const sessionStore = new SessionStore()
