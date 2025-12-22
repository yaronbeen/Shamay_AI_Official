import { NextRequest, NextResponse } from 'next/server'
const { ShumaDB } = require('../../../../../lib/shumadb.js')

/**
 * GET /api/organization/:organizationId/settings
 * Returns organization settings including logos and company info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params
    console.log(`📋 Fetching organization settings for: ${organizationId}`)

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const orgSettings = await ShumaDB.getOrganizationSettings(organizationId)
    
    if (!orgSettings) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Transform to CompanySettings format
    const companySettings = {
      companyLogo: orgSettings.logo_url || undefined,
      footerLogo: orgSettings.settings?.footerLogo || orgSettings.logo_url || undefined,
      companyName: orgSettings.settings?.companyName || orgSettings.name || undefined,
      companySlogan: orgSettings.settings?.companySlogan || undefined,
      companyAddress: orgSettings.settings?.companyAddress || undefined,
      companyPhone: orgSettings.settings?.companyPhone || undefined,
      companyEmail: orgSettings.settings?.companyEmail || undefined,
      companyWebsite: orgSettings.settings?.companyWebsite || undefined,
      associationMembership: orgSettings.settings?.associationMembership || 'חבר בלשכת שמאי המקרקעין בישראל',
      services: orgSettings.settings?.services || undefined,
      signature: orgSettings.settings?.signature || undefined
    }

    console.log(`✅ Organization settings loaded for: ${organizationId}`)

    return NextResponse.json(companySettings)

  } catch (error) {
    console.error('❌ Error fetching organization settings:', error)
    return NextResponse.json({
      error: 'Failed to fetch organization settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

