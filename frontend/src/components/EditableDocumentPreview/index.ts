/**
 * EditableDocumentPreview Component
 *
 * Re-exports types and hooks.
 * The main component is still at ../EditableDocumentPreview.tsx
 * This folder contains extracted types and hooks for that component.
 */

// Types for external use
export type {
  ToolbarMode,
  ToolbarState,
  EditableDocumentPreviewProps,
  CustomTable,
  StructuredFootnote,
} from "./types";

// Constants
export {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  DOMPURIFY_CONFIG,
} from "./types";

// Hooks
export { useFootnotes } from "./hooks/useFootnotes";
export { useImageEditor } from "./hooks/useImageEditor";
export { useTableEditor } from "./hooks/useTableEditor";

// Components
export { FloatingToolbar } from "./FloatingToolbar";
export type { FloatingToolbarProps } from "./FloatingToolbar";
export { PageNavigator } from "./PageNavigator";
export type { PageNavigatorProps, ViewMode } from "./PageNavigator";
