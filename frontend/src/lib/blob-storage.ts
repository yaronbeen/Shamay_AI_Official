/**
 * Vercel Blob Storage utility for file uploads
 * Replaces local file system storage with Vercel Blob
 */

import { put, del, list } from '@vercel/blob'

export class BlobStorageService {
  /**
   * Upload a file to Vercel Blob
   * @param file - File buffer or Blob
   * @param sessionId - Session ID for organizing files
   * @param filename - Original filename
   * @returns Blob URL
   */
  static async uploadFile(
    file: Buffer | Blob,
    sessionId: string,
    filename: string
  ): Promise<{ url: string; pathname: string }> {
    try {
      // Create a path that mimics our current structure
      const pathname = `${sessionId}/${filename}`
      
      const blob = await put(pathname, file, {
        access: 'public', // Files are publicly accessible via URL
        addRandomSuffix: false, // Keep original filename
      })
      
      console.log('✅ File uploaded to Blob:', blob.url)
      
      return {
        url: blob.url,
        pathname: blob.pathname
      }
    } catch (error) {
      console.error('❌ Error uploading to Blob:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }
  
  /**
   * Delete a file from Vercel Blob
   * @param url - Blob URL to delete
   */
  static async deleteFile(url: string): Promise<void> {
    try {
      await del(url)
      console.log('✅ File deleted from Blob:', url)
    } catch (error) {
      console.error('❌ Error deleting from Blob:', error)
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }
  
  /**
   * List all files for a session
   * @param sessionId - Session ID
   * @returns Array of blob objects
   */
  static async listSessionFiles(sessionId: string) {
    try {
      const { blobs } = await list({
        prefix: `${sessionId}/`,
      })
      
      return blobs
    } catch (error) {
      console.error('❌ Error listing Blob files:', error)
      throw new Error(`Failed to list files: ${error.message}`)
    }
  }
  
  /**
   * Delete all files for a session
   * @param sessionId - Session ID
   */
  static async deleteSessionFiles(sessionId: string): Promise<void> {
    try {
      const blobs = await this.listSessionFiles(sessionId)
      
      await Promise.all(
        blobs.map(blob => this.deleteFile(blob.url))
      )
      
      console.log(`✅ Deleted ${blobs.length} files for session ${sessionId}`)
    } catch (error) {
      console.error('❌ Error deleting session files:', error)
      throw new Error(`Failed to delete session files: ${error.message}`)
    }
  }
  
  /**
   * Check if we're in production (Vercel) or development (local)
   */
  static isProduction(): boolean {
    return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
  }
}

