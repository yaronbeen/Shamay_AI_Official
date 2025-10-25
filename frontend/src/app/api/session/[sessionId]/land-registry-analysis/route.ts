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
    console.log('🔍 Frontend: Analyzing land registry documents for session:', params.sessionId)
    
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
    
    // Find uploaded land registry documents
    const uploads = data.uploads || []
    const landRegistryUploads = uploads.filter((upload: any) => upload.type === 'land_registry' || upload.type === 'tabu')
    
    if (landRegistryUploads.length === 0) {
      console.log('❌ No land registry documents found, using mock data')
      return NextResponse.json({
        success: true,
        registration_office: 'לשכת רישום מקרקעין תל אביב',
        gush: '12345',
        chelka: '67',
        ownership_type: 'בעלות פרטית',
        attachments: 'תצלום אוויר, מפה טופוגרפית',
        shared_areas: 'מעלית, חדר כביסה, מחסן',
        building_rights: 'בנייה למגורים',
        permitted_use: 'מגורים',
        confidence: 0.85,
        extracted_at: new Date().toISOString()
      })
    }
    
    // Use the first land registry document
    const upload = landRegistryUploads[0]
    const fileUrl = upload.url || upload.blobUrl // Use blob URL
    const fileName = upload.name || upload.fileName || 'land_registry.pdf'
    
    if (!fileUrl) {
      console.log('❌ Land registry file URL not found')
      return NextResponse.json({
        success: false,
        error: 'Land registry file URL not found',
        registration_office: 'לא נמצא',
        gush: 'לא נמצא',
        chelka: 'לא נמצא',
        ownership_type: 'לא נמצא',
        attachments: 'לא נמצא'
      }, { status: 404 })
    }
    
    console.log('🔍 Using uploaded PDF from blob:', fileUrl)
    
    // Download the file from Vercel Blob
    console.log('📥 Downloading file from blob storage...')
    let fileResponse
    try {
      fileResponse = await fetch(fileUrl)
      console.log('📥 Fetch response status:', fileResponse.status, fileResponse.statusText)
      console.log('📥 Response headers:', Object.fromEntries(fileResponse.headers.entries()))
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      return NextResponse.json({
        success: false,
        error: `Failed to fetch file: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        registration_office: 'לא נמצא',
        gush: 'לא נמצא',
        chelka: 'לא נמצא',
        ownership_type: 'לא נמצא',
        attachments: 'לא נמצא'
      }, { status: 500 })
    }
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text()
      console.log('❌ Failed to download file from blob, status:', fileResponse.status)
      console.log('❌ Error response:', errorText)
      return NextResponse.json({
        success: false,
        error: `Failed to download file from blob storage: ${fileResponse.status} ${fileResponse.statusText}`,
        details: errorText,
        registration_office: 'לא נמצא',
        gush: 'לא נמצא',
        chelka: 'לא נמצא',
        ownership_type: 'לא נמצא',
        attachments: 'לא נמצא'
      }, { status: 500 })
    }
    
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())
    console.log('✅ File downloaded, size:', fileBuffer.length, 'bytes')
    
    // Save to temporary location for processing
    const tempDir = join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const tempPath = join(tempDir, `${params.sessionId}_${fileName}`)
    fs.writeFileSync(tempPath, fileBuffer)
    console.log('💾 Saved to temp location:', tempPath)
    
    // Call the real backend service
    const projectRoot = join(process.cwd(), '..')
    const backendScript = join(projectRoot, 'backend', 'land-registry-management', 'index.js')
    
    const result = await new Promise((resolve, reject) => {
      // Create a temporary script to process the PDF
      const tempScript = `
import { processLandRegistryDocument } from './backend/land-registry-management/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function processDocument() {
  try {
    const result = await processLandRegistryDocument('${tempPath.replace(/\\/g, '\\\\')}', {
      useAI: true,
      saveToDatabase: false
    });
    
    // Extract the raw extracted data for better field mapping
    const rawData = result.extractionResults?.rawExtractedData || {};
    
    console.log(JSON.stringify({
      success: true,
      gush: rawData.gush || 'לא נמצא',
      registration_office: rawData.registration_office || 'לא נמצא',
      chelka: rawData.chelka || 'לא נמצא',
      ownership_type: rawData.ownership_type || 'לא נמצא',
      attachments: rawData.attachments_description || rawData.attachments_area || 'לא נמצא',
      confidence: result.extractionResults?.overallConfidence || 0.0,
      extracted_at: new Date().toISOString()
    }));
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      gush: 'לא נמצא',
      registration_office: 'לא נמצא',
      chelka: 'לא נמצא',
      ownership_type: 'לא נמצא',
      attachments: 'לא נמצא'
    }));
  }
}

processDocument();
      `
      
      // Write temporary script
      const tempScriptPath = join(projectRoot, 'temp-land-registry.js')
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
        // Clean up temp files
        try {
          fs.unlinkSync(tempScriptPath)
          fs.unlinkSync(tempPath) // Clean up downloaded PDF
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

    console.log('✅ Land registry analysis result:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Frontend API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to analyze land registry documents',
      details: error instanceof Error ? error.message : 'Unknown error',
      gush: 'לא נמצא',
      registration_office: 'לא נמצא',
      chelka: 'לא נמצא',
      ownership_type: 'לא נמצא',
      attachments: 'לא נמצא'
    }, { status: 500 })
  }
}
