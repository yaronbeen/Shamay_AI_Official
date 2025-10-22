import { NextRequest, NextResponse } from 'next/server'
import { ShumaDB } from '../../../../../lib/shumadb.js'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config() // Load environment variables

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log('🏢 EXTERIOR ANALYSIS API CALLED')
  try {
    const { sessionId } = params
    console.log(`🔍 Starting exterior analysis for session: ${sessionId}`)

    // Get session data from database
    const sessionData = await ShumaDB.loadShumaForWizard(sessionId)
    if (!sessionData.success || !sessionData.valuationData) {
      console.log('❌ Session not found in database:', sessionId)
      return NextResponse.json({ error: 'Session not found in database' }, { status: 404 })
    }
    
    console.log('✅ Session found:', sessionId)
    
    // For now, use test documents to verify backend integration (same pattern as land-registry)
    const projectRoot = path.join(process.cwd(), '..')
    const testImage = path.join(projectRoot, 'integrations', 'test_documents', 'external_image.jpg')
    
    // Check if test image exists
    if (!fs.existsSync(testImage)) {
      console.log('🏢 No test image found - returning early')
      return NextResponse.json({
        success: true,
        message: "No test image available",
        images: [],
        extractedData: {
          building_condition: "לא נמצא",
          building_features: "לא נמצא",
          building_type: "לא נמצא",
          overall_assessment: "לא נמצא"
        }
      })
    }
    
    console.log('🏢 Using test image:', testImage)

    const analyzedImages = []
    let combinedBuildingCondition = ""
    let combinedBuildingFeatures = ""
    let combinedBuildingType = ""
    let combinedOverallAssessment = ""

    // Analyze the test exterior image
    const imagePath = testImage
    
    try {
      console.log('🏢 Processing exterior image:', imagePath)
      
      // Create a temporary script to process the image (same pattern as land-registry)
      const backendScript = path.join(projectRoot, 'backend', 'image-analysis', 'building-exterior-analyzer', 'building-exterior-analyzer.js')
      
      console.log('🏢 Backend script path:', backendScript)
      console.log('🏢 Backend script exists:', fs.existsSync(backendScript))
      
      const tempScript = `
import BuildingExteriorAnalyzer from './backend/image-analysis/building-exterior-analyzer/building-exterior-analyzer.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🏢 Backend: Starting building exterior analysis');
console.log('🏢 Backend: ANTHROPIC_API_KEY available:', !!process.env.ANTHROPIC_API_KEY);

async function processImage() {
  try {
    console.log('🏢 Backend: Creating analyzer instance');
    const analyzer = new BuildingExteriorAnalyzer();
    const imagePath = '${imagePath}';
    
    console.log('🏢 Backend: Processing image file:', imagePath);
    console.log('🏢 Backend: File exists check will be done by analyzer');
    
    // Pass the actual file path to the analyzer (not base64)
    const result = await analyzer.analyzeBuildingExterior(imagePath);
    
    console.log('🏢 Backend: Analysis complete');
    console.log('🏢 Backend: Result success:', result.success);
    console.log('🏢 Backend: Analysis length:', result.analysis?.length || 0);
    
    console.log(JSON.stringify({
      success: result.success || false,
      analysis: result.analysis || 'לא נמצא',
      structuredData: result.structuredData || {},
      timestamp: result.timestamp || new Date().toISOString()
    }));
  } catch (error) {
    console.error('🏢 Backend: Error in processImage:', error);
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      analysis: 'לא נמצא',
      structuredData: {}
    }));
  }
}

processImage();
      `
      
      // Write temporary script
      const tempScriptPath = path.join(projectRoot, `temp-exterior-${Date.now()}.js`)
      fs.writeFileSync(tempScriptPath, tempScript)
      
      console.log('🏢 Temporary script created:', tempScriptPath)
      console.log('🏢 Spawning child process for exterior analysis...')
      
      const analysisResult = await new Promise((resolve, reject) => {
          const child = spawn('node', [tempScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: projectRoot,
            env: {
              ...process.env,
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
            }
          })

          console.log('🏢 Spawning child process with:', {
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
            
            console.log('🏢 Exterior analysis script exit code:', code)
            console.log('🏢 Exterior analysis stdout:', output)
            console.log('🏢 Exterior analysis stderr:', errorOutput)
            
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
                  console.error('🏢 No JSON found in output:', output)
                  resolve({ success: false, error: 'No JSON response from backend' })
                }
              } catch (parseError) {
                console.error('🏢 Failed to parse backend output:', parseError)
                console.error('🏢 Raw output:', output)
                resolve({ success: false, error: 'Failed to parse backend response' })
              }
            } else {
              console.error('🏢 Exterior analysis script failed with code:', code)
              console.error('🏢 Error output:', errorOutput)
              resolve({ success: false, error: 'Exterior analysis script failed' })
            }
          })
        })

      console.log('🏢 Analysis result:', analysisResult)

      if (analysisResult && (analysisResult as any).success) {
        console.log('🏢 Analysis successful')
        
        // Extract building analysis from the AI response
        const buildingCondition = extractBuildingCondition((analysisResult as any).analysis || '')
        const buildingFeatures = extractBuildingFeatures((analysisResult as any).analysis || '')
        const buildingType = extractBuildingType((analysisResult as any).analysis || '')
        const overallAssessment = extractOverallAssessment((analysisResult as any).analysis || '')

        // Set combined results
        combinedBuildingCondition = buildingCondition
        combinedBuildingFeatures = buildingFeatures
        combinedBuildingType = buildingType
        combinedOverallAssessment = overallAssessment

        // Create image entry
        const imageEntry = {
          id: 1,
          entry_id: parseInt(sessionId),
          file_name: path.basename(imagePath),
          file_path: imagePath,
          file_size: fs.statSync(imagePath).size,
          ai_analysis: {
            building_condition: buildingCondition,
            building_features: buildingFeatures,
            building_type: buildingType,
            overall_assessment: overallAssessment
          },
          is_primary: true,
          screenshot_id: null,
          created_at: new Date().toISOString(),
          screenshotPath: imagePath
        }

        analyzedImages.push(imageEntry)
      } else {
        console.log('🏢 Analysis failed:', analysisResult)
      }
    } catch (error) {
      console.error('🏢 Analysis failed:', error)
    }

    // Update session data with extracted information
    const extractedData = {
      building_condition: combinedBuildingCondition || "לא נמצא",
      building_features: combinedBuildingFeatures || "לא נמצא",
      building_type: combinedBuildingType || "לא נמצא",
      overall_assessment: combinedOverallAssessment || "לא נמצא"
    }

    console.log('📊 Extracted data:', extractedData)

    // Note: Session data is now managed by the database, no need to update sessionStore

    return NextResponse.json({
      success: true,
      message: "Exterior images processed successfully",
      images: analyzedImages,
      extractedData: extractedData
    })
  } catch (error: any) {
    console.error('❌ Exterior analysis API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: "Exterior analysis failed",
      images: [],
      extractedData: {
        building_condition: "לא נמצא",
        building_features: "לא נמצא",
        building_type: "לא נמצא",
        overall_assessment: "לא נמצא"
      }
    }, { status: 500 })
  }
}


function extractBuildingCondition(analysis: string): string {
  // Look for building condition indicators in Hebrew
  const conditionKeywords = {
    'מצוין': 'מצוין',
    'טוב': 'טוב',
    'בינוני': 'בינוני',
    'דורש שיפוץ': 'דורש שיפוץ',
    'מצב כללי': 'מצב כללי',
    'תחזוקה': 'תחזוקה'
  }
  
  for (const [keyword, result] of Object.entries(conditionKeywords)) {
    if (analysis.includes(keyword)) {
      return result
    }
  }
  
  return 'לא נמצא'
}

function extractBuildingFeatures(analysis: string): string {
  // Look for building features
  const featureKeywords = ['מרפסות', 'גינה', 'חניה', 'מעלית', 'ממ"ד', 'מרפסת', 'גג', 'כניסה', 'שער']
  const foundFeatures = []
  
  for (const keyword of featureKeywords) {
    if (analysis.includes(keyword)) {
      foundFeatures.push(keyword)
    }
  }
  
  return foundFeatures.length > 0 ? foundFeatures.join(', ') : 'לא נמצא'
}

function extractBuildingType(analysis: string): string {
  // Look for building type indicators
  const typeKeywords = {
    'בית פרטי': 'בית פרטי',
    'דירה': 'דירה',
    'וילה': 'וילה',
    'נטהאוזפ': 'נטהאוזפ',
    'דופלקס': 'דופלקס',
    'סטודיו': 'סטודיו'
  }
  
  for (const [keyword, result] of Object.entries(typeKeywords)) {
    if (analysis.includes(keyword)) {
      return result
    }
  }
  
  return 'לא נמצא'
}

function extractOverallAssessment(analysis: string): string {
  // Look for overall assessment
  const assessmentKeywords = {
    'מצוין': 'הבניין במצב מצוין, מודרני ומתוחזק היטב',
    'טוב': 'הבניין במצב כללי טוב, מתוחזק היטב',
    'בינוני': 'הבניין במצב בינוני, דורש שיפורים קלים',
    'דורש שיפוץ': 'הבניין דורש שיפוץ נרחב'
  }
  
  for (const [keyword, result] of Object.entries(assessmentKeywords)) {
    if (analysis.includes(keyword)) {
      return result
    }
  }
  
  return 'לא נמצא'
}
