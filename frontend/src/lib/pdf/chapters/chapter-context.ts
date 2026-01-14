/**
 * Chapter context - shared data and helpers for chapter generation
 *
 * This module provides a context builder for chapter generators.
 * The context bundles all the data and helper functions needed
 * to generate individual chapters of the document.
 */

import type { ValuationData } from "@/types/valuation";
import type { CompanySettings } from "../types";
import {
  formatNumber,
  formatDateHebrew,
  formatDateNumeric,
  formatFloor,
  formatRooms,
  parseNumeric,
  formatCurrency,
} from "../utils/formatters";
import { normalizeText, escapeHtmlForTable } from "../utils/text";
import {
  toArray,
  getValueFromPaths,
  getSubParcelValue,
  getAddress,
  getReference,
  formatOwnership,
  summarizeAttachments,
} from "../utils/data-resolvers";

/**
 * Land registry data structure.
 */
export interface LandRegistry {
  gush?: string | number;
  chelka?: string | number;
  floor?: number;
  apartment_registered_area?: number;
  built_area?: number;
  [key: string]: unknown;
}

/**
 * Attachment from land registry.
 */
export interface Attachment {
  type?: string;
  description?: string;
  area?: number;
}

/**
 * Context object passed to chapter generators.
 */
export interface ChapterContext {
  data: ValuationData;
  isPreview: boolean;
  companySettings?: CompanySettings;
  customEdits: Record<string, string>;

  // Computed values
  valuationDate: string;
  valuationEffectiveDate: string;
  address: string;
  formattedAddress: string;
  reference: string;
  finalValue: number;
  landRegistry: LandRegistry;
  attachments: Attachment[];

  // Page elements
  pageHeader: string;
  footerBlock: string;
  coverFooterBlock: string;

  // Helpers (bound to context)
  formatNumber: typeof formatNumber;
  formatDateHebrew: typeof formatDateHebrew;
  formatDateNumeric: typeof formatDateNumeric;
  formatFloor: typeof formatFloor;
  formatRooms: typeof formatRooms;
  parseNumeric: typeof parseNumeric;
  formatCurrency: typeof formatCurrency;
  normalizeText: typeof normalizeText;
  escapeHtmlForTable: typeof escapeHtmlForTable;
  toArray: typeof toArray;
  getValueFromPaths: typeof getValueFromPaths;
  getSubParcelValue: typeof getSubParcelValue;
  formatOwnership: typeof formatOwnership;
  summarizeAttachments: typeof summarizeAttachments;
}

/**
 * Merges multiple record objects, preferring later non-null values.
 */
const mergeRecords = (
  ...records: (Record<string, unknown> | undefined)[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const record of records) {
    if (record && typeof record === "object") {
      for (const [key, value] of Object.entries(record)) {
        if (value !== undefined && value !== null) {
          result[key] = value;
        }
      }
    }
  }
  return result;
};

/**
 * Resolves land registry data from multiple possible locations.
 */
const resolveLandRegistryData = (data: ValuationData): LandRegistry => {
  // Use any to avoid complex type casting
  const d = data as any;
  const extracted = d.extractedData || {};

  return mergeRecords(
    extracted.land_registry,
    extracted.landRegistry,
    d.land_registry,
    d.landRegistry,
  ) as LandRegistry;
};

/**
 * Resolves attachments array from valuation data.
 */
const resolveAttachments = (data: ValuationData): Attachment[] => {
  const d = data as any;
  const fromExtracted = toArray(d.extractedData?.attachments);
  const fromDirect = toArray(d.attachments);

  return (
    fromExtracted.length > 0 ? fromExtracted : fromDirect
  ) as Attachment[];
};

/**
 * Creates a chapter context from valuation data.
 *
 * @param data - The valuation data
 * @param isPreview - Whether this is a preview or final render
 * @param companySettings - Optional company settings for branding
 * @param pageHeader - Pre-built page header HTML
 * @param footerBlock - Pre-built footer HTML
 * @param coverFooterBlock - Pre-built cover footer HTML
 * @returns ChapterContext with all data and helpers
 */
export function createChapterContext(
  data: ValuationData,
  isPreview: boolean,
  companySettings?: CompanySettings,
  pageHeader: string = "",
  footerBlock: string = "",
  coverFooterBlock: string = "",
): ChapterContext {
  // Use any to simplify type handling
  const d = data as any;

  const customEdits = d.customDocumentEdits || {};
  const valuationDate = data.valuationDate || new Date().toISOString();
  const valuationEffectiveDate = data.valuationEffectiveDate || valuationDate;
  const address = getAddress(data);
  const reference = getReference(data);

  // Format address for cover page
  const formattedAddress = [
    data.street ? `רחוב ${data.street}` : "",
    data.buildingNumber ? `${data.buildingNumber}` : "",
    data.neighborhood ? `שכונת ${data.neighborhood}` : "",
    data.city || "",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(" , ,", " ,");

  // Parse final value from various possible locations
  const finalValueRaw =
    d.finalValuation ||
    d.comparableDataAnalysis?.section52?.asset_value_nis ||
    d.comparableDataAnalysis?.estimatedValue ||
    d.comparableAnalysis?.estimatedValue ||
    d.marketAnalysis?.estimatedValue ||
    0;
  const finalValue = parseNumeric(finalValueRaw);

  const landRegistry = resolveLandRegistryData(data);
  const attachments = resolveAttachments(data);

  return {
    data,
    isPreview,
    companySettings,
    customEdits,
    valuationDate,
    valuationEffectiveDate,
    address,
    formattedAddress,
    reference,
    finalValue,
    landRegistry,
    attachments,
    pageHeader,
    footerBlock,
    coverFooterBlock,

    // Bind helpers
    formatNumber,
    formatDateHebrew,
    formatDateNumeric,
    formatFloor,
    formatRooms,
    parseNumeric,
    formatCurrency,
    normalizeText,
    escapeHtmlForTable,
    toArray,
    getValueFromPaths,
    getSubParcelValue,
    formatOwnership,
    summarizeAttachments,
  };
}
