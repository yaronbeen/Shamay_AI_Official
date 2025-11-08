import { NextRequest, NextResponse } from 'next/server'
const { db, ShumaDB } = require('../../../../lib/shumadb.js') 
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/user/settings
 * Returns current user's settings including logos, signature, and company info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`📋 Fetching user settings for: ${userId}`)

    // First try to find user by email (more reliable than ID)
    const userEmail = session.user.email || 'dev@example.com'
    let userSettings = await ShumaDB.getUserSettings(userId, userEmail)
    
    // If user doesn't exist, create it (for dev mode)
    if (!userSettings) {
      console.log(`📝 Creating new user: ${userId}`)
      const client = await db.client()
      try {
        try {
          await client.query(
            `INSERT INTO users (id, email, name, settings, created_at, updated_at)
             VALUES ($1, $2, $3, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, userEmail, session.user.name || 'Development User']
          )
        } catch (insertError: any) {
          // If insert fails due to conflict, fetch the existing user
          if (insertError.code === '23505') {
            console.log(`📝 Insert conflict, fetching existing user`)
            const conflictResult = await client.query(
              `SELECT id, email, name, settings FROM users WHERE email = $1 OR id = $2`,
              [userEmail, userId]
            )
            if (conflictResult.rows.length > 0) {
              const user = conflictResult.rows[0]
              const settings = typeof user.settings === 'string' 
                ? JSON.parse(user.settings) 
                : (user.settings || {})
              userSettings = {
                id: user.id,
                name: user.name,
                email: user.email,
                settings: settings
              }
            } else {
              throw insertError
            }
          } else {
            throw insertError
          }
        }
        
        if (!userSettings) {
          // Fetch the newly created user
          userSettings = await ShumaDB.getUserSettings(userId, userEmail)
        }
        
        if (!userSettings) {
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
        }
      } finally {
        client.release()
      }
    }

    // Transform to CompanySettings format
    const companySettings = {
      companyLogo: userSettings.settings?.companyLogo || undefined,
      footerLogo: userSettings.settings?.footerLogo || undefined,
      companyName: userSettings.settings?.companyName || userSettings.name || undefined,
      companySlogan: userSettings.settings?.companySlogan || undefined,
      companyAddress: userSettings.settings?.companyAddress || undefined,
      companyPhone: userSettings.settings?.companyPhone || undefined,
      companyEmail: userSettings.settings?.companyEmail || userSettings.email || undefined,
      companyWebsite: userSettings.settings?.companyWebsite || undefined,
      associationMembership: userSettings.settings?.associationMembership || 'חבר בלשכת שמאי המקרקעין בישראל',
      services: userSettings.settings?.services || undefined,
      signature: userSettings.settings?.signature || undefined
    }

    console.log(`✅ User settings loaded for: ${userId}`)

    return NextResponse.json(companySettings)

  } catch (error) {
    console.error('❌ Error fetching user settings:', error)
    return NextResponse.json({
      error: 'Failed to fetch user settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/user/settings
 * Updates current user's settings
 */
export async function PUT(request: NextRequest) {
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

    const client = await db.client()
    
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
          // If insert fails due to conflict, fetch the existing user
          if (insertError.code === '23505') {
            console.log(`📝 Insert conflict, fetching existing user`)
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
      
      const currentSettings = typeof userResult.rows[0].settings === 'string'
        ? JSON.parse(userResult.rows[0].settings)
        : (userResult.rows[0].settings || {})
      
      // Merge new settings with existing
      const updatedSettings = { ...currentSettings, ...settings }
      
      // Update user settings using the actual user ID
      await client.query(
        `UPDATE users 
         SET settings = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2
         RETURNING id, email, name, settings, updated_at`,
        [JSON.stringify(updatedSettings), actualUserId]
      )

      console.log(`✅ User settings updated for: ${userId}`)

      return NextResponse.json({
        success: true,
        settings: updatedSettings
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error updating user settings:', error)
    return NextResponse.json({
      error: 'Failed to update user settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

