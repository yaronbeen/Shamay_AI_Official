import { ValuationData } from '@/components/ValuationWizard'
import { ReportData } from './types'

// Helper function to convert numbers to Hebrew words (copied from document-template.ts)
const numberToHebrewWords = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—'
  }
  const num = Math.floor(Number(value))

  const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
  const tens = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
  const teens = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה']

  const convertHundreds = (num: number): string => {
    if (num === 0) {
      return ''
    }
    if (num < 10) {
      return ones[num]
    }
    if (num < 20) {
      return teens[num - 10]
    }
    if (num < 100) {
      const ten = Math.floor(num / 10)
      const one = num % 10
      return `${tens[ten]}${one ? ` ו${ones[one]}` : ''}`.trim()
    }
    const hundred = Math.floor(num / 100)
    const rest = num % 100
    const hundredWord = hundred === 1 ? 'מאה' : hundred === 2 ? 'מאתיים' : `${ones[hundred]} מאות`
    if (rest === 0) {
      return hundredWord
    }
    return `${hundredWord} ו${convertHundreds(rest)}`
  }

  const chunks: string[] = []
  let remaining = Math.floor(Number(value))

  const millions = Math.floor(remaining / 1_000_000)
  if (millions) {
    chunks.push(millions === 1 ? 'מליון' : `${convertHundreds(millions)} מליון`)
    remaining %= 1_000_000
  }

  const thousands = Math.floor(remaining / 1_000)
  if (thousands) {
    chunks.push(
      thousands === 1
        ? 'אלף'
        : thousands === 2
          ? 'אלפיים'
          : `${convertHundreds(thousands)} אלף`
    )
    remaining %= 1_000
  }

  if (remaining) {
    chunks.push(convertHundreds(remaining))
  }

  if (!chunks.length) {
    return 'אפס'
  }

  let result = chunks.join(' ').replace(/ +/g, ' ').trim()
  
  // תיקון כתיב: "שבעה מאות" -> "ושבע מאות" אם יש מליון לפני
  if (millions > 0 && result.includes('שבעה מאות')) {
    result = result.replace('שבעה מאות', 'ושבע מאות')
  }
  
  return result + ' ש"ח'
}

/**
 * Converts ValuationData (from the wizard) to ReportData (for PDF generation)
 */
export function convertValuationDataToReportData(
  valuationData: ValuationData,
  companySettings?: {
    companyLogo?: string
    footerLogo?: string
    companyName?: string
    signature?: string
  }
): ReportData {
  const extracted = valuationData.extractedData as any || {}
  const landRegistry = extracted.land_registry || extracted.landRegistry || {}
  const buildingPermit = extracted.building_permit || extracted.buildingPermit || {}
  const sharedBuildingOrder = extracted.shared_building_order || extracted.sharedBuildingOrder || {}
  const planningInfo = extracted.planning_information || {}
  const gisAnalysis = valuationData.gisAnalysis || {}
  
  // Helper to get value from multiple paths
  const getValue = (...paths: (string | undefined)[]): any => {
    for (const path of paths) {
      if (!path) continue
      const parts = path.split('.')
      let value: any = valuationData
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part]
        } else {
          value = undefined
          break
        }
      }
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }
    return undefined
  }

  // Format date to dd.mm.yyyy
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}.${month}.${year}`
    } catch {
      return dateStr
    }
  }

  // Format date to Hebrew format (e.g., "29 יוני 2025")
  const formatDateHebrew = (dateStr?: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
      const day = date.getDate()
      const month = hebrewMonths[date.getMonth()]
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    } catch {
      return dateStr
    }
  }

  // Get full address
  const fullAddress = valuationData.fullAddress || 
    `${valuationData.street || ''} ${valuationData.buildingNumber || ''}${valuationData.neighborhood ? `, שכונת ${valuationData.neighborhood}` : ''}, ${valuationData.city || ''}`.trim()

  // Get report date (default to today)
  const reportDate = formatDateHebrew(valuationData.valuationDate || new Date().toISOString())
  
  // Get reference number
  const referenceNumber = valuationData.referenceNumber || 
    `${valuationData.shamaySerialNumber || ''}_${fullAddress}`.replace(/[^a-zA-Z0-9_]/g, '_')

  // Get environment description (from AI or extracted)
  const environmentDescription = extracted.environmentDescription || 
    extracted.environment_analysis?.description ||
    extracted.environmentDescription ||
    'תיאור הסביבה לא הוזן'

  // Get building rights
  const rightsSummary = planningInfo.rights || extracted.planning_rights || {}
  
  // Get planning plans
  const plansTable = planningInfo.plans || planningInfo.schemes || []
  
  // Get building permits
  const permits = Array.isArray(buildingPermit) ? buildingPermit : 
    buildingPermit.permit_number ? [buildingPermit] : []

  // Get completion certificate
  const completionCertificate = extracted.completion_certificate || {}

  // Get comparable data
  const comparablesTable = (valuationData.comparableData || []).map((comp: any) => ({
    saleDate: formatDate(comp.saleDate || comp.sale_date || comp.date),
    address: comp.address || comp.fullAddress || '',
    gushHelka: `${comp.gush || ''}/${comp.parcel || comp.helka || ''}`,
    rooms: comp.rooms || 0,
    floor: comp.floor || 0,
    areaSqm: comp.areaSqm || comp.area_sqm || comp.area || 0,
    buildYear: comp.buildYear || comp.build_year || comp.year,
    priceIls: comp.priceIls || comp.price_ils || comp.price || 0,
    pricePerSqmIls: comp.pricePerSqmIls || comp.price_per_sqm || 
      (comp.priceIls || comp.price_ils || comp.price) / (comp.areaSqm || comp.area_sqm || comp.area || 1)
  }))

  // Get valuation calculation
  const builtAreaSqm = valuationData.builtArea || extracted.built_area || valuationData.area || 0
  const balconyAreaSqm = valuationData.balconyArea || extracted.balcony_area || 0
  const equityAreaSqm = valuationData.registeredArea || extracted.registered_area || builtAreaSqm
  const pricePerSqm = valuationData.pricePerSqm || valuationData.finalValuation / equityAreaSqm || 0
  const totalValue = valuationData.finalValuation || 0

  // Get property photos
  const propertyPhotos = (valuationData.propertyImages || []).map((img: any, idx: number) => ({
    src: img.preview || img.url || img.signedUrl || img.fileUrl || img.absoluteUrl || 
      (typeof img === 'string' ? img : ''),
    caption: img.caption || `תמונה ${idx + 1}`
  })).filter((p: any) => p.src)

  // Get internal layout and finish
  const internalLayoutAndFinish = 
    `${valuationData.internalLayout || extracted.internal_layout || ''}\n${valuationData.finishStandard || extracted.finish_standard || ''}\n${valuationData.finishDetails || extracted.finish_details || ''}`.trim() ||
    extracted.propertyLayoutDescription ||
    'לא הוזן'

  // Get air directions
  const airDirections = typeof valuationData.airDirections === 'number' 
    ? valuationData.airDirections.toString()
    : valuationData.airDirections || extracted.air_directions || ''

  // Get attachments text
  const attachmentsText = valuationData.attachments || 
    extracted.attachments || 
    sharedBuildingOrder.attachments ||
    ''

  // Get boundaries
  const boundaries = {
    west: extracted.plot_boundary_west || extracted.plotBoundaryWest || '',
    east: extracted.plot_boundary_east || extracted.plotBoundaryEast || '',
    north: extracted.plot_boundary_north || extracted.plotBoundaryNorth || '',
    south: extracted.plot_boundary_south || extracted.plotBoundarySouth || ''
  }

  // Get ownerships
  const ownerships = landRegistry.ownerships || landRegistry.owners || []
  
  // Get final value text
  const finalValueText = numberToHebrewWords(totalValue)

  // Get easements (זיקות הנאה) - 7 easements
  const easements = extracted.easements_list || landRegistry.easements_list || []
  
  // Get building lines table
  const buildingLinesTable = extracted.building_lines_table || rightsSummary.building_lines_table || undefined
  
  // Get auxiliary areas
  const auxiliaryAreas = extracted.auxiliary_areas || undefined
  
  // Get buildings info for condo order
  const buildingsInfo = extracted.buildings_info || sharedBuildingOrder.buildings_info || undefined
  
  // Get appraiser license number
  const appraiserLicenseNumber = valuationData.appraiserLicenseNumber || extracted.appraiser_license_number || undefined

  return {
    meta: {
      documentTitle: valuationData.valuationType || 'אומדן שווי זכויות במקרקעין',
      reportDate,
      referenceNumber,
      clientName: valuationData.clientName || '',
      clientTitle: valuationData.clientTitle,
      inspectionDate: formatDate(valuationData.visitDate || valuationData.valuationDate),
      valuationDate: formatDate(valuationData.valuationDate || valuationData.visitDate),
      appraiserName: valuationData.shamayName || 'שמאי מקרקעין',
      appraiserLicenseNumber
    },
    openingPage: {
      openingDate: formatDate(valuationData.valuationDate || new Date().toISOString()),
      propertySummaryTable: {
        gush: valuationData.gush || landRegistry.gush || extracted.gush || '',
        helka: valuationData.parcel || landRegistry.chelka || landRegistry.parcel || extracted.parcel || '',
        area: valuationData.parcelArea || extracted.parcel_area || landRegistry.parcel_area
      }
    },
    address: {
      street: valuationData.street || '',
      buildingNumber: valuationData.buildingNumber || '',
      neighborhood: valuationData.neighborhood,
      city: valuationData.city || '',
      fullAddressLine: fullAddress
    },
    cover: {
      coverImage: valuationData.selectedImagePreview ? {
        src: valuationData.selectedImagePreview,
        caption: 'תמונת חזית הבניין'
      } : undefined,
      logo: companySettings?.companyLogo ? {
        src: companySettings.companyLogo
      } : undefined,
      companyName: companySettings?.companyName,
      companyTagline: (companySettings as any)?.companySlogan || undefined,
      companyServices: (companySettings as any)?.services?.join(' - ') || 'שמאות מקרקעין - התחדשות עירונית - דוחות אפס וליווי פיננסי - מיסוי מקרקעין',
      companyMembership: (companySettings as any)?.associationMembership || 'חבר בלשכת שמאי המקרקעין בישראל',
      companyContact: {
        email: (companySettings as any)?.companyEmail,
        phone: (companySettings as any)?.companyPhone,
        website: (companySettings as any)?.companyWebsite,
        address: (companySettings as any)?.companyAddress
      }
    },
    section1: {
      environmentDescription,
      environmentMap: (valuationData.gisScreenshots?.wideArea || valuationData.gisScreenshots?.cropMode0) ? {
        src: (valuationData.gisScreenshots.wideArea || valuationData.gisScreenshots.cropMode0) as string,
        caption: 'מפת סביבה - GOVMAP'
      } : undefined,
      parcel: {
        gush: valuationData.gush || landRegistry.gush || extracted.gush || '',
        helka: valuationData.parcel || landRegistry.chelka || landRegistry.parcel || extracted.parcel || '',
        parcelAreaSqm: valuationData.parcelArea || extracted.parcel_area || landRegistry.parcel_area,
        buildingYear: valuationData.buildingDescription ? 
          parseInt(valuationData.buildingDescription.match(/\d{4}/)?.[0] || '') : undefined,
        buildingFloors: valuationData.buildingFloors || extracted.building_floors,
        buildingUnits: valuationData.buildingUnits || extracted.building_units,
        numberOfBuildings: extracted.number_of_buildings,
        parcelShape: valuationData.parcelShape || extracted.parcel_shape,
        parcelSurface: valuationData.parcelSurface || extracted.parcel_surface,
        parcelSketch: (valuationData.gisScreenshots?.zoomedWithTazea || valuationData.gisScreenshots?.cropMode1) ? {
          src: (valuationData.gisScreenshots.zoomedWithTazea || valuationData.gisScreenshots.cropMode1) as string,
          caption: 'תשריט חלקה / תצלום תצ"א'
        } : undefined,
        parcelSketchNoTazea: valuationData.gisScreenshots?.zoomedNoTazea ? {
          src: valuationData.gisScreenshots.zoomedNoTazea,
          caption: 'תשריט חלקה ללא תצ״א'
        } : undefined,
        boundaries: Object.values(boundaries).some(v => v) ? boundaries : undefined
      },
      property: {
        subParcel: valuationData.subParcel || extracted.sub_parcel || landRegistry.sub_parcel,
        rooms: valuationData.rooms || 0,
        floor: valuationData.floor || 0,
        airDirections,
        registeredAreaSqm: valuationData.registeredArea || extracted.registered_area,
        builtAreaSqm,
        balconyAreaSqm,
        attachmentsText,
        internalLayoutAndFinish,
        photos: propertyPhotos.length >= 4 ? propertyPhotos : undefined
      }
    },
    section2: {
      registryOfficeName: valuationData.registryOffice || landRegistry.registry_office || extracted.registry_office,
      tabuIssueDate: formatDate(valuationData.extractDate || landRegistry.extract_date || extracted.extract_date),
      easementsText: landRegistry.easements || extracted.easements || 'אין זיקות',
      easements: easements.length > 0 ? easements.map((easement: any, idx: number) => ({
        letter: easement.letter || ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'][idx] || String.fromCharCode(1488 + idx),
        description: easement.description || easement.text || '',
        areaSqm: easement.areaSqm || easement.area_sqm || easement.area
      })) : undefined,
      ownerships: ownerships.length > 0 ? ownerships.map((owner: any) => ({
        name: owner.name || owner.owner_name || '',
        id: owner.id || owner.id_number || '',
        share: owner.share || owner.ownership_share || ''
      })) : undefined,
      mortgagesText: landRegistry.mortgages || extracted.mortgages || 'אין משכנתאות רשומות',
      notesText: valuationData.notes || extracted.notes || 'אין הערות',
      condoOrder: sharedBuildingOrder.order_date ? {
        orderDate: formatDate(sharedBuildingOrder.order_date),
        buildingDescription: valuationData.buildingDescription || sharedBuildingOrder.building_description,
        buildingsInfo: buildingsInfo ? buildingsInfo.map((building: any) => ({
          buildingNumber: building.building_number || building.number || building.buildingNumber || '',
          address: building.address,
          floors: building.floors || building.floors_count,
          units: building.units || building.units_count
        })) : undefined,
        subParcelDescription: sharedBuildingOrder.sub_parcel_description,
        sketches: [] // TODO: Extract sketches from shared building order
      } : undefined,
      legalDisclaimerText: 'אין בתיאור המצב המשפטי כדי להוות חוות דעת משפטן. במידה וקיימים מסמכים שלא הובאו לידיעתו, ייתכן ויהיה בהם כדי לשנות את ההערכה.'
    },
    section3: {
      plansTable: plansTable.map((plan: any) => ({
        planId: plan.plan_number || plan.planId || plan.id || '',
        planName: plan.plan_name || plan.planName || plan.name || '',
        publishDate: formatDate(plan.publication_date || plan.publishDate || plan.date),
        status: plan.status || 'בתוקף'
      })),
      rightsSummary: Object.keys(rightsSummary).length > 0 ? {
        designation: rightsSummary.designation || rightsSummary.usage,
        minLotSizeSqm: rightsSummary.minLotSizeSqm || rightsSummary.min_lot_size,
        buildPercentage: rightsSummary.buildPercentage || rightsSummary.build_percentage,
        maxFloors: rightsSummary.maxFloors || rightsSummary.max_floors,
        maxUnits: rightsSummary.maxUnits || rightsSummary.max_units,
        buildingLines: rightsSummary.buildingLines || rightsSummary.building_lines,
        buildingLinesTable: buildingLinesTable ? {
          front: buildingLinesTable.front || buildingLinesTable.חזית,
          back: buildingLinesTable.back || buildingLinesTable.אחורי,
          side1: buildingLinesTable.side1 || buildingLinesTable.צד1 || buildingLinesTable.צד_1,
          side2: buildingLinesTable.side2 || buildingLinesTable.צד2 || buildingLinesTable.צד_2
        } : undefined
      } : undefined,
      auxiliaryAreas: auxiliaryAreas ? {
        parkingSpaces: auxiliaryAreas.parking_spaces || auxiliaryAreas.parkingSpaces || auxiliaryAreas.חניות,
        storageRooms: auxiliaryAreas.storage_rooms || auxiliaryAreas.storageRooms || auxiliaryAreas.מחסנים,
        otherAreas: auxiliaryAreas.other_areas || auxiliaryAreas.otherAreas ? (auxiliaryAreas.other_areas || auxiliaryAreas.otherAreas).map((area: any) => ({
          type: area.type || area.name || '',
          areaSqm: area.areaSqm || area.area_sqm || area.area
        })) : undefined
      } : undefined,
      permits: permits.map((permit: any) => ({
        permitNumber: permit.permit_number || permit.permitNumber || permit.number || '',
        permitDate: formatDate(permit.permit_date || permit.permitDate || permit.date),
        description: permit.description || permit.permit_description || ''
      })),
      completionCertificate: completionCertificate.date ? {
        date: formatDate(completionCertificate.date),
        address: completionCertificate.address || fullAddress,
        text: completionCertificate.text
      } : undefined,
      planImage: extracted.plan_image ? {
        src: extracted.plan_image.src || extracted.plan_image,
        caption: extracted.plan_image.caption || 'קטע מתכנית'
      } : undefined,
      apartmentPlan: valuationData.garmushkaMeasurements?.pngExport ? {
        src: valuationData.garmushkaMeasurements.pngExport,
        caption: 'תשריט הדירה'
      } : undefined,
      environmentQualityText: extracted.land_contamination_note || 
        'בחוות דעת זו לא הובאו לידיעת הח"מ ולא הייתה לח"מ סיבה לחשד לקיומם של חומרים מסוכנים או מזהמים.'
    },
    section4: {
      introText: 'באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:',
      bullets: {
        environmentAndAsset: [
          `מיקום הנכס ב${fullAddress}.`,
          `נשוא חוות הדעת: דירת מגורים בת ${valuationData.rooms || 0} חדרים${airDirections ? ` עם ${airDirections} כיווני אוויר` : ''} בקומה ${valuationData.floor || 0}.`,
          `שטח הדירה, החלוקה הפונקציונאלית ורמת הגמר (הכל מפורט בפרק 1).`
        ],
        rightsStatus: [
          'הזכויות בנכס – בעלות פרטית.',
          valuationData.subParcel ? `הדירה זוהתה בהתאם לתשריט הבית המשותף כתת חלקה ${valuationData.subParcel} הנמצאת בקומה ${valuationData.floor || 0}.` : ''
        ].filter(Boolean),
        planningAndPermits: [
          'זכויות הבניה עפ"י תכניות בניין עיר בתוקף (כמפורט בפרק 3).',
          permits.length > 0 ? `היתר בניה מס' ${permits[0].permitNumber} מיום ${permits[0].permitDate}.` : '',
          'הבנוי בפועל תואם את תכנית היתר הבניה.'
        ].filter(Boolean),
        valuation: [
          'הערכת שווי הנכס נערכה בגישת ההשוואה, תוך ביצוע התאמות נדרשות לנכס נשוא השומה.',
          'מחירי נכסים דומים תוך ביצוע התאמות לנכס נשוא חוות הדעת, נכון למועד הביקור בנכס.',
          'המחירים המפורטים בשומה כוללים מע"מ כנהוג בנכסים מסוג זה.',
          'הזכויות בנכס הוערכו כחופשיות מכל חוב, שעבוד או מחזיק.'
        ]
      }
    },
    section5: {
      comparablesTable,
      valuationCalc: {
        pricePerBuiltSqmIls: pricePerSqm,
        description: `דירת ${valuationData.rooms || 0} חדרים, בקומה ${valuationData.floor || 0}${airDirections ? `, עם ${airDirections} כיווני אוויר` : ''}`,
        builtAreaSqm,
        balconyAreaSqm,
        equityAreaSqm,
        totalValueIls: totalValue,
        includesVat: true
      }
    },
    section6: {
      finalValueIls: totalValue,
      finalValueText,
      freeFromDebtsText: 'הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.',
      declarationText: 'הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.',
      standardsText: 'הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.'
    }
  }
}

