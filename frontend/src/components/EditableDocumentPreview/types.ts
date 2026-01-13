/**
 * Types for EditableDocumentPreview component
 */

export type ToolbarMode = "text" | "image" | "table";

export interface ToolbarState {
  mode: ToolbarMode;
  targetSelector: string | null;
  show: boolean;
  position: { top: number; left: number };
}

export interface EditableDocumentPreviewProps {
  data: any; // ValuationData - using any for backward compatibility
  onDataChange: (updates: any) => void;
}

export interface CustomTable {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
  sectionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredFootnote {
  id: string;
  pageNumber: number;
  footnoteNumber: number;
  text: string;
}

export interface TableCellPosition {
  tableId: string;
  row: number;
  col: number;
}

// Constants
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Security: DOMPurify configuration for sanitizing HTML
export const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "b",
    "i",
    "u",
    "strong",
    "em",
    "p",
    "br",
    "span",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "sup",
    "sub",
    "div",
    "img",
    "figure",
    "figcaption",
  ],
  ALLOWED_ATTR: [
    "class",
    "style",
    "data-row",
    "data-col",
    "data-edit-selector",
    "src",
    "alt",
    "width",
    "height",
  ],
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "textarea",
    "select",
    "button",
  ],
  FORBID_ATTR: [
    "onclick",
    "onerror",
    "onload",
    "onmouseover",
    "onmouseout",
    "onfocus",
    "onblur",
  ],
};
