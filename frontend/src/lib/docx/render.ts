import { Packer } from 'docx'
import { ReportData } from '../pdf/types'
import { buildDocxDocument, ImageMap, ImageData } from './template'

/**
 * Load an image from URL or base64 and return as Buffer with dimensions
 */
async function loadImage(src: string): Promise<ImageData | null> {
  try {
    let buffer: Buffer

    if (src.startsWith('data:image')) {
      // Base64 data URI
      const base64Data = src.split(',')[1]
      buffer = Buffer.from(base64Data, 'base64')
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      // External URL
      const response = await fetch(src)
      if (!response.ok) {
        console.warn(`Failed to fetch image from ${src}: ${response.status}`)
        return null
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else if (src.startsWith('/')) {
      // Relative URL - try to fetch from origin
      // In server context, we can't easily resolve relative URLs
      // Return null and let the caller handle it
      console.warn(`Relative URL not supported in server context: ${src}`)
      return null
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
 * Load all images from ReportData and return as a map
 */
async function loadAllImages(data: ReportData): Promise<ImageMap> {
  const images: ImageMap = new Map()
  const loadPromises: Promise<void>[] = []

  // Cover image
  if (data.cover.coverImage?.src) {
    loadPromises.push(
      loadImage(data.cover.coverImage.src).then((img) => {
        if (img) images.set('coverImage', img)
      })
    )
  }

  // Company logo
  if (data.cover.companyLogo) {
    loadPromises.push(
      loadImage(data.cover.companyLogo).then((img) => {
        if (img) images.set('companyLogo', img)
      })
    )
  }

  // Footer logo
  if (data.cover.footerLogo) {
    loadPromises.push(
      loadImage(data.cover.footerLogo).then((img) => {
        if (img) images.set('footerLogo', img)
      })
    )
  }

  // Environment map
  if (data.section1.environmentMap?.src) {
    loadPromises.push(
      loadImage(data.section1.environmentMap.src).then((img) => {
        if (img) images.set('environmentMap', img)
      })
    )
  }

  // Parcel sketch
  if (data.section1.parcel.parcelSketch?.src) {
    loadPromises.push(
      loadImage(data.section1.parcel.parcelSketch.src).then((img) => {
        if (img) images.set('parcelSketch', img)
      })
    )
  }

  // Parcel sketch without tazea
  if (data.section1.parcel.parcelSketchNoTazea?.src) {
    loadPromises.push(
      loadImage(data.section1.parcel.parcelSketchNoTazea.src).then((img) => {
        if (img) images.set('parcelSketchNoTazea', img)
      })
    )
  }

  // Property photos
  if (data.section1.property.photos) {
    data.section1.property.photos.forEach((photo, idx) => {
      if (photo.src) {
        loadPromises.push(
          loadImage(photo.src).then((img) => {
            if (img) images.set(`propertyPhoto${idx}`, img)
          })
        )
      }
    })
  }

  // Condo sketches
  if (data.section2.condoOrder?.sketches) {
    data.section2.condoOrder.sketches.forEach((sketch, idx) => {
      if (sketch.src) {
        loadPromises.push(
          loadImage(sketch.src).then((img) => {
            if (img) images.set(`condoSketch${idx}`, img)
          })
        )
      }
    })
  }

  // Plan image
  if (data.section3.planImage?.src) {
    loadPromises.push(
      loadImage(data.section3.planImage.src).then((img) => {
        if (img) images.set('planImage', img)
      })
    )
  }

  // Apartment plan
  if (data.section3.apartmentPlan?.src) {
    loadPromises.push(
      loadImage(data.section3.apartmentPlan.src).then((img) => {
        if (img) images.set('apartmentPlan', img)
      })
    )
  }

  // Signature
  if (data.cover.signatureImage) {
    loadPromises.push(
      loadImage(data.cover.signatureImage).then((img) => {
        if (img) images.set('signature', img)
      })
    )
  }

  await Promise.all(loadPromises)
  return images
}

/**
 * Render ReportData to DOCX buffer
 */
export async function renderDocxToBuffer(data: ReportData): Promise<Buffer> {
  // Load all images
  const images = await loadAllImages(data)

  // Build the document
  const doc = buildDocxDocument(data, images)

  // Pack to buffer
  const buffer = await Packer.toBuffer(doc)

  return Buffer.from(buffer)
}

/**
 * Render ReportData to DOCX Blob (for browser use)
 */
export async function renderDocxToBlob(data: ReportData): Promise<Blob> {
  // Load all images
  const images = await loadAllImages(data)

  // Build the document
  const doc = buildDocxDocument(data, images)

  // Pack to blob
  const blob = await Packer.toBlob(doc)

  return blob
}
