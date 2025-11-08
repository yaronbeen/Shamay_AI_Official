import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  console.log(`🚀 [FILES] ROUTE HIT! URL: ${request.url}`)
  
  try {
    const resolvedParams = await params
    const { path } = resolvedParams
    console.log(`🚀 [FILES] Path array:`, path)
    
    if (!path || path.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    
    // Decode URL-encoded path segments
    const decodedPath = path.map(p => decodeURIComponent(p))
    const filename = decodedPath[decodedPath.length - 1]
    
    console.log(`📁 [FILES] Decoded path:`, decodedPath.join('/'))
    console.log(`📁 [FILES] Filename:`, filename)
    
    // Build file path: frontend/uploads/{path}
    const filePath = join(process.cwd(), 'uploads', ...decodedPath)
    
    console.log(`📁 [FILES] Looking for file: ${filePath}`)
    console.log(`📁 [FILES] File exists: ${existsSync(filePath)}`)
    
    if (!existsSync(filePath)) {
      console.error(`❌ [FILES] File not found: ${filePath}`)
      return NextResponse.json({ 
        error: 'File not found',
        message: `Could not find file: ${filename}`,
        path: filePath
      }, { status: 404 })
    }
    
    // Security check
    const uploadsDir = join(process.cwd(), 'uploads')
    if (!filePath.startsWith(uploadsDir)) {
      console.error(`❌ [FILES] Security violation: ${filePath}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get file stats
    const stats = await stat(filePath)
    
    // Read file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type
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
        'Cache-Control': 'public, max-age=3600',
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

