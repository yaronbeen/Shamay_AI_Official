import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'

export async function GET() {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ 
      success: false,
      message: 'Skipped during build'
    })
  }
  
  try {
    console.log('📊 Frontend: Getting database statistics via EXISTING backend')

    // ✅ USE EXISTING BACKEND: Use the existing comparable-data-management backend
    const backendScript = join(process.cwd(), 'backend', 'comparable-data-management', 'index.js')
    
    // Create a temporary script to get stats
    const getStatsScript = `
import { ComparableDataDatabaseClient } from './database-client.js';

async function getStats() {
  try {
    const db = new ComparableDataDatabaseClient();
    await db.connect();
    
    const stats = await db.getComparableDataStats();
    
    await db.disconnect();
    
    console.log(JSON.stringify({
      success: true,
      data: stats,
      message: 'Database statistics retrieved'
    }));
    
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

getStats();
    `
    
    // Write temporary script
    const fs = require('fs');
    const tempScript = join(process.cwd(), 'temp-get-stats.js');
    fs.writeFileSync(tempScript, getStatsScript);
    
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

    console.log('✅ Existing backend result:', result)
    
    return NextResponse.json(result as any)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get database statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
