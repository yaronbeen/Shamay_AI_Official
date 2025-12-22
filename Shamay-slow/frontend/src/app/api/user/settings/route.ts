import { NextRequest, NextResponse } from 'next/server'
const { db, ShumaDB } = require('../../../../lib/shumadb.js') 
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FileStorageService } from '@/lib/file-storage'

const SETTINGS_PATH = (userId: string) => `users/${userId}/settings.json`

const DEFAULT_SETTINGS = {
  companyLogo: undefined,
  footerLogo: undefined,
  companyName: undefined,
  companySlogan: undefined,
  companyAddress: undefined,
  companyPhone: undefined,
  companyEmail: undefined,
  companyWebsite: undefined,
  associationMembership: 'חבר בלשכת שמאי המקרקעין בישראל',
  services: undefined,
  signature: undefined
}

async function loadSnapshotForIds(ids: string[]): Promise<{ settings: any; sourceId: string | null }> {
  for (const id of ids) {
    try {
      const stored = await FileStorageService.loadJson(SETTINGS_PATH(id))
      if (stored) {
        return { settings: { ...DEFAULT_SETTINGS, ...stored }, sourceId: id }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load settings snapshot for ${id}:`, error)
    }
  }
  return { settings: { ...DEFAULT_SETTINGS }, sourceId: null }
}

async function persistSnapshotForIds(ids: string[], data: any) {
  for (const id of new Set(ids)) {
    try {
      await FileStorageService.saveJson(SETTINGS_PATH(id), data)
    } catch (error) {
      console.warn(`⚠️ Failed to persist settings snapshot for ${id}:`, error)
    }
  }
}

/**
 * GET /api/user/settings
 * Returns current user's settings including logos, signature, and company info
 */
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
  const userEmail = session.user.email || 'dev@example.com'
    console.log(`📋 Fetching user settings for: ${userId}`)

  const candidateIdSet = new Set<string>([userId])

  try {
    let userSettings = await ShumaDB.getUserSettings(userId, userEmail)
    
    if (!userSettings) {
      const { settings: initialFallback } = await loadSnapshotForIds(Array.from(candidateIdSet))
      let fallbackSettings = initialFallback
      if (Object.keys(fallbackSettings).some((key) => (fallbackSettings as any)[key] !== DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS])) {
        console.log('📦 Loaded settings snapshot from storage fallback')
      }
      await persistSnapshotForIds(Array.from(candidateIdSet), fallbackSettings)
      return NextResponse.json(fallbackSettings)
    }

    candidateIdSet.add(userSettings.id)
    const { settings: updatedFallback } = await loadSnapshotForIds(Array.from(candidateIdSet))
    let fallbackSettings = updatedFallback
    if (Object.keys(fallbackSettings).some((key) => (fallbackSettings as any)[key] !== DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS])) {
      console.log('📦 Loaded settings snapshot from storage fallback')
    }

    const companySettings = {
      companyLogo: userSettings.settings?.companyLogo || fallbackSettings.companyLogo || undefined,
      footerLogo: userSettings.settings?.footerLogo || fallbackSettings.footerLogo || undefined,
      companyName: userSettings.settings?.companyName || userSettings.name || fallbackSettings.companyName || undefined,
      companySlogan: userSettings.settings?.companySlogan || fallbackSettings.companySlogan || undefined,
      companyAddress: userSettings.settings?.companyAddress || fallbackSettings.companyAddress || undefined,
      companyPhone: userSettings.settings?.companyPhone || fallbackSettings.companyPhone || undefined,
      companyEmail: userSettings.settings?.companyEmail || userSettings.email || fallbackSettings.companyEmail || undefined,
      companyWebsite: userSettings.settings?.companyWebsite || fallbackSettings.companyWebsite || undefined,
      associationMembership: userSettings.settings?.associationMembership || fallbackSettings.associationMembership || DEFAULT_SETTINGS.associationMembership,
      services: userSettings.settings?.services || fallbackSettings.services || undefined,
      signature: userSettings.settings?.signature || fallbackSettings.signature || undefined
    }

    await persistSnapshotForIds(Array.from(candidateIdSet), companySettings)

    console.log(`✅ User settings loaded for: ${userId}`)
    return NextResponse.json(companySettings)
  } catch (error) {
    console.error('❌ Error fetching user settings:', error)
    const { settings: fallbackSettings } = await loadSnapshotForIds(Array.from(candidateIdSet))
    await persistSnapshotForIds(Array.from(candidateIdSet), fallbackSettings)
    return NextResponse.json(fallbackSettings)
  }
}

/**
 * PUT /api/user/settings
 * Updates current user's settings
 */
export async function PUT(request: NextRequest) {
  let snapshotSettings = { ...DEFAULT_SETTINGS }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { settings } = body

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 })
    }

    snapshotSettings = { ...DEFAULT_SETTINGS, ...settings }

    const client = await db.client()
    let updatedSettings = { ...settings }
    let actualUserId = userId
    let dbSuccess = false
    const candidateIdSet = new Set<string>([userId])
    
    try {
      // First try to find user by email (more reliable than ID)
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
      
      if (userResult.rows.length === 0) {
        console.warn(`⚠️ No user record found for ${userId}; aborting update.`)
        return NextResponse.json({
          error: 'User record not found. Sign up first before saving settings.',
          success: false
        }, { status: 404 })
      }
      
      // Use the actual user ID from the database (may differ from session.user.id)
      actualUserId = userResult.rows[0].id
      
      const currentSettings = typeof userResult.rows[0].settings === 'string'
        ? JSON.parse(userResult.rows[0].settings)
        : (userResult.rows[0].settings || {})
      
      candidateIdSet.add(actualUserId)
      const { settings: baseSettings } = await loadSnapshotForIds(Array.from(candidateIdSet))
      
      snapshotSettings = { ...DEFAULT_SETTINGS, ...settings }
      updatedSettings = { ...DEFAULT_SETTINGS, ...baseSettings, ...currentSettings, ...settings }
      snapshotSettings = updatedSettings
      
      // Update user settings using the actual user ID
      await client.query(
        `UPDATE users 
         SET settings = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2
         RETURNING id, email, name, settings, updated_at`,
        [JSON.stringify(updatedSettings), actualUserId]
      )

      dbSuccess = true
      console.log(`✅ User settings updated for: ${userId}`)
    } finally {
      client.release()
    }

    await persistSnapshotForIds(Array.from(candidateIdSet), updatedSettings)

    if (!dbSuccess) {
      return NextResponse.json({
        success: true,
        settings: updatedSettings,
        warning: 'DB update failed; settings stored using fallback storage.'
      })
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings
    })
  } catch (error) {
    console.error('❌ Error updating user settings:', error)
    const session = await getServerSession(authOptions)
    const fallbackUserId = session?.user?.id
    if (fallbackUserId) {
      const { settings: existingSnapshot } = await loadSnapshotForIds([fallbackUserId])
      const fallbackSettings = { ...DEFAULT_SETTINGS, ...existingSnapshot, ...snapshotSettings }
      await persistSnapshotForIds([fallbackUserId], fallbackSettings)
      return NextResponse.json({
        success: true,
        settings: fallbackSettings,
        warning: 'Settings saved via storage fallback due to database error.'
      })
    }
    return NextResponse.json({
      error: 'Failed to update user settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

