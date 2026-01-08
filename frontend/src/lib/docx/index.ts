// DOCX Export Library
// Generates Word documents from ReportData

export {
  renderDocxToBuffer,
  renderDocxToBlob,
  renderDocxToBufferSimple,
  renderDocxToBlobSimple,
} from './render'
export type { ImageLoadError, ImageLoadResult, ProgressCallback } from './render'
export { buildDocxDocument } from './template'
export type { ImageData, ImageMap, DocumentMetadata } from './template'
export * from './styles'
