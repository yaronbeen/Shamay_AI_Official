import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { sessionStore } from '../../../../../lib/session-store-global'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log(`🚀 Upload request for session: ${params.sessionId}`)
    console.log(`📊 Session store state:`, sessionStore.getAllSessions())
    
    const session = sessionStore.getSession(params.sessionId)
    if (!session) {
      console.error(`❌ Session not found in upload route: ${params.sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log(`✅ Session found in upload route:`, session)

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

      // Create uploads directory
      const uploadsDir = join(process.cwd(), 'uploads', params.sessionId)
      await mkdir(uploadsDir, { recursive: true })

      // Save file
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

      console.log(`✅ File saved to: ${filePath}`)

      // For now, skip AI processing and just return success
      const extractedData = {
        success: true,
        message: 'File uploaded successfully (AI processing temporarily disabled)',
        fileName: fileName,
        filePath: filePath
      }

      // Update session with file info
      const updatedDocuments = {
        ...session.documents,
        [type]: {
          name: file.name,
          originalName: file.name,
          fileName: fileName,
          path: filePath,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          extractedData: extractedData
        }
      }

      // Create upload entry for the uploads array
      const uploadEntry = {
        id: `${type}_${Date.now()}`,
        type: type,
        name: file.name,
        fileName: fileName,
        path: filePath,
        size: file.size,
        mimeType: file.type,
        status: 'completed',
        preview: `/api/files/${params.sessionId}/${fileName}`,
        url: `/api/files/${params.sessionId}/${fileName}`,
        uploadedAt: new Date().toISOString(),
        extractedData: extractedData
      }

      // Update session with both documents and uploads
      const existingUploads = session.uploads || []
      const updatedUploads = [...existingUploads, uploadEntry]
      
      sessionStore.updateSession(params.sessionId, { 
        documents: updatedDocuments,
        uploads: updatedUploads
      })

      console.log(`📊 Session updated with file data:`, updatedDocuments[type])

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        file: {
          name: file.name,
          fileName: fileName,
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

      // Update session with uploaded images
      const updatedDocuments = {
        ...session.documents,
        images: {
          count: uploadedImages.length,
          files: uploadedImages,
          uploadedAt: new Date().toISOString()
        }
      }

      // Create upload entries for the uploads array
      const uploadEntries = uploadedImages.map((image, index) => ({
        id: `image_${Date.now()}_${index}`,
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

      // Update session with both documents and uploads
      const existingUploads = session.uploads || []
      const updatedUploads = [...existingUploads, ...uploadEntries]
      
      sessionStore.updateSession(params.sessionId, { 
        documents: updatedDocuments,
        uploads: updatedUploads
      })

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
  console.log(`🔍 GET request for session: ${params.sessionId}`)
  const session = sessionStore.getSession(params.sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  return NextResponse.json(session)
}
