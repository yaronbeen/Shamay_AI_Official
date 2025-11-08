import { NextRequest, NextResponse } from 'next/server'
const { db, ShumaDB } = require('@/lib/shumadb.js')
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/organization/:organizationId
 * Returns organization details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params
    const orgSettings = await ShumaDB.getOrganizationSettings(organizationId)
    
    if (!orgSettings) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json(orgSettings)
  } catch (error) {
    console.error('❌ Error fetching organization:', error)
    return NextResponse.json({
      error: 'Failed to fetch organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/organization/:organizationId
 * Updates organization settings (logo_url and settings JSONB)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.primaryOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user can update this organization
    const { organizationId } = params
    if (session.user.primaryOrganizationId !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { logo_url, settings } = body

    const client = await db.client()
    
    try {
      // Build UPDATE query dynamically based on what's provided
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (logo_url !== undefined) {
        updates.push(`logo_url = $${paramIndex}`)
        values.push(logo_url)
        paramIndex++
      }

      if (settings !== undefined) {
        updates.push(`settings = $${paramIndex}::jsonb`)
        values.push(JSON.stringify(settings))
        paramIndex++
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }

      // Add updated_at
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      
      // Add WHERE clause
      values.push(organizationId)
      const whereClause = `WHERE id = $${paramIndex}`

      const query = `
        UPDATE organizations 
        SET ${updates.join(', ')} 
        ${whereClause}
        RETURNING id, name, logo_url, settings, updated_at
      `

      console.log(`📝 Updating organization ${organizationId}:`, { logo_url, settings })
      
      const result = await client.query(query, values)
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      const org = result.rows[0]
      const parsedSettings = typeof org.settings === 'string' 
        ? JSON.parse(org.settings) 
        : (org.settings || {})

      console.log(`✅ Organization updated successfully: ${organizationId}`)

      return NextResponse.json({
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
        settings: parsedSettings,
        updated_at: org.updated_at
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error updating organization:', error)
    return NextResponse.json({
      error: 'Failed to update organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

