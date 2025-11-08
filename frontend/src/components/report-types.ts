export type ValueSource =
  | 'ocr:tabu'
  | 'ocr:condo_order'
  | 'manual:step1'
  | 'manual:step2'
  | 'ai:neighborhood'
  | 'system:fixed'

export type ValidationStatus = 'valid' | 'warning' | 'error'

export interface TaggedValue<T = string> {
  value: T
  source: ValueSource
  status: ValidationStatus
  confidence?: number
  note?: string
}

export interface ReportOwner {
  name: string
  idType: string
  idNumber: string
  share: string
  source: ValueSource
}

export interface ReportAttachment {
  description: string
  area?: string
  planLetter?: string
  color?: string
  source: ValueSource
}

export interface PlanningPlanRow {
  planNumber: string
  name: string
  status: string
  publicationDate: string
  source: ValueSource
}

export interface PermitEntry {
  number: string
  date: string
  description: string
  hasCompletionCertificate?: boolean
  source: ValueSource
}

export interface ComparableEntry {
  saleDate: string
  address: string
  blockParcel: string
  rooms: string
  floor: string
  builtArea: string
  yearBuilt: string
  price: string
  pricePerSqm: string
  included: boolean
  source: ValueSource
}

export interface ReportAnalytics {
  count?: number
  averagePrice?: string
  medianPrice?: string
  stdDev?: string
  minPrice?: string
  maxPrice?: string
}

export interface ReportData {
  documentTitle: TaggedValue
  address: TaggedValue
  street: TaggedValue
  houseNumber: TaggedValue
  neighborhood: TaggedValue
  city: TaggedValue
  clientName: TaggedValue
  inspectionDate: TaggedValue
  valuationDate: TaggedValue
  referenceNumber: TaggedValue
  purpose: TaggedValue
  limitation: TaggedValue
  block: TaggedValue
  parcel: TaggedValue
  registeredParcelArea: TaggedValue
  constructionYear: TaggedValue
  floors: TaggedValue
  totalUnits: TaggedValue
  boundaries: {
    north?: TaggedValue
    south?: TaggedValue
    east?: TaggedValue
    west?: TaggedValue
  }
  subParcel: TaggedValue
  propertyEssence: TaggedValue
  rooms: TaggedValue
  floor: TaggedValue
  aspects?: TaggedValue
  registeredArea: TaggedValue
  builtArea: TaggedValue
  attachmentsSummary?: TaggedValue
  internalLayout?: TaggedValue
  finishLevel?: TaggedValue
  environmentParagraph?: TaggedValue
  mapImage?: string
  mapCaption?: TaggedValue
  lotPlanImage?: string
  lotPlanCaption?: TaggedValue
  propertyPhotos?: Array<{ src: string; caption?: TaggedValue }>
  owners: ReportOwner[]
  legalAttachments: ReportAttachment[]
  sharedBuilding?: {
    orderDate?: TaggedValue
    address?: TaggedValue
    composition?: TaggedValue
    unitDetails?: TaggedValue
    attachments?: ReportAttachment[]
  }
  planningPlans: PlanningPlanRow[]
  planningRights: Array<{ label: string; value: TaggedValue }>
  permits: PermitEntry[]
  contaminationFlag?: TaggedValue<'yes' | 'no'>
  contaminationNote?: TaggedValue
  factors: {
    environmentBullets: string[]
    rightsBullets: string[]
    planningBullets: string[]
    valuationBullets: string[]
  }
  comparables: ComparableEntry[]
  comparablesAnalytics?: ReportAnalytics
  valuationSummary: {
    equivalentValuePerSqm: TaggedValue
    finalValue: TaggedValue
    finalValueText: TaggedValue
  }
  signature?: string
  coverImage?: string
  footerLogo?: string
  headerLogo?: string
  firmName?: string
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
    address?: string
  }
}

export interface ReportValidationIssue {
  id: string
  message: string
  section: string
  level: 'blocking' | 'warning'
}

export interface ReportValidationSummary {
  blockingIssues: ReportValidationIssue[]
  warnings: ReportValidationIssue[]
}

export interface RenderOptions {
  mode?: 'preview' | 'export'
  showPlaceholders?: boolean
  highlightIssues?: boolean
  validation?: ReportValidationSummary
}

