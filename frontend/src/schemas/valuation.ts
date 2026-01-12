/**
 * Zod Validation Schemas for Valuation Data
 *
 * Runtime validation to catch data shape issues before they reach the database.
 * Use these schemas at API boundaries (before save, after load).
 */

import { z } from "zod";

// =============================================================================
// NESTED OBJECT SCHEMAS
// =============================================================================

export const OwnerSchema = z.object({
  name: z.string().optional(),
  idNumber: z.string().optional(),
  ownershipShare: z.string().optional(),
});

export const MortgageSchema = z.object({
  rank: z.string().optional(),
  share: z.string().optional(),
  amount: z.number().optional(),
  essence: z.string().optional(),
  lenders: z.string().optional(),
  borrowers: z.string().optional(),
  registrationDate: z.string().optional(),
});

export const AttachmentSchema = z.object({
  type: z.string().optional(),
  area: z.number().optional(),
  color: z.string().optional(),
  symbol: z.string().optional(),
  description: z.string().optional(),
});

export const AdditionalAreaSchema = z.object({
  type: z.string().optional(),
  area: z.number().optional(),
});

export const RoomAnalysisSchema = z.object({
  roomType: z.string(),
  sizeEstimate: z.string(),
  features: z.string(),
  condition: z.string(),
});

export const BuildingInfoSchema = z.object({
  buildingNumber: z.string().optional(),
  address: z.string().optional(),
  floors: z.string().optional(),
  subPlotsCount: z.string().optional(),
});

export const SpecificSubPlotSchema = z.object({
  number: z.string().optional(),
  floor: z.string().optional(),
  area: z.string().optional(),
  description: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  sharedPropertyParts: z.string().optional(),
});

export const PlanningRightsSchema = z.object({
  usage: z.string().optional(),
  minLotSize: z.union([z.string(), z.number()]).optional(),
  buildPercentage: z.union([z.string(), z.number()]).optional(),
  maxFloors: z.union([z.string(), z.number()]).optional(),
  maxUnits: z.union([z.string(), z.number()]).optional(),
  buildingLines: z.string().optional(),
});

export const PlanningPlanSchema = z.object({
  name: z.string().optional(),
  number: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});

export const PlanningInformationSchema = z.object({
  rights: PlanningRightsSchema.optional(),
  plans: z.array(PlanningPlanSchema).optional(),
});

// =============================================================================
// ANALYSIS SCHEMAS
// =============================================================================

export const PropertyAnalysisSchema = z.object({
  buildingAge: z.string(),
  buildingCondition: z.string(),
  neighborhoodRating: z.string(),
  accessibility: z.string(),
  publicTransport: z.string(),
  schools: z.string(),
  shopping: z.string(),
});

export const MarketAnalysisSchema = z.object({
  averagePricePerSqm: z.number(),
  estimatedValue: z.number().optional(),
  priceRange: z.string(),
  marketTrend: z.string(),
  demandLevel: z.string(),
  competition: z.string(),
});

export const RiskAssessmentSchema = z.object({
  legalRisks: z.string(),
  marketRisks: z.string(),
  environmentalRisks: z.string(),
  overallRisk: z.string(),
});

export const ComparableDataAnalysisSchema = z
  .object({
    averagePricePerSqm: z.number().optional(),
    medianPricePerSqm: z.number().optional(),
    adjustmentFactor: z.number().optional(),
    section52: z
      .object({
        finalPricePerSqm: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// =============================================================================
// GIS & MEASUREMENT SCHEMAS
// =============================================================================

export const GISCoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
  lat: z.number(),
  lng: z.number(),
});

export const GISAnalysisSchema = z.object({
  coordinates: GISCoordinatesSchema,
  govmapUrls: z.object({
    cropMode0: z.string(),
    cropMode1: z.string(),
  }),
  extractedAt: z.string(),
  status: z.string(),
  confidence: z.number().optional(),
  address: z.string().optional(),
});

export const GISScreenshotsSchema = z.object({
  wideArea: z.string().optional(),
  zoomedNoTazea: z.string().optional(),
  zoomedWithTazea: z.string().optional(),
  cropMode0: z.string().optional(),
  cropMode1: z.string().optional(),
});

export const GarmushkaMeasurementSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["calibration", "polyline", "polygon"]),
  measurement: z.string(),
  notes: z.string(),
  color: z.string(),
});

export const GarmushkaMeasurementsSchema = z.object({
  measurementTable: z.array(GarmushkaMeasurementSchema),
  metersPerPixel: z.number(),
  unitMode: z.enum(["metric", "imperial"]),
  isCalibrated: z.boolean(),
  fileName: z.string(),
  pngExport: z.string().optional(),
});

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

export const CustomTableSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  sectionId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const StructuredFootnoteSchema = z.object({
  id: z.string(),
  pageNumber: z.number(),
  footnoteNumber: z.number(),
  text: z.string(),
});

export const ComparablePropertySchema = z
  .object({
    id: z.string().optional(),
    address: z.string().optional(),
    gush: z.string().optional(),
    chelka: z.string().optional(),
    subChelka: z.string().optional(),
    rooms: z.number().optional(),
    floor: z.number().optional(),
    area: z.number().optional(),
    constructionYear: z.number().optional(),
    saleDate: z.string().optional(),
    declaredPrice: z.number().optional(),
    pricePerSqm: z.number().optional(),
    distance: z.number().optional(),
    adjustmentFactor: z.number().optional(),
    adjustedPricePerSqm: z.number().optional(),
  })
  .passthrough();

export const UploadSchema = z
  .object({
    id: z.string().optional(),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    fileUrl: z.string().optional(),
    uploadedAt: z.string().optional(),
    documentType: z.string().optional(),
  })
  .passthrough();

// =============================================================================
// EXTRACTED DATA SCHEMA
// =============================================================================

export const ExtractedDataSchema = z
  .object({
    // Legal Status - Land Registry
    registrationOffice: z.string().optional(),
    gush: z.union([z.string(), z.number()]).optional(),
    chelka: z.union([z.string(), z.number()]).optional(),
    subParcel: z.union([z.string(), z.number()]).optional(),
    ownershipType: z.string().optional(),
    attachments: z.union([z.string(), z.array(AttachmentSchema)]).optional(),
    attachmentsArea: z.number().optional(),
    attachmentsDescription: z.string().optional(),
    sharedAreas: z.string().optional(),
    sharedProperty: z.string().optional(),
    buildingRights: z.string().optional(),
    permittedUse: z.string().optional(),

    // Building Details
    buildingYear: z.string().optional(),
    floor: z.string().optional(),
    builtArea: z.string().optional(),
    registeredArea: z.number().optional(),
    apartmentRegisteredArea: z.number().optional(),
    balconyArea: z.number().optional(),
    buildingDescription: z.string().optional(),
    buildingNumber: z.string().optional(),
    buildingsCount: z.number().optional(),
    unitDescription: z.string().optional(),

    // Property Characteristics
    propertyCondition: z.string().optional(),
    finishLevel: z.string().optional(),

    // Owners
    owners: z.array(OwnerSchema).optional(),
    ownersCount: z.number().optional(),
    rights: z.string().optional(),

    // Mortgages
    mortgages: z.array(MortgageSchema).optional(),
    mortgageRank: z.string().optional(),
    mortgageAmount: z.number().optional(),
    mortgageEssence: z.string().optional(),
    mortgageLenders: z.string().optional(),
    mortgageBorrowers: z.string().optional(),
    mortgagePropertyShare: z.string().optional(),

    // Easements
    easementsEssence: z.string().optional(),
    easementsDescription: z.string().optional(),

    // Notes
    plotNotes: z.string().optional(),
    notesActionType: z.string().optional(),
    notesBeneficiary: z.string().optional(),

    // Additional Areas
    additionalAreas: z.array(AdditionalAreaSchema).optional(),

    // Document Info
    issueDate: z.string().optional(),
    tabuExtractDate: z.string().optional(),
    documentType: z.string().optional(),
    addressFromTabu: z.string().optional(),

    // Sub Plots
    subPlotsCount: z.number().optional(),

    // Building Permit
    permitNumber: z.string().optional(),
    permitDate: z.string().optional(),
    permittedUsage: z.string().optional(),
    permittedDescription: z.string().optional(),
    permitIssueDate: z.string().optional(),
    localCommitteeName: z.string().optional(),
    propertyAddress: z.string().optional(),

    // Shared Building Order
    orderIssueDate: z.string().optional(),
    buildingFloors: z.string().optional(),
    buildingSubPlotsCount: z.string().optional(),
    totalSubPlots: z.string().optional(),
    buildingAddress: z.string().optional(),
    allAddresses: z.array(z.string()).optional(),
    buildingsInfo: z.array(BuildingInfoSchema).optional(),
    city: z.string().optional(),
    specificSubPlot: SpecificSubPlotSchema.optional(),

    // Confidence
    confidence: z.number().optional(),

    // Image Analysis - Interior
    propertyLayoutDescription: z.string().optional(),
    roomAnalysis: z.array(RoomAnalysisSchema).optional(),
    conditionAssessment: z.string().optional(),

    // Image Analysis - Exterior
    buildingCondition: z.string().optional(),
    buildingFeatures: z.string().optional(),
    buildingType: z.string().optional(),
    overallAssessment: z.string().optional(),

    // Comparable Sales
    averagePricePerSqm: z.string().optional(),
    medianPricePerSqm: z.string().optional(),
    adjustmentFactor: z.string().optional(),

    // Planning Information
    planningInformation: PlanningInformationSchema.optional(),
    planningRights: PlanningRightsSchema.optional(),
  })
  .passthrough(); // Allow additional fields for backward compatibility

// =============================================================================
// MAIN VALUATION DATA SCHEMA
// =============================================================================

export const ValuationDataSchema = z.object({
  // Basic Property Information
  street: z.string(),
  buildingNumber: z.string(),
  city: z.string(),
  neighborhood: z.string(),
  fullAddress: z.string(),
  rooms: z.number(),
  floor: z.number(),
  airDirections: z.union([z.string(), z.number()]).optional(),
  area: z.number(),
  propertyEssence: z.string(),

  // Cover Page Fields
  clientName: z.string(),
  clientTitle: z.string().optional(),
  clientNote: z.string().optional(),
  clientRelation: z.string().optional(),
  visitDate: z.string().optional(),
  valuationDate: z.string(),
  valuationEffectiveDate: z.string(),
  referenceNumber: z.string().optional(),
  shamayName: z.string(),
  shamaySerialNumber: z.string(),
  valuationType: z.string().optional(),
  appraiserLicenseNumber: z.string().optional(),

  // Land Contamination
  landContamination: z.boolean().optional(),
  landContaminationNote: z.string().optional(),

  // Legal Status Fields
  gush: z.string().optional(),
  parcel: z.string().optional(),
  parcelArea: z.number().optional(),
  parcelShape: z.string().optional(),
  parcelSurface: z.string().optional(),
  subParcel: z.string().optional(),
  registeredArea: z.number().optional(),
  builtArea: z.number().optional(),
  balconyArea: z.number().optional(),
  apartmentSqm: z.number().optional(),
  buildingPermitNumber: z.string().optional(),
  buildingPermitDate: z.string().optional(),
  buildingDescription: z.string().optional(),
  buildingFloors: z.number().optional(),
  buildingUnits: z.number().optional(),
  buildingDetails: z.string().optional(),
  constructionSource: z.string().optional(),
  attachments: z.string().optional(),
  ownershipRights: z.string().optional(),
  notes: z.string().optional(),

  // Registry Information
  registryOffice: z.string().optional(),
  extractDate: z.string().optional(),

  // Property Description Fields
  internalLayout: z.string().optional(),
  finishStandard: z.string().optional(),
  finishDetails: z.string().optional(),

  // Document Uploads - File objects can't be validated by Zod (runtime only)
  propertyImages: z.array(z.any()),
  selectedImageIndex: z.number(),
  selectedImagePreview: z.string().nullable(),
  interiorImages: z.array(z.string()),

  // Signature
  signature: z.any().nullable(),
  signaturePreview: z.string().nullable(),

  // Analysis Data
  propertyAnalysis: PropertyAnalysisSchema.optional(),
  marketAnalysis: MarketAnalysisSchema.optional(),
  comparableDataAnalysis: ComparableDataAnalysisSchema.optional(),
  comparableAnalysis: ComparableDataAnalysisSchema.optional(),
  riskAssessment: RiskAssessmentSchema.optional(),
  recommendations: z.array(z.string()).optional(),

  // Extracted Data from Documents
  extractedData: ExtractedDataSchema.optional(),

  // Calculations
  comparableData: z.array(ComparablePropertySchema),
  finalValuation: z.number(),
  pricePerSqm: z.number(),

  // Status
  isComplete: z.boolean(),
  sessionId: z.string().optional(),

  // Uploads
  uploads: z.array(UploadSchema).optional(),

  // GIS Analysis
  gisAnalysis: GISAnalysisSchema.optional(),
  gisScreenshots: GISScreenshotsSchema.optional(),

  // Garmushka Measurements
  garmushkaMeasurements: GarmushkaMeasurementsSchema.optional(),

  // Custom Tables (uploaded CSV)
  customTables: z.array(CustomTableSchema).optional(),

  // Custom Document Edits
  customDocumentEdits: z.record(z.string()).optional(),

  // Structured Footnotes
  structuredFootnotes: z.array(StructuredFootnoteSchema).optional(),
});

// =============================================================================
// PARTIAL SCHEMA (for updates)
// =============================================================================

export const PartialValuationDataSchema = ValuationDataSchema.partial();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export type ValidatedValuationData = z.infer<typeof ValuationDataSchema>;
export type ValidatedPartialValuationData = z.infer<
  typeof PartialValuationDataSchema
>;

/**
 * Validate complete valuation data (e.g., before final export)
 * Throws ZodError if validation fails
 */
export function validateValuationData(data: unknown): ValidatedValuationData {
  return ValuationDataSchema.parse(data);
}

/**
 * Validate partial valuation data (e.g., for updates)
 * Throws ZodError if validation fails
 */
export function validatePartialValuationData(
  data: unknown,
): ValidatedPartialValuationData {
  return PartialValuationDataSchema.parse(data);
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidateValuationData(data: unknown): {
  success: boolean;
  data?: ValidatedValuationData;
  error?: z.ZodError;
} {
  const result = ValuationDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Safe validation for partial data
 */
export function safeValidatePartialValuationData(data: unknown): {
  success: boolean;
  data?: ValidatedPartialValuationData;
  error?: z.ZodError;
} {
  const result = PartialValuationDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Extract validation errors in a readable format
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join(".");
    return `${path}: ${err.message}`;
  });
}

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

export const SaveValuationRequestSchema = z.object({
  action: z.literal("save_to_db"),
  sessionId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  valuationData: PartialValuationDataSchema,
});

export const LoadValuationRequestSchema = z.object({
  action: z.literal("load_from_db"),
  sessionId: z.string(),
});

export const SaveGISDataRequestSchema = z.object({
  action: z.literal("save_gis_data"),
  sessionId: z.string(),
  gisData: z
    .object({
      screenshots: GISScreenshotsSchema.optional(),
      analysis: GISAnalysisSchema.optional(),
    })
    .passthrough(),
});

export const SaveGarmushkaRequestSchema = z.object({
  action: z.literal("save_garmushka"),
  sessionId: z.string(),
  garmushkaData: GarmushkaMeasurementsSchema,
});

export const SaveFinalResultsRequestSchema = z.object({
  action: z.literal("save_final_results"),
  sessionId: z.string(),
  finalValuation: z.number(),
  pricePerSqm: z.number(),
  comparableData: z.array(ComparablePropertySchema).optional(),
  propertyAnalysis: PropertyAnalysisSchema.optional(),
});

export type SaveValuationRequest = z.infer<typeof SaveValuationRequestSchema>;
export type LoadValuationRequest = z.infer<typeof LoadValuationRequestSchema>;
export type SaveGISDataRequest = z.infer<typeof SaveGISDataRequestSchema>;
export type SaveGarmushkaRequest = z.infer<typeof SaveGarmushkaRequestSchema>;
export type SaveFinalResultsRequest = z.infer<
  typeof SaveFinalResultsRequestSchema
>;
