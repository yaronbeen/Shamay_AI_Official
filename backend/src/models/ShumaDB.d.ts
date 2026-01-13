/**
 * Type declarations for ShumaDB
 *
 * This provides TypeScript support for the ShumaDB module
 * without requiring a full rewrite of the 3,200-line JS file.
 */

import {
  ValuationData,
  ExtractedData,
  GISScreenshots,
  GarmushkaMeasurements,
  ComparableProperty,
  PropertyAnalysis,
  SaveResult,
} from "../types/valuation";

export interface ShumaRow {
  id: number;
  session_id: string;
  organization_id: string;
  user_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  // All 69+ columns from shuma table
  [key: string]: unknown;
}

export interface SaveShumaFromSessionParams {
  sessionId: string;
  organizationId: string;
  userId: string;
  valuationData: Partial<ValuationData>;
}

export interface SaveShumaFromSessionResult {
  success: boolean;
  shumaId?: number;
  error?: string;
}

export interface LoadShumaForWizardResult {
  success: boolean;
  data?: ValuationData;
  error?: string;
}

export interface SearchShumasResult {
  success: boolean;
  shumas?: ShumaRow[];
  error?: string;
}

export interface GetShumaByIdResult {
  success: boolean;
  shuma?: ShumaRow;
  error?: string;
}

export interface AIExtractionRecord {
  id: number;
  session_id: string;
  extraction_type: string;
  document_filename?: string;
  extracted_data: Record<string, unknown>;
  confidence_score?: number;
  is_active: boolean;
  created_at: Date;
}

/**
 * Enhanced Shuma Database Client
 */
export class ShumaDBEnhanced {
  /**
   * Save valuation data from a session to the database
   */
  static saveShumaFromSession(
    params: SaveShumaFromSessionParams,
  ): Promise<SaveShumaFromSessionResult>;

  /**
   * Load valuation data for the wizard
   * @param sessionId - The session ID to load
   * @param skipCache - Whether to skip the cache (default: false)
   */
  static loadShumaForWizard(
    sessionId: string,
    skipCache?: boolean,
  ): Promise<ValuationData | null>;

  /**
   * Clear the cache for a session
   */
  static clearShumaCache(sessionId: string): void;

  /**
   * Save GIS data (screenshots and analysis)
   */
  static saveGISData(
    sessionId: string,
    gisData: GISScreenshots,
  ): Promise<SaveResult>;

  /**
   * Save Garmushka measurement data
   */
  static saveGarmushkaData(
    sessionId: string,
    garmushkaData: GarmushkaMeasurements,
  ): Promise<SaveResult>;

  /**
   * Delete Garmushka data for a session
   */
  static deleteGarmushkaData(sessionId: string): Promise<SaveResult>;

  /**
   * Save building permit extraction data
   */
  static savePermitExtraction(
    sessionId: string,
    permitData: ExtractedData,
    documentFilename?: string,
  ): Promise<SaveResult>;

  /**
   * Save land registry extraction data
   */
  static saveLandRegistryExtraction(
    sessionId: string,
    landRegistryData: ExtractedData,
    documentFilename?: string,
  ): Promise<SaveResult>;

  /**
   * Save shared building order extraction data
   */
  static saveSharedBuildingExtraction(
    sessionId: string,
    sharedBuildingData: ExtractedData,
    documentFilename?: string,
  ): Promise<SaveResult>;

  /**
   * Get all extracted data for a session
   */
  static getAllExtractedData(
    sessionId: string,
  ): Promise<{ success: boolean; data?: ExtractedData; error?: string }>;

  /**
   * Search shumas for an organization
   */
  static searchShumas(
    organizationId: string,
    search?: string,
    status?: string,
  ): Promise<SearchShumasResult>;

  /**
   * Get a shuma by ID
   */
  static getShumaById(shumaId: number): Promise<GetShumaByIdResult>;

  /**
   * Save AI extraction data
   */
  static saveAIExtraction(
    sessionId: string,
    extractionType: string,
    extractedData: Record<string, unknown>,
    documentFilename?: string,
    confidenceScore?: number,
  ): Promise<SaveResult>;

  /**
   * Get AI extractions for a session
   */
  static getAIExtractions(
    sessionId: string,
    extractionType?: string,
  ): Promise<{
    success: boolean;
    extractions?: AIExtractionRecord[];
    error?: string;
  }>;

  /**
   * Get the latest AI extraction for a session and type
   */
  static getLatestAIExtraction(
    sessionId: string,
    extractionType: string,
  ): Promise<{
    success: boolean;
    extraction?: AIExtractionRecord;
    error?: string;
  }>;

  /**
   * Deactivate an AI extraction
   */
  static deactivateAIExtraction(extractionId: number): Promise<SaveResult>;

  /**
   * Restore a previous AI extraction
   */
  static restoreAIExtraction(
    sessionId: string,
    extractionId: number,
  ): Promise<SaveResult>;

  /**
   * Save final valuation results
   */
  static saveFinalResults(
    sessionId: string,
    finalValuation: number,
    pricePerSqm: number,
    comparableData: ComparableProperty[],
    propertyAnalysis: PropertyAnalysis | null,
  ): Promise<SaveResult>;
}

/**
 * Database utility object
 */
export const db: {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  getClient: () => Promise<{
    query: (
      text: string,
      params?: unknown[],
    ) => Promise<{ rows: unknown[]; rowCount: number }>;
    release: () => void;
  }>;
};

export { ShumaDBEnhanced as ShumaDB };
export default ShumaDBEnhanced;
