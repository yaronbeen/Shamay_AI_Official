import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { presignUploadSchema } from '@/lib/validations'
import { generatePresignedUrl } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, mime, scope, valuationId } = presignUploadSchema.parse(body)

    // Generate storage key
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const extension = fileName.split('.').pop()
    const storageKey = `organizations/${session.user.primaryOrganizationId}/${
      scope === 'valuation' ? `valuations/${valuationId}/uploads` : 'uploads'
    }/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${timestamp}-${randomId}.${extension}`

    // Generate presigned URL
    const { url, fields } = await generatePresignedUrl(storageKey, mime)

    return NextResponse.json({
      url,
      fields,
      storageKey,
      sha256: null // Will be calculated after upload
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
