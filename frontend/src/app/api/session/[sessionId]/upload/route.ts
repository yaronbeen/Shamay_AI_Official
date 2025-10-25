import { NextRequest, NextResponse } from 'next/server'
import { FileStorageService } from '../../../../../lib/file-storage'
import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
const { ShumaDB } = require('../../../../../lib/shumadb.js')

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log(`🚀 Upload request for session: ${params.sessionId}`)
    console.log(`📍 Environment: ${FileStorageService.isProduction() ? 'PRODUCTION (Vercel Blob)' : 'DEVELOPMENT (Local FS)'}`)
    
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    
    // If session doesn't exist in DB, create a minimal one
    let session: any = {}
    if (!loadResult.error) {
      session = loadResult.valuationData || {}
    } else {
      // Create a minimal session if it doesn't exist
      console.log(`📝 Creating new session for upload: ${params.sessionId}`)
      session = {
        sessionId: params.sessionId,
        uploads: []
      }
    }
    
    console.log(`✅ Session loaded from database for upload`)

    const formData = await request.formData()
    const type = formData.get('type') as string

    console.log(`📁 Processing ${type} upload`)

    // Handle single file uploads (documents)
    if (type !== 'images') {
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      console.log(`📁 Processing ${type} file: ${file.name} (${file.size} bytes)`)

      // Upload file using unified storage service
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploadResult = await FileStorageService.uploadFile(
        buffer,
        params.sessionId,
        file.name,
        file.type
      )

      console.log(`✅ File uploaded:`, uploadResult)

      // For now, skip AI processing and just return success
      const extractedData = {
        success: true,
        message: 'File uploaded successfully (AI processing temporarily disabled)',
        fileName: file.name,
        filePath: uploadResult.path
      }

      // Create upload entry for the uploads array
      const uploadEntry = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        name: file.name,
        fileName: file.name,
        path: uploadResult.path,
        size: uploadResult.size,
        mimeType: file.type,
        status: 'completed',
        preview: uploadResult.url,
        url: uploadResult.url,
        uploadedAt: new Date().toISOString(),
        extractedData: extractedData
      }
      
      console.log(`📁 Created upload entry:`, JSON.stringify(uploadEntry, null, 2))

      // Update uploads array in session
      const existingUploads = session.uploads || []
      const updatedUploads = [...existingUploads, uploadEntry]
      
      // Save to database
      const updatedSession = {
        ...session,
        uploads: updatedUploads
      }
      
      console.log(`📊 Saving session to database:`, JSON.stringify(updatedSession, null, 2))
      
      await ShumaDB.saveShumaFromSession(
        params.sessionId,
        'default-org',
        'system',
        updatedSession
      )

      console.log(`📊 Session updated with file data in database`)

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        uploadEntry: uploadEntry, // Return the complete upload entry
        file: {
          name: file.name,
          fileName: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        },
        extractedData: extractedData
      })
    }

    // Handle multiple image uploads
    if (type === 'images') {
      const files = formData.getAll('files') as File[]
      
      if (!files || files.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 })
      }

      // Limit to 10 images
      if (files.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 images allowed' }, { status: 400 })
      }

      console.log(`🖼️ Processing ${files.length} images`)

      // Create uploads directory
      const uploadsDir = join(process.cwd(), 'uploads', params.sessionId, 'images')
      await mkdir(uploadsDir, { recursive: true })

      const uploadedImages = []

      // Process each image
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate image file
        if (!file.type.startsWith('image/')) {
          console.warn(`⚠️ Skipping non-image file: ${file.name}`)
          continue
        }

        // Check file size (max 10MB per image)
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`⚠️ Skipping large file: ${file.name} (${file.size} bytes)`)
          continue
        }

        try {
          const buffer = Buffer.from(await file.arrayBuffer())
          let fileName = file.name // Keep original filename
          let filePath = join(uploadsDir, fileName)
          
          // Handle filename conflicts by adding a counter
          let counter = 1
          while (existsSync(filePath)) {
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
            const ext = file.name.substring(file.name.lastIndexOf('.'))
            fileName = `${nameWithoutExt}_${counter}${ext}`
            filePath = join(uploadsDir, fileName)
            counter++
          }
          
          await writeFile(filePath, buffer)

          uploadedImages.push({
            name: file.name,
            fileName: fileName,
            path: filePath,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          })

          console.log(`✅ Image ${i + 1} saved: ${fileName}`)
        } catch (error) {
          console.error(`❌ Error saving image ${i + 1}:`, error)
        }
      }

      // Create upload entries for the uploads array
      const uploadEntries = uploadedImages.map((image, index) => ({
        id: `image_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'interior_image',
        name: image.name,
        fileName: image.fileName,
        path: image.path,
        size: image.size,
        mimeType: image.type,
        status: 'completed',
        url: `/api/files/${params.sessionId}/images/${image.fileName}`,
        uploadedAt: image.uploadedAt,
        extractedData: {}
      }))

      // Update uploads array in session
      const existingUploads = session.uploads || []
      const updatedUploads = [...existingUploads, ...uploadEntries]
      
      // Also update interiorImages for compatibility
      const existingInteriorImages = session.interiorImages || []
      const newInteriorImages = uploadedImages.map(img => ({
        url: `/api/files/${params.sessionId}/images/${img.fileName}`,
        name: img.name,
        size: img.size,
        type: img.type
      }))
      
      // Save to database
      const updatedSession = {
        ...session,
        uploads: updatedUploads,
        interiorImages: [...existingInteriorImages, ...newInteriorImages]
      }
      
      await ShumaDB.saveShumaFromSession(
        params.sessionId,
        'default-org',
        'system',
        updatedSession
      )

      console.log(`📊 Session updated with ${uploadedImages.length} images`)

      return NextResponse.json({
        success: true,
        message: `${uploadedImages.length} images uploaded successfully`,
        images: uploadedImages,
        count: uploadedImages.length
      })
    }

    return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 })

  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve session data
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log(`🔍 GET request for session uploads: ${params.sessionId}`)
  
  // Load session from database
  const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
  
  if (loadResult.error) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  // Return uploads data
  return NextResponse.json({
    uploads: loadResult.valuationData.uploads || [],
    interiorImages: loadResult.valuationData.interiorImages || []
  })
}
