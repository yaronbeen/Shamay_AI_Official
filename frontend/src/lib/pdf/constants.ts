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
