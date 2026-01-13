/**
 * Text utility functions for PDF document generation.
 * These functions handle text escaping, normalization, and HTML conversion.
 */

/**
 * Escapes HTML special characters to prevent XSS and ensure safe rendering in HTML documents.
 *
 * @param text - The text string to escape
 * @returns The escaped string with HTML entities
 *
 * @example
 * escapeHtmlForTable('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export const escapeHtmlForTable = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Normalizes text by returning the value if it exists, or a fallback placeholder.
 *
 * @param value - The text value to normalize (optional)
 * @param fallbackText - The fallback text to use if value is falsy (defaults to em-dash)
 * @returns The original value if truthy, otherwise the fallback text
 *
 * @example
 * normalizeText('Hello') // Returns: 'Hello'
 * normalizeText('') // Returns: '—'
 * normalizeText(undefined, 'N/A') // Returns: 'N/A'
 */
export const normalizeText = (
  value?: string,
  fallbackText: string = "—",
): string => {
  if (!value) {
    return fallbackText;
  }
  return value;
};

/**
 * Returns a safe value with fallback for undefined, null, or empty string values.
 * Works with both string and number types.
 *
 * @param value - The value to check (optional string or number)
 * @param fallback - The fallback value to use if value is invalid (defaults to em-dash)
 * @returns The original value if valid, otherwise the fallback
 *
 * @example
 * safeValue(42) // Returns: 42
 * safeValue('text') // Returns: 'text'
 * safeValue('   ') // Returns: '—'
 * safeValue(undefined) // Returns: '—'
 * safeValue(null, 'N/A') // Returns: 'N/A'
 */
export const safeValue = (
  value?: string | number,
  fallback: string = "—",
): string | number => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return fallback;
  }
  return value;
};

/**
 * Converts plain text with markdown-like syntax to rich HTML.
 * Supports:
 * - **text** -> <strong>text</strong> (bold)
 * - ## heading -> <span class="section-heading">heading</span> (section headings)
 * - \n -> <br/> (line breaks)
 *
 * @param value - The text to convert (optional)
 * @returns HTML string with converted formatting, or empty string if no value
 *
 * @example
 * toRichHtml('**Bold** and ## Heading\nNew line')
 * // Returns: '<strong>Bold</strong> and <span class="section-heading">Heading</span><br/>New line'
 */
export const toRichHtml = (value?: string): string => {
  if (!value) return "";
  return value
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/##\s?(.*)/g, '<span class="section-heading">$1</span>')
    .replace(/\n/g, "<br/>");
};
