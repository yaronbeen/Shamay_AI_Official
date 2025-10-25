'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Settings, Camera, Save, Eye, RefreshCw } from 'lucide-react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { ValuationData } from '../ValuationWizard'
import 'react-image-crop/dist/ReactCrop.css'
import { useShumaDB } from '@/hooks/useShumaDB'

interface GovMapData {
  coordinates: {
    x: number
    y: number
    lat: number
    lng: number
  }
  govmapUrls: {
    cropMode0: string  // Clean map (no תצ"א)
    cropMode1: string  // With תצ"א overlay
  }
  extractedAt: string
  status: string
  confidence?: number
  address?: string
  annotations?: Annotation[]
  annotationCanvasData?: string
  screenshots?: Screenshots
}

interface Annotation {
  id?: string
  type: 'line' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand'
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  width?: number
  height?: number
  radius?: number
  text?: string
  color: string
  points?: { x: number, y: number }[]
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
  const [selectedCropMode, setSelectedCropMode] = useState<'0' | '1' | undefined>(undefined)
  const [currentCropMode, setCurrentCropMode] = useState<'0' | '1'>('0')
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [showCropTool, setShowCropTool] = useState(false)
  const [cropData, setCropData] = useState<{x: number, y: number, width: number, height: number} | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Cropping state
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [serverScreenshot, setServerScreenshot] = useState<string | null>(null)
  const [isCapturingServer, setIsCapturingServer] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)


  
  // Annotation drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState<'line' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand' | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)
  const [currentColor, setCurrentColor] = useState('#ff0000')
  const [annotationHistory, setAnnotationHistory] = useState<Annotation[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (sessionId && data) {
      loadGISAnalysis()
    }
  }, [sessionId, data])
  
  console.log('🔍 GISMapViewer data:', data)
  
  const loadGISAnalysis = async () => {
    try {
      console.log('📊 Loading existing GovMap analysis from session data...')
      
      // Safety check: ensure data is defined
      if (!data) {
        console.log('⚠️ Data prop is undefined, skipping load')
        return
      }
      
      // Load GIS analysis from ValuationData prop
      if (data.gisScreenshots) {
        console.log('📊 Setting GovMap data from props:', data.gisScreenshots)
        setGisData(data.gisScreenshots as GovMapData)
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
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading GovMap analysis:', error)
      setError('Failed to load GovMap analysis')
    }
  }

  // Debug function to check session data directly
  const debugSessionData = async () => {
    try {
      console.log('🔍 DEBUG: Checking session data directly...')
      const response = await fetch(`/api/session/${sessionId}`)
      const sessionData = await response.json()
      console.log('🔍 DEBUG: Full session data:', sessionData)
      console.log('🔍 DEBUG: Session data.data:', sessionData?.data)
      console.log('🔍 DEBUG: Session data.data.gisScreenshots:', sessionData?.data?.gisScreenshots)
      return sessionData
    } catch (error) {
      console.error('🔍 DEBUG: Error fetching session data:', error)
      return null
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
        const data = await response.json()
        if (data.success) {
          console.log('📊 GovMap analysis response:', data.measurements)
          setGisData(data.measurements)
          onAnalysisComplete?.(data.measurements)
          console.log('✅ GovMap analysis completed successfully')
        } else {
          setError(data.error || 'GovMap analysis failed')
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

  const getCurrentIframeUrl = () => {
    if (!gisData?.govmapUrls) return undefined
    return currentCropMode === '1' ? gisData.govmapUrls.cropMode1 : gisData.govmapUrls.cropMode0
  }

  const formatCoordinates = () => {
    if (!gisData?.coordinates) return 'לא זמין'
    const { x, y, lat, lng } = gisData.coordinates
    return `ITM: ${x.toFixed(2)}, ${y.toFixed(2)} | WGS84: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }

  const captureServerScreenshot = async (cropMode: '0' | '1') => {
    if (!gisData?.govmapUrls) {
      alert('לא ניתן לצלם - נתוני מפה לא זמינים')
      return
    }

    setIsCapturingServer(true)
    try {
      console.log(`📸 Capturing server-side screenshot for mode ${cropMode}`)
      
      const govmapUrl = cropMode === '0' ? gisData.govmapUrls.cropMode0 : gisData.govmapUrls.cropMode1
      
      const response = await fetch(`/api/session/${sessionId}/gis-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropMode,
          govmapUrl,
          annotations: [], // Don't include annotations yet - add them during cropping
          coordinates: gisData.coordinates
        })
      })
      
      if (!response.ok) {
        throw new Error(`Server screenshot failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`📸 Server screenshot result:`, result)
      
      if (result.success) {
        // Convert file path to base64 for display
        const imageResponse = await fetch(result.screenshotUrl)
        const imageBlob = await imageResponse.blob()
        const reader = new FileReader()
        reader.onload = () => {
          const base64Data = reader.result as string
          setServerScreenshot(base64Data)
          setSelectedCropMode(cropMode)
          // Don't open cropping modal yet - show image with crop button
          setShowEditModal(true)
          // Clear annotations for fresh start during cropping
          setAnnotations([])
        }
        reader.readAsDataURL(imageBlob)
      } else {
        throw new Error(result.error || 'Screenshot failed')
      }
        
    } catch (error) {
      console.error('❌ Error capturing server screenshot:', error)
      alert('שגיאה בצילום המפה מהשרת')
    } finally {
      setIsCapturingServer(false)
    }
  }

  const saveEditedImage = async (editedImageData: string) => {
    if (!selectedCropMode) return

    console.log(`📸 Saving edited image for crop mode ${selectedCropMode}`)
    
    setIsCapturing(true)
    try {
      // Ensure the image data is in proper base64 format
      const base64Data = ensureBase64Format(editedImageData)
      console.log(`📸 Saving screenshot for cropMode${selectedCropMode}:`, base64Data.substring(0, 100) + '...')

      // First, get the latest session data to ensure we have current screenshots
      const sessionResponse = await fetch(`/api/session/${sessionId}`)
      const sessionData = await sessionResponse.json()
      console.log(`📊 Current session data:`, sessionData)
      console.log(`📊 Session data.gisScreenshots:`, sessionData?.data?.gisScreenshots)
      
      const existingScreenshots = sessionData?.data?.gisScreenshots || {}
      console.log(`📊 Existing screenshots from session:`, existingScreenshots)
      
      const updatedScreenshots = {
        ...existingScreenshots,
        [`cropMode${selectedCropMode}`]: base64Data
      }
      
      const requestBody = {
        data: {
          ...sessionData.data,
          gisScreenshots: updatedScreenshots
        }
      }
      console.log(`📤 Sending request body:`, requestBody)
      console.log(`📤 Existing screenshots:`, existingScreenshots)
      console.log(`📤 Updated screenshots:`, updatedScreenshots)

      // Save directly to database with base64 data
      const result = await saveGISData(sessionId, updatedScreenshots)

      if (result.success) {
        console.log(`✅ Database save successful`)
        
        setScreenshots(prev => ({
          ...prev,
          [`cropMode${selectedCropMode}`]: base64Data
        }))

        setShowEditModal(false)
        setCapturedImage(null)
        setEditedImage(null)
        setSelectedCropMode(undefined)
        
        alert(`תמונת מפה ערוכה נשמרה בהצלחה! (מצב ${selectedCropMode === '0' ? 'נקייה' : 'תצ"א'})`)
      } else {
        const errorData = await result.error as string
        console.error('❌ Failed to save edited image:', errorData)
        alert('שגיאה בשמירת התמונה הערוכה')
      }
    } catch (error) {
      console.error('❌ Error saving edited image:', error)
      alert('שגיאה בשמירת התמונה הערוכה')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleEditComplete = (editedData: string) => {
    setEditedImage(editedData)
  }

  const handleSaveToSession = () => {
    if (editedImage) {
      saveEditedImage(editedImage)
    } else if (capturedImage) {
      saveEditedImage(capturedImage)
    }
  }

  const ensureBase64Format = (imageData: string): string => {
    console.log('🔍 ensureBase64Format input:', imageData?.substring(0, 100) + '...')
    
    // Check if already in base64 format
    if (imageData.startsWith('data:image/')) {
      console.log('✅ Already in data:image format')
      return imageData
    }
    
    // If it's raw base64 data (no comma), add the data URL prefix
    if (imageData && !imageData.includes(',')) {
      const result = `data:image/png;base64,${imageData}`
      console.log('✅ Added data:image prefix to raw base64')
      return result
    }
    
    // If it's already base64 with comma, return as is
    if (imageData.includes(',')) {
      console.log('✅ Already has comma, returning as-is')
      return imageData
    }
    
    // Default: assume it's raw base64 and add prefix
    const result = `data:image/png;base64,${imageData}`
    console.log('✅ Default case: added data:image prefix')
    return result
  }

  // Cropping functions
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        16 / 9,
        width,
        height
      ),
      width,
      height
    ))
  }, [])

  const getCroppedImg = useCallback((
    image: HTMLImageElement,
    crop: PixelCrop,
    fileName: string
  ): Promise<File> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('No 2d context')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio)
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio)

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'

    const cropX = crop.x * scaleX
    const cropY = crop.y * scaleY

    ctx.save()

    ctx.translate(-cropX, -cropY)
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    )

    ctx.restore()

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        const file = new File([blob], fileName, { type: 'image/png' })
        resolve(file)
      }, 'image/png')
    })
  }, [])

  // Undo/Redo functions
  const saveToHistory = useCallback((newAnnotations: Annotation[]) => {
    const newHistory = annotationHistory.slice(0, historyIndex + 1)
    newHistory.push([...newAnnotations])
    setAnnotationHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [annotationHistory, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setAnnotations([...annotationHistory[newIndex]])
    }
  }, [historyIndex, annotationHistory])

  const redo = useCallback(() => {
    if (historyIndex < annotationHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setAnnotations([...annotationHistory[newIndex]])
    }
  }, [historyIndex, annotationHistory])

  // Redraw annotations on canvas
  const redrawAnnotations = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match image display size
    canvas.width = img.offsetWidth
    canvas.height = img.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw annotations using display coordinates directly
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color
      ctx.lineWidth = 3

      if (annotation.type === 'line' && annotation.x1 !== undefined && annotation.y1 !== undefined && annotation.x2 !== undefined && annotation.y2 !== undefined) {
        ctx.beginPath()
        ctx.moveTo(annotation.x1, annotation.y1)
        ctx.lineTo(annotation.x2, annotation.y2)
        ctx.stroke()
      } else if (annotation.type === 'arrow' && annotation.x1 !== undefined && annotation.y1 !== undefined && annotation.x2 !== undefined && annotation.y2 !== undefined) {
        drawArrow(ctx, annotation.x1, annotation.y1, annotation.x2, annotation.y2)
      } else if (annotation.type === 'rectangle' && annotation.x !== undefined && annotation.y !== undefined && annotation.width !== undefined && annotation.height !== undefined) {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)
      } else if (annotation.type === 'circle' && annotation.x !== undefined && annotation.y !== undefined && annotation.radius !== undefined) {
        ctx.beginPath()
        ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (annotation.type === 'text' && annotation.x !== undefined && annotation.y !== undefined && annotation.text) {
        ctx.font = 'bold 16px Arial'
        ctx.fillText(annotation.text, annotation.x, annotation.y)
      }
    })
  }, [annotations])

  // Redraw when annotations change
  useEffect(() => {
    redrawAnnotations()
  }, [redrawAnnotations])

  // Auto-capture screenshot when cropping modal opens
  useEffect(() => {
    if (showCropTool && !serverScreenshot && gisData?.govmapUrls) {
      console.log('📸 Auto-capturing screenshot for cropping...')
      // Default to cropMode0 (clean map) for cropping
      captureServerScreenshot('0')
    }
  }, [showCropTool, serverScreenshot, gisData?.govmapUrls])

  const handleCropComplete = async () => {
    if (!serverScreenshot || !crop || !imgRef.current) return

    try {
      // Convert crop to pixel crop if needed
      const pixelCrop = crop.unit === 'px' ? crop : {
        unit: 'px' as const,
        x: (crop.x / 100) * imgRef.current.width,
        y: (crop.y / 100) * imgRef.current.height,
        width: (crop.width / 100) * imgRef.current.width,
        height: (crop.height / 100) * imgRef.current.height
      }
      
      const croppedImage = await getCroppedImg(
        imgRef.current,
        pixelCrop as any,
        `cropped_${selectedCropMode}_${Date.now()}.png`
      )

      const reader = new FileReader()
      reader.onload = async () => {
        const croppedDataUrl = reader.result as string
        
        console.log(`📸 Saving cropped image for crop mode ${selectedCropMode}`)
        
        // 1. Save file locally first
        const formData = new FormData()
        formData.append('file', croppedImage)
        formData.append('cropMode', selectedCropMode || '0')
        formData.append('annotations', JSON.stringify(annotations))
        
        const localSaveResponse = await fetch(`/api/session/${sessionId}/gis-screenshot`, {
          method: 'POST',
          body: formData
        })
        
        if (localSaveResponse.ok) {
          const localSaveResult = await localSaveResponse.json()
          console.log(`✅ File saved locally: ${localSaveResult.filePath}`)
        }
        
        // 2. Save base64 to database
        const updatedScreenshots = {
          [`cropMode${selectedCropMode}`]: croppedDataUrl
        }
        
        const result = await saveGISData(sessionId, updatedScreenshots)

        if (result.success) {
          console.log(`✅ Database save successful`)
          
          // Update local state
          setScreenshots(prev => ({
            ...prev,
            [`cropMode${selectedCropMode}`]: croppedDataUrl
          }))
          
          // Close cropping modal
          setShowCropTool(false)
          setServerScreenshot(null)
          setCrop(undefined)
          setCompletedCrop(undefined)
          setAnnotations([])
          
          alert('התמונה נחתכה ונשמרה בהצלחה!')
        } else {
          throw new Error('Failed to save to session')
        }
      }
      reader.readAsDataURL(croppedImage)
    } catch (error) {
      console.error('❌ Error cropping and saving image:', error)
      alert('שגיאה בגזירת התמונה ושמירתה')
    }
  }

  const handleCropImage = () => {
    if (!capturedImage) return
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      if (!cropData) {
        // No crop data, use full image
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        handleEditComplete(canvas.toDataURL('image/png'))
        setShowCropTool(false)
        return
      }
      
      // Apply crop
      canvas.width = cropData.width
      canvas.height = cropData.height
      ctx?.drawImage(
        img,
        cropData.x, cropData.y, cropData.width, cropData.height,
        0, 0, cropData.width, cropData.height
      )
      
      handleEditComplete(canvas.toDataURL('image/png'))
      setShowCropTool(false)
    }
    
    img.src = capturedImage
  }

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!drawingMode) return
    
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    
    // Use display coordinates (not natural coordinates)
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (drawingMode === 'text') {
      const text = prompt('הזן טקסט:')
      if (text) {
        const newAnnotation: Annotation = {
          type: 'text',
          x,
          y,
          text,
          color: currentColor
        }
        const newAnnotations = [...annotations, newAnnotation]
        setAnnotations(newAnnotations)
        saveToHistory(newAnnotations)
      }
    } else if (drawingMode === 'line' || drawingMode === 'arrow') {
      if (!isDrawing) {
        setIsDrawing(true)
        setStartX(x)
        setStartY(y)
      } else {
        const newAnnotation: Annotation = {
          type: drawingMode,
          x1: startX,
          y1: startY,
          x2: x,
          y2: y,
          color: currentColor
        }
        const newAnnotations = [...annotations, newAnnotation]
        setAnnotations(newAnnotations)
        saveToHistory(newAnnotations)
        setIsDrawing(false)
      }
    } else if (drawingMode === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2))
      const newAnnotation: Annotation = {
        type: 'circle',
        x: startX,
        y: startY,
        radius,
        color: currentColor
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    } else if (drawingMode === 'rectangle') {
      const newAnnotation: Annotation = {
        type: 'rectangle',
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
        color: currentColor
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    }
  }

  // Annotation drawing functions
  const startDrawing = (mode: 'line' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand') => {
    setDrawingMode(mode)
    setIsDrawing(true)
  }

  const clearAnnotations = () => {
    setAnnotations([])
    redrawCanvas()
    console.log('🗑️ Annotations cleared')
  }

  const undoLastAnnotation = () => {
    if (annotations.length > 0) {
      setAnnotations(prev => prev.slice(0, -1))
      redrawCanvas()
      console.log('↩️ Last annotation undone')
    }
  }

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all annotations
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color
      ctx.lineWidth = 3

      if (annotation.type === 'freehand' && annotation.points) {
        ctx.beginPath()
        annotation.points.forEach((p, i) => {
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
      } else if (annotation.type === 'arrow' && annotation.x1 && annotation.y1 && annotation.x2 && annotation.y2) {
        drawArrow(ctx, annotation.x1, annotation.y1, annotation.x2, annotation.y2)
      } else if (annotation.type === 'text' && annotation.x && annotation.y && annotation.text) {
        ctx.font = '20px Arial'
        ctx.fillText(annotation.text, annotation.x, annotation.y)
      }
    })
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

  const drawPreviewShape = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.strokeStyle = currentColor
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    if (drawingMode === 'rectangle') {
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
    } else if (drawingMode === 'circle') {
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      ctx.beginPath()
      ctx.arc(x1, y1, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (drawingMode === 'line') {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    } else if (drawingMode === 'arrow') {
      drawArrow(ctx, x1, y1, x2, y2)
    }

    ctx.setLineDash([])
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setStartX(x)
    setStartY(y)
    setIsDrawing(true)

    if (drawingMode === 'freehand') {
      setAnnotations(prev => [...prev, {
        type: 'freehand',
        color: currentColor,
        points: [{ x, y }]
      }])
    } else if (drawingMode === 'text') {
      const text = prompt('הזן טקסט:')
      if (text) {
        setAnnotations(prev => [...prev, {
          type: 'text',
          color: currentColor,
          x,
          y,
          text
        }])
        redrawCanvas()
      }
      setIsDrawing(false)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingMode) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (drawingMode === 'freehand') {
      setAnnotations(prev => {
        const newAnnotations = [...prev]
        const lastAnnotation = newAnnotations[newAnnotations.length - 1]
        if (lastAnnotation && lastAnnotation.points) {
          lastAnnotation.points.push({ x, y })
        }
        return newAnnotations
      })
      redrawCanvas()
    } else {
      // Preview shape
      redrawCanvas()
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawPreviewShape(ctx, startX, startY, x, y)
      }
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingMode) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (drawingMode === 'rectangle') {
      setAnnotations(prev => [...prev, {
        type: 'rectangle',
        color: currentColor,
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY)
      }])
    } else if (drawingMode === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2))
      setAnnotations(prev => [...prev, {
        type: 'circle',
        color: currentColor,
        x: startX,
        y: startY,
        radius
      }])
    } else if (drawingMode === 'line') {
      setAnnotations(prev => [...prev, {
        type: 'line',
        color: currentColor,
        x1: startX,
        y1: startY,
        x2: x,
        y2: y
      }])
    } else if (drawingMode === 'arrow') {
      setAnnotations(prev => [...prev, {
        type: 'arrow',
        color: currentColor,
        x1: startX,
        y1: startY,
        x2: x,
        y2: y
      }])
    }

    setIsDrawing(false)
    redrawCanvas()
  }

  console.log('🔍 GISData:', gisData)

  const saveAnnotations = async () => {
    if (!gisData || annotations.length === 0) return

    try {
      // Generate canvas data
      const canvas = canvasRef.current
      if (canvas) {
        const canvasData = canvas.toDataURL('image/png')
        
        // Save annotations to session
        const response = await fetch(`/api/session/${sessionId}/gis-annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            annotations,
            annotationCanvasData: canvasData,
            govmapUrls: gisData.govmapUrls
          })
        })

        if (response.ok) {
          console.log('✅ Annotations saved successfully')
        } else {
          console.error('❌ Failed to save annotations')
        }
      }
    } catch (error) {
      console.error('❌ Error saving annotations:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          מפת GovMap - מיקום הנכס
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={runGISAnalysis}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            {isLoading ? 'מנתח...' : 'הפעל ניתוח GovMap'}
          </button>
          
          
          
          
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">שגיאה בניתוח GovMap</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {gisData ? (
        <div className="space-y-6">
          {/* Property Coordinates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">קואורדינטות הנכס</h4>
            <p className="text-sm text-gray-600 font-mono">{formatCoordinates()}</p>
            {gisData.address && (
              <p className="text-sm text-gray-600 mt-1">כתובת: {gisData.address}</p>
            )}
            {gisData.confidence && (
              <p className="text-xs text-gray-500 mt-1">
                רמת ביטחון: {(gisData.confidence * 100).toFixed(1)}%
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              נשלף ב: {gisData?.extractedAt ? new Date(gisData.extractedAt).toLocaleString('he-IL') : 'לא זמין'}
            </p>
          </div>

          {/* Map Mode Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">מצב מפה:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentCropMode('1')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentCropMode === '1'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                מפה נקייה
              </button>
              <button
                onClick={() => setCurrentCropMode('0')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentCropMode === '0'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                מפת תצ"א
              </button>
            </div>
          </div>


          {/* Screenshot Buttons - Always available */}
          <div className="flex gap-2">
            <button
                onClick={() => captureServerScreenshot('1')}
                disabled={isCapturingServer}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCapturingServer ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isCapturingServer ? 'צלם...' : 'צלם מפה נקייה'}
              </button>
              <button
                onClick={() => captureServerScreenshot('0')}
                disabled={isCapturingServer}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCapturingServer ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isCapturingServer ? 'צלם...' : 'צלם מפת תצ"א'}
              </button>
            </div>

          {/* GovMap Iframe */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 text-sm text-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                מפת GovMap - {currentCropMode === '0' ? 'מפה נקייה' : 'מפת תצ"א'}
              </div>
              {getCurrentIframeUrl() && (
                <a
                  href={getCurrentIframeUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                  title={getCurrentIframeUrl()}
                >
                  פתח במפה חדשה
                </a>
              )}
            </div>
            
            {gisData?.govmapUrls && getCurrentIframeUrl() && (
              <div className="space-y-2">
                <div className="relative">
                  <iframe
                    ref={iframeRef}
                    src={getCurrentIframeUrl()}
                    width="1200"
                    height="800"
                    frameBorder="0"
                    allowFullScreen
                    className="border border-gray-300 rounded-lg shadow-sm"
                    title="GovMap - מפת הנכס"
                    onLoad={() => console.log('✅ GovMap iframe loaded successfully')}
                    onError={(e) => console.error('❌ GovMap iframe error:', e)}
                  />
                  
                  {/* Annotation Canvas Overlay */}
                  
                  {/* Drawing Mode Indicator */}
                  {isDrawing && drawingMode && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm">
                      מצב ציור: {drawingMode === 'line' ? 'קו' : 
                                 drawingMode === 'rectangle' ? 'מלבן' :
                                 drawingMode === 'circle' ? 'עיגול' :
                                 drawingMode === 'arrow' ? 'חץ' : 'טקסט'}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  {currentCropMode === '0' ? 'מפה נקייה ללא תצ"א' : 'מפה עם תצ"א (רישום מקרקעין)'}
                  {annotations.length > 0 && ` - ${annotations.length} סימונים`}
                </div>
              </div>
            )}
          </div>

          {/* Annotations List */}
          {annotations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-3">הערות על המפה ({annotations.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {annotations.map((annotation, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: annotation.color }}
                      />
                      <span className="text-sm text-gray-700">
                        {annotation.type === 'freehand' ? 'ציור חופשי' :
                         annotation.type === 'line' ? 'קו ישר' :
                         annotation.type === 'rectangle' ? 'מלבן' :
                         annotation.type === 'circle' ? 'עיגול' :
                         annotation.type === 'arrow' ? 'חץ' :
                         annotation.type === 'text' ? `טקסט: ${annotation.text}` : annotation.type}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setAnnotations(prev => prev.filter((_, i) => i !== index))
                        redrawCanvas()
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      מחק
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots Display */}
          {(screenshots.cropMode0 || screenshots.cropMode1) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">תמונות מפות GovMap</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.cropMode0 && (
                  <div className="text-center">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">מפה נקייה</h5>
                    <img 
                      src={screenshots.cropMode0} 
                      alt="GovMap Screenshot - Clean Map"
                      className="w-full max-w-sm mx-auto border border-gray-300 rounded-lg shadow-sm"
                      onError={(e) => {
                        console.error('❌ Failed to load screenshot cropMode0:', e)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                {screenshots.cropMode1 && (
                  <div className="text-center">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">מפת תצ"א</h5>
                    <img 
                      src={screenshots.cropMode1} 
                      alt="GovMap Screenshot - Land Registry Map"
                      className="w-full max-w-sm mx-auto border border-gray-300 rounded-lg shadow-sm"
                      onError={(e) => {
                        console.error('❌ Failed to load screenshot cropMode1:', e)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium mb-2 text-blue-900">
              מפה זמינה
            </h4>
            <div className="text-sm text-blue-700">
              <p>✅ ניתוח GovMap הושלם בהצלחה</p>
              <p>📍 קואורדינטות: {gisData?.coordinates?.x}, {gisData?.coordinates?.y}</p>
              <p>🗺️ מפות GovMap זמינות בשני מצבים</p>
              <p>📸 לחצו על כפתורי הצילום כדי לצלם את המפה</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">לא בוצע ניתוח GovMap עדיין</p>
          <p className="text-sm text-gray-500">
            לחץ על "הפעל ניתוח GovMap" כדי להתחיל את הניתוח
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (capturedImage || serverScreenshot) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                עריכת תמונת המפה
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setCapturedImage(null)
                  setServerScreenshot(null)
                  setEditedImage(null)
                  setSelectedCropMode(undefined)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Image Display */}
              <div className="text-center relative">
                <img 
                  src={editedImage || serverScreenshot || capturedImage || ''} 
                  alt="Captured Map"
                  className="max-w-full max-h-96 mx-auto border border-gray-300 rounded-lg shadow-sm cursor-crosshair"
                  onClick={handleImageClick}
                  style={{ 
                    cursor: showCropTool ? 'crosshair' : 'default',
                    position: 'relative'
                  }}
                />
                
              </div>
              
              {/* Edit Controls */}
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setShowCropTool(true)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  ✂️ חיתוך תמונה
                </button>
                
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 justify-center pt-4 border-t">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setServerScreenshot(null)
                    setCapturedImage(null)
                    setEditedImage(null)
                    setSelectedCropMode(undefined)
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cropping Modal with Annotations */}
      {showCropTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-7xl max-h-[95vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                חיתוך תמונת המפה והוספת הערות
              </h3>
              <button
                onClick={() => {
                  setShowCropTool(false)
                  setServerScreenshot(null)
                  setCrop(undefined)
                  setCompletedCrop(undefined)
                  setAnnotations([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Image with Crop Tool */}
              <div className="lg:col-span-2">
                <div className="text-center relative">
                  {isCapturingServer ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                      <p className="text-lg text-gray-600">מצלם את המפה...</p>
                      <p className="text-sm text-gray-500">אנא המתן</p>
                    </div>
                  ) : serverScreenshot ? (
                    <div className="relative">
                      {crop ? (
                        // Show ReactCrop when cropping is enabled
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={(c) => setCompletedCrop(c)}
                          aspect={16 / 9}
                          className="max-w-full"
                        >
                          <img
                            ref={imgRef}
                            alt="Screenshot to crop"
                            src={serverScreenshot}
                            onLoad={onImageLoad}
                            className="max-w-full max-h-96 mx-auto border border-gray-300 rounded-lg shadow-sm"
                          />
                        </ReactCrop>
                      ) : (
                        // Show annotation mode when not cropping
                        <div className="relative">
                          <img
                            ref={imgRef}
                            alt="Screenshot to annotate"
                            src={serverScreenshot}
                            onLoad={onImageLoad}
                            className="max-w-full max-h-96 mx-auto border border-gray-300 rounded-lg shadow-sm"
                          />
                          {/* Annotations overlay */}
                          <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-auto"
                            style={{ maxWidth: '100%', maxHeight: '384px' }}
                            onClick={(e) => handleImageClick(e as any)}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onDoubleClick={(e) => handleImageClick(e as any)}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Camera className="w-8 h-8 text-gray-400 mb-4" />
                      <p className="text-lg text-gray-600">מכין צילום...</p>
                    </div>
                  )}
                </div>
                
                {/* Mode Instructions */}
                {serverScreenshot && (
                  <div className="text-center text-sm p-3 rounded mt-2">
                    {crop ? (
                      <div className="text-blue-600 bg-blue-50">
                        🔧 מצב חיתוך: גרור את הפינות כדי לבחור את האזור הרצוי לחיתוך
                      </div>
                    ) : (
                      <div className="text-green-600 bg-green-50">
                        ✏️ מצב הערות: השתמש בכלי ההערות כדי להוסיף קווים, טקסט וצורות לתמונה
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Annotation Tools */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {!serverScreenshot ? 'ממתין לצילום...' : 
                     crop ? 'מצב חיתוך' : 'כלי הערות'}
                  </h4>
                  
                  {/* Drawing Tools */}
                  {serverScreenshot && !crop && (
                    <div className="space-y-2 mb-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { mode: 'line', icon: '📏', label: 'קו' },
                          { mode: 'rectangle', icon: '⬜', label: 'מלבן' },
                          { mode: 'circle', icon: '⭕', label: 'עיגול' },
                          { mode: 'arrow', icon: '➡️', label: 'חץ' },
                          { mode: 'text', icon: '📝', label: 'טקסט' },
                          { mode: 'freehand', icon: '✏️', label: 'יד חופשית' }
                        ].map(tool => (
                          <button
                            key={tool.mode}
                            onClick={() => setDrawingMode(tool.mode as any)}
                            className={`px-3 py-2 text-sm rounded-lg border ${
                              drawingMode === tool.mode
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {tool.icon} {tool.label}
                          </button>
                        ))}
                      </div>
                      
                      {/* Undo/Redo Buttons */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={undo}
                          disabled={historyIndex <= 0}
                          className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ↶ בטל
                        </button>
                        <button
                          onClick={redo}
                          disabled={historyIndex >= annotationHistory.length - 1}
                          className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ↷ חזור
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Color Picker */}
                  {serverScreenshot && !crop && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">צבע</label>
                      <div className="flex gap-2">
                        {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'].map(color => (
                          <button
                            key={color}
                            onClick={() => setCurrentColor(color)}
                            className={`w-8 h-8 rounded-full border-2 ${
                              currentColor === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Annotations */}
                  {serverScreenshot && !crop && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">הערות נוכחיות ({annotations.length})</h5>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {annotations.map((annotation, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: annotation.color }}
                              />
                              <span className="text-sm">{annotation.type}</span>
                            </div>
                            <button
                              onClick={() => setAnnotations(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // Enable cropping mode by setting initial crop
                        if (imgRef.current) {
                          const { width, height } = imgRef.current
                          const cropWidth = Math.min(width, height * 16 / 9)
                          const cropHeight = cropWidth * 9 / 16
                          const cropX = (width - cropWidth) / 2
                          const cropY = (height - cropHeight) / 2
                          
                          setCrop({
                            unit: 'px',
                            x: cropX,
                            y: cropY,
                            width: cropWidth,
                            height: cropHeight
                          })
                        }
                      }}
                      disabled={!serverScreenshot}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {crop ? '✂️ עריכת חיתוך' : '✂️ התחל חיתוך'}
                    </button>

                    <button
                      onClick={handleCropComplete}
                      disabled={!crop || !serverScreenshot}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4" />
                      שמור תמונה
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowCropTool(false)
                        setServerScreenshot(null)
                        setCrop(undefined)
                        setCompletedCrop(undefined)
                        setAnnotations([])
                      }}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}