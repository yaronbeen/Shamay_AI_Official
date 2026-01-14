/**
 * Constants for PDF/Document generation
 */

import type { CompanySettings, FontFamily } from "./types";

// Available font configurations
export const FONT_FAMILIES: Record<FontFamily, string> = {
  david: '"David Libre", David, serif',
  "noto-sans-hebrew":
    '"Noto Sans Hebrew", "Rubik", "Arial Hebrew", Arial, sans-serif',
  rubik: 'Rubik, "Noto Sans Hebrew", Arial, sans-serif',
};

export const getFontFamily = (settings?: CompanySettings): string => {
  const fontKey = settings?.fontFamily || "david";
  return FONT_FAMILIES[fontKey] || FONT_FAMILIES["david"];
};

export const getFontSize = (settings?: CompanySettings): number => {
  return settings?.fontSize || 12;
};

export const PAGE_MIN_HEIGHT_MM = 297;

export const DEFAULT_FONT_FAMILY =
  '"Noto Sans Hebrew", "Rubik", "Arial Hebrew", Arial, sans-serif';

export const hebrewMonths = [
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

// Purpose text constant
export const PURPOSE_TEXT =
  "שומת מקרקעין בקריטריון של קונה מרצון למוכר מרצון (שווי שוק).";

// Legal text constants
export const LIABILITY_LIMITATION_TEXT =
  "אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד. שימוש שלא בהתאם לאמור לעיל יעשה לאחר קבלת אישור מראש ובכתב מאת החתום מטה בלבד";

export const LEGAL_DISCLAIMER_TEXT =
  "אין בתיאור המצב המשפטי כדי להוות חוות דעת משפטן. במידה וקיימים מסמכים שלא הובאו לידיעתו, ייתכן ויהיה בהם כדי לשנות את ההערכה.";

// Section 4 constants
export const SECTION4_INTRO_TEXT =
  "באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:";

// Section 6 constants
export const SECTION6_DECLARATION_TEXT =
  "הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.";

export const SECTION6_STANDARDS_TEXT =
  'הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.';

export const SECTION6_FREE_FROM_DEBTS_TEXT =
  "הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.";
