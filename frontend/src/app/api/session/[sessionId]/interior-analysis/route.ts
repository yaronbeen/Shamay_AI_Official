import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config() // Load environment variables

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
    console.log('🏠 INTERIOR ANALYSIS API CALLED - STARTING')
    try {
      const { sessionId } = params
      console.log(`🔍 Starting interior analysis for session: ${sessionId}`)

    // Get session data
    const sessionData = sessionStore.getSession(sessionId)
    if (!sessionData) {
      console.log('❌ Session not found:', sessionId)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    console.log('✅ Session found:', sessionId)
    
    // For now, use test documents to verify backend integration (same pattern as land-registry)
    const projectRoot = path.join(process.cwd(), '..')
    const testImages = [
      path.join(projectRoot, 'integrations', 'test_documents', 'internal_image_-20250608-WA0066.jpg'),
      path.join(projectRoot, 'integrations', 'test_documents', 'internal_image_-20250608-WA0067.jpg'),
      path.join(projectRoot, 'integrations', 'test_documents', 'internal_image_-20250608-WA0072.jpg')
    ]
    
    // Check if test images exist
    const availableTestImages = testImages.filter(imgPath => fs.existsSync(imgPath))
    console.log('🏠 Available test images:', availableTestImages.length)
    
    if (availableTestImages.length === 0) {
      console.log('🏠 No test images found - returning early')
      return NextResponse.json({
        success: true,
        message: "No test images available",
        images: [],
        extractedData: {
          property_layout_description: "לא נמצא",
          room_analysis: [],
          condition_assessment: "לא נמצא"
        }
      })
    }


    console.log('🏠 Found test images, proceeding with analysis...')
    console.log('🏠 Test images count:', availableTestImages.length)
    

    const analyzedImages: any[] = []
    let combinedRoomAnalysis: any[] = []
    let combinedConditionAssessment = ""
    let combinedPropertyLayout = ""

    // Analyze each test image (same pattern as land-registry)
    console.log('🏠 Starting test image analysis loop...')
    
    for (let i = 0; i < availableTestImages.length; i++) {
      const imagePath = availableTestImages[i]
      console.log(`🏠 Processing test image ${i + 1}: ${imagePath}`)

      try {
        // Use the same temporary script approach as land registry analysis
        const backendScript = path.join(projectRoot, 'backend', 'image-analysis', 'apartment-interior-analyzer', 'apartment-interior-analyzer.js')
        
        console.log('🏠 Backend script path:', backendScript)
        console.log('🏠 Backend script exists:', fs.existsSync(backendScript))
        
        // Create a temporary script to process the image
      const tempScript = `
import ApartmentInteriorAnalyzer from './backend/image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🏠 Backend: Starting apartment interior analysis');
console.log('🏠 Backend: ANTHROPIC_API_KEY available:', !!process.env.ANTHROPIC_API_KEY);

async function processImage() {
  try {
    console.log('🏠 Backend: Creating analyzer instance');
    const analyzer = new ApartmentInteriorAnalyzer();
    const imagePath = '${imagePath}';
    
    console.log('🏠 Backend: Processing image file:', imagePath);
    console.log('🏠 Backend: File exists check will be done by analyzer');
    
    // Pass the actual file path to the analyzer (not base64)
    const result = await analyzer.analyzeApartmentInterior(imagePath);
    
    console.log('🏠 Backend: Analysis complete');
    console.log('🏠 Backend: Result success:', result.success);
    console.log('🏠 Backend: Analysis length:', result.analysis?.length || 0);
    
    console.log(JSON.stringify({
      success: result.success || false,
      analysis: result.analysis || 'לא נמצא',
      structuredData: result.structuredData || {},
      timestamp: result.timestamp || new Date().toISOString()
    }));
  } catch (error) {
    console.error('🏠 Backend: Error in processImage:', error);
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
        const tempScriptPath = path.join(projectRoot, `temp-interior-${Date.now()}.js`)
        fs.writeFileSync(tempScriptPath, tempScript)
        
        console.log('🏠 Temporary script created:', tempScriptPath)
        
        console.log('🏠 Spawning child process for interior analysis...')
        console.log('🏠 Script path:', tempScriptPath)
        console.log('🏠 Project root:', projectRoot)
        
        const analysisResult = await new Promise((resolve, reject) => {
          const child = spawn('node', [tempScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: projectRoot,
            env: {
              ...process.env,
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
            }
          })

          console.log('🏠 Spawning child process with:', {
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
            
            console.log('🏠 Interior analysis script exit code:', code)
            console.log('🏠 Interior analysis stdout:', output)
            console.log('🏠 Interior analysis stderr:', errorOutput)
            
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
                  console.error('🏠 No JSON found in output:', output)
                  resolve({ success: false, error: 'No JSON response from backend' })
                }
              } catch (parseError) {
                console.error('🏠 Failed to parse backend output:', parseError)
                console.error('🏠 Raw output:', output)
                resolve({ success: false, error: 'Failed to parse backend response' })
              }
            } else {
              console.error('🏠 Interior analysis script failed with code:', code)
              console.error('🏠 Error output:', errorOutput)
              resolve({ success: false, error: 'Interior analysis script failed' })
            }
          })
        })

        console.log(`🏠 Analysis result for image ${i + 1}:`, analysisResult)

        if (analysisResult && (analysisResult as any).success) {
          console.log(`🏠 Analysis successful for image ${i + 1}`)
          
          // Extract room analysis from the AI response
          const roomAnalysis = extractRoomAnalysis((analysisResult as any).analysis || '')
          const conditionAssessment = extractConditionAssessment((analysisResult as any).analysis || '')
          const propertyLayout = extractPropertyLayout((analysisResult as any).analysis || '')

          // Add to combined results
          if (roomAnalysis.length > 0) {
            combinedRoomAnalysis = [...combinedRoomAnalysis, ...roomAnalysis]
          }
          if (conditionAssessment && !combinedConditionAssessment) {
            combinedConditionAssessment = conditionAssessment
          }
          if (propertyLayout && !combinedPropertyLayout) {
            combinedPropertyLayout = propertyLayout
          }

          // Create image entry
          const imageEntry = {
            id: i + 1,
            entry_id: parseInt(sessionId),
            file_name: path.basename(imagePath),
            file_path: imagePath,
            file_size: fs.statSync(imagePath).size,
            ai_analysis: {
              room_analysis: roomAnalysis,
              condition_assessment: conditionAssessment,
              property_layout_description: propertyLayout
            },
            is_primary: i === 0,
            screenshot_id: null,
            created_at: new Date().toISOString(),
            screenshotPath: imagePath
          }

          analyzedImages.push(imageEntry)
        } else {
          console.log(`🏠 Analysis failed for image ${i + 1}:`, analysisResult)
        }
      } catch (error) {
        console.error(`🏠 Analysis failed for image ${i + 1}:`, error)
      }
    }

    // Update session data with extracted information
    const extractedData = {
      property_layout_description: combinedPropertyLayout || "לא נמצא",
      room_analysis: combinedRoomAnalysis,
      condition_assessment: combinedConditionAssessment || "לא נמצא"
    }

    console.log('📊 Extracted data:', extractedData)

    // Update session data
    sessionStore.updateSession(sessionId, {
      ...sessionData,
      data: {
        ...sessionData.data,
        extractedData: {
          ...sessionData.data?.extractedData,
          ...extractedData
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Interior images processed successfully",
      images: analyzedImages,
      extractedData: extractedData
    })
  } catch (error: any) {
    console.error('❌ Interior analysis API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: "Interior analysis failed",
      images: [],
      extractedData: {
        property_layout_description: "לא נמצא",
        room_analysis: [],
        condition_assessment: "לא נמצא"
      }
    }, { status: 500 })
  }
}


function extractRoomAnalysis(analysis: string): any[] {
  // Look for room analysis in the AI response
  const roomTypes = ['סלון', 'מטבח', 'חדר שינה', 'חדר רחצה', 'פינת אוכל', 'מרפסת', 'מסדרון']
  const conditions = ['מצוין', 'טוב', 'בינוני', 'דורש שיפוץ', 'מצב כללי']
  
  const rooms = []
  
  for (const roomType of roomTypes) {
    if (analysis.includes(roomType)) {
      // Extract features for this room
      const features = extractRoomFeatures(analysis, roomType)
      const condition = extractRoomCondition(analysis, roomType)
      
      rooms.push({
        room_type: roomType,
        size_estimate: "לא נמצא",
        features: features,
        condition: condition
      })
    }
  }
  
  // If no specific rooms found, create a general analysis
  if (rooms.length === 0) {
    const generalFeatures = extractGeneralFeatures(analysis)
    const generalCondition = extractGeneralCondition(analysis)
    
    if (generalFeatures || generalCondition) {
      rooms.push({
        room_type: "חלל כללי",
        size_estimate: "לא נמצא",
        features: generalFeatures || "לא נמצא",
        condition: generalCondition || "לא נמצא"
      })
    }
  }
  
  return rooms
}

function extractRoomFeatures(analysis: string, roomType: string): string {
  // Look for features specific to this room type
  const featureKeywords = {
    'סלון': ['טלוויזיה', 'ספה', 'כיסאות', 'שידה', 'חלון', 'מזגן'],
    'מטבח': ['אי מטבח', 'מקרר', 'כיריים', 'כיור', 'ארונות', 'דלפק'],
    'חדר שינה': ['מיטה', 'שידות', 'מראה', 'מאוורר', 'ארון'],
    'חדר רחצה': ['מכונת כביסה', 'מגבות', 'ארונית', 'כיור', 'מקלחת']
  }
  
  const keywords = featureKeywords[roomType as keyof typeof featureKeywords] || []
  const foundFeatures = []
  
  for (const keyword of keywords) {
    if (analysis.includes(keyword)) {
      foundFeatures.push(keyword)
    }
  }
  
  return foundFeatures.length > 0 ? foundFeatures.join(', ') : "לא נמצא"
}

function extractRoomCondition(analysis: string, roomType: string): string {
  const conditionKeywords = ['מצוין', 'טוב', 'בינוני', 'דורש שיפוץ', 'מצב כללי']
  
  for (const condition of conditionKeywords) {
    if (analysis.includes(condition)) {
      return condition
    }
  }
  
  return "לא נמצא"
}

function extractGeneralFeatures(analysis: string): string {
  const generalKeywords = ['ריהוט', 'חלונות', 'תאורה', 'רצפה', 'קירות', 'דלתות']
  const foundFeatures = []
  
  for (const keyword of generalKeywords) {
    if (analysis.includes(keyword)) {
      foundFeatures.push(keyword)
    }
  }
  
  return foundFeatures.length > 0 ? foundFeatures.join(', ') : "לא נמצא"
}

function extractGeneralCondition(analysis: string): string {
  const conditionKeywords = ['מצוין', 'טוב', 'בינוני', 'דורש שיפוץ', 'מצב כללי']
  
  for (const condition of conditionKeywords) {
    if (analysis.includes(condition)) {
      return condition
    }
  }
  
  return "לא נמצא"
}

function extractConditionAssessment(analysis: string): string {
  // Look for overall condition assessment
  const conditionKeywords = {
    'מצוין': 'הדירה במצב מצוין, מודרנית ומוארת',
    'טוב': 'הדירה במצב כללי טוב, מודרנית ומוארת',
    'בינוני': 'הדירה במצב בינוני, דורשת שיפורים קלים',
    'דורש שיפוץ': 'הדירה דורשת שיפוץ נרחב'
  }
  
  for (const [keyword, result] of Object.entries(conditionKeywords)) {
    if (analysis.includes(keyword)) {
      return result
    }
  }
  
  return "לא נמצא"
}

function extractPropertyLayout(analysis: string): string {
  // Look for property layout description
  const layoutKeywords = ['דירה כוללת', 'הדירה כוללת', 'החלל כולל', 'הנכס כולל']
  
  for (const keyword of layoutKeywords) {
    if (analysis.includes(keyword)) {
      // Try to extract the full sentence
      const startIndex = analysis.indexOf(keyword)
      const sentence = analysis.substring(startIndex, startIndex + 100)
      return sentence.trim()
    }
  }
  
  return "לא נמצא"
}
