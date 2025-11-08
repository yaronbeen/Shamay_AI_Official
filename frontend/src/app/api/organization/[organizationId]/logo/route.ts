import { NextRequest, NextResponse } from 'next/server'
import { FileStorageService } from '../../../../../lib/file-storage'
const { db, ShumaDB } = require('@/lib/shumadb.js')
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/organization/:organizationId/logo
 * Uploads organization logo (company logo, footer logo, or signature)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { organizationId } = params

    const formData = await request.formData()
    const file = formData.get('file') as File
    const logoType = formData.get('type') as string || 'company' // 'company', 'footer', or 'signature'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type for images
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    console.log(`📸 Uploading ${logoType} for organization ${organizationId}: ${file.name} (${file.size} bytes)`)

    // Upload file using unified storage service
    // Works for both Vercel (Blob) and local (filesystem)
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await FileStorageService.uploadFile(
      buffer,
      `users/${userId}/logos`,
      `${logoType}-${Date.now()}-${file.name}`,
      file.type
    )

    console.log(`✅ Logo uploaded:`, uploadResult)

    // Get the URL to store in database
    // FileStorageService handles both Vercel and local automatically:
    // - Vercel Blob: uploadResult.url is the public Blob URL (e.g., https://xxx.public.blob.vercel-storage.com/...)
    // - Local: uploadResult.url is already formatted as /api/files/{path} for serving via /api/files route
    // Both work correctly - just use the URL as-is
    const logoUrl = uploadResult.url
    
    console.log(`📝 Environment: ${FileStorageService.isProduction() ? 'Vercel (Blob)' : 'Local (Filesystem)'}`)
    console.log(`📝 Logo URL to store: ${logoUrl}`)

    // Update user settings in database (settings are now per-user)
    const client = await db.client()
    
    try {
      // Get current user settings
      const userResult = await client.query(
        `SELECT settings FROM users WHERE id = $1`,
        [userId]
      )
      
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      const currentSettings = typeof userResult.rows[0].settings === 'string'
        ? JSON.parse(userResult.rows[0].settings)
        : (userResult.rows[0].settings || {})
      
      // Update the specific field based on logoType
      let updatedSettings = { ...currentSettings }
      
      if (logoType === 'company') {
        updatedSettings.companyLogo = logoUrl
      } else if (logoType === 'footer') {
        updatedSettings.footerLogo = logoUrl
      } else if (logoType === 'signature') {
        updatedSettings.signature = logoUrl
      }
      
      // Update user settings in database
      await client.query(
        `UPDATE users 
         SET settings = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [JSON.stringify(updatedSettings), userId]
      )

      console.log(`✅ User ${logoType} updated in database with URL: ${logoUrl}`)

      return NextResponse.json({
        success: true,
        logo_url: logoUrl,
        logo_type: logoType
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error uploading logo:', error)
    return NextResponse.json({
      error: 'Failed to upload logo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

