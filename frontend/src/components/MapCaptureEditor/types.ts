/**
 * Type definitions for GIS Map Capture & Editor
 */

export interface GISCoordinates {
  wgs84: {
    lat: number
    lon: number
  }
  itm: {
    easting: number
    northing: number
  }
}

export interface AddressData {
  input: string
  normalized: string
  displayAddress: string
  confidence: number
  details?: {
    city?: string
    street?: string
    houseNumber?: string
    postcode?: string
  }
}

export interface GovMapUrls {
  cropMode0: string  // Clean map
  cropMode1: string  // With תצ"א overlay
}

export interface GISData {
  coordinates: GISCoordinates
  govmapUrls: GovMapUrls
  address: string
  confidence: number
  extractedAt?: string
}

export interface DrawingAnnotation {
  id: string
  type: 'line' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand'
  points: { x: number; y: number }[]
  color: string
  strokeWidth: number
  text?: string
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
  unit: 'px' | '%'
}

export interface MapCaptureEditorProps {
  sessionId: string
  initialAddress?: string
  initialGISData?: GISData
  onAddressUpdate: (address: AddressData, gisData: GISData) => void
  onImageEdited: (imageBlob: Blob, annotations: DrawingAnnotation[], cropArea?: CropArea) => void
  onError?: (error: Error) => void
}

export interface CapturedImage {
  blob: Blob
  dataUrl: string
  width: number
  height: number
  capturedAt: string
}

export type CaptureMethod = 'iframe' | 'manual' | 'server'

export interface CaptureStatus {
  isCapturing: boolean
  method: CaptureMethod | null
  error: string | null
  progress: number
}

