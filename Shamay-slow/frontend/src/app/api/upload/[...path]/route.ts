import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveFileLocally, calculateSHA256 } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storageKey = params.path.join('/')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const sha256 = calculateSHA256(buffer)
    
    // Save file locally
    const filePath = await saveFileLocally(buffer, storageKey)
    
    return NextResponse.json({ 
      success: true, 
      sha256,
      filePath 
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
