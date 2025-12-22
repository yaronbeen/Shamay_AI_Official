import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// CRITICAL: Import database client directly in Next.js API route
// This is MORE RELIABLE than spawning a script because:
// 1. Uses same module resolution as Next.js (guaranteed to work)
// 2. @neondatabase/serverless is in frontend/package.json (will be available)
// 3. No process spawning = no module resolution issues
let ClientClass: any = null

async function getClientClass() {
  if (ClientClass) return ClientClass
  
  // Import @neondatabase/serverless directly - this WILL work in Next.js
  try {
    const neon = require('@neondatabase/serverless')
    ClientClass = neon.Client
    console.log('✅ Using @neondatabase/serverless (direct import in API route)')
    return ClientClass
  } catch (e) {
    // Fallback to pg for local development
    try {
      const pg = require('pg')
      ClientClass = pg.Client
      console.log('✅ Using pg (local development fallback)')
      return ClientClass
    } catch (pgError) {
      console.error('❌ Failed to import both Neon and pg:', pgError)
      throw new Error('Cannot import database client. Need either @neondatabase/serverless or pg.')
    }
  }
}

async function createDatabaseClient(organizationId: string | null, userId: string | null) {
  const Client = await getClientClass()
  
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV === 'production'
  
  let client
  
  if (isVercel) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in Vercel environment')
    }
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  } else {
    if (process.env.DATABASE_URL) {
      client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      })
    } else {
      const isLocal = process.env.DB_HOST === 'localhost' || !process.env.DB_HOST || process.env.DB_HOST?.includes('127.0.0.1')
      client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'shamay_land_registry',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
        ssl: isLocal ? false : {
          rejectUnauthorized: false,
          require: true
        }
      })
    }
  }
  
  await client.connect()
  console.log('✅ Connected to PostgreSQL database (Comparable Data)')
  
  return client
}

async function queryComparableData(
  city: string | null,
  rooms: string | null,
  area: string | null,
  organizationId: string | null,
  userId: string | null
) {
  let client = null
  
  try {
    console.log('🔍 Querying comparable data DIRECTLY (no spawn)')
    console.log('📊 Query parameters:', { city, rooms, area })
    console.log('🔐 Data isolation:', { organizationId: organizationId || 'NULL', userId: userId || 'NULL' })
    
    client = await createDatabaseClient(organizationId, userId)
    
    // Build query based on parameters
    let query = `
      SELECT 
        id, 
        address, 
        rooms, 
        floor_number as floor, 
        apartment_area_sqm as area, 
        declared_price as price, 
        price_per_sqm_rounded as price_per_sqm, 
        sale_date,
        city, 
        construction_year as building_year,
        parking_spaces as parking,
        data_quality_score
      FROM comparable_data 
      WHERE 1=1
    `
    
    const queryParams: any[] = []
    let paramCount = 1
    
    // Add organization and user filters for data isolation
    if (organizationId) {
      query += ` AND (organization_id = $${paramCount} OR organization_id = 'default-org' OR organization_id IS NULL)`
      queryParams.push(organizationId)
      paramCount++
    } else {
      query += ` AND (organization_id = 'default-org' OR organization_id IS NULL)`
    }
    
    if (userId) {
      query += ` AND (
        user_id = $${paramCount} 
        OR user_id IS NULL 
        OR user_id = 'system'
        OR user_id::text LIKE '%"' || $${paramCount} || '"%'
        OR user_id::text LIKE '%' || $${paramCount} || '%'
      )`
      queryParams.push(userId)
      paramCount++
    } else {
      query += ` AND (
        user_id IS NULL 
        OR user_id = 'system'
        OR user_id::text LIKE '%"system"%'
      )`
    }
    
    // Add search filters
    if (city) {
      query += ` AND city ILIKE $${paramCount}`
      queryParams.push(`%${city}%`)
      paramCount++
    }
    
    if (rooms) {
      query += ` AND rooms = $${paramCount}`
      queryParams.push(parseInt(rooms))
      paramCount++
    }
    
    if (area) {
      const areaNum = parseInt(area)
      query += ` AND apartment_area_sqm BETWEEN $${paramCount} AND $${paramCount + 1}`
      queryParams.push(areaNum - 20, areaNum + 20)
      paramCount += 2
    }
    
    query += ` ORDER BY sale_date DESC LIMIT 20`
    
    console.log('📊 Executing query:', query)
    console.log('📊 Query params:', queryParams)
    
    const result = await client.query(query, queryParams)
    
    console.log('✅ Query successful:', result.rows.length, 'records found')
    
    // Close database connection
    if (typeof client.end === 'function') {
      await client.end()
      console.log('🔌 Disconnected from database')
    } else {
      console.log('✅ Neon connection managed automatically')
    }
    
    return {
      success: true,
      data: result.rows,
      count: result.rows.length,
      query: {
        city,
        rooms,
        area
      }
    }
    
  } catch (error: any) {
    console.error('❌ Query error:', error)
    
    if (client && typeof client.end === 'function') {
      try {
        await client.end()
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    throw error
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const rooms = searchParams.get('rooms')
    const area = searchParams.get('area')

    console.log('🔍 Frontend: Querying comparable data DIRECTLY (no spawn)')
    console.log('📊 Parameters:', { city, rooms, area })

    // Get organization and user IDs from session for data isolation
    const session = await getServerSession(authOptions)
    const organizationId = session?.user?.primaryOrganizationId || null
    const userId = session?.user?.id || null
    
    // Call database query directly - NO SPAWNING!
    const result = await queryComparableData(city, rooms, area, organizationId, userId)
    
    console.log('✅ Query result:', result.success ? `${result.data?.length || 0} records` : 'failed')
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to query comparable data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // POST is used for adding individual records
  // For CSV import, use /api/comparable-data/import route
  try {
    const session = await getServerSession(authOptions)
    const organizationId = session?.user?.primaryOrganizationId || null
    const userId = session?.user?.id || null
    
    const body = await request.json()
    console.log('➕ Frontend: Adding comparable data DIRECTLY (no spawn)')
    console.log('📊 Organization/User:', { organizationId, userId })

    const client = await createDatabaseClient(organizationId, userId)
    
    try {
      // Insert comparable data record
      const insertQuery = `
        INSERT INTO comparable_data (
          address, rooms, floor_number, apartment_area_sqm, 
          declared_price, price_per_sqm_rounded, sale_date, 
          city, street_name, organization_id, user_id, imported_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING id
      `
      
      const pricePerSqm = body.area ? Math.round(body.price / body.area) : null
      
      const result = await client.query(insertQuery, [
        body.address || '',
        body.rooms || null,
        body.floor || null,
        body.area || null,
        body.price || null,
        pricePerSqm,
        body.saleDate || null,
        body.city || '',
        body.neighborhood || '',
        organizationId || 'default-org',
        userId || 'system',
        userId || 'frontend-user'
      ])
      
      // Close connection
      if (typeof client.end === 'function') {
        await client.end()
      }
      
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Comparable data added successfully'
      })
      
    } catch (insertError: any) {
      // Close connection on error
      if (typeof client.end === 'function') {
        try {
          await client.end()
        } catch (e) {}
      }
      throw insertError
    }
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to add comparable data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
