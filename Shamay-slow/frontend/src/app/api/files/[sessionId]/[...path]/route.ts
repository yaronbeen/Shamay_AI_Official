import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { FileStorageService } from '@/lib/file-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; path: string[] }> }
) {
  console.log(`🚀 [FILES] ROUTE HIT! URL: ${request.url}`)
  
  try {
    const resolvedParams = await params
    console.log(`🚀 [FILES] Params:`, resolvedParams)
    const { sessionId, path } = resolvedParams
    console.log(`🚀 [FILES] sessionId: ${sessionId}, path:`, path)
    
    if (!sessionId || !path || path.length === 0) {
      console.error(`❌ [FILES] Invalid params: sessionId=${sessionId}, path=${path}`)
      return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 })
    }
    
    const filename = path[path.length - 1]
    
    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename)
    const decodedPath = path.map(p => decodeURIComponent(p))
    
    console.log(`📁 [FILES] Serving request:`, { sessionId, path: decodedPath.join('/') })
    
    // Check if we're in Vercel production
    // NOTE: In Vercel production, files stored as Blob URLs are served directly by Vercel Blob storage
    // (no proxy needed - Blob URLs are public and can be used directly in the frontend)
    // This route is only used for local development files stored in /frontend/uploads
    
    // Local development: Read from /frontend/uploads
    // The URL structure for new storage: /api/files/users/{userId}/{sessionId}/{filename}
    // So: sessionId = "users", path = [userId, sessionId, ...filename]
    // Or for old storage: /api/files/{sessionId}/{filename}
    // So: sessionId = sessionId, path = [filename]
    
    // ALL FILES ARE LOCALLY AT: /Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/dev-user-id/
    // For logos: /Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/dev-user-id/logos/
    // For session files: /Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/dev-user-id/{sessionId}/
    
    const cwd = process.cwd()
    const isInFrontend = cwd.endsWith('frontend')
    const baseUploadsPath = isInFrontend 
      ? join(cwd, 'uploads')  // frontend/uploads
      : join(cwd, 'frontend', 'uploads')  // ../frontend/uploads
    
    let fullPath: string[]
    if (sessionId === 'users') {
      // New structure: users/{userId}/{sessionId or logos}/{filename}
      // Example: /api/files/users/dev-user-id/logos/company-xxx.png
      // Example: /api/files/users/dev-user-id/{sessionId}/filename.png
      fullPath = [sessionId, ...decodedPath]
    } else {
      // Old structure: {sessionId}/{filename} - migrate to users/dev-user-id/{sessionId}/{filename}
      fullPath = [sessionId, ...decodedPath]
    }
    
    // Build the full file path
    const relativeFilePath = join(baseUploadsPath, ...fullPath)
    
    // Also try absolute path as fallback
    const absolutePath = '/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/' + fullPath.join('/')
    
    const possiblePaths = [
      relativeFilePath,
      absolutePath,
      // Legacy paths for backward compatibility
      join(cwd, 'uploads', ...fullPath),
      join(cwd, '..', 'frontend', 'uploads', ...fullPath),
      // New structure fallback (assume default dev user when not provided)
      join(baseUploadsPath, 'users', process.env.DEV_UPLOAD_USER_ID || 'dev-user-id', sessionId, ...decodedPath),
      join(cwd, '..', 'frontend', 'uploads', 'users', process.env.DEV_UPLOAD_USER_ID || 'dev-user-id', sessionId, ...decodedPath),
    ]
    
    console.log(`📁 [FILES] Request: ${request.url}`)
    console.log(`📁 [FILES] sessionId: ${sessionId}, path: ${decodedPath.join('/')}`)
    console.log(`📁 [FILES] Full path: ${fullPath.join('/')}`)
    console.log(`📁 [FILES] Checking ${possiblePaths.length} possible paths:`)
    possiblePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))
    
    let filePath: string | null = null
    for (const possiblePath of possiblePaths) {
      console.log(`📁 [FILES] Trying: ${possiblePath}`)
      if (existsSync(possiblePath)) {
        filePath = possiblePath
        console.log(`✅ [FILES] Found file at: ${filePath}`)
        break
      }
    }
    
    if (!filePath) {
      console.error(`❌ [FILES] File not found in any location`)
      console.error(`   Request URL: ${request.url}`)
      console.error(`   sessionId: ${sessionId}`)
      console.error(`   path: ${decodedPath.join('/')}`)
      console.error(`   filename: ${decodedFilename}`)
      console.error(`   Tried ${possiblePaths.length} paths:`)
      possiblePaths.forEach((p, i) => {
        console.error(`   ${i + 1}. ${p} (exists: ${existsSync(p)})`)
      })
      
      return NextResponse.json({ 
        error: 'File not found',
        message: `Could not find file: ${decodedFilename}`,
        sessionId,
        requestedPath: decodedPath.join('/'),
        triedPaths: possiblePaths.map(p => p.replace(process.cwd(), '[CWD]'))
      }, { status: 404 })
    }
    
    // Security check - ensure the file is within an uploads directory
    const projectRoot = isInFrontend ? join(cwd, '..') : cwd
    const uploadsDir = join(projectRoot, 'uploads')
    const frontendUploadsDir = join(projectRoot, 'frontend', 'uploads')
    const cwdUploadsDir = join(cwd, 'uploads')
    
    if (!filePath.startsWith(uploadsDir) && 
        !filePath.startsWith(frontendUploadsDir) && 
        !filePath.startsWith(cwdUploadsDir)) {
      console.error(`❌ [FILES] Security violation: ${filePath} is outside uploads directory`)
      console.error(`   Allowed paths: ${uploadsDir}, ${frontendUploadsDir}, ${cwdUploadsDir}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get file stats
    const stats = await stat(filePath)
    
    // Read file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on file extension (use decoded filename)
    const extension = decodedFilename.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'txt':
        contentType = 'text/plain'
        break
      case 'json':
        contentType = 'application/json'
        break
    }
    
    console.log(`✅ [FILES] Serving file: ${filePath} (${stats.size} bytes, ${contentType})`)
    
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        // Use ETag for cache validation instead of max-age
        'Cache-Control': 'public, must-revalidate, max-age=0',
        'ETag': `"${stats.mtime.getTime()}-${stats.size}"`, // ETag based on modification time and size
        'Last-Modified': stats.mtime.toUTCString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
    
  } catch (error) {
    console.error('❌ File serving error:', error)
    return NextResponse.json({ 
      error: 'Failed to serve file', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; path: string[] }> }
) {
  try {
    const resolvedParams = await params
    const { sessionId, path } = resolvedParams
    const decodedPath = path.map(p => decodeURIComponent(p))

    // Reconstruct the same URL format used by FileStorageService
    let targetPath: string
    if (sessionId === 'users') {
      targetPath = ['users', ...decodedPath].join('/')
    } else {
      const defaultUser = process.env.DEV_UPLOAD_USER_ID || 'dev-user-id'
      targetPath = ['users', defaultUser, sessionId, ...decodedPath].join('/')
    }

    const url = `/api/files/${targetPath}`

    await FileStorageService.deleteFile(url)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('❌ [FILES] Delete error:', error)
    return NextResponse.json({
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
