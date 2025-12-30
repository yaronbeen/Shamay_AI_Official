'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Screenshot types for document injection:
// - wideArea: Large environment map for Section 1.1
// - zoomedNoTazea: Close-up without תצ"א for Section 1.2 (left)
// - zoomedWithTazea: Close-up with תצ"א for Section 1.2 (right)
export type ScreenshotType = 'wideArea' | 'zoomedNoTazea' | 'zoomedWithTazea'

export interface GISScreenshots {
  wideArea?: string
  zoomedNoTazea?: string
  zoomedWithTazea?: string
  // Legacy fields for backward compatibility
  cropMode0?: string
  cropMode1?: string
}

interface GISMapViewerProps {
  sessionId?: string
  data?: any
  initialScreenshots?: GISScreenshots
  onScreenshotsUpdated?: (screenshots: GISScreenshots) => void
}

const MIN_LEFT_WIDTH = 260
const MAX_LEFT_WIDTH = 520
const MIN_RIGHT_WIDTH = 240
const MAX_RIGHT_WIDTH = 480
const MIN_MAP_WIDTH = 520

export default function GISMapViewer({ sessionId, data, initialScreenshots, onScreenshotsUpdated }: GISMapViewerProps = {}) {
  // State - exactly matching HTML logic
  const [addressStreet, setAddressStreet] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [searchMessage, setSearchMessage] = useState('')
  const [notes, setNotes] = useState('')
  const [isMapLocked, setIsMapLocked] = useState(false)
  const [currentTool, setCurrentTool] = useState<'select' | 'freehand' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'text'>('select')
  const [currentColor, setCurrentColor] = useState('#ff0000')
  const [isDrawing, setIsDrawing] = useState(false)
  const [annotations, setAnnotations] = useState<any[]>([])
  const [savedMaps, setSavedMaps] = useState<any[]>([])
  const [currentMapId, setCurrentMapId] = useState<string | null>(null)
  const [govmapUrl, setGovmapUrl] = useState<string>('')
  const [coords, setCoords] = useState<{ wgs84?: { lat: number, lon: number }, itm?: { easting: number, northing: number } }>({})
  const [govmapData, setGovmapData] = useState<any>(null)
  const [currentMapMode, setCurrentMapMode] = useState<'0' | '1'>('0') // 0 = without תצ״א, 1 = with תצ״א (FIXED: mapping was reversed)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startXYRef = useRef<{ x: number, y: number } | null>(null)
  const fileInputRefWideArea = useRef<HTMLInputElement>(null)
  const fileInputRefZoomedNoTazea = useRef<HTMLInputElement>(null)
  const fileInputRefZoomedWithTazea = useRef<HTMLInputElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  // Message helper
  const showMessage = (text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSearchMessage(text)
    if (type === 'success' || type === 'info' || type === 'warning') {
      setTimeout(() => setSearchMessage(''), type === 'warning' ? 5000 : 3000) // Show warnings longer
    }
  }

  const [leftPanelWidth, setLeftPanelWidth] = useState(320)
  const [rightPanelWidth, setRightPanelWidth] = useState(300)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [draggingPanel, setDraggingPanel] = useState<'left' | 'right' | null>(null)
  const leftWidthRef = useRef(leftPanelWidth)
  const rightWidthRef = useRef(rightPanelWidth)
  const [isDesktop, setIsDesktop] = useState(false)
  
  // Tab selection state (like Step 4)
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'save'>('search')
  const [isSavedMapsExpanded, setIsSavedMapsExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsDesktop(window.innerWidth >= 1024)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    leftWidthRef.current = leftPanelWidth
  }, [leftPanelWidth])

  useEffect(() => {
    rightWidthRef.current = rightPanelWidth
  }, [rightPanelWidth])

  const startDraggingLeft = useCallback(() => {
    if (!isDesktop) return
    setLeftCollapsed(false)
    setDraggingPanel('left')
  }, [isDesktop])

  const startDraggingRight = useCallback(() => {
    if (!isDesktop) return
    setRightCollapsed(false)
    setDraggingPanel('right')
  }, [isDesktop])

  const toggleLeftPanel = useCallback(() => {
    if (leftCollapsed) {
      const restored = Math.max(
        MIN_LEFT_WIDTH,
        Math.min(leftWidthRef.current || MIN_LEFT_WIDTH, MAX_LEFT_WIDTH)
      )
      setLeftPanelWidth(restored)
      setLeftCollapsed(false)
    } else {
      leftWidthRef.current = leftPanelWidth
      setLeftCollapsed(true)
    }
  }, [leftCollapsed, leftPanelWidth])

  const toggleRightPanel = useCallback(() => {
    if (rightCollapsed) {
      const restored = Math.max(
        MIN_RIGHT_WIDTH,
        Math.min(rightWidthRef.current || MIN_RIGHT_WIDTH, MAX_RIGHT_WIDTH)
      )
      setRightPanelWidth(restored)
      setRightCollapsed(false)
    } else {
      rightWidthRef.current = rightPanelWidth
      setRightCollapsed(true)
    }
  }, [rightCollapsed, rightPanelWidth])

  useEffect(() => {
    if (!draggingPanel || !isDesktop) return
    const handleMouseMove = (event: MouseEvent) => {
      if (!layoutRef.current) return
      const rect = layoutRef.current.getBoundingClientRect()
      const totalWidth = rect.width
      const effectiveLeft = leftCollapsed ? 0 : leftWidthRef.current
      const effectiveRight = rightCollapsed ? 0 : rightWidthRef.current

      if (draggingPanel === 'left') {
        const availableForLeft = totalWidth - MIN_MAP_WIDTH - effectiveRight
        if (availableForLeft <= MIN_LEFT_WIDTH) {
          const compressedWidth = Math.max(0, availableForLeft)
          leftWidthRef.current = compressedWidth
          setLeftPanelWidth(compressedWidth)
          setLeftCollapsed(compressedWidth < MIN_LEFT_WIDTH * 0.6)
          return
        }
        const maxLeft = Math.min(MAX_LEFT_WIDTH, availableForLeft)
        let newWidth = event.clientX - rect.left
        newWidth = Math.max(MIN_LEFT_WIDTH, Math.min(newWidth, maxLeft))
        leftWidthRef.current = newWidth
        setLeftPanelWidth(newWidth)
        setLeftCollapsed(false)
      } else if (draggingPanel === 'right') {
        const availableForRight = totalWidth - MIN_MAP_WIDTH - (leftCollapsed ? 0 : leftWidthRef.current)
        if (availableForRight <= MIN_RIGHT_WIDTH) {
          const compressedWidth = Math.max(0, availableForRight)
          rightWidthRef.current = compressedWidth
          setRightPanelWidth(compressedWidth)
          setRightCollapsed(compressedWidth < MIN_RIGHT_WIDTH * 0.6)
          return
        }
        const maxRight = Math.min(MAX_RIGHT_WIDTH, availableForRight)
        let newWidth = rect.right - event.clientX
        newWidth = Math.max(MIN_RIGHT_WIDTH, Math.min(newWidth, maxRight))
        rightWidthRef.current = newWidth
        setRightPanelWidth(newWidth)
        setRightCollapsed(false)
      }
    }

    const stopDragging = () => setDraggingPanel(null)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDragging)
    }
  }, [draggingPanel, isDesktop, leftCollapsed, rightCollapsed])

  // טען כתובת מהדיבי אם יש נתונים
  useEffect(() => {
    if (data && (data.street || data.city)) {
      // טען כתובת מהדיבי - עדכן תמיד אם יש נתונים מהדיבי
      if (data.street) {
        setAddressStreet(data.street)
      }
      if (data.buildingNumber) {
        setAddressNumber(data.buildingNumber)
      }
      if (data.city) {
        setAddressCity(data.city)
      }
    }
  }, [data?.street, data?.city, data?.buildingNumber])

  // Initialize - load saved maps and initial screenshots
  useEffect(() => {
    try {
      const raw = localStorage.getItem('govmap-saved-maps')
      if (raw) {
        const allMaps = JSON.parse(raw)
        // CRITICAL FIX: Filter maps by sessionId - only load maps for current valuation
        if (sessionId) {
          const filteredMaps = allMaps.filter((m: any) => {
            // Check if map.id matches sessionId, or if map has sessionId field that matches
            return m.id === sessionId || m.sessionId === sessionId
          })
          setSavedMaps(filteredMaps)
          console.log(`🔍 [GIS] Loaded ${filteredMaps.length} maps for sessionId: ${sessionId} (from ${allMaps.length} total)`)
        } else {
          // If no sessionId, don't load any maps (safety - prevents loading wrong maps)
          setSavedMaps([])
          console.log('⚠️ [GIS] No sessionId provided, not loading any saved maps')
        }
      }
    } catch {}

    // Load initial screenshots from props if available
    if (initialScreenshots) {
      setScreenshots(initialScreenshots)
      // Store URLs (both Blob URLs and local paths)
      // Blob URLs: https://...blob.vercel-storage.com/... (load directly)
      // Local paths: /uploads/... (served via /api/files/ route)
      const urls: { cropMode0?: string, cropMode1?: string } = {}
      if (initialScreenshots.cropMode0) {
        // If it's a Blob URL (https://), use directly
        // If it's a local path (/uploads/), use directly (will be served by API route)
        // If it's a relative path, prepend /api/files/ if needed
        let url = initialScreenshots.cropMode0
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // Blob URL - use directly
          urls.cropMode0 = url
        } else if (url.startsWith('/uploads/')) {
          // Local path - use directly (served by Next.js)
          urls.cropMode0 = url
        } else if (url && !url.startsWith('data:')) {
          // Relative path - might need /api/files/ prefix
          urls.cropMode0 = url.startsWith('/') ? url : `/api/files/${sessionId}/${url}`
        } else {
          // Data URL or other format
          urls.cropMode0 = url
        }
      }
      if (initialScreenshots.cropMode1) {
        let url = initialScreenshots.cropMode1
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // Blob URL - use directly
          urls.cropMode1 = url
        } else if (url.startsWith('/uploads/')) {
          // Local path - use directly
          urls.cropMode1 = url
        } else if (url && !url.startsWith('data:')) {
          // Relative path
          urls.cropMode1 = url.startsWith('/') ? url : `/api/files/${sessionId}/${url}`
        } else {
          // Data URL or other format
          urls.cropMode1 = url
        }
      }
      if (Object.keys(urls).length > 0) {
        setScreenshotUrls(urls)
      }
    }

    // Set currentMapId from sessionId if provided
    if (sessionId) {
      setCurrentMapId(sessionId)
    }
  }, [sessionId, initialScreenshots])

  // Resize canvas when iframe changes
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
    const iframe = iframeRef.current
      if (!canvas || !iframe) return
      const rect = iframe.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      redraw()
    }
    if (govmapUrl) {
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
      return () => window.removeEventListener('resize', resizeCanvas)
    }
  }, [govmapUrl, annotations])

  // Redraw annotations on canvas
  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 3

    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color

      if (annotation.type === 'freehand' && annotation.points) {
        ctx.beginPath()
        annotation.points.forEach((p: any, i: number) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
      } else if (annotation.type === 'rectangle') {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)
      } else if (annotation.type === 'circle') {
        ctx.beginPath()
        ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (annotation.type === 'line') {
        ctx.beginPath()
        ctx.moveTo(annotation.x1, annotation.y1)
        ctx.lineTo(annotation.x2, annotation.y2)
        ctx.stroke()
      } else if (annotation.type === 'arrow') {
        drawArrow(ctx, annotation.x1, annotation.y1, annotation.x2, annotation.y2)
      } else if (annotation.type === 'text') {
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

  // Toggle map lock
  const toggleMapLock = () => {
    if (!govmapData) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    const locked = !isMapLocked
    setIsMapLocked(locked)

    const iframe = iframeRef.current
    const canvas = canvasRef.current

    if (locked) {
      // Lock - enable drawing
      if (iframe) iframe.classList.add('locked')
      if (canvas) {
        canvas.classList.add('drawing-enabled')
        canvas.style.pointerEvents = 'auto'
      }
      showMessage('המפה נעולה - כעת תוכלו לצייר סימונים', 'success')
        } else {
      // Unlock - enable navigation
      if (iframe) iframe.classList.remove('locked')
      if (canvas) {
        canvas.classList.remove('drawing-enabled')
        canvas.classList.remove('select-mode')
        canvas.style.pointerEvents = 'none'
      }
      setCurrentTool('select')
      showMessage('המפה משוחררת - תוכלו לנווט במפה', 'info')
    }
  }

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'select' || !isMapLocked) return

    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    startXYRef.current = { x, y }

    if (currentTool === 'freehand') {
      setAnnotations(prev => [...prev, {
        type: 'freehand',
        color: currentColor,
        points: [{ x, y }]
      }])
    } else if (currentTool === 'text') {
      const text = prompt('הזן טקסט:')
      if (text) {
        setAnnotations(prev => [...prev, {
          type: 'text',
          color: currentColor,
          x,
          y,
          text
        }])
        redraw()
        updateAnnotationsList()
      }
      setIsDrawing(false)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (currentTool === 'freehand') {
      setAnnotations(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.points) last.points.push({ x, y })
        return next
      })
      redraw()
    } else {
      // Preview shape
      redraw()
      drawPreviewShape(startXYRef.current!.x, startXYRef.current!.y, x, y)
    }
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startXYRef.current) return

    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const { x: sx, y: sy } = startXYRef.current

    if (currentTool === 'rectangle') {
      setAnnotations(prev => [...prev, {
        type: 'rectangle',
        color: currentColor,
        x: Math.min(sx, x),
        y: Math.min(sy, y),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy)
      }])
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - sx, 2) + Math.pow(y - sy, 2))
      setAnnotations(prev => [...prev, {
        type: 'circle',
        color: currentColor,
        x: sx,
        y: sy,
        radius
      }])
    } else if (currentTool === 'line') {
      setAnnotations(prev => [...prev, {
        type: 'line',
        color: currentColor,
        x1: sx,
        y1: sy,
        x2: x,
        y2: y
      }])
    } else if (currentTool === 'arrow') {
      setAnnotations(prev => [...prev, {
        type: 'arrow',
        color: currentColor,
        x1: sx,
        y1: sy,
        x2: x,
        y2: y
      }])
    }

    setIsDrawing(false)
    startXYRef.current = null
    redraw()
    updateAnnotationsList()
  }

  const drawPreviewShape = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = currentColor
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    if (currentTool === 'rectangle') {
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      ctx.beginPath()
      ctx.arc(x1, y1, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (currentTool === 'line') {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    } else if (currentTool === 'arrow') {
      drawArrow(ctx, x1, y1, x2, y2)
    }

    ctx.setLineDash([])
  }

  // Search address
  const searchAddress = async () => {
    const street = addressStreet.trim()
    const number = addressNumber.trim()
    const city = addressCity.trim()

    if (!street || !city) {
      showMessage('נא להזין רחוב ועיר לפחות', 'error')
      return
    }

    const address = `${street} ${number} ${city}`.trim()
    const displayAddress = `${street} ${number}, ${city}`

    showMessage('מחפש כתובת...', 'info')

    // Default coordinates that indicate a fallback/default value
    const DEFAULT_COORDS = { easting: 219143.61, northing: 618345.06 }
    const TOLERANCE = 100 // 100m tolerance
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          showMessage(`מנסה שוב... (ניסיון ${attempt + 1}/${maxRetries})`, 'info')
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }

        const response = await fetch('/api/address-to-govmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address, 
            options: { 
              zoom: 11, 
              showTazea: true, 
              showInfo: false,
              maxRetries: 2 // Internal retries in backend
            } 
          })
        })

        const result = await response.json()

        if (!result.success) {
          if (attempt === maxRetries - 1) {
            // Last attempt failed
            showMessage(result.error || 'כתובת לא נמצאה', 'error')
            return
          }
          continue // Try again
        }

        // Check if coordinates are default/fallback coordinates
        const easting = result.coordinates?.itm?.easting
        const northing = result.coordinates?.itm?.northing
        
        if (easting && northing) {
          const isDefault = Math.abs(easting - DEFAULT_COORDS.easting) < TOLERANCE && 
                           Math.abs(northing - DEFAULT_COORDS.northing) < TOLERANCE
          
          if (isDefault) {
            console.log(`⚠️ Default coordinates detected: ${easting.toFixed(2)}, ${northing.toFixed(2)} - Retrying...`)
            if (attempt < maxRetries - 1) {
              continue // Try again
            }
          }
        }

        // Check if coordinates are undefined or invalid
        if (!easting || !northing || isNaN(easting) || isNaN(northing)) {
          console.log(`⚠️ Invalid coordinates detected: easting=${easting}, northing=${northing} - Retrying...`)
          if (attempt < maxRetries - 1) {
            continue // Try again
          }
        }

        // Check confidence level - warn if low
        const confidence = result.confidence || 0.5
        if (confidence < 0.6) {
          showMessage(`⚠️ נמצאה כתובת עם רמת ביטחון נמוכה (${(confidence * 100).toFixed(0)}%). אנא בדקו שהכתובת נכונה.`, 'warning')
        }

        const data = { ...result, displayAddress }
        setGovmapData(data)
        // Set initial map mode to without תצ״א (cropMode0)
        setCurrentMapMode('0')
        const initialUrl = result.govmap.urlWithoutTazea || result.govmap.url
        
        // Final check: verify URL doesn't contain default coordinates
        if (initialUrl.includes(`c=${DEFAULT_COORDS.easting.toFixed(2)}`) || 
            initialUrl.includes(`c=${DEFAULT_COORDS.easting}`)) {
          console.log(`⚠️ URL contains default coordinates - Retrying...`)
          if (attempt < maxRetries - 1) {
            continue // Try again
          }
        }
        
        setGovmapUrl(initialUrl)
        setCoords({ wgs84: result.coordinates.wgs84, itm: result.coordinates.itm })
        
        // Show success message with confidence if low
        const successMsg = confidence >= 0.6 
          ? `נמצא: ${result.address.normalized}${attempt > 0 ? ` (ניסיון ${attempt + 1})` : ''}`
          : `נמצא: ${result.address.normalized} (ביטחון: ${(confidence * 100).toFixed(0)}%)${attempt > 0 ? ` (ניסיון ${attempt + 1})` : ''}`
        showMessage(successMsg, 'success')

        // Load map image
        await loadMapImage(initialUrl)
        
        return // Success - exit retry loop

      } catch (error: any) {
        if (attempt === maxRetries - 1) {
          // Last attempt failed
          showMessage(`שגיאה: ${error.message}`, 'error')
          return
        }
        // Continue to next attempt
      }
    }
  }

  const loadMapImage = async (govmapUrl: string) => {
    showMessage('מציג מפה GovMap... נווטו במפה ואז נעלו אותה לציור', 'success')

    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = govmapUrl
      iframe.style.display = 'block'
      iframe.classList.remove('locked')
    }

    // Reset lock state
    setIsMapLocked(false)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.classList.remove('drawing-enabled')
      canvas.classList.remove('select-mode')
      canvas.style.pointerEvents = 'none'
    }

    // Clear canvas
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // Toggle map mode (with/without תצ״א)
  const toggleMapMode = (mode: '0' | '1') => {
    if (!govmapData) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    setCurrentMapMode(mode)
    
    // Get the appropriate URL based on mode
    // FIXED: The mapping was reversed - swapped the URLs
    // mode '0' = ללא תצ״א (without tazea) = urlWithoutTazea
    // mode '1' = עם תצ״א (with tazea) = urlWithTazea
    const newUrl = mode === '0'
      ? (govmapData.govmap?.urlWithTazea || govmapData.govmap?.url || govmapUrl)  // FIXED: swapped
      : (govmapData.govmap?.urlWithoutTazea || govmapData.govmap?.url || govmapUrl)  // FIXED: swapped

    setGovmapUrl(newUrl)
    
    // Update iframe src
    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = newUrl
    }

    showMessage(`מציג מפה ${mode === '0' ? 'ללא תצ״א' : 'עם תצ״א'}`, 'success')
  }

  // Update annotations list
  const updateAnnotationsList = () => {
    // This is handled by React rendering, no DOM manipulation needed
  }

  const getAnnotationName = (annotation: any) => {
    const names: Record<string, string> = {
      freehand: 'ציור חופשי',
      line: 'קו ישר',
      rectangle: 'מלבן',
      circle: 'עיגול',
      arrow: 'חץ',
      text: `טקסט: ${annotation.text}`
    }
    return names[annotation.type] || annotation.type
  }

  const deleteAnnotation = (index: number) => {
    setAnnotations(prev => {
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
    redraw()
    updateAnnotationsList()
  }

  const undoLastAnnotation = () => {
    if (annotations.length > 0) {
      setAnnotations(prev => prev.slice(0, -1))
      redraw()
      updateAnnotationsList()
    }
  }

  // Save map to database and locally
  const saveMapLocal = async () => {
    if (!govmapData) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    let annotationCanvasData: string | null = null
    if (canvasRef.current) {
      try {
        annotationCanvasData = canvasRef.current.toDataURL('image/png')
      } catch {}
    }

    // Generate map ID if not exists (for first save)
    const mapId = currentMapId || `map-${Date.now()}`

    // Build gisScreenshots object with URLs (cropMode0 and cropMode1)
    // Note: URLs should be relative paths like /uploads/sessionId/filename.png
    const gisScreenshots: { cropMode0?: string, cropMode1?: string } = {}
    if (screenshotUrls.cropMode0) {
      // Ensure URL uses the correct sessionId (map ID)
      const url = screenshotUrls.cropMode0.startsWith('/uploads/') 
        ? screenshotUrls.cropMode0 
        : `/uploads/${mapId}/${screenshotUrls.cropMode0}`
      gisScreenshots.cropMode0 = url
    }
    if (screenshotUrls.cropMode1) {
      // Ensure URL uses the correct sessionId (map ID)
      const url = screenshotUrls.cropMode1.startsWith('/uploads/') 
        ? screenshotUrls.cropMode1 
        : `/uploads/${mapId}/${screenshotUrls.cropMode1}`
      gisScreenshots.cropMode1 = url
    }

    const map = {
      id: mapId,
      sessionId: sessionId || mapId, // CRITICAL: Store sessionId for filtering
      address_input: govmapData.displayAddress || `${addressStreet} ${addressNumber}, ${addressCity}`,
      address_normalized: govmapData.address?.normalized || '',
      latitude: govmapData.coordinates?.wgs84?.lat,
      longitude: govmapData.coordinates?.wgs84?.lon,
      itm_easting: govmapData.coordinates?.itm?.easting,
      itm_northing: govmapData.coordinates?.itm?.northing,
      confidence: govmapData.confidence,
      address_details: govmapData.address?.details || {},
      govmap_url: govmapData.govmap?.url || govmapUrl,
      govmap_url_with_tazea: govmapData.govmap?.urlWithTazea,
      govmap_url_without_tazea: govmapData.govmap?.urlWithoutTazea,
      govmap_iframe_html: govmapData.govmap?.iframeHtml,
      annotations: annotations,
      annotation_canvas_data: annotationCanvasData,
      gisScreenshots: Object.keys(gisScreenshots).length > 0 ? gisScreenshots : undefined,
      notes: notes || null,
      zoom_level: 15,
      show_tazea: false
    }

    // Save to database via API
    showMessage('שומר למסד הנתונים...', 'info')
    try {
      const response = await fetch('/api/govmap-address-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(map)
      })

      const result = await response.json()

      if (result.success) {
        // Also save locally for quick access
        const existingIndex = savedMaps.findIndex((m: any) => m.id === result.id)
        let updated
        if (existingIndex >= 0) {
          updated = [...savedMaps]
          updated[existingIndex] = { ...map, id: result.id, created_at: new Date().toISOString() }
        } else {
          updated = [{ ...map, id: result.id, created_at: new Date().toISOString() }, ...savedMaps]
        }

        setSavedMaps(updated)
        localStorage.setItem('govmap-saved-maps', JSON.stringify(updated))
        setCurrentMapId(result.id)
        showMessage('המפה נשמרה בהצלחה במסד הנתונים!', 'success')
      } else {
        showMessage(`שגיאה בשמירה למסד הנתונים: ${result.error}`, 'error')
      }
    } catch (error: any) {
      console.error('Error saving to database:', error)
      showMessage(`שגיאה בשמירה למסד הנתונים: ${error.message}`, 'error')
    }
  }

  const loadSavedMaps = async () => {
    try {
      const raw = localStorage.getItem('govmap-saved-maps')
      if (raw) {
        const allMaps = JSON.parse(raw)
        // CRITICAL FIX: Filter maps by sessionId - only load maps for current valuation
        if (sessionId) {
          const filteredMaps = allMaps.filter((m: any) => {
            // Check if map.id matches sessionId, or if map has sessionId field that matches
            return m.id === sessionId || m.sessionId === sessionId
          })
          setSavedMaps(filteredMaps)
          console.log(`🔍 [GIS] Loaded ${filteredMaps.length} maps for sessionId: ${sessionId} (from ${allMaps.length} total)`)
        } else {
          // If no sessionId, don't load any maps (safety - prevents loading wrong maps)
          setSavedMaps([])
          console.log('⚠️ [GIS] No sessionId provided, not loading any saved maps')
        }
      }
    } catch (error) {
      console.error('Error loading saved maps:', error)
    }
  }

  const loadMapLocal = (id: string) => {
    const map = savedMaps.find((m: any) => m.id === id)
    if (!map) return

    // Parse address back into components
    const parts = (map.address_input || '').split(',')
    const streetAndNumber = (parts[0] || '').trim().split(' ')
    const number = streetAndNumber.pop() || ''
    const street = streetAndNumber.join(' ')
    const city = (parts[1] || '').trim()

    setAddressStreet(street)
    setAddressNumber(number)
    setAddressCity(city)

    setGovmapData({
      address: {
        normalized: map.address_normalized || '',
        details: map.address_details || {}
      },
      coordinates: {
        wgs84: { lat: map.latitude, lon: map.longitude },
        itm: { easting: map.itm_easting, northing: map.itm_northing }
      },
      govmap: {
        url: map.govmap_url || '',
        iframeHtml: map.govmap_iframe_html
      },
      confidence: map.confidence,
      displayAddress: map.address_input
    })

    setCoords({
      wgs84: { lat: map.latitude, lon: map.longitude },
      itm: { easting: map.itm_easting, northing: map.itm_northing }
    })

    setGovmapUrl(map.govmap_url || '')
    setAnnotations(map.annotations || [])
    setNotes(map.notes || '')
    setCurrentMapId(id)

    // Load screenshots if available
    if (map.gisScreenshots) {
      setScreenshotUrls({
        cropMode0: map.gisScreenshots.cropMode0,
        cropMode1: map.gisScreenshots.cropMode1
      })
      // Convert URLs to data URLs for display (if they're file paths)
      if (map.gisScreenshots.cropMode0) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              const dataUrl = canvas.toDataURL('image/png')
              setScreenshots(prev => ({ ...prev, cropMode0: dataUrl }))
            }
          }
          img.src = map.gisScreenshots.cropMode0
        } catch {}
      }
      if (map.gisScreenshots.cropMode1) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              const dataUrl = canvas.toDataURL('image/png')
              setScreenshots(prev => ({ ...prev, cropMode1: dataUrl }))
            }
          }
          img.src = map.gisScreenshots.cropMode1
        } catch {}
      }
    }

    loadMapImage(map.govmap_url || '')
    redraw()
    updateAnnotationsList()

    showMessage('מפה נטענה', 'success')
  }

  // Delete saved map
  const deleteSavedMap = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent loading the map when clicking delete

    if (!confirm('האם אתה בטוח שברצונך למחוק מפה זו?')) return

    const updated = savedMaps.filter((m: any) => m.id !== id)
    setSavedMaps(updated)
    localStorage.setItem('govmap-saved-maps', JSON.stringify(updated))

    if (currentMapId === id) {
      setCurrentMapId(null)
    }

    showMessage('המפה נמחקה', 'success')
  }

  const clearAll = () => {
    if (annotations.length > 0 || govmapData) {
      if (!confirm('למחוק את כל הסימונים והמפה?')) return
    }

    setAddressStreet('')
    setAddressNumber('')
    setAddressCity('')
    setNotes('')
    setGovmapUrl('')
    setCoords({})
    setGovmapData(null)
        setAnnotations([])
    setIsMapLocked(false)
    setCurrentMapId(null)

    const iframe = iframeRef.current
    if (iframe) {
      iframe.style.display = 'none'
      iframe.src = ''
      iframe.classList.remove('locked')
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.classList.remove('drawing-enabled')
      canvas.classList.remove('select-mode')
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    updateAnnotationsList()
    showMessage('נוקה', 'info')
  }

  const copyGovMapUrl = () => {
    const url = govmapUrl
    navigator.clipboard.writeText(url).then(() => {
      showMessage('✓ הועתק!', 'success')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  // Screenshot capture functions - 3 types: wideArea, zoomedNoTazea, zoomedWithTazea
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturingType, setCapturingType] = useState<ScreenshotType | null>(null)
  const [screenshots, setScreenshots] = useState<GISScreenshots>({}) // Base64 for display
  const [screenshotUrls, setScreenshotUrls] = useState<GISScreenshots>({}) // URLs for saving

  // Save screenshot to shuma table under gisScreenshots
  const saveScreenshotToDB = async (screenshotUrl: string, screenshotType: ScreenshotType, mapId: string) => {
    if (!govmapData) {
      console.warn('No govmapData available, cannot save to DB')
      return
    }

    // Use sessionId from props if available, otherwise use mapId
    const actualSessionId = sessionId || mapId

    if (!actualSessionId) {
      console.error('No sessionId available, cannot save to DB')
      return
    }

    try {
      // Build current gisScreenshots object - merge with existing screenshots
      const currentScreenshots: GISScreenshots = { ...screenshotUrls }
      currentScreenshots[screenshotType] = screenshotUrl

      console.log(`💾 Saving screenshot (${screenshotType}) to shuma table for session: ${actualSessionId}`)
      console.log(`💾 Screenshots:`, currentScreenshots)

      // Use save_gis_data action which only updates gisScreenshots field
      // First check if shuma exists, if not create it
      const checkResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'load_from_db',
          sessionId: actualSessionId
        })
      })

      const checkResult = await checkResponse.json()

      // If shuma doesn't exist, create it first
      if (!checkResult.success || !checkResult.valuationData) {
        console.log(`📝 Creating new shuma record for session: ${actualSessionId}`)
        const createResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_to_db',
            sessionId: actualSessionId,
            organizationId: 'default-org',
            userId: 'system',
            valuationData: {
              full_address: govmapData.displayAddress || `${addressStreet} ${addressNumber}, ${addressCity}`,
              street: addressStreet,
              building_number: addressNumber,
              city: addressCity,
              gisScreenshots: currentScreenshots
            }
          })
        })
        const createResult = await createResponse.json()
        if (!createResult.success) {
          console.error('Error creating shuma record:', createResult.error)
          return
        }
      } else {
        // Shuma exists, update only gisScreenshots
        console.log(`📝 Updating gisScreenshots for existing session: ${actualSessionId}`)
        const updateResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_gis_data',
            sessionId: actualSessionId,
            gisData: currentScreenshots
          })
        })
        const updateResult = await updateResponse.json()
        if (!updateResult.success) {
          console.error('Error updating gisScreenshots:', updateResult.error)
          return
        }
      }

      // Update currentMapId if this was a new map
      if (!currentMapId && actualSessionId) {
        setCurrentMapId(actualSessionId)
      }
      console.log(`✅ Screenshot ${screenshotType} saved to shuma table for session ${actualSessionId}`)
    } catch (error: any) {
      console.error('Error saving screenshot to shuma table:', error)
    }
  }

  // Delete GIS screenshot from DB and storage
  const handleDeleteScreenshot = async (screenshotType: ScreenshotType) => {
    const typeLabels: Record<ScreenshotType, string> = {
      wideArea: 'מפה רחבה',
      zoomedNoTazea: 'תקריב ללא תצ״א',
      zoomedWithTazea: 'תקריב עם תצ״א'
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את התמונה "${typeLabels[screenshotType]}"?`)) {
      return
    }

    try {
      showMessage('מוחק תמונה...', 'info')

      const actualSessionId = sessionId || currentMapId
      if (!actualSessionId) {
        showMessage('שגיאה: לא נמצא session ID', 'error')
        return
      }

      // Call delete API with new screenshot type
      const response = await fetch(`/api/session/${actualSessionId}/gis-screenshot/delete?screenshotType=${screenshotType}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        // Remove from local state
        setScreenshots(prev => {
          const updated = { ...prev }
          delete updated[screenshotType]
          return updated
        })

        setScreenshotUrls(prev => {
          const updated = { ...prev }
          delete updated[screenshotType]
          return updated
        })

        // Notify parent component
        if (onScreenshotsUpdated) {
          const updatedScreenshots = { ...screenshots }
          delete updatedScreenshots[screenshotType]
          onScreenshotsUpdated(updatedScreenshots)
        }

        showMessage(`תמונה "${typeLabels[screenshotType]}" נמחקה בהצלחה!`, 'success')
      } else {
        showMessage(`שגיאה במחיקת התמונה: ${result.error}`, 'error')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      showMessage(`שגיאה במחיקת התמונה: ${error.message}`, 'error')
    }
  }

  // Screenshot type labels for UI display
  const screenshotTypeLabels: Record<ScreenshotType, string> = {
    wideArea: 'מפה רחבה (סביבה)',
    zoomedNoTazea: 'תקריב ללא תצ״א',
    zoomedWithTazea: 'תקריב עם תצ״א'
  }

  const captureScreenshot = async (screenshotType: ScreenshotType) => {
    if (!govmapData || !govmapUrl) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    setIsCapturing(true)
    setCapturingType(screenshotType)
    showMessage(`מצלם ${screenshotTypeLabels[screenshotType]}...`, 'info')

    try {
      // Determine which URL to capture based on screenshot type
      // wideArea and zoomedNoTazea use urlWithoutTazea
      // zoomedWithTazea uses urlWithTazea
      const urlToCapture = screenshotType === 'zoomedWithTazea'
        ? (govmapData.govmap?.urlWithTazea || govmapUrl)
        : (govmapData.govmap?.urlWithoutTazea || govmapUrl)

      // Use sessionId from props first, then currentMapId, otherwise generate new one
      const mapSessionId = sessionId || currentMapId || `map-${Date.now()}`

      const response = await fetch('/api/gis-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          govmapUrl: urlToCapture,
          screenshotType, // New field for screenshot type
          sessionId: mapSessionId
        })
      })

      const result = await response.json()

      if (result.success) {
        // Store screenshot data URL for display
        const screenshotData = `data:image/png;base64,${result.screenshot}`
        setScreenshots(prev => ({
          ...prev,
          [screenshotType]: screenshotData
        }))

        // Store screenshot URL for saving (if available)
        if (result.screenshotUrl) {
          setScreenshotUrls(prev => ({
            ...prev,
            [screenshotType]: result.screenshotUrl
          }))

          // Save screenshot path to database immediately
          await saveScreenshotToDB(result.screenshotUrl, screenshotType, mapSessionId)

          // Notify parent component that screenshots were updated
          if (onScreenshotsUpdated) {
            const updatedScreenshots = {
              ...screenshots,
              [screenshotType]: result.screenshotUrl
            }
            onScreenshotsUpdated(updatedScreenshots)
          }
        }

        showMessage(`צילום "${screenshotTypeLabels[screenshotType]}" נשמר בהצלחה!`, 'success')
        console.log('Screenshot saved:', result.screenshotUrl || result.filename)
      } else {
        showMessage(`שגיאה בצילום: ${result.error}`, 'error')
      }
    } catch (error: any) {
      console.error('Screenshot capture error:', error)
      showMessage(`שגיאה בצילום: ${error.message}`, 'error')
    } finally {
      setIsCapturing(false)
      setCapturingType(null)
    }
  }

  // Manual screenshot upload handler
  const handleManualScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>, screenshotType: ScreenshotType) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      showMessage('נא להעלות קובץ תמונה בלבד', 'error')
      return
    }

    try {
      showMessage(`מעלה תמונת "${screenshotTypeLabels[screenshotType]}"...`, 'info')

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', `gis-screenshot-${screenshotType}`)

      // Use sessionId from props first, then currentMapId, otherwise generate new one
      const mapSessionId = sessionId || currentMapId || `map-${Date.now()}`

      // Upload file using frontend route (uses FileStorageService - handles Blob in Vercel)
      const uploadResponse = await fetch(`/api/session/${mapSessionId}/upload`, {
        method: 'POST',
        body: formData
      })

      const uploadResult = await uploadResponse.json()

      if (uploadResult.success) {
        // Store screenshot data URL for display
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64Data = e.target?.result as string
          setScreenshots(prev => ({
            ...prev,
            [screenshotType]: base64Data
          }))
        }
        reader.readAsDataURL(file)

        // Store screenshot URL for saving
        setScreenshotUrls(prev => ({
          ...prev,
          [screenshotType]: uploadResult.uploadEntry.url
        }))

        // Save screenshot path to database immediately
        await saveScreenshotToDB(uploadResult.uploadEntry.url, screenshotType, mapSessionId)

        // Notify parent component that screenshots were updated
        if (onScreenshotsUpdated) {
          const updatedScreenshots = {
            ...screenshots,
            [screenshotType]: uploadResult.uploadEntry.url
          }
          onScreenshotsUpdated(updatedScreenshots)
        }

        showMessage(`תמונת "${screenshotTypeLabels[screenshotType]}" הועלתה ונשמרה בהצלחה!`, 'success')
      } else {
        showMessage(`שגיאה בהעלאת התמונה: ${uploadResult.error}`, 'error')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      showMessage(`שגיאה בהעלאת התמונה: ${error.message}`, 'error')
    }

    // Reset file input
    event.target.value = ''
  }

  useEffect(() => {
    loadSavedMaps()
  }, [sessionId]) // Reload when sessionId changes

  return (
    <div className="bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-1">🗺️ מפות כתובות עם סימונים</h1>
          <p className="text-sm text-gray-600">חפשו כתובת, הוסיפו סימונים על המפה ושמרו לעיון מאוחר</p>
        </header>

        <div
          ref={layoutRef}
          className="flex flex-col gap-4 lg:flex-row lg:gap-4"
          style={{ minHeight: '800px' }}
        >
          {/* Main Map Area */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Address Search Form - Above Map */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 חיפוש כתובת</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">רחוב</label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="נורדאו / Nordau"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מספר בית</label>
                  <input
                    type="text"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="8"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">עיר</label>
                  <input
                    type="text"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="רעננה / Raanana"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={searchAddress}
                    className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    🔍 חפש כתובת
                  </button>
                </div>
              </div>
              
              {searchMessage && (
                <div className={`mt-3 p-3 rounded-lg ${
                  searchMessage.includes('שגיאה') ? 'bg-red-100 text-red-800 border border-red-300' :
                  searchMessage.includes('נמצא') ? 'bg-green-100 text-green-800 border border-green-300' :
                  'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {searchMessage}
                </div>
              )}
            </div>

            {/* Map Canvas - Main Component */}
            <div
              className="flex-1 min-w-0 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative"
              style={{ height: '90vh', minHeight: '800px' }}
            >
            {isDesktop && rightCollapsed && (
              <button
                type="button"
                onClick={toggleRightPanel}
                className="hidden lg:flex absolute top-3 right-3 z-30 bg-white/90 border border-gray-300 rounded px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-white"
              >
                הצג מפות שמורות
              </button>
            )}
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Map Mode Toggle */}
                {govmapData && (
                  <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
                    <button
                      onClick={() => toggleMapMode('0')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentMapMode === '0'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      ללא תצ״א
                    </button>
                    <button
                      onClick={() => toggleMapMode('1')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentMapMode === '1'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      עם תצ״א
                    </button>
        </div>
      )}

                          <button
                  onClick={toggleMapLock}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isMapLocked
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isMapLocked ? '🔐 בטל נעילה (חזור לניווט במפה)' : '🔓 נעל מפה להוספת סימונים'}
                          </button>

                {isMapLocked && (
                  <div className="flex gap-2 flex-wrap">
                        <button
                      onClick={() => setCurrentTool('select')}
                      className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                        currentTool === 'select' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      👆 בחירה
                        </button>
                    <button onClick={() => setCurrentTool('freehand')} className={`px-3 py-2 border rounded-lg text-sm transition-colors ${currentTool === 'freehand' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'}`}>
                      ✏️ ציור חופשי
                    </button>
                    <button onClick={() => setCurrentTool('line')} className={`px-3 py-2 border rounded-lg text-sm transition-colors ${currentTool === 'line' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'}`}>
                      ━ קו ישר
                    </button>
                    <button onClick={() => setCurrentTool('rectangle')} className={`px-3 py-2 border rounded-lg text-sm transition-colors ${currentTool === 'rectangle' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'}`}>
                      ▭ מלבן
                    </button>
                    <button onClick={() => setCurrentTool('circle')} className={`px-3 py-2 border rounded-lg text-sm transition-colors ${currentTool === 'circle' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'}`}>
                      ⚫ עיגול
                    </button>
                    <button onClick={() => setCurrentTool('arrow')} className={`px-3 py-2 border rounded-lg text-sm transition-colors ${currentTool === 'arrow' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'}`}>
                      ➡️ חץ
                    </button>
                    <button onClick={() => setCurrentTool('text')} className={`px-3 py-2 border rounded-lg text-sm transition-colors ${currentTool === 'text' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:border-blue-500'}`}>
                      📝 טקסט
                    </button>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      title="בחר צבע"
                    />
                    <button onClick={undoLastAnnotation} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-500 transition-colors">
                      ↶ בטל
                    </button>
            </div>
                )}
          </div>
        </div>
            
            <div className="flex-1 relative bg-gray-100 overflow-hidden">
                  <iframe
                    ref={iframeRef}
                src={govmapUrl}
                className={`absolute inset-0 w-full h-full border-0 ${isMapLocked ? 'pointer-events-none' : ''}`}
                style={{ display: govmapUrl ? 'block' : 'none' }}
                    allowFullScreen
            />
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full ${isMapLocked ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                    />
                  </div>

            {govmapUrl && (
              <div className="p-3 bg-gray-50 border-t border-gray-200" dir="ltr">
                <strong className="block mb-2 text-right text-sm font-medium text-gray-900">🔗 GovMap URL:</strong>
                <div className="bg-white p-2 rounded border border-gray-300 break-all font-mono text-xs max-h-24 overflow-y-auto">
                  <a href={govmapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {govmapUrl}
                  </a>
            </div>
              <button
                  onClick={copyGovMapUrl}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  📋 העתק URL
              </button>
            </div>
            )}
            </div>

          {/* Bottom Section: Tab Selection (like Step 4) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Tab Buttons */}
            <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('search')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  activeTab === 'search'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <h4 className={`font-semibold text-sm ${
                    activeTab === 'search' ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    חיפוש כתובת
                  </h4>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('upload')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  activeTab === 'upload'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">📤</span>
                  <h4 className={`font-semibold text-sm ${
                    activeTab === 'upload' ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    צילום מפות
                  </h4>
                  {(screenshots.wideArea || screenshots.zoomedNoTazea || screenshots.zoomedWithTazea) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {[screenshots.wideArea, screenshots.zoomedNoTazea, screenshots.zoomedWithTazea].filter(Boolean).length}/3
                    </span>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('save')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  activeTab === 'save'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">💾</span>
                  <h4 className={`font-semibold text-sm ${
                    activeTab === 'save' ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    מפות שמורות
                  </h4>
                  {savedMaps.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {savedMaps.length}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeTab === 'search' && (
                <div className="space-y-4">
                {/* Search Results Section */}
                {!govmapData && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">🔍 אין תוצאות חיפוש</p>
                    <p className="text-sm">השתמשו בטופס החיפוש מעל המפה כדי לחפש כתובת</p>
                  </div>
                )}

                {govmapData && (
                  <>
                    {/* Coordinates */}
                    {(coords.wgs84 || coords.itm) && (
                      <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
                        <div className="mb-3">
                          <strong>WGS84 (GPS):</strong><br />
                          <span>{coords.wgs84 ? `Lat: ${coords.wgs84.lat?.toFixed(6)}\nLon: ${coords.wgs84.lon?.toFixed(6)}` : '--'}</span>
                        </div>
                        <div>
                          <strong>ITM (ישראל):</strong><br />
                          <span>{coords.itm ? `E: ${coords.itm.easting}\nN: ${coords.itm.northing}` : '--'}</span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">הערות</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg text-right resize-y min-h-[80px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        placeholder="הוסיפו הערות על המפה..."
                      />
                    </div>

                    {/* Annotations */}
                    {annotations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">סימונים ({annotations.length})</h3>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                          {annotations.map((ann, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border border-gray-300" style={{ background: ann.color }} />
                                <span className="text-xs">{getAnnotationName(ann)}</span>
                              </div>
                              <button
                                onClick={() => deleteAnnotation(i)}
                                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                              >
                                מחק
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save Map Button */}
                    <button
                      onClick={saveMapLocal}
                      disabled={!govmapData}
                      className="w-full bg-green-600 text-white p-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      💾 שמור מפה
                    </button>
                  </>
                )}
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-800">
                    <p className="font-medium mb-1">הוראות צילום מפות:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>נווטו במפה לזום הרצוי</li>
                      <li>לחצו על הכפתור המתאים לצילום</li>
                      <li>הצילומים ישולבו במסמך הסופי</li>
                    </ol>
                  </div>

                  {/* 3 Screenshot Capture Buttons */}
                  <div className="space-y-3">
                    {/* Wide Area Screenshot - for Section 1.1 */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">1. מפה רחבה (סביבה)</h4>
                          <p className="text-xs text-gray-500">תוצג בסעיף 1.1 - גודל מלא</p>
                        </div>
                        {screenshots.wideArea && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">נשמר</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => captureScreenshot('wideArea')}
                          disabled={isCapturing || !govmapData}
                          className={`flex-1 p-2 rounded-lg font-medium transition-colors ${
                            isCapturing && capturingType === 'wideArea'
                              ? 'bg-blue-400 text-white cursor-wait'
                              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isCapturing && capturingType === 'wideArea' ? '⏳ מצלם...' : '📸 צלם מפה רחבה'}
                        </button>
                        <label className="p-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
                          📤
                          <input
                            ref={fileInputRefWideArea}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleManualScreenshotUpload(e, 'wideArea')}
                          />
                        </label>
                      </div>
                      {screenshots.wideArea && (
                        <div className="mt-2 relative group">
                          <img src={screenshots.wideArea} alt="Wide area map" className="w-full rounded border border-gray-300 max-h-24 object-contain" />
                          <button
                            onClick={() => handleDeleteScreenshot('wideArea')}
                            className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            title="מחק"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Zoomed No Tazea Screenshot - for Section 1.2 left */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">2. תקריב ללא תצ״א</h4>
                          <p className="text-xs text-gray-500">תוצג בסעיף 1.2 - זוג מפות (שמאל)</p>
                        </div>
                        {screenshots.zoomedNoTazea && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">נשמר</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => captureScreenshot('zoomedNoTazea')}
                          disabled={isCapturing || !govmapData}
                          className={`flex-1 p-2 rounded-lg font-medium transition-colors ${
                            isCapturing && capturingType === 'zoomedNoTazea'
                              ? 'bg-indigo-400 text-white cursor-wait'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isCapturing && capturingType === 'zoomedNoTazea' ? '⏳ מצלם...' : '📸 צלם תקריב ללא תצ״א'}
                        </button>
                        <label className="p-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
                          📤
                          <input
                            ref={fileInputRefZoomedNoTazea}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleManualScreenshotUpload(e, 'zoomedNoTazea')}
                          />
                        </label>
                      </div>
                      {screenshots.zoomedNoTazea && (
                        <div className="mt-2 relative group">
                          <img src={screenshots.zoomedNoTazea} alt="Zoomed without Tazea" className="w-full rounded border border-gray-300 max-h-24 object-contain" />
                          <button
                            onClick={() => handleDeleteScreenshot('zoomedNoTazea')}
                            className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            title="מחק"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Zoomed With Tazea Screenshot - for Section 1.2 right */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">3. תקריב עם תצ״א</h4>
                          <p className="text-xs text-gray-500">תוצג בסעיף 1.2 - זוג מפות (ימין)</p>
                        </div>
                        {screenshots.zoomedWithTazea && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">נשמר</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => captureScreenshot('zoomedWithTazea')}
                          disabled={isCapturing || !govmapData}
                          className={`flex-1 p-2 rounded-lg font-medium transition-colors ${
                            isCapturing && capturingType === 'zoomedWithTazea'
                              ? 'bg-purple-400 text-white cursor-wait'
                              : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isCapturing && capturingType === 'zoomedWithTazea' ? '⏳ מצלם...' : '📸 צלם תקריב עם תצ״א'}
                        </button>
                        <label className="p-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
                          📤
                          <input
                            ref={fileInputRefZoomedWithTazea}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleManualScreenshotUpload(e, 'zoomedWithTazea')}
                          />
                        </label>
                      </div>
                      {screenshots.zoomedWithTazea && (
                        <div className="mt-2 relative group">
                          <img src={screenshots.zoomedWithTazea} alt="Zoomed with Tazea" className="w-full rounded border border-gray-300 max-h-24 object-contain" />
                          <button
                            onClick={() => handleDeleteScreenshot('zoomedWithTazea')}
                            className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            title="מחק"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Screenshot count indicator */}
                  <div className="text-center text-sm text-gray-600">
                    {[screenshots.wideArea, screenshots.zoomedNoTazea, screenshots.zoomedWithTazea].filter(Boolean).length}/3 תמונות נשמרו
                  </div>

                  {/* Clear All Button */}
                  <button
                    onClick={clearAll}
                    className="w-full bg-gray-600 text-white p-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
                  >
                    🗑️ נקה הכל
                  </button>
                </div>
              )}

              {activeTab === 'save' && (
                <div className="space-y-4">
                  {savedMaps.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">אין מפות שמורות</div>
                  ) : (
                    <ul className="space-y-2">
                      {savedMaps.map((map: any) => (
                        <li
                          key={map.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            map.id === currentMapId
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-gray-50 border-gray-300 hover:border-blue-300 hover:bg-gray-100'
                          }`}
                        >
                          <div 
                            onClick={() => loadMapLocal(map.id)}
                            className="cursor-pointer"
                          >
                            <div className="font-medium text-gray-900">{map.address_input}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(map.created_at).toLocaleDateString('he-IL')}
                              {(map.annotations?.length || 0) > 0 && ` | ${map.annotations.length} סימונים`}
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteSavedMap(map.id, e)}
                            className="mt-2 w-full px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            🗑️ מחק
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// Trigger Vercel rebuild - 1767115101

