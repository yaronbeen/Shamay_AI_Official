/**
 * Unified File Storage Service
 * Automatically uses Vercel Blob in production and local filesystem in development
 */

// @ts-ignore - @vercel/blob might not be installed in development
import { put, del, list } from '@vercel/blob'
import * as fs from 'fs/promises'
import * as path from 'path'

export class FileStorageService {
  private static UPLOADS_DIR = path.join(process.cwd(), 'uploads')
  
  private static encodePath(pathValue: string): string {
    return pathValue
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
  }
  
  private static decodePath(pathValue: string): string {
    return pathValue
      .split('/')
      .map(segment => decodeURIComponent(segment))
      .join('/')
  }
  
  /**
   * Check if we're running in production (Vercel)
   */
  static isProduction(): boolean {
    return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
  }
  
  /**
   * Upload a file - automatically uses Blob in production, filesystem in dev
   * Files are stored under users/{userId}/{sessionId}/{filename}
   */
  static async uploadFile(
    file: Buffer | Blob,
    sessionId: string,
    filename: string,
    mimeType?: string,
    userId?: string
  ): Promise<{ url: string; path: string; size: number }> {
    // Default to 'dev-user-id' for development if userId is not provided
    const effectiveUserId = userId || 'dev-user-id'
    
    if (this.isProduction()) {
      return this.uploadToBlob(file, sessionId, filename, effectiveUserId)
    } else {
      return this.uploadToLocal(file as Buffer, sessionId, filename, mimeType, effectiveUserId)
    }
  }
  
  /**
   * Upload to Vercel Blob (Production)
   * Path structure: users/{userId}/{sessionId}/{filename}
   * OR: {sessionId}/{filename} if sessionId already starts with "users/"
   */
  private static async uploadToBlob(
    file: Buffer | Blob,
    sessionId: string,
    filename: string,
    userId: string
  ): Promise<{ url: string; path: string; size: number }> {
    try {
      console.log('🔍 [BLOB] Uploading file:', {
        userId,
        sessionId,
        filename,
        fileSize: file instanceof Buffer ? file.length : (file as any).size,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      })
      
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn('⚠️ [BLOB] No BLOB_READ_WRITE_TOKEN found! Upload may fail.')
      }
      
      // Check if sessionId already contains the full path (e.g., "users/{userId}/logos")
      let pathname: string
      if (sessionId.startsWith('users/')) {
        // sessionId already contains full path (e.g., "users/{userId}/logos")
        pathname = `${sessionId}/${filename}`
      } else {
        // Regular sessionId - use users/{userId}/{sessionId} structure
        pathname = `users/${userId}/${sessionId}/${filename}`
      }
      
      const blob = await put(pathname, file, {
        access: 'public',
        addRandomSuffix: false,
      })
      
      console.log('✅ [BLOB] File uploaded successfully:', {
        url: blob.url,
        pathname: blob.pathname,
        size: (blob as any).size
      })
      
      return {
        url: blob.url,
        path: blob.pathname,
        size: (blob as any).size || 0
      }
    } catch (error: any) {
      console.error('❌ [BLOB] Upload error:', {
        error: error.message,
        stack: error.stack,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      })
      throw new Error(`Blob upload failed: ${error.message}`)
    }
  }
  
  /**
   * Upload to local filesystem (Development)
   * Path structure: uploads/users/{userId}/{sessionId}/{filename}
   */
  private static async uploadToLocal(
    file: Buffer,
    sessionId: string,
    filename: string,
    mimeType: string | undefined,
    userId: string
  ): Promise<{ url: string; path: string; size: number }> {
    try {
      const projectRoot = path.resolve(process.cwd())
      
      // Check if sessionId already contains the full path (e.g., "users/{userId}/logos")
      let uploadsDir: string
      let relativePath: string
      
      if (sessionId.startsWith('users/')) {
        // sessionId already contains full path (e.g., "users/{userId}/logos")
        // Don't add users/{userId}/ again
        uploadsDir = path.join(projectRoot, 'uploads', sessionId)
        relativePath = `${sessionId}/${filename}`
      } else {
        // Regular sessionId - use users/{userId}/{sessionId} structure
        uploadsDir = path.join(projectRoot, 'uploads', 'users', userId, sessionId)
        relativePath = `users/${userId}/${sessionId}/${filename}`
      }
      
      // Create directory if it doesn't exist
      await fs.mkdir(uploadsDir, { recursive: true })
      
      // Handle nested paths in filename (e.g., "images/filename.jpg")
      const filenameParts = filename.split('/')
      const actualFilename = filenameParts[filenameParts.length - 1]
      const subDir = filenameParts.length > 1 ? filenameParts.slice(0, -1).join('/') : ''
      
      let filePath: string
      if (subDir) {
        const subDirPath = path.join(uploadsDir, subDir)
        await fs.mkdir(subDirPath, { recursive: true })
        filePath = path.join(subDirPath, actualFilename)
      } else {
        filePath = path.join(uploadsDir, actualFilename)
      }
      
      // Write file to disk
      await fs.writeFile(filePath, file)
      
      const stats = await fs.stat(filePath)
      
      console.log('✅ [LOCAL] File uploaded:', relativePath)
      console.log('   Full path:', filePath)
      
      return {
        url: `/api/files/${this.encodePath(relativePath)}`,
        path: relativePath,
        size: stats.size
      }
    } catch (error: any) {
      console.error('❌ [LOCAL] Upload error:', error)
      throw new Error(`Local upload failed: ${error.message}`)
    }
  }
  
  /**
   * Delete a file - automatically detects Blob URL or local path
   */
  static async deleteFile(urlOrPath: string): Promise<void> {
    if (this.isProduction() && urlOrPath.startsWith('https://')) {
      return this.deleteFromBlob(urlOrPath)
    } else {
      return this.deleteFromLocal(urlOrPath)
    }
  }
  
  /**
   * Delete from Vercel Blob
   */
  private static async deleteFromBlob(url: string): Promise<void> {
    try {
      await del(url)
      console.log('✅ [BLOB] File deleted:', url)
    } catch (error: any) {
      console.error('❌ [BLOB] Delete error:', error)
      throw new Error(`Blob delete failed: ${error.message}`)
    }
  }
  
  /**
   * Delete from local filesystem
   * Path structure: uploads/users/{userId}/{sessionId}/{filename}
   */
  private static async deleteFromLocal(relativePath: string): Promise<void> {
    try {
      // Remove leading slash and /api/files/ prefix if present
      const cleanPath = relativePath.replace(/^\/api\/files\//, '').replace(/^\//, '')
      const decodedPath = this.decodePath(cleanPath)
      const filePath = path.join(this.UPLOADS_DIR, decodedPath)
      
      await fs.unlink(filePath)
      console.log('✅ [LOCAL] File deleted:', relativePath)
    } catch (error: any) {
      console.error('❌ [LOCAL] Delete error:', error)
      // Don't throw - file might already be deleted
    }
  }
  
  /**
   * List all files for a session
   * Path structure: users/{userId}/{sessionId}/{filename}
   */
  static async listSessionFiles(sessionId: string, userId?: string): Promise<Array<{
    url: string
    pathname: string
    size: number
    uploadedAt: Date
  }>> {
    const effectiveUserId = userId || 'dev-user-id'
    
    if (this.isProduction()) {
      return this.listFromBlob(sessionId, effectiveUserId)
    } else {
      return this.listFromLocal(sessionId, effectiveUserId)
    }
  }
  
  /**
   * List from Vercel Blob
   * Path structure: users/{userId}/{sessionId}/{filename}
   */
  private static async listFromBlob(sessionId: string, userId: string) {
    try {
      const { blobs } = await list({
        prefix: `users/${userId}/${sessionId}/`,
      })
      
      return blobs.map((blob: any) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }))
    } catch (error: any) {
      console.error('❌ [BLOB] List error:', error)
      return []
    }
  }
  
  /**
   * List from local filesystem
   * Path structure: uploads/users/{userId}/{sessionId}/{filename}
   */
  private static async listFromLocal(sessionId: string, userId: string) {
    try {
      const sessionDir = path.join(this.UPLOADS_DIR, 'users', userId, sessionId)
      const files = await fs.readdir(sessionDir)
      
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(sessionDir, filename)
          const stats = await fs.stat(filePath)
          const relativePath = `users/${userId}/${sessionId}/${filename}`
          
          return {
            url: `/api/files/${this.encodePath(relativePath)}`,
            pathname: relativePath,
            size: stats.size,
            uploadedAt: stats.mtime
          }
        })
      )
      
      return fileList
    } catch (error: any) {
      console.error('❌ [LOCAL] List error:', error)
      return []
    }
  }
  
  /**
   * Delete all files for a session
   * Path structure: users/{userId}/{sessionId}/{filename}
   */
  static async deleteSessionFiles(sessionId: string, userId?: string): Promise<void> {
    const effectiveUserId = userId || 'dev-user-id'
    const files = await this.listSessionFiles(sessionId, effectiveUserId)
    
    await Promise.all(
      files.map(file => this.deleteFile(file.url))
    )
    
    console.log(`✅ Deleted ${files.length} files for session ${sessionId}`)
    
    // If local, also remove the directory
    if (!this.isProduction()) {
      try {
        const sessionDir = path.join(this.UPLOADS_DIR, 'users', effectiveUserId, sessionId)
        await fs.rmdir(sessionDir)
      } catch (error) {
        // Directory might not be empty or already deleted
      }
    }
  }
  
  /**
   * Get file URL (for serving files)
   * Path structure: users/{userId}/{sessionId}/{filename}
   * OR: {sessionId}/{filename} if sessionId already contains full path
   */
  static getFileUrl(sessionId: string, filename: string, userId?: string): string {
    const effectiveUserId = userId || 'dev-user-id'
    
    // Check if sessionId already contains the full path (e.g., "users/{userId}/logos")
    if (sessionId.startsWith('users/')) {
      // sessionId already contains full path - use it directly
      if (this.isProduction()) {
        // In production, files are served directly from Blob storage
        // The actual URL will be in the database
        return `https://blob.vercel-storage.com/${sessionId}/${filename}`
      } else {
        // In development, files are served via our API route
        return `/api/files/${this.encodePath(`${sessionId}/${filename}`)}`
      }
    } else {
      // Regular sessionId - use users/{userId}/{sessionId} structure
      if (this.isProduction()) {
        // In production, files are served directly from Blob storage
        // The actual URL will be in the database
        return `https://blob.vercel-storage.com/users/${effectiveUserId}/${sessionId}/${filename}`
      } else {
        // In development, files are served via our API route
        return `/api/files/${this.encodePath(`users/${effectiveUserId}/${sessionId}/${filename}`)}`
      }
    }
  }
  
  /**
   * Get file path on disk (for local development only)
   * Returns the full path where the file is stored on the filesystem
   */
  static getFilePath(sessionId: string, filename: string, userId?: string): string {
    const effectiveUserId = userId || 'dev-user-id'
    const projectRoot = path.resolve(process.cwd())
    
    // Check if sessionId already contains the full path (e.g., "users/{userId}/logos")
    if (sessionId.startsWith('users/')) {
      // sessionId already contains full path - use it directly
      return path.join(projectRoot, 'uploads', sessionId, filename)
    } else {
      // Regular sessionId - use users/{userId}/{sessionId} structure
      return path.join(projectRoot, 'uploads', 'users', effectiveUserId, sessionId, filename)
    }
  }
  
  /**
   * Get file as Buffer (for reading files)
   * Works for both Vercel (Blob) and local (filesystem)
   */
  static async getFile(sessionId: string, filename: string, userId?: string): Promise<Buffer> {
    if (this.isProduction()) {
      // In production, fetch from Blob storage via HTTP
      const url = this.getFileUrl(sessionId, filename, userId)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file from Blob storage: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } else {
      // In local development, read from filesystem
      const filePath = this.getFilePath(sessionId, filename, userId)
      return await fs.readFile(filePath)
    }
  }
  
  /**
   * Check if file exists
   * Works for both Vercel (Blob) and local (filesystem)
   */
  static async fileExists(sessionId: string, filename: string, userId?: string): Promise<boolean> {
    try {
      if (this.isProduction()) {
        // In production, check via HTTP HEAD request
        const url = this.getFileUrl(sessionId, filename, userId)
        const response = await fetch(url, { method: 'HEAD' })
        return response.ok
      } else {
        // In local development, check filesystem
        const filePath = this.getFilePath(sessionId, filename, userId)
        try {
          await fs.access(filePath)
          return true
        } catch {
          return false
        }
      }
    } catch {
      return false
    }
  }
}

