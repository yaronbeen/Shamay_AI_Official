import { NextRequest, NextResponse } from 'next/server'
const { ShumaDB } = require('../../../../../lib/shumadb.js')
import { generateDocumentHTML, CompanySettings } from '../../../../../lib/document-template'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type PdfPreflight = {
  addressStreet: string
  addressNumber: string
  city: string
  visitDate: string
  valuationDate: string
  block: number | string
  parcel: number | string
  registeredArea: number | string
  builtArea: number | string
  ownershipType: string
}

const validatePdfData = (data: any) => {
  const getFirst = (...values: any[]) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }
    return undefined
  }

  const deriveParcelFromComposite = (value: unknown) => {
    if (typeof value !== 'string') {
      return undefined
    }
    const parts = value.split('/').map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return parts[1]
    }
    return undefined
  }

  const deriveBlockFromComposite = (value: unknown) => {
    if (typeof value !== 'string') {
      return undefined
    }
    const parts = value.split('/').map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 1) {
      return parts[0]
    }
    return undefined
  }

  const guard: PdfPreflight = {
    addressStreet: data.street || data.addressStreet || data.address?.street,
    addressNumber: data.buildingNumber || data.addressBuildingNumber || data.address?.number,
    city: data.city || data.addressCity || data.address?.city,
    visitDate: data.visitDate || data.valuationEffectiveDate || data.inspectionDate,
    valuationDate: data.valuationDate || data.determiningDate || data.valuationEffectiveDate,
    block: getFirst(
      data.extractedData?.gush,
      data.extractedData?.land_registry?.gush,
      data.extractedData?.landRegistry?.gush,
      data.gush,
      data.parcelData?.gush,
      data.parcelDetails?.gush,
      data.propertyDetails?.gush,
      deriveBlockFromComposite(data.extractedData?.gush_chelka),
      deriveBlockFromComposite(data.extractedData?.gushChelka),
      deriveBlockFromComposite(data.gushChelka)
    ),
    parcel: getFirst(
      data.extractedData?.chelka,
      data.extractedData?.parcel,
      data.extractedData?.land_registry?.chelka,
      data.extractedData?.land_registry?.parcel,
      data.extractedData?.landRegistry?.chelka,
      data.extractedData?.landRegistry?.parcel,
      data.extractedData?.parcel_number,
      data.extractedData?.parcelNumber,
      data.parcel,
      data.parcelNumber,
      data.parcel_number,
      data.parcelData?.chelka,
      data.parcelData?.parcel,
      data.parcelDetails?.parcel,
      data.propertyDetails?.parcel,
      deriveParcelFromComposite(data.extractedData?.gush_chelka),
      deriveParcelFromComposite(data.extractedData?.gushChelka),
      deriveParcelFromComposite(data.gushChelka)
    ),
    registeredArea: getFirst(
      data.registeredArea,
      data.extractedData?.apartment_registered_area,
      data.extractedData?.apartmentRegisteredArea,
      data.subparcel?.registered_area_sqm,
      data.propertyDetails?.registeredArea
    ),
    builtArea: getFirst(
      data.extractedData?.builtArea,
      data.builtArea,
      data.area,
      data.propertyDetails?.builtArea
    ),
    ownershipType: getFirst(
      data.extractedData?.ownershipType,
      data.ownershipRights,
      data.rights?.ownership_type,
      data.propertyDetails?.ownershipType
    )
  }

  const missing: string[] = []
  if (!guard.addressStreet) missing.push('רחוב')
  if (!guard.addressNumber) missing.push('מספר בניין')
  if (!guard.city) missing.push('עיר')
  if (!guard.visitDate) missing.push('מועד ביקור')
  if (!guard.valuationDate) missing.push('תאריך קובע לשומה')
  if (!guard.block) missing.push('גוש')
  if (!guard.parcel) missing.push('חלקה')
  if (guard.registeredArea === undefined || guard.registeredArea === null || guard.registeredArea === '') missing.push('שטח דירה רשום')
  if (guard.builtArea === undefined || guard.builtArea === null || guard.builtArea === '') missing.push('שטח דירה בנוי')
  if (!guard.ownershipType) missing.push('סוג בעלות')

  if (missing.length) {
    throw new Error(`לא ניתן להפיק PDF. שדות חסרים: ${missing.join(', ')}`)
  }
}

/**
 * POST /api/session/[sessionId]/export-pdf
 * Generate and export the final valuation report as PDF using the HTML template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    const requestBody =
      (await request
        .json()
        .catch(() => ({}))) || {}
    const clientCustomEdits =
      (requestBody?.customDocumentEdits &&
        typeof requestBody.customDocumentEdits === 'object'
        ? requestBody.customDocumentEdits
        : {}) as Record<string, string>

    const userSession = await getServerSession(authOptions)
    const userId = userSession?.user?.id || 'dev-user-id'

    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
    const encodePathSegments = (value: string) =>
      value
        .split('/')
        .map((segment, index) => {
          if (segment === '' && index === 0) {
            return ''
          }
          try {
            return encodeURIComponent(decodeURIComponent(segment))
          } catch {
            return encodeURIComponent(segment)
          }
        })
        .join('/')

    const convertToAbsoluteUrl = (url?: string | null): string | undefined => {
      if (!url) return undefined

      try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const parsed = new URL(url)
          parsed.pathname = encodePathSegments(parsed.pathname)
          return parsed.toString()
        }

        if (url.startsWith('/')) {
          const parsed = new URL(`${frontendUrl}${url}`)
          parsed.pathname = encodePathSegments(parsed.pathname)
          return parsed.toString()
        }

        const parsed = new URL(`${frontendUrl}/${url}`)
        parsed.pathname = encodePathSegments(parsed.pathname)
        return parsed.toString()
      } catch {
        return encodeURI(url)
      }
    }

    // Load session data from database
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId)
    
    if (!loadResult.success || !loadResult.valuationData) {
      console.error(`❌ Session not found: ${sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const valuationData = loadResult.valuationData

    const mergedCustomEdits = {
      ...(valuationData.customDocumentEdits || {}),
      ...clientCustomEdits
    }

    validatePdfData(valuationData)

    // Fetch user settings for company logos, signature, and contact info
    let companySettings: CompanySettings | undefined = undefined
    try {
      if (userSession?.user?.id) {
        const userEmail = userSession?.user?.email || null
        const userSettings = await ShumaDB.getUserSettings(userSession.user.id, userEmail)
        
        if (userSettings) {
          companySettings = {
            companyLogo: convertToAbsoluteUrl(userSettings.settings?.companyLogo) || userSettings.settings?.companyLogo,
            footerLogo: convertToAbsoluteUrl(userSettings.settings?.footerLogo) || userSettings.settings?.footerLogo,
            companyName: userSettings.settings?.companyName || userSettings.name || undefined,
            companySlogan: userSettings.settings?.companySlogan || undefined,
            companyAddress: userSettings.settings?.companyAddress || undefined,
            companyPhone: userSettings.settings?.companyPhone || undefined,
            companyEmail: userSettings.settings?.companyEmail || userSettings.email || undefined,
            companyWebsite: userSettings.settings?.companyWebsite || undefined,
            associationMembership: userSettings.settings?.associationMembership || 'חבר בלשכת שמאי המקרקעין בישראל',
            services: userSettings.settings?.services || undefined,
            signature: convertToAbsoluteUrl(userSettings.settings?.signature) || userSettings.settings?.signature
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }

    const isDataUrl = (value?: string | null) =>
      typeof value === 'string' && value.trim().toLowerCase().startsWith('data:image/')

    const selectedImageForHtml = isDataUrl(valuationData.selectedImagePreview)
      ? valuationData.selectedImagePreview || undefined
      : convertToAbsoluteUrl(valuationData.selectedImagePreview || undefined) || valuationData.selectedImagePreview || undefined
    const gisScreenshotsForHtml = valuationData.gisScreenshots
      ? {
          cropMode0: convertToAbsoluteUrl(valuationData.gisScreenshots.cropMode0) || valuationData.gisScreenshots.cropMode0,
          cropMode1: convertToAbsoluteUrl(valuationData.gisScreenshots.cropMode1) || valuationData.gisScreenshots.cropMode1
        }
      : undefined

    const htmlContent = generateDocumentHTML(
      {
        ...valuationData,
        selectedImagePreview: selectedImageForHtml || null,
        gisScreenshots: gisScreenshotsForHtml || valuationData.gisScreenshots,
        customDocumentEdits: mergedCustomEdits
      },
      false,
      companySettings
    )

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

    const response = await fetch(`${backendUrl}/api/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        htmlContent,
        companySettings: companySettings || {},
        userId // Pass userId for logo paths
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Backend PDF generation failed:', error)
      return NextResponse.json({ 
        error: 'PDF generation failed',
        details: error 
      }, { status: 500 })
    }

    // Get the PDF buffer from backend
    const pdfBuffer = await response.arrayBuffer()

    // Return the PDF with proper headers for download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shamay-valuation-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('❌ Error in PDF export:', error)
    return NextResponse.json({
      error: 'Failed to export PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
