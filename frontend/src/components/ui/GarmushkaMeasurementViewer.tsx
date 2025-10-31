'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { KonvaEventObject } from 'konva/lib/Node'
import useImage from 'use-image'
import { ValuationData } from '../ValuationWizard'

// Dynamic imports to avoid SSR issues
let Stage: any
let Layer: any
let KonvaImage: any
let Line: any
let Circle: any
let Text: any
let Group: any

if (typeof window !== 'undefined') {
  const konva = require('react-konva')
  Stage = konva.Stage
  Layer = konva.Layer
  KonvaImage = konva.Image
  Line = konva.Line
  Circle = konva.Circle
  Text = konva.Text
  Group = konva.Group
}

interface GarmushkaMeasurementViewerProps {
  sessionId: string
  onMeasurementComplete: (measurementData: any) => void
  initialMeasurements?: any
  initialFileUrl?: string // optional: pass selected file URL from Step 3
  data?: any // ValuationData for accessing buildingImage, exteriorImage, etc.
}

interface Point {
  x: number
  y: number
}

interface Shape {
  id: string
  type: 'calibration' | 'polyline' | 'polygon'
  points: Point[]
  name: string
  notes?: string
  realWorldLength?: number
  color?: string
}

interface PDFPageInfo {
  pageNumber: number
  width: number
  height: number
  imageUrl: string
}

type ToolMode = 'calibrate' | 'polyline' | 'polygon' | 'pan'
type UnitMode = 'metric' | 'imperial'

// Load PDF.js from CDN only (avoid webpack bundling)
let pdfjs: any = null

const loadPdfJs = async (): Promise<any> => {
  if (pdfjs) return pdfjs
  
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used on the client side')
  }
  
  try {
    // Check if PDF.js is already loaded globally
    if ((window as any).pdfjsLib) {
      pdfjs = (window as any).pdfjsLib
      return pdfjs
    }
    
    // Load from CDN using script tag
    return new Promise((resolve, reject) => {
      // Check if script is already loading
      if (document.getElementById('pdfjs-script')) {
        const checkInterval = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(checkInterval)
            pdfjs = (window as any).pdfjsLib
            resolve(pdfjs)
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkInterval)
          reject(new Error('PDF.js loading timeout'))
        }, 10000)
        return
      }
      
      const script = document.createElement('script')
      script.id = 'pdfjs-script'
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js'
      script.async = true
      script.crossOrigin = 'anonymous'
      
      script.onload = () => {
        setTimeout(() => {
          const win = window as any
          pdfjs = win.pdfjsLib || win.pdfjs || win['pdfjs-dist']
          
          if (!pdfjs) {
            const possibleNames = ['pdfjs', 'pdfjsLib', 'pdfjs-dist', 'pdf']
            for (const name of possibleNames) {
              if (win[name] && typeof win[name].getDocument === 'function') {
                pdfjs = win[name]
                break
              }
            }
          }
          
          if (pdfjs && typeof pdfjs.getDocument === 'function') {
            let version = '3.11.174'
            if (pdfjs.version) {
              version = String(pdfjs.version).replace(/^v/, '') || '3.11.174'
            }
            
            if (!pdfjs.GlobalWorkerOptions) {
              pdfjs.GlobalWorkerOptions = {}
            }
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.js`
            
            win.pdfjsLib = pdfjs
            console.log('✅ PDF.js loaded successfully from CDN')
            resolve(pdfjs)
          } else {
            reject(new Error('PDF.js loaded but getDocument method not found'))
          }
        }, 100)
      }
      
      script.onerror = () => {
        reject(new Error('Failed to load PDF.js from CDN'))
      }
      
      document.head.appendChild(script)
    })
  } catch (error) {
    console.error('Failed to load PDF.js:', error)
    throw error
  }
}

const KonvaImageComponent: React.FC<{ src: string }> = ({ src }) => {
  const [image] = useImage(src)
  return KonvaImage ? <KonvaImage image={image} /> : null
}

export default function GarmushkaMeasurementViewer({ 
  sessionId, 
  onMeasurementComplete,
  initialMeasurements,
  initialFileUrl
}: GarmushkaMeasurementViewerProps) {
  const [isClient, setIsClient] = useState(false)
  const [isRestoring, setIsRestoring] = useState<boolean>(true)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [pdfPages, setPdfPages] = useState<PDFPageInfo[]>([])
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0)
  const [isPdfMode, setIsPdfMode] = useState<boolean>(false)
  
  // Measurement system state
  const [toolMode, setToolMode] = useState<ToolMode>('pan')
  const [unitMode, setUnitMode] = useState<UnitMode>('metric')
  const [shapes, setShapes] = useState<Shape[]>([])
  const [currentShape, setCurrentShape] = useState<Point[]>([])
  const [metersPerPixel, setMetersPerPixel] = useState<number>(0)
  const [scale, setScale] = useState<number>(1)
  const [stagePosition, setStagePosition] = useState<Point>({ x: 0, y: 0 })
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [showCalibrationDialog, setShowCalibrationDialog] = useState<boolean>(false)
  const [calibrationLength, setCalibrationLength] = useState<string>('')
  const [calibrationShapeId, setCalibrationShapeId] = useState<string | null>(null)
  const [isDrawingCalibration, setIsDrawingCalibration] = useState<boolean>(false)
  const [canUndo, setCanUndo] = useState<boolean>(false)
  const [history, setHistory] = useState<{shapes: Shape[], metersPerPixel: number}[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [editingNotes, setEditingNotes] = useState<string>('')
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [previousTool, setPreviousTool] = useState<ToolMode>('pan')
  const [temporaryPanMode, setTemporaryPanMode] = useState<boolean>(false)
  const [showNameDialog, setShowNameDialog] = useState<boolean>(false)
  const [pendingShapeId, setPendingShapeId] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const [saveCropArea, setSaveCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showDebugData, setShowDebugData] = useState<boolean>(false)
  const [measurementTable, setMeasurementTable] = useState<Array<{
    id: string
    name: string
    type: 'calibration' | 'polyline' | 'polygon'
    measurement: string
    notes: string
    color: string
  }>>([])
  
  const stageRef = useRef<any>(null)
  const imageSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
  
  // Color palette for different areas
  const areaColors = [
    '#3b82f6', // Blue
    '#16a34a', // Green  
    '#dc2626', // Red
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#be123c', // Rose
    '#059669', // Emerald
    '#7c2d12', // Brown
    '#4338ca', // Indigo
  ]

  // Get next available color for new areas
  const getNextAreaColor = () => {
    const usedColors = shapes
      .filter(shape => shape.type === 'polygon')
      .map(shape => shape.color)
      .filter(Boolean)
    
    for (const color of areaColors) {
      if (!usedColors.includes(color)) {
        return color
      }
    }
    // If all colors are used, cycle back to the beginning
    return areaColors[shapes.filter(s => s.type === 'polygon').length % areaColors.length]
  }

  // Client-side rendering check
  useEffect(() => {
    setIsClient(true)
  }, [])

  const renderPDFPage = async (pdf: any, pageNumber: number): Promise<PDFPageInfo> => {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.0 })
    
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }
    
    await page.render(renderContext).promise
    
    const imageUrl = canvas.toDataURL('image/png')
    
    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      imageUrl
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError('')
    // Do not clear canvas state here; preserve unless user explicitly clears

    try {
      // First, upload the file to storage (like GIS screenshots and other documents)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'garmushka') // Type for garmushka measurements

      console.log(`📤 Uploading Garmushka file: ${file.name} (${file.size} bytes)`)

      const uploadResponse = await fetch(`/api/session/${sessionId}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error(`File upload failed: ${uploadResponse.statusText}`)
      }

      const uploadResult = await uploadResponse.json()
      console.log(`✅ File uploaded successfully:`, uploadResult)

      // Get the file URL from upload result
      const fileUrl = uploadResult.uploadEntry?.url || uploadResult.file?.url || `/api/files/${sessionId}/${uploadResult.file?.fileName || file.name}`

      // Store the file URL (not data URL) for persistence
      try {
        sessionStorage.setItem(`garmushka:${sessionId}:fileType`, file.type === 'application/pdf' ? 'pdf' : 'image')
        sessionStorage.setItem(`garmushka:${sessionId}:fileUrl`, fileUrl)
        sessionStorage.setItem(`garmushka:${sessionId}:fileName`, file.name)
        sessionStorage.setItem(`garmushka:${sessionId}:updatedAt`, new Date().toISOString())
      } catch {}

      // Now process the file for display
      if (file.type === 'application/pdf') {
        // Handle PDF files with improved error handling
        try {
          const pdfjsLib = await loadPdfJs()
          const arrayBuffer = await file.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
          const pages: PDFPageInfo[] = []
          const numPages = pdf.numPages
          
          // Render first page immediately
          const firstPage = await renderPDFPage(pdf, 1)
          pages.push(firstPage)
          
          // Render remaining pages in background
          for (let i = 2; i <= numPages; i++) {
            const pageInfo = await renderPDFPage(pdf, i)
            pages.push(pageInfo)
          }
          
          setPdfPages(pages)
          setSelectedPageIndex(0)
          setImageUrl(firstPage.imageUrl)
          setIsPdfMode(true)
          
          // Store file URL (not data URL) for later loading
          try {
            sessionStorage.setItem(`garmushka:${sessionId}:fileData`, firstPage.imageUrl || '') // Keep data URL for canvas rendering
            sessionStorage.setItem(`garmushka:${sessionId}:fileUrl`, fileUrl) // Store server URL for persistence
          } catch {}
          setIsLoading(false)
        } catch (pdfError) {
          console.error('PDF processing failed:', pdfError)
          setError('עיבוד PDF נכשל. נא להעלות קובץ תמונה במקום.')
          setIsLoading(false)
        }
        
      } else if (file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        // Handle regular image files
        // Use the uploaded file URL directly (no need for data URL if file is on server)
        setImageUrl(fileUrl)
        setIsPdfMode(false)
        setPdfPages([])
        setSelectedPageIndex(0)
        setError('')
        setIsLoading(false)
      } else {
        setError('נא להעלות קובץ PDF או תמונה (PDF, JPG, PNG, SVG)')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('File upload error:', err)
      setError(`עיבוד הקובץ נכשל: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
      setIsLoading(false)
    }
  }

  // Restore last uploaded file on mount to avoid clearing canvas between steps (sessionStorage only)
  React.useEffect(() => {
    try {
      if (!imageUrl) {
        const lastType = sessionStorage.getItem(`garmushka:${sessionId}:fileType`)
        const lastData = sessionStorage.getItem(`garmushka:${sessionId}:fileData`)
        if (lastData) {
          if (lastType === 'pdf') {
            setIsPdfMode(true)
          }
          setImageUrl(lastData)
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load from URL (similar to Step3Validation display logic) and render to canvas
  const loadFromUrl = useCallback(async (fileUrl: string) => {
    try {
      if (!fileUrl) return
      const lower = fileUrl.toLowerCase()
      const isPdf = lower.endsWith('.pdf') || lower.includes('application/pdf')

      setIsLoading(true)
      setError('')

      if (isPdf) {
        const pdfjsLib = await loadPdfJs()
        // Prefer opening by URL (lets PDF.js stream the file)
        const pdf = await pdfjsLib.getDocument({ url: fileUrl, withCredentials: false }).promise
        const firstPage = await renderPDFPage(pdf, 1)
        setPdfPages([firstPage])
        setSelectedPageIndex(0)
        setImageUrl(firstPage.imageUrl)
        setIsPdfMode(true)
        try {
          sessionStorage.setItem(`garmushka:${sessionId}:fileType`, 'pdf')
          sessionStorage.setItem(`garmushka:${sessionId}:fileData`, firstPage.imageUrl || '')
          sessionStorage.setItem(`garmushka:${sessionId}:fileUrl`, fileUrl)
          sessionStorage.setItem(`garmushka:${sessionId}:updatedAt`, new Date().toISOString())
        } catch {}
      } else {
        // Assume it's an image URL
        setIsPdfMode(false)
        setPdfPages([])
        setSelectedPageIndex(0)
        setImageUrl(fileUrl)
        try {
          sessionStorage.setItem(`garmushka:${sessionId}:fileType`, 'image')
          sessionStorage.setItem(`garmushka:${sessionId}:fileData`, fileUrl)
          sessionStorage.setItem(`garmushka:${sessionId}:fileUrl`, fileUrl)
          sessionStorage.setItem(`garmushka:${sessionId}:updatedAt`, new Date().toISOString())
        } catch {}
      }
    } catch (e: any) {
      console.error('Failed to load file from URL:', e)
      setError('טעינת קובץ מהקישור נכשלה')
    } finally {
      setIsLoading(false)
    }
  }, [renderPDFPage, sessionId])

  // Try to restore by URL first (more consistent with Step3), fallback to data URL
  useEffect(() => {
    let didCancel = false
    const restore = async () => {
      try {
        // Priority: 
        // 1. Check session uploads for garmushka files (uploaded files)
        // 2. sessionStorage URL for this session
        // 3. initialFileUrl prop
        // 4. sessionStorage data URL (fallback)
        
        // First check session uploads
        if (sessionId && !imageUrl) {
          try {
            const response = await fetch(`/api/session/${sessionId}`)
            if (response.ok) {
              const sessionData = await response.json()
              const uploads = sessionData?.data?.uploads || []
              // Find garmushka uploads
              const garmushkaUploads = uploads.filter((u: any) => {
                const type = (u.type || '').toLowerCase()
                return type === 'garmushka'
              })
              
              if (garmushkaUploads.length > 0) {
                const lastUpload = garmushkaUploads[garmushkaUploads.length - 1] // Get most recent
                const fileUrl = lastUpload.url || lastUpload.preview
                if (fileUrl) {
                  console.log(`📁 Restoring Garmushka file from session uploads: ${fileUrl}`)
                  try {
                    await loadFromUrl(fileUrl)
                    return // Success, exit early
                  } catch (err) {
                    console.warn('Failed to load from upload URL:', err)
                    // Continue to fallbacks
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to check session uploads:', e)
            // Continue to fallbacks
          }
        }
        
        // Fallback to sessionStorage URL
        const sessionUrl = sessionStorage.getItem(`garmushka:${sessionId}:fileUrl`)
        const storedUrl = sessionUrl || initialFileUrl || ''
        const storedType = sessionStorage.getItem(`garmushka:${sessionId}:fileType`)
        const storedData = sessionStorage.getItem(`garmushka:${sessionId}:fileData`)
        
        if (storedUrl) {
          try {
            await loadFromUrl(storedUrl)
          } catch (err) {
            // Fallback to data URL if URL loading fails (CORS, auth, etc.)
            if (storedData) {
              if (storedType === 'pdf') {
                setIsPdfMode(true)
              }
              setImageUrl(storedData)
            }
          }
        } else if (storedData) {
          if (storedType === 'pdf') {
            // storedData is a data URL of the first page; just apply it
            setIsPdfMode(true)
          }
          setImageUrl(storedData)
        }
      } catch (e) {
        // ignore
      } finally {
        if (!didCancel) setIsRestoring(false)
      }
    }
    restore()
    return () => { didCancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFileUrl, sessionId])


  // Provide an explicit clear action that also clears persistence
  const clearCanvasAndMemory = React.useCallback(() => {
    setPdfPages([])
    setSelectedPageIndex(0)
    setIsPdfMode(false)
    setImageUrl('')
    try {
      localStorage.removeItem('garmushka:lastFileType')
      localStorage.removeItem('garmushka:lastFileData')
      localStorage.removeItem('garmushka:lastUpdatedAt')
    } catch {}
  }, [])

  const handlePageSelect = (pageIndex: number) => {
    if (pdfPages[pageIndex]) {
      setSelectedPageIndex(pageIndex)
      setImageUrl(pdfPages[pageIndex].imageUrl)
    }
  }

  const clearImage = () => {
    setImageUrl('')
    setError('')
    setPdfPages([])
    setIsPdfMode(false)
    setSelectedPageIndex(0)
    setShapes([])
    setCurrentShape([])
    setMetersPerPixel(0)
    setScale(1)
    setStagePosition({ x: 0, y: 0 })
    setSelectedShapeId(null)
    try {
      sessionStorage.removeItem(`garmushka:${sessionId}:fileType`)
      sessionStorage.removeItem(`garmushka:${sessionId}:fileData`)
      sessionStorage.removeItem(`garmushka:${sessionId}:fileUrl`)
      sessionStorage.removeItem(`garmushka:${sessionId}:updatedAt`)
    } catch {}
  }

  // Measurement utility functions
  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  const calculatePolylineLength = (points: Point[]): number => {
    let totalLength = 0
    for (let i = 1; i < points.length; i++) {
      totalLength += calculateDistance(points[i - 1], points[i])
    }
    return totalLength * metersPerPixel
  }

  const calculatePolygonArea = (points: Point[]): number => {
    if (points.length < 3) return 0
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y - points[j].x * points[i].y
    }
    return Math.abs(area) / 2 * metersPerPixel * metersPerPixel
  }

  const formatMeasurement = (value: number, type: 'length' | 'area'): string => {
    if (type === 'length') {
      if (unitMode === 'metric') {
        return value >= 1 ? `${value.toFixed(2)} m` : `${(value * 100).toFixed(0)} cm`
      } else {
        const feet = value * 3.28084
        return feet >= 1 ? `${feet.toFixed(2)} ft` : `${(feet * 12).toFixed(0)} in`
      }
    } else {
      if (unitMode === 'metric') {
        return `${value.toFixed(2)} m²`
      } else {
        const sqFeet = value * 10.7639
        return `${sqFeet.toFixed(2)} ft²`
      }
    }
  }

  // Get color for shape based on type and assigned color
  const getShapeColor = (shape: Shape): string => {
    if (shape.type === 'calibration') return '#f59e0b'
    if (shape.type === 'polyline') return '#3b82f6'
    if (shape.type === 'polygon') {
      // Use assigned color if available, otherwise fall back to index-based color
      return shape.color || areaColors[shapes.filter(s => s.type === 'polygon' && s.id <= shape.id).length % areaColors.length]
    }
    return '#3b82f6'
  }

  // Calculate center point of polygon for label placement
  const getPolygonCenter = (points: Point[]): Point => {
    if (points.length === 0) return { x: 0, y: 0 }
    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    return {
      x: sumX / points.length,
      y: sumY / points.length
    }
  }

  // Update shape name
  const updateShapeName = (id: string, newName: string) => {
    saveToHistory()
    setShapes(prev => prev.map(s => 
      s.id === id ? { ...s, name: newName } : s
    ))
  }

  // Start editing shape name
  const startEditing = (id: string, currentName: string) => {
    setEditingShapeId(id)
    setEditingName(currentName)
  }

  // Finish editing shape name
  const finishEditing = () => {
    if (editingShapeId && editingName.trim()) {
      updateShapeName(editingShapeId, editingName.trim())
    }
    setEditingShapeId(null)
    setEditingName('')
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingShapeId(null)
    setEditingName('')
  }

  // Enter temporary pan mode without losing current measurement
  const enterTemporaryPanMode = () => {
    if (toolMode !== 'pan') {
      setPreviousTool(toolMode)
      setTemporaryPanMode(true)
      setToolMode('pan')
    }
  }

  // Exit temporary pan mode and return to previous tool
  const exitTemporaryPanMode = () => {
    if (temporaryPanMode) {
      setToolMode(previousTool)
      setTemporaryPanMode(false)
    }
  }

  // Handle tool mode change with temporary pan logic
  const handleToolChange = (newTool: ToolMode) => {
    if (temporaryPanMode && newTool !== 'pan') {
      // If we're in temporary pan and switching to a different tool, reset
      setTemporaryPanMode(false)
    }
    
    if (newTool === 'pan' && (currentShape.length > 0 || isDrawingCalibration)) {
      // If we have an active measurement and switch to pan, make it temporary
      setPreviousTool(toolMode)
      setTemporaryPanMode(true)
    } else if (currentShape.length > 0 || showCalibrationDialog) {
      // If switching tools with active measurement, cancel it (unless it's temporary pan)
      if (!temporaryPanMode) {
        cancelCurrentAction()
      }
    }
    
    setToolMode(newTool)
  }

  // History management - save current state before making changes
  const saveToHistory = () => {
    const newHistoryItem = {
      shapes: [...shapes],
      metersPerPixel: metersPerPixel
    }
    
    // Don't save if nothing changed
    const lastHistory = history[historyIndex]
    if (lastHistory && 
        JSON.stringify(lastHistory.shapes) === JSON.stringify(newHistoryItem.shapes) &&
        lastHistory.metersPerPixel === newHistoryItem.metersPerPixel) {
      return
    }

    // Remove any history after current index
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newHistoryItem)
    
    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(prev => prev + 1)
    }
    
    setHistory(newHistory)
    setCanUndo(true)
  }

  const undo = () => {
    if (historyIndex >= 0) {
      const prevState = historyIndex > 0 ? history[historyIndex - 1] : { shapes: [], metersPerPixel: 0 }
      setShapes(prevState.shapes)
      setMetersPerPixel(prevState.metersPerPixel)
      setHistoryIndex(prev => prev - 1)
      setCanUndo(historyIndex > 0)
    }
    
    // Cancel any ongoing drawing
    setCurrentShape([])
    setToolMode('pan')
    setShowCalibrationDialog(false)
    setIsDrawingCalibration(false)
  }

  const cancelCurrentAction = () => {
    setCurrentShape([])
    setShowCalibrationDialog(false)
    setIsDrawingCalibration(false)
    setTemporaryPanMode(false)
    if (toolMode === 'calibrate' || toolMode === 'pan') {
      setToolMode('pan')
    }
  }

  // Canvas event handlers
  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    // Don't handle middle mouse button clicks (wheel clicks)
    if (e.evt.button === 1) return
    
    // Don't handle clicks during pan operations
    if (toolMode === 'pan') return
    
    // Don't handle clicks if this was a drag operation
    if (Math.abs(e.evt.movementX) > 3 || Math.abs(e.evt.movementY) > 3) return
    
    // Don't handle right-clicks
    if (e.evt.button === 2) return
    
    // Only handle left clicks for measurements
    if (e.evt.button !== 0) return
    

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    const point = {
      x: (pos.x - stagePosition.x) / scale,
      y: (pos.y - stagePosition.y) / scale
    }

    if (toolMode === 'calibrate') {
      if (currentShape.length === 0) {
        setCurrentShape([point])
        setIsDrawingCalibration(true)
      } else if (currentShape.length === 1) {
        const newShape: Shape = {
          id: Date.now().toString(),
          type: 'calibration',
          points: [currentShape[0], point],
          name: 'קו כיול'
        }
        
        setShapes(prev => [...prev, newShape])
        setCalibrationShapeId(newShape.id)
        setShowCalibrationDialog(true)
        setCurrentShape([])
        setIsDrawingCalibration(false)
      }
    } else if (toolMode === 'polyline') {
      setCurrentShape(prev => [...prev, point])
    } else if (toolMode === 'polygon') {
      const newPoints = [...currentShape, point]
      setCurrentShape(newPoints)
      
      // Auto-close polygon after 3 or more points if clicking near the first point
      if (newPoints.length >= 3) {
        const distToFirst = calculateDistance(point, newPoints[0])
        if (distToFirst < 20 / scale) {
          // Close polygon by removing last point and using first point
          setCurrentShape(newPoints.slice(0, -1))
          finishShape()
          return
        }
      }
    }
  }

  const handleStageDoubleClick = () => {
    if (toolMode === 'polyline') {
      finishShape()
    } else if (toolMode === 'polygon' && currentShape.length >= 3) {
      finishShape()
    }
  }

  const finishShape = () => {
    if (currentShape.length < 2) {
      setCurrentShape([])
      return
    }

    // Save current state to history before adding new shape
    saveToHistory()

    const newShape: Shape = {
      id: Date.now().toString(),
      type: toolMode === 'polyline' ? 'polyline' : 'polygon',
      points: [...currentShape],
      name: toolMode === 'polyline' ? `מרחק ${shapes.filter(s => s.type === 'polyline').length + 1}` :
            `שטח ${shapes.filter(s => s.type === 'polygon').length + 1}`,
      color: toolMode === 'polygon' ? getNextAreaColor() : undefined
    }

    if (toolMode === 'polygon') {
      // For polygon areas, show naming dialog
      setPendingShapeId(newShape.id)
      setShowNameDialog(true)
      setEditingName(`שטח ${shapes.filter(s => s.type === 'polygon').length + 1}`)
    }

    setShapes(prev => [...prev, newShape])
    setCurrentShape([])
    setToolMode('pan')
  }

  const handleCalibrationSubmit = () => {
    const length = parseFloat(calibrationLength)
    if (!length || !calibrationShapeId) return

    const calibrationShape = shapes.find(s => s.id === calibrationShapeId)
    if (!calibrationShape || calibrationShape.points.length < 2) return

    // Save to history before setting calibration
    saveToHistory()

    const pixelDistance = calculateDistance(calibrationShape.points[0], calibrationShape.points[1])
    const lengthInMeters = unitMode === 'metric' ? length / 100 : length * 0.3048 // Convert cm to m or ft to m
    const newMetersPerPixel = lengthInMeters / pixelDistance
    
    setMetersPerPixel(newMetersPerPixel)
    setShapes(prev => prev.map(s => 
      s.id === calibrationShapeId 
        ? { ...s, realWorldLength: lengthInMeters, name: `כיול: ${formatMeasurement(lengthInMeters, 'length')}` }
        : s
    ))
    
    setShowCalibrationDialog(false)
    setCalibrationLength('')
    setCalibrationShapeId(null)
    setToolMode('pan')
  }

  const handleNameDialogSubmit = () => {
    if (pendingShapeId && editingName.trim()) {
      setShapes(prev => prev.map(shape => 
        shape.id === pendingShapeId 
          ? { ...shape, name: editingName.trim() }
          : shape
      ))
    }
    setShowNameDialog(false)
    setPendingShapeId(null)
    setEditingName('')
  }

  const handleNameDialogCancel = () => {
    setShowNameDialog(false)
    setPendingShapeId(null)
    setEditingName('')
    setIsRenaming(false)
  }

  const handleRenameArea = (shapeId: string, currentName: string) => {
    setPendingShapeId(shapeId)
    setEditingName(currentName)
    setIsRenaming(true)
    setShowNameDialog(true)
  }

  const handleInlineEdit = (shapeId: string, currentName: string) => {
    setEditingShapeId(shapeId)
    setEditingName(currentName)
  }

  const handleInlineSave = () => {
    if (editingShapeId && editingName.trim()) {
      setShapes(prev => prev.map(shape => 
        shape.id === editingShapeId 
          ? { ...shape, name: editingName.trim() }
          : shape
      ))
    }
    setEditingShapeId(null)
    setEditingName('')
  }

  const handleInlineCancel = () => {
    setEditingShapeId(null)
    setEditingName('')
  }

  const handleNotesEdit = (shapeId: string, currentNotes: string) => {
    setEditingNotesId(shapeId)
    setEditingNotes(currentNotes || '')
  }

  const handleNotesSave = () => {
    if (editingNotesId) {
      setShapes(prev => prev.map(shape => 
        shape.id === editingNotesId 
          ? { ...shape, notes: editingNotes.trim() }
          : shape
      ))
    }
    setEditingNotesId(null)
    setEditingNotes('')
  }

  const handleNotesCancel = () => {
    setEditingNotesId(null)
    setEditingNotes('')
  }

  const moveShapeUp = (shapeId: string) => {
    setShapes(prev => {
      const currentIndex = prev.findIndex(s => s.id === shapeId)
      if (currentIndex > 0) {
        const newShapes: Shape[] = [...prev]
        const temp = newShapes[currentIndex]
        newShapes[currentIndex] = newShapes[currentIndex - 1]
        newShapes[currentIndex - 1] = temp
        return newShapes
      }
      return prev
    })
  }

  const moveShapeDown = (shapeId: string) => {
    setShapes(prev => {
      const currentIndex = prev.findIndex(s => s.id === shapeId)
      if (currentIndex < prev.length - 1) {
        const newShapes: Shape[] = [...prev]
        const temp = newShapes[currentIndex]
        newShapes[currentIndex] = newShapes[currentIndex + 1]
        newShapes[currentIndex + 1] = temp
        return newShapes
      }
      return prev
    })
  }

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    const oldScale = scale
    const pointer = stage.getPointerPosition()
    
    const scaleBy = 1.1
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))
    
    if (clampedScale === oldScale) return
    
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale
    }
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    }
    
    setScale(clampedScale)
    setStagePosition(newPos)
  }

  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setStagePosition({ x: e.target.x(), y: e.target.y() })
  }
  
  // Add keyboard event handlers for spacebar panning and undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        document.body.style.cursor = 'grab'
        // Enter temporary pan mode if we're measuring
        if (toolMode !== 'pan' && (currentShape.length > 0 || isDrawingCalibration)) {
          enterTemporaryPanMode()
        }
      } else if (e.code === 'KeyZ' && e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        if (temporaryPanMode) {
          exitTemporaryPanMode()
        } else {
          cancelCurrentAction()
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        document.body.style.cursor = 'default'
        // Exit temporary pan mode when spacebar is released
        if (temporaryPanMode) {
          exitTemporaryPanMode()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.body.style.cursor = 'default'
    }
  }, [])

  const deleteShape = (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id))
    if (selectedShapeId === id) {
      setSelectedShapeId(null)
    }
  }

  const exportData = (format: 'json' | 'csv' | 'png') => {
    if (format === 'json') {
      const data = {
        shapes: shapes.map(shape => ({
          ...shape,
          length: shape.type === 'polyline' ? calculatePolylineLength(shape.points) : undefined,
          area: shape.type === 'polygon' ? calculatePolygonArea(shape.points) : undefined
        })),
        metersPerPixel,
        unitMode,
        isCalibrated: metersPerPixel > 0,
        imageUrl,
        fileName: isPdfMode ? `PDF Page ${selectedPageIndex + 1}` : 'Image'
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'מדידות.json'
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['שם', 'סוג', 'מדידה', 'הערות']
      const rows = shapes.map(shape => {
        const measurement = shape.type === 'polyline' 
          ? formatMeasurement(calculatePolylineLength(shape.points), 'length')
          : shape.type === 'polygon'
          ? formatMeasurement(calculatePolygonArea(shape.points), 'area')
          : shape.realWorldLength ? formatMeasurement(shape.realWorldLength, 'length') : 'ללא'
          
        const typeName = shape.type === 'polyline' ? 'מרחק' : shape.type === 'polygon' ? 'שטח' : 'כיול'
        return [shape.name, typeName, measurement, shape.notes || ''].map(cell => `"${cell}"`)
      })
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'מדידות.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'png') {
      // Export canvas as PNG with measurements overlay
      const stage = stageRef.current
      if (stage) {
        const dataURL = stage.toDataURL({ mimeType: 'image/png', quality: 1 })
        const link = document.createElement('a')
        link.download = 'מדידות.png'
        link.href = dataURL
        link.click()
      }
    }
  }

  // Update measurement table when shapes change
  const updateMeasurementTable = useCallback(() => {
    const table = shapes.map(shape => {
      const measurement = shape.type === 'polyline' && metersPerPixel > 0
        ? formatMeasurement(calculatePolylineLength(shape.points), 'length')
        : shape.type === 'polygon' && metersPerPixel > 0
        ? formatMeasurement(calculatePolygonArea(shape.points), 'area')
        : shape.type === 'calibration' && shape.realWorldLength
        ? formatMeasurement(shape.realWorldLength, 'length')
        : 'ללא'

      return {
        id: shape.id,
        name: shape.name,
        type: shape.type,
        measurement: measurement,
        notes: shape.notes || '',
        color: shape.color || '#3b82f6'
      }
    })
    setMeasurementTable(table)
  }, [shapes, metersPerPixel])

  // Update measurement table whenever shapes or calibration changes
  useEffect(() => {
    updateMeasurementTable()
  }, [updateMeasurementTable])

  // Generate cropped image as base64
  const generateCroppedImage = useCallback(async (): Promise<string | null> => {
    if (!saveCropArea || !stageRef.current) return null
    
    try {
      const stage = stageRef.current
      const canvas = stage.toCanvas({
        x: saveCropArea.x,
        y: saveCropArea.y,
        width: saveCropArea.width,
        height: saveCropArea.height,
        pixelRatio: 1
      })
      
      return canvas.toDataURL('image/png')
    } catch (err) {
      console.error('Failed to generate cropped image:', err)
      return null
    }
  }, [saveCropArea])

  // Save measurements to session
  const saveMeasurements = useCallback(async () => {
    try {
      // Capture PNG export as base64
      let pngBase64 = null
      const stage = stageRef.current
      if (stage) {
        const dataURL = stage.toDataURL({ mimeType: 'image/png', quality: 1 })
        pngBase64 = dataURL // This is already in base64 format: "data:image/png;base64,..."
        console.log('📸 Captured Garmushka measurement as PNG:', pngBase64.substring(0, 100) + '...')
      }

      const measurementData = {
        measurementTable,
        metersPerPixel,
        unitMode,
        isCalibrated: metersPerPixel > 0,
        fileName: isPdfMode ? `PDF עמוד ${selectedPageIndex + 1}` : 'תמונה',
        pngExport: pngBase64 // Add PNG export to the data
      }

      console.log('💾 Saving Garmushka measurements with PNG export')

      const response = await fetch(`/api/session/${sessionId}/garmushka-measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurementData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Garmushka measurements saved successfully:', result)
        onMeasurementComplete(measurementData)
        alert('✅ המדידות נשמרו בהצלחה!')
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to save measurements:', errorData)
        setError(`שמירת המדידות נכשלה: ${errorData.error || 'שגיאה לא ידועה'}`)
      }
    } catch (err) {
      console.error('❌ Error saving measurements:', err)
      setError(`שמירת המדידות נכשלה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    }
  }, [sessionId, measurementTable, metersPerPixel, unitMode, isPdfMode, selectedPageIndex, onMeasurementComplete])

  // Update image dimensions when image loads
  useEffect(() => {
    if (imageUrl) {
      const img = new Image()
      img.onload = () => {
        imageSize.current = { width: img.width, height: img.height }
      }
      img.src = imageUrl
    }
  }, [imageUrl])

  // Don't render on server side or while restoring persisted state
  if (!isClient || isRestoring) {
    return <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">מדידות גרמושקה</h3>
      <div className="text-center py-8">טוען...</div>
    </div>
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">מדידות גרמושקה</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          </div>
      )}

      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 text-center">
          📁 {isPdfMode ? 'מעבד דפי PDF...' : 'טוען קובץ...'}
        </div>
      )}

      {!imageUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h4 className="text-lg font-medium mb-2">העלה קובץ למדידה</h4>
          <p className="text-gray-600 mb-4">תומך בפורמטים: PDF, JPG, PNG, SVG</p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.svg"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {[
                { mode: 'pan' as ToolMode, icon: '✋', label: 'הזז' },
                { mode: 'calibrate' as ToolMode, icon: '📏', label: 'כיול' },
                { mode: 'polyline' as ToolMode, icon: '📐', label: 'מרחק' },
                { mode: 'polygon' as ToolMode, icon: '▢', label: 'שטח' }
              ].map(tool => (
              <button
                  key={tool.mode}
                  onClick={() => handleToolChange(tool.mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    toolMode === tool.mode 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300'
                  } ${temporaryPanMode && tool.mode !== 'pan' ? 'opacity-60' : ''}`}
                >
                  {tool.icon} {tool.label}
              </button>
              ))}
            </div>
            
            <div className="ml-auto flex gap-2">
              {/* Undo Button */}
              <button
                onClick={undo}
                disabled={!canUndo && historyIndex < 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  (canUndo || historyIndex >= 0) 
                    ? 'bg-white text-gray-700 border border-gray-300' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                ↶ בטל
              </button>
              
              {/* Finish Button */}
              {(toolMode === 'polyline' && currentShape.length >= 2) && (
              <button
                  onClick={finishShape}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white"
                >
                  ✓ סיים מרחק
                </button>
              )}
              
              {/* Finish Area Button */}
              {(toolMode === 'polygon' && currentShape.length >= 3) && (
                <button
                  onClick={finishShape}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white"
                >
                  ✓ סיים שטח
                </button>
              )}

              {/* Cancel Button */}
              {(currentShape.length > 0 || showCalibrationDialog || isDrawingCalibration) && (
                <button
                  onClick={cancelCurrentAction}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white"
                >
                  ✕ ביטול
                </button>
              )}

              {/* Unit Toggle */}
              <button
                onClick={() => setUnitMode(prev => prev === 'metric' ? 'imperial' : 'metric')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300"
              >
                {unitMode === 'metric' ? '📏 מטרי (מ׳)' : '📏 אימפריאלי (רגל)'}
              </button>
              
              {/* Export Buttons */}
              <button
                onClick={() => exportData('csv')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white"
              >
                📊 ייצא CSV
              </button>
              
              <button
                onClick={() => exportData('png')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white"
              >
                🖼️ ייצא PNG
              </button>
              
              <button
                onClick={saveMeasurements}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white"
              >
                💾 שמור
              </button>
              
              <button
                onClick={clearImage}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white"
              >
                📁 קובץ חדש
              </button>
            </div>
            </div>

          {/* Instructions */}
          <div className={`p-4 rounded-lg text-sm ${
            temporaryPanMode 
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' 
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {temporaryPanMode ? (
              <div>
                <strong>🚀 מצב הזזה זמני:</strong> שחרר  או לחץ אמצעי כדי לחזור למצב מדידה {previousTool === 'polyline' ? 'מרחק' : previousTool === 'polygon' ? 'שטח' : previousTool === 'calibrate' ? 'כיול' : 'בחירה'}
              </div>
            ) : (
              <>
                <div className="mb-2">
                  💡 <strong>ניווט:</strong> גלגלת = זום • לחץ אמצעי = הזזה • Ctrl+Z = בטל
                </div>
                {toolMode === 'calibrate' && (
                  <div><strong>📏 כיול:</strong> לחץ פעמיים כדי לצייר קו, ואז הזן מדידה אמיתית</div>
                )}
                {toolMode === 'polyline' && (
                  <div><strong>📐 מרחק:</strong> לחץ נקודות לאורך נתיב • השתמש בכפתור "✓ סיים" או לחץ כפול</div>
                )}
                {toolMode === 'polygon' && (
                  <div><strong>▢ שטח:</strong> לחץ פינות • לחץ ליד התחלה כדי לסגור או השתמש בכפתור "✓ סיים"</div>
                )}
              </>
            )}
          </div>

          {/* PDF Page Selector */}
          {isPdfMode && pdfPages.length > 1 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-sm font-semibold text-yellow-800">
                  📄 עמוד:
                </span>
                {pdfPages.map((page, index) => (
                <button
                    key={index}
                    onClick={() => handlePageSelect(index)}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      index === selectedPageIndex 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
              ))}
            </div>
            </div>
          )}
          
          {/* Canvas Container */}
          <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden relative">
            {metersPerPixel === 0 && (
              <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 z-10">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-yellow-800 font-medium">
                    ⚠️ נא לכייל תחילה:<br/>
                    1. לחץ על הכלי "📏 כיול" למעלה<br/>
                    2. צייר קו על מימד ידוע<br/>
                    3. הזן את המדידה האמיתית בחלון שיופיע
                  </span>
            <button
                    onClick={() => setMetersPerPixel(0.001)} // Set a small value to hide the warning
                    className="ml-2 text-yellow-600 hover:text-yellow-800 text-lg font-bold"
                    title="סגור אזהרה"
            >
                    ×
            </button>
          </div>
              </div>
            )}
            
            <Stage
              ref={stageRef}
              width={800}
              height={600}
              scaleX={scale}
              scaleY={scale}
              x={stagePosition.x}
              y={stagePosition.y}
              onClick={handleStageClick}
              onDblClick={handleStageDoubleClick}
              onWheel={handleWheel}
              draggable={toolMode === 'pan'}
              onDragEnd={handleStageDragEnd}
              onMouseDown={(e: any) => {
                const evt = e.evt
                // Enable dragging with middle mouse button
                if (evt.button === 1) {
                  e.evt.preventDefault()
                  e.target.getStage().draggable(true)
                  document.body.style.cursor = 'grabbing'
                  
                  // Enter temporary pan mode if we're measuring
                  if (toolMode !== 'pan' && (currentShape.length > 0 || isDrawingCalibration)) {
                    enterTemporaryPanMode()
                  }
                }
                // Enable dragging with spacebar + left click
                else if (evt.button === 0 && evt.getModifierState && evt.getModifierState('Space')) {
                  e.target.getStage().draggable(true)
                  document.body.style.cursor = 'grabbing'
                }
              }}
              onMouseUp={(e: any) => {
                const evt = e.evt
                // Reset dragging state
                if (evt.button === 1) {
                  // Middle mouse button released
                  if (toolMode !== 'pan' && !temporaryPanMode) {
                    e.target.getStage().draggable(false)
                  }
                  document.body.style.cursor = 'default'
                } else if (toolMode !== 'pan' && !temporaryPanMode) {
                  e.target.getStage().draggable(false)
                  document.body.style.cursor = 'default'
                }
              }}
            >
              <Layer>
                {/* Background Image */}
                <KonvaImageComponent src={imageUrl} />
                
                {/* Existing Shapes */}
                {shapes.map((shape) => {
                  const isSelected = shape.id === selectedShapeId
                  const strokeColor = getShapeColor(shape)
                  const center = shape.type === 'polygon' ? getPolygonCenter(shape.points) : shape.points[0]
                  
                  return (
                    <Group key={shape.id}>
                      {/* Shape Line */}
                      <Line
                        points={shape.points.flatMap(p => [p.x, p.y])}
                        stroke={isSelected ? '#ef4444' : strokeColor}
                        strokeWidth={isSelected ? 4 : shape.type === 'polygon' ? 3 : 2}
                        closed={shape.type === 'polygon'}
                        fill={shape.type === 'polygon' ? strokeColor + '30' : undefined}
                        onClick={() => setSelectedShapeId(shape.id)}
                      />
                      
                      {/* Shape Points */}
                      {shape.points.map((point, index) => (
                        <Circle
                          key={index}
                          x={point.x}
                          y={point.y}
                          radius={shape.type === 'polygon' ? 5 : 4}
                          fill={strokeColor}
                          stroke="white"
                          strokeWidth={2}
                        />
                      ))}
                      
                      {/* Shape Label - Center for polygons, corner for others */}
                      {shape.type === 'polygon' ? (
                        <Text
                          x={center.x}
                          y={center.y}
                          text={shape.name}
                          fontSize={16}
                          fontStyle="bold"
                          fill={strokeColor}
                          align="center"
                          verticalAlign="middle"
                          offsetX={shape.name.length * 4}
                          offsetY={8}
                        />
                      ) : (
                        shape.points.length > 0 && (
                          <Text
                            x={center.x + 10}
                            y={center.y - 10}
                            text={shape.name}
                            fontSize={12}
                            fill={strokeColor}
                            fontStyle="bold"
                          />
                        )
                      )}
                    </Group>
                  )
                })}
                
                {/* Current Shape Being Drawn */}
                {currentShape.length > 0 && (
                  <Group>
                    <Line
                      points={currentShape.flatMap(p => [p.x, p.y])}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />
                    {currentShape.map((point, index) => (
                      <Circle
                        key={index}
                        x={point.x}
                        y={point.y}
                        radius={4}
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Group>
                )}
              </Layer>
            </Stage>
          </div>

          {/* Measurements List */}
          {shapes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-3">מדידות:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shapes.map((shape) => {
                  const measurement = shape.type === 'polyline' && metersPerPixel > 0
                    ? formatMeasurement(calculatePolylineLength(shape.points), 'length')
                    : shape.type === 'polygon' && metersPerPixel > 0
                    ? formatMeasurement(calculatePolygonArea(shape.points), 'area')
                    : shape.type === 'calibration' && shape.realWorldLength
                    ? formatMeasurement(shape.realWorldLength, 'length')
                    : 'N/A'
                  
                  return (
                    <div
                      key={shape.id}
                      className={`p-3 rounded border ${
                        selectedShapeId === shape.id ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getShapeColor(shape) }}
                          />
                          {editingShapeId === shape.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleInlineSave()
                                } else if (e.key === 'Escape') {
                                  handleInlineCancel()
                                }
                              }}
                              className="px-2 py-1 border border-blue-300 rounded text-sm font-medium"
                              autoFocus
                              onBlur={handleInlineSave}
                            />
                          ) : (
                            <span 
                              className="font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => handleInlineEdit(shape.id, shape.name)}
                              title="לחץ לעריכת שם"
                            >
                              {shape.name}
                      </span>
                          )}
                    </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-semibold">
                            {measurement}
                          </span>
                          <div className="flex items-center gap-1">
                    <button
                              onClick={(e) => {
                                e.stopPropagation()
                                moveShapeUp(shape.id)
                              }}
                              className="text-gray-500 hover:text-gray-700 text-sm px-1 py-1"
                              title="הזז למעלה"
                              disabled={shapes.findIndex(s => s.id === shape.id) === 0}
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                moveShapeDown(shape.id)
                              }}
                              className="text-gray-500 hover:text-gray-700 text-sm px-1 py-1"
                              title="הזז למטה"
                              disabled={shapes.findIndex(s => s.id === shape.id) === shapes.length - 1}
                            >
                              ↓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteShape(shape.id)
                              }}
                              className="text-red-500 hover:text-red-700 text-lg"
                              title="מחק מדידה"
                            >
                              ×
                    </button>
                  </div>
              </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">הערות:</span>
                        {editingNotesId === shape.id ? (
                          <input
                            type="text"
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleNotesSave()
                              } else if (e.key === 'Escape') {
                                handleNotesCancel()
                              }
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="הוסף הערות..."
                            autoFocus
                            onBlur={handleNotesSave}
                          />
                        ) : (
                          <span 
                            className="flex-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-xs text-gray-600"
                            onClick={() => handleNotesEdit(shape.id, shape.notes || '')}
                            title="לחץ להוספת/עריכת הערות"
                          >
                            {shape.notes || 'לחץ להוספת הערות...'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
            </div>
          )}

      {/* Calibration Dialog */}
      {showCalibrationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📏 הגדר כיול קנה מידה</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הזן את האורך האמיתי ב{unitMode === 'metric' ? 'סנטימטרים (ס"מ)' : 'רגליים (ft)'}:
              </label>
              <input
                type="number"
                placeholder={unitMode === 'metric' ? 'לדוגמה: 325 (ל-3.25 מטר)' : 'לדוגמה: 10.5'}
                value={calibrationLength}
                onChange={(e) => setCalibrationLength(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg text-center text-lg font-semibold"
                autoFocus
                step={unitMode === 'metric' ? '1' : '0.1'}
                min="0"
              />
              <div className="text-sm text-gray-600 mt-2 text-center">
                💡 {unitMode === 'metric' 
                  ? 'הזן בס"מ (325 = 3.25 מטר, 120 = 1.2 מטר)' 
                  : 'הזן ברגליים (10.5 = 10 רגל 6 אינץ\')'}
          </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCalibrationDialog(false)
                  setCalibrationLength('')
                  setCalibrationShapeId(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleCalibrationSubmit}
                disabled={!calibrationLength || parseFloat(calibrationLength) <= 0}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  calibrationLength && parseFloat(calibrationLength) > 0 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                הגדר קנה מידה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area Naming Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {isRenaming ? '✏️ שנה שם מדידה' : '🏷️ שם מדידה'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם המדידה:
              </label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="הזן שם מדידה (לדוגמה: סלון, מטבח, מרחק 1)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNameDialogSubmit()
                  } else if (e.key === 'Escape') {
                    handleNameDialogCancel()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleNameDialogCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleNameDialogSubmit}
                disabled={!editingName.trim()}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  editingName.trim()
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                שמור שם
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}