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

    // Delete file from storage (Blob or local filesystem)
    try {
      await FileStorageService.deleteFile(screenshotUrl)
      console.log(`✅ Deleted screenshot file from storage: ${screenshotUrl}`)
    } catch (deleteError) {
      console.warn(`⚠️ Failed to delete file from storage (may already be deleted):`, deleteError)
      // Continue with DB deletion even if file deletion fails
    }

    // Delete from database (images table)
    try {
      // Determine image type based on cropMode
      const imageType = cropMode === '0' ? 'סקרין שוט GOVMAP' : 'סקרין שוט תצ״א'
      
      // Create database pool (handles both Neon and pg)
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false
      })
      
      // Delete from images table
      const deleteResult = await pool.query(`
        DELETE FROM images 
        WHERE session_id = $1 AND image_type = $2
      `, [params.sessionId, imageType])
      
      console.log(`✅ Deleted ${deleteResult.rowCount} image record(s) from database`)
      
      await pool.end()
    } catch (dbError: any) {
      console.error('❌ Error deleting from database:', dbError)
      // Don't fail if DB deletion fails - file is already deleted
    }

    // Remove from gisScreenshots in shuma table
    const updatedScreenshots = { ...gisScreenshots }
    delete updatedScreenshots[`cropMode${cropMode}`]

    // Update session data
    await ShumaDB.saveShumaFromSession(
      params.sessionId,
      'default-org',
      'system',
      {
        ...sessionData,
        gisScreenshots: updatedScreenshots
      }
    )

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

