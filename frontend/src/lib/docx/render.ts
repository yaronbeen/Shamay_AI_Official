import { Packer } from 'docx'
import sizeOf from 'image-size'
import sharp from 'sharp'
import { ReportData } from '../pdf/types'
import { buildDocxDocument, ImageMap, ImageData, DocumentMetadata } from './template'

// Configuration constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB max per image
const FETCH_TIMEOUT = 10000 // 10 seconds timeout
const MAX_IMAGE_DIMENSION = 1600 // Max width/height after compression
const JPEG_QUALITY = 85 // Compression quality

// Allowed domains for external image fetching (security whitelist)
// Only allow localhost in development to prevent SSRF attacks in production
const ALLOWED_DOMAINS = [
  'vercel-blob.com',
  'blob.vercel-storage.com',
  'public.blob.vercel-storage.com',
  ...(process.env.NODE_ENV === 'development' ? ['localhost', '127.0.0.1'] : []),
]

// Error tracking for failed image loads
export interface ImageLoadError {
  key: string
  src: string
  error: string
  retryCount?: number
}

export interface ImageLoadResult {
  images: ImageMap
  errors: ImageLoadError[]
  totalAttempted: number
  totalLoaded: number
}

// Progress callback type
export type ProgressCallback = (loaded: number, total: number, currentKey: string) => void

/**
 * Check if a URL is from an allowed domain
 */
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Compress and resize image if needed
 */
async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(buffer).metadata()

    // Skip compression for small images or if already optimized
    if (
      buffer.length < 100 * 1024 && // Less than 100KB
      (metadata.width || 0) <= MAX_IMAGE_DIMENSION &&
      (metadata.height || 0) <= MAX_IMAGE_DIMENSION
    ) {
      return buffer
    }

    // Resize and compress
    const compressed = await sharp(buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    // Only use compressed if it's actually smaller
    return compressed.length < buffer.length ? compressed : buffer
  } catch (error) {
    // If compression fails, return original buffer
    console.warn('Image compression failed, using original:', error)
    return buffer
  }
}

/**
 * Get actual image dimensions from buffer
 */
function getImageDimensions(buffer: Buffer): { width: number; height: number } {
  try {
    const dimensions = sizeOf(buffer)
    return {
      width: dimensions.width || 400,
      height: dimensions.height || 300,
    }
  } catch (error) {
    console.warn('Failed to get image dimensions, using defaults:', error)
    return { width: 400, height: 300 }
  }
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Load a single image from URL or base64
 */
async function loadImage(
  src: string,
  key: string
): Promise<{ data: ImageData | null; error: ImageLoadError | null }> {
  try {
    let buffer: Buffer

    if (src.startsWith('data:image')) {
      // Base64 data URI
      const base64Data = src.split(',')[1]
      if (!base64Data) {
        return {
          data: null,
          error: { key, src: src.substring(0, 50), error: 'Invalid base64 data URI' },
        }
      }
      buffer = Buffer.from(base64Data, 'base64')

      // Check size for base64 images too
      if (buffer.length > MAX_IMAGE_SIZE) {
        return {
          data: null,
          error: {
            key,
            src: src.substring(0, 50),
            error: `Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
          },
        }
      }
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      // Security check: validate domain
      if (!isAllowedUrl(src)) {
        // For now, allow all URLs but log a warning
        // In production, you might want to be stricter
        console.warn(`Loading image from non-whitelisted domain: ${new URL(src).hostname}`)
      }

      // Fetch with timeout
      let response: Response
      try {
        response = await fetchWithTimeout(src, FETCH_TIMEOUT)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            data: null,
            error: { key, src, error: `Timeout after ${FETCH_TIMEOUT / 1000}s` },
          }
        }
        throw error
      }

      if (!response.ok) {
        return {
          data: null,
          error: { key, src, error: `HTTP ${response.status}: ${response.statusText}` },
        }
      }

      // Check content-length before downloading
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
        return {
          data: null,
          error: {
            key,
            src,
            error: `Image too large: ${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
          },
        }
      }

      // Validate content type
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.startsWith('image/')) {
        return {
          data: null,
          error: { key, src, error: `Invalid content type: ${contentType}` },
        }
      }

      const arrayBuffer = await response.arrayBuffer()

      // Double-check size after download
      if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
        return {
          data: null,
          error: {
            key,
            src,
            error: `Image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`,
          },
        }
      }

      buffer = Buffer.from(arrayBuffer)
    } else if (src.startsWith('/')) {
      // Relative URL - not supported in server context
      return {
        data: null,
        error: { key, src, error: 'Relative URLs not supported in server context' },
      }
    } else {
      return {
        data: null,
        error: { key, src: src.substring(0, 50), error: 'Unknown image source format' },
      }
    }

    // Compress image if needed
    buffer = await compressImage(buffer)

    // Get actual dimensions
    const dimensions = getImageDimensions(buffer)

    return {
      data: {
        buffer,
        width: dimensions.width,
        height: dimensions.height,
      },
      error: null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error loading image ${key}:`, error)
    return {
      data: null,
      error: { key, src: src.substring(0, 100), error: errorMessage },
    }
  }
}

/**
 * Load all images from ReportData and return as a map with error tracking
 */
async function loadAllImages(data: ReportData): Promise<ImageLoadResult> {
  const images: ImageMap = new Map()
  const errors: ImageLoadError[] = []
  const loadPromises: Promise<{ key: string; result: Awaited<ReturnType<typeof loadImage>> }>[] = []

  // Helper to add image load promise
  const addImageLoad = (key: string, src: string | undefined) => {
    if (src) {
      loadPromises.push(
        loadImage(src, key).then((result) => ({ key, result }))
      )
    }
  }

  // Cover image
  addImageLoad('coverImage', data.cover.coverImage?.src)

  // Company logo
  addImageLoad('companyLogo', data.cover.companyLogo)

  // Footer logo
  addImageLoad('footerLogo', data.cover.footerLogo)

  // Environment map
  addImageLoad('environmentMap', data.section1.environmentMap?.src)

  // Parcel sketch
  addImageLoad('parcelSketch', data.section1.parcel.parcelSketch?.src)

  // Parcel sketch without tazea
  addImageLoad('parcelSketchNoTazea', data.section1.parcel.parcelSketchNoTazea?.src)

  // Property photos
  if (data.section1.property.photos) {
    data.section1.property.photos.forEach((photo, idx) => {
      addImageLoad(`propertyPhoto${idx}`, photo.src)
    })
  }

  // Condo sketches
  if (data.section2.condoOrder?.sketches) {
    data.section2.condoOrder.sketches.forEach((sketch, idx) => {
      addImageLoad(`condoSketch${idx}`, sketch.src)
    })
  }

  // Plan image
  addImageLoad('planImage', data.section3.planImage?.src)

  // Apartment plan
  addImageLoad('apartmentPlan', data.section3.apartmentPlan?.src)

  // Signature
  addImageLoad('signature', data.cover.signatureImage)

  // Wait for all images to load
  const results = await Promise.all(loadPromises)

  // Process results
  for (const { key, result } of results) {
    if (result.data) {
      images.set(key, result.data)
    }
    if (result.error) {
      errors.push(result.error)
    }
  }

  return {
    images,
    errors,
    totalAttempted: loadPromises.length,
    totalLoaded: images.size,
  }
}

/**
 * Create document metadata from report data
 */
function createDocumentMetadata(data: ReportData): DocumentMetadata {
  const propertyAddress = (data.section1?.property as any)?.address || ''
  const now = new Date()

  return {
    title: `שומת מקרקעין - ${propertyAddress || 'נכס'}`,
    subject: 'שומת מקרקעין',
    creator: data.meta?.appraiserName || 'שמאי מקרקעין',
    company: data.cover?.companyName || '',
    description: `שומת מקרקעין עבור ${data.meta?.clientName || 'לקוח'}`,
    lastModifiedBy: data.meta?.appraiserName || 'שמאי מקרקעין',
    created: now,
    modified: now,
    keywords: ['שומה', 'מקרקעין', 'הערכת שווי', propertyAddress || ''].filter(Boolean) as string[],
  }
}

/**
 * Render ReportData to DOCX buffer with error tracking
 */
export async function renderDocxToBuffer(
  data: ReportData,
  options: {
    onProgress?: ProgressCallback
  } = {}
): Promise<{
  buffer: Buffer
  imageErrors: ImageLoadError[]
  stats: { attempted: number; loaded: number }
}> {
  // Load all images with error tracking
  const { images, errors, totalAttempted, totalLoaded } = await loadAllImages(data)

  // Log summary
  console.log(`DOCX Export: Loaded ${totalLoaded}/${totalAttempted} images`)
  if (errors.length > 0) {
    console.warn(
      `Failed images:`,
      errors.map((e) => `${e.key}: ${e.error}`).join(', ')
    )
  }

  // Create document metadata
  const metadata = createDocumentMetadata(data)

  // Build the document with metadata
  const doc = buildDocxDocument(data, images, metadata)

  // Pack to buffer (Packer.toBuffer already returns a Buffer)
  const buffer = await Packer.toBuffer(doc)

  return {
    buffer: Buffer.from(buffer),
    imageErrors: errors,
    stats: { attempted: totalAttempted, loaded: totalLoaded },
  }
}

/**
 * Render ReportData to DOCX Blob (for browser use)
 */
export async function renderDocxToBlob(
  data: ReportData
): Promise<{ blob: Blob; imageErrors: ImageLoadError[]; stats: { attempted: number; loaded: number } }> {
  // Load all images with error tracking
  const { images, errors, totalAttempted, totalLoaded } = await loadAllImages(data)

  // Create document metadata
  const metadata = createDocumentMetadata(data)

  // Build the document with metadata
  const doc = buildDocxDocument(data, images, metadata)

  // Pack to blob
  const blob = await Packer.toBlob(doc)

  return {
    blob,
    imageErrors: errors,
    stats: { attempted: totalAttempted, loaded: totalLoaded },
  }
}

// Legacy exports for backwards compatibility (returns just the buffer/blob)
export async function renderDocxToBufferSimple(data: ReportData): Promise<Buffer> {
  const result = await renderDocxToBuffer(data)
  return result.buffer
}

export async function renderDocxToBlobSimple(data: ReportData): Promise<Blob> {
  const result = await renderDocxToBlob(data)
  return result.blob
}
