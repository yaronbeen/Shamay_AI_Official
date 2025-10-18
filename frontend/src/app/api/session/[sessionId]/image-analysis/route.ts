import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../../../../lib/session-store-global'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Helper functions for image analysis
async function analyzeBuildingExterior(imagePath: string) {
  return new Promise((resolve, reject) => {
    console.log('🏢 Starting building exterior analysis...')
    console.log('🏢 Image path:', imagePath)

    const projectRoot = path.resolve(process.cwd(), '..')
    const scriptPath = path.join(projectRoot, 'backend/image-analysis/building-exterior-analyzer/building-exterior-analyzer.js')
    
    console.log('📁 Project root:', projectRoot)
    console.log('📄 Script path:', scriptPath)
    console.log('📄 Script exists:', fs.existsSync(scriptPath))
    console.log('📄 Image exists:', fs.existsSync(imagePath))

    const child = spawn('node', [scriptPath, imagePath], {
      cwd: projectRoot,
      env: { ...process.env }
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      console.log(`🏢 Building exterior analysis script exited with code ${code}`)
      console.log('🏢 stdout:', stdout)
      console.error('🏢 stderr:', stderr)

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim())
          resolve({ success: true, analysis: result.analysis, structuredData: result.structuredData })
        } catch (parseError: any) {
          console.error('🏢 Failed to parse JSON from building exterior analysis:', parseError)
          resolve({ success: false, error: `Failed to parse JSON: ${parseError.message}` })
        }
      } else {
        resolve({ success: false, error: stderr || `Script exited with code ${code}` })
      }
    })

    child.on('error', (error) => {
      console.error('🏢 Failed to start building exterior analysis script:', error)
      reject({ success: false, error: error.message })
    })
  })
}

async function analyzeApartmentInterior(imagePath: string) {
  return new Promise((resolve, reject) => {
    console.log('🏠 Starting apartment interior analysis...')
    console.log('🏠 Image path:', imagePath)
    
    const projectRoot = path.resolve(process.cwd(), '..')
    const scriptPath = path.join(projectRoot, 'backend/image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js')
    
    console.log('📁 Project root:', projectRoot)
    console.log('📄 Script path:', scriptPath)
    console.log('📄 Script exists:', fs.existsSync(scriptPath))
    console.log('📄 Image exists:', fs.existsSync(imagePath))
    
    const child = spawn('node', [scriptPath, imagePath], {
      cwd: projectRoot,
      env: { ...process.env }
    })
    
    let stdout = ''
    let stderr = ''
    
    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      console.log(`🏠 Apartment interior analysis script exited with code ${code}`)
      console.log('🏠 stdout:', stdout)
      console.error('🏠 stderr:', stderr)

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim())
          resolve({ success: true, analysis: result.analysis, structuredData: result.structuredData })
        } catch (parseError: any) {
          console.error('🏠 Failed to parse JSON from apartment interior analysis:', parseError)
          resolve({ success: false, error: `Failed to parse JSON: ${parseError.message}` })
        }
      } else {
        resolve({ success: false, error: stderr || `Script exited with code ${code}` })
      }
    })

    child.on('error', (error) => {
      console.error('🏠 Failed to start apartment interior analysis script:', error)
      reject({ success: false, error: error.message })
    })
  })
}

async function analyzeBuildingExteriorFromBase64(base64Data: string) {
  return new Promise((resolve, reject) => {
    console.log('🏢 Starting building exterior analysis from base64...')
    
    // Create a temporary file from base64 data
    const tempDir = path.join(process.cwd(), 'temp')
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const tempFilePath = path.join(tempDir, `building_${Date.now()}.jpg`)
    
    try {
      // Remove data URL prefix and write base64 to file
      const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(tempFilePath, base64String, 'base64')
      
      console.log('🏢 Temporary file created:', tempFilePath)
      
      // Now analyze the temporary file
      const projectRoot = path.resolve(process.cwd(), '..')
      const scriptPath = path.join(projectRoot, 'backend/image-analysis/building-exterior-analyzer/building-exterior-analyzer.js')
      
      console.log('📁 Project root:', projectRoot)
      console.log('📄 Script path:', scriptPath)
      
      const child = spawn('node', [scriptPath, tempFilePath], {
        cwd: projectRoot,
        env: { ...process.env }
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        console.log(`🏢 Building exterior analysis script exited with code ${code}`)
        console.log('🏢 stdout:', stdout)
        console.error('🏢 stderr:', stderr)

        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath)
          console.log('🏢 Temporary file cleaned up')
        } catch (cleanupError) {
          console.error('🏢 Failed to clean up temporary file:', cleanupError)
        }

        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim())
            resolve({ success: true, analysis: result.analysis, structuredData: result.structuredData })
          } catch (parseError: any) {
            console.error('🏢 Failed to parse JSON from building exterior analysis:', parseError)
            resolve({ success: false, error: `Failed to parse JSON: ${parseError.message}` })
          }
        } else {
          resolve({ success: false, error: stderr || `Script exited with code ${code}` })
        }
      })

      child.on('error', (error) => {
        console.error('🏢 Failed to start building exterior analysis script:', error)
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath)
        } catch (cleanupError) {
          console.error('🏢 Failed to clean up temporary file:', cleanupError)
        }
        reject({ success: false, error: error.message })
      })
    } catch (error: any) {
      console.error('🏢 Failed to create temporary file:', error)
      reject({ success: false, error: error.message })
    }
  })
}

async function analyzeApartmentInteriorFromBase64(base64Data: string) {
  return new Promise((resolve, reject) => {
    console.log('🏠 Starting apartment interior analysis from base64...')
    
    // Create a temporary file from base64 data
    const tempDir = path.join(process.cwd(), 'temp')
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const tempFilePath = path.join(tempDir, `interior_${Date.now()}.jpg`)
    
    try {
      // Remove data URL prefix and write base64 to file
      const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(tempFilePath, base64String, 'base64')
      
      console.log('🏠 Temporary file created:', tempFilePath)
      
      // Now analyze the temporary file
      const projectRoot = path.resolve(process.cwd(), '..')
      const scriptPath = path.join(projectRoot, 'backend/image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js')
      
      console.log('📁 Project root:', projectRoot)
      console.log('📄 Script path:', scriptPath)
      
      const child = spawn('node', [scriptPath, tempFilePath], {
        cwd: projectRoot,
        env: { ...process.env }
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        console.log(`🏠 Apartment interior analysis script exited with code ${code}`)
        console.log('🏠 stdout:', stdout)
        console.error('🏠 stderr:', stderr)

        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath)
          console.log('🏠 Temporary file cleaned up')
        } catch (cleanupError) {
          console.error('🏠 Failed to clean up temporary file:', cleanupError)
        }

        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim())
            resolve({ success: true, analysis: result.analysis, structuredData: result.structuredData })
          } catch (parseError: any) {
            console.error('🏠 Failed to parse JSON from apartment interior analysis:', parseError)
            resolve({ success: false, error: `Failed to parse JSON: ${parseError.message}` })
          }
        } else {
          resolve({ success: false, error: stderr || `Script exited with code ${code}` })
        }
      })

      child.on('error', (error) => {
        console.error('🏠 Failed to start apartment interior analysis script:', error)
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath)
        } catch (cleanupError) {
          console.error('🏠 Failed to clean up temporary file:', cleanupError)
        }
        reject({ success: false, error: error.message })
      })
    } catch (error: any) {
      console.error('🏠 Failed to create temporary file:', error)
      reject({ success: false, error: error.message })
    }
  })
}

function extractPropertyCondition(analysis: string): string {
  // Look for property condition indicators in Hebrew
  const conditionKeywords = {
    'מצוין': 'מצוין',
    'טוב': 'טוב',
    'בינוני': 'בינוני',
    'דורש שיפוץ': 'דורש שיפוץ',
    'מצב כללי': 'מצב כללי',
    'תחזוקה': 'תחזוקה',
    'מצוין - נראה כמו דירה חדשה': 'מצוין',
    'נראה כמו דירה חדשה': 'מצוין',
    'משופצת לאחרונה': 'מצוין'
  }
  
  for (const [keyword, result] of Object.entries(conditionKeywords)) {
    if (analysis.includes(keyword)) {
      return result
    }
  }
  
  return 'לא נמצא'
}

function extractFinishLevel(analysis: string): string {
  // Look for finish level indicators in Hebrew
  const finishKeywords = {
    'רמה גבוהה מאוד': 'רמה גבוהה מאוד',
    'גימור גבוה': 'גימור גבוה',
    'גימור בינוני': 'גימור בינוני',
    'גימור נמוך': 'גימור נמוך',
    'איכות הגימורים': 'איכות הגימורים',
    'גימור': 'גימור',
    'ברמה גבוהה מאוד': 'רמה גבוהה מאוד',
    'עבודה מקצועית': 'רמה גבוהה מאוד',
    'גימורים ברמה גבוהה מאוד': 'רמה גבוהה מאוד'
  }
  
  for (const [keyword, result] of Object.entries(finishKeywords)) {
    if (analysis.includes(keyword)) {
      return result
    }
  }
  
  return 'לא נמצא'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log('🚀 IMAGE ANALYSIS COORDINATOR API CALLED')
  try {
    const { sessionId } = params
    console.log(`🔍 Starting coordinated image analysis for session: ${sessionId}`)

    // Get session data
    const sessionData = sessionStore.getSession(sessionId)
    if (!sessionData) {
      console.log('❌ Session not found:', sessionId)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    console.log('✅ Session found:', sessionId)

    // Call both interior and exterior analysis APIs
    const baseUrl = request.url.replace('/api/session/' + sessionId + '/image-analysis', '')
    
    console.log('🏠 Calling interior analysis API...')
    const interiorResponse = await fetch(`${baseUrl}/api/session/${sessionId}/interior-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    console.log('🏢 Calling exterior analysis API...')
    const exteriorResponse = await fetch(`${baseUrl}/api/session/${sessionId}/exterior-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const interiorData = await interiorResponse.json()
    const exteriorData = await exteriorResponse.json()

    console.log('🏠 Interior analysis result:', interiorData)
    console.log('🏢 Exterior analysis result:', exteriorData)

    // Combine results
    const combinedResult = {
      success: true,
      message: "All image analysis completed",
      interior: interiorData,
      exterior: exteriorData,
      extracted_at: new Date().toISOString()
    }

    return NextResponse.json(combinedResult)
  } catch (error: any) {
    console.error('❌ Coordinated image analysis API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: "Coordinated image analysis failed"
    }, { status: 500 })
  }
}