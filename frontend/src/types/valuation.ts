/**
 * Shared Types for Valuation Data
 *
 * SINGLE SOURCE OF TRUTH - All valuation data types are defined here.
 *
 * Naming Convention: camelCase ONLY (transformation layer handles backend snake_case)
 * Optional fields: Only truly optional fields use ?
 * No duplicate fields: Backend format conversion handled by transformers
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
  // All fields optional during migration - both formats accepted
  roomType?: string;
  sizeEstimate?: string;
  features?: string;
  condition?: string;
  // Backend snake_case aliases (for compatibility during migration)
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
  // Alias for plans (some backends use "schemes")
  schemes?: PlanningPlan[];
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
  // Legacy fields for backward compatibility
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

export interface GarmushkaInjection {
  id: string;
  imageData: string; // Base64 PNG
  position: {
    percentFromTop: number; // 0-100
  };
  useFullImage: boolean;
  createdAt: string;
}

export interface GarmushkaMeasurements {
  measurementTable: GarmushkaMeasurement[];
  metersPerPixel: number;
  unitMode: "metric" | "imperial";
  isCalibrated: boolean;
  fileName: string;
  pngExport?: string;
  injections?: GarmushkaInjection[]; // Multiple images supported
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
  // Backend snake_case aliases (for compatibility)
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
  // Legal Status - Land Registry
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

  // Building Details
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

  // Property Characteristics
  propertyCondition?: string;
  finishLevel?: string;
  parking?: boolean | string;
  elevator?: boolean | string;

  // Owners
  owners?: Owner[];
  ownersCount?: number;
  rights?: string;

  // Mortgages
  mortgages?: Mortgage[];
  mortgageRank?: string;
  mortgageAmount?: number;
  mortgageEssence?: string;
  mortgageLenders?: string;
  mortgageBorrowers?: string;
  mortgagePropertyShare?: string;

  // Easements
  easementsEssence?: string;
  easementsDescription?: string;

  // Notes
  plotNotes?: string;
  notesActionType?: string;
  notesBeneficiary?: string;

  // Additional Areas
  additionalAreas?: AdditionalArea[];

  // Document Info
  issueDate?: string;
  tabuExtractDate?: string;
  documentType?: string;
  addressFromTabu?: string;

  // Sub Plots
  subPlotsCount?: number;

  // Building Permit
  permitNumber?: string;
  permitDate?: string;
  permittedUsage?: string;
  permittedDescription?: string;
  permitIssueDate?: string;
  localCommitteeName?: string;
  propertyAddress?: string;

  // Shared Building Order
  orderIssueDate?: string;
  buildingFloors?: string;
  buildingSubPlotsCount?: string;
  totalSubPlots?: string;
  buildingAddress?: string;
  allAddresses?: string[];
  buildingsInfo?: BuildingInfo[];
  city?: string;
  specificSubPlot?: SpecificSubPlot;

  // Confidence
  confidence?: number;

  // Image Analysis - Interior
  propertyLayoutDescription?: string;
  roomAnalysis?: RoomAnalysis[];
  conditionAssessment?: string;

  // Image Analysis - Exterior
  buildingCondition?: string;
  buildingFeatures?: string;
  buildingType?: string;
  overallAssessment?: string;

  // Comparable Sales
  averagePricePerSqm?: string;
  medianPricePerSqm?: string;
  adjustmentFactor?: string;

  // Planning Information (Chapter 3)
  planningInformation?: PlanningInformation;
  planningRights?: PlanningRights;
  // snake_case aliases for backend compatibility
  planning_information?: PlanningInformation;
  planning_rights?: PlanningRights;
  planning_plans?: PlanningPlan[];
  planningPlans?: PlanningPlan[];

  // Index signature for snake_case field access during migration
  // Backend returns snake_case, this allows flexible access without listing all aliases
  [key: string]: unknown;
}

// =============================================================================
// MAIN VALUATION DATA INTERFACE
// =============================================================================

export interface ValuationData {
  // Basic Property Information
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

  // Cover Page Fields
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

  // Land Contamination
  landContamination?: boolean;
  landContaminationNote?: string;

  // Legal Status Fields
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

  // Registry Information
  registryOffice?: string;
  extractDate?: string;

  // Property Description Fields
  internalLayout?: string;
  finishStandard?: string;
  finishDetails?: string;

  // Document Uploads
  propertyImages: File[];
  selectedImageIndex: number;
  selectedImagePreview: string | null;
  interiorImages: string[];

  // Signature
  signature: File | null;
  signaturePreview: string | null;

  // Analysis Data
  propertyAnalysis?: PropertyAnalysis;
  marketAnalysis?: MarketAnalysis;
  comparableDataAnalysis?: ComparableDataAnalysis;
  comparableAnalysis?: ComparableDataAnalysis; // Alias for backward compatibility
  riskAssessment?: RiskAssessment;
  recommendations?: string[];

  // Extracted Data from Documents
  extractedData?: ExtractedData;

  // Calculations
  comparableData: ComparableProperty[];
  finalValuation: number;
  pricePerSqm: number;

  // Status
  isComplete: boolean;
  sessionId?: string;

  // Uploads
  uploads?: Upload[];

  // GIS Analysis
  gisAnalysis?: GISAnalysis;
  gisScreenshots?: GISScreenshots;

  // Garmushka Measurements
  garmushkaMeasurements?: GarmushkaMeasurements;

  // Custom Tables (uploaded CSV)
  customTables?: CustomTable[];

  // Custom Document Edits
  customDocumentEdits?: Record<string, string>;

  // Structured Footnotes
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
// FUNCTION TYPES
// =============================================================================

export interface SaveOptions {
  skipAutoSave?: boolean;
}

export type UpdateDataFn = (
  updates: Partial<ValuationData>,
  options?: SaveOptions,
) => void;

export interface SaveResult {
  success: boolean;
  valuationId?: number;
  error?: string;
  skipped?: boolean;
}

// =============================================================================
// INITIAL/DEFAULT VALUES
// =============================================================================

export const initialValuationData: ValuationData = {
  street: "",
  buildingNumber: "",
  city: "",
  neighborhood: "",
  fullAddress: "",
  rooms: 0,
  floor: 0,
  airDirections: "",
  area: 0,
  propertyEssence: "",
  landContamination: false,
  landContaminationNote: "",
  clientName: "",
  clientTitle: "",
  clientNote: "",
  clientRelation: "",
  visitDate: "",
  valuationDate: "",
  valuationEffectiveDate: "",
  referenceNumber: "",
  valuationType: "",
  shamayName: "",
  shamaySerialNumber: "",
  appraiserLicenseNumber: "",
  propertyImages: [],
  selectedImageIndex: 0,
  selectedImagePreview: null,
  interiorImages: [],
  signature: null,
  signaturePreview: null,
  comparableData: [],
  finalValuation: 0,
  pricePerSqm: 0,
  isComplete: false,
  uploads: [],
};
