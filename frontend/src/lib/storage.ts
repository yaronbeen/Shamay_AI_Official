import crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// For local development - simple file storage
export async function generateLocalPresignedUrl(storageKey: string, mimeType: string) {
  const uploadUrl = `/api/upload/${storageKey}`
  return {
    url: uploadUrl,
    fields: {},
    storageKey
  }
}

export async function saveFileLocally(file: Buffer, storageKey: string) {
  const uploadsDir = join(process.cwd(), 'uploads')
  const filePath = join(uploadsDir, storageKey)
  
  // Create directory if it doesn't exist
  await mkdir(join(uploadsDir, storageKey.split('/').slice(0, -1).join('/')), { recursive: true })
  
  // Save file
  await writeFile(filePath, file)
  
  return filePath
}

export function calculateSHA256(file: Buffer): string {
  return crypto.createHash('sha256').update(file).digest('hex')
}

// For production - S3 storage
export async function generatePresignedUrl(storageKey: string, mimeType: string) {
  // In production, this would use AWS S3
  // For now, use local storage
  return generateLocalPresignedUrl(storageKey, mimeType)
}

export async function generateDownloadUrl(storageKey: string) {
  // In production, this would generate S3 presigned URLs
  // For now, return local file URL
  return `/api/files/${storageKey}`
}
