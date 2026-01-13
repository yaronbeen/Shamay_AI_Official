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

export const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "span", "br", "p", "div"],
  ALLOWED_ATTR: ["style", "class"],
  KEEP_CONTENT: true,
};
