import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; path: string[] } }
) {
  try {
    const { sessionId, path } = params
    console.log(`📁 File serving request received:`, { sessionId, path })
    console.log(`📁 Process CWD: ${process.cwd()}`)
    
    // Try both relative and absolute paths
    const relativePath = join(process.cwd(), 'uploads', sessionId, ...path)
    const absolutePath = join('/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads', sessionId, ...path)
    
    console.log(`📁 Relative path: ${relativePath}`)
    console.log(`📁 Absolute path: ${absolutePath}`)
    console.log(`📁 Relative exists: ${existsSync(relativePath)}`)
    console.log(`📁 Absolute exists: ${existsSync(absolutePath)}`)
    
    const filePath = existsSync(absolutePath) ? absolutePath : relativePath
    
    // Security check - ensure the file is within the uploads directory
    const uploadsDir = join(process.cwd(), 'uploads', sessionId)
    const resolvedPath = filePath
    
    console.log(`📁 Serving file request:`)
    console.log(`  - Session ID: ${sessionId}`)
    console.log(`  - Path array: ${JSON.stringify(path)}`)
    console.log(`  - Constructed path: ${filePath}`)
    console.log(`  - Process CWD: ${process.cwd()}`)
    console.log(`  - File exists: ${existsSync(resolvedPath)}`)
    console.log(`  - Resolved path: ${resolvedPath}`)
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.error(`❌ Security violation: ${resolvedPath} is outside uploads directory`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Check if file exists
    if (!existsSync(resolvedPath)) {
      console.error(`❌ File not found: ${resolvedPath}`)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Get file stats
    const stats = await stat(resolvedPath)
    
    // Read file
    const fileBuffer = await readFile(resolvedPath)
    
    // Determine content type based on file extension
    const extension = path[path.length - 1].split('.').pop()?.toLowerCase()
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
    
    console.log(`✅ Serving file: ${resolvedPath} (${stats.size} bytes, ${contentType})`)
    
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
