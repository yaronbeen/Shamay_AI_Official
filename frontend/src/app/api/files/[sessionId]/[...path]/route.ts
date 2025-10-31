import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; path: string[] } }
) {
  try {
    const { sessionId, path } = params
    const filename = path[path.length - 1]
    
    console.log(`📁 [FILES] Serving request:`, { sessionId, path: path.join('/') })
    
    // Check if we're in Vercel production
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    
    // NOTE: In Vercel production, files stored as Blob URLs are served directly by Vercel Blob storage
    // (no proxy needed - Blob URLs are public and can be used directly in the frontend)
    // This route is only used for local development files stored in /frontend/uploads
    
    // Local development: Read from /frontend/uploads
    const projectRoot = resolve(process.cwd())
    const possiblePaths = [
      join(projectRoot, 'frontend', 'uploads', sessionId, ...path), // frontend/uploads (correct location)
      join(projectRoot, 'uploads', sessionId, ...path), // root/uploads (fallback)
      join(process.cwd(), 'uploads', sessionId, ...path), // relative to CWD
    ]
    
    let filePath: string | null = null
    
    for (const testPath of possiblePaths) {
      if (existsSync(testPath)) {
        filePath = testPath
        console.log(`✅ [FILES] [LOCAL] Found file at: ${filePath}`)
        break
      }
    }
    
    if (!filePath) {
      console.error(`❌ [FILES] File not found in any location:`, possiblePaths)
      return NextResponse.json({ 
        error: 'File not found',
        message: `Could not find file: ${filename}`,
        note: isProduction ? 'In production, ensure the file URL is stored correctly in the database' : 'Local file not found'
      }, { status: 404 })
    }
    
    // Security check - ensure the file is within an uploads directory
    const isInUploads = possiblePaths.some(uploadsPath => filePath!.startsWith(uploadsPath.split(sessionId)[0]))
    if (!isInUploads) {
      console.error(`❌ [FILES] Security violation: ${filePath} is outside uploads directory`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get file stats
    const stats = await stat(filePath)
    
    // Read file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on file extension
    const extension = filename.split('.').pop()?.toLowerCase()
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
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
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
