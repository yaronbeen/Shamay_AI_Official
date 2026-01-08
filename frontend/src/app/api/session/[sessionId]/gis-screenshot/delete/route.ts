import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../../lib/shumadb'
import { FileStorageService } from '../../../../../../lib/file-storage'
import { Pool } from 'pg'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const cropMode = searchParams.get('cropMode') as '0' | '1' | null

    if (!cropMode || !['0', '1'].includes(cropMode)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid cropMode. Must be "0" or "1"' 
      }, { status: 400 })
    }

    console.log(`🗑️ Deleting GIS screenshot: session=${params.sessionId}, cropMode=${cropMode}`)

    // Load session data to get screenshot URLs
    const loadResult = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!loadResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }

    const sessionData = loadResult.valuationData || {}
    const gisScreenshots = sessionData.gisScreenshots || {}
    const screenshotUrl = gisScreenshots[`cropMode${cropMode}`]

    if (!screenshotUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Screenshot not found' 
      }, { status: 404 })
    }

    // Prepare updated session data
    const updatedScreenshots = { ...gisScreenshots }
    delete updatedScreenshots[`cropMode${cropMode}`]
    const updatedSessionData = {
      ...sessionData,
      gisScreenshots: updatedScreenshots
    }

    // Execute all deletions in parallel to ensure synchronization
    const deletionPromises = []

    // 1. Delete file from storage (Blob or local filesystem)
    deletionPromises.push(
      FileStorageService.deleteFile(screenshotUrl)
        .then(() => console.log(`✅ Deleted screenshot file from storage: ${screenshotUrl}`))
        .catch((deleteError) => {
          console.warn(`⚠️ Failed to delete file from storage (may already be deleted):`, deleteError)
          // Don't throw - file might already be deleted
        })
    )

    // 2. Delete from database (images table)
    const imageType = cropMode === '0' ? 'סקרין שוט GOVMAP' : 'סקרין שוט תצ״א'
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false
    })
    
    deletionPromises.push(
      pool.query(`
        DELETE FROM images 
        WHERE session_id = $1 AND image_type = $2
      `, [params.sessionId, imageType])
        .then((deleteResult) => {
          console.log(`✅ Deleted ${deleteResult.rowCount} image record(s) from database`)
        })
        .catch((dbError: any) => {
          console.error('❌ Error deleting from database:', dbError)
          // Don't throw - continue even if DB deletion fails
        })
        .finally(() => {
          pool.end()
        })
    )

    // 3. Update session data (remove from gisScreenshots)
    deletionPromises.push(
      ShumaDB.saveShumaFromSession(
        params.sessionId,
        'default-org',
        'system',
        updatedSessionData
      ).catch((error: any) => {
        console.error('❌ Failed to update session data:', error)
        throw new Error('Failed to update session database')
      })
    )

    // Wait for all deletions to complete in parallel
    await Promise.all(deletionPromises)

    console.log('✅ GIS screenshot deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Screenshot deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting GIS screenshot:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete screenshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

