import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFileSync } from 'fs'

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
    // In Vercel, files are at /var/task, so we need to check both locations
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV
    let projectRoot = process.cwd()
    let backendScript = join(projectRoot, 'backend', 'comparable-data-management', 'query-comparable-data.js')
    
    // CRITICAL: In Vercel, check if backend is at root level or relative to frontend
    if (isVercel) {
      // Try Vercel structure: /var/task/backend/...
      const vercelPath = join('/var/task', 'backend', 'comparable-data-management', 'query-comparable-data.js')
      if (existsSync(vercelPath)) {
        backendScript = vercelPath
        projectRoot = '/var/task'
        console.log('🔍 Using Vercel path structure:', vercelPath)
      } else {
        // Try relative to current directory
        const relativePath = join(projectRoot, '..', 'backend', 'comparable-data-management', 'query-comparable-data.js')
        if (existsSync(relativePath)) {
          backendScript = relativePath
          projectRoot = join(projectRoot, '..')
          console.log('🔍 Using relative path structure:', relativePath)
        } else {
          // Fallback: assume structure based on Vercel deployment
          backendScript = join(process.cwd(), 'backend', 'comparable-data-management', 'query-comparable-data.js')
          projectRoot = process.cwd()
          console.log('🔍 Using fallback path structure:', backendScript)
        }
      }
    } else {
      // Local development: go up one level from frontend
      projectRoot = join(process.cwd(), '..')
      backendScript = join(projectRoot, 'backend', 'comparable-data-management', 'query-comparable-data.js')
      console.log('🔍 Using local development path structure')
    }
    
    console.log('🔍 Project root:', projectRoot)
    console.log('🔍 Backend script path:', backendScript)
    
    // CRITICAL: Verify script exists before spawning
    if (!existsSync(backendScript)) {
      console.error('❌ Backend script not found at:', backendScript)
      console.error('❌ Current working directory:', process.cwd())
      return NextResponse.json({
        success: false,
        error: 'Backend script not found',
        details: `Script path: ${backendScript}`,
        cwd: process.cwd(),
        isVercel: !!isVercel
      }, { status: 500 })
    }
    
    // Get organization and user IDs from session for data isolation
    const session = await getServerSession(authOptions)
    const organizationId = session?.user?.primaryOrganizationId || null
    const userId = session?.user?.id || null
    
    const result = await new Promise((resolve, reject) => {
      // CRITICAL: Set working directory to where query-comparable-data.js is located
      // This ensures relative requires (like './database-client.js') work correctly
      const scriptDir = join(backendScript, '..')
      
      // CRITICAL: Set NODE_PATH to include both frontend and backend node_modules
      // This ensures @neondatabase/serverless can be found in Vercel
      const isVercel = process.env.VERCEL || process.env.VERCEL_ENV === 'production'
      const nodePaths = []
      
      if (isVercel) {
        // In Vercel, node_modules might be at different locations
        // Try frontend/node_modules, backend/node_modules, and /var/task/node_modules
        const possibleNodeModules = [
          '/var/task/frontend/node_modules',
          '/var/task/backend/node_modules',
          '/var/task/node_modules',
          join(process.cwd(), 'node_modules'),
          join(process.cwd(), 'backend', 'node_modules')
        ].filter(Boolean)
        
        nodePaths.push(...possibleNodeModules)
      } else {
        // Local development: use relative paths
        nodePaths.push(
          join(process.cwd(), 'node_modules'),
          join(process.cwd(), 'backend', 'node_modules'),
          join(process.cwd(), 'frontend', 'node_modules')
        )
      }
      
      const existingNodePath = process.env.NODE_PATH || ''
      const finalNodePath = existingNodePath 
        ? `${existingNodePath}:${nodePaths.join(':')}`
        : nodePaths.join(':')
      
      const child = spawn('node', [backendScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: scriptDir, // Set cwd to script directory for relative requires
        env: {
          ...process.env,
          NODE_PATH: finalNodePath, // CRITICAL: Set NODE_PATH for module resolution
          QUERY_CITY: city || '',
          QUERY_NEIGHBORHOOD: '', // Not used in current backend
          QUERY_ROOMS: rooms || '',
          QUERY_AREA: area || '',
          // CRITICAL: Pass organization and user IDs for data isolation
          ORGANIZATION_ID: organizationId || '',
          USER_ID: userId || ''
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
    // CRITICAL: Get user session for organization and user ID isolation
    const session = await getServerSession(authOptions)
    const organizationId = session?.user?.primaryOrganizationId || null
    const userId = session?.user?.id || null
    
    const body = await request.json()
    console.log('➕ Frontend: Adding comparable data via EXISTING backend')
    console.log('📊 Organization/User:', { organizationId, userId })

    // ✅ USE EXISTING BACKEND: Use the existing database client directly
    const backendScript = join(process.cwd(), 'backend', 'comparable-data-management', 'index.js')
    
    // Create a temporary script to add data
    const addDataScript = `
import { ComparableDataDatabaseClient } from './database-client.js';

async function addComparableData() {
  try {
    const db = new ComparableDataDatabaseClient('${organizationId || ''}', '${userId || ''}');
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
      imported_by: '${userId || 'frontend-user'}'
    }, 'manual-entry', 0, '${userId || 'frontend-user'}');
    
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
    
    // CRITICAL: Set NODE_PATH to include both frontend and backend node_modules
    // This ensures @neondatabase/serverless can be found in Vercel
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV === 'production'
    const nodePaths = []
    
    if (isVercel) {
      // In Vercel, node_modules might be at different locations
      const possibleNodeModules = [
        '/var/task/frontend/node_modules',
        '/var/task/backend/node_modules',
        '/var/task/node_modules',
        join(process.cwd(), 'node_modules'),
        join(process.cwd(), 'backend', 'node_modules')
      ].filter(Boolean)
      
      nodePaths.push(...possibleNodeModules)
    } else {
      // Local development: use relative paths
      nodePaths.push(
        join(process.cwd(), 'node_modules'),
        join(process.cwd(), 'backend', 'node_modules'),
        join(process.cwd(), 'frontend', 'node_modules')
      )
    }
    
    const existingNodePath = process.env.NODE_PATH || ''
    const finalNodePath = existingNodePath 
      ? `${existingNodePath}:${nodePaths.join(':')}`
      : nodePaths.join(':')
    
    const result = await new Promise((resolve, reject) => {
      const child = spawn('node', [tempScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(process.cwd(), 'backend', 'comparable-data-management'),
        env: {
          ...process.env,
          NODE_PATH: finalNodePath // CRITICAL: Set NODE_PATH for module resolution
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
