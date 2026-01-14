import { ValuationData } from "@/types/valuation";
import { STATIC_TEXTS } from "./static-texts-he";
import { LOCKED_HEBREW_TEXT, COMPLETE_TA_BINDINGS } from "./report-spec-hebrew";
import { formatBlockParcelFromString } from "./comparable-data-formatter";

// Import from extracted pdf modules
import {
  CompanySettings,
  FONT_FAMILIES,
  getFontFamily,
  getFontSize,
  PAGE_MIN_HEIGHT_MM,
  DEFAULT_FONT_FAMILY,
  hebrewMonths,
  numberToHebrewWords,
  formatDateNumeric,
  formatDateHebrew,
  parseNumeric,
  formatCurrency,
  formatNumber,
  formatRooms,
  formatFloor,
  escapeHtmlForTable,
  normalizeText,
  toRichHtml,
  getValueFromPaths,
  getSubParcelValue,
  getAddress,
  getReference,
  formatOwnership,
  summarizeAttachments,
  toArray,
  createDetailsTable,
  createComparablesTable,
  resolveCoverImageSources,
  collectInteriorImages,
  buildBaseCss,
  pageNumberScript,
  autoPaginateScript,
  // Chapter generators
  createChapterContext,
  generateChapter1,
  generateChapter2,
  generateChapter3,
  generateChapter4,
  generateChapter5,
  generateChapter6,
} from "./pdf";

// Re-export CompanySettings for backwards compatibility
export type { CompanySettings } from "./pdf";

// Helper functions needed for document generation
const mergeRecords = (
  ...records: Array<Record<string, any> | null | undefined>
) => {
  return records.reduce<Record<string, any>>((acc, record) => {
    if (!record || typeof record !== "object") return acc;
    Object.entries(record).forEach(([key, value]) => {
      if (value !== undefined && value !== null && acc[key] === undefined) {
        acc[key] = value;
      }
    });
    return acc;
  }, {});
};

const resolveLandRegistryData = (data: ValuationData) => {
  const mergedRegistry = mergeRecords(
    (data.extractedData as any)?.land_registry,
    (data.extractedData as any)?.landRegistry,
    (data as any).land_registry,
    (data as any).landRegistry,
  );
  const owners = toArray((mergedRegistry as any).owners).map((owner: any) => ({
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
  return `<div id="${tableId}" class="custom-table-container section-block" data-custom-table-id="${table.id}">${table.title ? `<div class="sub-title">${escapeHtmlForTable(table.title)}</div>` : ""}<table class="table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
};

const generateAllCustomTablesHTML = (
  customTables?: Array<{
    id: string;
    title?: string;
    headers: string[];
    rows: string[][];
  }>,
): string => {
  if (!customTables || customTables.length === 0) return "";
  return `<section class="page custom-tables-section"><div class="chapter-title">נספחים - טבלאות מותאמות אישית</div><div class="page-body">${customTables.map((table) => generateCustomTableHTML(table)).join("\n")}</div></section>`;
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
  const environmentDescriptionRaw = getValueFromPaths(data, [
    "extractedData.environmentDescription",
    "extractedData.environment_description",
    "environmentDescription",
  ]);
  const environmentParagraph: string =
    (typeof environmentDescriptionRaw === "string" &&
      environmentDescriptionRaw) ||
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

  // ===== Create shared chapter context (used by all chapter generators) =====
  const chapterContext = createChapterContext(
    data,
    isPreview,
    companySettings,
    pageHeader,
    footerBlock,
    coverFooterBlock,
  );

  // ===== CHAPTER 1 - Property Description =====
  const interiorGallery = collectInteriorImages(data);
  const sectionOne = generateChapter1(chapterContext, {
    environmentParagraph,
    plotParagraph,
    unitDescription,
    floorText,
    attachments,
    buildingMetrics,
    sharedBuildingDescription,
    sharedBuildingEntries,
    sharedBuildingAddresses,
    sharedBuildingNotes,
    sharedBuildingRaw,
    sharedBuildingData,
    interiorNarrative,
    facadeAssessment,
    interiorGallery,
  });

  // ===== CHAPTER 2 - Legal Status (data preparation) =====
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

  // ===== CHAPTER 2 - Legal Status (rendering) =====
  const sectionTwo = generateChapter2(chapterContext, {
    combinedAttachments,
    combinedOwners,
    combinedMortgages,
    combinedNotes,
    additionalAreas,
    registrarOffice,
    extractDate,
    blockNum,
    parcelNum,
    parcelAreaSqm,
    subParcelNum,
    registeredAreaSqm,
    sharedProperty,
    buildingIdentifier,
    buildingPermitRows,
    sharedBuildingDescription,
    sharedBuildingEntries,
    sharedBuildingAddresses,
    sharedBuildingNotes,
    sharedBuildingParagraph,
  });

  // ===== CHAPTER 3 - Planning & Licensing =====
  // Extract planning rights from multiple potential sources
  const planningRights =
    (data as any).planningRights ||
    (data.extractedData as any)?.planning_rights ||
    (data.extractedData as any)?.planningRights ||
    (data.extractedData as any)?.building_rights ||
    (data.extractedData as any)?.buildingRights ||
    {};

  const planningSection = generateChapter3(chapterContext, {
    planningPlans,
    planningRights,
    buildingPermitRows,
  });

  // ===== CHAPTER 4 - Factors & Considerations =====
  const considerationsSection = generateChapter4(chapterContext);

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

  const valuationSection = generateChapter5(chapterContext, {
    includedComps,
    comparablesList,
    averagePrice,
    medianPrice,
    averagePricePerSqm,
    medianPricePerSqm,
    analysisData,
    equivPricePerSqm,
    registeredAreaSqm,
  });

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

  // Generate Chapter 6 using the shared context
  const summarySection = generateChapter6(chapterContext, displayFinalValue);

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
