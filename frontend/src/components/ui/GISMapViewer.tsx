'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Settings, Camera, Save, Eye, RefreshCw, Edit3 } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import { useShumaDB } from '@/hooks/useShumaDB'
import AdvancedAnnotationCanvas, { AnnotationShape } from './AdvancedAnnotationCanvas'

interface GovMapData {
  coordinates: {
    x: number
    y: number
    lat: number
    lng: number
  }
  govmapUrls: {
    cropMode0: string
    cropMode1: string
  }
  extractedAt: string
  status: string
  confidence?: number
  address?: string
  annotations?: AnnotationShape[]
  annotationCanvasData?: string
  screenshots?: Screenshots
}

interface Screenshots {
  cropMode0?: string
  cropMode1?: string
}

interface GISMapViewerProps {
  sessionId: string
  data: ValuationData
  initialScreenshots?: Screenshots
  onAnalysisComplete?: (measurements: GovMapData) => void
}

export default function GISMapViewer({ sessionId, data, onAnalysisComplete }: GISMapViewerProps) {
  const { saveGISData } = useShumaDB()
  const [gisData, setGisData] = useState<GovMapData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screenshots, setScreenshots] = useState<Screenshots>({})
  const [currentCropMode, setCurrentCropMode] = useState<'0' | '1'>('0')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCapturingServer, setIsCapturingServer] = useState(false)
  const [currentIframeUrl, setCurrentIframeUrl] = useState<string | null>(null)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [isDrawingCrop, setIsDrawingCrop] = useState(false)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [isImageLoading, setIsImageLoading] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const annotationImageRef = useRef<HTMLImageElement>(null)
  
  // Address search state - initialized from Step 1 data, but editable
  const [addressSearch, setAddressSearch] = useState({
    street: data.street || '',
    buildingNumber: data.buildingNumber || '',
    city: data.city || ''
  })
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<string>('')
  const [coordinates, setCoordinates] = useState<{ wgs84: { lat: number; lon: number }; itm: { easting: number; northing: number } } | null>(null)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeContainerRef = useRef<HTMLDivElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)

  // Helper function to format screenshot data as a proper data URL
  const formatScreenshotSrc = (screenshot: string | undefined): string | undefined => {
    if (!screenshot) return undefined
    
    // If it's already a data URL, return as is
    if (screenshot.startsWith('data:')) {
      return screenshot
    }
    
    // Otherwise, prepend the data URL prefix
    return `data:image/png;base64,${screenshot}`
  }

  // Helper to ensure screenshot is in proper data URL format before saving
  const ensureDataUrlFormat = (imageData: string): string => {
    if (!imageData) return ''
    
    // If it's already a proper data URL, return as is
    if (imageData.startsWith('data:image/')) {
      console.log('✅ Image already in data URL format')
      return imageData
    }
    
    // If it's just base64, add the prefix
    if (!imageData.startsWith('data:')) {
      console.log('⚠️ Adding data URL prefix to base64 string')
      return `data:image/png;base64,${imageData}`
    }
    
    return imageData
  }

  useEffect(() => {
    if (sessionId && data) {
      loadGISAnalysis()
      
      // Load screenshots from localStorage if available
      try {
        const saved0 = localStorage.getItem(`gis-screenshot-${sessionId}-0`)
        const saved1 = localStorage.getItem(`gis-screenshot-${sessionId}-1`)
        
        if (saved0 || saved1) {
          // Ensure both are in proper format
          const formatted0 = saved0 ? ensureDataUrlFormat(saved0) : screenshots.cropMode0
          const formatted1 = saved1 ? ensureDataUrlFormat(saved1) : screenshots.cropMode1
          
          setScreenshots({
            cropMode0: formatted0,
            cropMode1: formatted1
          })
          
          console.log('📂 Loaded screenshots from localStorage')
          if (formatted0) console.log('  - Mode 0:', formatted0.substring(0, 50) + '...')
          if (formatted1) console.log('  - Mode 1:', formatted1.substring(0, 50) + '...')
        }
      } catch (e) {
        console.warn('Failed to load from localStorage:', e)
      }
    }
  }, [sessionId, data])
  
  // Load address from Step 1 when data changes
  useEffect(() => {
    if (data.street && data.city && !addressSearch.street) {
      setAddressSearch({
        street: data.street || '',
        buildingNumber: data.buildingNumber || '',
        city: data.city || ''
      })
    }
  }, [data])
  
  const loadGISAnalysis = async () => {
    try {
      console.log('📊 Loading existing GovMap analysis from session data...')
      
      // Safety check: ensure data is defined
      if (!data) {
        console.log('⚠️ Data prop is undefined, skipping load')
        return
      }
      
      // Load GIS analysis from ValuationData prop
      if (data.gisAnalysis) {
        console.log('📊 Setting GovMap data from props:', data.gisAnalysis)
        setGisData(data.gisAnalysis)
        
        // Set the iframe URL if available
        if (data.gisAnalysis.govmapUrls) {
          const initialUrl = currentCropMode === '1' 
            ? data.gisAnalysis.govmapUrls.cropMode1 
            : data.gisAnalysis.govmapUrls.cropMode0
          setCurrentIframeUrl(initialUrl)
          console.log('🔗 Loaded iframe URL from analysis:', initialUrl)
        }
      }
      
      // Load screenshots from ValuationData
      if (data.gisScreenshots) {
        // Ensure screenshots are in proper base64 format for display
        const formattedScreenshots = {
          cropMode0: data.gisScreenshots.cropMode0,
          cropMode1: data.gisScreenshots.cropMode1
        }
        
        setScreenshots(formattedScreenshots)
        console.log('📸 Loaded existing screenshots from data:', formattedScreenshots)
      }
      
      // If no data in props, try to load from session API (fallback)
      if (!data.gisAnalysis) {
        const response = await fetch(`/api/session/${sessionId}/gis-analysis`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.measurements) {
            console.log('📊 Setting GovMap data from API:', result.measurements)
            setGisData(result.measurements)
            
            // Set the iframe URL if available
            if (result.measurements.govmapUrls) {
              const initialUrl = currentCropMode === '1' 
                ? result.measurements.govmapUrls.cropMode1 
                : result.measurements.govmapUrls.cropMode0
              setCurrentIframeUrl(initialUrl)
              console.log('🔗 Loaded iframe URL from API:', initialUrl)
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading GovMap analysis:', error)
      setError('Failed to load GovMap analysis')
    }
  }

  const runGISAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🗺️ Starting GovMap analysis...')
      const response = await fetch(`/api/session/${sessionId}/gis-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log('📊 GovMap analysis response:', result.measurements)
          setGisData(result.measurements)
          
          // Set the initial iframe URL based on current crop mode
          if (result.measurements?.govmapUrls) {
            const initialUrl = currentCropMode === '1' 
              ? result.measurements.govmapUrls.cropMode1 
              : result.measurements.govmapUrls.cropMode0
            setCurrentIframeUrl(initialUrl)
            console.log('🔗 Initial iframe URL set:', initialUrl)
          }
          
          onAnalysisComplete?.(result.measurements)
          console.log('✅ GovMap analysis completed successfully')
        } else {
          setError(result.error || 'GovMap analysis failed')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'GovMap analysis failed')
      }
    } catch (error) {
      console.error('❌ GovMap analysis error:', error)
      setError('Failed to run GovMap analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const searchAddress = async () => {
    const { street, buildingNumber, city } = addressSearch
    if (!street.trim() || !city.trim()) {
      setError('נא להזין רחוב ועיר לפחות')
      return
    }

    const address = `${street} ${buildingNumber} ${city}`.trim()
    setIsSearchingAddress(true)
    setError(null)

    try {
      console.log(`🔍 Searching address: ${address}`)
      console.log('🔵 Calling /api/address-to-govmap with address:', address)
      
      const response = await fetch('/api/address-to-govmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address, 
          options: { zoom: 16, showTazea: currentCropMode === '1', showInfo: false } 
        })
      })

      console.log('📡 Response status:', response.status, response.statusText)
      console.log('📡 Content-Type:', response.headers.get('content-type'))

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Non-JSON response:', text.substring(0, 200))
        throw new Error(`Server returned ${contentType || 'unknown content type'} instead of JSON`)
      }

      const result = await response.json()
      console.log('✅ Response parsed successfully:', result)

      if (!result.success) {
        setError(result.error || 'כתובת לא נמצאה')
        return
      }

      // Convert the address search result to our existing GIS data format
      const convertedGisData = {
        coordinates: {
          x: result.coordinates.itm.easting,
          y: result.coordinates.itm.northing,
          lat: result.coordinates.wgs84.lat,
          lng: result.coordinates.wgs84.lon
        },
        govmapUrls: {
          cropMode0: result.govmap.urlWithoutTazea, // Clean map
          cropMode1: result.govmap.urlWithTazea      // With תצ"א overlay
        },
        extractedAt: new Date().toISOString(),
        status: 'completed',
        confidence: result.confidence,
        address: result.address.normalized
      }

      console.log('✅ Address found and converted:', convertedGisData)
      setGisData(convertedGisData)
      setCurrentAddress(result.address.normalized)
      setCoordinates({
        wgs84: { lat: result.coordinates.wgs84.lat, lon: result.coordinates.wgs84.lon },
        itm: { easting: result.coordinates.itm.easting, northing: result.coordinates.itm.northing }
      })
      
      // Set the initial iframe URL
      const initialUrl = currentCropMode === '1' ? result.govmap.urlWithTazea : result.govmap.urlWithoutTazea
      setCurrentIframeUrl(initialUrl)
      
      onAnalysisComplete?.(convertedGisData)

    } catch (error) {
      console.error('❌ Address search error:', error)
      setError(`שגיאה בחיפוש כתובת: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSearchingAddress(false)
    }
  }

  const getCurrentIframeUrl = () => {
    // Return the current iframe URL (updated when crop mode changes)
    if (currentIframeUrl) return currentIframeUrl
    
    // Fallback to gisData URLs
    if (!gisData?.govmapUrls) return undefined
    return currentCropMode === '1' ? gisData.govmapUrls.cropMode1 : gisData.govmapUrls.cropMode0
  }

  // Update iframe URL when crop mode changes
  const handleCropModeChange = (mode: '0' | '1') => {
    setCurrentCropMode(mode)
    if (gisData?.govmapUrls) {
      const newUrl = mode === '1' ? gisData.govmapUrls.cropMode1 : gisData.govmapUrls.cropMode0
      setCurrentIframeUrl(newUrl)
      console.log(`🔄 Crop mode changed to ${mode}, URL: ${newUrl}`)
    }
  }

  // Main capture function - use the EXACT current iframe URL
  const captureScreenshot = async () => {
    // Get the exact current URL from the iframe
    let currentUrl = getCurrentIframeUrl()
    
    if (!currentUrl) {
      alert('לא ניתן לצלם - נתוני מפה לא זמינים')
      return
    }

    // Try to parse and ensure all parameters are included
    try {
      const urlObj = new URL(currentUrl)
      const params = new URLSearchParams(urlObj.search)
      
      // Ensure all required parameters are present
      if (!params.has('c')) {
        throw new Error('Missing coordinates parameter')
      }
      
      // Ensure zoom is present
      if (!params.has('z')) {
        params.set('z', '16')
      }
      
      // Ensure layers are present based on crop mode
      if (!params.has('lay')) {
        params.set('lay', currentCropMode === '1' ? '21,15' : '15')
      }
      
      // Ensure bs parameter is present
      if (!params.has('bs')) {
        params.set('bs', currentCropMode === '1' ? '15,21' : '15')
      }
      
      // Ensure b parameter for תצ"א
      if (currentCropMode === '1' && !params.has('b')) {
        params.set('b', '1')
      }
      
      // Ensure bb and zb are present
      if (!params.has('bb')) {
        params.set('bb', '1')
      }
      if (!params.has('zb')) {
        params.set('zb', '1')
      }
      
      // IMPORTANT: Remove 'in' parameter to hide sidebar
      params.delete('in')
      
      // Reconstruct URL with all parameters
      const urlString = params.toString().replace(/%2C/g, ',')
      currentUrl = `${urlObj.origin}${urlObj.pathname}?${urlString}`
      
      console.log('✅ Reconstructed URL with all parameters:', currentUrl)
      setCurrentIframeUrl(currentUrl)
    } catch (error) {
      console.warn('⚠️ Could not parse URL, using original:', error)
    }
    
    setIsCapturingServer(true)
    try {
      console.log(`📸 Capturing server-side screenshot for mode ${currentCropMode}`)
      console.log(`🔗 Using EXACT iframe URL with all parameters:`, currentUrl)
      
      // Extract coordinates from the current URL for logging
      const urlCoordsMatch = currentUrl.match(/c=([\d.]+),([\d.]+)/)
      if (urlCoordsMatch) {
        const easting = parseFloat(urlCoordsMatch[1])
        const northing = parseFloat(urlCoordsMatch[2])
        console.log(`📍 URL coordinates: E=${easting}, N=${northing}`)
      }
      
      const response = await fetch(`/api/session/${sessionId}/gis-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropMode: currentCropMode,
          govmapUrl: currentUrl, // Use the EXACT current URL with all parameters
          annotations: [],
          coordinates: gisData?.coordinates
        })
      })
      
      if (!response.ok) {
        // Handle 501 (Not Implemented) for serverless limitation
        if (response.status === 501) {
          const errorData = await response.json()
          alert(errorData.message || 'צילום אוטומטי לא זמין בסביבת הענן. אנא השתמש בהעלאת צילום מסך ידנית.')
          setIsCapturingServer(false)
          return
        }
        throw new Error(`Server screenshot failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`📸 Server screenshot result:`, result)
      
      if (result.success && result.screenshot) {
        // Ensure the screenshot is in proper data URL format
        const formattedScreenshot = ensureDataUrlFormat(result.screenshot)
        console.log('📸 Screenshot format:', formattedScreenshot.substring(0, 50) + '...')
        
        // Use the formatted screenshot for cropping first
        setCapturedImage(formattedScreenshot)
        setShowCropModal(true) // Show crop modal FIRST
        console.log('✅ Server screenshot captured successfully, ready for cropping')
      } else {
        throw new Error(result.error || 'Server screenshot failed')
      }
        
    } catch (error) {
      console.error('❌ Error capturing server screenshot:', error)
      alert('שגיאה בצילום המפה. אנא נסה שוב.')
    } finally {
      setIsCapturingServer(false)
    }
  }

  const drawAnnotationOnCanvas = (ctx: CanvasRenderingContext2D, annotation: AnnotationShape, canvasWidth: number, canvasHeight: number) => {
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color
    ctx.lineWidth = annotation.strokeWidth || 3
    ctx.globalAlpha = annotation.opacity || 1

    switch (annotation.type) {
      case 'line':
        if (annotation.x1 !== undefined && annotation.y1 !== undefined && annotation.x2 !== undefined && annotation.y2 !== undefined) {
        ctx.beginPath()
        ctx.moveTo(annotation.x1, annotation.y1)
        ctx.lineTo(annotation.x2, annotation.y2)
        ctx.stroke()
        }
        break
      case 'rectangle':
        if (annotation.x !== undefined && annotation.y !== undefined && annotation.width && annotation.height) {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)
        }
        break
      case 'circle':
        if (annotation.x !== undefined && annotation.y !== undefined && annotation.radius) {
        ctx.beginPath()
        ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI)
        ctx.stroke()
        }
        break
      case 'arrow':
        if (annotation.x1 !== undefined && annotation.y1 !== undefined && annotation.x2 !== undefined && annotation.y2 !== undefined) {
          drawArrow(ctx, annotation.x1, annotation.y1, annotation.x2, annotation.y2)
        }
        break
      case 'text':
        if (annotation.x !== undefined && annotation.y !== undefined && annotation.text) {
          ctx.font = `${annotation.strokeWidth || 16}px Arial`
          ctx.fillText(annotation.text, annotation.x, annotation.y)
        }
        break
      case 'freehand':
      case 'brush':
        if (annotation.points && annotation.points.length > 1) {
        ctx.beginPath()
        annotation.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        }
        break
    }
    ctx.globalAlpha = 1
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headlen = 15
    const angle = Math.atan2(y2 - y1, x2 - x1)

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  const saveScreenshot = async (imageData: string, closeAfterSave: boolean = true) => {
    if (!sessionId) {
      alert('שגיאה: מזהה סשן לא זמין')
      return
    }

    setIsCapturing(true)
    try {
      console.log('💾 Saving annotated screenshot to database...')
      
      // Ensure the image is in proper data URL format
      const formattedImageData = ensureDataUrlFormat(imageData)
      console.log('📸 Image format:', formattedImageData.substring(0, 50) + '...')
      
      // Update local state first
      const updatedScreenshots = {
        ...screenshots,
        [`cropMode${currentCropMode}`]: formattedImageData
      }

      setScreenshots(updatedScreenshots)
      
      // SAVE TO DATABASE - This is the critical part!
      console.log('💾 Saving to database via saveGISData...')
      const saveResult = await saveGISData(sessionId, updatedScreenshots)
      
      if (saveResult.error) {
        console.error('❌ Database save error:', saveResult.error)
        alert(`שגיאה בשמירת התמונה למסד הנתונים: ${saveResult.error}`)
        throw new Error(saveResult.error)
      }
      
      console.log('✅ Successfully saved to database!')
      
      // Save to local storage as backup
      try {
        localStorage.setItem(`gis-screenshot-${sessionId}-${currentCropMode}`, formattedImageData)
        console.log(`✅ Saved to localStorage as backup`)
      } catch (e) {
        console.warn('Failed to save to localStorage:', e)
      }

      console.log('✅ Screenshot saved successfully to database!')
      
      if (closeAfterSave) {
        console.log('🔒 Closing modals and cleaning up state')
        setShowEditModal(false)
        setShowCropModal(false)
        setCapturedImage(null)
        setCroppedImage(null)
        setEditedImage(null)
        setAnnotations([])
        setCropArea({ x: 0, y: 0, width: 100, height: 100 })
      }

      alert('תמונת מפה נשמרה בהצלחה למסד הנתונים!')

    } catch (error) {
      console.error('❌ Error saving screenshot:', error)
      alert(`שגיאה בשמירת התמונה: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsCapturing(false)
    } finally {
      setIsCapturing(false)
    }
  }

  // Mouse-based crop handlers
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !cropContainerRef.current) return
    
    const imgRect = imageRef.current.getBoundingClientRect()
    const containerRect = cropContainerRef.current.getBoundingClientRect()
    
    // Calculate position relative to image (not container)
    const x = e.clientX - imgRect.left
    const y = e.clientY - imgRect.top
    
    // Only start if click is within image bounds
    if (x >= 0 && x <= imgRect.width && y >= 0 && y <= imgRect.height) {
      setIsDrawingCrop(true)
      setCropStart({ x, y })
      setCropEnd({ x, y })
      
      // Reset crop area
      const percentX = (x / imgRect.width) * 100
      const percentY = (y / imgRect.height) * 100
      setCropArea({ x: percentX, y: percentY, width: 0, height: 0 })
    }
  }

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingCrop || !imageRef.current || !cropContainerRef.current) return
    
    const imgRect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - imgRect.left
    const y = e.clientY - imgRect.top
    
    setCropEnd({ x, y })
    
    // Calculate crop rectangle
    const startX = Math.min(cropStart.x, x)
    const startY = Math.min(cropStart.y, y)
    const endX = Math.max(cropStart.x, x)
    const endY = Math.max(cropStart.y, y)
    
    const width = endX - startX
    const height = endY - startY
    
    // Clamp to image bounds
    const clampedStartX = Math.max(0, Math.min(startX, imgRect.width))
    const clampedStartY = Math.max(0, Math.min(startY, imgRect.height))
    const clampedWidth = Math.max(1, Math.min(width, imgRect.width - clampedStartX))
    const clampedHeight = Math.max(1, Math.min(height, imgRect.height - clampedStartY))
    
    // Convert to percentage
    const percentX = (clampedStartX / imgRect.width) * 100
    const percentY = (clampedStartY / imgRect.height) * 100
    const percentWidth = (clampedWidth / imgRect.width) * 100
    const percentHeight = (clampedHeight / imgRect.height) * 100
    
    setCropArea({
      x: percentX,
      y: percentY,
      width: percentWidth,
      height: percentHeight
    })
  }

  const clearCropSelection = () => {
    setCropArea({ x: 0, y: 0, width: 0, height: 0 })
    setIsDrawingCrop(false)
    setCropStart({ x: 0, y: 0 })
    setCropEnd({ x: 0, y: 0 })
  }

  const handleCropMouseUp = () => {
    setIsDrawingCrop(false)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageNaturalSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
  }

  const handleCropComplete = async () => {
    if (!capturedImage) return
    
    // Validate crop area
    if (cropArea.width <= 0 || cropArea.height <= 0) {
      alert('אנא בחר אזור לחיתוך על ידי גרירה עם העכבר')
      return
    }
    
    try {
      // Create canvas to crop the image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = capturedImage
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      // Calculate crop dimensions (percentage to pixels)
      const cropX = (cropArea.x / 100) * img.width
      const cropY = (cropArea.y / 100) * img.height
      const cropWidth = (cropArea.width / 100) * img.width
      const cropHeight = (cropArea.height / 100) * img.height
      
      // Ensure we don't go out of bounds
      const finalX = Math.max(0, Math.min(cropX, img.width - 1))
      const finalY = Math.max(0, Math.min(cropY, img.height - 1))
      const finalWidth = Math.max(1, Math.min(cropWidth, img.width - finalX))
      const finalHeight = Math.max(1, Math.min(cropHeight, img.height - finalY))
      
      console.log(`📐 Cropping: ${finalX.toFixed(0)},${finalY.toFixed(0)} ${finalWidth.toFixed(0)}x${finalHeight.toFixed(0)}`)
      
      // Set canvas to cropped size
      canvas.width = finalWidth
      canvas.height = finalHeight
      
      // Draw cropped image
      ctx.drawImage(
        img,
        finalX, finalY, finalWidth, finalHeight,
        0, 0, finalWidth, finalHeight
      )
      
      // Convert to data URL (this is now much smaller!)
      const croppedDataUrl = canvas.toDataURL('image/png', 0.95) // 95% quality
      
      console.log('✅ Image cropped successfully, size reduced')
      console.log(`📊 Original size: ${img.width}x${img.height}, Cropped: ${finalWidth}x${finalHeight}`)
      
      setCroppedImage(croppedDataUrl)
      setShowCropModal(false)
      
      // Wait a moment for image to be ready, then show annotation modal
      setIsImageLoading(true)
      setTimeout(() => {
        setIsImageLoading(false)
        setShowEditModal(true)
      }, 100)
      
    } catch (error) {
      console.error('❌ Error cropping image:', error)
      alert('שגיאה בחיתוך התמונה')
    }
  }

  const handleEditComplete = async (finalAnnotations: AnnotationShape[], editedData: string) => {
    console.log('✏️ Edit complete, saving changes')
    setEditedImage(editedData)
    setAnnotations(finalAnnotations)
    
    // Automatically save when user clicks save in AdvancedAnnotationCanvas
    await saveScreenshot(editedData, true) // This will save to DB and close
  }

  const handleSaveEdited = async (closeAfterSave: boolean = true) => {
    console.log('💾 handleSaveEdited called with closeAfterSave:', closeAfterSave)
    console.log('📸 Available images:', { 
      editedImage: !!editedImage, 
      croppedImage: !!croppedImage, 
      capturedImage: !!capturedImage 
    })
    
    try {
      if (editedImage) {
        console.log('📤 Saving edited image')
        await saveScreenshot(editedImage, closeAfterSave)
      } else if (croppedImage) {
        console.log('📤 Saving cropped image')
        await saveScreenshot(croppedImage, closeAfterSave)
      } else if (capturedImage) {
        console.log('📤 Saving captured image')
        await saveScreenshot(capturedImage, closeAfterSave)
      } else {
        console.warn('⚠️ No image available to save!')
        alert('אין תמונה לשמירה')
      }
    } catch (error) {
      console.error('❌ Error in handleSaveEdited:', error)
      alert('שגיאה בשמירת התמונה')
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Address Search Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">חיפוש כתובת</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">רחוב *</label>
            <input
              type="text"
              value={addressSearch.street}
              onChange={(e) => setAddressSearch(prev => ({ ...prev, street: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
              placeholder="הזן רחוב"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">מספר בית</label>
            <input
              type="text"
              value={addressSearch.buildingNumber}
              onChange={(e) => setAddressSearch(prev => ({ ...prev, buildingNumber: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
              placeholder="הזן מספר בית"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">עיר *</label>
            <input
              type="text"
              value={addressSearch.city}
              onChange={(e) => setAddressSearch(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-right"
              placeholder="הזן עיר"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={searchAddress}
            disabled={isSearchingAddress}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearchingAddress ? 'מחפש...' : '🔍 חפש כתובת'}
          </button>
          
          <button
            onClick={runGISAnalysis}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'מנתח...' : '📍 נתח מפרטי הנכס'}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
        </div>
        )}

        {coordinates && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <div className="font-semibold mb-2">קואורדינטות:</div>
            <div className="font-mono text-xs space-y-1">
              <div>WGS84: {coordinates.wgs84.lat.toFixed(6)}, {coordinates.wgs84.lon.toFixed(6)}</div>
              <div>ITM: {coordinates.itm.easting}, {coordinates.itm.northing}</div>
            </div>
          </div>
        )}
          </div>

      {/* Map Viewer */}
      {gisData?.govmapUrls && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">מפה GIS</h3>
              <button
              onClick={captureScreenshot}
              disabled={isCapturingServer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              {isCapturingServer ? 'מצלם...' : 'צלם מפה'}
              </button>
            </div>

          {/* Info message */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            💡 <strong>טיפ:</strong> נווט במפה למיקום המדויק הרצוי (גלול, זום, הזז) לפני לחיצה על "צלם מפה". הצילום יתבצע על התצוגה המדויקת שאתה רואה.
          </div>

          {/* Map Mode Toggle */}
          <div className="flex gap-2 mb-4">
                <button
              onClick={() => handleCropModeChange('0')}
              className={`px-4 py-2 rounded-lg ${
                currentCropMode === '0' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              מפה נקייה
                </button>
                <button
              onClick={() => handleCropModeChange('1')}
              className={`px-4 py-2 rounded-lg ${
                currentCropMode === '1' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              עם תצ"א
                </button>
            </div>

          {/* Iframe Container */}
          <div
            ref={iframeContainerRef}
            className="relative border border-gray-300 rounded-lg overflow-hidden"
            style={{ height: '600px', width: '100%' }}
          >
                  <iframe
                    ref={iframeRef}
                    src={getCurrentIframeUrl()}
              className="w-full h-full"
              style={{ border: 'none' }}
              title="GovMap"
                    allowFullScreen
            />
                </div>
              </div>
            )}

      {/* Screenshot Previews */}
          {(screenshots.cropMode0 || screenshots.cropMode1) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">תמונות שמורות</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.cropMode0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">מפה נקייה</div>
                    <img 
                      src={formatScreenshotSrc(screenshots.cropMode0)} 
                  alt="GIS Screenshot - Clean"
                  className="w-full border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
                {screenshots.cropMode1 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">עם תצ"א</div>
                    <img 
                      src={formatScreenshotSrc(screenshots.cropMode1)} 
                  alt="GIS Screenshot - With Tazea"
                  className="w-full border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

      {/* Crop Modal */}
      {showCropModal && capturedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">חתוך תמונה</h3>
              <button
                onClick={() => {
                  setShowCropModal(false)
                  setCapturedImage(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              💡 לחץ וגרור עם העכבר כדי לצייר מלבן סביב האזור שברצונך לשמור. זה יקטין את גודל התמונה.
            </div>

            {/* Image preview with interactive crop overlay */}
            <div 
              ref={cropContainerRef}
              className="relative mb-4 border-2 border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
            >
              <img 
                ref={imageRef}
                src={capturedImage} 
                alt="Screenshot" 
                className="w-full h-auto select-none"
                style={{ maxHeight: '500px', objectFit: 'contain', pointerEvents: 'none' }}
                onLoad={handleImageLoad}
                draggable={false}
              />
              
              {/* Crop selection rectangle */}
              {(isDrawingCrop || cropArea.width > 0) && (
                <div 
                  className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none"
                  style={{ 
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`,
                    borderStyle: 'dashed'
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                      אזור חיתוך
                    </span>
                  </div>
                  {/* Corner handles */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full"></div>
                </div>
              )}
            </div>

            {/* Crop info */}
            {cropArea.width > 0 && cropArea.height > 0 && (
              <div className="mb-4 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="font-semibold">X:</span> {cropArea.x.toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-semibold">Y:</span> {cropArea.y.toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-semibold">רוחב:</span> {cropArea.width.toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-semibold">גובה:</span> {cropArea.height.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
              
            {/* Action buttons */}
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={handleCropComplete}
                disabled={cropArea.width === 0 || cropArea.height === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                ✂️ חתוך והמשך לעריכה
              </button>
              <button
                onClick={clearCropSelection}
                disabled={cropArea.width === 0 && cropArea.height === 0}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🗑️ נקה בחירה
              </button>
              <button
                onClick={() => {
                  // Skip cropping, go straight to annotation
                  setCroppedImage(capturedImage)
                  setShowCropModal(false)
                  setIsImageLoading(true)
                  setTimeout(() => {
                    setIsImageLoading(false)
                    setShowEditModal(true)
                  }, 100)
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                דלג על חיתוך
              </button>
              <button
                onClick={() => {
                  setShowCropModal(false)
                  setCapturedImage(null)
                  clearCropSelection()
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - AdvancedAnnotationCanvas has its own modal wrapper */}
      {showEditModal && (croppedImage || capturedImage || editedImage) && (
        <AdvancedAnnotationCanvas
          imageUrl={editedImage || croppedImage || capturedImage || ''}
          initialAnnotations={annotations}
          onAnnotationsChange={setAnnotations}
          onSave={handleEditComplete}
          onClose={() => {
            console.log('🚫 Close button clicked - closing annotation modal')
            // Clear ALL state to ensure modal doesn't show again
            setShowEditModal(false)
            setShowCropModal(false)
            setCapturedImage(null)
            setCroppedImage(null)
            setEditedImage(null)
            setAnnotations([])
            setCropArea({ x: 0, y: 0, width: 100, height: 100 })
            setIsImageLoading(false)
            setIsDrawingCrop(false)
            setCropStart({ x: 0, y: 0 })
            setCropEnd({ x: 0, y: 0 })
          }}
          width={1200}
          height={800}
        />
      )}
    </div>
  )
}