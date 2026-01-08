import { NextRequest, NextResponse } from 'next/server'

// Database connection
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

// Ensure table exists with gisScreenshots column
async function ensureTable() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'govmap_address_maps'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      // Create new table with TEXT id
      await pool.query(`
        CREATE TABLE govmap_address_maps (
          id TEXT PRIMARY KEY,
          address_input TEXT NOT NULL,
          address_normalized TEXT,
          latitude DECIMAL(10, 6),
          longitude DECIMAL(10, 6),
          itm_easting DECIMAL(10, 2),
          itm_northing DECIMAL(10, 2),
          confidence DECIMAL(5, 4),
          address_details JSONB,
          govmap_url TEXT,
          govmap_url_with_tazea TEXT,
          govmap_url_without_tazea TEXT,
          govmap_iframe_html TEXT,
          annotations JSONB DEFAULT '[]'::jsonb,
          annotation_canvas_data TEXT,
          gis_screenshots JSONB,
          notes TEXT,
          zoom_level INTEGER DEFAULT 15,
          show_tazea BOOLEAN DEFAULT false,
          tags TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT,
          updated_by TEXT,
          status TEXT DEFAULT 'active'
        )
      `)
    } else {
      // Table exists, check if id column is UUID and migrate if needed
      const columnCheck = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'govmap_address_maps' 
        AND column_name = 'id'
      `)

      if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'uuid') {
        // Need to migrate from UUID to TEXT
        console.log('⚠️ Migrating govmap_address_maps.id from UUID to TEXT...')
        await pool.query(`
          ALTER TABLE govmap_address_maps 
          ALTER COLUMN id TYPE TEXT USING id::text
        `)
        console.log('✅ Migration complete')
      }

      // Check and migrate itm_easting and itm_northing from INTEGER to DECIMAL if needed
      const itmEastingCheck = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'govmap_address_maps' 
        AND column_name = 'itm_easting'
      `)
      
      if (itmEastingCheck.rows.length > 0 && itmEastingCheck.rows[0].data_type === 'integer') {
        console.log('⚠️ Migrating itm_easting and itm_northing from INTEGER to DECIMAL...')
        await pool.query(`
          ALTER TABLE govmap_address_maps 
          ALTER COLUMN itm_easting TYPE DECIMAL(10, 2) USING itm_easting::decimal
        `)
        await pool.query(`
          ALTER TABLE govmap_address_maps 
          ALTER COLUMN itm_northing TYPE DECIMAL(10, 2) USING itm_northing::decimal
        `)
        console.log('✅ ITM coordinates migration complete')
      }

      // Add gis_screenshots column if it doesn't exist
      await pool.query(`
        ALTER TABLE govmap_address_maps 
        ADD COLUMN IF NOT EXISTS gis_screenshots JSONB
      `)
    }
  } catch (error) {
    console.error('Error ensuring table:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable()

    const addressMapData = await request.json()

    const {
      id,
      address_input,
      address_normalized,
      latitude,
      longitude,
      itm_easting,
      itm_northing,
      confidence,
      address_details,
      govmap_url,
      govmap_url_with_tazea,
      govmap_url_without_tazea,
      govmap_iframe_html,
      annotations,
      annotation_canvas_data,
      gisScreenshots,
      notes,
      zoom_level = 15,
      show_tazea = false
    } = addressMapData

    // Use provided ID or generate new ID based on timestamp
    const mapId = id || `map-${Date.now()}`

    // If updating existing map, merge gisScreenshots with existing ones
    let finalGisScreenshots = gisScreenshots
    if (id && gisScreenshots) {
      try {
        const existing = await pool.query(
          'SELECT gis_screenshots FROM govmap_address_maps WHERE id = $1',
          [id]
        )
        if (existing.rows.length > 0 && existing.rows[0].gis_screenshots) {
          // Merge existing screenshots with new ones
          const existingScreenshots = existing.rows[0].gis_screenshots
          finalGisScreenshots = { ...existingScreenshots, ...gisScreenshots }
        }
      } catch (error) {
        console.warn('Could not fetch existing screenshots, using new ones only:', error)
      }
    }

    const result = await pool.query(`
      INSERT INTO govmap_address_maps (
        id, address_input, address_normalized, latitude, longitude,
        itm_easting, itm_northing, confidence, address_details,
        govmap_url, govmap_url_with_tazea, govmap_url_without_tazea,
        govmap_iframe_html, annotations, annotation_canvas_data,
        gis_screenshots, notes, zoom_level, show_tazea, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        address_input = COALESCE(EXCLUDED.address_input, govmap_address_maps.address_input),
        address_normalized = COALESCE(EXCLUDED.address_normalized, govmap_address_maps.address_normalized),
        latitude = COALESCE(EXCLUDED.latitude, govmap_address_maps.latitude),
        longitude = COALESCE(EXCLUDED.longitude, govmap_address_maps.longitude),
        itm_easting = COALESCE(EXCLUDED.itm_easting, govmap_address_maps.itm_easting),
        itm_northing = COALESCE(EXCLUDED.itm_northing, govmap_address_maps.itm_northing),
        confidence = COALESCE(EXCLUDED.confidence, govmap_address_maps.confidence),
        address_details = COALESCE(EXCLUDED.address_details, govmap_address_maps.address_details),
        govmap_url = COALESCE(EXCLUDED.govmap_url, govmap_address_maps.govmap_url),
        govmap_url_with_tazea = COALESCE(EXCLUDED.govmap_url_with_tazea, govmap_address_maps.govmap_url_with_tazea),
        govmap_url_without_tazea = COALESCE(EXCLUDED.govmap_url_without_tazea, govmap_address_maps.govmap_url_without_tazea),
        govmap_iframe_html = COALESCE(EXCLUDED.govmap_iframe_html, govmap_address_maps.govmap_iframe_html),
        annotations = COALESCE(EXCLUDED.annotations, govmap_address_maps.annotations),
        annotation_canvas_data = COALESCE(EXCLUDED.annotation_canvas_data, govmap_address_maps.annotation_canvas_data),
        gis_screenshots = CASE 
          WHEN EXCLUDED.gis_screenshots IS NOT NULL THEN EXCLUDED.gis_screenshots
          ELSE govmap_address_maps.gis_screenshots
        END,
        notes = COALESCE(EXCLUDED.notes, govmap_address_maps.notes),
        zoom_level = COALESCE(EXCLUDED.zoom_level, govmap_address_maps.zoom_level),
        show_tazea = COALESCE(EXCLUDED.show_tazea, govmap_address_maps.show_tazea),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      mapId,
      address_input,
      address_normalized,
      latitude,
      longitude,
      itm_easting,
      itm_northing,
      confidence,
      address_details ? JSON.stringify(address_details) : null,
      govmap_url,
      govmap_url_with_tazea,
      govmap_url_without_tazea,
      govmap_iframe_html,
      annotations ? JSON.stringify(annotations) : JSON.stringify([]),
      annotation_canvas_data,
      finalGisScreenshots ? JSON.stringify(finalGisScreenshots) : null,
      notes,
      zoom_level,
      show_tazea
    ])

    const savedId = result.rows[0].id

    console.log('✅ Map saved to database:', savedId)

    return NextResponse.json({
      success: true,
      id: savedId,
      message: 'Map saved successfully'
    })

  } catch (error) {
    console.error('❌ Error saving map:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await pool.query(`
      SELECT * FROM govmap_address_maps
      WHERE status = 'active' OR status IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit])

    const maps = result.rows.map((row: any) => ({
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
    }))

    console.log(`📋 Returning ${maps.length} saved maps from database`)

    return NextResponse.json(maps)

  } catch (error) {
    console.error('❌ Error loading maps:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load maps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
