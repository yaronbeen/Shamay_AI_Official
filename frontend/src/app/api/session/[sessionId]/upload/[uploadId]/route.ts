import { NextRequest, NextResponse } from 'next/server'
import { FileStorageService } from '@/lib/file-storage'
const { ShumaDB } = require('@/lib/shumadb.js')

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string; uploadId: string } }
) {
  try {
    const { sessionId, uploadId } = params
    
    console.log(`🗑️ Deleting upload ${uploadId} from session ${sessionId}`)
    
    // Load session from database
    const loadResult = await ShumaDB.loadShumaForWizard(sessionId)
    if (loadResult.error) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    const session = loadResult.valuationData
    
    // Find the upload to delete
    const uploads = session.uploads || []
    const uploadIndex = uploads.findIndex((upload: any) => upload.id === uploadId)
    
    if (uploadIndex === -1) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }
    
    const uploadToDelete = uploads[uploadIndex]
    console.log(`📁 Found upload to delete:`, uploadToDelete)
    
    // Remove the upload from the array
    const updatedUploads = uploads.filter((_: any, index: number) => index !== uploadIndex)
    
    // Also update interiorImages if it's an image
    let updatedInteriorImages = session.interiorImages || []
    if (uploadToDelete.type === 'interior_image' || uploadToDelete.type === 'building_image') {
      updatedInteriorImages = updatedInteriorImages.filter((img: any) => 
        !img.url?.includes(uploadToDelete.fileName)
      )
    }
    
    // Save updated session to database
    const updatedSession = {
      ...session,
      uploads: updatedUploads,
      interiorImages: updatedInteriorImages
    }
    
    await ShumaDB.saveShumaFromSession(
      sessionId,
      'default-org',
      'system',
      updatedSession
    )
    
    // Delete the physical file from filesystem after session update
    // Use setTimeout to delay physical deletion to avoid race conditions
    setTimeout(async () => {
      try {
        const target = uploadToDelete.url || uploadToDelete.path
        if (target) {
          await FileStorageService.deleteFile(target)
        }
      } catch (error) {
        console.warn(`⚠️ Could not delete physical file:`, error)
      }
    }, 1000) // 1 second delay
    
    console.log(`✅ Upload ${uploadId} deleted from session`)
    console.log(`📊 Remaining uploads: ${updatedUploads.length}`)
    
    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully',
      remainingUploads: updatedUploads.length
    })
    
  } catch (error) {
    console.error('❌ Error deleting upload:', error)
    return NextResponse.json({
      error: 'Failed to delete upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
