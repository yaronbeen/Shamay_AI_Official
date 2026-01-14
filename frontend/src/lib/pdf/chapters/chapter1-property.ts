/**
 * Chapter 1: Property Description (תיאור הנכס)
 *
 * This chapter contains:
 * - Section 1.1: Environment description
 * - Section 1.2: Plot description with GIS maps
 * - Section 1.3: Property description with interior photos
 */

import type { ChapterContext } from "./chapter-context";
import { LOCKED_HEBREW_TEXT } from "../../report-spec-hebrew";

/**
 * Building metric row for display
 */
export interface BuildingMetric {
  label: string;
  value: string;
}

/**
 * Parameters specific to Chapter 1
 */
export interface Chapter1Params {
  /** Environment description paragraph */
  environmentParagraph: string;
  /** Plot description paragraph */
  plotParagraph: string;
  /** Unit description (e.g., "דירת מגורים") */
  unitDescription: string;
  /** Floor text (e.g., "בקומה 3") */
  floorText: string;
  /** Property attachments (parking, storage, etc.) */
  attachments: any[];
  /** Building metrics for display */
  buildingMetrics: BuildingMetric[];
  /** Shared building description text */
  sharedBuildingDescription: string;
  /** Shared building entries list */
  sharedBuildingEntries: string[];
  /** Shared building addresses */
  sharedBuildingAddresses: string[];
  /** Shared building notes */
  sharedBuildingNotes: string;
  /** Raw shared building data */
  sharedBuildingRaw: Record<string, any>;
  /** Processed shared building data */
  sharedBuildingData: Record<string, any>;
  /** Interior narrative description */
  interiorNarrative: string;
  /** Facade assessment text */
  facadeAssessment: string;
  /** Interior gallery images */
  interiorGallery: string[];
}

/**
 * Generates Chapter 1: Property Description section.
 *
 * @param ctx - The chapter context with data and helpers
 * @param params - Chapter 1 specific parameters
 * @returns HTML string for Chapter 1
 */
export function generateChapter1(
  ctx: ChapterContext,
  params: Chapter1Params,
): string {
  const {
    data,
    pageHeader,
    footerBlock,
    landRegistry,
    normalizeText,
    formatNumber,
    formatDateNumeric,
    formatFloor,
    getValueFromPaths,
    getSubParcelValue,
    toRichHtml,
    toArray,
  } = ctx;

  const {
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
  } = params;

  // Wide area map section
  const wideAreaMapSection = (() => {
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
  })();

  // Zoomed maps section (side by side)
  const zoomedMapsSection = (() => {
    const zoomedNoTazeaMap =
      data.gisScreenshots?.zoomedNoTazea || data.gisScreenshots?.cropMode0;
    const zoomedWithTazeaMap =
      data.gisScreenshots?.zoomedWithTazea || data.gisScreenshots?.cropMode1;

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
  })();

  // Boundaries section
  const boundariesSection = (() => {
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

    const westVal = normalizeText(boundaryWest) || "חזית לרחוב הרי הגלעד";
    const southVal = normalizeText(boundarySouth) || "חלקה 399";
    const eastVal = normalizeText(boundaryEast) || "חלקה 400";
    const northVal = normalizeText(boundaryNorth) || "חלקה 397";

    return `
      <div class="section-block">
        <p><strong>גבולות החלקה:</strong> מערב – ${westVal}, דרום – ${southVal}, מזרח – ${eastVal}, צפון – ${northVal}.</p>
      </div>
    `;
  })();

  // Property description section 1.3
  const propertyDescriptionSection = (() => {
    // Air directions text
    const airDir =
      typeof data.airDirections === "string" && data.airDirections.trim()
        ? data.airDirections.trim()
        : "";
    const airDirectionsText = airDir ? ` הפונה לכיוונים ${airDir}` : "";

    // Parking and storage from attachments
    const parkingCount = attachments.filter(
      (a: any) =>
        a.type && (a.type.includes("חניה") || a.type.includes("חנייה")),
    ).length;
    const storageCount = attachments.filter(
      (a: any) => a.type && a.type.includes("מחסן"),
    ).length;
    const attachmentsParts: string[] = [];
    if (parkingCount > 0) attachmentsParts.push(`${parkingCount} מקומות חניה`);
    if (storageCount > 0) attachmentsParts.push("מחסן");
    const attachmentsText =
      attachmentsParts.length > 0
        ? `, הצמודות אליה ${attachmentsParts.join(" ו")}`
        : "";

    // Registered area
    const registeredArea = formatNumber(
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

    // Built area
    const builtArea = getValueFromPaths(data, [
      "extractedData.builtArea",
      "extractedData.built_area",
      "extractedData.land_registry.builtArea",
      "extractedData.land_registry.built_area",
      "land_registry.builtArea",
      "builtArea",
    ]);
    const builtAreaText = builtArea
      ? ` ובשטח בנוי של כ-${formatNumber(builtArea)} מ"ר`
      : "";

    // Permit reference
    const permitRef = data.buildingPermitNumber
      ? ` (עפ"י מדידה מתוך תכנית היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric(data.buildingPermitDate || undefined)})`
      : "";

    // Layout description
    const layoutDescription = normalizeText(
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
    );

    // Finish standard
    const finishStandard = normalizeText(
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
    );

    // Finish details
    const finishDetails = normalizeText(
      getValueFromPaths(data, [
        "extractedData.finishDetails",
        "extractedData.finish_details",
        "finishDetails",
      ]) ||
        (data.extractedData as any)?.finishDetails ||
        (data.extractedData as any)?.finish_details,
      "ריצוף, חלונות, דלתות, מזגן, כלים סניטריים וכו'",
    );

    return `
      <div class="section-block">
        <div class="section-title">1.3&emsp;תיאור נשוא השומה</div>
        <p>נשוא השומה הינו תת חלקה ${
          formatNumber(getSubParcelValue(data, landRegistry)) || "—"
        } המהווה ${unitDescription || "דירת מגורים"}${floorText ? ` ${floorText}` : ""}${data.rooms ? ` בת ${data.rooms} חד'` : ""}${airDirectionsText}${attachmentsText}.</p>
        <p>הדירה בשטח רשום של ${registeredArea || "—"} מ"ר${builtAreaText}${permitRef}.</p>
        <p>${layoutDescription}</p>
        <p>סטנדרט הגמר בדירה ברמה ${finishStandard} וכולל, בין היתר: ${finishDetails}.</p>
      </div>
    `;
  })();

  // Building metrics section
  const buildingMetricsSection =
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
      : "";

  // Shared building section
  const sharedBuildingSection =
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
      : "";

  // Interior narrative section
  const interiorNarrativeSection = interiorNarrative
    ? `
      <div class="section-block">
        <div class="sub-title">ניתוח פנימי מפורט</div>
        <div class="rich-text">${toRichHtml(interiorNarrative)}</div>
      </div>
    `
    : "";

  // Facade assessment section
  const facadeAssessmentSection = facadeAssessment
    ? `
      <div class="section-block">
        <div class="sub-title">ניתוח חזית המבנה</div>
        <div class="rich-text">${toRichHtml(facadeAssessment)}</div>
      </div>
    `
    : "";

  // Interior gallery section
  const interiorGallerySection =
    interiorGallery.length > 0
      ? `
      <div class="section-block">
        <div class="sub-title">תמונות אופייניות להמחשה:</div>
        <div class="media-gallery">
          ${interiorGallery
            .filter((img: string) => img && img.trim() && img.trim().length > 0)
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
      : "";

  return `
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
        ${wideAreaMapSection}

        <!-- Section 1.2 - Plot Description -->
        <div class="section-block">
          <div class="section-title">1.2&emsp;תיאור החלקה</div>
          <p>${plotParagraph}</p>
        </div>

        <!-- Plot Images (Side by Side) - Zoomed maps for Section 1.2 -->
        ${zoomedMapsSection}

        <!-- Boundaries -->
        ${boundariesSection}

        <!-- Section 1.3 - Property Description -->
        ${propertyDescriptionSection}
        ${buildingMetricsSection}
        ${sharedBuildingSection}
        ${interiorNarrativeSection}
        ${facadeAssessmentSection}
        <!-- Interior Photos Grid -->
        ${interiorGallerySection}
      </div>

      ${footerBlock}
    </section>
  `;
}
