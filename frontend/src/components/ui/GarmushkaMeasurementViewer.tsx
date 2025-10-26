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

type ToolMode = 'select' | 'calibrate' | 'polyline' | 'polygon' | 'pan'
type UnitMode = 'metric' | 'imperial'

// Dynamic PDF.js import to avoid module issues
let pdfjs: any = null
const loadPdfJs = async () => {
  if (!pdfjs) {
    try {
      // Use dynamic import with proper error handling
      const pdfjsModule = await import('pdfjs-dist')
      pdfjs = pdfjsModule.default || pdfjsModule
      
      // Use CDN for worker (simpler and works in all environments)
      // jsdelivr is more reliable than unpkg
      if (pdfjs && pdfjs.GlobalWorkerOptions) {
        const version = pdfjs.version || '3.11.174'
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`
      }
    } catch (error) {
      console.error('Failed to load PDF.js:', error)
      throw new Error('PDF.js failed to load. Please try uploading an image file instead.')
    }
  }
  return pdfjs
}

const KonvaImageComponent: React.FC<{ src: string }> = ({ src }) => {
  const [image] = useImage(src)
  return KonvaImage ? <KonvaImage image={image} /> : null
}

export default function GarmushkaMeasurementViewer({ 
  sessionId, 
  onMeasurementComplete,
  initialMeasurements
}: GarmushkaMeasurementViewerProps) {
  const [isClient, setIsClient] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [pdfPages, setPdfPages] = useState<PDFPageInfo[]>([])
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0)
  const [isPdfMode, setIsPdfMode] = useState<boolean>(false)
  
  // Measurement system state
  const [toolMode, setToolMode] = useState<ToolMode>('select')
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
  const [previousTool, setPreviousTool] = useState<ToolMode>('select')
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
    setIsPdfMode(false)
    setPdfPages([])

    try {
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
          setIsLoading(false)
        } catch (pdfError) {
          console.error('PDF processing failed:', pdfError)
          setError('PDF processing failed. Please try uploading an image file instead.')
          setIsLoading(false)
        }
        
      } else if (file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        // Handle regular image files
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          if (result) {
            setImageUrl(result)
            setError('')
          }
          setIsLoading(false)
        }
        reader.onerror = () => {
          setError('Failed to read file')
          setIsLoading(false)
        }
        reader.readAsDataURL(file)
      } else {
        setError('Please upload a PDF or image file (PDF, JPG, PNG, SVG)')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('File upload error:', err)
      setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }

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
    setToolMode('select')
    setShowCalibrationDialog(false)
    setIsDrawingCalibration(false)
  }

  const cancelCurrentAction = () => {
    setCurrentShape([])
    setShowCalibrationDialog(false)
    setIsDrawingCalibration(false)
    setTemporaryPanMode(false)
    if (toolMode === 'calibrate' || toolMode === 'pan') {
      setToolMode('select')
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
    
    if (toolMode === 'select') return

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
          name: 'Calibration Line'
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
      name: toolMode === 'polyline' ? `Distance ${shapes.filter(s => s.type === 'polyline').length + 1}` :
            `Area ${shapes.filter(s => s.type === 'polygon').length + 1}`,
      color: toolMode === 'polygon' ? getNextAreaColor() : undefined
    }

    if (toolMode === 'polygon') {
      // For polygon areas, show naming dialog
      setPendingShapeId(newShape.id)
      setShowNameDialog(true)
      setEditingName(`Area ${shapes.filter(s => s.type === 'polygon').length + 1}`)
    }

    setShapes(prev => [...prev, newShape])
    setCurrentShape([])
    setToolMode('select')
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
        ? { ...s, realWorldLength: lengthInMeters, name: `Calibration: ${formatMeasurement(lengthInMeters, 'length')}` }
        : s
    ))
    
    setShowCalibrationDialog(false)
    setCalibrationLength('')
    setCalibrationShapeId(null)
    setToolMode('select')
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
      a.download = 'measurements.json'
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['Name', 'Type', 'Measurement', 'Notes']
      const rows = shapes.map(shape => {
        const measurement = shape.type === 'polyline' 
          ? formatMeasurement(calculatePolylineLength(shape.points), 'length')
          : shape.type === 'polygon'
          ? formatMeasurement(calculatePolygonArea(shape.points), 'area')
          : shape.realWorldLength ? formatMeasurement(shape.realWorldLength, 'length') : 'N/A'
          
        return [shape.name, shape.type, measurement, shape.notes || ''].map(cell => `"${cell}"`)
      })
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'measurements.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'png') {
      // Export canvas as PNG with measurements overlay
      const stage = stageRef.current
      if (stage) {
        const dataURL = stage.toDataURL({ mimeType: 'image/png', quality: 1 })
        const link = document.createElement('a')
        link.download = 'measurements.png'
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
        : 'N/A'

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
        fileName: isPdfMode ? `PDF Page ${selectedPageIndex + 1}` : 'Image',
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
        alert('✅ Measurements saved successfully!')
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to save measurements:', errorData)
        setError(`Failed to save measurements: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('❌ Error saving measurements:', err)
      setError(`Failed to save measurements: ${err instanceof Error ? err.message : 'Unknown error'}`)
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

  // Don't render on server side
  if (!isClient) {
    return <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">מדידות גרמושקה</h3>
      <div className="text-center py-8">Loading...</div>
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
          📁 {isPdfMode ? 'Processing PDF pages...' : 'Loading file...'}
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
                { mode: 'select' as ToolMode, icon: '👆', label: 'Select' },
                { mode: 'pan' as ToolMode, icon: '✋', label: 'Pan' },
                { mode: 'calibrate' as ToolMode, icon: '📏', label: 'Calibrate' },
                { mode: 'polyline' as ToolMode, icon: '📐', label: 'Distance' },
                { mode: 'polygon' as ToolMode, icon: '▢', label: 'Area' }
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
                ↶ Undo
              </button>
              
              {/* Finish Button */}
              {(toolMode === 'polyline' && currentShape.length >= 2) && (
                <button
                  onClick={finishShape}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white"
                >
                  ✓ Finish Distance
                </button>
              )}
              
              {/* Finish Area Button */}
              {(toolMode === 'polygon' && currentShape.length >= 3) && (
                <button
                  onClick={finishShape}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white"
                >
                  ✓ Finish Area
                </button>
              )}

              {/* Cancel Button */}
              {(currentShape.length > 0 || showCalibrationDialog || isDrawingCalibration) && (
                <button
                  onClick={cancelCurrentAction}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white"
                >
                  ✕ Cancel
                </button>
              )}

              {/* Unit Toggle */}
              <button
                onClick={() => setUnitMode(prev => prev === 'metric' ? 'imperial' : 'metric')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300"
              >
                {unitMode === 'metric' ? '📏 Metric (m)' : '📏 Imperial (ft)'}
              </button>
              
              {/* Export Buttons */}
              <button
                onClick={() => exportData('json')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-500 text-white"
              >
                📄 Export JSON
              </button>
              
              <button
                onClick={() => exportData('csv')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white"
              >
                📊 Export CSV
              </button>
              
              <button
                onClick={() => exportData('png')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white"
              >
                🖼️ Export PNG
              </button>
              
              <button
                onClick={saveMeasurements}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white"
              >
                💾 Save
              </button>
              
              <button
                onClick={clearImage}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white"
              >
                📁 New File
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
                <strong>🚀 Temporary Pan Mode:</strong> Release spacebar or middle-click to return to {previousTool} measurement
              </div>
            ) : (
              <>
                <div className="mb-2">
                  💡 <strong>Navigation:</strong> Wheel = zoom • Middle-click = pan • Spacebar = temporary pan • Ctrl+Z = undo
                </div>
                {toolMode === 'calibrate' && (
                  <div><strong>📏 Calibration:</strong> Left-click twice to draw a line, then enter real measurement</div>
                )}
                {toolMode === 'polyline' && (
                  <div><strong>📐 Distance:</strong> Left-click points along path • Use "✓ Finish" button or double-click</div>
                )}
                {toolMode === 'polygon' && (
                  <div><strong>▢ Area:</strong> Left-click corners • Click near start to close OR use "✓ Finish" button</div>
                )}
              </>
            )}
          </div>

          {/* PDF Page Selector */}
          {isPdfMode && pdfPages.length > 1 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-sm font-semibold text-yellow-800">
                  📄 Page:
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
                    ⚠️ Please calibrate first:<br/>
                    1. Click "📏 Calibrate" tool above<br/>
                    2. Draw a line over a known dimension<br/>
                    3. Enter the real measurement in the dialog that appears
                  </span>
                  <button
                    onClick={() => setMetersPerPixel(0.001)} // Set a small value to hide the warning
                    className="ml-2 text-yellow-600 hover:text-yellow-800 text-lg font-bold"
                    title="Close warning"
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
              <h4 className="font-medium mb-3">Measurements:</h4>
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
                              title="Click to edit name"
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
                              title="Move up"
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
                              title="Move down"
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
                              title="Delete measurement"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Notes:</span>
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
                            placeholder="Add notes..."
                            autoFocus
                            onBlur={handleNotesSave}
                          />
                        ) : (
                          <span 
                            className="flex-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-xs text-gray-600"
                            onClick={() => handleNotesEdit(shape.id, shape.notes || '')}
                            title="Click to add/edit notes"
                          >
                            {shape.notes || 'Click to add notes...'}
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
            <h3 className="text-lg font-semibold mb-4">📏 Set Scale Calibration</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter the real length in {unitMode === 'metric' ? 'centimeters (cm)' : 'feet (ft)'}:
              </label>
              <input
                type="number"
                placeholder={unitMode === 'metric' ? 'e.g., 325 (for 3.25m)' : 'e.g., 10.5'}
                value={calibrationLength}
                onChange={(e) => setCalibrationLength(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg text-center text-lg font-semibold"
                autoFocus
                step={unitMode === 'metric' ? '1' : '0.1'}
                min="0"
              />
              <div className="text-sm text-gray-600 mt-2 text-center">
                💡 {unitMode === 'metric' 
                  ? 'Enter in cm (325 = 3.25 meters, 120 = 1.2 meters)' 
                  : 'Enter in feet (10.5 = 10 feet 6 inches)'}
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
                Cancel
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
                Set Scale
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
              {isRenaming ? '✏️ Rename Measurement' : '🏷️ Name Measurement'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Measurement Name:
              </label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Enter measurement name (e.g., Living Room, Kitchen, Distance 1)"
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
                Cancel
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
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}