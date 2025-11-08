import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const { db, ShumaDB } = require('../../../lib/shumadb.js')

export const dynamic = 'force-dynamic'

/**
 * GET /api/uploads
 * Returns all uploads organized by valuation name
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session for authentication
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || 'dev-user-id'
    
    console.log(`📋 Fetching all uploads for user: ${userId}`)
    
    // Query all valuations from shuma table
    const client = await db.client()
    
    try {
      // Get all valuations (you can filter by organizationId or userId if needed)
      const result = await client.query(`
        SELECT 
          session_id,
          full_address,
          client_name,
          shamay_name,
          reference_number,
          uploads,
          created_at,
          updated_at
        FROM shuma
        ORDER BY updated_at DESC
      `)
      
      // Organize uploads by valuation
      const valuationsWithUploads: Array<{
        sessionId: string
        valuationName: string
        address: string
        clientName: string
        shamayName: string
        referenceNumber: string
        uploads: any[]
        totalUploads: number
        totalSize: number
        createdAt: string
        updatedAt: string
      }> = []
      
      for (const row of result.rows) {
        const sessionId = row.session_id
        const uploads = row.uploads ? (typeof row.uploads === 'string' ? JSON.parse(row.uploads) : row.uploads) : []
        
        // Generate valuation name (prefer address, then client name, then session ID)
        const valuationName = row.full_address || 
                            row.client_name || 
                            `Session ${sessionId.substring(0, 8)}...` ||
                            sessionId
        
        // Calculate total size
        const totalSize = uploads.reduce((sum: number, upload: any) => {
          return sum + (upload.size || 0)
        }, 0)
        
        valuationsWithUploads.push({
          sessionId,
          valuationName,
          address: row.full_address || 'N/A',
          clientName: row.client_name || 'N/A',
          shamayName: row.shamay_name || 'N/A',
          referenceNumber: row.reference_number || 'N/A',
          uploads: uploads,
          totalUploads: uploads.length,
          totalSize,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : ''
        })
      }
      
      console.log(`✅ Found ${valuationsWithUploads.length} valuations with uploads`)
      
      // Calculate summary statistics
      const totalValuations = valuationsWithUploads.length
      const totalFiles = valuationsWithUploads.reduce((sum, v) => sum + v.totalUploads, 0)
      const totalSize = valuationsWithUploads.reduce((sum, v) => sum + v.totalSize, 0)
      
      return NextResponse.json({
        success: true,
        summary: {
          totalValuations,
          totalFiles,
          totalSize,
          totalSizeFormatted: formatBytes(totalSize)
        },
        valuations: valuationsWithUploads
      })
      
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching uploads:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch uploads',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

