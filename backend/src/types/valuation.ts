/**
 * Backend Types for Valuation Data
 *
 * These types mirror the frontend types in frontend/src/types/valuation.ts
 * The backend uses snake_case for database columns, but these types use camelCase
 * for consistency. The database layer handles the conversion.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export interface Owner {
  name?: string;
  idNumber?: string;
  ownershipShare?: string;
}

export interface Mortgage {
  rank?: string;
  share?: string;
  amount?: number;
  essence?: string;
  lenders?: string;
  borrowers?: string;
  registrationDate?: string;
}

export interface Attachment {
  type?: string;
  area?: number;
  color?: string;
  symbol?: string;
  description?: string;
}

export interface AdditionalArea {
  type?: string;
  area?: number;
}

export interface RoomAnalysis {
  roomType?: string;
  sizeEstimate?: string;
  features?: string;
  condition?: string;
  room_type?: string;
  size_estimate?: string;
}

export interface BuildingInfo {
  buildingNumber?: string;
  address?: string;
  floors?: string;
  subPlotsCount?: string;
}

export interface SpecificSubPlot {
  number?: string;
  floor?: string;
  area?: string;
  description?: string;
  attachments?: string[];
  sharedPropertyParts?: string;
}

export interface PlanningRights {
  usage?: string;
  minLotSize?: string | number;
  buildPercentage?: string | number;
  maxFloors?: string | number;
  maxUnits?: string | number;
  buildingLines?: string;
}

export interface PlanningPlan {
  name?: string;
  number?: string;
  date?: string;
  status?: string;
  description?: string;
}

export interface PlanningInformation {
  rights?: PlanningRights;
  plans?: PlanningPlan[];
}

// =============================================================================
// ANALYSIS TYPES
// =============================================================================

export interface PropertyAnalysis {
  buildingAge: string;
  buildingCondition: string;
  neighborhoodRating: string;
  accessibility: string;
  publicTransport: string;
  schools: string;
  shopping: string;
}

export interface MarketAnalysis {
  averagePricePerSqm: number;
  estimatedValue?: number;
  priceRange: string;
  marketTrend: string;
  demandLevel: string;
  competition: string;
}

export interface RiskAssessment {
  legalRisks: string;
  marketRisks: string;
  environmentalRisks: string;
  overallRisk: string;
}

export interface ComparableDataAnalysis {
  averagePricePerSqm?: number;
  medianPricePerSqm?: number;
  adjustmentFactor?: number;
  section52?: {
    finalPricePerSqm?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// =============================================================================
// GIS & MEASUREMENT TYPES
// =============================================================================

export interface GISCoordinates {
  x: number;
  y: number;
  lat: number;
  lng: number;
}

export interface GISAnalysis {
  coordinates: GISCoordinates;
  govmapUrls: {
    cropMode0: string;
    cropMode1: string;
  };
  extractedAt: string;
  status: string;
  confidence?: number;
  address?: string;
}

export interface GISScreenshots {
  wideArea?: string;
  zoomedNoTazea?: string;
  zoomedWithTazea?: string;
  cropMode0?: string;
  cropMode1?: string;
}

export interface GarmushkaMeasurement {
  id: string;
  name: string;
  type: "calibration" | "polyline" | "polygon";
  measurement: string;
  notes: string;
  color: string;
}

export interface GarmushkaMeasurements {
  measurementTable: GarmushkaMeasurement[];
  metersPerPixel: number;
  unitMode: "metric" | "imperial";
  isCalibrated: boolean;
  fileName: string;
  pngExport?: string;
}

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

export interface CustomTable {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  sectionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredFootnote {
  id: string;
  pageNumber: number;
  footnoteNumber: number;
  text: string;
}

export interface ComparableProperty {
  id?: string;
  address?: string;
  gush?: string;
  chelka?: string;
  subChelka?: string;
  rooms?: number;
  floor?: number;
  area?: number;
  constructionYear?: number;
  saleDate?: string;
  declaredPrice?: number;
  pricePerSqm?: number;
  distance?: number;
  adjustmentFactor?: number;
  adjustedPricePerSqm?: number;
  sale_date?: string;
  price?: number;
  price_per_sqm?: number;
  construction_year?: number;
  declared_price?: number;
  adjustment_factor?: number;
  adjusted_price_per_sqm?: number;
  [key: string]: unknown;
}

// =============================================================================
// EXTRACTED DATA (from OCR/AI)
// =============================================================================

export interface ExtractedData {
  registrationOffice?: string;
  gush?: string | number;
  chelka?: string | number;
  subParcel?: string | number;
  ownershipType?: string;
  attachments?: string | Attachment[];
  attachmentsArea?: number;
  attachmentsDescription?: string;
  sharedAreas?: string;
  sharedProperty?: string;
  buildingRights?: string;
  permittedUse?: string;
  buildingYear?: string;
  floor?: string;
  builtArea?: string;
  registeredArea?: number;
  apartmentRegisteredArea?: number;
  balconyArea?: number;
  buildingDescription?: string;
  buildingNumber?: string;
  buildingsCount?: number;
  unitDescription?: string;
  propertyCondition?: string;
  finishLevel?: string;
  owners?: Owner[];
  ownersCount?: number;
  rights?: string;
  mortgages?: Mortgage[];
  mortgageRank?: string;
  mortgageAmount?: number;
  mortgageEssence?: string;
  mortgageLenders?: string;
  mortgageBorrowers?: string;
  mortgagePropertyShare?: string;
  easementsEssence?: string;
  easementsDescription?: string;
  plotNotes?: string;
  notesActionType?: string;
  notesBeneficiary?: string;
  additionalAreas?: AdditionalArea[];
  issueDate?: string;
  tabuExtractDate?: string;
  documentType?: string;
  addressFromTabu?: string;
  subPlotsCount?: number;
  permitNumber?: string;
  permitDate?: string;
  permittedUsage?: string;
  permittedDescription?: string;
  permitIssueDate?: string;
  localCommitteeName?: string;
  propertyAddress?: string;
  orderIssueDate?: string;
  buildingFloors?: string;
  buildingSubPlotsCount?: string;
  totalSubPlots?: string;
  buildingAddress?: string;
  allAddresses?: string[];
  buildingsInfo?: BuildingInfo[];
  city?: string;
  specificSubPlot?: SpecificSubPlot;
  confidence?: number;
  propertyLayoutDescription?: string;
  roomAnalysis?: RoomAnalysis[];
  conditionAssessment?: string;
  buildingCondition?: string;
  buildingFeatures?: string;
  buildingType?: string;
  overallAssessment?: string;
  averagePricePerSqm?: string;
  medianPricePerSqm?: string;
  adjustmentFactor?: string;
  planningInformation?: PlanningInformation;
  planningRights?: PlanningRights;
  [key: string]: unknown;
}

// =============================================================================
// MAIN VALUATION DATA INTERFACE
// =============================================================================

export interface ValuationData {
  street: string;
  buildingNumber: string;
  city: string;
  neighborhood: string;
  fullAddress: string;
  rooms: number;
  floor: number;
  airDirections?: string | number;
  area: number;
  propertyEssence: string;
  clientName: string;
  clientTitle?: string;
  clientNote?: string;
  clientRelation?: string;
  visitDate?: string;
  valuationDate: string;
  valuationEffectiveDate: string;
  referenceNumber?: string;
  shamayName: string;
  shamaySerialNumber: string;
  valuationType?: string;
  appraiserLicenseNumber?: string;
  landContamination?: boolean;
  landContaminationNote?: string;
  gush?: string;
  parcel?: string;
  parcelArea?: number;
  parcelShape?: string;
  parcelSurface?: string;
  subParcel?: string;
  registeredArea?: number;
  builtArea?: number;
  balconyArea?: number;
  apartmentSqm?: number;
  buildingPermitNumber?: string;
  buildingPermitDate?: string;
  buildingDescription?: string;
  buildingFloors?: number;
  buildingUnits?: number;
  buildingDetails?: string;
  constructionSource?: string;
  attachments?: string;
  ownershipRights?: string;
  notes?: string;
  registryOffice?: string;
  extractDate?: string;
  internalLayout?: string;
  finishStandard?: string;
  finishDetails?: string;
  propertyAnalysis?: PropertyAnalysis;
  marketAnalysis?: MarketAnalysis;
  comparableDataAnalysis?: ComparableDataAnalysis;
  comparableAnalysis?: ComparableDataAnalysis;
  riskAssessment?: RiskAssessment;
  recommendations?: string[];
  extractedData?: ExtractedData;
  comparableData: ComparableProperty[];
  finalValuation: number;
  pricePerSqm: number;
  isComplete: boolean;
  sessionId?: string;
  uploads?: Upload[];
  gisAnalysis?: GISAnalysis;
  gisScreenshots?: GISScreenshots;
  garmushkaMeasurements?: GarmushkaMeasurements;
  customTables?: CustomTable[];
  customDocumentEdits?: Record<string, string>;
  structuredFootnotes?: StructuredFootnote[];
}

// =============================================================================
// UPLOAD TYPE
// =============================================================================

export interface Upload {
  id?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  uploadedAt?: string;
  documentType?: string;
  [key: string]: unknown;
}

// =============================================================================
// DATABASE OPERATION TYPES
// =============================================================================

export interface SaveShumaParams {
  sessionId: string;
  organizationId: string;
  userId: string;
  valuationData: Partial<ValuationData>;
}

export interface SaveResult {
  success: boolean;
  shumaId?: number;
  valuationId?: number;
  error?: string;
}

export interface LoadResult {
  success: boolean;
  data?: ValuationData;
  error?: string;
}

export interface DatabaseRow {
  [key: string]: unknown;
}
