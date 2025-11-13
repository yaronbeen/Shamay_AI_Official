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
    
    // Prepare updated session
    const updatedSession = {
      ...session,
      uploads: updatedUploads,
      interiorImages: updatedInteriorImages
    }
    
    // Execute all deletions in parallel to ensure synchronization
    const deletionPromises = []
    
    // 1. Save updated session to database (remove references)
    deletionPromises.push(
      ShumaDB.saveShumaFromSession(
        sessionId,
        'default-org',
        'system',
        updatedSession
      ).catch((error: any) => {
        console.error('❌ Failed to update session in database:', error)
        throw new Error('Failed to update session database')
      })
    )
    
    // 2. Delete physical file from blob storage
    const target = uploadToDelete.url || uploadToDelete.path
    if (target) {
      deletionPromises.push(
        FileStorageService.deleteFile(target).catch((error: any) => {
          console.warn(`⚠️ Failed to delete physical file from storage:`, error)
          // Don't throw - file might already be deleted
        })
      )
    }
    
    // 3. Delete from images table if it has a database ID
    if (uploadToDelete.imageId || uploadToDelete.id) {
      const Pool = require('pg').Pool
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      
      deletionPromises.push(
        pool.query(
          'DELETE FROM images WHERE id = $1 OR file_path = $2',
          [uploadToDelete.imageId || uploadToDelete.id, target]
        ).then(() => {
          console.log(`✅ Deleted image record from database`)
        }).catch((error: any) => {
          console.warn(`⚠️ Failed to delete from images table:`, error)
          // Don't throw - record might not exist
        }).finally(() => {
          pool.end()
        })
      )
    }
    
    // Wait for all deletions to complete in parallel
    await Promise.all(deletionPromises)
    
    console.log(`✅ Upload ${uploadId} fully deleted (DB, Blob, and Images table synced)`)
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
