import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// AI ANALYSIS SECTION CONFIGURATION
// =============================================================================

interface AIAnalysisSection {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

const AI_ANALYSIS_SECTIONS: AIAnalysisSection[] = [
  {
    id: "garmushka_measurements",
    title: "מדידות גרמושקה",
    description: "העלה תכנית קומה לביצוע מדידות מרחק ושטח אינטראקטיביות",
    active: true,
  },
  {
    id: "gis_mapping",
    title: "מפת GOVMAP",
    description: "צילום מפות לשילוב במסמך הסופי",
    active: true,
  },
  {
    id: "market_analysis",
    title: "ניתוח נתוני שוק",
    description: "העלה נתוני מכירות להשוואה וניתוח שוק מבוסס AI",
    active: true,
  },
];

// =============================================================================
// GIS DATA TYPES AND HELPERS
// =============================================================================

interface GISScreenshots {
  wideArea?: string;
  zoomedNoTazea?: string;
  zoomedWithTazea?: string;
  cropMode0?: string;
  cropMode1?: string;
}

interface GISCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface GISAnalysis {
  coordinates?: GISCoordinates;
  parcelBoundaries?: string[];
  nearbyPOIs?: { name: string; type: string; distance: number }[];
}

// Validate GIS screenshots structure
function validateGISScreenshots(
  screenshots: unknown,
): screenshots is GISScreenshots {
  if (!screenshots || typeof screenshots !== "object") return false;
  const keys = Object.keys(screenshots);
  const validKeys = [
    "wideArea",
    "zoomedNoTazea",
    "zoomedWithTazea",
    "cropMode0",
    "cropMode1",
  ];
  return keys.every((key) => validKeys.includes(key));
}

// Convert GIS screenshot to data URL format
function formatGISScreenshotURL(screenshot: string): string {
  if (screenshot.startsWith("data:image/")) {
    return screenshot;
  }
  if (screenshot.startsWith("/")) {
    return screenshot; // Already a path URL
  }
  return `data:image/png;base64,${screenshot}`;
}

// Check if GIS data is complete (has all required screenshots)
function isGISDataComplete(screenshots: GISScreenshots): boolean {
  return !!(screenshots.wideArea && screenshots.zoomedNoTazea);
}

// =============================================================================
// GARMUSHKA MEASUREMENTS TYPES AND HELPERS
// =============================================================================

interface GarmushkaMeasurement {
  id: string;
  name: string;
  type: "calibration" | "polyline" | "polygon";
  measurement: string;
  notes: string;
  color: string;
}

interface GarmushkaMeasurements {
  measurementTable: GarmushkaMeasurement[];
  metersPerPixel: number;
  unitMode: "metric" | "imperial";
  isCalibrated: boolean;
  fileName: string;
  pngExport?: string;
}

// Validate measurement type
function isValidMeasurementType(
  type: string,
): type is GarmushkaMeasurement["type"] {
  return ["calibration", "polyline", "polygon"].includes(type);
}

// Calculate area from polygon measurements
function getPolygonArea(measurements: GarmushkaMeasurement[]): number {
  const polygons = measurements.filter((m) => m.type === "polygon");
  return polygons.reduce((total, polygon) => {
    const area = parseFloat(polygon.measurement.replace(/[^\d.]/g, ""));
    return total + (isNaN(area) ? 0 : area);
  }, 0);
}

// Get total linear measurements from polylines
function getTotalPolylineLength(measurements: GarmushkaMeasurement[]): number {
  const polylines = measurements.filter((m) => m.type === "polyline");
  return polylines.reduce((total, polyline) => {
    const length = parseFloat(polyline.measurement.replace(/[^\d.]/g, ""));
    return total + (isNaN(length) ? 0 : length);
  }, 0);
}

// Check if measurements are calibrated
function isMeasurementCalibrated(data: GarmushkaMeasurements): boolean {
  return data.isCalibrated && data.metersPerPixel > 0;
}

// =============================================================================
// COMPARABLE DATA TYPES AND HELPERS
// =============================================================================

interface ComparableProperty {
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
}

interface ComparableDataAnalysis {
  averagePricePerSqm?: number;
  medianPricePerSqm?: number;
  adjustmentFactor?: number;
  section52?: {
    finalPricePerSqm?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Calculate average price per sqm from comparables
function calculateAveragePricePerSqm(
  comparables: ComparableProperty[],
): number {
  const validPrices = comparables
    .filter((c) => c.pricePerSqm && c.pricePerSqm > 0)
    .map((c) => c.pricePerSqm!);

  if (validPrices.length === 0) return 0;
  return (
    validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
  );
}

// Calculate median price per sqm from comparables
function calculateMedianPricePerSqm(comparables: ComparableProperty[]): number {
  const validPrices = comparables
    .filter((c) => c.pricePerSqm && c.pricePerSqm > 0)
    .map((c) => c.pricePerSqm!)
    .sort((a, b) => a - b);

  if (validPrices.length === 0) return 0;

  const mid = Math.floor(validPrices.length / 2);
  if (validPrices.length % 2 === 0) {
    return (validPrices[mid - 1] + validPrices[mid]) / 2;
  }
  return validPrices[mid];
}

// Apply adjustment factors to comparables
function applyAdjustments(
  comparables: ComparableProperty[],
  subjectProperty: { floor?: number; area?: number; rooms?: number },
): ComparableProperty[] {
  return comparables.map((comp) => {
    let adjustmentFactor = 1.0;

    // Floor adjustment (+/- 2% per floor difference)
    if (comp.floor !== undefined && subjectProperty.floor !== undefined) {
      const floorDiff = subjectProperty.floor - comp.floor;
      adjustmentFactor += floorDiff * 0.02;
    }

    // Area adjustment (-0.5% per 10sqm larger, +0.5% per 10sqm smaller)
    if (comp.area && subjectProperty.area) {
      const areaDiff = subjectProperty.area - comp.area;
      adjustmentFactor += (areaDiff / 10) * 0.005;
    }

    const adjustedPricePerSqm = comp.pricePerSqm
      ? comp.pricePerSqm * adjustmentFactor
      : undefined;

    return {
      ...comp,
      adjustmentFactor,
      adjustedPricePerSqm,
    };
  });
}

// Filter comparables by distance
function filterByDistance(
  comparables: ComparableProperty[],
  maxDistance: number,
): ComparableProperty[] {
  return comparables.filter(
    (c) => c.distance === undefined || c.distance <= maxDistance,
  );
}

// Filter comparables by sale date (within months)
function filterByRecentSales(
  comparables: ComparableProperty[],
  monthsBack: number,
): ComparableProperty[] {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

  return comparables.filter((c) => {
    if (!c.saleDate) return true; // Include if no date
    const saleDate = new Date(c.saleDate);
    return saleDate >= cutoffDate;
  });
}

// =============================================================================
// MARKET ANALYSIS TYPES AND HELPERS
// =============================================================================

interface MarketAnalysis {
  averagePricePerSqm?: number;
  priceRange?: { min: number; max: number };
  trend?: "up" | "down" | "stable";
  confidenceScore?: number;
}

// Determine market trend from comparables
function determineMarketTrend(
  comparables: ComparableProperty[],
): MarketAnalysis["trend"] {
  if (comparables.length < 3) return "stable";

  const sortedBySale = [...comparables]
    .filter((c) => c.saleDate && c.pricePerSqm)
    .sort(
      (a, b) =>
        new Date(a.saleDate!).getTime() - new Date(b.saleDate!).getTime(),
    );

  if (sortedBySale.length < 3) return "stable";

  const recentAvg =
    sortedBySale.slice(-3).reduce((sum, c) => sum + c.pricePerSqm!, 0) / 3;
  const olderAvg =
    sortedBySale.slice(0, 3).reduce((sum, c) => sum + c.pricePerSqm!, 0) / 3;

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (changePercent > 5) return "up";
  if (changePercent < -5) return "down";
  return "stable";
}

// =============================================================================
// TESTS
// =============================================================================

describe("Step4AIAnalysis Section Configuration", () => {
  describe("AI_ANALYSIS_SECTIONS", () => {
    it("has three analysis sections", () => {
      expect(AI_ANALYSIS_SECTIONS).toHaveLength(3);
    });

    it("has garmushka measurements section", () => {
      const section = AI_ANALYSIS_SECTIONS.find(
        (s) => s.id === "garmushka_measurements",
      );
      expect(section).toBeDefined();
      expect(section?.title).toBe("מדידות גרמושקה");
      expect(section?.active).toBe(true);
    });

    it("has gis mapping section", () => {
      const section = AI_ANALYSIS_SECTIONS.find((s) => s.id === "gis_mapping");
      expect(section).toBeDefined();
      expect(section?.title).toBe("מפת GOVMAP");
      expect(section?.active).toBe(true);
    });

    it("has market analysis section", () => {
      const section = AI_ANALYSIS_SECTIONS.find(
        (s) => s.id === "market_analysis",
      );
      expect(section).toBeDefined();
      expect(section?.title).toBe("ניתוח נתוני שוק");
      expect(section?.active).toBe(true);
    });

    it("all sections have required fields", () => {
      AI_ANALYSIS_SECTIONS.forEach((section) => {
        expect(section).toHaveProperty("id");
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("description");
        expect(section).toHaveProperty("active");
      });
    });

    it("all sections have Hebrew descriptions", () => {
      AI_ANALYSIS_SECTIONS.forEach((section) => {
        expect(section.description.length).toBeGreaterThan(0);
        // Hebrew unicode range check
        expect(/[\u0590-\u05FF]/.test(section.description)).toBe(true);
      });
    });
  });
});

describe("Step4AIAnalysis GIS Functions", () => {
  describe("validateGISScreenshots", () => {
    it("returns true for valid screenshots object", () => {
      const screenshots = { wideArea: "data:image/png;base64,..." };
      expect(validateGISScreenshots(screenshots)).toBe(true);
    });

    it("returns true for all valid keys", () => {
      const screenshots = {
        wideArea: "url1",
        zoomedNoTazea: "url2",
        zoomedWithTazea: "url3",
        cropMode0: "url4",
        cropMode1: "url5",
      };
      expect(validateGISScreenshots(screenshots)).toBe(true);
    });

    it("returns false for null", () => {
      expect(validateGISScreenshots(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(validateGISScreenshots(undefined)).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(validateGISScreenshots("string")).toBe(false);
      expect(validateGISScreenshots(123)).toBe(false);
    });

    it("returns false for invalid keys", () => {
      const screenshots = { invalidKey: "value" };
      expect(validateGISScreenshots(screenshots)).toBe(false);
    });
  });

  describe("formatGISScreenshotURL", () => {
    it("returns data URL unchanged", () => {
      const url = "data:image/png;base64,ABC123";
      expect(formatGISScreenshotURL(url)).toBe(url);
    });

    it("returns path URL unchanged", () => {
      const url = "/uploads/screenshot.png";
      expect(formatGISScreenshotURL(url)).toBe(url);
    });

    it("converts raw base64 to data URL", () => {
      const base64 = "ABC123";
      expect(formatGISScreenshotURL(base64)).toBe(
        "data:image/png;base64,ABC123",
      );
    });
  });

  describe("isGISDataComplete", () => {
    it("returns true when required screenshots present", () => {
      const screenshots: GISScreenshots = {
        wideArea: "url1",
        zoomedNoTazea: "url2",
      };
      expect(isGISDataComplete(screenshots)).toBe(true);
    });

    it("returns false when wideArea missing", () => {
      const screenshots: GISScreenshots = {
        zoomedNoTazea: "url2",
      };
      expect(isGISDataComplete(screenshots)).toBe(false);
    });

    it("returns false when zoomedNoTazea missing", () => {
      const screenshots: GISScreenshots = {
        wideArea: "url1",
      };
      expect(isGISDataComplete(screenshots)).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isGISDataComplete({})).toBe(false);
    });
  });
});

describe("Step4AIAnalysis Garmushka Functions", () => {
  describe("isValidMeasurementType", () => {
    it("returns true for calibration", () => {
      expect(isValidMeasurementType("calibration")).toBe(true);
    });

    it("returns true for polyline", () => {
      expect(isValidMeasurementType("polyline")).toBe(true);
    });

    it("returns true for polygon", () => {
      expect(isValidMeasurementType("polygon")).toBe(true);
    });

    it("returns false for invalid types", () => {
      expect(isValidMeasurementType("invalid")).toBe(false);
      expect(isValidMeasurementType("rectangle")).toBe(false);
      expect(isValidMeasurementType("")).toBe(false);
    });
  });

  describe("getPolygonArea", () => {
    it("calculates total area from polygon measurements", () => {
      const measurements: GarmushkaMeasurement[] = [
        {
          id: "1",
          name: "Room 1",
          type: "polygon",
          measurement: "25.5 sqm",
          notes: "",
          color: "blue",
        },
        {
          id: "2",
          name: "Room 2",
          type: "polygon",
          measurement: "30.0 sqm",
          notes: "",
          color: "green",
        },
      ];
      expect(getPolygonArea(measurements)).toBe(55.5);
    });

    it("ignores polyline measurements", () => {
      const measurements: GarmushkaMeasurement[] = [
        {
          id: "1",
          name: "Room",
          type: "polygon",
          measurement: "25 sqm",
          notes: "",
          color: "blue",
        },
        {
          id: "2",
          name: "Wall",
          type: "polyline",
          measurement: "10 m",
          notes: "",
          color: "red",
        },
      ];
      expect(getPolygonArea(measurements)).toBe(25);
    });

    it("ignores calibration measurements", () => {
      const measurements: GarmushkaMeasurement[] = [
        {
          id: "1",
          name: "Calibration",
          type: "calibration",
          measurement: "1 m",
          notes: "",
          color: "yellow",
        },
        {
          id: "2",
          name: "Room",
          type: "polygon",
          measurement: "50 sqm",
          notes: "",
          color: "blue",
        },
      ];
      expect(getPolygonArea(measurements)).toBe(50);
    });

    it("returns 0 for empty array", () => {
      expect(getPolygonArea([])).toBe(0);
    });

    it("handles malformed measurement strings", () => {
      const measurements: GarmushkaMeasurement[] = [
        {
          id: "1",
          name: "Room",
          type: "polygon",
          measurement: "invalid",
          notes: "",
          color: "blue",
        },
      ];
      expect(getPolygonArea(measurements)).toBe(0);
    });
  });

  describe("getTotalPolylineLength", () => {
    it("calculates total length from polyline measurements", () => {
      const measurements: GarmushkaMeasurement[] = [
        {
          id: "1",
          name: "Wall 1",
          type: "polyline",
          measurement: "5.5 m",
          notes: "",
          color: "red",
        },
        {
          id: "2",
          name: "Wall 2",
          type: "polyline",
          measurement: "7.2 m",
          notes: "",
          color: "red",
        },
      ];
      expect(getTotalPolylineLength(measurements)).toBeCloseTo(12.7);
    });

    it("ignores polygon measurements", () => {
      const measurements: GarmushkaMeasurement[] = [
        {
          id: "1",
          name: "Wall",
          type: "polyline",
          measurement: "10 m",
          notes: "",
          color: "red",
        },
        {
          id: "2",
          name: "Room",
          type: "polygon",
          measurement: "25 sqm",
          notes: "",
          color: "blue",
        },
      ];
      expect(getTotalPolylineLength(measurements)).toBe(10);
    });

    it("returns 0 for empty array", () => {
      expect(getTotalPolylineLength([])).toBe(0);
    });
  });

  describe("isMeasurementCalibrated", () => {
    it("returns true when calibrated with valid metersPerPixel", () => {
      const data: GarmushkaMeasurements = {
        measurementTable: [],
        metersPerPixel: 0.05,
        unitMode: "metric",
        isCalibrated: true,
        fileName: "floor_plan.png",
      };
      expect(isMeasurementCalibrated(data)).toBe(true);
    });

    it("returns false when not calibrated", () => {
      const data: GarmushkaMeasurements = {
        measurementTable: [],
        metersPerPixel: 0.05,
        unitMode: "metric",
        isCalibrated: false,
        fileName: "floor_plan.png",
      };
      expect(isMeasurementCalibrated(data)).toBe(false);
    });

    it("returns false when metersPerPixel is 0", () => {
      const data: GarmushkaMeasurements = {
        measurementTable: [],
        metersPerPixel: 0,
        unitMode: "metric",
        isCalibrated: true,
        fileName: "floor_plan.png",
      };
      expect(isMeasurementCalibrated(data)).toBe(false);
    });

    it("returns false when metersPerPixel is negative", () => {
      const data: GarmushkaMeasurements = {
        measurementTable: [],
        metersPerPixel: -0.05,
        unitMode: "metric",
        isCalibrated: true,
        fileName: "floor_plan.png",
      };
      expect(isMeasurementCalibrated(data)).toBe(false);
    });
  });
});

describe("Step4AIAnalysis Comparable Data Functions", () => {
  const sampleComparables: ComparableProperty[] = [
    { id: "1", address: "הרצל 10", pricePerSqm: 50000, floor: 2, area: 100 },
    { id: "2", address: "הרצל 12", pricePerSqm: 55000, floor: 3, area: 90 },
    { id: "3", address: "הרצל 14", pricePerSqm: 45000, floor: 1, area: 110 },
    { id: "4", address: "הרצל 16", pricePerSqm: 52000, floor: 4, area: 95 },
  ];

  describe("calculateAveragePricePerSqm", () => {
    it("calculates average correctly", () => {
      expect(calculateAveragePricePerSqm(sampleComparables)).toBe(50500);
    });

    it("returns 0 for empty array", () => {
      expect(calculateAveragePricePerSqm([])).toBe(0);
    });

    it("ignores entries without pricePerSqm", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000 },
        { id: "2", address: "No price" },
        { id: "3", pricePerSqm: 60000 },
      ];
      expect(calculateAveragePricePerSqm(comparables)).toBe(55000);
    });

    it("ignores entries with zero pricePerSqm", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000 },
        { id: "2", pricePerSqm: 0 },
        { id: "3", pricePerSqm: 60000 },
      ];
      expect(calculateAveragePricePerSqm(comparables)).toBe(55000);
    });
  });

  describe("calculateMedianPricePerSqm", () => {
    it("calculates median for odd number of values", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000 },
        { id: "2", pricePerSqm: 60000 },
        { id: "3", pricePerSqm: 55000 },
      ];
      expect(calculateMedianPricePerSqm(comparables)).toBe(55000);
    });

    it("calculates median for even number of values", () => {
      expect(calculateMedianPricePerSqm(sampleComparables)).toBe(51000);
    });

    it("returns 0 for empty array", () => {
      expect(calculateMedianPricePerSqm([])).toBe(0);
    });

    it("handles single value", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000 },
      ];
      expect(calculateMedianPricePerSqm(comparables)).toBe(50000);
    });
  });

  describe("applyAdjustments", () => {
    it("applies floor adjustment", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000, floor: 1 },
      ];
      const subject = { floor: 3 };
      const adjusted = applyAdjustments(comparables, subject);

      // Floor diff = 3 - 1 = 2, adjustment = 1 + (2 * 0.02) = 1.04
      expect(adjusted[0].adjustmentFactor).toBeCloseTo(1.04);
      expect(adjusted[0].adjustedPricePerSqm).toBeCloseTo(52000);
    });

    it("applies area adjustment", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000, area: 100 },
      ];
      const subject = { area: 80 };
      const adjusted = applyAdjustments(comparables, subject);

      // Area diff = 80 - 100 = -20, adjustment = 1 + (-20/10 * 0.005) = 0.99
      expect(adjusted[0].adjustmentFactor).toBeCloseTo(0.99);
    });

    it("applies combined adjustments", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000, floor: 1, area: 100 },
      ];
      const subject = { floor: 3, area: 80 };
      const adjusted = applyAdjustments(comparables, subject);

      // Floor: +0.04, Area: -0.01 = 1.03
      expect(adjusted[0].adjustmentFactor).toBeCloseTo(1.03);
    });

    it("returns 1.0 factor when no comparison data", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000 },
      ];
      const adjusted = applyAdjustments(comparables, {});
      expect(adjusted[0].adjustmentFactor).toBe(1.0);
    });
  });

  describe("filterByDistance", () => {
    it("filters comparables by max distance", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", distance: 100 },
        { id: "2", distance: 500 },
        { id: "3", distance: 200 },
        { id: "4", distance: 1000 },
      ];
      const filtered = filterByDistance(comparables, 300);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.id)).toEqual(["1", "3"]);
    });

    it("includes comparables without distance", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", distance: 100 },
        { id: "2", address: "No distance" },
      ];
      const filtered = filterByDistance(comparables, 200);
      expect(filtered).toHaveLength(2);
    });

    it("returns empty array when all exceed distance", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", distance: 500 },
        { id: "2", distance: 600 },
      ];
      const filtered = filterByDistance(comparables, 100);
      expect(filtered).toHaveLength(0);
    });
  });

  describe("filterByRecentSales", () => {
    it("filters by sale date within months", () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.setMonth(now.getMonth() - 2));
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 4));

      const comparables: ComparableProperty[] = [
        { id: "1", saleDate: twoMonthsAgo.toISOString() },
        { id: "2", saleDate: sixMonthsAgo.toISOString() },
      ];

      const filtered = filterByRecentSales(comparables, 3);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("includes comparables without sale date", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", address: "No date" },
        { id: "2", saleDate: new Date().toISOString() },
      ];
      const filtered = filterByRecentSales(comparables, 6);
      expect(filtered).toHaveLength(2);
    });
  });
});

describe("Step4AIAnalysis Market Analysis Functions", () => {
  describe("determineMarketTrend", () => {
    it("returns stable for insufficient data", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000, saleDate: "2024-01-01" },
        { id: "2", pricePerSqm: 55000, saleDate: "2024-02-01" },
      ];
      expect(determineMarketTrend(comparables)).toBe("stable");
    });

    it("returns up for rising prices", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 40000, saleDate: "2023-01-01" },
        { id: "2", pricePerSqm: 42000, saleDate: "2023-02-01" },
        { id: "3", pricePerSqm: 44000, saleDate: "2023-03-01" },
        { id: "4", pricePerSqm: 50000, saleDate: "2024-01-01" },
        { id: "5", pricePerSqm: 52000, saleDate: "2024-02-01" },
        { id: "6", pricePerSqm: 55000, saleDate: "2024-03-01" },
      ];
      expect(determineMarketTrend(comparables)).toBe("up");
    });

    it("returns down for falling prices", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 60000, saleDate: "2023-01-01" },
        { id: "2", pricePerSqm: 58000, saleDate: "2023-02-01" },
        { id: "3", pricePerSqm: 56000, saleDate: "2023-03-01" },
        { id: "4", pricePerSqm: 50000, saleDate: "2024-01-01" },
        { id: "5", pricePerSqm: 48000, saleDate: "2024-02-01" },
        { id: "6", pricePerSqm: 45000, saleDate: "2024-03-01" },
      ];
      expect(determineMarketTrend(comparables)).toBe("down");
    });

    it("returns stable for flat prices", () => {
      const comparables: ComparableProperty[] = [
        { id: "1", pricePerSqm: 50000, saleDate: "2023-01-01" },
        { id: "2", pricePerSqm: 50500, saleDate: "2023-02-01" },
        { id: "3", pricePerSqm: 49500, saleDate: "2023-03-01" },
        { id: "4", pricePerSqm: 50200, saleDate: "2024-01-01" },
        { id: "5", pricePerSqm: 50800, saleDate: "2024-02-01" },
        { id: "6", pricePerSqm: 50100, saleDate: "2024-03-01" },
      ];
      expect(determineMarketTrend(comparables)).toBe("stable");
    });
  });
});

describe("Step4AIAnalysis Integration", () => {
  describe("Complete analysis workflow", () => {
    it("processes garmushka measurements correctly", () => {
      const garmushkaData: GarmushkaMeasurements = {
        measurementTable: [
          {
            id: "cal",
            name: "Calibration",
            type: "calibration",
            measurement: "1m",
            notes: "",
            color: "yellow",
          },
          {
            id: "room1",
            name: "Living Room",
            type: "polygon",
            measurement: "35 sqm",
            notes: "",
            color: "blue",
          },
          {
            id: "room2",
            name: "Bedroom",
            type: "polygon",
            measurement: "15 sqm",
            notes: "",
            color: "green",
          },
          {
            id: "wall1",
            name: "Wall",
            type: "polyline",
            measurement: "8.5 m",
            notes: "",
            color: "red",
          },
        ],
        metersPerPixel: 0.05,
        unitMode: "metric",
        isCalibrated: true,
        fileName: "floor_plan.png",
      };

      expect(isMeasurementCalibrated(garmushkaData)).toBe(true);
      expect(getPolygonArea(garmushkaData.measurementTable)).toBe(50);
      expect(getTotalPolylineLength(garmushkaData.measurementTable)).toBe(8.5);
    });

    it("processes comparable data analysis correctly", () => {
      const comparables: ComparableProperty[] = [
        {
          id: "1",
          address: "הרצל 10",
          pricePerSqm: 50000,
          floor: 2,
          area: 100,
          distance: 100,
          saleDate: "2024-01-01",
        },
        {
          id: "2",
          address: "הרצל 12",
          pricePerSqm: 55000,
          floor: 3,
          area: 90,
          distance: 200,
          saleDate: "2024-02-01",
        },
        {
          id: "3",
          address: "הרצל 14",
          pricePerSqm: 52000,
          floor: 2,
          area: 95,
          distance: 150,
          saleDate: "2024-03-01",
        },
      ];

      const subject = { floor: 2, area: 100 };

      // Filter by distance
      const nearbyComparables = filterByDistance(comparables, 300);
      expect(nearbyComparables).toHaveLength(3);

      // Apply adjustments
      const adjusted = applyAdjustments(nearbyComparables, subject);
      expect(adjusted.every((c) => c.adjustmentFactor !== undefined)).toBe(
        true,
      );

      // Calculate stats
      const avgPrice = calculateAveragePricePerSqm(adjusted);
      const medianPrice = calculateMedianPricePerSqm(adjusted);

      expect(avgPrice).toBeGreaterThan(0);
      expect(medianPrice).toBeGreaterThan(0);
    });

    it("handles empty analysis data gracefully", () => {
      const emptyGIS: GISScreenshots = {};
      expect(isGISDataComplete(emptyGIS)).toBe(false);

      const emptyGarmushka: GarmushkaMeasurements = {
        measurementTable: [],
        metersPerPixel: 0,
        unitMode: "metric",
        isCalibrated: false,
        fileName: "",
      };
      expect(isMeasurementCalibrated(emptyGarmushka)).toBe(false);
      expect(getPolygonArea(emptyGarmushka.measurementTable)).toBe(0);

      expect(calculateAveragePricePerSqm([])).toBe(0);
      expect(calculateMedianPricePerSqm([])).toBe(0);
    });
  });

  describe("Data persistence structure", () => {
    it("validates GIS data for save", () => {
      const gisData = {
        gisScreenshots: {
          wideArea: "data:image/png;base64,...",
          zoomedNoTazea: "data:image/png;base64,...",
        },
        gisAnalysis: {
          coordinates: { latitude: 32.0853, longitude: 34.7818 },
        },
      };

      expect(validateGISScreenshots(gisData.gisScreenshots)).toBe(true);
      expect(isGISDataComplete(gisData.gisScreenshots)).toBe(true);
    });

    it("validates Garmushka data for save", () => {
      const garmushkaData: GarmushkaMeasurements = {
        measurementTable: [
          {
            id: "1",
            name: "Room",
            type: "polygon",
            measurement: "100 sqm",
            notes: "",
            color: "blue",
          },
        ],
        metersPerPixel: 0.05,
        unitMode: "metric",
        isCalibrated: true,
        fileName: "floor.png",
        pngExport: "data:image/png;base64,...",
      };

      expect(isMeasurementCalibrated(garmushkaData)).toBe(true);
      expect(garmushkaData.measurementTable.length).toBeGreaterThan(0);
    });

    it("validates comparable analysis for save", () => {
      const analysis: ComparableDataAnalysis = {
        averagePricePerSqm: 52000,
        medianPricePerSqm: 51000,
        adjustmentFactor: 1.02,
        section52: {
          finalPricePerSqm: 53000,
        },
      };

      expect(analysis.averagePricePerSqm).toBeDefined();
      expect(analysis.medianPricePerSqm).toBeDefined();
      expect(analysis.section52?.finalPricePerSqm).toBe(53000);
    });
  });
});
