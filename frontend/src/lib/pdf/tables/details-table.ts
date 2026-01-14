/**
 * Details table generator for property summary display
 */

import type { ValuationData } from "@/types/valuation";
import { formatNumber, formatFloor, formatRooms } from "../utils/formatters";
import {
  getSubParcelValue,
  formatOwnership,
  summarizeAttachments,
} from "../utils/data-resolvers";

/**
 * Land registry data structure for internal use.
 */
interface LandRegistry {
  gush?: string | number;
  chelka?: string | number;
  floor?: number;
  apartment_registered_area?: number;
  built_area?: number;
  [key: string]: unknown;
}

/**
 * Helper to merge multiple record objects, preferring later non-null values.
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
 * Resolves and merges land registry data from multiple possible locations.
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

  return { landRegistry: mergedRegistry };
};

/**
 * Creates the property details summary table HTML.
 *
 * @param data - The valuation data
 * @returns HTML string for the details table rows
 */
export const createDetailsTable = (data: ValuationData): string => {
  const landRegistry = resolveLandRegistryData(data).landRegistry;

  // Get attachments summary (e.g., "2 מקומות חניה ומחסן")
  const attachmentsSummary = summarizeAttachments(data);

  const registeredAreaValue = formatNumber(
    (data as ValuationData & { registeredArea?: number }).registeredArea ||
      (data.extractedData?.apartment_registered_area as number | undefined) ||
      data.extractedData?.apartmentRegisteredArea ||
      landRegistry?.apartment_registered_area,
    "",
  );

  // Get balcony area for display
  const balconyArea = Number(
    (data.extractedData as Record<string, unknown>)?.balconyArea ||
      (data as ValuationData & { balconyArea?: number }).balconyArea ||
      0,
  );
  const balconyText =
    balconyArea > 0 ? ` + ${balconyArea} מ"ר מרפסת לא מקורה` : "";

  const builtAreaValue = formatNumber(
    data.extractedData?.builtArea ||
      data.builtArea ||
      landRegistry?.built_area ||
      (data as ValuationData & { builtArea?: number }).builtArea,
    "",
  );

  const rows: Array<{ label: string; value: string }> = [
    {
      label: "מהות:",
      value:
        `${formatRooms(data.rooms, data.airDirections)} ${formatFloor(landRegistry?.floor || data.floor)}`.trim(),
    },
    {
      label: "גוש:",
      value: formatNumber(
        data.extractedData?.gush || landRegistry?.gush || data.gush,
      ),
    },
    {
      label: "חלקה:",
      value: formatNumber(
        data.extractedData?.chelka || landRegistry?.chelka || data.parcel,
      ),
    },
    {
      label: "תת חלקה:",
      value: formatNumber(getSubParcelValue(data, landRegistry)),
    },
    {
      label: "הצמדות:",
      value: attachmentsSummary,
    },
    {
      label: "שטח דירה רשום:",
      value: registeredAreaValue
        ? `${registeredAreaValue} מ"ר${balconyText}`
        : "",
    },
    {
      label: "שטח דירה בנוי:",
      value: builtAreaValue ? `כ-${builtAreaValue} מ"ר` : "",
    },
    {
      label: "זכויות:",
      value: formatOwnership(data),
    },
  ];

  return rows
    .map((row) => {
      if (!row.value) {
        return "";
      }
      return `
        <tr>
          <th>${row.label}</th>
          <td>${row.value}</td>
        </tr>
      `;
    })
    .join("");
};
