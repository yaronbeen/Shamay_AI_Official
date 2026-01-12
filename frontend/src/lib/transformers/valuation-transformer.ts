/**
 * Valuation Data Transformer
 *
 * Handles conversion between frontend camelCase and backend snake_case formats.
 * This is the SINGLE place where naming convention translation happens.
 */

import type {
  ValuationData,
  ExtractedData,
  Owner,
  Mortgage,
  Attachment,
  AdditionalArea,
  RoomAnalysis,
  BuildingInfo,
  SpecificSubPlot,
  ComparableProperty,
  GarmushkaMeasurements,
} from "@/types/valuation";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Deep transform object keys from camelCase to snake_case
 */
export function keysToSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? keysToSnakeCase(item as Record<string, unknown>)
        : item,
    ) as unknown as Record<string, unknown>;
  }
  if (typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[snakeKey] = keysToSnakeCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        typeof item === "object" && item !== null
          ? keysToSnakeCase(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

/**
 * Deep transform object keys from snake_case to camelCase
 */
export function keysToCamelCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? keysToCamelCase(item as Record<string, unknown>)
        : item,
    ) as unknown as Record<string, unknown>;
  }
  if (typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[camelKey] = keysToCamelCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === "object" && item !== null
          ? keysToCamelCase(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

// =============================================================================
// SPECIFIC FIELD MAPPINGS (for fields that don't follow standard conversion)
// =============================================================================

/**
 * Fields that have special naming that doesn't follow standard snake/camel conversion
 */
const SPECIAL_FIELD_MAPPINGS: Record<string, string> = {
  // Frontend (camelCase) -> Backend (snake_case)
  subParcel: "sub_parcel",
  subChelka: "sub_chelka", // Legacy
  chelka: "chelka", // Same in both
  gush: "gush", // Same in both
  sqm: "sqm", // Same in both
};

const REVERSE_SPECIAL_MAPPINGS: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIAL_FIELD_MAPPINGS).map(([k, v]) => [v, k]),
);

// =============================================================================
// EXTRACTED DATA TRANSFORMERS
// =============================================================================

/**
 * Transform ExtractedData from backend snake_case to frontend camelCase
 */
export function transformExtractedDataFromBackend(
  data: Record<string, unknown> | null | undefined,
): ExtractedData | undefined {
  if (!data) return undefined;

  const transformed = keysToCamelCase(data) as ExtractedData;

  // Handle nested objects that need special transformation
  if (data.owners && Array.isArray(data.owners)) {
    transformed.owners = data.owners.map((owner: Record<string, unknown>) => ({
      name: owner.name as string | undefined,
      idNumber: (owner.id_number || owner.idNumber) as string | undefined,
      ownershipShare: (owner.ownership_share || owner.ownershipShare) as
        | string
        | undefined,
    })) as Owner[];
  }

  if (data.mortgages && Array.isArray(data.mortgages)) {
    transformed.mortgages = data.mortgages.map(
      (mortgage: Record<string, unknown>) => ({
        rank: mortgage.rank as string | undefined,
        share: mortgage.share as string | undefined,
        amount: mortgage.amount as number | undefined,
        essence: mortgage.essence as string | undefined,
        lenders: mortgage.lenders as string | undefined,
        borrowers: mortgage.borrowers as string | undefined,
        registrationDate: (mortgage.registration_date ||
          mortgage.registrationDate) as string | undefined,
      }),
    ) as Mortgage[];
  }

  if (data.room_analysis && Array.isArray(data.room_analysis)) {
    transformed.roomAnalysis = data.room_analysis.map(
      (room: Record<string, unknown>) => ({
        roomType: (room.room_type || room.roomType) as string,
        sizeEstimate: (room.size_estimate || room.sizeEstimate) as string,
        features: room.features as string,
        condition: room.condition as string,
      }),
    ) as RoomAnalysis[];
  }

  if (data.buildings_info && Array.isArray(data.buildings_info)) {
    transformed.buildingsInfo = data.buildings_info.map(
      (building: Record<string, unknown>) => ({
        buildingNumber: (building.building_number ||
          building.buildingNumber) as string | undefined,
        address: building.address as string | undefined,
        floors: building.floors as string | undefined,
        subPlotsCount: (building.sub_plots_count || building.subPlotsCount) as
          | string
          | undefined,
      }),
    ) as BuildingInfo[];
  }

  if (data.specific_sub_plot || data.specificSubPlot) {
    const subPlot = (data.specific_sub_plot || data.specificSubPlot) as Record<
      string,
      unknown
    >;
    transformed.specificSubPlot = {
      number: subPlot.number as string | undefined,
      floor: subPlot.floor as string | undefined,
      area: subPlot.area as string | undefined,
      description: subPlot.description as string | undefined,
      attachments: subPlot.attachments as string[] | undefined,
      sharedPropertyParts: (subPlot.shared_property_parts ||
        subPlot.sharedPropertyParts) as string | undefined,
    } as SpecificSubPlot;
  }

  return transformed;
}

/**
 * Transform ExtractedData from frontend camelCase to backend snake_case
 */
export function transformExtractedDataToBackend(
  data: ExtractedData | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const transformed = keysToSnakeCase(
    data as unknown as Record<string, unknown>,
  );

  // Handle nested objects that need special transformation
  if (data.owners && Array.isArray(data.owners)) {
    transformed.owners = data.owners.map((owner) => ({
      name: owner.name,
      id_number: owner.idNumber,
      ownership_share: owner.ownershipShare,
    }));
  }

  if (data.mortgages && Array.isArray(data.mortgages)) {
    transformed.mortgages = data.mortgages.map((mortgage) => ({
      rank: mortgage.rank,
      share: mortgage.share,
      amount: mortgage.amount,
      essence: mortgage.essence,
      lenders: mortgage.lenders,
      borrowers: mortgage.borrowers,
      registration_date: mortgage.registrationDate,
    }));
  }

  if (data.roomAnalysis && Array.isArray(data.roomAnalysis)) {
    transformed.room_analysis = data.roomAnalysis.map((room) => ({
      room_type: room.roomType,
      size_estimate: room.sizeEstimate,
      features: room.features,
      condition: room.condition,
    }));
  }

  if (data.buildingsInfo && Array.isArray(data.buildingsInfo)) {
    transformed.buildings_info = data.buildingsInfo.map((building) => ({
      building_number: building.buildingNumber,
      address: building.address,
      floors: building.floors,
      sub_plots_count: building.subPlotsCount,
    }));
  }

  if (data.specificSubPlot) {
    transformed.specific_sub_plot = {
      number: data.specificSubPlot.number,
      floor: data.specificSubPlot.floor,
      area: data.specificSubPlot.area,
      description: data.specificSubPlot.description,
      attachments: data.specificSubPlot.attachments,
      shared_property_parts: data.specificSubPlot.sharedPropertyParts,
    };
  }

  return transformed;
}

// =============================================================================
// COMPARABLE DATA TRANSFORMERS
// =============================================================================

/**
 * Transform comparable property from backend to frontend
 */
export function transformComparableFromBackend(
  data: Record<string, unknown>,
): ComparableProperty {
  return {
    id: data.id as string | undefined,
    address: data.address as string | undefined,
    gush: (data.gush || data.block) as string | undefined,
    chelka: (data.chelka || data.parcel) as string | undefined,
    subChelka: (data.sub_chelka || data.subChelka) as string | undefined,
    rooms: data.rooms as number | undefined,
    floor: (data.floor || data.floor_number) as number | undefined,
    area: (data.area || data.apartment_area_sqm) as number | undefined,
    constructionYear: (data.construction_year || data.constructionYear) as
      | number
      | undefined,
    saleDate: (data.sale_date || data.saleDate) as string | undefined,
    declaredPrice: (data.declared_price || data.declaredPrice) as
      | number
      | undefined,
    pricePerSqm: (data.price_per_sqm || data.pricePerSqm) as number | undefined,
    distance: data.distance as number | undefined,
    adjustmentFactor: (data.adjustment_factor || data.adjustmentFactor) as
      | number
      | undefined,
    adjustedPricePerSqm: (data.adjusted_price_per_sqm ||
      data.adjustedPricePerSqm) as number | undefined,
  };
}

/**
 * Transform comparable property from frontend to backend
 */
export function transformComparableToBackend(
  data: ComparableProperty,
): Record<string, unknown> {
  return {
    id: data.id,
    address: data.address,
    gush: data.gush,
    chelka: data.chelka,
    sub_chelka: data.subChelka,
    rooms: data.rooms,
    floor: data.floor,
    area: data.area,
    construction_year: data.constructionYear,
    sale_date: data.saleDate,
    declared_price: data.declaredPrice,
    price_per_sqm: data.pricePerSqm,
    distance: data.distance,
    adjustment_factor: data.adjustmentFactor,
    adjusted_price_per_sqm: data.adjustedPricePerSqm,
  };
}

// =============================================================================
// MAIN VALUATION DATA TRANSFORMERS
// =============================================================================

/**
 * Backend response shape (snake_case)
 */
export interface BackendValuationData {
  // All fields in snake_case - this is what the API returns
  [key: string]: unknown;
}

/**
 * Transform ValuationData from backend response to frontend format
 * Use this when LOADING data from the API
 */
export function transformFromBackend(
  backendData: BackendValuationData,
): Partial<ValuationData> {
  // Start with basic key transformation
  const transformed = keysToCamelCase(backendData) as Partial<ValuationData>;

  // Handle extracted_data specially
  if (backendData.extracted_data || backendData.extractedData) {
    transformed.extractedData = transformExtractedDataFromBackend(
      (backendData.extracted_data || backendData.extractedData) as Record<
        string,
        unknown
      >,
    );
  }

  // Handle comparable_data array
  if (
    backendData.comparable_data &&
    Array.isArray(backendData.comparable_data)
  ) {
    transformed.comparableData = backendData.comparable_data.map(
      (comp: Record<string, unknown>) => transformComparableFromBackend(comp),
    );
  }

  // Handle gis_screenshots
  if (backendData.gis_screenshots || backendData.gisScreenshots) {
    const gis = (backendData.gis_screenshots ||
      backendData.gisScreenshots) as Record<string, unknown>;
    transformed.gisScreenshots = {
      wideArea: (gis.wide_area || gis.wideArea) as string | undefined,
      zoomedNoTazea: (gis.zoomed_no_tazea || gis.zoomedNoTazea) as
        | string
        | undefined,
      zoomedWithTazea: (gis.zoomed_with_tazea || gis.zoomedWithTazea) as
        | string
        | undefined,
      cropMode0: (gis.crop_mode_0 || gis.cropMode0) as string | undefined,
      cropMode1: (gis.crop_mode_1 || gis.cropMode1) as string | undefined,
    };
  }

  // Handle garmushka_measurements
  if (backendData.garmushka_measurements || backendData.garmushkaMeasurements) {
    const garm = (backendData.garmushka_measurements ||
      backendData.garmushkaMeasurements) as Record<string, unknown>;
    transformed.garmushkaMeasurements = {
      measurementTable: (garm.measurement_table ||
        garm.measurementTable) as GarmushkaMeasurements["measurementTable"],
      metersPerPixel: (garm.meters_per_pixel || garm.metersPerPixel) as number,
      unitMode: (garm.unit_mode || garm.unitMode) as "metric" | "imperial",
      isCalibrated: (garm.is_calibrated || garm.isCalibrated) as boolean,
      fileName: (garm.file_name || garm.fileName) as string,
      pngExport: (garm.png_export || garm.pngExport) as string | undefined,
    };
  }

  // Handle structured_footnotes
  if (backendData.structured_footnotes || backendData.structuredFootnotes) {
    const footnotes = (backendData.structured_footnotes ||
      backendData.structuredFootnotes) as Array<Record<string, unknown>>;
    transformed.structuredFootnotes = footnotes.map((fn) => ({
      id: fn.id as string,
      pageNumber: (fn.page_number || fn.pageNumber) as number,
      footnoteNumber: (fn.footnote_number || fn.footnoteNumber) as number,
      text: fn.text as string,
    }));
  }

  return transformed;
}

/**
 * Transform ValuationData from frontend format to backend format
 * Use this when SAVING data to the API
 */
export function transformToBackend(
  frontendData: Partial<ValuationData>,
): BackendValuationData {
  // Start with basic key transformation
  const transformed = keysToSnakeCase(
    frontendData as unknown as Record<string, unknown>,
  ) as BackendValuationData;

  // Handle extractedData specially
  if (frontendData.extractedData) {
    transformed.extracted_data = transformExtractedDataToBackend(
      frontendData.extractedData,
    );
    delete transformed.extractedData; // Remove camelCase version
  }

  // Handle comparableData array
  if (
    frontendData.comparableData &&
    Array.isArray(frontendData.comparableData)
  ) {
    transformed.comparable_data = frontendData.comparableData.map((comp) =>
      transformComparableToBackend(comp),
    );
    delete transformed.comparableData; // Remove camelCase version
  }

  // Handle gisScreenshots
  if (frontendData.gisScreenshots) {
    transformed.gis_screenshots = {
      wide_area: frontendData.gisScreenshots.wideArea,
      zoomed_no_tazea: frontendData.gisScreenshots.zoomedNoTazea,
      zoomed_with_tazea: frontendData.gisScreenshots.zoomedWithTazea,
      crop_mode_0: frontendData.gisScreenshots.cropMode0,
      crop_mode_1: frontendData.gisScreenshots.cropMode1,
    };
    delete transformed.gisScreenshots; // Remove camelCase version
  }

  // Handle garmushkaMeasurements
  if (frontendData.garmushkaMeasurements) {
    transformed.garmushka_measurements = {
      measurement_table: frontendData.garmushkaMeasurements.measurementTable,
      meters_per_pixel: frontendData.garmushkaMeasurements.metersPerPixel,
      unit_mode: frontendData.garmushkaMeasurements.unitMode,
      is_calibrated: frontendData.garmushkaMeasurements.isCalibrated,
      file_name: frontendData.garmushkaMeasurements.fileName,
      png_export: frontendData.garmushkaMeasurements.pngExport,
    };
    delete transformed.garmushkaMeasurements; // Remove camelCase version
  }

  // Handle structuredFootnotes
  if (frontendData.structuredFootnotes) {
    transformed.structured_footnotes = frontendData.structuredFootnotes.map(
      (fn) => ({
        id: fn.id,
        page_number: fn.pageNumber,
        footnote_number: fn.footnoteNumber,
        text: fn.text,
      }),
    );
    delete transformed.structuredFootnotes; // Remove camelCase version
  }

  // Remove File objects (can't be serialized to JSON)
  delete transformed.property_images;
  delete transformed.signature;

  return transformed;
}

// =============================================================================
// HELPER: GET VALUE FROM MULTIPLE PATHS (for backward compatibility)
// =============================================================================

/**
 * Try to get a value from multiple possible paths in an object.
 * This helps with backward compatibility during migration.
 *
 * @deprecated - Use this only during migration. New code should use single paths.
 */
export function getValueFromPaths<T>(
  obj: Record<string, unknown>,
  paths: string[],
  defaultValue: T,
): T {
  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) break;
      current = (current as Record<string, unknown>)[part];
    }

    if (current !== null && current !== undefined) {
      return current as T;
    }
  }

  return defaultValue;
}
