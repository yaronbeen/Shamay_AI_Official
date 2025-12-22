import { NextRequest, NextResponse } from 'next/server'
const { db, ShumaDB } = require('@/lib/shumadb.js')
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FileStorageService } from '@/lib/file-storage'

const SETTINGS_PATH = (userId: string) => `users/${userId}/settings.json`

/**
 * POST /api/user/logo
 * Uploads user logo (company logo, footer logo, or signature)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

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

    console.log(`📸 Uploading ${logoType} for user ${userId}: ${file.name} (${file.size} bytes)`)

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

    // Update user settings in database
    const client = await db.client()
    
    try {
      // First, try to find user by email (more reliable than ID)
      const userEmail = session.user.email || 'dev@example.com'
      let userResult = await client.query(
        `SELECT id, email, name, settings FROM users WHERE email = $1`,
        [userEmail]
      )
      
      // If not found by email, try by ID
      if (userResult.rows.length === 0) {
        userResult = await client.query(
          `SELECT id, email, name, settings FROM users WHERE id = $1`,
          [userId]
        )
      }
      
      // If user doesn't exist, create it (for dev mode)
      if (userResult.rows.length === 0) {
        console.log(`📝 Creating new user: ${userId}`)
        try {
          await client.query(
            `INSERT INTO users (id, email, name, settings, created_at, updated_at)
             VALUES ($1, $2, $3, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, userEmail, session.user.name || 'Development User']
          )
          
          // Fetch the newly created user
          userResult = await client.query(
            `SELECT id, email, name, settings FROM users WHERE id = $1`,
            [userId]
          )
        } catch (insertError: any) {
          // If insert fails due to conflict (email or id), fetch the existing user
          if (insertError.code === '23505') {
            console.log(`📝 Insert conflict (${insertError.constraint}), fetching existing user`)
            userResult = await client.query(
              `SELECT id, email, name, settings FROM users WHERE email = $1 OR id = $2`,
              [userEmail, userId]
            )
          } else {
            throw insertError
          }
        }
        
        if (userResult.rows.length === 0) {
          return NextResponse.json({ error: 'Failed to create or find user' }, { status: 500 })
        }
      }
      
      // Use the actual user ID from the database (may differ from session.user.id)
      const actualUserId = userResult.rows[0].id
      console.log(`📝 Using user ID: ${actualUserId} (session had: ${userId})`)
      
      const currentSettings = typeof userResult.rows[0].settings === 'string'
        ? JSON.parse(userResult.rows[0].settings)
        : (userResult.rows[0].settings || {})

      let snapshotSettings = currentSettings
      try {
        const stored = await FileStorageService.loadJson(SETTINGS_PATH(actualUserId))
        if (stored) {
          snapshotSettings = { ...snapshotSettings, ...stored }
        }
      } catch (snapshotError) {
        console.warn('⚠️ Failed to load existing settings snapshot:', snapshotError)
      }

      // Update the specific field based on logoType
      let updatedSettings = { ...snapshotSettings }
      
      if (logoType === 'company') {
        updatedSettings.companyLogo = logoUrl
      } else if (logoType === 'footer') {
        updatedSettings.footerLogo = logoUrl
      } else if (logoType === 'signature') {
        updatedSettings.signature = logoUrl
      }
      
      let dbUpdated = false
      try {
        await client.query(
          `UPDATE users 
           SET settings = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2
           RETURNING id, email, name, settings, updated_at`,
          [JSON.stringify(updatedSettings), actualUserId]
        )
        dbUpdated = true
        console.log(`✅ User ${logoType} updated in database with URL: ${logoUrl}`)
      } catch (dbError) {
        console.warn('⚠️ DB update failed for logo upload:', dbError)
      }

      try {
        await FileStorageService.saveJson(SETTINGS_PATH(actualUserId), updatedSettings)
      } catch (snapshotError) {
        console.warn('⚠️ Failed to persist logo snapshot:', snapshotError)
      }

      return NextResponse.json({
        success: true,
        logo_url: logoUrl,
        logo_type: logoType,
        warning: dbUpdated ? undefined : 'Logo saved via fallback storage; database update failed.'
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

