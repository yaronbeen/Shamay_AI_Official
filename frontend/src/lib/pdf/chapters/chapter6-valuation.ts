/**
 * Chapter 6: The Valuation (השומה)
 *
 * Final valuation statement with:
 * - Summary statement
 * - Declaration
 * - Signature block
 */

import type { ChapterContext } from "./chapter-context";
import { numberToHebrewWords } from "../utils/formatters";

/**
 * Generates Chapter 6: The Valuation section.
 *
 * @param ctx - The chapter context with data and helpers
 * @param displayFinalValue - The final computed value to display
 * @returns HTML string for Chapter 6
 */
export function generateChapter6(
  ctx: ChapterContext,
  displayFinalValue: number,
): string {
  const {
    data,
    companySettings,
    pageHeader,
    footerBlock,
    normalizeText,
    formatCurrency,
  } = ctx;

  const finalValueText = numberToHebrewWords(displayFinalValue);
  const shamayName = normalizeText(data.shamayName, "שם השמאי");
  const licenseNumber =
    (data as any).licenseNumber ||
    (data as any).shamaySerialNumber ||
    data.shamaySerialNumber ||
    "115672";

  const signatureBlock = companySettings?.signature
    ? `
      <div>
        <p>ולראיה באתי על החתום,</p>
        <img src="${companySettings.signature}" alt="חתימה וחותמת" class="signature-image" style="margin-top: 20px;" />
        <p style="margin-top: 10px;">${shamayName}</p>
        <p>כלכלן ושמאי מקרקעין</p>
        <p>רשיון מס' ${licenseNumber}</p>
      </div>
    `
    : `
      <div>
        <p>ולראיה באתי על החתום,</p>
        <p style="margin-top: 20px;">${shamayName}</p>
        <p>כלכלן ושמאי מקרקעין</p>
        <p>רשיון מס' ${licenseNumber}</p>
      </div>
    `;

  return `
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
          ${signatureBlock}
        </div>
      </div>

      ${footerBlock}
    </section>
  `;
}
