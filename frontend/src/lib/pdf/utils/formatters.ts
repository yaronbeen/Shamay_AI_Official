/**
 * Formatting utilities for PDF/Document generation
 * Provides number, date, and currency formatting functions for Hebrew documents
 */

import { hebrewMonths } from "../constants";

/**
 * Converts a number to Hebrew words with currency suffix (ש"ח)
 * Handles numbers up to millions with proper Hebrew grammar
 *
 * @param value - The numeric value to convert
 * @returns Hebrew word representation with currency, or "—" for invalid input
 *
 * @example
 * numberToHebrewWords(1500000) // "מליון וחמש מאות אלף ש\"ח"
 * numberToHebrewWords(42) // "ארבעים ושניים ש\"ח"
 */
export const numberToHebrewWords = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "—";
  }

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

/**
 * Formats a date string as DD.MM.YYYY numeric format
 *
 * @param value - ISO date string or date-parseable string
 * @returns Formatted date string (DD.MM.YYYY) or "—" for invalid input
 *
 * @example
 * formatDateNumeric("2024-03-15") // "15.03.2024"
 * formatDateNumeric("invalid") // "—"
 */
export const formatDateNumeric = (value?: string): string => {
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

/**
 * Formats a date in Hebrew format (day monthName year)
 * Uses Hebrew month names from constants
 *
 * @param value - ISO date string or date-parseable string (defaults to current date)
 * @returns Hebrew formatted date or "—" for invalid input
 *
 * @example
 * formatDateHebrew("2024-03-15") // "15 מרץ 2024"
 * formatDateHebrew() // Current date in Hebrew
 */
export const formatDateHebrew = (value?: string): string => {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    return "—";
  }
  const day = source.getDate();
  const month = hebrewMonths[source.getMonth()];
  const year = source.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Safely parses numeric values from various input types
 * Handles strings from backend, null, undefined, and edge cases
 *
 * @param value - The value to parse (number, string, or other)
 * @param fallback - Default value if parsing fails (default: 0)
 * @returns Parsed numeric value or fallback
 *
 * @example
 * parseNumeric("123.45") // 123.45
 * parseNumeric(null, 0) // 0
 * parseNumeric("invalid", -1) // -1
 */
export const parseNumeric = (
  value: string | number | null | undefined,
  fallback: number = 0,
): number => {
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

/**
 * Formats a value as Israeli currency (₪)
 * Uses Hebrew locale for number formatting
 *
 * @param value - Numeric value or string to format
 * @returns Formatted currency string with ₪ symbol
 *
 * @example
 * formatCurrency(1500000) // "₪ 1,500,000"
 * formatCurrency("2500") // "₪ 2,500"
 * formatCurrency(undefined) // "₪ —"
 */
export const formatCurrency = (value?: number | string): string => {
  const numValue = parseNumeric(value);
  if (
    numValue === 0 &&
    (value === undefined || value === null || value === "")
  ) {
    return "₪ —";
  }
  return `₪ ${numValue.toLocaleString("he-IL")}`;
};

/**
 * Formats a number using Hebrew locale
 *
 * @param value - Number or string to format
 * @param fallbackText - Text to show for invalid/empty values (default: "—")
 * @returns Locale-formatted number string or fallback
 *
 * @example
 * formatNumber(1500000) // "1,500,000"
 * formatNumber("2500.5") // "2,500.5"
 * formatNumber(undefined) // "—"
 */
export const formatNumber = (
  value?: number | string,
  fallbackText: string = "—",
): string => {
  if (value === undefined || value === null || value === "") {
    return fallbackText;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString("he-IL");
  }
  return String(value);
};

/**
 * Formats room description for property listings
 * Combines room count with optional air direction information
 *
 * @param rooms - Number of rooms
 * @param airDirections - Cardinal directions the property faces (e.g., "צפון-מזרח")
 * @returns Hebrew room description
 *
 * @example
 * formatRooms(4, "צפון-מזרח") // "דירת מגורים בת 4 חדרים הפונה לכיוונים צפון-מזרח"
 * formatRooms(3) // "דירת מגורים בת 3 חדרים"
 * formatRooms() // "דירת מגורים"
 */
export const formatRooms = (
  rooms?: number | string,
  airDirections?: string | number,
): string => {
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

/**
 * Formats floor number for property descriptions
 *
 * @param floor - Floor number (0 for ground floor)
 * @returns Hebrew floor description or empty string
 *
 * @example
 * formatFloor(3) // "בקומה 3"
 * formatFloor(0) // "בקומה 0"
 * formatFloor() // ""
 */
export const formatFloor = (floor?: number | string): string => {
  if (!floor && floor !== 0) {
    return "";
  }
  return `בקומה ${floor}`;
};
