/**
 * Chapter 3: Planning & Licensing (מידע תכנוני/ רישוי בניה)
 *
 * This chapter contains:
 * - Section 3.1: Summary of relevant city plans
 * - Section 3.2: Building rights summary
 * - Section 3.3: Building permits
 * - Section 3.4: Environmental quality
 */

import type { ChapterContext } from "./chapter-context";
import { LOCKED_HEBREW_TEXT } from "../../report-spec-hebrew";

/**
 * Parameters specific to Chapter 3
 */
export interface Chapter3Params {
  /** Array of planning plans */
  planningPlans: any[];
  /** Planning rights object */
  planningRights: Record<string, any>;
  /** Building permit table rows */
  buildingPermitRows: Array<{ label: string; value: string }>;
}

/**
 * Generates Chapter 3: Planning & Licensing section.
 *
 * @param ctx - The chapter context with data and helpers
 * @param params - Chapter 3 specific parameters
 * @returns HTML string for Chapter 3
 */
export function generateChapter3(
  ctx: ChapterContext,
  params: Chapter3Params,
): string {
  const {
    data,
    pageHeader,
    footerBlock,
    normalizeText,
    formatDateNumeric,
    getValueFromPaths,
  } = ctx;

  const { planningPlans, planningRights, buildingPermitRows } = params;

  // Planning plans table
  const planningPlansSection =
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
        : `<p style="color: #dc2626; font-weight: 600;">⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח</p>`;

  // Building rights section
  const buildingRightsSection =
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
      : `<p style="color: #dc2626;">⚠️ נדרש מילוי זכויות בנייה (6 שדות חובה)</p>`;

  // Building permits section
  const permitsHtml = (() => {
    const permits: Array<{
      number: string;
      date: string;
      description: string;
    }> = [];
    if (data.buildingPermitNumber) {
      const permitDesc =
        (data as any).permitDescription ||
        (data.extractedData as any)?.permit_description ||
        (data.extractedData as any)?.permitDescription ||
        (data as any).building_permit?.description;

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
        date: formatDateNumeric((data as any).buildingPermitDate2 || undefined),
        description: normalizeText((data as any).buildingDescription2, "—"),
      });
    }
    // Sort by date (newest first)
    permits.sort((a, b) => {
      const dateA = new Date(a.date.split(".").reverse().join("-")).getTime();
      const dateB = new Date(b.date.split(".").reverse().join("-")).getTime();
      return dateB - dateA;
    });
    return permits
      .map(
        (p) =>
          `<p>• היתר בניה מס' ${p.number} מיום ${p.date}, ${p.description}.</p>`,
      )
      .join("");
  })();

  // Completion certificate check
  const completionCertHtml = (() => {
    const hasCompletionCert = getValueFromPaths(data, [
      "completionCertificate",
      "completion_certificate",
      "hasCompletionCert",
    ]);
    if (!hasCompletionCert) {
      return "<p>• לא אותר טופס 4 / תעודת גמר של הבניין.</p>";
    }
    return "";
  })();

  // Building permit rows table
  const permitRowsTable =
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
      : "";

  // Garmushka images section
  const garmushkaSection = (() => {
    const garmushka = data.garmushkaMeasurements as any;
    const garmushkaRecords = garmushka?.garmushkaRecords || [];
    const legacyPngExport = garmushka?.pngExport;
    const legacyPngExports = garmushka?.pngExports || [];

    const allImages: string[] = [];

    // Add from garmushkaRecords (new format - uploaded files)
    garmushkaRecords.forEach((record: any) => {
      if (record?.url && typeof record.url === "string" && record.url.trim()) {
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
  })();

  // Environmental quality section
  const environmentSection =
    (data as any).landContamination && (data as any).landContaminationNote
      ? `<p>${LOCKED_HEBREW_TEXT.contaminationAlternate.replace("{{contamination_note}}", normalizeText((data as any).landContaminationNote))}</p>`
      : `<p>${LOCKED_HEBREW_TEXT.contaminationDefault}</p>`;

  return `
    <section class="page">
        ${pageHeader}

      <div class="page-body">
        <!-- Chapter 3 Title -->
        <div class="chapter-title">3.&emsp;מידע תכנוני/ רישוי בניה</div>
        <p>המידע מבוסס על מידע ממערכת המידע התכנוני של הוועדה המקומית לתכנון ולבניה, מידע מאתרי האינטרנט של רשות מקרקעי ישראל ומשרד הפנים וכן מידע הקיים במשרדנו.</p>

        <!-- Section 3.1 -->
        <div class="section-title">3.1&emsp;ריכוז תכניות בניין עיר רלבנטיות בתוקף</div>
        ${planningPlansSection}

        <div class="section-title">3.2&emsp;ריכוז זכויות הבניה</div>
        <div>
          ${buildingRightsSection}
        </div>

        <div class="section-title">3.3&emsp;רישוי בניה</div>
        <p>מעיון בתיק הבניין הסרוק בוועדה המקומית לתכנון ולבניה ${normalizeText(data.city)}, אותרו המסמכים הרלבנטיים הבאים:</p>
        ${permitsHtml}
        ${completionCertHtml}
        ${permitRowsTable}
        ${garmushkaSection}

        <div class="section-title">3.4&emsp;איכות סביבה</div>
        ${environmentSection}
                </div>

      ${footerBlock}
    </section>
  `;
}
