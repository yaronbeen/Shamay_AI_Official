import { ValuationData } from "@/types/valuation";
import { STATIC_TEXTS } from "./static-texts-he";
import { LOCKED_HEBREW_TEXT, COMPLETE_TA_BINDINGS } from "./report-spec-hebrew";
import { formatBlockParcelFromString } from "./comparable-data-formatter";

export interface CompanySettings {
  companyLogo?: string;
  footerLogo?: string;
  companyName?: string;
  companySlogan?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  associationMembership?: string;
  services?: string[];
  signature?: string;
  // Font settings
  fontFamily?: "david" | "noto-sans-hebrew" | "rubik";
  fontSize?: number; // default 12
}

// Available font configurations
const FONT_FAMILIES = {
  david: '"David Libre", David, serif',
  "noto-sans-hebrew":
    '"Noto Sans Hebrew", "Rubik", "Arial Hebrew", Arial, sans-serif',
  rubik: 'Rubik, "Noto Sans Hebrew", Arial, sans-serif',
} as const;

const getFontFamily = (settings?: CompanySettings): string => {
  const fontKey = settings?.fontFamily || "david";
  return FONT_FAMILIES[fontKey] || FONT_FAMILIES["david"];
};

const getFontSize = (settings?: CompanySettings): number => {
  return settings?.fontSize || 12;
};

const PAGE_MIN_HEIGHT_MM = 297;
const DEFAULT_FONT_FAMILY =
  '"Noto Sans Hebrew", "Rubik", "Arial Hebrew", Arial, sans-serif';

const hebrewMonths = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

const numberToHebrewWords = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "—";
  }
  const num = Math.floor(Number(value));

  const ones = [
    "",
    "אחד",
    "שניים",
    "שלושה",
    "ארבעה",
    "חמישה",
    "שישה",
    "שבעה",
    "שמונה",
    "תשעה",
  ];
  const tens = [
    "",
    "עשרה",
    "עשרים",
    "שלושים",
    "ארבעים",
    "חמישים",
    "שישים",
    "שבעים",
    "שמונים",
    "תשעים",
  ];
  const teens = [
    "עשר",
    "אחת עשרה",
    "שתים עשרה",
    "שלוש עשרה",
    "ארבע עשרה",
    "חמש עשרה",
    "שש עשרה",
    "שבע עשרה",
    "שמונה עשרה",
    "תשע עשרה",
  ];

  const convertHundreds = (num: number): string => {
    if (num === 0) {
      return "";
    }
    if (num < 10) {
      return ones[num];
    }
    if (num < 20) {
      return teens[num - 10];
    }
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      return `${tens[ten]}${one ? ` ו${ones[one]}` : ""}`.trim();
    }
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const hundredWord =
      hundred === 1
        ? "מאה"
        : hundred === 2
          ? "מאתיים"
          : `${ones[hundred]} מאות`;
    if (rest === 0) {
      return hundredWord;
    }
    return `${hundredWord} ו${convertHundreds(rest)}`;
  };

  const chunks: string[] = [];
  let remaining = Math.floor(Number(value));

  const millions = Math.floor(remaining / 1_000_000);
  if (millions) {
    chunks.push(
      millions === 1 ? "מליון" : `${convertHundreds(millions)} מליון`,
    );
    remaining %= 1_000_000;
  }

  const thousands = Math.floor(remaining / 1_000);
  if (thousands) {
    chunks.push(
      thousands === 1
        ? "אלף"
        : thousands === 2
          ? "אלפיים"
          : `${convertHundreds(thousands)} אלף`,
    );
    remaining %= 1_000;
  }

  if (remaining) {
    chunks.push(convertHundreds(remaining));
  }

  if (!chunks.length) {
    return "אפס";
  }

  let result = chunks.join(" ").replace(/ +/g, " ").trim();

  // תיקון כתיב: "שבעה מאות" -> "ושבע מאות" אם יש מליון לפני
  if (millions > 0 && result.includes("שבעה מאות")) {
    result = result.replace("שבעה מאות", "ושבע מאות");
  }

  return result + ' ש"ח';
};

const formatDateNumeric = (value?: string) => {
  if (!value) {
    return "—";
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString();
    return `${day}.${month}.${year}`;
  } catch {
    return "—";
  }
};

const formatDateHebrew = (value?: string) => {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    return "—";
  }
  const day = source.getDate();
  const month = hebrewMonths[source.getMonth()];
  const year = source.getFullYear();
  return `${day} ${month} ${year}`;
};

// Helper function to safely parse numeric values (handles strings from backend)
const parseNumeric = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "number") {
    return isNaN(value) || !isFinite(value) ? fallback : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed === "" ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined"
    ) {
      return fallback;
    }
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
  }
  return fallback;
};

const formatCurrency = (value?: number | string) => {
  const numValue = parseNumeric(value);
  if (
    numValue === 0 &&
    (value === undefined || value === null || value === "")
  ) {
    return "₪ —";
  }
  return `₪ ${numValue.toLocaleString("he-IL")}`;
};

const formatNumber = (value?: number | string, fallbackText = "—") => {
  if (value === undefined || value === null || value === "") {
    return fallbackText;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString("he-IL");
  }
  return String(value);
};

const formatRooms = (
  rooms?: number | string,
  airDirections?: string | number,
) => {
  if (!rooms) {
    return "דירת מגורים";
  }
  // airDirections is now a string like "צפון-מזרח"
  const airText =
    typeof airDirections === "string" && airDirections.trim()
      ? ` הפונה לכיוונים ${airDirections.trim()}`
      : "";
  return `דירת מגורים בת ${rooms} חדרים${airText}`;
};

const formatFloor = (floor?: number | string) => {
  if (!floor && floor !== 0) {
    return "";
  }
  return `בקומה ${floor}`;
};

// Escape HTML special characters for safe rendering
const escapeHtmlForTable = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Generate HTML for a single custom table
const generateCustomTableHTML = (table: {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
}): string => {
  const tableId = `custom-table-${table.id}`;

  const headerCells = table.headers
    .map(
      (h, i) =>
        `<th data-col="${i}">${escapeHtmlForTable(h || `עמודה ${i + 1}`)}</th>`,
    )
    .join("");

  const bodyRows = table.rows
    .map((row, rowIdx) => {
      const cells = row
        .map(
          (cell, colIdx) =>
            `<td data-row="${rowIdx}" data-col="${colIdx}">${escapeHtmlForTable(cell || "")}</td>`,
        )
        .join("");
      return `<tr data-row="${rowIdx}">${cells}</tr>`;
    })
    .join("");

  return `
    <div id="${tableId}" class="custom-table-container section-block" data-custom-table-id="${table.id}">
      ${table.title ? `<div class="sub-title">${escapeHtmlForTable(table.title)}</div>` : ""}
      <table class="table">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
};

// Generate HTML for all custom tables
const generateAllCustomTablesHTML = (
  customTables?: Array<{
    id: string;
    title?: string;
    headers: string[];
    rows: string[][];
  }>,
): string => {
  if (!customTables || customTables.length === 0) {
    return "";
  }

  return `
    <section class="page custom-tables-section">
      <div class="chapter-title">נספחים - טבלאות מותאמות אישית</div>
      <div class="page-body">
        ${customTables.map((table) => generateCustomTableHTML(table)).join("\n")}
      </div>
    </section>
  `;
};

const formatOwnership = (data: ValuationData) => {
  const landRegistry = resolveLandRegistryData(data).landRegistry;
  // Only return ownership TYPE (e.g., "בעלות פרטית"), never owner names
  const ownershipType =
    landRegistry?.ownership_type ||
    (data.extractedData as any)?.ownership_type ||
    (data.extractedData as any)?.ownershipType ||
    (data as any).ownership_type;

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

// Summarize attachments for the property details table (e.g., "2 חניות ומחסן")
const summarizeAttachments = (data: ValuationData): string => {
  const landRegistry = resolveLandRegistryData(data).landRegistry;

  // Collect attachment items
  const attachmentItems: any[] = [];

  // 1. Check data.attachments as string (direct from database)
  if (
    (data as any).attachments &&
    typeof (data as any).attachments === "string"
  ) {
    const attachmentsStr = (data as any).attachments.trim();
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
  if (Array.isArray((landRegistry as any)?.attachments)) {
    attachmentItems.push(...(landRegistry as any).attachments);
  }

  // 3. From extractedData attachments
  if (Array.isArray(data.extractedData?.attachments)) {
    attachmentItems.push(...data.extractedData.attachments);
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
      (data as any).attachmentsSummary ||
      (data.extractedData as any)?.attachments_summary;
    if (summary) return summary;
    return "—";
  }

  return parts.join(" ו");
};

const getAddress = (data: ValuationData) => {
  const { street, buildingNumber, city, neighborhood } = data;
  if (!street || !buildingNumber || !city) {
    return "—";
  }
  const neighborhoodSegment = neighborhood ? `, שכונת ${neighborhood}` : "";
  return `${street} ${buildingNumber}${neighborhoodSegment}, ${city}`;
};

const getReference = (data: ValuationData) => {
  if (data.referenceNumber) {
    return data.referenceNumber;
  }
  const address = getAddress(data).replace(/[^א-ת0-9]/g, "");
  return `1000_${address.substring(0, 10)}`;
};

const normalizeText = (value?: string, fallbackText = "—") => {
  if (!value) {
    return fallbackText;
  }
  return value;
};

const safeValue = (value?: string | number, fallback = "—") => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return fallback;
  }
  return value;
};

// Helper to get nested values (used throughout the template)
const getValueFromPaths = (obj: any, paths: string[]): any => {
  for (const path of paths) {
    const keys = path.split(".");
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === "object") {
        value = value[key];
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

// Helper to get subParcel value (used in multiple places)
const getSubParcelValue = (
  data: any,
  landRegistry?: any,
): string | number | undefined => {
  return (
    getValueFromPaths(data, [
      "extractedData.subParcel",
      "extractedData.sub_parcel",
      "extractedData.land_registry.subParcel",
      "extractedData.land_registry.sub_parcel",
      "land_registry.sub_chelka",
      "subParcel",
    ]) ||
    data.extractedData?.subParcel ||
    data.extractedData?.sub_parcel ||
    landRegistry?.sub_chelka ||
    data.subParcel ||
    undefined
  );
};

const createDetailsTable = (data: ValuationData) => {
  const landRegistry = resolveLandRegistryData(data).landRegistry;

  // Get attachments summary (e.g., "2 מקומות חניה ומחסן")
  const attachmentsSummary = summarizeAttachments(data);

  const registeredAreaValue = formatNumber(
    (data as any).registeredArea ||
      data.extractedData?.apartment_registered_area ||
      data.extractedData?.apartmentRegisteredArea ||
      landRegistry?.apartment_registered_area,
    "",
  );

  // Get balcony area for display
  const balconyArea = Number(
    (data.extractedData as any)?.balconyArea || (data as any).balconyArea || 0,
  );
  const balconyText =
    balconyArea > 0 ? ` + ${balconyArea} מ"ר מרפסת לא מקורה` : "";

  const builtAreaValue = formatNumber(
    data.extractedData?.builtArea ||
      data.builtArea ||
      landRegistry?.built_area ||
      (data as any).builtArea,
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

const createComparablesTable = (data: ValuationData) => {
  const items: any[] = Array.isArray(
    (data as any).comparableData || (data as any).comparable_data,
  )
    ? (data as any).comparableData || (data as any).comparable_data
    : [];

  if (!items.length) {
    return `
      <p class="muted">נתוני השוואה יוצגו לאחר הזנה במערכת</p>
    `;
  }

  const rows = items.slice(0, 10).map((item) => {
    // Parse sale date - backend returns sale_day (prioritize this)
    const saleDate = formatDateNumeric(
      item.sale_day ||
        item.sale_date ||
        item.date ||
        item.transaction_date ||
        item.saleDate,
    );

    // Format gush/chelka using the formatter function
    // If block_of_land exists, use formatBlockParcelFromString to convert "007113-0009-010-00" → "7113/9"
    const rawBlockOfLand = item.block_of_land || item.gush_chelka_code;
    const gushChelka = rawBlockOfLand
      ? formatBlockParcelFromString(rawBlockOfLand)
      : normalizeText(
          item.gush_chelka || item.block_lot || item.gushChelka,
          "—",
        );

    // Parse address - backend returns address (constructed from asset_details or settlement)
    const address = normalizeText(
      item.address || item.street_address || item.streetAddress,
      "—",
    );

    // Parse rooms - backend returns rooms (numeric)
    const rooms = normalizeText(item.rooms || item.room_count, "—");

    // Parse floor - backend returns floor (from asset_details, may be null)
    const floor = normalizeText(
      item.floor || item.floor_number || item.floor_num || item.floorNumber,
      "—",
    );

    // Parse size - backend returns surface (numeric, prioritize this)
    const size = normalizeText(
      item.surface ||
        item.size ||
        item.area ||
        item.sqm ||
        item.sizeInSqm ||
        item.apartmentArea,
      "—",
    );

    // Parse build year - backend returns year_of_constru (from year_of_construction, prioritize this)
    const buildYear = normalizeText(
      item.year_of_constru ||
        item.year_of_construction ||
        item.building_year ||
        item.year_built ||
        item.construction_year ||
        item.buildYear ||
        item.constructionYear,
      "—",
    );
    // Parse prices safely (handles strings from backend)
    const salePrice = parseNumeric(
      item.price ||
        item.declared_price ||
        item.sale_value_nis ||
        item.estimated_price_ils,
    );
    const price =
      salePrice > 0 ? `₪ ${salePrice.toLocaleString("he-IL")}` : "—";

    const pricePerSqmValue = parseNumeric(item.price_per_sqm);
    const pricePerSqm =
      pricePerSqmValue > 0
        ? `₪ ${(Math.round(pricePerSqmValue / 100) * 100).toLocaleString("he-IL")}`
        : "—";

    return `
      <tr>
        <td>${saleDate}</td>
        <td class="address-cell">${address}</td>
        <td>${gushChelka}</td>
        <td>${rooms}</td>
        <td>${floor}</td>
        <td>${size}</td>
        <td>${buildYear}</td>
        <td>${price}</td>
        <td>${pricePerSqm}</td>
      </tr>
    `;
  });

  return `
    <table class="table comparables">
      <thead>
        <tr>
          <th>יום מכירה</th>
          <th class="address-cell">כתובת</th>
          <th>גו"ח</th>
          <th>חדרים</th>
          <th>קומה</th>
          <th>שטח דירה (מ"ר)</th>
          <th>שנת בניה</th>
          <th>מחיר עסקה</th>
          <th>מחיר למ"ר, במעוגל</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
};

const resolveCoverImageSources = (data: ValuationData): string[] => {
  const pickFirstValid = (value?: string | null) => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const fromSelected = pickFirstValid((data as any).selectedImagePreview);
  if (fromSelected) {
    return [fromSelected];
  }

  const directFields = [
    (data as any).coverImage,
    (data as any).coverPhoto,
    (data as any).coverPhotoUrl,
    (data as any).cover_image,
    (data as any).cover_photo,
  ];
  for (const field of directFields) {
    const found = pickFirstValid(field);
    if (found) {
      return [found];
    }
  }

  const propertyImages = Array.isArray((data as any).propertyImages)
    ? (data as any).propertyImages
    : [];
  const propertyPriority = [
    propertyImages.filter(
      (entry: any) =>
        (entry?.type || "").toString().toLowerCase() === "building_image",
    ),
    propertyImages.filter((entry: any) => !entry?.type),
  ];
  for (const group of propertyPriority) {
    for (const entry of group) {
      if (!entry) continue;
      const sources = [
        pickFirstValid(entry.preview),
        pickFirstValid(entry.url),
        pickFirstValid(entry.path),
        pickFirstValid(entry.signedUrl),
      ];
      const found = sources.find(Boolean);
      if (found) {
        return [found];
      }
    }
  }

  const uploads = Array.isArray((data as any).uploads)
    ? (data as any).uploads
    : [];
  const uploadPriority = [
    uploads.filter(
      (upload: any) =>
        (upload?.type || "").toString().toLowerCase() === "building_image",
    ),
    uploads.filter((upload: any) => !upload?.type),
  ];
  for (const group of uploadPriority) {
    for (const upload of group) {
      if (!upload) continue;
      const sources = [
        pickFirstValid(upload.preview),
        pickFirstValid(upload.url),
        pickFirstValid(upload.path),
        pickFirstValid(upload.fileUrl),
        pickFirstValid(upload.absoluteUrl),
      ];
      const found = sources.find(Boolean);
      if (found) {
        return [found];
      }
    }
  }

  return [];
};

const collectInteriorImages = (data: ValuationData): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  // Helper to validate if an image URL is valid and accessible
  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();

    // Filter out empty strings
    if (!trimmed) return false;

    // Filter out placeholder indicators
    if (
      trimmed.includes("placeholder") ||
      trimmed.includes("[") ||
      trimmed.includes("לא זמין")
    ) {
      return false;
    }

    // Must be a valid URL or data URI
    if (
      !trimmed.startsWith("http") &&
      !trimmed.startsWith("/") &&
      !trimmed.startsWith("data:")
    ) {
      return false;
    }

    // Check if it looks like a valid image extension or blob URL
    const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(
      trimmed,
    );
    const isBlobUrl =
      trimmed.includes("blob.vercel-storage.com") ||
      trimmed.includes("/api/files/");
    const isDataUri = trimmed.startsWith("data:image/");

    return hasValidExtension || isBlobUrl || isDataUri;
  };

  // Helper to determine if a URL is base64 (large data URI)
  const isBase64 = (url: string): boolean => {
    return url.startsWith("data:image/");
  };

  // Helper to get the best URL from an upload entry
  // Priority: url (blob) > signedUrl > path > fileUrl > absoluteUrl > preview (base64 - last resort)
  const getBestUrlFromEntry = (entry: any): string | null => {
    if (!entry) return null;

    // Try blob URLs first (preferred - smaller, faster, persistent)
    const candidates = [
      entry.url,
      entry.signedUrl,
      entry.path,
      entry.fileUrl,
      entry.absoluteUrl,
      entry.preview, // base64 - only use as last resort
    ];

    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate === "string" &&
        isValidImageUrl(candidate)
      ) {
        // Prefer non-base64 URLs
        if (!isBase64(candidate)) {
          return candidate.trim();
        }
      }
    }

    // If all candidates are invalid, try base64 as last resort
    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate === "string" &&
        isValidImageUrl(candidate)
      ) {
        return candidate.trim();
      }
    }

    return null;
  };

  const add = (value?: string | null) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed) || !isValidImageUrl(trimmed)) {
      return;
    }
    seen.add(trimmed);
    results.push(trimmed);
  };

  const isInteriorType = (value?: string) => {
    const type = (value || "").toString().toLowerCase();
    return (
      type === "interior_image" ||
      type === "interior" ||
      type === "room" ||
      type === "living_room"
    );
  };

  // SINGLE SOURCE OF TRUTH: Use uploads array (most up-to-date and has status tracking)
  const uploads = Array.isArray((data as any).uploads)
    ? (data as any).uploads
    : [];
  const interiorUploads = uploads.filter((entry: any) => {
    // Only include completed uploads of interior type
    return entry.status === "completed" && isInteriorType(entry?.type);
  });

  // Get the best URL for each upload (ONE URL per upload, not duplicates)
  interiorUploads.forEach((upload: any) => {
    const bestUrl = getBestUrlFromEntry(upload);
    if (bestUrl) {
      add(bestUrl);
    }
  });

  // FALLBACK: If no uploads found, try interiorImages array (for backward compatibility)
  if (results.length === 0) {
    const interiorArrays: Array<string[] | undefined> = [
      Array.isArray((data as any).interiorImages)
        ? (data as any).interiorImages
        : undefined,
    ];

    interiorArrays.forEach((array) => {
      if (!array) return;
      array.forEach(add);
    });
  }

  // Return only valid images (up to 6)
  return results.filter(isValidImageUrl).slice(0, 6);
};

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const resolveLandRegistryData = (data: ValuationData) => {
  const mergedRegistry = mergeRecords(
    (data.extractedData as any)?.land_registry,
    (data.extractedData as any)?.landRegistry,
    (data as any).land_registry,
    (data as any).landRegistry,
  );

  const owners = toArray((mergedRegistry as any).owners).map((owner) => ({
    name: owner?.name || owner?.owner_name,
    idNumber: owner?.id_number || owner?.idNumber,
    share: owner?.ownership_share || owner?.share || "שלמות",
  }));

  const mortgages = toArray((mergedRegistry as any).mortgages).map(
    (mortgage: any) => ({
      rank: mortgage?.rank || mortgage?.mortgage_rank,
      share: mortgage?.share || mortgage?.mortgage_property_share,
      amount: mortgage?.amount || mortgage?.mortgage_amount,
      lenders: mortgage?.lenders || mortgage?.mortgage_lenders,
      borrowers: mortgage?.borrowers || mortgage?.mortgage_borrowers,
      registrationDate:
        mortgage?.registration_date || mortgage?.registrationDate,
      essence: mortgage?.essence || mortgage?.mortgage_essence,
    }),
  );

  const attachments = toArray((mergedRegistry as any).attachments).map(
    (attachment: any) => ({
      type: attachment?.type || attachment?.description,
      area: attachment?.area,
      color: attachment?.color,
      symbol: attachment?.symbol,
      sharedWith: attachment?.shared_with || attachment?.sharedWith,
    }),
  );

  const additionalAreas = toArray((mergedRegistry as any).additional_areas).map(
    (item: any) => ({
      type: item?.type,
      area: item?.area,
    }),
  );

  return {
    landRegistry: mergedRegistry,
    owners,
    mortgages,
    attachments,
    additionalAreas,
  };
};

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildBaseCss = (settings?: CompanySettings) => `
  /* ===== MMBL Professional Report Styles ===== */
  @font-face {
    font-family: 'David Libre';
    font-style: normal;
    font-weight: 400;
    src: url('/fonts/DavidLibre-Regular.ttf') format('truetype');
  }
  @font-face {
    font-family: 'David Libre';
    font-style: normal;
    font-weight: 700;
    src: url('/fonts/DavidLibre-Bold.ttf') format('truetype');
  }
  @font-face {
    font-family: 'Noto Sans Hebrew';
    font-style: normal;
    font-weight: 400;
    src: local('Noto Sans Hebrew'), local('NotoSansHebrew-Regular');
        }
        @page {
          size: A4;
          margin: 0;
        }
  * {
    box-sizing: border-box;
        }
        body {
    font-family: ${getFontFamily(settings)};
    font-size: ${getFontSize(settings)}pt;
    line-height: 1.7;
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
          direction: rtl;
          text-align: right;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
  .document {
          width: 100%;
    margin: 0 auto;
          padding: 16px 0 32px;
        }
  
  /* ===== PAGE STRUCTURE ===== */
  .page {
    position: relative;
    page-break-after: auto;
          page-break-inside: avoid;
    padding: 12mm 18mm 18mm 18mm;
    margin-bottom: 20px;
    background: #ffffff;
    min-height: ${PAGE_MIN_HEIGHT_MM}mm;
  }
  .page.cover {
    position: relative;
          page-break-after: always;
    padding: 8mm 18mm 0mm 18mm; /* No bottom padding - footer is absolute */
    background: white;
    color: #000000;
    border: none;
    min-height: 297mm;
    height: 297mm;
    max-height: 297mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Visual page separator for preview (dashed line between pages) */
  .page:not(.cover):not(:last-of-type)::after {
    content: '';
    display: block;
    position: absolute;
    bottom: -10px;
    left: 10%;
    right: 10%;
    border-bottom: 2px dashed #94a3b8;
    pointer-events: none;
  }

  /* Auto page break visual marker */
  .auto-page-break-marker {
    position: relative;
    margin: 12px 0;
  }
  .auto-page-break-marker::before {
    content: '--- עמוד חדש ---';
    display: block;
    text-align: center;
    color: #94a3b8;
    font-size: 9pt;
    border-top: 1px dashed #94a3b8;
    padding-top: 4px;
  }

  /* Hide visual separators in print/PDF */
  @media print {
    .page::after {
      display: none !important;
    }
    .auto-page-break-marker::before {
      display: none !important;
    }
  }

  /* ===== HEADER - MMBL Style - Compact ===== */
  .page-header {
    text-align: center;
    margin-bottom: 8px;
    padding-bottom: 4px;
  }
  .page-header-logo {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 2px;
    color: #1e3a8a;
    margin-bottom: 0;
  }
  .page-header-company {
    font-size: 9pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 0;
  }
  .page-header-tagline {
    font-size: 8pt;
    color: #1e3a8a;
  }
  .page-header-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .page-header-brand img {
    max-height: 45px;
  }
  
  /* ===== FOOTER - Simple large logo at bottom ===== */
  .page-footer {
    position: absolute;
    bottom: 0;
    left: 18mm;
    right: 18mm;
    display: flex;
    justify-content: center;
    align-items: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .footer-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .footer-logo img {
    max-height: 80px;
    width: auto;
    height: auto;
    display: block;
  }
  .page-number {
    font-size: 8pt;
    color: #000000;
    text-align: left;
    margin-top: 2px;
  }
  .page.cover .page-number {
    display: none;
  }
  
  /* ===== COVER PAGE ===== */
  .cover-header {
    text-align: center;
    margin-bottom: 5px;
    flex-shrink: 0;
  }
  .cover-title-box {
    background: #f0f0f0;
    border: 1.5px solid #000000;
    padding: 12px 20px;
    margin: 8px auto;
    max-width: 520px;
    text-align: center;
    flex-shrink: 0;
  }
  .cover-title-main {
    font-size: 13pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 4px;
  }
  .cover-title-sub {
    font-size: 15pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 4px;
  }
  .cover-title-type {
    font-size: 12pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 6px;
  }
  .cover-address {
    font-size: 12pt;
          font-weight: 700; 
    color: #000000;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .cover-image-frame {
    width: 100%;
    max-width: 520px;
    margin: 5px auto 0;
    border: 1.5px solid #000000;
    overflow: hidden;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    max-height: 100%;
  }
  .cover-image-frame img {
    width: 100%;
    height: 100%;
    max-height: 100%;
    display: block;
    border-radius: 0;
    object-fit: cover;
  }
  /* Cover footer - Simple large logo at bottom */
  .cover-footer-container {
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 10mm 18mm 5mm 18mm !important;
    line-height: 0 !important;
    background: white !important;
    flex-shrink: 0;
    border: none;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 10;
  }
  .cover-footer-container img {
    display: block !important;
    width: auto !important;
    max-width: 100% !important;
    max-height: 120px !important;
    height: auto !important;
    object-fit: contain !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* ===== CHAPTER & SECTION TITLES ===== */
  .chapter-title {
    font-size: 14pt;
    font-weight: 700;
    color: #1e3a8a;
    margin: 20px 0 16px;
    text-align: right;
    text-decoration: underline;
    text-underline-offset: 4px;
    /* Page break control - avoid orphaned chapter headers */
    break-after: avoid;
    break-inside: avoid;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  /* Wrapper for chapter header + first content to keep together */
  .chapter-header-group {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 12pt;
    font-weight: 700;
    color: #000000;
    margin: 16px 0 10px;
    text-align: right;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sub-title {
    font-size: 11pt;
    font-weight: 700;
    color: #000000;
    margin: 12px 0 8px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sub-title::before {
    display: none;
  }
  
  /* ===== PAGE BODY ===== */
  .page-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 45px;
  }
  p {
    margin: 0 0 8px 0;
    color: #000000;
    text-align: justify;
    line-height: 1.8;
  }
  .page-body p + p {
    margin-top: 0;
  }
  
  /* ===== TABLES - Clean Professional Style - Keep on same page ===== */
  .table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px;
    font-size: 9.5pt;
    background: #ffffff;
    table-layout: auto;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .table th,
  .table td {
    border: none;
    border-bottom: 1px solid #cccccc;
    padding: 6px 8px;
    text-align: right;
    vertical-align: middle;
    word-break: break-word;
    line-height: 1.5;
  }
  .table thead th {
    border-bottom: 2px solid #000000;
    background: transparent;
    font-weight: 700;
    color: #000000;
  }
  tr, th, td {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .table th {
    background: transparent;
    font-weight: 700;
    color: #000000;
  }
  .table.comparables {
    font-size: 8.5pt;
  }
  .table.comparables th,
  .table.comparables td {
    padding: 4px 6px;
    white-space: nowrap;
    border: none;
    border-bottom: 1px solid #cccccc;
  }
  .table.comparables thead th {
    border-bottom: 2px solid #000000;
  }
  .table.comparables th {
    font-size: 8.5pt;
    font-weight: 700;
  }
  .table.comparables .address-cell {
    white-space: normal;
    word-wrap: break-word;
    max-width: 100px;
  }
  /* Keep tables with their headers on same page */
  .table-wrapper {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .details-table {
    width: auto;
  }
  .details-table th,
  .details-table td {
    border: none;
    border-bottom: 1px solid #eeeeee;
  }
  .details-table th {
    width: 120px;
    font-weight: 600;
    background: #ffffff;
    color: #000000;
    text-align: right;
  }
  .details-table td {
    font-weight: 400;
  }

  /* ===== CUSTOM UPLOADED TABLES ===== */
  .custom-table-container {
    margin: 20px 0;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 16px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .custom-table-container .sub-title {
    font-size: 11pt;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
  }
  .custom-table-container .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    border: 1px solid #d1d5db;
  }
  .custom-table-container .table th,
  .custom-table-container .table td {
    border-bottom: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: right;
    vertical-align: middle;
  }
  .custom-table-container .table thead th {
    background: #f3f4f6;
    border-bottom: 2px solid #1f2937;
    font-weight: 700;
    color: #1f2937;
  }
  /* Striped rows for better readability */
  .custom-table-container .table tbody tr:nth-child(even) {
    background: #f9fafb;
  }
  /* Hover effect for rows */
  .custom-table-container .table tbody tr:hover {
    background: #f3f4f6;
  }
  /* Edit mode hover effects for custom tables */
  .custom-table-container[data-edit-mode="true"] {
    outline: 2px dashed transparent;
    transition: outline-color 0.2s;
  }
  .custom-table-container[data-edit-mode="true"]:hover {
    outline-color: rgba(59, 130, 246, 0.4);
  }
  .custom-table-container[data-edit-mode="true"] td:hover,
  .custom-table-container[data-edit-mode="true"] th:hover {
    background: rgba(191, 219, 254, 0.3);
    cursor: text;
  }

  /* ===== FOOTNOTES ===== */
  .page-footnotes {
    position: absolute;
    bottom: 60px;
    right: 18mm;
    left: 18mm;
    font-size: 9pt;
    line-height: 1.4;
    border-top: 1px solid #000000;
    padding-top: 8px;
  }
  .page-footnotes p {
    margin: 2px 0;
    text-align: right;
  }
  .footnote-ref {
    font-size: 8pt;
    vertical-align: super;
    color: #1e3a8a;
    cursor: pointer;
  }
  .footnote-number {
    font-weight: 700;
    margin-left: 4px;
  }

  /* ===== LISTS ===== */
  ul {
    margin: 8px 0;
    padding-right: 20px;
    color: #000000;
  }
  ul li {
    margin-bottom: 6px;
    line-height: 1.7;
  }
  ul.bullet-list {
    list-style: none;
    padding: 0;
    margin: 8px 0;
  }
  ul.bullet-list li {
    position: relative;
    padding: 0 20px 0 0;
    margin-bottom: 6px;
    background: transparent;
    border-radius: 0;
    border: none;
  }
  ul.bullet-list li::before {
    content: '-';
    font-size: 12pt;
    line-height: 1;
    position: absolute;
    right: 0;
    top: 2px;
    color: #000000;
  }
  .legal-list {
    list-style: none;
    padding: 0;
    margin: 8px 0;
  }
  .legal-list li {
    padding: 6px 20px 6px 0;
    position: relative;
    border-radius: 0;
    border: none;
    background: transparent;
    margin-bottom: 10px;
    line-height: 1.6;
  }
  .legal-list li::before {
    content: '-';
    position: absolute;
    right: 0;
    top: 6px;
  }
  
  /* ===== IMAGES & MEDIA ===== */
  img {
    border-radius: 0;
    display: block;
          max-width: 100%;
          height: auto;
    break-inside: avoid;
          page-break-inside: avoid;
        }
  figure {
    margin: 0;
  }
  .media-gallery {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 12px 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .media-card {
    background: #ffffff;
    border: 1px solid #cccccc;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 180px; /* Fixed height for uniformity in 2x3 grid */
    margin: 0;
    break-inside: avoid;
          page-break-inside: avoid;
        }
  .media-card img {
          width: 100%; 
    height: 100%;
    object-fit: cover;
    border-radius: 0;
  }
  .media-caption {
    font-size: 8pt; 
    color: #666666;
    padding: 4px 6px;
    text-align: center;
  }
  /* Garmushka (floor plan) - full size without cropping */
  .garmushka-card {
    background: #ffffff;
    border: 1px solid #cccccc;
    display: flex;
    flex-direction: column;
    break-inside: avoid;
          page-break-inside: avoid;
    margin: 16px 0;
    align-items: center;
  }
  .garmushka-card img {
    width: 100%;
    max-width: 100%;
    height: auto;
    object-fit: contain;
    border-radius: 0;
  }
  .garmushka-card .media-caption {
    font-size: 9pt;
    padding: 8px;
  }
  .side-by-side-images {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 12px 0;
  }
  .side-by-side-images figure {
    border: 1px solid #cccccc;
    overflow: hidden;
  }
  .side-by-side-images img {
    width: 100%;
    height: auto;
  }
  
  /* ===== INFO SECTIONS ===== */
  .info-grid {
    display: block;
    margin: 8px 0;
        }
  .info-grid p {
    margin: 0 0 4px;
    font-weight: 400;
  }
  .info-grid p strong {
    font-weight: 700;
  }
  .key-value {
    display: flex;
    justify-content: flex-start;
    gap: 20px;
    margin-bottom: 4px;
  }
  .key-value .key {
    font-weight: 700;
    min-width: 100px;
  }
  
  /* ===== BOUNDARIES SECTION ===== */
  .boundaries-section {
    margin: 12px 0;
  }
  .boundary-row {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
  }
  .boundary-direction {
    font-weight: 700;
    min-width: 50px;
  }
  
  /* ===== NOTES & CALLOUTS ===== */
  .page-note {
    font-size: 9pt;
    color: #000000;
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #000000;
    line-height: 1.5;
  }
  .muted {
    color: #666666;
  }
  .callout {
    border: 1px solid #cccccc;
    padding: 12px 14px;
    margin: 12px 0;
    background: #f9f9f9;
  }
  
  /* ===== VALUATION SECTION ===== */
  .valuation-summary {
    margin: 16px 0;
  }
  .valuation-card {
    padding: 12px;
    background: #ffffff;
    border: 1px solid #000000;
    margin-bottom: 8px;
  }
  .valuation-final {
    font-size: 12pt;
    font-weight: 700;
    margin: 16px 0;
  }
  .valuation-final-amount {
    text-decoration: underline;
  }
  
  /* ===== SIGNATURE ===== */
  .signature-block {
    margin-top: 40px;
    text-align: left;
  }
  .signature-image {
    max-width: 180px;
    max-height: 100px;
    border: none;
    padding: 0;
    border-radius: 0;
  }
  .signature-placeholder {
    width: 160px;
    height: 80px;
    border: 1px dashed #999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10pt;
    color: #999999;
  }
  
  /* ===== UTILITY CLASSES ===== */
  .section-block {
          break-inside: avoid; 
          page-break-inside: avoid; 
    margin-bottom: 8px;
  }
  .section-block p {
    margin: 4px 0;
  }
  .page-break {
    break-before: page;
    page-break-before: always;
  }
  .rtl {
    direction: rtl;
    unicode-bidi: plaintext;
  }
  .num {
          direction: ltr; 
          unicode-bidi: embed; 
          display: inline-block; 
        }
  .bold-text {
    font-weight: 700;
  }
  .rich-text {
    white-space: pre-wrap;
    line-height: 1.7;
  }
  .rich-text .section-heading {
    display: block;
    font-weight: 700;
    margin-top: 12px;
  }

  /* ===== PAGE BREAK CONTROL ===== */
  /* Keep titles with following content */
  .chapter-title, .sub-title {
    page-break-after: avoid;
    break-after: avoid;
  }

  /* Table row handling - keep rows together */
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Repeat table headers on each page */
  thead {
    display: table-header-group;
  }

  /* Orphan/widow control */
  p {
    orphans: 3;
    widows: 3;
  }

  /* Keep bullet list items together (min 2) */
  .bullet-list li:first-child,
  .bullet-list li:first-child + li {
    page-break-before: avoid;
  }

  /* ===== PRINT STYLES ===== */
        @media print {
    body {
      background: #ffffff;
    }
    .document {
      padding: 0;
    }
    .page {
      box-shadow: none;
      margin: 0;
      border: none;
      padding: 10mm 18mm 15mm 18mm;
    }
    .page.cover {
      border: none;
      padding: 8mm 18mm 35mm 18mm;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
    }
    .cover-footer-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
    .page-footer {
      position: absolute;
      bottom: 0;
      left: 18mm;
      right: 18mm;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    /* Keep tables and images together on same page */
    .table, .table-wrapper, .media-gallery, .section-block {
      break-inside: avoid;
      page-break-inside: avoid;
  }
  }
  
  /* ===== COMPARABLES TABLE WRAPPER ===== */
  .comparables-table-block {
    margin: 12px 0;
  }
  .comparables-table .table {
    font-size: 9.5pt;
  }
  .comparables-table .table th,
  .comparables-table .table td {
    padding: 8px 6px;
    line-height: 1.5;
  }
  
  /* ===== OPENING PAGE STYLES ===== */
  .opening-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 10pt;
  }
  .opening-recipient {
    margin-bottom: 10px;
  }
  .opening-title-section {
    text-align: center;
    margin: 12px 0;
  }
  .opening-title-section .cover-title-main {
    font-size: 12pt;
  }
  .opening-title-section .cover-title-sub {
    font-size: 13pt;
  }
  .opening-title-section .cover-title-type {
    font-size: 11pt;
  }
  .opening-title-section .cover-address {
    font-size: 10pt;
  }
`;

const pageNumberScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const pages = Array.from(document.querySelectorAll('.page'))
      const total = pages.length
      pages.forEach((page, index) => {
        const target = page.querySelector('[data-page-number]')
        if (target) {
          target.textContent = 'עמוד ' + (index + 1) + ' מתוך ' + total
        }
      })
    })
  </script>
`;

const autoPaginateScript = `
  <script>
    // Helper functions
    const mmToPx = (mm) => (mm * 96) / 25.4
    const MAX_CONTENT_HEIGHT = Math.round(mmToPx(297 - 30)) // A4 height minus ~15mm top/bottom
    const HALF_PAGE_HEIGHT = MAX_CONTENT_HEIGHT * 0.5

    // ===== CHAPTER TITLE PAGE BREAK LOGIC =====
    // If a chapter title is in the bottom 50% of page, move it to next page
    const handleChapterTitlePageBreaks = () => {
      // Remove any previously inserted auto page breaks
      const existingBreaks = Array.from(document.querySelectorAll('.auto-page-break-marker'))
      existingBreaks.forEach((el) => el.remove())

      const chapterTitles = Array.from(document.querySelectorAll('.chapter-title'))

      chapterTitles.forEach((title) => {
        const page = title.closest('.page')
        if (!page || page.classList.contains('cover')) return

        const pageBody = page.querySelector('.page-body')
        if (!pageBody) return

        const pageRect = pageBody.getBoundingClientRect()
        const titleRect = title.getBoundingClientRect()

        // Calculate position relative to page body
        const titlePositionInPage = titleRect.top - pageRect.top

        // If title is in bottom 50% of page, we need a page break
        if (titlePositionInPage > HALF_PAGE_HEIGHT) {
          // Find all siblings before this title (content that stays on current page)
          const allChildren = Array.from(pageBody.children)
          const titleIndex = allChildren.indexOf(title.closest('.section-block') || title)

          if (titleIndex > 0 && title.parentElement) {
            // Create a page break marker before the chapter title with visual indicator
            const pageBreak = document.createElement('div')
            pageBreak.className = 'chapter-page-break auto-page-break-marker'
            pageBreak.style.cssText = 'break-before: page; page-break-before: always;'
            pageBreak.setAttribute('data-page-break', 'auto')
            title.parentElement.insertBefore(pageBreak, title)
          }
        }
      })
    }

    // Expose global function for re-triggering pagination
    window.__applyAutoPagination = function(force = false) {
      if (!force && document.body.dataset.paginated === 'true') {
        return;
      }

      // Run chapter title check
      handleChapterTitlePageBreaks()

      if (!force) {
        document.body.dataset.paginated = 'true';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      if (document.body.dataset.paginated === 'true') {
        return;
      }
      document.body.dataset.paginated = 'true';

      const previouslyGenerated = Array.from(document.querySelectorAll('section.page[data-generated-page=\"true\"]'));
      previouslyGenerated.forEach((page) => page.remove());

      // Run chapter title check before pagination
      handleChapterTitlePageBreaks()

      const createEmptyPage = (referencePage) => {
        const newPage = document.createElement('section')
        newPage.classList.add('page')
        newPage.setAttribute('data-generated-page', 'true')
        referencePage.classList.forEach((cls) => {
          if (cls !== 'cover' && cls !== 'page') {
            newPage.classList.add(cls)
          }
        })

        const newBody = document.createElement('div')
        newBody.className = 'page-body'
        newPage.appendChild(newBody)

        const pageNumberTemplate = referencePage.querySelector('.page-number[data-page-number]')
        if (pageNumberTemplate) {
          const clone = pageNumberTemplate.cloneNode(true)
          clone.textContent = ''
          newPage.appendChild(clone)
        }

        return { page: newPage, body: newBody }
      }

      // Helper to check if element is a good break point
      const isGoodBreakBefore = (el) => {
        if (!el) return false
        // Good to break BEFORE these elements
        return el.classList.contains('chapter-title') ||
               el.classList.contains('section-block') ||
               el.classList.contains('sub-title') ||
               el.tagName === 'TABLE' ||
               el.classList.contains('table') ||
               el.classList.contains('media-gallery') ||
               el.classList.contains('media-card')
      }

      // Find the best break point index
      const findBestBreakIndex = (body) => {
        const children = Array.from(body.children)
        if (children.length <= 1) return children.length - 1

        let accumulatedHeight = 0
        let overflowIndex = -1

        // Find where content exceeds page height
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          const rect = child.getBoundingClientRect()
          const height = rect ? rect.height : child.scrollHeight || 0

          if (accumulatedHeight + height > MAX_CONTENT_HEIGHT) {
            overflowIndex = i
            break
          }
          accumulatedHeight += height
        }

        // If no overflow found, return last index
        if (overflowIndex === -1) return children.length - 1

        // Look for a good break point at or after overflowIndex
        for (let j = overflowIndex; j < children.length; j++) {
          if (isGoodBreakBefore(children[j])) {
            return j
          }
        }

        // Fallback: look for a good break point before overflowIndex
        for (let j = overflowIndex - 1; j >= 0; j--) {
          if (isGoodBreakBefore(children[j])) {
            return j
          }
        }

        // Last resort: break at overflow point
        return overflowIndex > 0 ? overflowIndex : children.length - 1
      }

      const splitPage = (page) => {
        if (page.classList.contains('cover')) {
          return
        }
        const body = page.querySelector('.page-body')
        if (!body) {
          return
        }

        const ensurePageFits = (currentPage, currentBody, safety = 0) => {
          if (safety > 100) {
            console.warn('Auto pagination aborted due to safety threshold')
            return
          }
          if (currentBody.scrollHeight <= MAX_CONTENT_HEIGHT) {
            return
          }

          if (currentBody.children.length === 0) {
            return
          }

          const { page: newPage, body: newBody } = createEmptyPage(page)
          currentPage.parentNode.insertBefore(newPage, currentPage.nextSibling)

          // Find the best logical break point
          const breakIndex = findBestBreakIndex(currentBody)
          const children = Array.from(currentBody.children)

          // Move elements from breakIndex to end to new page
          let movedCount = 0
          for (let i = breakIndex; i < children.length; i++) {
            const child = children[i]
            const childHeight = child.getBoundingClientRect ? child.getBoundingClientRect().height : child.scrollHeight
            // Skip if single element exceeds page height
            if (childHeight && childHeight >= MAX_CONTENT_HEIGHT && movedCount === 0) {
              console.warn('Auto pagination: element exceeds single-page height, leaving in place', child)
              continue
            }
            newBody.appendChild(child)
            movedCount++
          }

          if (newBody.children.length === 0) {
            newPage.remove()
            return
          }

          if (currentBody.scrollHeight > MAX_CONTENT_HEIGHT && currentBody.children.length > 0) {
            ensurePageFits(currentPage, currentBody, safety + 1)
          }

          if (newBody.scrollHeight > MAX_CONTENT_HEIGHT && newBody.children.length > 1) {
            ensurePageFits(newPage, newBody, safety + 1)
          }
        }

        ensurePageFits(page, body, 0)
      }

      const pages = Array.from(document.querySelectorAll('section.page'))
      pages.forEach(splitPage)
    })
  </script>
`;

const toRichHtml = (value?: string) => {
  if (!value) return "";
  return value
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/##\s?(.*)/g, '<span class="section-heading">$1</span>')
    .replace(/\n/g, "<br/>");
};

const mergeRecords = (
  ...records: Array<Record<string, any> | null | undefined>
) => {
  return records.reduce<Record<string, any>>((acc, record) => {
    if (!record || typeof record !== "object") {
      return acc;
    }
    Object.entries(record).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (acc[key] === undefined) {
        acc[key] = value;
      }
    });
    return acc;
  }, {});
};

export function generateDocumentHTML(
  data: ValuationData,
  isPreview: boolean = true,
  companySettings?: CompanySettings,
): string {
  const customEdits = (data as any).customDocumentEdits || {};

  const valuationDate = data.valuationDate || new Date().toISOString();
  const valuationEffectiveDate = data.valuationEffectiveDate || valuationDate;
  const address = getAddress(data);
  const reference = getReference(data);
  // Parse final value safely (handles strings from backend)
  // Priority: finalValuation > section52.asset_value_nis > comparableDataAnalysis.estimatedValue > marketAnalysis.estimatedValue
  const finalValueRaw =
    (data as any).finalValuation ||
    ((data as any).comparableDataAnalysis?.section52 as any)?.asset_value_nis ||
    (data as any).comparableDataAnalysis?.estimatedValue ||
    ((data as any).comparableAnalysis as any)?.estimatedValue ||
    ((data as any).marketAnalysis as any)?.estimatedValue ||
    0;
  const finalValue = parseNumeric(finalValueRaw);

  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("📊 [Document Template] Final Value Sources:", {
      finalValuation: (data as any).finalValuation,
      section52Value: ((data as any).comparableDataAnalysis?.section52 as any)
        ?.asset_value_nis,
      comparableDataAnalysisEstimated: (data as any).comparableDataAnalysis
        ?.estimatedValue,
      comparableAnalysisEstimated: ((data as any).comparableAnalysis as any)
        ?.estimatedValue,
      marketAnalysisEstimated: ((data as any).marketAnalysis as any)
        ?.estimatedValue,
      finalValue,
    });
    console.log("🏢 [Document Template] Company Settings:", {
      hasCompanySettings: !!companySettings,
      hasFooterLogo: !!companySettings?.footerLogo,
      footerLogo: companySettings?.footerLogo,
      hasCompanyLogo: !!companySettings?.companyLogo,
    });
  }

  // getValueFromPaths is now defined at module level (above)

  const neighborhoodName = normalizeText(data.neighborhood, "שכונה לא צוינה");
  // Note: According to PRD, this should be AI-generated, but for now we keep placeholder text
  // Check for AI-generated environment description first
  const environmentDescription = getValueFromPaths(data, [
    "extractedData.environmentDescription",
    "extractedData.environment_description",
    "environmentDescription",
  ]);
  const environmentParagraph =
    environmentDescription ||
    `שכונת ${neighborhoodName}${data.city ? ` ב${data.city}` : ""} נהנית מנגישות טובה, שירותים קהילתיים ומרקם מגורים מגוון.`;

  const { landRegistry, owners, mortgages, attachments, additionalAreas } =
    resolveLandRegistryData(data);

  const plotParagraph = `חלקה ${formatNumber(
    getValueFromPaths(data, [
      "extractedData.chelka",
      "extractedData.parcel",
      "extractedData.land_registry.chelka",
      "extractedData.land_registry.parcel",
      "land_registry.chelka",
      "parcel",
    ]) ||
      (data as any).land_registry?.chelka ||
      landRegistry?.chelka ||
      data.parcel,
  )} בגוש ${formatNumber(
    getValueFromPaths(data, [
      "extractedData.gush",
      "extractedData.land_registry.gush",
      "land_registry.gush",
      "gush",
    ]) ||
      (data as any).land_registry?.gush ||
      landRegistry?.gush ||
      data.gush,
  )} בשטח קרקע רשום של ${formatNumber(
    getValueFromPaths(data, [
      "extractedData.parcelArea",
      "extractedData.parcel_area",
      "extractedData.total_plot_area",
      "extractedData.land_registry.parcelArea",
      "extractedData.land_registry.parcel_area",
      "extractedData.land_registry.total_plot_area",
      "land_registry.total_plot_area",
      "parcelArea",
    ]) ||
      (data as any).parcelArea ||
      (data as any).land_registry?.total_plot_area ||
      (data.extractedData as any)?.total_plot_area ||
      landRegistry?.total_plot_area,
  )} מ"ר.`;

  const unitDescription = normalizeText(
    getValueFromPaths(data, [
      "extractedData.unitDescription",
      "extractedData.unit_description",
      "extractedData.land_registry.unitDescription",
      "extractedData.land_registry.unit_description",
      "land_registry.unit_description",
      "unit_description",
    ]) ||
      landRegistry?.unit_description ||
      data.propertyEssence ||
      (data as any).land_registry?.unit_description ||
      "דירת מגורים",
  );
  const buildingIdentifier = normalizeText(
    getValueFromPaths(data, [
      "extractedData.buildingNumber",
      "extractedData.building_number",
      "extractedData.land_registry.buildingNumber",
      "extractedData.land_registry.building_number",
      "land_registry.building_number",
      "buildingNumber",
    ]) ||
      landRegistry?.building_number ||
      landRegistry?.buildingNumber ||
      (data as any).land_registry?.building_number ||
      (data as any).buildingNumber,
    "",
  );
  const buildingCondition = normalizeText(
    getValueFromPaths(data, [
      "extractedData.buildingCondition",
      "extractedData.building_condition",
      "extractedData.exterior_analysis.buildingCondition",
      "buildingCondition",
    ]) ||
      (data as any).buildingCondition ||
      (data as any).land_registry?.building_condition ||
      landRegistry?.building_condition,
    "במצב תחזוקתי טוב",
  );
  const propertyDescriptionParts = [unitDescription];
  const floorText = formatFloor(
    landRegistry?.floor || (data as any).land_registry?.floor || data.floor,
  );
  if (floorText) {
    propertyDescriptionParts.push(floorText);
  }
  if (buildingIdentifier) {
    propertyDescriptionParts.push(`במבנה ${buildingIdentifier}`);
  }
  // airDirections is now a string like "צפון-מזרח"
  const airDirectionsText =
    typeof data.airDirections === "string" && data.airDirections.trim()
      ? `הפונה לכיוונים ${data.airDirections.trim()}`
      : "";
  if (airDirectionsText) {
    propertyDescriptionParts.push(airDirectionsText);
  }
  const propertyParagraph = `${propertyDescriptionParts.join(" ")}. הנכס מצוי ברמת תחזוקה ${buildingCondition}.`;
  const interiorNarrative =
    (data as any).extractedData?.propertyLayoutDescription ||
    (data as any).interior_analysis?.description ||
    "";
  const facadeAssessment =
    (data as any).extractedData?.overallAssessment ||
    (data as any).facadeAssessment ||
    "";

  const sharedBuildingData =
    (data as any).shared_building ||
    (data.extractedData as any)?.shared_building ||
    {};
  const sharedBuildingRaw = sharedBuildingData?.rawData || {};
  const sharedBuildingAddresses: string[] = toArray(
    sharedBuildingData?.building_address ||
      sharedBuildingRaw?.all_addresses?.value,
  ).filter(
    (value: any): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  const sharedBuildingDescription = normalizeText(
    sharedBuildingData?.building_description ||
      sharedBuildingRaw?.building_description?.value ||
      sharedBuildingRaw?.building_description_formatted,
    "",
  );
  const sharedBuildingNotes = normalizeText(
    sharedBuildingRaw?.validationNotes,
    "",
  );
  const sharedBuildingEntries: string[] = toArray(
    sharedBuildingRaw?.buildings_info?.value,
  )
    .map((info) => {
      const buildingNumber = info?.building_number || info?.buildingNumber;
      const floors = info?.floors;
      const addressText = info?.address;
      const subPlots = info?.sub_plots_count || info?.subPlotsCount;
      const parts: string[] = [];
      if (buildingNumber) {
        parts.push(`מבנה ${buildingNumber}`);
      }
      if (floors) {
        parts.push(`${floors} קומות`);
      }
      if (subPlots) {
        parts.push(`${subPlots} תתי חלקות`);
      }
      const label = parts.join(" • ");
      return label
        ? `${label}${addressText ? ` – ${addressText}` : ""}`
        : addressText || "";
    })
    .filter((text: string) => text && text.trim().length > 0);

  const buildingMetrics = [
    {
      label: "סוג מבנה",
      value: normalizeText(
        getValueFromPaths(data, [
          "extractedData.buildingType",
          "extractedData.building_type",
          "buildingType",
        ]) ||
          (data as any).buildingType ||
          landRegistry?.building_type ||
          sharedBuildingDescription,
        "",
      ),
    },
    {
      label: "מספר מבנים",
      value: (() => {
        const candidate =
          getValueFromPaths(data, [
            "extractedData.numberOfBuildings",
            "extractedData.number_of_buildings",
            "extractedData.shared_building.numberOfBuildings",
            "extractedData.shared_building.number_of_buildings",
            "shared_building.buildings_count",
          ]) ||
          sharedBuildingData?.buildings_count ||
          (sharedBuildingEntries.length > 0
            ? sharedBuildingEntries.length
            : "") ||
          landRegistry?.buildings_count;
        return candidate ? formatNumber(candidate, "") : "";
      })(),
    },
    {
      label: "מספר קומות",
      value: normalizeText(
        getValueFromPaths(data, [
          "extractedData.buildingFloors",
          "extractedData.building_floors",
          "extractedData.shared_building.buildingFloors",
          "extractedData.shared_building.building_floors",
          "buildingFloors",
        ]) ||
          (data as any).buildingFloors ||
          sharedBuildingData?.building_floors ||
          sharedBuildingRaw?.building_floors?.value ||
          landRegistry?.building_floors,
        "",
      ),
    },
    {
      label: "מספר יחידות",
      value: (() => {
        const candidate =
          getValueFromPaths(data, [
            "extractedData.buildingUnits",
            "extractedData.building_units",
            "extractedData.shared_building.buildingUnits",
            "extractedData.shared_building.building_units",
            "buildingUnits",
          ]) ||
          (data as any).buildingUnits ||
          sharedBuildingData?.total_sub_plots ||
          sharedBuildingRaw?.total_sub_plots?.value ||
          sharedBuildingRaw?.building_sub_plots_count?.value ||
          landRegistry?.sub_plots_count;
        return candidate ? formatNumber(candidate, "") : "";
      })(),
    },
    {
      label: "שימושים מותרים",
      value: normalizeText(
        getValueFromPaths(data, [
          "extractedData.permittedUse",
          "extractedData.permitted_use",
          "extractedData.building_permit.permittedUse",
          "permittedUse",
        ]) ||
          (data as any).permittedUse ||
          (data as any).buildingRights ||
          (data as any).building_permit?.permitted_usage ||
          landRegistry?.permitted_usage,
        "",
      ),
    },
    {
      label: "שטחים משותפים",
      value: normalizeText(
        getValueFromPaths(data, [
          "extractedData.commonParts",
          "extractedData.common_parts",
          "extractedData.sharedAreas",
          "extractedData.shared_areas",
          "extractedData.land_registry.commonParts",
          "extractedData.land_registry.common_parts",
          "land_registry.shared_property",
          "sharedAreas",
        ]) ||
          (data as any).sharedAreas ||
          sharedBuildingRaw?.specific_sub_plot?.value?.shared_property_parts ||
          landRegistry?.shared_property,
        "",
      ),
    },
    {
      label: "מצב תחזוקה",
      value: normalizeText(
        getValueFromPaths(data, [
          "extractedData.buildingCondition",
          "extractedData.building_condition",
          "extractedData.exterior_analysis.buildingCondition",
          "buildingCondition",
        ]) ||
          (data as any).buildingCondition ||
          landRegistry?.building_condition ||
          sharedBuildingRaw?.conditionAssessment,
        "",
      ),
    },
  ].filter((row) => row.value && row.value !== "—");

  const condoOrderDate = formatDateNumeric(
    sharedBuildingData?.order_date ||
      sharedBuildingRaw?.order_date?.value ||
      sharedBuildingRaw?.condo_order_date,
  );
  const sharedBuildingParagraph = condoOrderDate
    ? `מעיון בצו רישום הבית המשותף מיום ${condoOrderDate} עולים הפרטים הרלוונטיים הבאים:`
    : sharedBuildingDescription ||
      "מעיון בצו רישום הבית המשותף עולים הפרטים הרלוונטיים הבאים:";
  const primaryPlanningPlans: any[] = Array.isArray((data as any).planningPlans)
    ? (data as any).planningPlans
    : [];
  const supplementalPlanningPlans = [
    ...toArray((data as any).land_registry?.planning_plans),
    ...toArray((data as any).land_registry?.planningPlans),
    ...toArray((landRegistry as any)?.planning_plans),
    ...toArray((landRegistry as any)?.planningPlans),
    ...toArray((data.extractedData as any)?.planning_plans),
    ...toArray((data.extractedData as any)?.planningPlans),
  ];
  const planningPlans: any[] = dedupeByKey(
    [...primaryPlanningPlans, ...supplementalPlanningPlans],
    (plan: any) =>
      `${plan?.plan_number || plan?.planNumber || plan?.id || plan?.name || ""}`,
  );
  const planningParagraph =
    planningPlans.length > 0
      ? `התכניות הרלוונטיות כוללות ${planningPlans
          .map(
            (plan) =>
              `${plan.plan_number || plan.planNumber || "תכנית"} (${plan.status || "בתוקף"})`,
          )
          .join(", ")}.`
      : "לא אותרו תכניות נוספות מעבר לתכנית המתאר החלה במקום.";

  const buildingPermitParagraph = data.buildingPermitNumber
    ? `היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric((data as any).land_registry?.building_permit_date || data.buildingPermitDate || "")} מאשר את הבניה בפועל.`
    : "המידע על היתרי הבניה יעודכן לאחר עיון בתיק הבניין.";

  const buildingPermit: Record<string, any> =
    (data as any).building_permit || {};

  // Page header and footer components for regular pages - MMBL Style - Compact
  const pageHeader = `
    <div class="page-header" style="margin-bottom: 6px; padding-bottom: 2px;">
      ${
        companySettings?.companyLogo
          ? `
    <div class="page-header-brand">
          <img src="${companySettings.companyLogo}" alt="לוגו" style="max-height: 40px;" />
        </div>
      `
          : `
        <div class="page-header-logo" style="font-size: 20pt; margin-bottom: 0;">MMBL.</div>
        <div class="page-header-company" style="font-size: 8pt;">${companySettings?.companyName || "מנשה-ליבוביץ שמאות מקרקעין"}</div>
        <div class="page-header-tagline" style="font-size: 7pt;">${companySettings?.companySlogan || "ליווי וייעוץ בתחום המקרקעין"}</div>
      `
      }
    </div>
  `;

  // Footer block for regular pages

  // Footer block for regular pages - ONLY the footerLogo from settings
  const footerBlock = `
    <div class="page-footer" style="display: flex; justify-content: center; align-items: center; padding-bottom: 0;">
      ${
        companySettings?.footerLogo
          ? `
        <img src="${companySettings.footerLogo}" alt="footer" style="max-height: 100px; width: 100%; object-fit: contain;" />
      `
          : ""
      }
      <div class="page-number" data-page-number="" style="position: absolute; bottom: 2mm; left: 18mm;"></div>
    </div>
  `;

  // Cover footer block - ONLY the footerLogo from settings, at the very bottom
  const coverFooterBlock = `
    <div class="cover-footer-container">
      ${
        companySettings?.footerLogo
          ? `
        <img src="${companySettings.footerLogo}" alt="footer" />
        `
          : ""
      }
    </div>
  `;

  const buildingPermitRows: Array<{ label: string; value: string }> = [
    {
      label: "מספר היתר",
      value: normalizeText(
        buildingPermit?.permit_number || data.buildingPermitNumber,
        "",
      ),
    },
    {
      label: "תאריך היתר",
      value: (() => {
        const dateCandidate =
          buildingPermit?.permit_issue_date ||
          buildingPermit?.permit_date ||
          data.buildingPermitDate;
        const formatted = formatDateNumeric(dateCandidate);
        return formatted && formatted !== "—" ? formatted : "";
      })(),
    },
    {
      label: "שימוש מותר",
      value: normalizeText(
        buildingPermit?.permitted_usage ||
          (data as any).permittedUse ||
          (data as any).buildingRights,
        "",
      ),
    },
    {
      label: "תיאור הבניה",
      value: normalizeText(
        buildingPermit?.building_description || data.buildingDescription,
        "",
      ),
    },
    {
      label: "ועדה מקומית",
      value: normalizeText(buildingPermit?.local_committee_name, ""),
    },
    {
      label: "גוש / חלקה",
      value: [
        formatNumber(buildingPermit?.gush, ""),
        formatNumber(buildingPermit?.chelka, ""),
        formatNumber(buildingPermit?.sub_chelka, ""),
      ]
        .filter(Boolean)
        .map((value, index) =>
          index === 0
            ? `גוש ${value}`
            : index === 1
              ? `חלקה ${value}`
              : `תת חלקה ${value}`,
        )
        .join(" • "),
    },
  ].filter((row) => row.value && row.value !== "—");

  // ===== COVER PAGE =====
  const reportDate = formatDateHebrew(valuationDate);

  // Format address for cover page: "רחוב {{Street}} ,{{BuildingNumber}}, שכונת {{Neighborhood}}, {{City}}"
  const formattedAddress = [
    data.street ? `רחוב ${data.street}` : "",
    data.buildingNumber ? `${data.buildingNumber}` : "",
    data.neighborhood ? `שכונת ${data.neighborhood}` : "",
    data.city || "",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(" , ,", " ,");

  const headerBlock = `
    <section class="page cover">
      <!-- Cover Header with Logo - Compact -->
      <div class="cover-header">
        ${
          companySettings?.companyLogo
            ? `
          <div class="page-header-brand">
            <img src="${companySettings.companyLogo}" alt="לוגו" style="max-height: 55px;" />
                  </div>
        `
            : `
          <div class="page-header-logo">MMBL.</div>
          <div class="page-header-company">${companySettings?.companyName || "מנשה-ליבוביץ שמאות מקרקעין"}</div>
          <div class="page-header-tagline">${companySettings?.companySlogan || "ליווי וייעוץ בתחום המקרקעין"}</div>
        `
        }
                  </div>
      
      <!-- Title Box with Gray Background -->
      <div class="cover-title-box">
        <div class="cover-title-main">חוות דעת בעניין</div>
        <div class="cover-title-sub">${LOCKED_HEBREW_TEXT.coverMainTitle}</div>
        <div class="cover-title-type">${LOCKED_HEBREW_TEXT.coverSubtitle}</div>
        <div class="cover-address">${formattedAddress}</div>
      </div>
      
      <!-- Cover Content Container for Image -->
      <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; padding-bottom: 150px;">
        <!-- Cover Image -->
        ${(() => {
          const coverImages = resolveCoverImageSources(data);
          if (!coverImages.length) {
            return `
            <div class="cover-image-frame" style="display: flex; align-items: center; justify-content: center; min-height: 200px; background: #f5f5f5;">
              <div style="text-align: center; color: #999999;">
                <div style="font-size: 36px; margin-bottom: 8px;">📷</div>
                <div style="font-size: 10pt;">תמונה חיצונית לא הועלתה</div>
              </div>
              </div>
        `;
          }
          return `
        <div class="cover-image-frame">
            <img src="${coverImages[0]}" alt="תמונת חזית הבניין" data-managed-image="true" />
              </div>
      `;
        })()}
      </div>
      
      <!-- Cover Footer -->
      ${coverFooterBlock}
    </section>
  `;

  // ===== OPENING PAGE =====
  const formatDateNumericForPage2 = (value?: string) => {
    if (!value) {
      const today = new Date();
      return `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;
    }
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "—";
      }
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString();
      return `${day}/${month}/${year}`;
    } catch {
      return "—";
    }
  };

  const introductionPage = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Header with Date/Reference and Recipient -->
        <div class="opening-header">
          <div>
            <div><strong>לכבוד,</strong></div>
            <div>${(data as any).clientTitle ? `${normalizeText((data as any).clientTitle)} ` : ""}${normalizeText(data.clientName)}${(data as any).clientNote ? `,` : ""}</div>
            ${(data as any).clientNote ? `<div>${normalizeText((data as any).clientNote)}</div>` : ""}
        </div>
          <div style="text-align: left;">
        <div><strong>תאריך:</strong> ${formatDateHebrew(valuationDate)}</div>
            <div><strong>סימננו:</strong> ${reference}</div>
        </div>
        </div>
        
        <!-- Title Section - Centered -->
        <div class="opening-title-section">
          <div class="cover-title-main">חוות דעת בעניין</div>
          <div class="cover-title-sub">${LOCKED_HEBREW_TEXT.coverMainTitle}</div>
          <div class="cover-title-type">${LOCKED_HEBREW_TEXT.coverSubtitle}</div>
          <div class="cover-address">${formattedAddress}</div>
        </div>
        
        <!-- Introduction Text -->
        <p>${LOCKED_HEBREW_TEXT.openingIntro}</p>
        
        <!-- Purpose Section -->
        <div class="section-block">
          <div class="sub-title">${LOCKED_HEBREW_TEXT.purposeTitle}</div>
          <p>${LOCKED_HEBREW_TEXT.purposeText}</p>
          <p>${LOCKED_HEBREW_TEXT.limitationText}</p>
        </div>
        
        <!-- Client & Dates -->
        <div class="section-block">
          <p><span class="sub-title">מזמין חוות הדעת:</span> ${(data as any).clientTitle ? `${normalizeText((data as any).clientTitle)} ` : ""}${normalizeText(data.clientName)}${(data as any).clientNote ? `, ${normalizeText((data as any).clientNote)}` : ""}.</p>
          <p><span class="sub-title">מועד הביקור בנכס:</span> ${formatDateHebrew(valuationEffectiveDate)}, על ידי ${normalizeText(data.shamayName, "שמאי מקרקעין מוסמך")}. לביקור התלוותה בעלת הזכויות בנכס.</p>
          <p><span class="sub-title">תאריך קובע לשומה:</span> ${formatDateHebrew(valuationEffectiveDate)}, מועד הביקור בנכס.</p>
          </div>
        
        <!-- Property Details Table -->
        <div class="section-block">
          <div class="sub-title">פרטי הנכס:</div>
          <table class="table details-table">
            <tbody>
              ${createDetailsTable(data)}
            </tbody>
          </table>
        </div>
        
        <!-- Footnotes -->
        <div class="page-note">
          <sup class="footnote-ref">1</sup> בהתאם לנסח רישום מקרקעין מיום ${formatDateNumeric((data as any).land_registry?.extractDate || data.extractDate)}.<br/>
          ${data.buildingPermitNumber ? `<sup class="footnote-ref">2</sup> עפ"י מדידה מתוך תכנית היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric(data.buildingPermitDate || undefined)}.` : ""}
      </div>
      </div>
      
      ${footerBlock}
    </section>
  `;

  // ===== CHAPTER 1 =====
  const interiorGallery = collectInteriorImages(data);
  const sectionOne = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Chapter Title -->
        <div class="chapter-title">1.&emsp;${LOCKED_HEBREW_TEXT.chapter1Title}</div>
        
        <!-- Section 1.1 - Environment Description -->
        <div class="section-block">
          <div class="section-title">1.1&emsp;תיאור הסביבה</div>
          <p>${environmentParagraph}</p>
              </div>
        
        <!-- Environment Map - Large map for Section 1.1 -->
        ${(() => {
          // Use new wideArea field, fallback to legacy cropMode0
          const wideAreaMap =
            data.gisScreenshots?.wideArea || data.gisScreenshots?.cropMode0;
          return wideAreaMap
            ? `
          <div class="section-block">
            <p>מפת הסביבה (מיקום נשוא חוות הדעת מסומן, להמחשה בלבד):</p>
            <figure style="margin-top: 10px;">
              <img src="${wideAreaMap}" alt="מפת הסביבה" style="max-width: 100%; border: 1px solid #cccccc;" />
            </figure>
          </div>
          `
            : "";
        })()}
        <!-- Section 1.2 - Plot Description -->
        <div class="section-block">
          <div class="section-title">1.2&emsp;תיאור החלקה</div>
          <p>${plotParagraph}</p>
                </div>
        
        <!-- Plot Images (Side by Side) - Zoomed maps for Section 1.2 -->
        ${(() => {
          // Use new zoomedNoTazea and zoomedWithTazea fields, fallback to legacy cropMode0/cropMode1
          const zoomedNoTazeaMap =
            data.gisScreenshots?.zoomedNoTazea ||
            data.gisScreenshots?.cropMode0;
          const zoomedWithTazeaMap =
            data.gisScreenshots?.zoomedWithTazea ||
            data.gisScreenshots?.cropMode1;

          return zoomedNoTazeaMap || zoomedWithTazeaMap
            ? `
          <div class="section-block">
            <p>תשריט החלקה ותצ"א, מתוך האתר ההנדסי של העירייה (להמחשה בלבד):</p>
            <div class="side-by-side-images">
              ${
                zoomedWithTazeaMap
                  ? `
                <figure>
                  <img src="${zoomedWithTazeaMap}" alt="תצ״א" />
                  <figcaption style="text-align: center; font-size: 11px; color: #666; margin-top: 4px;">עם תצ״א</figcaption>
                </figure>
              `
                  : ""
              }
              ${
                zoomedNoTazeaMap
                  ? `
                <figure>
                  <img src="${zoomedNoTazeaMap}" alt="תשריט חלקה" />
                  <figcaption style="text-align: center; font-size: 11px; color: #666; margin-top: 4px;">ללא תצ״א</figcaption>
                </figure>
              `
                  : ""
              }
            </div>
          </div>
          `
            : "";
        })()}
        
        <!-- Boundaries -->
        ${(() => {
          const boundaryNorth = getValueFromPaths(data, [
            "extractedData.plotBoundaryNorth",
            "extractedData.plot_boundary_north",
            "extractedData.boundary_north",
            "extractedData.gis_analysis.boundary_north",
            "gis_analysis.boundary_north",
            "parcelBoundaries.north",
            "boundaryNorth",
            "boundary_north",
          ]);
          const boundarySouth = getValueFromPaths(data, [
            "extractedData.plotBoundarySouth",
            "extractedData.plot_boundary_south",
            "extractedData.boundary_south",
            "extractedData.gis_analysis.boundary_south",
            "gis_analysis.boundary_south",
            "parcelBoundaries.south",
            "boundarySouth",
            "boundary_south",
          ]);
          const boundaryEast = getValueFromPaths(data, [
            "extractedData.plotBoundaryEast",
            "extractedData.plot_boundary_east",
            "extractedData.boundary_east",
            "extractedData.gis_analysis.boundary_east",
            "gis_analysis.boundary_east",
            "parcelBoundaries.east",
            "boundaryEast",
            "boundary_east",
          ]);
          const boundaryWest = getValueFromPaths(data, [
            "extractedData.plotBoundaryWest",
            "extractedData.plot_boundary_west",
            "extractedData.boundary_west",
            "extractedData.gis_analysis.boundary_west",
            "gis_analysis.boundary_west",
            "parcelBoundaries.west",
            "boundaryWest",
            "boundary_west",
          ]);

          // Use actual data if available, otherwise use standard placeholders for demo/mock
          const westVal = normalizeText(boundaryWest) || "חזית לרחוב הרי הגלעד";
          const southVal = normalizeText(boundarySouth) || "חלקה 399";
          const eastVal = normalizeText(boundaryEast) || "חלקה 400";
          const northVal = normalizeText(boundaryNorth) || "חלקה 397";

          return `
              <div class="section-block">
              <p><strong>גבולות החלקה:</strong> מערב – ${westVal}, דרום – ${southVal}, מזרח – ${eastVal}, צפון – ${northVal}.</p>
              </div>
            `;
        })()}
        <!-- Section 1.3 - Property Description -->
        <div class="section-block">
          <div class="section-title">1.3&emsp;תיאור נשוא השומה</div>
          <p>נשוא השומה הינו תת חלקה ${
            formatNumber(getSubParcelValue(data, landRegistry)) || "—"
          } המהווה ${unitDescription || "דירת מגורים"}${floorText ? ` ${floorText}` : ""}${data.rooms ? ` בת ${data.rooms} חד'` : ""}${(() => {
            // airDirections is now a string like "צפון-מזרח-דרום"
            const airDir =
              typeof data.airDirections === "string" &&
              data.airDirections.trim()
                ? data.airDirections.trim()
                : "";
            if (airDir) {
              return ` הפונה לכיוונים ${airDir}`;
            }
            return "";
          })()}${(() => {
            const parkingCount = attachments.filter(
              (a: any) =>
                a.type && (a.type.includes("חניה") || a.type.includes("חנייה")),
            ).length;
            const storageCount = attachments.filter(
              (a: any) => a.type && a.type.includes("מחסן"),
            ).length;
            const parts: string[] = [];
            if (parkingCount > 0) parts.push(`${parkingCount} מקומות חניה`);
            if (storageCount > 0) parts.push("מחסן");
            return parts.length > 0 ? `, הצמודות אליה ${parts.join(" ו")}` : "";
          })()}.</p>
          <p>הדירה בשטח רשום של ${
            formatNumber(
              getValueFromPaths(data, [
                "extractedData.registeredArea",
                "extractedData.registered_area",
                "extractedData.apartment_registered_area",
                "extractedData.land_registry.registeredArea",
                "extractedData.land_registry.registered_area",
                "extractedData.land_registry.apartment_registered_area",
                "land_registry.apartment_registered_area",
                "registeredArea",
              ]) ||
                (data as any).registeredArea ||
                data.extractedData?.apartment_registered_area ||
                landRegistry?.apartment_registered_area,
            ) || "—"
          } מ"ר${(() => {
            const builtArea = getValueFromPaths(data, [
              "extractedData.builtArea",
              "extractedData.built_area",
              "extractedData.land_registry.builtArea",
              "extractedData.land_registry.built_area",
              "land_registry.builtArea",
              "builtArea",
            ]);
            return builtArea
              ? ` ובשטח בנוי של כ-${formatNumber(builtArea)} מ"ר`
              : "";
          })()}${data.buildingPermitNumber ? ` (עפ"י מדידה מתוך תכנית היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric(data.buildingPermitDate || undefined)})` : ""}.</p>
          <p>${normalizeText(
            getValueFromPaths(data, [
              "extractedData.propertyLayoutDescription",
              "extractedData.property_layout_description",
              "extractedData.internal_layout",
              "extractedData.interior_analysis.description",
              "internalLayout",
            ]) ||
              (data.internalLayout as string) ||
              (data.extractedData as any)?.propertyLayoutDescription ||
              (data.extractedData as any)?.interior_analysis?.description,
            "לא סופק תיאור לחלוקה הפנימית",
          )}</p>
          <p>סטנדרט הגמר בדירה ברמה ${normalizeText(
            getValueFromPaths(data, [
              "extractedData.finishStandard",
              "extractedData.finish_standard",
              "extractedData.finishLevel",
              "finishStandard",
            ]) ||
              (data.extractedData as any)?.finishLevel ||
              (data.extractedData as any)?.finish_standard ||
              (data.extractedData as any)?.finishStandard,
            "טובה",
          )} וכולל, בין היתר: ${normalizeText(
            getValueFromPaths(data, [
              "extractedData.finishDetails",
              "extractedData.finish_details",
              "finishDetails",
            ]) ||
              (data.extractedData as any)?.finishDetails ||
              (data.extractedData as any)?.finish_details,
            "ריצוף, חלונות, דלתות, מזגן, כלים סניטריים וכו'",
          )}.</p>
                </div>
        ${
          buildingMetrics.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">מאפייני המבנה</div>
            <div class="info-grid">
              ${buildingMetrics
                .map(
                  (metric) =>
                    `<p><strong>${metric.label}:</strong> ${metric.value}</p>`,
                )
                .join("")}
                </div>
                </div>
              `
            : ""
        }
        ${
          sharedBuildingDescription ||
          sharedBuildingEntries.length ||
          sharedBuildingAddresses.length ||
          sharedBuildingNotes
            ? `
          <div class="section-block">
            <div class="sub-title">פרטי הבית המשותף</div>
            ${sharedBuildingDescription ? `<p>${sharedBuildingDescription}</p>` : ""}
            ${
              sharedBuildingEntries.length > 0
                ? `
              <ul class="bullet-list">
                ${sharedBuildingEntries.map((entry: string) => `<li>${entry}</li>`).join("")}
              </ul>
              `
                : ""
            }
            ${sharedBuildingAddresses.length > 0 ? `<p class="muted">כתובות: ${sharedBuildingAddresses.join(" • ")}</p>` : ""}
            ${sharedBuildingNotes ? `<p class="muted">${sharedBuildingNotes}</p>` : ""}
            ${(() => {
              // Extract sub-chelka specific data from shared building sub_plots array
              const subPlots = toArray(
                sharedBuildingRaw?.sub_plots?.value ||
                  sharedBuildingData?.sub_plots ||
                  [],
              );
              const currentSubParcel = getSubParcelValue(data, landRegistry);
              const matchingSubPlot = subPlots.find(
                (sp: any) =>
                  sp?.sub_plot_number?.toString() ===
                    currentSubParcel?.toString() ||
                  sp?.sub_plot_number === currentSubParcel,
              );

              if (matchingSubPlot) {
                const parts: string[] = [];
                if (matchingSubPlot.area)
                  parts.push(`שטח: ${formatNumber(matchingSubPlot.area)} מ"ר`);
                if (matchingSubPlot.description)
                  parts.push(
                    `תיאור: ${normalizeText(matchingSubPlot.description)}`,
                  );
                return parts.length > 0
                  ? `<p class="muted"><strong>פרטי תת חלקה:</strong> ${parts.join(", ")}</p>`
                  : "";
              }
              return "";
            })()}
            </div>
                  `
            : ""
        }
        ${
          interiorNarrative
            ? `
          <div class="section-block">
            <div class="sub-title">ניתוח פנימי מפורט</div>
            <div class="rich-text">${toRichHtml(interiorNarrative)}</div>
                </div>
              `
            : ""
        }
        ${
          facadeAssessment
            ? `
          <div class="section-block">
            <div class="sub-title">ניתוח חזית המבנה</div>
            <div class="rich-text">${toRichHtml(facadeAssessment)}</div>
                    </div>
        `
            : ""
        }
        <!-- Interior Photos Grid -->
        ${
          interiorGallery.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">תמונות אופייניות להמחשה:</div>
            <div class="media-gallery">
              ${interiorGallery
                .filter(
                  (img: string) => img && img.trim() && img.trim().length > 0,
                )
                .slice(0, 6)
                .map(
                  (img: string, idx: number) => `
                <figure class="media-card">
                    <img src="${img}" alt="תמונה אופיינית ${idx + 1}" data-managed-image="true" />
                </figure>
                  `,
                )
                .join("")}
                </div>
                </div>
              `
            : ""
        }
      </div>
      
      ${footerBlock}
    </section>
  `;

  // ===== CHAPTER 2 - Legal Status =====
  const extractedAttachmentsArray = Array.isArray(
    (data.extractedData as any)?.attachments,
  )
    ? (data.extractedData as any).attachments.map((att: any) => ({
        type: att?.description || att?.type,
        area: att?.area,
        color: att?.color,
        symbol: att?.symbol,
        sharedWith: att?.shared_with || att?.sharedWith,
      }))
    : [];
  const combinedAttachments = dedupeByKey(
    [...extractedAttachmentsArray, ...attachments],
    (item: any) => {
      return [
        item.type || "",
        item.area || "",
        item.color || "",
        item.symbol || "",
      ].join("|");
    },
  );

  const extractedOwnersArray = Array.isArray(
    (data.extractedData as any)?.owners,
  )
    ? (data.extractedData as any).owners.map((owner: any) => ({
        name: owner?.name || owner?.owner_name,
        idNumber: owner?.id_number || owner?.idNumber,
        share: owner?.ownership_share || owner?.share || "שלמות",
      }))
    : [];
  const combinedOwners = dedupeByKey(
    [...extractedOwnersArray, ...owners],
    (item: any) => {
      return [item.name || "", item.idNumber || "", item.share || ""].join("|");
    },
  );

  const extractedMortgagesArray = Array.isArray(
    (data.extractedData as any)?.mortgages,
  )
    ? (data.extractedData as any).mortgages.map((mortgage: any) => ({
        rank: mortgage?.rank || mortgage?.degree,
        share: mortgage?.fraction || mortgage?.share,
        amount: mortgage?.amount,
        lenders: mortgage?.lenders,
        borrowers: mortgage?.borrowers,
        registrationDate: mortgage?.date,
        essence: mortgage?.essence,
      }))
    : [];
  const combinedMortgages = dedupeByKey(
    [...extractedMortgagesArray, ...mortgages],
    (item: any) => {
      return [
        item.rank || "",
        item.lenders || "",
        item.registrationDate || "",
      ].join("|");
    },
  );

  const extractedNotesArray = Array.isArray((data.extractedData as any)?.notes)
    ? (data.extractedData as any).notes.map((note: any) => ({
        actionType: note?.action_type || note?.actionType,
        date: note?.date,
        beneficiary: note?.beneficiary,
        extra: note?.extra,
        isSubChelka: false,
      }))
    : [];
  const landRegistryNotesArray = toArray((landRegistry as any)?.notes).map(
    (note: any) => ({
      actionType: note?.action_type || note?.actionType,
      date: note?.date,
      beneficiary: note?.beneficiary,
      extra: note?.extra,
      isSubChelka: false,
    }),
  );

  // Sub-chelka specific notes
  const subChelkaNotes = {
    actionType:
      landRegistry?.sub_chelka_notes_action_type ||
      (data.extractedData as any)?.sub_chelka_notes_action_type,
    beneficiary:
      landRegistry?.sub_chelka_notes_beneficiary ||
      (data.extractedData as any)?.sub_chelka_notes_beneficiary,
    isSubChelka: true,
  };
  const subChelkaNotesArray =
    subChelkaNotes.actionType || subChelkaNotes.beneficiary
      ? [subChelkaNotes]
      : [];

  const combinedNotes = dedupeByKey(
    [...extractedNotesArray, ...landRegistryNotesArray, ...subChelkaNotesArray],
    (item) => {
      return [
        item.actionType || "",
        item.date || "",
        item.beneficiary || "",
        item.isSubChelka ? "sub" : "general",
      ].join("|");
    },
  );

  const registrarOffice = normalizeText(
    getValueFromPaths(data, [
      "extractedData.registrationOffice",
      "extractedData.registry_office",
      "extractedData.land_registry.registry_office",
      "extractedData.land_registry.registrationOffice",
      "land_registry.registration_office",
      "land_registry.registryOffice",
      "registryOffice",
    ]) ||
      landRegistry?.registration_office ||
      (data as any).land_registry?.registryOffice ||
      data.registryOffice,
    "—",
  );
  const extractDate = formatDateNumeric(
    getValueFromPaths(data, [
      "extractedData.extractDate",
      "extractedData.extract_date",
      "extractedData.land_registry.extractDate",
      "extractedData.land_registry.extract_date",
      "land_registry.extract_date",
      "land_registry.tabu_extract_date",
    ]) ||
      data.extractDate ||
      landRegistry?.tabu_extract_date ||
      landRegistry?.issue_date ||
      landRegistry?.registry_date,
  );
  const blockNum = formatNumber(
    getValueFromPaths(data, [
      "extractedData.gush",
      "extractedData.land_registry.gush",
      "land_registry.gush",
      "gush",
    ]) ||
      landRegistry?.gush ||
      data.gush,
  );
  const parcelNum = formatNumber(
    getValueFromPaths(data, [
      "extractedData.chelka",
      "extractedData.parcel",
      "extractedData.land_registry.chelka",
      "extractedData.land_registry.parcel",
      "land_registry.chelka",
      "parcel",
    ]) ||
      landRegistry?.chelka ||
      data.parcel,
  );
  const parcelAreaSqm = formatNumber(
    getValueFromPaths(data, [
      "extractedData.parcelArea",
      "extractedData.parcel_area",
      "extractedData.land_registry.parcelArea",
      "extractedData.land_registry.parcel_area",
      "extractedData.total_plot_area",
      "land_registry.total_plot_area",
      "parcelArea",
    ]) ||
      (data as any).parcelArea ||
      (data.extractedData as any)?.total_plot_area ||
      landRegistry?.total_plot_area,
  );
  const subParcelNum = formatNumber(getSubParcelValue(data, landRegistry));
  const registeredAreaSqm = formatNumber(
    getValueFromPaths(data, [
      "extractedData.registeredArea",
      "extractedData.registered_area",
      "extractedData.apartment_registered_area",
      "extractedData.land_registry.registeredArea",
      "extractedData.land_registry.registered_area",
      "extractedData.land_registry.apartment_registered_area",
      "land_registry.apartment_registered_area",
      "registeredArea",
    ]) ||
      (data as any).registeredArea ||
      data.extractedData?.apartment_registered_area ||
      landRegistry?.apartment_registered_area,
  );
  const sharedProperty = normalizeText(
    (data.extractedData as any)?.shared_property ||
      landRegistry?.shared_property,
    "—",
  );

  const sectionTwo = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Chapter 2 Title -->
        <div class="chapter-title">2.&emsp;מצב משפטי – הזכויות בנכס</div>
        <p>להלן סקירה תמציתית של המצב המשפטי החל על המקרקעין נשוא חוות הדעת, אשר אינה מהווה תחליף לעיון מקיף במסמכים המשפטיים.</p>
        
        <!-- Section 2.1 -->
        <div class="section-block">
          <div class="section-title">2.1&emsp;נסח רישום מקרקעין</div>
          <p>תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין ${registrarOffice}, אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, בתאריך: ${extractDate}.</p>
          <p>חלקה ${parcelNum} בגוש ${blockNum} בשטח קרקע רשום של ${parcelAreaSqm} מ"ר.${(() => {
            const sharedParcels = getValueFromPaths(data, [
              "sharedParcels",
              "shared_parcels",
              "extractedData.sharedParcels",
              "land_registry.sharedParcels",
            ]);
            if (
              sharedParcels &&
              Array.isArray(sharedParcels) &&
              sharedParcels.length > 0
            ) {
              return ` משותף עם חלקות ${sharedParcels.join(", ")}.`;
            }
            return "";
          })()}</p>
          <div class="info-grid">
            <p><strong>תת-חלקה:</strong> ${subParcelNum}</p>
            <p><strong>קומה:</strong> ${normalizeText(landRegistry?.floor || data.floor?.toString(), "—")}</p>
            <p><strong>מספר מבנה:</strong> ${normalizeText(buildingIdentifier, "—")}</p>
            <p><strong>שטח רשום:</strong> ${registeredAreaSqm} מ"ר</p>
            <p><strong>חלק ברכוש משותף:</strong> ${sharedProperty}</p>
            ${landRegistry?.total_number_of_entries ? `<p><strong>מספר אגפים/כניסות:</strong> ${formatNumber(landRegistry?.total_number_of_entries)}</p>` : ""}
            ${landRegistry?.regulation_type ? `<p><strong>תקנון:</strong> ${normalizeText(landRegistry?.regulation_type)}</p>` : ""}
            ${landRegistry?.rights ? `<p><strong>זכויות:</strong> ${normalizeText(landRegistry?.rights)}</p>` : ""}
            ${landRegistry?.address_from_tabu ? `<p><strong>כתובת (מהנסח):</strong> ${normalizeText(landRegistry?.address_from_tabu)}</p>` : ""}
                          </div>
        </div>
        ${
          combinedAttachments.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">הצמדות</div>
            <ul class="legal-list">
              ${combinedAttachments
                .map(
                  (att: any) => `
                <li>${normalizeText(att.type)}${att.area ? ` בשטח ${formatNumber(att.area)} מ"ר` : ""}${att.symbol ? `, המסומנ/ת בתשריט באות ${att.symbol}` : ""}${att.color ? `, בצבע ${att.color}` : ""}${att.sharedWith ? `, משותפת עם: ${normalizeText(att.sharedWith)}` : ""}.</li>
                        `,
                )
                .join("")}
            </ul>
                      </div>
        `
            : ""
        }
        ${
          additionalAreas.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">שטחים נוספים</div>
            <ul class="legal-list">
              ${additionalAreas
                .map(
                  (area: any) => `
                <li>${normalizeText(area.type)}${area.area ? ` בשטח ${formatNumber(area.area)} מ"ר` : ""}.</li>
              `,
                )
                .join("")}
            </ul>
                    </div>
        `
            : ""
        }
        ${
          combinedOwners.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">בעלויות</div>
            <ul class="legal-list">
              ${combinedOwners
                .map(
                  (owner: any) => `
                <li>${normalizeText(owner.name)}${owner.idNumber ? `, ת.ז ${owner.idNumber}` : ""}, חלק בנכס – ${normalizeText(owner.share, "שלמות")}.</li>
              `,
                )
                .join("")}
            </ul>
            </div>
        `
            : `<p>בעלויות: ${formatOwnership(data)}</p>`
        }
        ${
          combinedMortgages.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">משכנתאות</div>
            <ul class="legal-list">
              ${combinedMortgages
                .map(
                  (mortgage: any) => `
                <li>משכנתא מדרגה ${normalizeText(mortgage.rank, "—")} לטובת ${normalizeText(mortgage.lenders)}${mortgage.amount ? ` על סך ₪${formatNumber(mortgage.amount)}` : ""}${mortgage.registrationDate ? `, מיום ${formatDateNumeric(mortgage.registrationDate)}` : ""}${mortgage.share ? `, חלק בנכס: ${normalizeText(mortgage.share)}` : ""}.</li>
              `,
                )
                .join("")}
            </ul>
                </div>
              `
            : ""
        }
        ${
          combinedNotes.length > 0
            ? `
          <div class="section-block">
            <div class="sub-title">הערות${combinedNotes.some((n) => n.isSubChelka) ? " - הערות לתת חלקה והערות כלליות" : ""}</div>
            <ul class="legal-list">
              ${combinedNotes
                .map((note) => {
                  const prefix = note.isSubChelka
                    ? "<strong>הערות לתת חלקה:</strong> "
                    : "";
                  return `<li>${prefix}${normalizeText(note.actionType)}${note.date ? ` מיום ${formatDateNumeric(note.date)}` : ""}${note.beneficiary ? ` לטובת ${normalizeText(note.beneficiary)}` : ""}${note.extra ? `, ${normalizeText(note.extra)}` : ""}.</li>`;
                })
                .join("")}
            </ul>
            </div>
        `
            : ""
        }
        ${
          (data.extractedData as any)?.plot_notes || data.notes
            ? `
          <div class="callout section-block">
            ${(data.extractedData as any)?.plot_notes || data.notes}
          </div>
        `
            : ""
        }
        ${
          sharedBuildingDescription ||
          sharedBuildingEntries.length ||
          sharedBuildingAddresses.length ||
          sharedBuildingNotes
            ? `
          <div class="section-block">
            <div class="section-title">2.2&emsp;מסמכי הבית המשותף</div>
            <p>${sharedBuildingParagraph}</p>
            ${
              sharedBuildingEntries.length > 0
                ? `
              <ul class="legal-list">
                ${sharedBuildingEntries.map((entry: string) => `<li>${entry}</li>`).join("")}
              </ul>
            `
                : ""
            }
            ${sharedBuildingAddresses.length > 0 ? `<p class="muted">כתובות: ${sharedBuildingAddresses.join(" • ")}</p>` : ""}
            ${sharedBuildingNotes ? `<p class="muted">${sharedBuildingNotes}</p>` : ""}
          </div>
        `
            : ""
        }
        <div class="section-block">
          <div class="section-title">2.3&emsp;הסתייגות</div>
          <p>${LOCKED_HEBREW_TEXT.legalDisclaimer}</p>
        </div>
        ${
          landRegistry?.easements_description ||
          landRegistry?.easements_essence ||
          landRegistry?.sub_parcel_easements_essence ||
          landRegistry?.sub_parcel_easements_description
            ? `
          <div class="callout section-block">
            ${
              landRegistry?.easements_description ||
              landRegistry?.easements_essence
                ? `
              <div style="margin-bottom: 8px;">
                <strong>זיקות הנאה לכל החלקה:</strong> ${normalizeText(landRegistry?.easements_description || landRegistry?.easements_essence)}
              </div>
            `
                : ""
            }
            ${
              landRegistry?.sub_parcel_easements_essence ||
              landRegistry?.sub_parcel_easements_description
                ? `
              <div>
                <strong>זיקות הנאה לתת החלקה:</strong> ${normalizeText(landRegistry?.sub_parcel_easements_description || landRegistry?.sub_parcel_easements_essence)}
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        ${
          buildingPermitRows.length > 0
            ? `
          <table class="table details-table">
            <tbody>
              ${buildingPermitRows
                .map(
                  (row) => `
                  <tr>
                    <th>${row.label}</th>
                    <td>${row.value}</td>
                  </tr>
                `,
                )
                .join("")}
            </tbody>
          </table>
        `
            : ""
        }
          </div>
      
      ${footerBlock}
      </section>
  `;

  // ===== CHAPTER 3 - Planning & Licensing =====
  // Extract planning rights from multiple potential sources
  const planningRights =
    (data as any).planningRights ||
    (data.extractedData as any)?.planning_rights ||
    (data.extractedData as any)?.planningRights ||
    (data.extractedData as any)?.building_rights ||
    (data.extractedData as any)?.buildingRights ||
    {};

  const planningSection = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Chapter 3 Title -->
        <div class="chapter-title">3.&emsp;מידע תכנוני/ רישוי בניה</div>
        <p>המידע מבוסס על מידע ממערכת המידע התכנוני של הוועדה המקומית לתכנון ולבניה, מידע מאתרי האינטרנט של רשות מקרקעי ישראל ומשרד הפנים וכן מידע הקיים במשרדנו.</p>
        
        <!-- Section 3.1 -->
        <div class="section-title">3.1&emsp;ריכוז תכניות בניין עיר רלבנטיות בתוקף</div>
        ${
          planningPlans.length >= 4
            ? `
          <table class="table">
                <thead>
              <tr>
                <th>מהות</th>
                <th>מספר תכנית</th>
                <th>י.פ.</th>
                <th>תאריך פרסום</th>
                  </tr>
                </thead>
                <tbody>
              ${planningPlans
                .map(
                  (plan: any) => `
                <tr>
                  <td>${plan.plan_name || plan.name || plan.nature || plan.description || plan.mehut || "תכנית בניין עיר"}</td>
                  <td>${plan.plan_number || plan.planNumber || "N/A"}</td>
                  <td>${plan.yp || plan.gazette_number || plan.gazetteNumber || "—"}</td>
                  <td>${plan.publication_date || plan.publicationDate || "N/A"}</td>
                    </tr>
                  `,
                )
                .join("")}
                </tbody>
              </table>
            `
            : planningPlans.length > 0
              ? `
          <table class="table">
                <thead>
              <tr>
                <th>מהות</th>
                <th>מספר תכנית</th>
                <th>י.פ.</th>
                <th>תאריך פרסום</th>
                  </tr>
                </thead>
                <tbody>
              ${planningPlans
                .map(
                  (plan: any) => `
                <tr>
                  <td>${plan.plan_name || plan.name || plan.nature || plan.description || plan.mehut || "תכנית בניין עיר"}</td>
                  <td>${plan.plan_number || plan.planNumber || "N/A"}</td>
                  <td>${plan.yp || plan.gazette_number || plan.gazetteNumber || "—"}</td>
                  <td>${plan.publication_date || plan.publicationDate || "N/A"}</td>
                    </tr>
                  `,
                )
                .join("")}
                </tbody>
              </table>
              <p style="color: #dc2626; font-weight: 600; margin-top: 1rem;">⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח</p>
            `
              : `
          <p style="color: #dc2626; font-weight: 600;">⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח</p>
        `
        }
        
        <div class="section-title">3.2&emsp;ריכוז זכויות הבניה</div>
                <div>
          ${
            planningRights && Object.keys(planningRights).length > 0
              ? `
            <ul style="list-style: none; padding-right: 0;">
              <li><strong>יעוד:</strong> ${normalizeText(planningRights.usage || planningRights.usageType || planningRights.yiud || planningRights.yiudType, "—")}</li>
              <li><strong>שטח מגרש מינימלי:</strong> ${normalizeText(planningRights.minLotSize || planningRights.min_lot_size || planningRights.minimumLotSize, "—")} מ"ר</li>
              <li><strong>אחוזי בנייה:</strong> ${normalizeText(planningRights.buildPercentage || planningRights.build_percentage || planningRights.buildingPercentage, "—")}%</li>
              <li><strong>מספר קומות מותרות:</strong> ${normalizeText(planningRights.maxFloors || planningRights.max_floors || planningRights.floors || planningRights.maxFloorsAllowed, "—")}</li>
              <li><strong>מספר יחידות דיור:</strong> ${normalizeText(planningRights.maxUnits || planningRights.max_units || planningRights.units || planningRights.maxUnitsAllowed, "—")}</li>
              <li><strong>קווי בניין:</strong> ${normalizeText(planningRights.buildingLines || planningRights.building_lines || planningRights.setbackLines || planningRights.setback_lines, "—")}</li>
            </ul>
          `
              : `<p style="color: #dc2626;">⚠️ נדרש מילוי זכויות בנייה (6 שדות חובה)</p>`
          }
              </div>
              
        <div class="section-title">3.3&emsp;רישוי בניה</div>
        <p>מעיון בתיק הבניין הסרוק בוועדה המקומית לתכנון ולבניה ${normalizeText(data.city)}, אותרו המסמכים הרלבנטיים הבאים:</p>
        ${(() => {
          const permits: Array<{
            number: string;
            date: string;
            description: string;
          }> = [];
          if (data.buildingPermitNumber) {
            // Use specific permit description field, not the generic building description
            const permitDesc =
              (data as any).permitDescription ||
              (data.extractedData as any)?.permit_description ||
              (data.extractedData as any)?.permitDescription ||
              (data as any).building_permit?.description;

            // Use permitDesc if available, otherwise use standard permit description (not buildingDescription which is project-level)
            const finalPermitDesc =
              permitDesc ||
              "להקים בניין מגורים בן 15 קומות על גבי עמודים ו-2 קומות מרתפי חניה, המכיל 55 דירות";

            permits.push({
              number: data.buildingPermitNumber,
              date: formatDateNumeric(data.buildingPermitDate || undefined),
              description: normalizeText(finalPermitDesc, "—"),
            });
          }
          if ((data as any).buildingPermitNumber2) {
            permits.push({
              number: (data as any).buildingPermitNumber2,
              date: formatDateNumeric(
                (data as any).buildingPermitDate2 || undefined,
              ),
              description: normalizeText(
                (data as any).buildingDescription2,
                "—",
              ),
            });
          }
          // Sort by date (newest first)
          permits.sort((a, b) => {
            const dateA = new Date(
              a.date.split(".").reverse().join("-"),
            ).getTime();
            const dateB = new Date(
              b.date.split(".").reverse().join("-"),
            ).getTime();
            return dateB - dateA;
          });
          return permits
            .map(
              (p) =>
                `<p>• היתר בניה מס' ${p.number} מיום ${p.date}, ${p.description}.</p>`,
            )
            .join("");
        })()}
        ${(() => {
          const hasCompletionCert = getValueFromPaths(data, [
            "completionCertificate",
            "completion_certificate",
            "hasCompletionCert",
          ]);
          if (!hasCompletionCert) {
            return "<p>• לא אותר טופס 4 / תעודת גמר של הבניין.</p>";
          }
          return "";
        })()}
        ${
          buildingPermitRows.length > 0
            ? `
          <table class="table details-table">
            <tbody>
              ${buildingPermitRows
                .map(
                  (row) => `
                  <tr>
                    <th>${row.label}</th>
                    <td>${row.value}</td>
                  </tr>
                `,
                )
                .join("")}
            </tbody>
          </table>
              `
            : ""
        }
        ${(() => {
          // Support both legacy pngExport and new garmushkaRecords format
          const garmushka = data.garmushkaMeasurements as any;
          const garmushkaRecords = garmushka?.garmushkaRecords || [];
          const legacyPngExport = garmushka?.pngExport;
          const legacyPngExports = garmushka?.pngExports || [];

          // Collect all available garmushka images
          const allImages: string[] = [];

          // Add from garmushkaRecords (new format - uploaded files)
          garmushkaRecords.forEach((record: any) => {
            if (
              record?.url &&
              typeof record.url === "string" &&
              record.url.trim()
            ) {
              allImages.push(record.url.trim());
            }
          });

          // Add legacy pngExports array
          legacyPngExports.forEach((url: string) => {
            if (
              url &&
              typeof url === "string" &&
              url.trim() &&
              !allImages.includes(url.trim())
            ) {
              allImages.push(url.trim());
            }
          });

          // Add legacy single pngExport
          if (
            legacyPngExport &&
            typeof legacyPngExport === "string" &&
            legacyPngExport.trim() &&
            !allImages.includes(legacyPngExport.trim())
          ) {
            allImages.push(legacyPngExport.trim());
          }

          if (allImages.length === 0) return "";

          return `
            <div class="section-block" style="margin-top: 20px;">
              <div class="sub-title">תשריט הדירה מתוך תכנית ההיתר:</div>
              ${allImages
                .map(
                  (imgUrl, idx) => `
                <figure class="garmushka-card">
                  <img src="${imgUrl}" alt="תשריט ${idx + 1}" data-managed-image="true" />
                  <figcaption class="media-caption">תשריט ${idx + 1}${allImages.length > 1 ? ` מתוך ${allImages.length}` : ""}</figcaption>
          </figure>
              `,
                )
                .join("")}
            </div>
          `;
        })()}

        <div class="section-title">3.4&emsp;איכות סביבה</div>
        ${
          (data as any).landContamination && (data as any).landContaminationNote
            ? `
          <p>${LOCKED_HEBREW_TEXT.contaminationAlternate.replace("{{contamination_note}}", normalizeText((data as any).landContaminationNote))}</p>
        `
            : `
          <p>${LOCKED_HEBREW_TEXT.contaminationDefault}</p>
        `
        }
                </div>
      
      ${footerBlock}
    </section>
  `;

  // ===== CHAPTER 4 - Factors & Considerations =====
  const considerationsSection = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Chapter 4 Title -->
        <div class="chapter-title">4.&emsp;גורמים ושיקולים באומדן השווי</div>
        <p>${LOCKED_HEBREW_TEXT.considerationsIntro}</p>
        
        <!-- Environment & Property -->
        <div class="section-block">
          <div class="sub-title">הסביבה והנכס</div>
          <ul class="bullet-list">
            <li>מיקום הנכס ב${address}.</li>
            <li>נשוא חוות הדעת: ${data.propertyEssence || "דירת מגורים"} ${formatFloor(data.floor)}.</li>
            ${(() => {
              // Include measured area from Garmushka if available
              // Try apartmentSqm first, then calculate from measurementTable
              let measuredArea = (data as any).apartmentSqm;

              // Fallback: calculate from garmushkaMeasurements.measurementTable
              if (
                !measuredArea &&
                (data as any).garmushkaMeasurements?.measurementTable
              ) {
                const table = (data as any).garmushkaMeasurements
                  .measurementTable;
                measuredArea = table
                  .filter(
                    (m: any) => m && m.type === "polygon" && m.measurement,
                  )
                  .reduce((sum: number, m: any) => {
                    const match = m.measurement.match(/([\d.,]+)\s*m[²2]?/i);
                    if (match) {
                      const numStr = match[1].replace(",", ".");
                      const parsed = parseFloat(numStr);
                      return sum + (isFinite(parsed) ? parsed : 0);
                    }
                    return sum;
                  }, 0);
              }

              const registeredArea = getValueFromPaths(data, [
                "extractedData.registeredArea",
                "extractedData.registered_area",
                "extractedData.apartment_registered_area",
                "registeredArea",
              ]);

              if (measuredArea && measuredArea > 0) {
                const areaText = `שטח הדירה לפי מדידה: ${formatNumber(measuredArea)} מ"ר`;
                const regAreaText = registeredArea
                  ? ` (שטח רשום: ${formatNumber(registeredArea)} מ"ר)`
                  : "";
                return `<li>${areaText}${regAreaText}, החלוקה הפונקציונאלית ורמת הגמר (הכל כמפורט לעיל).</li>`;
              }
              return `<li>שטח הדירה, החלוקה הפונקציונאלית ורמת הגמר (הכל כמפורט לעיל).</li>`;
            })()}
          </ul>
        </div>
        
        <!-- Rights Status -->
        <div class="section-block">
          <div class="sub-title">מצב הזכויות</div>
          <ul class="bullet-list">
            <li>הזכויות בנכס – ${formatOwnership(data)}.</li>
            <li>בהתאם לתשריט הבית המשותף הדירה זוהתה כתת חלקה ${formatNumber(getSubParcelValue(data, landRegistry))} בקומה ${normalizeText(data.floor?.toString(), "—")}${typeof data.airDirections === "string" && data.airDirections.trim() ? ` הפונה לכיוונים ${data.airDirections.trim()}` : ""}.</li>
          </ul>
              </div>
        
        <!-- Planning & Licensing -->
        <div class="section-block">
          <div class="sub-title">מצב תכנוני ורישוי</div>
          <ul class="bullet-list">
            <li>זכויות הבניה ואפשרויות הניצול עפ"י תכניות בניין עיר בתוקף.</li>
            <li>הבניה בפועל תואמת את היתר הבניה.</li>
          </ul>
            </div>
        
        <!-- Valuation -->
        <div class="section-block">
          <div class="sub-title">אומדן השווי</div>
          <ul class="bullet-list">
            <li>הנכס הוערך בגישת ההשוואה, בהתבסס על רמת מחירי נכסים דומים תוך ביצוע התאמות לנכס נשוא חוות הדעת, נכון למועד הביקור בנכס.</li>
            <li>המחירים המפורטים בשומה כוללים מע"מ כנהוג בנכסים מסוג זה.</li>
            <li>הזכויות בנכס הוערכו כחופשיות מכל חוב, שעבוד או מחזיק.</li>
              </ul>
            </div>
          </div>
      
      ${footerBlock}
      </section>
  `;

  // ===== CHAPTER 5 - Calculations =====
  const comparablesList =
    (data as any).comparableData || (data as any).comparable_data || [];
  const includedComps = comparablesList.filter(
    (c: any) => c.included !== false,
  );

  // Extract analysis data from comparable data analysis results
  // Priority: comparableDataAnalysis (from Step4) > comparableAnalysis > marketAnalysis
  const analysisData =
    (data as any).comparableDataAnalysis ||
    (data as any).comparableAnalysis ||
    (data as any).marketAnalysis ||
    {};
  // Parse all numeric values safely (handles strings from backend)
  const averagePrice = parseNumeric(analysisData.averagePrice);
  const medianPrice = parseNumeric(analysisData.medianPrice);
  const averagePricePerSqm = parseNumeric(analysisData.averagePricePerSqm);
  const medianPricePerSqm = parseNumeric(analysisData.medianPricePerSqm);

  // Use the final price per sqm (prioritize data.pricePerSqm if > 0, then analysisData values)
  // Check multiple sources to ensure we get a valid value
  const topLevelPricePerSqm = parseNumeric((data as any).pricePerSqm);
  const equivPricePerSqmRaw =
    topLevelPricePerSqm > 0
      ? topLevelPricePerSqm
      : averagePricePerSqm ||
        medianPricePerSqm ||
        (data as any).comparableDataAnalysis?.averagePricePerSqm ||
        ((data as any).comparableAnalysis as any)?.averagePricePerSqm ||
        (data as any).marketAnalysis?.averagePricePerSqm ||
        ((data as any).comparableDataAnalysis?.section52 as any)
          ?.final_price_per_sqm ||
        0;
  const equivPricePerSqm = parseNumeric(equivPricePerSqmRaw);

  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("📊 [Document Template] Price Per Sqm Sources:", {
      topLevelPricePerSqm,
      averagePricePerSqm,
      medianPricePerSqm,
      comparableDataAnalysisAvg: (data as any).comparableDataAnalysis
        ?.averagePricePerSqm,
      comparableAnalysisAvg: ((data as any).comparableAnalysis as any)
        ?.averagePricePerSqm,
      marketAnalysisAvg: (data as any).marketAnalysis?.averagePricePerSqm,
      section52Price: ((data as any).comparableDataAnalysis?.section52 as any)
        ?.final_price_per_sqm,
      equivPricePerSqm,
    });
  }

  const valuationSection = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Chapter 5 Title -->
        <div class="chapter-title">5.&emsp;תחשיבים לאומדן השווי</div>
        
        <!-- Section 5.1 -->
        <div class="section-title">5.1&emsp;נתוני השוואה</div>
        <p>${LOCKED_HEBREW_TEXT.comparablesIntro.replace("{{city}}", normalizeText(data.city, "—"))}</p>
        
        ${
          includedComps.length >= 3
            ? `
          <div class="section-block comparables-table-block">
            <div class="comparables-table">
              ${createComparablesTable(data)}
              <p class="muted">* מוצגות ${includedComps.length} עסקאות כלולות מתוך ${comparablesList.length} שנבדקו</p>
            </div>
            
            ${
              averagePrice > 0 ||
              medianPrice > 0 ||
              averagePricePerSqm > 0 ||
              medianPricePerSqm > 0
                ? `
              <div class="section-block" style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.08); border-radius: 12px;">
                <div class="sub-title" style="font-size: 11pt; margin: 0 0 12px 0;">ניתוח סטטיסטי של העסקאות</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 10pt;">
                  ${
                    averagePrice > 0
                      ? `
                    <div>
                      <strong style="color: #1e40af;">מחיר ממוצע:</strong>
                      <div style="font-size: 11pt; font-weight: 600; color: #1e3a8a;">${formatCurrency(averagePrice)}</div>
                    </div>
                  `
                      : ""
                  }
                  ${
                    medianPrice > 0
                      ? `
                    <div>
                      <strong style="color: #1e40af;">מחיר חציוני:</strong>
                      <div style="font-size: 11pt; font-weight: 600; color: #1e3a8a;">${formatCurrency(medianPrice)}</div>
                    </div>
                  `
                      : ""
                  }
                  ${
                    averagePricePerSqm > 0
                      ? `
                    <div>
                      <strong style="color: #1e40af;">ממוצע למ"ר:</strong>
                      <div style="font-size: 11pt; font-weight: 600; color: #059669;">${formatCurrency(averagePricePerSqm)}</div>
                    </div>
                  `
                      : ""
                  }
                  ${
                    medianPricePerSqm > 0
                      ? `
                    <div>
                      <strong style="color: #1e40af;">חציון למ"ר:</strong>
                      <div style="font-size: 11pt; font-weight: 600; color: #059669;">${formatCurrency(medianPricePerSqm)}</div>
                    </div>
                  `
                      : ""
                  }
                </div>
                ${
                  analysisData.priceRange
                    ? `
                  <p class="muted" style="margin-top: 12px; font-size: 9pt;">
                    טווח מחירים: ${formatCurrency(parseNumeric(analysisData.priceRange.min))} - ${formatCurrency(parseNumeric(analysisData.priceRange.max))}
                  </p>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>
        `
            : `
          <p style="color: #dc2626; font-weight: 600;">⚠️ נדרשות מינימום 3 עסקאות השוואה לחישוב שווי</p>
        `
        }
        
        <!-- Section 5.2 -->
        <div class="section-title">5.2&emsp;תחשיב שווי הנכס</div>
        <div class="section-block">
          <p>בשים לב לנתוני ההשוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, שווי מ"ר בנוי לנכס נשוא השומה בגבולות ${formatNumber(equivPricePerSqm)} ₪.</p>

          ${(() => {
            const balconyAreaValue = Number(
              (data.extractedData as any)?.balconyArea ||
                (data as any).balconyArea ||
                0,
            );
            const hasBalcony = balconyAreaValue > 0;
            return `
          <table class="table">
                  <thead>
            <tr>
              <th>תיאור הנכס</th>
              <th>שטח דירה במ"ר</th>
              ${hasBalcony ? "<th>מרפסת</th>" : ""}
              <th>מ"ר אקו'</th>
              <th>שווי מ"ר בנוי</th>
              <th>סה"כ שווי הנכס</th>
                    </tr>
                  </thead>
                  <tbody>
            <tr>
              <td>${normalizeText(data.propertyEssence, "דירת מגורים")} ${data.rooms ? `${data.rooms} ח'` : ""}, בקומה ${data.floor || "—"} בכתובת ${normalizeText(data.street)} ${data.buildingNumber || ""}${data.neighborhood ? `, שכונת ${data.neighborhood}` : ""}${data.city ? `, ${data.city}` : ""}</td>
              <td>${formatNumber(registeredAreaSqm || data.extractedData?.builtArea || data.builtArea)}</td>
              ${hasBalcony ? `<td>${formatNumber(balconyAreaValue)}</td>` : ""}
              <td>${(() => {
                // Equivalent Area = Apartment Area (registered, NOT built) + Balcony * 0.5
                const apartmentArea = Number(
                  registeredAreaSqm ||
                    (data as any).registeredArea ||
                    data.extractedData?.apartment_registered_area ||
                    0,
                );
                if (!apartmentArea) return "—";
                return Math.round(apartmentArea + balconyAreaValue * 0.5);
              })()}</td>
              <td>${formatNumber(equivPricePerSqm)} ₪</td>
              <td>${(() => {
                // Calculate total value dynamically: equivalent area * price per sqm
                const apartmentArea = Number(
                  registeredAreaSqm ||
                    (data as any).registeredArea ||
                    data.extractedData?.apartment_registered_area ||
                    0,
                );
                const equivalentArea = Math.round(
                  apartmentArea + balconyAreaValue * 0.5,
                );
                const calculatedValue = equivalentArea * equivPricePerSqm;
                return formatNumber(calculatedValue) + " ₪";
              })()}</td>
                      </tr>
              </tbody>
            </table>
          `;
          })()}
          <p style="margin-top: 12px;">השווי כולל מע"מ.</p>
        </div>
      </div>
      
      ${footerBlock}
      </section>
  `;

  // ===== CHAPTER 6 - Final Valuation & Signature =====
  // Calculate final value dynamically: equivalent area * price per sqm
  const calculatedApartmentArea = Number(
    registeredAreaSqm ||
      (data as any).registeredArea ||
      data.extractedData?.apartment_registered_area ||
      0,
  );
  const calculatedBalcony = Number(
    (data.extractedData as any)?.balconyArea || (data as any).balconyArea || 0,
  );
  const calculatedEquivalentArea = Math.round(
    calculatedApartmentArea + calculatedBalcony * 0.5,
  );
  const calculatedFinalValue = calculatedEquivalentArea * equivPricePerSqm;
  // Use calculated value if valid, otherwise fall back to stored finalValue
  const displayFinalValue =
    calculatedFinalValue > 0 ? calculatedFinalValue : finalValue;
  const finalValueText = numberToHebrewWords(displayFinalValue);

  const summarySection = `
    <section class="page">
        ${pageHeader}
      
      <div class="page-body">
        <!-- Chapter 6 Title -->
        <div class="chapter-title">6.&emsp;השומה</div>
        
        <!-- Final Valuation Statement -->
        <div class="section-block">
            <p>בשים לב למיקומו של הנכס,</p>
            <p>לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,</p>
            <p>בהביאי בחשבון שווים של נכסים דומים רלוונטיים,</p>
          <p style="margin-top: 16px;"><strong>סביר לאמוד את שווי הנכס בגבולות, <span class="valuation-final-amount">${formatCurrency(displayFinalValue)}</span> (${finalValueText}).</strong></p>
          <p style="margin-top: 16px;">הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות דעת זו.</p>
                </div>
        
        <!-- Declaration -->
        <div class="section-block" style="margin-top: 40px;">
          <div class="sub-title">הצהרה:</div>
          <p><strong>הנני מצהיר, כי אין לי כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.</strong></p>
          <p style="margin-top: 12px;"><strong>הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.</strong></p>
                </div>
        
        <!-- Signature -->
        <div class="signature-block section-block" style="margin-top: 60px;">
          ${
            companySettings?.signature
              ? `
            <div>
              <p>ולראיה באתי על החתום,</p>
              <img src="${companySettings.signature}" alt="חתימה וחותמת" class="signature-image" style="margin-top: 20px;" />
              <p style="margin-top: 10px;">${normalizeText(data.shamayName, "שם השמאי")}</p>
              <p>כלכלן ושמאי מקרקעין</p>
              <p>רשיון מס' ${(data as any).licenseNumber || (data as any).shamaySerialNumber || data.shamaySerialNumber || "115672"}</p>
          </div>
          `
              : `
            <div>
              <p>ולראיה באתי על החתום,</p>
              <p style="margin-top: 20px;">${normalizeText(data.shamayName, "שם השמאי")}</p>
              <p>כלכלן ושמאי מקרקעין</p>
              <p>רשיון מס' ${(data as any).licenseNumber || (data as any).shamaySerialNumber || data.shamaySerialNumber || "115672"}</p>
            </div>
          `
          }
        </div>
      </div>
      
      ${footerBlock}
    </section>
  `;

  const css = buildBaseCss(companySettings);

  // Runtime scripts - auto pagination runs in both preview and export for consistent page breaks
  const previewScripts = isPreview
    ? [pageNumberScript, autoPaginateScript].join("\n")
    : autoPaginateScript;

  // Generate custom tables section if any custom tables exist
  const customTablesSection = generateAllCustomTablesHTML(
    (data as any).customTables,
  );

  const bodyContent = `
    <div class="document">
      ${headerBlock}
      ${introductionPage}
      ${sectionOne}
      ${sectionTwo}
      ${planningSection}
      ${considerationsSection}
      ${valuationSection}
      ${summarySection}
      ${customTablesSection}
    </div>
    ${previewScripts}
    ${(() => {
      if (!customEdits || Object.keys(customEdits).length === 0) {
        return "<script>window.__customEditsApplied = true;</script>";
      }
      const editsJson = JSON.stringify(customEdits);
      return `
    <script>
      (function() {
        const applyEdits = () => {
          try {
            const edits = ${editsJson};
            
            Object.entries(edits).forEach(([selector, html]) => {
              try {
                const elements = document.querySelectorAll(selector);
                if (!elements.length) {
                  console.warn('No elements found for selector:', selector);
                  return;
                }
                elements.forEach((element) => {
                  element.innerHTML = html;
                });
              } catch (selectorError) {
                console.error('Failed to apply edit for selector:', selector, selectorError);
              }
            });
            window.__customEditsApplied = true;
          } catch (error) {
            console.error('Error applying custom document edits:', error);
            window.__customEditsApplied = true;
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyEdits);
        } else {
          applyEdits();
        }
      })();
    </script>
      `;
    })()}
  `;

  // PDF export CSS - clean structure for Puppeteer's header/footer system
  const pdfExportCss = !isPreview
    ? `
    /* PDF export uses Puppeteer's displayHeaderFooter system in export.js */
    /* This CSS just ensures clean HTML structure for extraction */
    
    @page { 
      size: A4; 
      margin: 0; 
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    /* Cover page: standalone, rendered separately */
    .cover {
      position: relative;
      background: white;
    }
    
    /* Content pages: extracted and rendered with Puppeteer header/footer */
    .pages {
      position: relative;
    }
    
    /* Flatten page wrappers for natural content flow */
    .pages main .page {
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      background: transparent !important;
    }
    
    .pages main .page-body {
      padding: 0 16px !important;
    }
    
    /* Hide inline header/footer elements (not needed with Puppeteer system) */
    .pages main .page-header-brand,
    .pages main .page-footer,
    .pages main .page-number {
      display: none !important;
    }
  `
    : "";

  // For PDF export, restructure HTML into two sections
  const customEditsScript = (() => {
    if (!customEdits || Object.keys(customEdits).length === 0) {
      return `
        <script>
          window.__customEditsApplied = true;
        </script>
      `;
    }

    const editsJson = JSON.stringify(customEdits);

    return `
      <script>
        (function() {
          const edits = ${editsJson};
          
          const applyEdits = () => {
            try {
              console.log('🔧 [Custom Edits] Starting application of', Object.keys(edits).length, 'edits');
              
              // Check if we are in export mode (nested structure)
              const docRoot = document.querySelector('.document');
              const isExportMode = !!(docRoot && docRoot.querySelector('.pages > main'));
              
              console.log('🔧 [Custom Edits] Export mode:', isExportMode);
              
              // Use document as base to support full path selectors
              const base = document;
              const pageSections = Array.from(base.querySelectorAll('section.page'));
              
              console.log('🔧 [Custom Edits] Found', pageSections.length, 'page sections');
              
              let appliedCount = 0;
              let failedCount = 0;
              
              Object.entries(edits).forEach(([selector, html]) => {
                try {
                  console.log('🔧 [Custom Edits] Processing selector:', selector.substring(0, 80) + '...');
                  let handled = false;
                  
                  if (isExportMode) {
                    // Match selectors like: div > section:nth-of-type(N) ...
                    // Find the section:nth-of-type pattern and extract page number
                    const nthOfTypeIndex = selector.indexOf('section:nth-of-type(');
                    if (nthOfTypeIndex !== -1) {
                      const start = nthOfTypeIndex + 'section:nth-of-type('.length;
                      const end = selector.indexOf(')', start);
                      if (end !== -1) {
                        const pageNumStr = selector.substring(start, end).trim();
                        const pageNum = parseInt(pageNumStr, 10);
                        if (!isNaN(pageNum)) {
                          const restOfSelector = selector.substring(end + 1);
                          console.log('🔧 [Custom Edits] ✅ Matched export selector - page number:', pageNum, 'rest:', restOfSelector.substring(0, 50));
                          
                          // In export mode: page 1 is cover (index 0), pages 2+ are content pages (index 1+)
                          // pageSections includes ALL pages in order: [cover, page1, page2, ...]
                          const pageIndex = pageNum - 1;
                          
                          if (pageIndex < 0 || pageIndex >= pageSections.length) {
                            console.warn('🔧 [Custom Edits] ❌ Page index out of range:', pageIndex, 'total pages:', pageSections.length);
                          } else {
                            const pageElement = pageSections[pageIndex];
                            const trimmedRest = restOfSelector.trim();
                            
                            if (!trimmedRest) {
                              console.log('🔧 [Custom Edits] Applying to entire page', pageNum);
                              pageElement.innerHTML = html;
                              appliedCount++;
                              handled = true;
                            } else {
                              const scopedSelector = restOfSelector.startsWith(' ')
                                ? \`:scope\${restOfSelector}\`
                                : \`:scope \${restOfSelector}\`;
                              
                              console.log('🔧 [Custom Edits] Trying scoped selector:', scopedSelector.substring(0, 80));
                              let scopedApplied = false;
                              
                              try {
                                const scopedMatches = pageElement.querySelectorAll(scopedSelector);
                                
                                if (scopedMatches.length > 0) {
                                  console.log('🔧 [Custom Edits] ✅ Found', scopedMatches.length, 'matches with scoped selector');
                                  scopedMatches.forEach((element) => {
                                    element.innerHTML = html;
                                    appliedCount++;
                                  });
                                  scopedApplied = true;
                                  handled = true;
                                } else {
                                  console.warn('🔧 [Custom Edits] ❌ No scoped matches for selector:', scopedSelector.substring(0, 80), 'on page:', pageNum);
                                }
                              } catch (scopeError) {
                                console.warn('🔧 [Custom Edits] ❌ Scoped selector failed:', scopeError.message);
                              }
                              
                              if (!scopedApplied) {
                                const fallbackSelector = trimmedRest.replace(/^>\s*/, '').trim();
                                
                                if (fallbackSelector) {
                                  console.log('🔧 [Custom Edits] Trying fallback selector:', fallbackSelector.substring(0, 80));
                                  const fallbackMatches = pageElement.querySelectorAll(fallbackSelector);
                                  
                                  if (fallbackMatches.length > 0) {
                                    console.log('🔧 [Custom Edits] ✅ Found', fallbackMatches.length, 'matches with fallback selector');
                                    fallbackMatches.forEach((element) => {
                                      element.innerHTML = html;
                                      appliedCount++;
                                    });
                                    handled = true;
                                  } else {
                                    console.warn('🔧 [Custom Edits] ❌ Fallback selector had no matches:', fallbackSelector.substring(0, 80), 'on page:', pageNum);
                                  }
                                }
                              }
                            }
                          }
                        } else {
                          console.warn('🔧 [Custom Edits] Invalid page number in selector:', pageNumStr);
                        }
                      } else {
                        console.warn('🔧 [Custom Edits] Could not find closing parenthesis for section:nth-of-type');
                      }
                    } else {
                      console.log('🔧 [Custom Edits] Selector does not contain section:nth-of-type, will try original');
                    }
                  }
                  
                  if (handled) {
                    return;
                  }
                  
                  // Fallback: try original selector
                  const elements = base.querySelectorAll(selector);
                  
                  if (!elements.length) {
                    console.warn('No elements found for selector:', selector);
                    failedCount++;
                    return;
                  }
                  
                  elements.forEach((element) => {
                    element.innerHTML = html;
                    appliedCount++;
                  });
                } catch (err) {
                  console.error('Failed to apply selector:', selector, err);
                  failedCount++;
                }
              });
              
              console.log('Custom edits applied:', appliedCount, 'succeeded,', failedCount, 'failed');
              window.__customEditsApplied = true;
            } catch (error) {
              console.error('Error applying custom edits:', error);
              window.__customEditsApplied = true;
            }
          };
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyEdits);
          } else {
            applyEdits();
          }
        })();
      </script>
    `;
  })();

  let fullHtml = "";
  if (!isPreview) {
    // PDF export: TWO separate sections - cover (standalone) and pages (with header/footer)
    // IMPORTANT: Wrap in .document to match preview structure so custom edit selectors work!
    const pdfHeaderFooter = `
      ${companySettings?.companyLogo ? `<header><img src="${companySettings.companyLogo}" alt="Company Logo" /></header>` : ""}
      ${companySettings?.footerLogo ? `<footer><img src="${companySettings.footerLogo}" alt="Footer Logo" /></footer>` : ""}
    `;

    fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>${css}${pdfExportCss}</style>
        </head>
        <body>
          <div class="document">
            ${headerBlock}
            <div class="pages">
              ${pdfHeaderFooter}
              <main>
                ${introductionPage}
                ${sectionOne}
                ${sectionTwo}
                ${planningSection}
                ${considerationsSection}
                ${valuationSection}
                ${summarySection}
                ${customTablesSection}
                ${customEditsScript}
              </main>
            </div>
          </div>
        </body>
      </html>
    `;
  } else {
    // Preview mode: Keep existing structure
    fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${css}</style>
      </head>
      <body>
        ${bodyContent}
    </body>
    </html>
  `;
  }

  if (isPreview) {
    return `<style>${css}</style>${bodyContent}`;
  }

  return fullHtml;
}
