/**
 * Data resolver utility functions for PDF document generation.
 * These functions handle extracting and resolving values from nested ValuationData structures.
 */

import type {
  ValuationData,
  ExtractedData,
  Attachment,
} from "@/types/valuation";

/**
 * Converts a value to an array. If the value is already an array, returns it as-is.
 * If the value is null or undefined, returns an empty array.
 * Otherwise, wraps the value in an array.
 *
 * @template T - The type of elements in the array
 * @param value - The value to convert (single item, array, null, or undefined)
 * @returns An array containing the value(s)
 *
 * @example
 * toArray([1, 2, 3]) // Returns: [1, 2, 3]
 * toArray('single') // Returns: ['single']
 * toArray(null) // Returns: []
 * toArray(undefined) // Returns: []
 */
export const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * Gets a value from an object by trying multiple dot-notation paths.
 * Returns the first non-empty value found, or undefined if none match.
 *
 * @param obj - The object to search in
 * @param paths - Array of dot-notation paths to try (e.g., ['data.field', 'field'])
 * @returns The first non-empty value found, or undefined
 *
 * @example
 * const data = { extractedData: { subParcel: '5' } };
 * getValueFromPaths(data, ['extractedData.subParcel', 'subParcel'])
 * // Returns: '5'
 *
 * @example
 * const data = { nested: { deep: { value: 42 } } };
 * getValueFromPaths(data, ['missing.path', 'nested.deep.value'])
 * // Returns: 42
 */
export const getValueFromPaths = (obj: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const keys = path.split(".");
    let value: unknown = obj;
    for (const key of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

/**
 * Land registry data structure for internal use.
 */
interface LandRegistry {
  sub_chelka?: string | number;
  subParcel?: string | number;
  sub_parcel?: string | number;
  ownership_type?: string;
  ownershipType?: string;
  attachments?: Attachment[];
  apartment_registered_area?: number;
  [key: string]: unknown;
}

/**
 * Gets the sub-parcel value from valuation data, checking multiple possible paths.
 * Tries various naming conventions (camelCase, snake_case) and nested locations.
 *
 * @param data - The valuation data object to search
 * @param landRegistry - Optional pre-resolved land registry data
 * @returns The sub-parcel value if found, or undefined
 *
 * @example
 * const data = { extractedData: { subParcel: '3' } };
 * getSubParcelValue(data) // Returns: '3'
 *
 * @example
 * const data = { subParcel: '5' };
 * getSubParcelValue(data) // Returns: '5'
 */
export const getSubParcelValue = (
  data: ValuationData,
  landRegistry?: LandRegistry,
): string | number | undefined => {
  return (
    (getValueFromPaths(data, [
      "extractedData.subParcel",
      "extractedData.sub_parcel",
      "extractedData.land_registry.subParcel",
      "extractedData.land_registry.sub_parcel",
      "land_registry.sub_chelka",
      "subParcel",
    ]) as string | number | undefined) ||
    data.extractedData?.subParcel ||
    (data.extractedData as ExtractedData & { sub_parcel?: string | number })
      ?.sub_parcel ||
    landRegistry?.sub_chelka ||
    data.subParcel ||
    undefined
  );
};

/**
 * Gets a formatted address string from valuation data.
 * Combines street, building number, neighborhood (if present), and city.
 *
 * @param data - The valuation data containing address fields
 * @returns A formatted address string, or em-dash if required fields are missing
 *
 * @example
 * const data = { street: 'Herzl', buildingNumber: '10', city: 'Tel Aviv', neighborhood: 'Center' };
 * getAddress(data) // Returns: 'Herzl 10, Center, Tel Aviv'
 *
 * @example
 * const data = { street: 'Herzl', buildingNumber: '10', city: 'Tel Aviv', neighborhood: '' };
 * getAddress(data) // Returns: 'Herzl 10, Tel Aviv'
 */
export const getAddress = (data: ValuationData): string => {
  const { street, buildingNumber, city, neighborhood } = data;
  if (!street || !buildingNumber || !city) {
    return "—";
  }
  const neighborhoodSegment = neighborhood ? `, שכונת ${neighborhood}` : "";
  return `${street} ${buildingNumber}${neighborhoodSegment}, ${city}`;
};

/**
 * Gets a reference number from valuation data.
 * If no reference number exists, generates one from the address.
 *
 * @param data - The valuation data containing reference and address fields
 * @returns The reference number or a generated fallback
 *
 * @example
 * const data = { referenceNumber: 'REF-123', street: 'Herzl', buildingNumber: '10', city: 'Tel Aviv' };
 * getReference(data) // Returns: 'REF-123'
 *
 * @example
 * const data = { street: 'Herzl', buildingNumber: '10', city: 'Tel Aviv', neighborhood: '' };
 * getReference(data) // Returns: '1000_הרצל10תלאביב' (truncated address)
 */
export const getReference = (data: ValuationData): string => {
  if (data.referenceNumber) {
    return data.referenceNumber;
  }
  const address = getAddress(data).replace(/[^א-ת0-9]/g, "");
  return `1000_${address.substring(0, 10)}`;
};

/**
 * Helper to merge multiple record objects, preferring later non-null values.
 *
 * @param records - Variable number of record objects to merge
 * @returns Merged record object
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
 * Resolves and merges land registry data from multiple possible locations in ValuationData.
 *
 * @param data - The valuation data to resolve land registry from
 * @returns Object containing the merged land registry data
 */
const resolveLandRegistryData = (
  data: ValuationData,
): { landRegistry: LandRegistry } => {
  const extractedDataRecord = data.extractedData as
    | Record<string, unknown>
    | undefined;
  const dataRecord = data as unknown as Record<string, unknown>;
  const mergedRegistry = mergeRecords(
    extractedDataRecord?.land_registry as Record<string, unknown>,
    extractedDataRecord?.landRegistry as Record<string, unknown>,
    dataRecord.land_registry as Record<string, unknown>,
    dataRecord.landRegistry as Record<string, unknown>,
  ) as LandRegistry;

  return {
    landRegistry: mergedRegistry,
  };
};

/**
 * Formats ownership information from valuation data.
 * Returns only the ownership TYPE (e.g., "private ownership"), never owner names.
 *
 * @param data - The valuation data containing ownership information
 * @returns The ownership type string, defaults to "private ownership" in Hebrew
 *
 * @example
 * const data = { extractedData: { ownership_type: 'leasehold' } };
 * formatOwnership(data) // Returns: 'leasehold'
 *
 * @example
 * const data = {};
 * formatOwnership(data) // Returns: 'private ownership' (default)
 */
export const formatOwnership = (data: ValuationData): string => {
  const landRegistry = resolveLandRegistryData(data).landRegistry;
  // Only return ownership TYPE (e.g., "private ownership"), never owner names
  const ownershipType =
    landRegistry?.ownership_type ||
    (data.extractedData as ExtractedData & { ownership_type?: string })
      ?.ownership_type ||
    (data.extractedData as ExtractedData & { ownershipType?: string })
      ?.ownershipType ||
    (data as ValuationData & { ownership_type?: string }).ownership_type;

  // If we have a valid type, return it
  if (
    ownershipType &&
    typeof ownershipType === "string" &&
    !ownershipType.includes("ת.ז")
  ) {
    return ownershipType;
  }

  // Default
  return "בעלות פרטית";
};

/**
 * Attachment item structure for internal processing.
 */
interface AttachmentItem {
  type?: string;
  description?: string;
}

/**
 * Summarizes property attachments for display in details tables.
 * Counts and formats parking spaces, storage units, gardens, and roofs.
 *
 * @param data - The valuation data containing attachment information
 * @returns A formatted summary string (e.g., "2 parking spaces and storage")
 *
 * @example
 * // With 2 parking spots and 1 storage
 * summarizeAttachments(data) // Returns: '2 parking spots and storage'
 *
 * @example
 * // With no attachments
 * summarizeAttachments(data) // Returns: '—'
 */
export const summarizeAttachments = (data: ValuationData): string => {
  const landRegistry = resolveLandRegistryData(data).landRegistry;

  // Collect attachment items
  const attachmentItems: AttachmentItem[] = [];

  // 1. Check data.attachments as string (direct from database)
  if (
    (data as ValuationData & { attachments?: string }).attachments &&
    typeof (data as ValuationData & { attachments?: string }).attachments ===
      "string"
  ) {
    const attachmentsStr = (
      (data as ValuationData & { attachments?: string }).attachments as string
    ).trim();
    if (attachmentsStr) {
      if (attachmentsStr.includes("\n")) {
        attachmentsStr
          .split("\n")
          .filter(Boolean)
          .forEach((desc: string) =>
            attachmentItems.push({ description: desc }),
          );
      } else {
        attachmentItems.push({ description: attachmentsStr });
      }
    }
  }

  // 2. From landRegistry attachments
  if (Array.isArray(landRegistry?.attachments)) {
    attachmentItems.push(...(landRegistry.attachments as AttachmentItem[]));
  }

  // 3. From extractedData attachments (when it's an array)
  if (Array.isArray(data.extractedData?.attachments)) {
    attachmentItems.push(
      ...(data.extractedData.attachments as AttachmentItem[]),
    );
  }

  // Count by type
  const counts: Record<string, number> = {};
  attachmentItems.forEach((item) => {
    const type = (item?.type || item?.description || "").toLowerCase();
    if (
      type.includes("חניה") ||
      type.includes("חנייה") ||
      type.includes("parking")
    ) {
      counts["חניות"] = (counts["חניות"] || 0) + 1;
    } else if (type.includes("מחסן") || type.includes("storage")) {
      counts["מחסן"] = (counts["מחסן"] || 0) + 1;
    } else if (type.includes("גינה") || type.includes("garden")) {
      counts["גינה"] = (counts["גינה"] || 0) + 1;
    } else if (type.includes("גג") || type.includes("roof")) {
      counts["גג"] = (counts["גג"] || 0) + 1;
    }
  });

  // Build summary string
  const parts: string[] = [];
  if (counts["חניות"]) {
    parts.push(
      counts["חניות"] === 1 ? "מקום חניה" : `${counts["חניות"]} מקומות חניה`,
    );
  }
  if (counts["מחסן"]) {
    parts.push(counts["מחסן"] === 1 ? "מחסן" : `${counts["מחסן"]} מחסנים`);
  }
  if (counts["גינה"]) {
    parts.push("גינה");
  }
  if (counts["גג"]) {
    parts.push("גג");
  }

  if (parts.length === 0) {
    // Fallback: check for summary in data
    const summary =
      (data as ValuationData & { attachmentsSummary?: string })
        .attachmentsSummary ||
      (data.extractedData as ExtractedData & { attachments_summary?: string })
        ?.attachments_summary;
    if (summary) return summary;
    return "—";
  }

  return parts.join(" ו");
};
