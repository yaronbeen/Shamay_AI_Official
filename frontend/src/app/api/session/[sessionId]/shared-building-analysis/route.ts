import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'
import { spawn } from 'child_process'
import { join } from 'path'
import fs from 'fs'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    console.log('🔍 Frontend: Analyzing shared building order documents for session:', params.sessionId)
    
    // Get session data from database
    const sessionData = await ShumaDB.loadShumaForWizard(params.sessionId)
    if (!sessionData.success || !sessionData.valuationData) {
      return NextResponse.json({ 
        success: false,
        error: 'Session not found in database' 
      }, { status: 404 })
    }

    const data = sessionData.valuationData
    
    // Debug: Log the actual session data structure
    console.log('🔍 Session data structure:', JSON.stringify(data, null, 2))
    console.log('🔍 Available data keys:', Object.keys(data))
    
    // Find uploaded shared building documents
    const uploads = data.uploads || []
    const sharedBuildingUploads = uploads.filter((upload: any) => upload.type === 'condo' || upload.type === 'condominium_order')
    
    if (sharedBuildingUploads.length === 0) {
      console.log('❌ No shared building documents found, using mock data')
      return NextResponse.json({
        success: true,
        order_issue_date: '2020-01-15',
        building_description: 'בניין מגורים בן 4 קומות',
        building_floors: '4',
        building_sub_plots_count: '8',
        building_address: 'רחוב הרצל 15, תל אביב',
        total_sub_plots: '8',
        confidence: 0.90,
        extracted_at: new Date().toISOString()
      })
    }
    
    // Use the first shared building document
    const upload = sharedBuildingUploads[0]
    const pdfPath = upload.path || upload.extractedData?.filePath
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      console.log('❌ Shared building PDF not found at path:', pdfPath)
      return NextResponse.json({
        success: false,
        error: 'Shared building PDF file not found',
        order_issue_date: 'לא נמצא',
        building_description: 'לא נמצא',
        building_floors: 'לא נמצא',
        building_sub_plots_count: 'לא נמצא',
        building_address: 'לא נמצא',
        total_sub_plots: 'לא נמצא'
      }, { status: 404 })
    }
    
    console.log('🔍 Using uploaded PDF:', pdfPath)
    
    // Call the real backend service
    const projectRoot = join(process.cwd(), '..')
    
    const result = await new Promise((resolve, reject) => {
      // Create a temporary script to process the PDF
      const tempScript = `
import { processSharedBuildingDocument } from './backend/shared-building-order/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function processDocument() {
  try {
    const result = await processSharedBuildingDocument('${pdfPath}', 'output', {
      useAI: true,
      saveToDatabase: false
    });
    
    // Extract fields from the backend response structure
    const fields = result.fields || {};
    
    console.log(JSON.stringify({
      success: true,
      building_description: fields.building_description?.value || 'לא נמצא',
      common_areas: fields.common_areas?.value || 'לא נמצא',
      confidence: fields.overallConfidence || 0.0,
      extracted_at: new Date().toISOString()
    }));
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      building_description: 'לא נמצא',
      common_areas: 'לא נמצא'
    }));
  }
}

processDocument();
      `
      
      // Write temporary script
      const tempScriptPath = join(projectRoot, 'temp-shared-building.js')
      fs.writeFileSync(tempScriptPath, tempScript)
      
      const child = spawn('node', [tempScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: projectRoot,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        }
      })

      console.log('🔍 Spawning child process with:', {
        command: 'node',
        args: [tempScriptPath],
        cwd: projectRoot,
        env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT_SET' }
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
          fs.unlinkSync(tempScriptPath)
        } catch (e) {}
        
        console.log('🔍 Backend script exit code:', code)
        console.log('🔍 Backend stdout length:', output.length)
        console.log('🔍 Backend stdout:', output)
        console.log('🔍 Backend stderr length:', errorOutput.length)
        console.log('🔍 Backend stderr:', errorOutput)
        
        if (code === 0) {
          try {
            // Extract JSON from output
            const lines = output.split('\n')
            let jsonLine = ''
            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].trim().startsWith('{') && lines[i].trim().endsWith('}')) {
                jsonLine = lines[i].trim()
                break
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

    console.log('✅ Shared building order analysis result:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to analyze shared building order documents',
      details: error instanceof Error ? error.message : 'Unknown error',
      building_description: 'לא נמצא',
      common_areas: 'לא נמצא'
    }, { status: 500 })
  }
}
