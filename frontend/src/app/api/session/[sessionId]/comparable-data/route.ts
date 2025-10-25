import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const rooms = searchParams.get('rooms')
    const area = searchParams.get('area')

    console.log('🔍 Frontend: Using EXISTING backend for comparable data query')
    console.log('📊 Parameters:', { city, rooms, area })

    // ✅ USE EXISTING BACKEND: Call the existing query-comparable-data.js
    // Frontend runs from frontend/ directory, so we need to go up one level
    const projectRoot = join(process.cwd(), '..')
    const backendScript = join(projectRoot, 'backend', 'comparable-data-management', 'query-comparable-data.js')
    console.log('🔍 Project root:', projectRoot)
    console.log('🔍 Backend script path:', backendScript)
    
    const result = await new Promise((resolve, reject) => {
      const child = spawn('node', [backendScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: projectRoot, // Ensure we're in the project root
        env: {
          ...process.env,
          QUERY_CITY: city || '',
          QUERY_NEIGHBORHOOD: '', // Not used in current backend
          QUERY_ROOMS: rooms || '',
          QUERY_AREA: area || ''
        }
      })

      let output = ''
      let errorOutput = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      child.on('close', (code) => {
        console.log('🔍 Backend script exit code:', code)
        console.log('🔍 Backend stdout:', output)
        console.log('🔍 Backend stderr:', errorOutput)
        
        if (code === 0) {
          try {
            // Extract JSON from output (backend might output other messages too)
            // Look for the last JSON object in the output
            const lines = output.split('\n');
            let jsonLine = '';
            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].trim().startsWith('{') && lines[i].trim().endsWith('}')) {
                jsonLine = lines[i].trim();
                break;
              }
            }
            
            if (jsonLine) {
              const result = JSON.parse(jsonLine)
              resolve(result)
            } else {
              console.error('❌ No JSON found in output:', output)
              reject(new Error('No JSON response from backend'))
            }
          } catch (parseError) {
            console.error('❌ Failed to parse backend output:', parseError)
            console.error('❌ Raw output:', output)
            reject(new Error('Failed to parse backend response'))
          }
        } else {
          console.error('❌ Backend script failed with code:', code)
          console.error('❌ Error output:', errorOutput)
          reject(new Error('Backend script failed'))
        }
      })
    })

    console.log('✅ Existing backend result:', (result as any).success ? `${(result as any).data?.length || 0} records` : 'failed')
    
    return NextResponse.json(result as any)
    
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
  try {
    const body = await request.json()
    console.log('➕ Frontend: Adding comparable data via EXISTING backend')

    // ✅ USE EXISTING BACKEND: Use the existing database client directly
    const backendScript = join(process.cwd(), 'backend', 'comparable-data-management', 'index.js')
    
    // Create a temporary script to add data
    const addDataScript = `
import { ComparableDataDatabaseClient } from './database-client.js';

async function addComparableData() {
  try {
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    const result = await db.insertComparableData({
      address: '${body.address}',
      rooms: ${body.rooms},
      floor_number: ${body.floor},
      apartment_area_sqm: ${body.area},
      declared_price: ${body.price},
      price_per_sqm_rounded: ${Math.round(body.price / body.area)},
      sale_date: '${body.saleDate}',
      city: '${body.city}',
      street_name: '${body.neighborhood || ''}',
      imported_by: 'frontend-user'
    }, 'manual-entry', 0, 'frontend-user');
    
    await db.disconnect();
    
    console.log(JSON.stringify({
      success: true,
      data: result,
      message: 'Comparable data added successfully'
    }));
    
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

addComparableData();
    `
    
    // Write temporary script
    const fs = require('fs');
    const tempScript = join(process.cwd(), 'temp-add-data.js');
    fs.writeFileSync(tempScript, addDataScript);
    
    const result = await new Promise((resolve, reject) => {
      const child = spawn('node', [tempScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(process.cwd(), 'backend', 'comparable-data-management')
      })

      let output = ''
      let errorOutput = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      child.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempScript);
        } catch (e) {}
        
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (parseError) {
            console.error('❌ Failed to parse backend output:', parseError)
            reject(new Error('Failed to parse backend response'))
          }
        } else {
          console.error('❌ Backend script failed:', errorOutput)
          reject(new Error('Backend script failed'))
        }
      })
    })

    console.log('✅ Existing backend result:', (result as any).success ? 'added' : 'failed')
    
    return NextResponse.json(result as any)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to add comparable data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
