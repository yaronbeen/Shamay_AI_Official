import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'
import { spawn } from 'child_process'
import { join } from 'path'

// Force this route to be dynamic (runtime-only) to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Skip during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ 
      success: false,
      message: 'Skipped during build'
    })
  }
  
  try {
    const body = await request.json()
    console.log('💾 Frontend: Saving property assessment via EXISTING backend')

    // ✅ USE EXISTING BACKEND: Use the existing property-assessment backend
    const backendScript = join(process.cwd(), 'backend', 'property-assessment', 'index.js')
    
    // Create a temporary script to save assessment
    const saveAssessmentScript = `
import { PropertyAssessmentDatabaseClient } from './database-client.js';

async function saveAssessment() {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    await db.connect();
    
    const result = await db.saveAssessment({
      session_id: '${params.sessionId}',
      property_address: '${body.propertyAddress || ''}',
      property_area: ${body.propertyArea || 0},
      final_valuation: ${body.finalValuation || 0},
      price_per_sqm: ${body.pricePerSqm || 0},
      comparable_data: JSON.stringify(body.comparableData || []),
      analysis_data: JSON.stringify(body.analysisData || {}),
      created_at: new Date().toISOString()
    });
    
    await db.disconnect();
    
    console.log(JSON.stringify({
      success: true,
      data: result,
      message: 'Property assessment saved successfully'
    }));
    
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

saveAssessment();
    `
    
    // Write temporary script
    const fs = require('fs');
    const tempScript = join(process.cwd(), 'temp-save-assessment.js');
    fs.writeFileSync(tempScript, saveAssessmentScript);
    
    const result = await new Promise((resolve, reject) => {
      const child = spawn('node', [tempScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(process.cwd(), 'backend', 'property-assessment')
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

    if ((result as any).success) {
      // ✅ ALSO UPDATE SESSION: Keep session in sync
      const session = sessionStore.getSession(params.sessionId)
      if (session) {
        session.data = { ...session.data, ...body }
        sessionStore.updateSession(params.sessionId, session)
        console.log('✅ Session updated with assessment data')
      }
    }

    console.log('✅ Existing backend result:', (result as any).success ? 'saved' : 'failed')
    
    return NextResponse.json(result as any)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to save property assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
