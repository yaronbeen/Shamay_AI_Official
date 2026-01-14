/**
 * Chapter 2: Legal Status (מצב משפטי – הזכויות בנכס)
 *
 * This chapter contains:
 * - Section 2.1: Land registry extract
 * - Section 2.2: Shared building documents
 * - Section 2.3: Disclaimer
 */

import type { ChapterContext } from "./chapter-context";
import { LOCKED_HEBREW_TEXT } from "../../report-spec-hebrew";

/**
 * Parameters specific to Chapter 2
 */
export interface Chapter2Params {
  combinedAttachments: any[];
  combinedOwners: any[];
  combinedMortgages: any[];
  combinedNotes: any[];
  additionalAreas: any[];
  registrarOffice: string;
  extractDate: string;
  blockNum: string | number;
  parcelNum: string | number;
  parcelAreaSqm: string | number;
  subParcelNum: string | number;
  registeredAreaSqm: string | number;
  sharedProperty: string;
  buildingIdentifier: string;
  buildingPermitRows: Array<{ label: string; value: string }>;
  sharedBuildingDescription: string;
  sharedBuildingEntries: string[];
  sharedBuildingAddresses: string[];
  sharedBuildingNotes: string;
  sharedBuildingParagraph: string;
}

/**
 * Generates Chapter 2: Legal Status section.
 *
 * @param ctx - The chapter context with data and helpers
 * @param params - Chapter 2 specific parameters
 * @returns HTML string for Chapter 2
 */
export function generateChapter2(
  ctx: ChapterContext,
  params: Chapter2Params,
): string {
  const {
    data,
    pageHeader,
    footerBlock,
    landRegistry,
    normalizeText,
    formatNumber,
    formatDateNumeric,
    formatOwnership,
    getValueFromPaths,
  } = ctx;

  const {
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
  } = params;

  // Shared parcels text
  const sharedParcelsText = (() => {
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
  })();

  // Attachments section
  const attachmentsSection =
    combinedAttachments.length > 0
      ? `
      <div class="section-block">
        <div class="sub-title">הצמדות</div>
        <ul class="legal-list">
          ${combinedAttachments
            .map(
              (att: any) =>
                `<li>${normalizeText(att.type)}${att.area ? ` בשטח ${formatNumber(att.area)} מ"ר` : ""}${att.symbol ? `, המסומנ/ת בתשריט באות ${att.symbol}` : ""}${att.color ? `, בצבע ${att.color}` : ""}${att.sharedWith ? `, משותפת עם: ${normalizeText(att.sharedWith)}` : ""}.</li>`,
            )
            .join("")}
        </ul>
      </div>
    `
      : "";

  // Additional areas section
  const additionalAreasSection =
    additionalAreas.length > 0
      ? `
      <div class="section-block">
        <div class="sub-title">שטחים נוספים</div>
        <ul class="legal-list">
          ${additionalAreas
            .map(
              (area: any) =>
                `<li>${normalizeText(area.type)}${area.area ? ` בשטח ${formatNumber(area.area)} מ"ר` : ""}.</li>`,
            )
            .join("")}
        </ul>
      </div>
    `
      : "";

  // Owners section
  const ownersSection =
    combinedOwners.length > 0
      ? `
      <div class="section-block">
        <div class="sub-title">בעלויות</div>
        <ul class="legal-list">
          ${combinedOwners
            .map(
              (owner: any) =>
                `<li>${normalizeText(owner.name)}${owner.idNumber ? `, ת.ז ${owner.idNumber}` : ""}, חלק בנכס – ${normalizeText(owner.share, "שלמות")}.</li>`,
            )
            .join("")}
        </ul>
      </div>
    `
      : `<p>בעלויות: ${formatOwnership(data)}</p>`;

  // Mortgages section
  const mortgagesSection =
    combinedMortgages.length > 0
      ? `
      <div class="section-block">
        <div class="sub-title">משכנתאות</div>
        <ul class="legal-list">
          ${combinedMortgages
            .map(
              (mortgage: any) =>
                `<li>משכנתא מדרגה ${normalizeText(mortgage.rank, "—")} לטובת ${normalizeText(mortgage.lenders)}${mortgage.amount ? ` על סך ₪${formatNumber(mortgage.amount)}` : ""}${mortgage.registrationDate ? `, מיום ${formatDateNumeric(mortgage.registrationDate)}` : ""}${mortgage.share ? `, חלק בנכס: ${normalizeText(mortgage.share)}` : ""}.</li>`,
            )
            .join("")}
        </ul>
      </div>
    `
      : "";

  // Notes section
  const notesSection =
    combinedNotes.length > 0
      ? `
      <div class="section-block">
        <div class="sub-title">הערות${combinedNotes.some((n: any) => n.isSubChelka) ? " - הערות לתת חלקה והערות כלליות" : ""}</div>
        <ul class="legal-list">
          ${combinedNotes
            .map((note: any) => {
              const prefix = note.isSubChelka
                ? "<strong>הערות לתת חלקה:</strong> "
                : "";
              return `<li>${prefix}${normalizeText(note.actionType)}${note.date ? ` מיום ${formatDateNumeric(note.date)}` : ""}${note.beneficiary ? ` לטובת ${normalizeText(note.beneficiary)}` : ""}${note.extra ? `, ${normalizeText(note.extra)}` : ""}.</li>`;
            })
            .join("")}
        </ul>
      </div>
    `
      : "";

  // Plot notes section
  const plotNotesSection =
    (data.extractedData as any)?.plot_notes || data.notes
      ? `
      <div class="callout section-block">
        ${(data.extractedData as any)?.plot_notes || data.notes}
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
      : "";

  // Easements section
  const easementsSection =
    landRegistry?.easements_description ||
    landRegistry?.easements_essence ||
    landRegistry?.sub_parcel_easements_essence ||
    landRegistry?.sub_parcel_easements_description
      ? `
      <div class="callout section-block">
        ${
          landRegistry?.easements_description || landRegistry?.easements_essence
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
      : "";

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

  return `
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
          <p>חלקה ${parcelNum} בגוש ${blockNum} בשטח קרקע רשום של ${parcelAreaSqm} מ"ר.${sharedParcelsText}</p>
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
        ${attachmentsSection}
        ${additionalAreasSection}
        ${ownersSection}
        ${mortgagesSection}
        ${notesSection}
        ${plotNotesSection}
        ${sharedBuildingSection}
        <div class="section-block">
          <div class="section-title">2.3&emsp;הסתייגות</div>
          <p>${LOCKED_HEBREW_TEXT.legalDisclaimer}</p>
        </div>
        ${easementsSection}
        ${permitRowsTable}
          </div>

      ${footerBlock}
      </section>
  `;
}
