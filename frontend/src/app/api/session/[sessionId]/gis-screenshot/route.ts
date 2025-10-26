import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb'
import { FileStorageService } from '../../../../../lib/file-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    console.log(`📸 GIS Screenshot API called for session: ${sessionId}`)
    
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId)
    
    if (!loadResult.success || !loadResult.valuationData) {
      console.error(`❌ Session not found: ${sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    const sessionData = loadResult.valuationData

    // Check if this is a file upload (FormData) or JSON request
    const contentType = request.headers.get('content-type') || ''
    
    let cropMode, govmapUrl, annotations, coordinates, file
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload (cropped image)
      const formData = await request.formData()
      file = formData.get('file') as File
      cropMode = formData.get('cropMode') as string
      annotations = formData.get('annotations') as string
      
      console.log(`📸 Received file upload - cropMode: ${cropMode}, file size: ${file?.size}`)
      
      if (!cropMode || !file) {
        console.error(`❌ Missing data - cropMode: ${cropMode}, file: ${file ? 'present' : 'missing'}`)
        return NextResponse.json({ error: 'Missing cropMode or file data' }, { status: 400 })
      }
    } else {
      // Handle JSON request (server-side screenshot)
      const jsonData = await request.json()
      cropMode = jsonData.cropMode
      govmapUrl = jsonData.govmapUrl
      annotations = jsonData.annotations
      coordinates = jsonData.coordinates
      
      console.log(`📸 Received JSON - cropMode: ${cropMode}, govmapUrl: ${govmapUrl}`)
      
      if (!cropMode || !govmapUrl) {
        console.error(`❌ Missing data - cropMode: ${cropMode}, govmapUrl: ${govmapUrl ? 'present' : 'missing'}`)
        return NextResponse.json({ error: 'Missing cropMode or govmapUrl data' }, { status: 400 })
      }
    }

    // Create uploads directory for this session (only in local dev)
    let filePath: string
    let fileUrl: string
    
    // Generate filename with timestamp
    const timestamp = Date.now()
    const filename = `govmap_crop_${cropMode}_${timestamp}.png`
    
    if (file) {
      // Handle file upload (cropped image)
      console.log(`📸 Uploading file to storage: ${filename}`)
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Upload to storage (Blob in production, local in dev)
      const uploadResult = await FileStorageService.uploadFile(
        buffer,
        sessionId,
        filename,
        'image/png'
      )
      
      filePath = uploadResult.path
      fileUrl = uploadResult.url
      
      console.log(`✅ File uploaded successfully:`, uploadResult)
      
      return NextResponse.json({
        success: true,
        filePath: filePath,
        fileUrl: fileUrl,
        message: 'Cropped image saved successfully'
      })
    } else {
      // Server-side screenshot - delegate to Express backend
      console.log(`📸 Requesting screenshot from backend...`)
      
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
        
        // Call backend screenshot API
        const response = await fetch(`${backendUrl}/api/gis-screenshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            govmapUrl,
            cropMode
          })
        })
        
        const result = await response.json()
        
        if (!response.ok || !result.success) {
          console.error('❌ Backend screenshot failed:', result)
          
          return NextResponse.json({
            success: false,
            error: result.error || 'Screenshot failed',
            message: result.message || 'צילום אוטומטי נכשל. נא להשתמש בהעלאה ידנית של צילום מסך.',
            hint: result.hint || 'השתמש בכפתורים הכחולים להעלאת צילום מסך'
          }, { status: response.status })
        }
        
        // Convert base64 screenshot to buffer
        const screenshotBuffer = Buffer.from(result.screenshot, 'base64')
        
        console.log(`✅ Screenshot received from backend - ${screenshotBuffer.length} bytes`)
        
        // Upload to storage
        console.log(`☁️ Uploading to storage...`)
        const uploadResult = await FileStorageService.uploadFile(
          screenshotBuffer,
          sessionId,
          filename,
          'image/png'
        )
        
        filePath = uploadResult.path
        fileUrl = uploadResult.url
        
        console.log(`✅ Screenshot uploaded successfully:`, uploadResult)
        
        return NextResponse.json({
          success: true,
          screenshotUrl: fileUrl,
          cropMode,
          filePath
        })
        
      } catch (backendError) {
        console.error('❌ Error calling backend screenshot:', backendError)
        
        return NextResponse.json({
          success: false,
          error: 'Failed to capture screenshot',
          message: 'צילום אוטומטי נכשל. נא להשתמש בהעלאה ידנית של צילום מסך.',
          hint: 'השתמש בכפתורים הכחולים להעלאת צילום מסך',
          details: backendError instanceof Error ? backendError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('❌ Error saving GIS screenshot:', error)
    return NextResponse.json({ 
      error: 'Failed to save screenshot', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
