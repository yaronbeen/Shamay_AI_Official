import { Packer } from 'docx'
import { ReportData } from '../pdf/types'
import { buildDocxDocument, ImageMap, ImageData, DocumentMetadata } from './template'

// Configuration constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB max per image
const FETCH_TIMEOUT = 10000 // 10 seconds timeout
const MAX_IMAGE_DIMENSION = 1600 // Max width/height after compression
const JPEG_QUALITY = 85 // Compression quality
const MAX_RETRIES = 3 // Number of retry attempts for failed image loads
const RETRY_DELAY_BASE = 1000 // Base delay for exponential backoff (ms)
const MAX_CONCURRENT_LOADS = 5 // Maximum parallel image fetches

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
  placeholdersUsed: number
}

// Progress callback type
export type ProgressCallback = (loaded: number, total: number, currentKey: string) => void

// Placeholder image - a simple gray rectangle with "Image not available" text
// This is a minimal 100x75 gray PNG
const PLACEHOLDER_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABLCAYAAACGGCK3AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAF5SURBVHic7doxDoJAEEDR/9z/0liZeALXxsJCK2MlCQmVrYUJlYn3MOZP8dKB3dnZnQkAAAAAAAAAAPgXx9YHsKaqqmOSY5JTkkPr81hRrSTnJOck59baZfqBfyDkluSW5Nb6RFa07yCPJI8kt9YnspLZkFvrg1jJbMi19YGsZDbk0vpAVjIb8mh9ICuZDXm2PpCVnFofwNpmQy6tD2QlsyG31geyktmQa+sDWclsyKP1gaxkOmTyL3/rc1nDdMjr33/ux9UPsoa8h3ylOd/xqGb4+yeSNeSV5n7Hwxr/n0fV52+a9x2PavyzHlWfv2k+cTysMe8/j2rMv+o+cTysuZ9H1d9vmk8cD2vu51H195vm/edhzf3+qPr6TfOJ42Et/fyoxv9N84njYc35/FFNfD+q8R9XH78f1cT3oxr/XHO/46G88xEO9OOFFL9LAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgC/0AQ7TJFHQwY6CAAAAAElFTkSuQmCC'

// Cached placeholder image (lazy initialized)
let cachedPlaceholder: Buffer | null = null

/**
 * Get or create cached placeholder image buffer
 * Using cache avoids repeated sharp processing for each failed image
 */
async function getPlaceholderImage(): Promise<Buffer> {
  if (cachedPlaceholder) {
    return cachedPlaceholder
  }

  try {
    // Create a gray placeholder
    cachedPlaceholder = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 }
      }
    })
    .jpeg({ quality: 80 })
    .toBuffer()

    return cachedPlaceholder
  } catch {
    // Fallback to static placeholder
    cachedPlaceholder = Buffer.from(PLACEHOLDER_IMAGE_BASE64, 'base64')
    return cachedPlaceholder
  }
}

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
 * Uses a single sharp pipeline for efficiency
 */
async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Create single sharp instance to avoid multiple decodes
    const image = sharp(buffer)
    const metadata = await image.metadata()

    // Skip compression for small images that are already optimized
    if (
      buffer.length < 100 * 1024 && // Less than 100KB
      (metadata.width || 0) <= MAX_IMAGE_DIMENSION &&
      (metadata.height || 0) <= MAX_IMAGE_DIMENSION
    ) {
      return buffer
    }

    // Resize and compress using the same sharp instance
    // Clone the pipeline since metadata() consumes the stream
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
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Load an image from URL or base64 with retry logic
 */
async function loadImageWithRetry(
  src: string,
  key: string,
  retries: number = MAX_RETRIES
): Promise<{ data: ImageData | null; error: ImageLoadError | null; retriesUsed: number }> {
  let lastError: ImageLoadError | null = null
  let actualAttempts = 0

  for (let attempt = 0; attempt <= retries; attempt++) {
    actualAttempts = attempt + 1 // Track actual attempts (1-based)

    if (attempt > 0) {
      // Exponential backoff
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1)
      console.log(`Retrying image ${key} (attempt ${attempt + 1}/${retries + 1}) after ${delay}ms`)
      await sleep(delay)
    }

    const result = await loadImageOnce(src, key)

    if (result.data) {
      return { data: result.data, error: null, retriesUsed: attempt }
    }

    lastError = result.error

    // Don't retry certain errors
    if (lastError?.error.includes('Invalid base64') ||
        lastError?.error.includes('Unknown image source') ||
        lastError?.error.includes('Relative URLs')) {
      break
    }
  }

  if (lastError) {
    lastError.retryCount = actualAttempts // Actual attempts, not max
  }

  return { data: null, error: lastError, retriesUsed: actualAttempts - 1 }
}

/**
 * Load an image from URL or base64 (single attempt)
 */
async function loadImageOnce(
  src: string,
  key: string
): Promise<{ data: ImageData | null; error: ImageLoadError | null }> {
  try {
    let buffer: Buffer

    if (src.startsWith('data:image')) {
      // Base64 data URI
      const base64Data = src.split(',')[1]
      buffer = Buffer.from(base64Data, 'base64')
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      // Security check: validate domain - BLOCK non-whitelisted URLs to prevent SSRF
      if (!isAllowedUrl(src)) {
        return {
          data: null,
          error: {
            key,
            src,
            error: `Domain not allowed: ${new URL(src).hostname}. Only whitelisted domains are permitted.`,
          },
        }
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
        console.warn(`Failed to fetch image from ${src}: ${response.status}`)
        return null
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else if (src.startsWith('/')) {
      return {
        data: null,
        error: { key, src, error: 'Relative URLs not supported in server context' },
      }
    } else {
      console.warn(`Unknown image source format: ${src.substring(0, 50)}...`)
      return null
    }

    // For now, return default dimensions
    // In a full implementation, we'd parse the image to get actual dimensions
    return {
      buffer,
      width: 400,
      height: 300,
    }
  } catch (error) {
    console.error(`Error loading image from ${src.substring(0, 50)}:`, error)
    return null
  }
}

/**
 * Process tasks with concurrency limit (preserves order)
 */
async function processWithConcurrencyLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length) // Pre-allocate with correct size
  const executing: Set<Promise<void>> = new Set()

  for (let i = 0; i < items.length; i++) {
    const index = i // Capture index for closure
    const item = items[i]

    const promise = processor(item)
      .then((result) => {
        results[index] = result // Store at correct index to preserve order
      })
      .finally(() => {
        executing.delete(promise) // Clean up when done
      })

    executing.add(promise)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Load all images from ReportData with retry, concurrency limit, and placeholders
 */
async function loadAllImages(
  data: ReportData,
  usePlaceholders: boolean = true,
  onProgress?: ProgressCallback
): Promise<ImageLoadResult> {
  const images: ImageMap = new Map()
  const errors: ImageLoadError[] = []
  let placeholdersUsed = 0

  // Collect all image load tasks
  const imageLoadTasks: Array<{ key: string; src: string }> = []

  const addTask = (key: string, src: string | undefined) => {
    if (src) {
      imageLoadTasks.push({ key, src })
    }
  }

  // Cover image
  addTask('coverImage', data.cover.coverImage?.src)

  // Company logo
  addTask('companyLogo', data.cover.companyLogo)

  // Footer logo
  addTask('footerLogo', data.cover.footerLogo)

  // Environment map
  addTask('environmentMap', data.section1.environmentMap?.src)

  // Parcel sketch
  addTask('parcelSketch', data.section1.parcel.parcelSketch?.src)

  // Parcel sketch without tazea
  addTask('parcelSketchNoTazea', data.section1.parcel.parcelSketchNoTazea?.src)

  // Property photos
  if (data.section1.property.photos) {
    data.section1.property.photos.forEach((photo, idx) => {
      addTask(`propertyPhoto${idx}`, photo.src)
    })
  }

  // Condo sketches
  if (data.section2.condoOrder?.sketches) {
    data.section2.condoOrder.sketches.forEach((sketch, idx) => {
      addTask(`condoSketch${idx}`, sketch.src)
    })
  }

  // Plan image
  addTask('planImage', data.section3.planImage?.src)

  // Apartment plan
  addTask('apartmentPlan', data.section3.apartmentPlan?.src)

  // Signature
  addTask('signature', data.cover.signatureImage)

  const totalTasks = imageLoadTasks.length
  let completedTasks = 0

  // Process with concurrency limit
  const processor = async (task: { key: string; src: string }) => {
    const result = await loadImageWithRetry(task.src, task.key)

    completedTasks++
    if (onProgress) {
      onProgress(completedTasks, totalTasks, task.key)
    }

    if (result.data) {
      images.set(task.key, result.data)
    } else if (result.error) {
      errors.push(result.error)

      // Use placeholder if enabled
      if (usePlaceholders) {
        try {
          const placeholder = await getPlaceholderImage()
          images.set(task.key, {
            buffer: placeholder,
            width: 200,
            height: 150,
            isPlaceholder: true,
          })
          placeholdersUsed++
        } catch (e) {
          console.error(`Failed to create placeholder for ${task.key}:`, e)
        }
      }
    }

    return { key: task.key, result }
  }

  await processWithConcurrencyLimit(imageLoadTasks, processor, MAX_CONCURRENT_LOADS)

  return {
    images,
    errors,
    totalAttempted: totalTasks,
    totalLoaded: images.size - placeholdersUsed,
    placeholdersUsed,
  }
}

/**
 * Create document metadata from report data
 */
function createDocumentMetadata(data: ReportData): DocumentMetadata {
  const now = new Date()
  const propertyAddress = data.address?.fullAddressLine ||
    `${data.address?.street || ''} ${data.address?.buildingNumber || ''}, ${data.address?.city || ''}`.trim()

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
 * Render ReportData to DOCX buffer with all improvements
 */
export async function renderDocxToBuffer(
  data: ReportData,
  options: {
    usePlaceholders?: boolean
    onProgress?: ProgressCallback
  } = {}
): Promise<{
  buffer: Buffer
  imageErrors: ImageLoadError[]
  stats: { attempted: number; loaded: number; placeholders: number }
}> {
  const { usePlaceholders = true, onProgress } = options

  // Load all images with retry and concurrency limit
  const { images, errors, totalAttempted, totalLoaded, placeholdersUsed } =
    await loadAllImages(data, usePlaceholders, onProgress)

  // Log summary
  console.log(`DOCX Export: Loaded ${totalLoaded}/${totalAttempted} images` +
    (placeholdersUsed > 0 ? ` (${placeholdersUsed} placeholders)` : ''))
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
    buffer,
    imageErrors: errors,
    stats: {
      attempted: totalAttempted,
      loaded: totalLoaded,
      placeholders: placeholdersUsed,
    },
  }
}

/**
 * Render ReportData to DOCX Blob (for browser use)
 */
export async function renderDocxToBlob(
  data: ReportData,
  options: {
    usePlaceholders?: boolean
    onProgress?: ProgressCallback
  } = {}
): Promise<{
  blob: Blob
  imageErrors: ImageLoadError[]
  stats: { attempted: number; loaded: number; placeholders: number }
}> {
  const { usePlaceholders = true, onProgress } = options

  // Load all images with retry and concurrency limit
  const { images, errors, totalAttempted, totalLoaded, placeholdersUsed } =
    await loadAllImages(data, usePlaceholders, onProgress)

  // Create document metadata
  const metadata = createDocumentMetadata(data)

  // Build the document with metadata
  const doc = buildDocxDocument(data, images, metadata)

  // Pack to blob
  const blob = await Packer.toBlob(doc)

  return {
    blob,
    imageErrors: errors,
    stats: {
      attempted: totalAttempted,
      loaded: totalLoaded,
      placeholders: placeholdersUsed,
    },
  }
}

// Legacy exports for backwards compatibility
export async function renderDocxToBufferSimple(data: ReportData): Promise<Buffer> {
  const result = await renderDocxToBuffer(data)
  return result.buffer
}

export async function renderDocxToBlobSimple(data: ReportData): Promise<Blob> {
  const result = await renderDocxToBlob(data)
  return result.blob
}
