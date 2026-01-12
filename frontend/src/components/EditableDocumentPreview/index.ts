/**
 * EditableDocumentPreview Component
 *
 * Re-exports the main component and types.
 * This folder structure enables future component splitting.
 */

// Main component - still in parent directory for now
// Will be moved here when fully split
export { EditableDocumentPreview } from "../EditableDocumentPreview";

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
