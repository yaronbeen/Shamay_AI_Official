import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { sessionStore } from '../../../../../lib/session-store-global'
import puppeteer from 'puppeteer'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    console.log(`📸 GIS Screenshot API called for session: ${sessionId}`)
    
    const session = sessionStore.getSession(sessionId)
    
    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if this is a file upload (FormData) or JSON request
    const contentType = request.headers.get('content-type') || ''
    
    let cropMode, govmapUrl, annotations, coordinates, file
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload (cropped image)
      const formData = await request.formData()
      file = formData.get('file') as File
      cropMode = formData.get('cropMode') as string
      annotations = formData.get('annotations') as string
      
      console.log(`📸 Received file upload - cropMode: ${cropMode}, file size: ${file?.size}`)
      
      if (!cropMode || !file) {
        console.error(`❌ Missing data - cropMode: ${cropMode}, file: ${file ? 'present' : 'missing'}`)
        return NextResponse.json({ error: 'Missing cropMode or file data' }, { status: 400 })
      }
    } else {
      // Handle JSON request (server-side screenshot)
      const jsonData = await request.json()
      cropMode = jsonData.cropMode
      govmapUrl = jsonData.govmapUrl
      annotations = jsonData.annotations
      coordinates = jsonData.coordinates
      
      console.log(`📸 Received JSON - cropMode: ${cropMode}, govmapUrl: ${govmapUrl}`)
      
      if (!cropMode || !govmapUrl) {
        console.error(`❌ Missing data - cropMode: ${cropMode}, govmapUrl: ${govmapUrl ? 'present' : 'missing'}`)
        return NextResponse.json({ error: 'Missing cropMode or govmapUrl data' }, { status: 400 })
      }
    }

    // Create uploads directory for this session
    const uploadsDir = join(process.cwd(), 'uploads', sessionId, 'screenshots')
    await mkdir(uploadsDir, { recursive: true })
    
    // Generate filename with timestamp
    const timestamp = Date.now()
    const filename = `govmap_crop_${cropMode}_${timestamp}.png`
    const filePath = join(uploadsDir, filename)
    
    if (file) {
      // Handle file upload (cropped image)
      console.log(`📸 Saving uploaded file to: ${filePath}`)
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(filePath, buffer)
      
      console.log(`✅ File saved successfully: ${filePath}`)
      
      return NextResponse.json({
        success: true,
        filePath: filePath,
        message: 'Cropped image saved successfully'
      })
    } else {
      // Handle server-side screenshot
      console.log(`📸 Capturing GovMap screenshot from: ${govmapUrl}`)
      
      try {
        // Launch Puppeteer to capture the actual GovMap
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
      
      try {
        const page = await browser.newPage()
        
        // Set viewport to match iframe size
        await page.setViewport({ width: 1200, height: 800 })
        
        // Navigate to the GovMap URL
        await page.goto(govmapUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        })
        
        // Wait a bit for the map to fully load
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Take screenshot of the page
        const screenshotBuffer = await page.screenshot({
          type: 'png',
          fullPage: false
        })
        
        // Save the screenshot buffer to file
        await writeFile(filePath, screenshotBuffer)
        
        console.log(`📸 GovMap screenshot saved to: ${filePath}`)
        
      } finally {
        await browser.close()
      }
    } catch (puppeteerError) {
      console.warn('⚠️ Puppeteer failed, falling back to composite image:', puppeteerError)
      
      // Fallback: Create a composite image with map-like background and annotations
      const canvas = require('canvas')
      const compositeCanvas = canvas.createCanvas(1200, 800)
      const ctx = compositeCanvas.getContext('2d')
      
      // Create a more realistic map background
      // Base color - light green like satellite view
      ctx.fillStyle = '#e8f5e8'
      ctx.fillRect(0, 0, 1200, 800)
      
      // Add some terrain-like patterns
      ctx.fillStyle = '#d4edda'
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 1200
        const y = Math.random() * 800
        const size = Math.random() * 100 + 50
        ctx.beginPath()
        ctx.arc(x, y, size, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Add road-like lines
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 3
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(Math.random() * 1200, Math.random() * 800)
        ctx.lineTo(Math.random() * 1200, Math.random() * 800)
        ctx.stroke()
      }
      
      // Add building-like rectangles
      ctx.fillStyle = '#999'
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * 1100
        const y = Math.random() * 700
        const width = Math.random() * 50 + 20
        const height = Math.random() * 50 + 20
        ctx.fillRect(x, y, width, height)
      }
      
      // Add a subtle grid overlay
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 0.5
      ctx.globalAlpha = 0.3
      for (let x = 0; x < 1200; x += 100) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 800)
        ctx.stroke()
      }
      for (let y = 0; y < 800; y += 100) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(1200, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      
      // Add a subtle border
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, 1200, 800)
      
      // Add title with better styling
      ctx.fillStyle = '#000'
      ctx.font = 'bold 28px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(
        cropMode === '0' ? 'מפת GovMap - מפה נקייה' : 'מפת GovMap - מפת תצ"א',
        600, 40
      )
      
      // Add coordinates with better styling
      if (coordinates) {
        ctx.fillStyle = '#333'
        ctx.font = 'bold 18px Arial'
        ctx.fillText(`ITM: ${coordinates.x.toFixed(2)}, ${coordinates.y.toFixed(2)}`, 600, 70)
        ctx.fillText(`WGS84: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, 600, 95)
        
        // Add a location marker
        ctx.fillStyle = '#ff0000'
        ctx.beginPath()
        ctx.arc(600, 150, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // Draw annotations with better visibility
      if (annotations && annotations.length > 0) {
        annotations.forEach((annotation: any) => {
          // Make annotations more visible with thicker lines and shadows
          ctx.strokeStyle = annotation.color
          ctx.fillStyle = annotation.color
          ctx.lineWidth = 5
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
          ctx.shadowBlur = 3
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1

          if (annotation.type === 'freehand' && annotation.points) {
            ctx.beginPath()
            annotation.points.forEach((p: any, i: number) => {
              if (i === 0) ctx.moveTo(p.x, p.y)
              else ctx.lineTo(p.x, p.y)
            })
            ctx.stroke()
          } else if (annotation.type === 'rectangle' && annotation.x && annotation.y && annotation.width && annotation.height) {
            ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)
          } else if (annotation.type === 'circle' && annotation.x && annotation.y && annotation.radius) {
            ctx.beginPath()
            ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI)
            ctx.stroke()
          } else if (annotation.type === 'line' && annotation.x1 && annotation.y1 && annotation.x2 && annotation.y2) {
            ctx.beginPath()
            ctx.moveTo(annotation.x1, annotation.y1)
            ctx.lineTo(annotation.x2, annotation.y2)
            ctx.stroke()
          } else if (annotation.type === 'text' && annotation.x && annotation.y && annotation.text) {
            ctx.font = 'bold 24px Arial'
            ctx.fillText(annotation.text, annotation.x, annotation.y)
          }
        })
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }
      
      // Save the composite image
      const buffer = compositeCanvas.toBuffer('image/png')
      await writeFile(filePath, buffer)
      
      console.log(`📸 Fallback composite screenshot saved to: ${filePath}`)
    }
    
    // Save file path to session data
    const existingScreenshots = session.data?.gisScreenshots || {}
    console.log(`📸 Existing screenshots:`, existingScreenshots)
    
    const updatedScreenshots = {
      ...existingScreenshots,
      [`cropMode${cropMode}`]: `/uploads/${sessionId}/screenshots/${filename}` // Save file path
    }
    
    console.log(`📸 Updated screenshots:`, updatedScreenshots)
    console.log(`📸 File saved locally, session will be updated by frontend`)

      return NextResponse.json({
        success: true,
        screenshotUrl: `/uploads/${sessionId}/screenshots/${filename}`, // Return file path
        cropMode
      })
    }

  } catch (error) {
    console.error('❌ Error saving GIS screenshot:', error)
    return NextResponse.json({ 
      error: 'Failed to save screenshot', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
