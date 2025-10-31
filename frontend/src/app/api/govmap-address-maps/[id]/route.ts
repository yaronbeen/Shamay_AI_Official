import { NextRequest, NextResponse } from 'next/server'

// Database connection (same as main route)
let Pool: any
try {
  const neonModule = require('@neondatabase/serverless')
  Pool = neonModule.Pool
} catch (e) {
  const pg = require('pg')
  Pool = pg.Pool
}

function getDbConfig() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING
  if (connectionString) {
    return { connectionString, ssl: { rejectUnauthorized: false } }
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shamay_land_registry',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  }
}

const pool = new Pool(getDbConfig())

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const result = await pool.query(`
      SELECT * FROM govmap_address_maps
      WHERE id = $1 AND (status = 'active' OR status IS NULL)
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Map not found'
      }, { status: 404 })
    }

    const row = result.rows[0]

    const map = {
      id: row.id,
      address_input: row.address_input,
      address_normalized: row.address_normalized,
      latitude: row.latitude,
      longitude: row.longitude,
      itm_easting: row.itm_easting,
      itm_northing: row.itm_northing,
      confidence: row.confidence,
      address_details: row.address_details,
      govmap_url: row.govmap_url,
      govmap_url_with_tazea: row.govmap_url_with_tazea,
      govmap_url_without_tazea: row.govmap_url_without_tazea,
      govmap_iframe_html: row.govmap_iframe_html,
      annotations: row.annotations || [],
      annotation_canvas_data: row.annotation_canvas_data,
      gisScreenshots: row.gis_screenshots,
      notes: row.notes,
      zoom_level: row.zoom_level,
      show_tazea: row.show_tazea,
      created_at: row.created_at,
      annotation_count: Array.isArray(row.annotations) ? row.annotations.length : 0
    }

    console.log(`📋 Loading map from database: ${id}`)

    return NextResponse.json(map)

  } catch (error) {
    console.error('❌ Error loading map:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
