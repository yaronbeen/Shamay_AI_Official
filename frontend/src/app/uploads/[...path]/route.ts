import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = join(process.cwd(), 'uploads', ...params.path)
    
    // Security check - ensure the path is within uploads directory
    const uploadsDir = join(process.cwd(), 'uploads')
    const resolvedPath = join(process.cwd(), 'uploads', ...params.path)
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    const fileBuffer = await readFile(filePath)
    const contentType = filePath.endsWith('.png') ? 'image/png' : 
                      filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg' :
                      'application/octet-stream'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
    
  } catch (error) {
    console.error('❌ Error serving uploaded file:', error)
    return NextResponse.json({ 
      error: 'Failed to serve file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
