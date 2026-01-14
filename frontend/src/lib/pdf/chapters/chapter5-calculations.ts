/**
 * Chapter 5: Calculations (תחשיבים לאומדן השווי)
 *
 * This chapter contains:
 * - Section 5.1: Comparison data (נתוני השוואה)
 * - Section 5.2: Property value calculation (תחשיב שווי הנכס)
 */

import type { ValuationData } from "@/types/valuation";
import type { ChapterContext } from "./chapter-context";
import { createComparablesTable } from "../tables";
import { LOCKED_HEBREW_TEXT } from "../../report-spec-hebrew";

/**
 * Parameters specific to Chapter 5 calculations
 */
export interface Chapter5Params {
  /** Filtered comparables that are included in analysis */
  includedComps: any[];
  /** Full list of comparables */
  comparablesList: any[];
  /** Statistical analysis results */
  averagePrice: number;
  medianPrice: number;
  averagePricePerSqm: number;
  medianPricePerSqm: number;
  /** Analysis data object with price range */
  analysisData: {
    priceRange?: { min: number; max: number };
    [key: string]: unknown;
  };
  /** Equivalent price per sqm */
  equivPricePerSqm: number;
  /** Registered area in sqm (formatted) */
  registeredAreaSqm: string | number;
}

/**
 * Generates Chapter 5: Calculations section.
 *
 * @param ctx - The chapter context with data and helpers
 * @param params - Chapter 5 specific parameters
 * @returns HTML string for Chapter 5
 */
export function generateChapter5(
  ctx: ChapterContext,
  params: Chapter5Params,
): string {
  const {
    data,
    pageHeader,
    footerBlock,
    normalizeText,
    formatNumber,
    formatCurrency,
    parseNumeric,
  } = ctx;

  const {
    includedComps,
    comparablesList,
    averagePrice,
    medianPrice,
    averagePricePerSqm,
    medianPricePerSqm,
    analysisData,
    equivPricePerSqm,
    registeredAreaSqm,
  } = params;

  // Build statistics section if we have data
  const statisticsSection =
    averagePrice > 0 ||
    medianPrice > 0 ||
    averagePricePerSqm > 0 ||
    medianPricePerSqm > 0
      ? `
      <div class="section-block" style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.08); border-radius: 12px;">
        <div class="sub-title" style="font-size: 11pt; margin: 0 0 12px 0;">ניתוח סטטיסטי של העסקאות</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 10pt;">
          ${averagePrice > 0 ? `<div><strong style="color: #1e40af;">מחיר ממוצע:</strong><div style="font-size: 11pt; font-weight: 600; color: #1e3a8a;">${formatCurrency(averagePrice)}</div></div>` : ""}
          ${medianPrice > 0 ? `<div><strong style="color: #1e40af;">מחיר חציוני:</strong><div style="font-size: 11pt; font-weight: 600; color: #1e3a8a;">${formatCurrency(medianPrice)}</div></div>` : ""}
          ${averagePricePerSqm > 0 ? `<div><strong style="color: #1e40af;">ממוצע למ"ר:</strong><div style="font-size: 11pt; font-weight: 600; color: #059669;">${formatCurrency(averagePricePerSqm)}</div></div>` : ""}
          ${medianPricePerSqm > 0 ? `<div><strong style="color: #1e40af;">חציון למ"ר:</strong><div style="font-size: 11pt; font-weight: 600; color: #059669;">${formatCurrency(medianPricePerSqm)}</div></div>` : ""}
        </div>
        ${analysisData.priceRange ? `<p class="muted" style="margin-top: 12px; font-size: 9pt;">טווח מחירים: ${formatCurrency(parseNumeric(analysisData.priceRange.min))} - ${formatCurrency(parseNumeric(analysisData.priceRange.max))}</p>` : ""}
      </div>
    `
      : "";

  // Build comparables section
  const comparablesSection =
    includedComps.length >= 3
      ? `
      <div class="section-block comparables-table-block">
        <div class="comparables-table">
          ${createComparablesTable(data)}
          <p class="muted">* מוצגות ${includedComps.length} עסקאות כלולות מתוך ${comparablesList.length} שנבדקו</p>
        </div>
        ${statisticsSection}
      </div>
    `
      : `<p style="color: #dc2626; font-weight: 600;">⚠️ נדרשות מינימום 3 עסקאות השוואה לחישוב שווי</p>`;

  // Build value calculation table
  const balconyAreaValue = Number(
    (data.extractedData as any)?.balconyArea || (data as any).balconyArea || 0,
  );
  const hasBalcony = balconyAreaValue > 0;

  // Calculate equivalent area
  const apartmentArea = Number(
    registeredAreaSqm ||
      (data as any).registeredArea ||
      data.extractedData?.apartment_registered_area ||
      0,
  );
  const equivalentArea = apartmentArea
    ? Math.round(apartmentArea + balconyAreaValue * 0.5)
    : "—";
  const calculatedValue = apartmentArea
    ? Math.round(apartmentArea + balconyAreaValue * 0.5) * equivPricePerSqm
    : 0;

  const valueTable = `
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
          <td>${equivalentArea}</td>
          <td>${formatNumber(equivPricePerSqm)} ₪</td>
          <td>${calculatedValue ? formatNumber(calculatedValue) + " ₪" : "—"}</td>
        </tr>
      </tbody>
    </table>
  `;

  return `
    <section class="page">
        ${pageHeader}

      <div class="page-body">
        <!-- Chapter 5 Title -->
        <div class="chapter-title">5.&emsp;תחשיבים לאומדן השווי</div>

        <!-- Section 5.1 -->
        <div class="section-title">5.1&emsp;נתוני השוואה</div>
        <p>${LOCKED_HEBREW_TEXT.comparablesIntro.replace("{{city}}", normalizeText(data.city, "—"))}</p>

        ${comparablesSection}

        <!-- Section 5.2 -->
        <div class="section-title">5.2&emsp;תחשיב שווי הנכס</div>
        <div class="section-block">
          <p>בשים לב לנתוני ההשוואה שלעיל, תוך כדי ביצוע התאמות נדרשות לנכס נשוא השומה, שווי מ"ר בנוי לנכס נשוא השומה בגבולות ${formatNumber(equivPricePerSqm)} ₪.</p>

          ${valueTable}
          <p style="margin-top: 12px;">השווי כולל מע"מ.</p>
        </div>
      </div>

      ${footerBlock}
      </section>
  `;
}
