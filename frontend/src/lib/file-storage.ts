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
  
  /**
   * Check if we're running in production (Vercel)
   */
  static isProduction(): boolean {
    return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
  }
  
  /**
   * Upload a file - automatically uses Blob in production, filesystem in dev
   */
  static async uploadFile(
    file: Buffer | Blob,
    sessionId: string,
    filename: string,
    mimeType?: string
  ): Promise<{ url: string; path: string; size: number }> {
    if (this.isProduction()) {
      return this.uploadToBlob(file, sessionId, filename)
    } else {
      return this.uploadToLocal(file as Buffer, sessionId, filename, mimeType)
    }
  }
  
  /**
   * Upload to Vercel Blob (Production)
   */
  private static async uploadToBlob(
    file: Buffer | Blob,
    sessionId: string,
    filename: string
  ): Promise<{ url: string; path: string; size: number }> {
    try {
      console.log('🔍 [BLOB] Uploading file:', {
        sessionId,
        filename,
        fileSize: file instanceof Buffer ? file.length : (file as any).size,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      })
      
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn('⚠️ [BLOB] No BLOB_READ_WRITE_TOKEN found! Upload may fail.')
      }
      
      const pathname = `${sessionId}/${filename}`
      
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
   */
  private static async uploadToLocal(
    file: Buffer,
    sessionId: string,
    filename: string,
    mimeType?: string
  ): Promise<{ url: string; path: string; size: number }> {
    try {
      // Use frontend/uploads directory for local dev
      const projectRoot = path.resolve(process.cwd())
      const uploadsDir = path.join(projectRoot, 'uploads', sessionId)
      
      // Create session directory if it doesn't exist
      await fs.mkdir(uploadsDir, { recursive: true })
      
      // Handle nested paths (e.g., "images/filename.jpg")
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
      const relativePath = `${sessionId}/${filename}`
      
      console.log('✅ [LOCAL] File uploaded:', relativePath)
      
      return {
        url: `/api/files/${relativePath}`,
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
   */
  private static async deleteFromLocal(relativePath: string): Promise<void> {
    try {
      // Remove leading slash and /api/files/ prefix if present
      const cleanPath = relativePath.replace(/^\/api\/files\//, '').replace(/^\//, '')
      const filePath = path.join(this.UPLOADS_DIR, cleanPath)
      
      await fs.unlink(filePath)
      console.log('✅ [LOCAL] File deleted:', relativePath)
    } catch (error: any) {
      console.error('❌ [LOCAL] Delete error:', error)
      // Don't throw - file might already be deleted
    }
  }
  
  /**
   * List all files for a session
   */
  static async listSessionFiles(sessionId: string): Promise<Array<{
    url: string
    pathname: string
    size: number
    uploadedAt: Date
  }>> {
    if (this.isProduction()) {
      return this.listFromBlob(sessionId)
    } else {
      return this.listFromLocal(sessionId)
    }
  }
  
  /**
   * List from Vercel Blob
   */
  private static async listFromBlob(sessionId: string) {
    try {
      const { blobs } = await list({
        prefix: `${sessionId}/`,
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
   */
  private static async listFromLocal(sessionId: string) {
    try {
      const sessionDir = path.join(this.UPLOADS_DIR, sessionId)
      const files = await fs.readdir(sessionDir)
      
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(sessionDir, filename)
          const stats = await fs.stat(filePath)
          const relativePath = `${sessionId}/${filename}`
          
          return {
            url: `/api/files/${relativePath}`,
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
   */
  static async deleteSessionFiles(sessionId: string): Promise<void> {
    const files = await this.listSessionFiles(sessionId)
    
    await Promise.all(
      files.map(file => this.deleteFile(file.url))
    )
    
    console.log(`✅ Deleted ${files.length} files for session ${sessionId}`)
    
    // If local, also remove the directory
    if (!this.isProduction()) {
      try {
        const sessionDir = path.join(this.UPLOADS_DIR, sessionId)
        await fs.rmdir(sessionDir)
      } catch (error) {
        // Directory might not be empty or already deleted
      }
    }
  }
  
  /**
   * Get file URL (for serving files)
   */
  static getFileUrl(sessionId: string, filename: string): string {
    if (this.isProduction()) {
      // In production, files are served directly from Blob storage
      // The actual URL will be in the database
      return `https://blob.vercel-storage.com/${sessionId}/${filename}`
    } else {
      // In development, files are served via our API route
      return `/api/files/${sessionId}/${filename}`
    }
  }
}

