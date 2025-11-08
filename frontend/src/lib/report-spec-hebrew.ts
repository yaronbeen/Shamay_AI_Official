/**
 * SHAMAY.AI - Complete Hebrew Report Specification
 * 
 * This file contains the COMPLETE specification for generating Hebrew valuation reports.
 * Every template, rule, and locked text is defined here exactly as specified.
 * 
 * DO NOT modify without PM/Legal approval.
 */

export interface ReportSpecification {
  structure: ReportStructure
  lockedText: LockedHebrewText
  validationRules: ValidationRules
  taBindings: TABinding[]
}

export interface ReportStructure {
  coverPage: CoverPageSpec
  openingPage: OpeningPageSpec
  chapter1: Chapter1Spec
  chapter2: Chapter2Spec
  chapter3: Chapter3Spec
  chapter4: Chapter4Spec
  chapter5: Chapter5Spec
  chapter6: Chapter6Spec
}

// ===== COVER PAGE (דף שער) =====
export interface CoverPageSpec {
  logo: string // TA1
  reportType: string // TA2
  mainTitle: string // Fixed: "אומדן שווי זכויות במקרקעין"
  subtitle: string // Fixed: "דירת מגורים"
  address: {
    street: string // TA3
    buildingNo: string // TA4
    neighborhood: string // TA5
    city: string // TA6
  }
  coverPhoto: string // TA7
  footer: string // TA8 - Branded footer
}

// ===== OPENING PAGE (דף פתיחה) =====
export interface OpeningPageSpec {
  headerLogo: string // TA9
  clientName: string // TA10 - REQUIRED, min 3 chars
  reportDate: string // TA11 - Default: today, editable, ≤ today
  referenceNumber: string // TA12 - Auto: "1000_{street}_{buildingNo}"
  reportType: string // TA13
  address: {
    street: string // TA14
    buildingNo: string // TA15
    neighborhood: string // TA16
    city: string // TA17
  }
  purpose: string // TA18 - LOCKED
  limitation: string // TA19 - LOCKED (in opening paragraph)
  visitDate: string // TA20 - REQUIRED, ≤ today
  determiningDate: string // TA21 - Default = visitDate, requires reason if different, ≤ today
  propertyDetails: {
    essence: string // TA23 - e.g., "דירת מגורים בת 4 חדרים בקומה 6"
    block: string // TA24 - REQUIRED from Tabu
    parcel: string // TA25 - REQUIRED from Tabu
    subParcel: string // TA26 - REQUIRED from Tabu
    registeredArea: string // TA27 - REQUIRED from Tabu
    builtArea: string // TA28 - From permit or manual
    attachments: string // TA29 - Summary
    ownershipType: string // TA30
  }
  footnoteSources: string // TA31 - Tabu extract date
  footer: string // TA32
}

// ===== CHAPTER 1: Property Description =====
export interface Chapter1Spec {
  title: string // TA33 - LOCKED: "פרק 1 – תיאור הנכס והסביבה"
  section11: {
    title: string // LOCKED: "1.1 תיאור השכונה, גבולותיה, מאפייניה וסביבתה"
    neighborhoodDesc: string // TA34 - AI generated
    govmapScreenshot: string // TA35
    footer: string // TA36
  }
  section12: {
    title: string // TA37 - LOCKED: "1.2 תיאור החלקה"
    parcelDesc: string // TA38 - AI generated template
    buildingDesc: string // TA39 - AI generated
    gisScreenshot1: string // TA40
    gisScreenshot2: string // TA41
    boundaries: {
      header: string // TA42 - LOCKED: "גבולות החלקה:"
      north: string // TA43
      south: string // TA44
      east: string // TA45
      west: string // TA46
    }
  }
  section13: {
    title: string // TA44 - "1.3 תיאור הבניין ונשוא חוות הדעת"
    subjectDesc: string // TA45 - AI template with variables
    internalLayout: string // TA46
    photoAnalysis: string // TA47 - Vision AI
    footer: string // TA48
    interiorPhotos: string[] // TA49
  }
  section14: {
    title: string // TA50 - "1.4 רישוי"
    localAuthority: string // TA50
    permit1: string // TA51
    permit2: string // TA52
    planDiagram: string // TA53 - Garmushka screenshot
  }
}

// ===== CHAPTER 2: Legal Status =====
export interface Chapter2Spec {
  title: string // TA55 - LOCKED: "פרק 2 – מצב משפטי"
  section21: {
    title: string // TA56 - LOCKED: "2.1 נסח רישום מקרקעין (נסח טאבו)"
    intro: string // TA56 - Template with registrar office
    parcelOverview: string // TA57 - Composite template
    subparcelDesc: string // TA59 - Template (MP)
    attachments: string[] // TA60 - Each attachment (MP)
    ownerships: string[] // TA61 - Each owner (MP)
    mortgages: string[] // TA62 - Each mortgage (MP)
    notes: string[] // TA63 - Each note (MP)
  }
  section22: {
    title: string // TA64 - "2.2 מסמכי בית משותף"
    orderDate: string // TA64
    buildingDesc: string // TA65
    subparcelDesc: string // TA66
    screenshots: string[] // TA67
  }
  section23: {
    title: string // TA68 - "2.3 הסתייגות"
    disclaimer: string // TA68 - LOCKED
  }
}

// ===== CHAPTER 3: Planning & Licensing =====
export interface Chapter3Spec {
  title: string // TA69 - LOCKED: "פרק 3 – מידע תכנוני"
  section31: {
    title: string // TA70 - "3.1 ריכוז תכניות בניין עיר תקפות"
    plansTable: any[] // TA70 - Min 4 rows required
  }
  section32: {
    title: string // TA71 - "3.2 ריכוז זכויות בנייה"
    rightsSummary: {
      usage: string // ייעוד
      minLotSize: string // שטח מגרש מינימלי
      buildPercentage: string // אחוזי בנייה
      maxFloors: string // קומות מותרות
      maxUnits: string // יח"ד
      buildingLines: string // קווי בניין
    }
    zoningImage: string // TA72
  }
  section33: {
    title: string // "3.3 רישוי בנייה"
    permits: any[] // TA51-52 - Chronological, latest marked
    completionCertificate: string // Must match latest permit
    planDiagram: string // TA53
  }
  section34: {
    title: string // "3.4 זיהום קרקע"
    contaminationFlag: boolean // Default: false
    contaminationNote: string // TA - Custom if flag = true
    defaultText: string // LOCKED default paragraph
  }
}

// ===== CHAPTER 4: Factors & Considerations =====
export interface Chapter4Spec {
  title: string // TA73 - LOCKED
  intro: string // LOCKED: "באומדן שווי הנכס הובאו בחשבון..."
  environmentBullets: string[] // TA74-77 - Auto + manual
  rightsBullets: string[] // TA78-80 - Auto + manual
  planningBullets: string[] // TA82-84 - Auto + manual
  valuationBullets: string[] // TA85-89 - Auto + manual
}

// ===== CHAPTER 5: Calculations =====
export interface Chapter5Spec {
  section51: {
    title: string // TA91 - "5.1 נתוני השוואה"
    intro: string // LOCKED intro paragraph
    comparablesTable: any[] // TA90 - Min 3 included
    analytics: {
      count: number // TA91
      average: number
      median: number
      stdDev: number
      min: number
      max: number
    }
    pricePerSqmEquiv: number // TA92
    equivCoefficient: number // TA93 - Optional
  }
  section52: {
    title: string // TA94 - "5.2 תחשיב שווי הנכס"
    intro: string // LOCKED with {{calc.eq_psm}}
    calculationTable: {
      description: string // TA96
      builtArea: number
      balconyArea: number
      equivArea: number // Computed
      pricePerSqmEquiv: number
      assetValue: number // TA95 - Rounded to thousands upward
    }
    vatIncluded: string // TA97 - LOCKED: "השווי כולל מע\"מ"
  }
}

// ===== CHAPTER 6: Final Valuation =====
export interface Chapter6Spec {
  title: string // LOCKED: "פרק 6 – השומה"
  finalValuationParagraph: string // TA98 - LOCKED with {{asset_value_num}} and {{asset_value_txt}}
  currentState: string // LOCKED: "הכול במצבו הנוכחי..."
  declaration: string // TA99 - LOCKED appraiser declaration
  signatureIntro: string // LOCKED: "ולראיה באתי על החתום,"
  signatureBlock: {
    appraiserName: string // TA100
    licenseNumber: string // TA100
    signature: string // TA100 - Image
  }
}

// ===== LOCKED HEBREW TEXT (NEVER TRANSLATE) =====
export interface LockedHebrewText {
  // Cover page
  coverMainTitle: string // "אומדן שווי זכויות במקרקעין"
  coverSubtitle: string // "דירת מגורים"
  
  // Opening page
  openingIntro: string // "נתבקשתי לאמוד את שווי הזכויות..."
  purposeTitle: string // "מטרת חוות הדעת:"
  purposeText: string // "שומת מקרקעין בקריטריון של קונה מרצון ומוכר מרצון (שווי שוק)."
  limitationText: string // "אחריותו של החתום מטה..."
  
  // Chapter titles
  chapter1Title: string // "פרק 1 – תיאור הנכס והסביבה"
  chapter2Title: string // "פרק 2 – מצב משפטי"
  chapter3Title: string // "פרק 3 – מידע תכנוני"
  chapter4Title: string // "פרק 4 – גורמים ושיקולים באומדן השווי"
  chapter5Title: string // "פרק 5 – תחשיבים לאומדן השווי"
  chapter6Title: string // "פרק 6 – השומה"
  
  // Chapter 2 templates
  tabuIntroTemplate: string // "תמצית מידע מפנקס הזכויות..."
  subparcelDescTemplate: string // "תת חלקה {{number}}, דירה בקומה..."
  attachmentTemplate: string // "{{type}} בשטח {{size}} מ\"ר..."
  ownershipTemplate: string // "{{name}}, {{idType}} {{idNumber}}..."
  mortgageTemplate: string // "משכנתא מדרגה {{rank}}..."
  noteTemplate: string // "{{actionType}} מיום {{date}}..."
  legalDisclaimer: string // "אין בתיאור המצב המשפטי..."
  
  // Chapter 3
  contaminationDefault: string // Long paragraph about no contamination
  contaminationAlternate: string // If contamination flagged
  
  // Chapter 4
  considerationsIntro: string // "באומדן שווי הנכס הובאו בחשבון..."
  
  // Chapter 5
  comparablesIntro: string // "הובאו בחשבון נתוני עסקאות..."
  calculationIntro: string // "בשים לב לנתוני השוואה שלעיל..."
  vatIncluded: string // "השווי כולל מע\"מ"
  
  // Chapter 6
  finalValuationTemplate: string // "בשים לב למיקומו של הנכס... {{assetValue}}"
  currentStateText: string // "הכול במצבו הנוכחי..."
  declarationText: string // "הננו מצהירים..."
  signatureIntro: string // "ולראיה באנו על החתום,"
}

export interface ValidationRules {
  required: string[] // List of TA_IDs that MUST have values
  blocking: string[] // TA_IDs that block export if missing
  dateValidations: {
    taId: string
    rule: 'not_future' | 'requires_reason_if_override'
  }[]
  minLengthValidations: {
    taId: string
    minLength: number
  }[]
}

export interface TABinding {
  taId: string
  fieldPath: string
  description: string
  source: 'tabu' | 'condo' | 'permit' | 'manual' | 'ai' | 'system'
  required: boolean
  validation?: string
}

// ===== COMPLETE TA BINDINGS FROM SPEC =====
export const COMPLETE_TA_BINDINGS: TABinding[] = [
  // Cover Page (דף שער)
  { taId: 'TA1', fieldPath: 'branding.logo', description: 'לוגו', source: 'system', required: false },
  { taId: 'TA2', fieldPath: 'report.type', description: 'סוג שומה', source: 'system', required: true },
  { taId: 'TA3', fieldPath: 'address.street', description: 'רחוב', source: 'tabu', required: true },
  { taId: 'TA4', fieldPath: 'address.buildingNo', description: 'מספר בניין', source: 'tabu', required: true },
  { taId: 'TA5', fieldPath: 'address.neighborhood', description: 'שכונה', source: 'tabu', required: false },
  { taId: 'TA6', fieldPath: 'address.city', description: 'עיר', source: 'tabu', required: true },
  { taId: 'TA7', fieldPath: 'media.coverPhoto', description: 'תמונה חיצונית', source: 'manual', required: false },
  { taId: 'TA8', fieldPath: 'branding.footer', description: 'פוטר ממותג', source: 'system', required: false },
  
  // Opening Page (דף פתיחה)
  { taId: 'TA9', fieldPath: 'branding.headerLogo', description: 'Header לוגו', source: 'system', required: false },
  { taId: 'TA10', fieldPath: 'client.name', description: 'מזמין חוות הדעת', source: 'manual', required: true, validation: 'min_length:3' },
  { taId: 'TA11', fieldPath: 'report.dateCreated', description: 'תאריך של היום', source: 'system', required: true, validation: 'not_future' },
  { taId: 'TA12', fieldPath: 'report.referenceCode', description: 'ID שומה', source: 'system', required: true },
  { taId: 'TA13', fieldPath: 'report.type', description: 'סוג שומה', source: 'system', required: true },
  { taId: 'TA14', fieldPath: 'address.street', description: 'רחוב', source: 'tabu', required: true },
  { taId: 'TA15', fieldPath: 'address.buildingNo', description: 'מספר בניין', source: 'tabu', required: true },
  { taId: 'TA16', fieldPath: 'address.neighborhood', description: 'שכונה', source: 'tabu', required: false },
  { taId: 'TA17', fieldPath: 'address.city', description: 'עיר', source: 'tabu', required: true },
  { taId: 'TA18', fieldPath: 'report.purpose', description: 'מטרת חוות הדעת', source: 'system', required: true },
  { taId: 'TA19', fieldPath: 'report.limitation', description: 'הגבלת אחריות', source: 'system', required: true },
  { taId: 'TA20', fieldPath: 'report.visitDate', description: 'תאריך ביקור', source: 'manual', required: true, validation: 'not_future' },
  { taId: 'TA21', fieldPath: 'report.determiningDate', description: 'תאריך קובע', source: 'manual', required: true, validation: 'not_future,requires_reason_if_different' },
  { taId: 'TA22', fieldPath: 'section.propertyDetailsHeader', description: 'פרטי הנכס', source: 'system', required: true },
  { taId: 'TA23', fieldPath: 'property.essence', description: 'מהות הנכס', source: 'manual', required: true },
  { taId: 'TA24', fieldPath: 'parcel.block', description: 'גוש', source: 'tabu', required: true },
  { taId: 'TA25', fieldPath: 'parcel.number', description: 'חלקה', source: 'tabu', required: true },
  { taId: 'TA26', fieldPath: 'subparcel.number', description: 'תת חלקה', source: 'tabu', required: true },
  { taId: 'TA27', fieldPath: 'subparcel.registeredArea', description: 'שטח דירה רשום', source: 'tabu', required: true },
  { taId: 'TA28', fieldPath: 'calc.builtArea', description: 'שטח בנוי (מערך)', source: 'permit', required: true },
  { taId: 'TA29', fieldPath: 'attachments.summary', description: 'הצמדות', source: 'tabu', required: false },
  { taId: 'TA30', fieldPath: 'rights.ownershipType', description: 'סוג הבעלות', source: 'tabu', required: true },
  { taId: 'TA31', fieldPath: 'tabu.extractDate', description: 'מתי הופק נסח טאבו', source: 'tabu', required: true },
  { taId: 'TA32', fieldPath: 'branding.footer', description: 'פוטר ממותג', source: 'system', required: false },
  
  // Chapter 1 - Property Description
  { taId: 'TA33', fieldPath: 'chapter1.title', description: 'פרק 1 תיאור הנכס והסביבה', source: 'system', required: true },
  { taId: 'TA34', fieldPath: 'ai.neighborhoodDesc', description: 'תיאור סביבה', source: 'ai', required: false },
  { taId: 'TA35', fieldPath: 'media.govmapScreenshot', description: 'סקרין שוט GOVMAP', source: 'manual', required: false },
  { taId: 'TA36', fieldPath: 'branding.footer', description: 'פוטר', source: 'system', required: false },
  { taId: 'TA37', fieldPath: 'chapter1.section12.title', description: 'סעיף 1.2', source: 'system', required: true },
  { taId: 'TA38', fieldPath: 'ai.parcelDesc', description: 'תיאור חלקה', source: 'ai', required: false },
  { taId: 'TA39', fieldPath: 'ai.buildingDesc', description: 'תיאור הבית', source: 'ai', required: false },
  { taId: 'TA40', fieldPath: 'media.gisScreenshot1', description: 'תצ"א', source: 'manual', required: false },
  { taId: 'TA41', fieldPath: 'media.gisScreenshot2', description: 'תצ"א 2', source: 'manual', required: false },
  { taId: 'TA42', fieldPath: 'section.boundariesHeader', description: 'גבולות החלקה', source: 'system', required: true },
  { taId: 'TA43', fieldPath: 'parcel.boundaryNorth', description: 'תיאור חופשי - צפון', source: 'manual', required: false },
  { taId: 'TA44', fieldPath: 'parcel.boundarySouth', description: 'תיאור חופשי - דרום', source: 'manual', required: false },
  { taId: 'TA45', fieldPath: 'parcel.boundaryEast', description: 'תיאור חופשי - מזרח', source: 'manual', required: false },
  { taId: 'TA46', fieldPath: 'parcel.boundaryWest', description: 'תיאור חופשי - מערב', source: 'manual', required: false },
  { taId: 'TA47', fieldPath: 'ai.photoAnalysis', description: 'ניתוח תמונות', source: 'ai', required: false },
  { taId: 'TA48', fieldPath: 'branding.footer', description: 'פוטר', source: 'system', required: false },
  { taId: 'TA49', fieldPath: 'media.interiorPhotos', description: 'תמונות פנימיות', source: 'manual', required: false },
  { taId: 'TA50', fieldPath: 'planning.localAuthority', description: 'שם הוועדה המקומית', source: 'permit', required: false },
  { taId: 'TA51', fieldPath: 'permits[0]', description: 'היתר בנייה 1', source: 'permit', required: false },
  { taId: 'TA52', fieldPath: 'permits[1]', description: 'היתר בנייה 2', source: 'permit', required: false },
  { taId: 'TA53', fieldPath: 'media.garmushkaScreenshot', description: 'גרמושקה', source: 'manual', required: false },
  
  // Chapter 2 - Legal
  { taId: 'TA55', fieldPath: 'chapter2.title', description: 'פרק 2 מצב משפטי', source: 'system', required: true },
  { taId: 'TA56', fieldPath: 'tabu.registrarOffice', description: 'לשכת רישום', source: 'tabu', required: true },
  { taId: 'TA57', fieldPath: 'parcel.legalOverview', description: 'פרטים כלליים', source: 'tabu', required: true },
  { taId: 'TA58', fieldPath: 'section.subparcelLegal', description: 'פרטים על תת חלקה', source: 'system', required: true },
  { taId: 'TA59', fieldPath: 'subparcel.legalDesc', description: 'תיאור הדירה', source: 'tabu', required: true },
  { taId: 'TA60', fieldPath: 'attachments[]', description: 'הצמדות', source: 'tabu', required: false },
  { taId: 'TA61', fieldPath: 'ownerships[]', description: 'בעלויות', source: 'tabu', required: false },
  { taId: 'TA62', fieldPath: 'mortgages[]', description: 'משכנתאות', source: 'tabu', required: false },
  { taId: 'TA63', fieldPath: 'notes[]', description: 'הערות', source: 'tabu', required: false },
  { taId: 'TA64', fieldPath: 'condo.orderDate', description: 'צו בית משותף - תאריך', source: 'condo', required: false },
  { taId: 'TA65', fieldPath: 'condo.buildingDesc', description: 'תיאור הבית המשותף', source: 'condo', required: false },
  { taId: 'TA66', fieldPath: 'condo.subparcelDesc', description: 'תיאור תת החלקה', source: 'condo', required: false },
  { taId: 'TA67', fieldPath: 'media.condoScreenshots', description: 'תשריטים מצו', source: 'manual', required: false },
  { taId: 'TA68', fieldPath: 'section.legalDisclaimer', description: 'הסתייגות', source: 'system', required: true },
  
  // Chapter 3 - Planning
  { taId: 'TA69', fieldPath: 'chapter3.title', description: 'פרק 3 מידע תכנוני', source: 'system', required: true },
  { taId: 'TA70', fieldPath: 'planning.schemes[]', description: 'טבלת תוכניות', source: 'manual', required: true, validation: 'min_rows:4' },
  { taId: 'TA71', fieldPath: 'planning.rightsSummary', description: 'ריכוז זכויות', source: 'permit', required: true },
  { taId: 'TA72', fieldPath: 'media.zoningDiagram', description: 'תשריט תב"ע', source: 'manual', required: false },
  { taId: 'TA73', fieldPath: 'chapter4.title', description: 'פרק 4 גורמים', source: 'system', required: true },
  
  // Chapter 4 - Factors (TA74-89 are bullets)
  { taId: 'TA74', fieldPath: 'factors.environmentSection', description: 'הסביבה והנכס', source: 'system', required: true },
  { taId: 'TA75', fieldPath: 'factors.locationBullet', description: 'מיקום הנכס', source: 'system', required: true },
  { taId: 'TA76', fieldPath: 'factors.subjectBullet', description: 'נשוא חוות הדעת', source: 'system', required: true },
  { taId: 'TA77', fieldPath: 'factors.areaBullet', description: 'שטח הדירה', source: 'system', required: true },
  { taId: 'TA78', fieldPath: 'factors.rightsSection', description: 'מצב הזכויות', source: 'system', required: true },
  { taId: 'TA79', fieldPath: 'factors.ownershipBullet', description: 'הזכויות בנכס', source: 'system', required: true },
  { taId: 'TA80', fieldPath: 'factors.identificationBullet', description: 'הדירה זוהתה', source: 'system', required: true },
  { taId: 'TA82', fieldPath: 'factors.planningSection', description: 'מצב תכנוני', source: 'system', required: true },
  { taId: 'TA83', fieldPath: 'factors.buildingRightsBullet', description: 'זכויות הבניה', source: 'system', required: true },
  { taId: 'TA84', fieldPath: 'factors.builtComplianceBullet', description: 'הבנוי בפועל', source: 'system', required: true },
  { taId: 'TA85', fieldPath: 'factors.valuationSection', description: 'אומדן השווי', source: 'system', required: true },
  { taId: 'TA86', fieldPath: 'factors.assessmentBullet', description: 'הערכת שווי', source: 'system', required: true },
  { taId: 'TA87', fieldPath: 'factors.pricesBullet', description: 'מחירי נכסים', source: 'system', required: true },
  { taId: 'TA88', fieldPath: 'factors.vatBullet', description: 'המחירים כוללים מע"מ', source: 'system', required: true },
  { taId: 'TA89', fieldPath: 'factors.freeRightsBullet', description: 'הזכויות הוערכו כחופשיות', source: 'system', required: true },
  
  // Chapter 5 - Calculations
  { taId: 'TA90', fieldPath: 'chapter5.title', description: 'פרק 5 תחשיבים', source: 'system', required: true },
  { taId: 'TA91', fieldPath: 'comps[]', description: 'CSV השוואת נכסים', source: 'manual', required: true, validation: 'min_included:3' },
  { taId: 'TA92', fieldPath: 'calc.equivPricePerSqm', description: 'מחיר למ"ר אקו', source: 'system', required: true },
  { taId: 'TA93', fieldPath: 'calc.equivCoefficient', description: 'מקדם אקו', source: 'manual', required: false },
  { taId: 'TA94', fieldPath: 'calc.section52Title', description: 'תחשיב שווי', source: 'system', required: true },
  { taId: 'TA95', fieldPath: 'calc.assetValue', description: 'שווי הנכס', source: 'system', required: true, validation: 'round_to_thousands' },
  { taId: 'TA96', fieldPath: 'calc.propertyDescription', description: 'תיאור הנכס', source: 'manual', required: true },
  { taId: 'TA97', fieldPath: 'calc.vatIncluded', description: 'כולל מע"מ', source: 'system', required: true },
  
  // Chapter 6 - Final Valuation
  { taId: 'TA98', fieldPath: 'valuation.finalValueText', description: 'שווי הנכס במילים', source: 'system', required: true },
  { taId: 'TA99', fieldPath: 'declaration.text', description: 'הצהרה', source: 'system', required: true },
  { taId: 'TA100', fieldPath: 'signature.block', description: 'חתימה', source: 'manual', required: true },
]

// ===== LOCKED HEBREW TEMPLATES (EXACT WORDING) =====
export const LOCKED_HEBREW_TEXT: LockedHebrewText = {
  // Cover
  coverMainTitle: 'אומדן שווי זכויות במקרקעין',
  coverSubtitle: 'דירת מגורים',
  
  // Opening
  openingIntro: 'נתבקשתי לאמוד את שווי הזכויות בנכס שבנדון. לצורך הכנת השומה נערך ביקור בנכס ונערך סקר מחירי שוק, ולהלן חוות הדעת:',
  purposeTitle: 'מטרת חוות הדעת:',
  purposeText: 'שומת מקרקעין בקריטריון של קונה מרצון ומוכר מרצון (שווי שוק).',
  limitationText: 'אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד. שימוש שלא בהתאם לאמור לעיל יעשה לאחר קבלת אישור מראש ובכתב מאת החתום מטה בלבד.',
  
  // Chapters
  chapter1Title: 'פרק 1 – תיאור הנכס והסביבה',
  chapter2Title: 'פרק 2 – מצב משפטי',
  chapter3Title: 'פרק 3 – מידע תכנוני',
  chapter4Title: 'פרק 4 – גורמים ושיקולים באומדן השווי',
  chapter5Title: 'פרק 5 – תחשיבים לאומדן השווי',
  chapter6Title: 'פרק 6 – השומה',
  
  // Chapter 2 Templates
  tabuIntroTemplate: 'תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין {{tabu_meta.registrar_office}}, אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, בתאריך {{tabu_meta.extract_date}}.\n\nחלקה {{parcel.number}} בגוש {{parcel.block}}, בשטח קרקע רשום של {{parcel.area_sqm}} מ"ר.',
  
  subparcelDescTemplate: 'תת חלקה {{subparcel.number}}, דירה בקומה {{subparcel.floor}}, במבנה {{subparcel.building_number}}, בשטח רשום של {{subparcel.registered_area_sqm}} מ"ר{{#if subparcel.additional_areas}} (שטחים נוספים: {{subparcel.additional_areas}}){{/if}}, חלקים ברכוש המשותף: {{subparcel.common_parts}}.',
  
  attachmentTemplate: '{{type}} בשטח {{size_sqm}} מ"ר{{#if symbol}}, המסומנ/ת בתשריט באות {{symbol}}{{/if}}{{#if color}}, בצבע {{color}}{{/if}}.',
  
  ownershipTemplate: '{{owner_name}}, {{id_type}} {{id_number}}, חלק בנכס – {{fraction}}.',
  
  mortgageTemplate: 'משכנתא מדרגה {{rank}} לטובת {{beneficiary}} על סך {{amount_nis}} ₪, חלק בנכס: {{fraction}}, מיום {{date}}.',
  
  noteTemplate: '{{action_type}} מיום {{date}} לטובת {{beneficiary}}{{#if extra}}, {{extra}}{{/if}}.',
  
  legalDisclaimer: 'אין בתיאור המצב המשפטי כדי להוות חוות דעת משפטן. החתום מטה אינו משפטן ואלו הנתונים המשפטיים, שהוצגו בפניו לצורך הכנת חוות הדעת. במידה וקיימים מסמכים שלא הובאו לידיעתו, ייתכן ויהיה בהם כדי לשנות את ההערכה.',
  
  // Chapter 3
  contaminationDefault: 'בחוות דעת זו לא הובאו לידיעת הח"מ ולא הייתה לח"מ סיבה לחשד לקיומם של חומרים מסוכנים או מזהמים. קיומם של חומרים מסוכנים/מזהמים יכול להשפיע על שווי הנכס ו/או לגרור עלויות טיפול ו/או מיגון. השווי בהערכה זו מבוסס על ההנחה כי אין חומרים מזהמים קיימים בנכס או בסביבתו אשר יכולים להשפיע על שווי הנכס. נושא החומרים המזהמים אינו תחת אחריות הח"מ, אשר אינו בעל ידע הדרוש לגילויים של חומרים מזהמים, ונושא זה לא נלקח בחשבון בתחשיב השומה.',
  
  contaminationAlternate: 'לצורך חוות הדעת הובאה לידיעת הח"מ סיבה לחשד לקיומם של חומרים מזהמים/מסוכנים, כדלהלן: {{contamination_note}}. לנוכח כך, אין בהערכה זו הנחה בדבר היעדר חומרים מזהמים, והשמאי ממליץ לשקול חוות דעת ייעודית/בדיקה סביבתית.',
  
  // Chapter 4
  considerationsIntro: 'באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:',
  
  // Chapter 5
  comparablesIntro: 'הובאו בחשבון נתוני עסקאות מכר של דירות וותיקות בסביבת הנכס נשוא חוות הדעת, עפ"י דיווחים במערכת מידע-נדל"ן של רשות המיסים ומידע משלים מתוך היתרי הבניה הסרוקים במערכת המידע ההנדסי של עיריית {{city}}, תוך מתן התאמות נדרשות לנשוא חוות הדעת (כגון: רמת גמר, מיקום, שוליות ועוד):',
  
  calculationIntro: 'בשים לב לנתוני השוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, שווי מ"ר בנוי אקו\' לנכס נשוא השומה מוערך כ-₪{{calc.eq_psm}}.',
  
  vatIncluded: 'השווי כולל מע"מ.',
  
  // Chapter 6
  finalValuationTemplate: 'בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל, ובהביאי בחשבון שווים של נכסים דומים רלוונטיים, שווי הנכס בגבולות ‎{{asset_value_num}}‎ ₪ (‎{{asset_value_txt}}‎).',
  
  currentStateText: 'הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.',
  
  declarationText: 'הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה. הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.',
  
  signatureIntro: 'ולראיה באנו על החתום,',
}

// ===== SECTION VISIBILITY RULES =====
export const SECTION_VISIBILITY_RULES = {
  // These sections should NOT appear if their data is empty
  hideIfEmpty: [
    'attachments', // TA29, TA60 - No "הצמדות" header if no attachments
    'mortgages', // TA62 - No "משכנתאות" if none
    'notes', // TA63 - No "הערות" if none
    'condo', // TA64-67 - Entire 2.2 section if no condo order
  ],
  
  // These are always shown (even if empty/placeholder)
  alwaysShow: [
    'purpose', // TA18
    'limitation', // TA19
    'declaration', // TA99
    'vatIncluded', // TA97
  ]
}

// ===== VALIDATION RULES =====
export const VALIDATION_RULES: ValidationRules = {
  required: [
    'TA2', 'TA3', 'TA4', 'TA6', 'TA10', 'TA11', 'TA12', 'TA20', 'TA21',
    'TA23', 'TA24', 'TA25', 'TA26', 'TA27', 'TA28', 'TA30', 'TA31',
    'TA56', 'TA59', 'TA70', 'TA71', 'TA91', 'TA92', 'TA95', 'TA96',
    'TA98', 'TA99', 'TA100'
  ],
  
  blocking: [
    'TA10', // Client name
    'TA20', // Visit date
    'TA24', // Block
    'TA25', // Parcel
    'TA26', // Sub-parcel
    'TA27', // Registered area
    'TA28', // Built area
    'TA91', // Comparables (min 3)
  ],
  
  dateValidations: [
    { taId: 'TA11', rule: 'not_future' },
    { taId: 'TA20', rule: 'not_future' },
    { taId: 'TA21', rule: 'requires_reason_if_override' },
  ],
  
  minLengthValidations: [
    { taId: 'TA10', minLength: 3 },
  ],
}

