/**
 * Chapter 4: Factors & Considerations (גורמים ושיקולים באומדן השווי)
 *
 * This chapter contains:
 * - Environment & Property factors
 * - Rights status
 * - Planning & Licensing
 * - Valuation methodology
 */

import type { ChapterContext } from "./chapter-context";
import { LOCKED_HEBREW_TEXT } from "../../report-spec-hebrew";

/**
 * Generates Chapter 4: Factors & Considerations section.
 *
 * @param ctx - The chapter context with data and helpers
 * @returns HTML string for Chapter 4
 */
export function generateChapter4(ctx: ChapterContext): string {
  const {
    data,
    pageHeader,
    footerBlock,
    address,
    landRegistry,
    formatNumber,
    formatFloor,
    normalizeText,
    formatOwnership,
    getValueFromPaths,
    getSubParcelValue,
  } = ctx;

  // Calculate measured area from garmushka if available
  const measuredAreaBlock = (() => {
    let measuredArea = (data as any).apartmentSqm;

    // Fallback: calculate from garmushkaMeasurements.measurementTable
    if (
      !measuredArea &&
      (data as any).garmushkaMeasurements?.measurementTable
    ) {
      const table = (data as any).garmushkaMeasurements.measurementTable;
      measuredArea = table
        .filter((m: any) => m && m.type === "polygon" && m.measurement)
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
  })();

  // Air directions text
  const airDirectionsText =
    typeof data.airDirections === "string" && data.airDirections.trim()
      ? ` הפונה לכיוונים ${data.airDirections.trim()}`
      : "";

  return `
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
            ${measuredAreaBlock}
          </ul>
        </div>

        <!-- Rights Status -->
        <div class="section-block">
          <div class="sub-title">מצב הזכויות</div>
          <ul class="bullet-list">
            <li>הזכויות בנכס – ${formatOwnership(data)}.</li>
            <li>בהתאם לתשריט הבית המשותף הדירה זוהתה כתת חלקה ${formatNumber(getSubParcelValue(data, landRegistry))} בקומה ${normalizeText(data.floor?.toString(), "—")}${airDirectionsText}.</li>
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
}
