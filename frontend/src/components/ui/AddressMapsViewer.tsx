'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Settings, Save, Trash2, Undo2, Copy, Eye } from 'lucide-react'

interface GovMapData {
  address: {
    normalized: string
    details: any
  }
  coordinates: {
    wgs84: { lat: number, lon: number }
    itm: { easting: number, northing: number }
  }
  govmap: {
    url: string
    urlWithTazea: string
    urlWithoutTazea: string
    iframeHtml?: string
  }
  confidence: number
  displayAddress?: string
}

interface Annotation {
  type: 'freehand' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'text'
  color: string
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
  points?: { x: number, y: number }[]
}

interface SavedMap {
  id: string
  address_input: string
  address_normalized: string
  latitude: number
  longitude: number
  itm_easting: number
  itm_northing: number
  confidence: number
  address_details: any
  govmap_url: string
  govmap_url_with_tazea: string
  govmap_url_without_tazea: string
  govmap_iframe_html?: string
  annotations: Annotation[]
  annotation_canvas_data: string
  notes?: string
  zoom_level: number
  show_tazea: boolean
  created_at: string
  annotation_count: number
}

export default function AddressMapsViewer() {
  // State
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [govmapData, setGovmapData] = useState<GovMapData | null>(null)
  const [mapImage, setMapImage] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentTool, setCurrentTool] = useState('select')
  const [currentColor, setCurrentColor] = useState('#ff0000')
  const [isDrawing, setIsDrawing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([])
  const [currentMapId, setCurrentMapId] = useState<string | null>(null)
  const [isMapLocked, setIsMapLocked] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info')

  // Form inputs
  const [streetInput, setStreetInput] = useState('')
  const [numberInput, setNumberInput] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [notesInput, setNotesInput] = useState('')

  // טען כתובת אחרונה מ-localStorage אם אין נתונים
  useEffect(() => {
    if (!streetInput && !cityInput && typeof window !== 'undefined') {
      const lastAddress = localStorage.getItem('shamay_last_address')
      if (lastAddress) {
        // נסה לפרק את הכתובת לחלקים
        const parts = lastAddress.split(',')
        if (parts.length > 0) {
          const streetPart = parts[0].trim()
          const cityPart = parts.length > 1 ? parts[parts.length - 1].trim() : ''
          
          // חיפוש מספר בניין
          const buildingMatch = streetPart.match(/(\d+)/)
          if (buildingMatch) {
            setNumberInput(buildingMatch[1])
            setStreetInput(streetPart.substring(0, buildingMatch.index).trim().replace(/^רחוב\s*/i, ''))
          } else {
            setStreetInput(streetPart.replace(/^רחוב\s*/i, ''))
          }
          
          if (cityPart) {
            setCityInput(cityPart)
          }
        }
      }
    }
  }, [])

  // Coordinates display
  const [wgs84Coords, setWgs84Coords] = useState('--')
  const [itmCoords, setItmCoords] = useState('--')

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Initialize
  useEffect(() => {
    setupCanvas()
    loadSavedMaps()
  }, [])

  const setupCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const wrapper = canvas.parentElement
      if (wrapper) {
        canvas.width = wrapper.clientWidth
        canvas.height = wrapper.clientHeight
        redraw()
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
  }

  const showMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setSearchMessage(text)
    setMessageType(type)

    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        setSearchMessage('')
      }, 3000)
    }
  }

  const toggleMapLock = () => {
    if (!govmapData) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    const newLocked = !isMapLocked
    setIsMapLocked(newLocked)

    if (newLocked) {
      showMessage('המפה נעולה - כעת תוכלו לצייר סימונים', 'success')
    } else {
      showMessage('המפה משוחררת - תוכלו לנווט במפה', 'info')
    }
  }

  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all annotations on top of the iframe
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'select') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setStartX(x)
    setStartY(y)
    setIsDrawing(true)

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

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (currentTool === 'freehand') {
      setAnnotations(prev => {
        const newAnnotations = [...prev]
        const lastAnnotation = newAnnotations[newAnnotations.length - 1]
        if (lastAnnotation && lastAnnotation.points) {
          lastAnnotation.points.push({ x, y })
        }
        return newAnnotations
      })
      redraw()
    } else {
      // Preview shape
      redraw()
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawPreviewShape(ctx, startX, startY, x, y)
      }
    }
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (currentTool === 'rectangle') {
      setAnnotations(prev => [...prev, {
        type: 'rectangle',
        color: currentColor,
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY)
      }])
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2))
      setAnnotations(prev => [...prev, {
        type: 'circle',
        color: currentColor,
        x: startX,
        y: startY,
        radius
      }])
    } else if (currentTool === 'line') {
      setAnnotations(prev => [...prev, {
        type: 'line',
        color: currentColor,
        x1: startX,
        y1: startY,
        x2: x,
        y2: y
      }])
    } else if (currentTool === 'arrow') {
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
    redraw()
    updateAnnotationsList()
  }

  const updateAnnotationsList = () => {
    // This will be handled by the annotations list display in the UI
  }

  const getAnnotationName = (annotation: Annotation) => {
    const names = {
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
    setAnnotations(prev => prev.filter((_, i) => i !== index))
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

  const searchAddress = async () => {
    console.log('🚀 searchAddress function called')
    console.log('🚀 streetInput:', streetInput)
    console.log('🚀 cityInput:', cityInput)
    
    if (!streetInput.trim() || !cityInput.trim()) {
      console.log('❌ Validation failed: missing street or city')
      showMessage('נא להזין רחוב ועיר לפחות', 'error')
      return
    }

    const address = `${streetInput} ${numberInput} ${cityInput}`.trim()
    const displayAddress = `${streetInput} ${numberInput}, ${cityInput}`

    console.log('✅ Validation passed, address:', address)
    showMessage('מחפש כתובת...', 'info')

    try {
      console.log('🔵 Calling /api/address-to-govmap with address:', address)
      
      // Add timestamp to avoid caching
      const url = `/api/address-to-govmap?t=${Date.now()}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({ address, options: { zoom: 11, showTazea: true, showInfo: false } })
      })

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        contentType: response.headers.get('content-type'),
        ok: response.ok
      })

      // Get response as text first to check if it's JSON
      const responseText = await response.text()
      console.log('📄 Response text (first 500 chars):', responseText.substring(0, 500))

      // Check if it's JSON
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError)
        console.error('❌ Full response text:', responseText)
        console.error('❌ Check Network tab for more details')
        showMessage(`שגיאה: השרת החזיר HTML במקום JSON. סטטוס: ${response.status}. בדוק את הקונסול לפרטים נוספים.`, 'error')
        return
      }

      if (!result.success) {
        showMessage(result.error || 'כתובת לא נמצאה', 'error')
        return
      }

      const newGovmapData = {
        ...result,
        displayAddress
      }

      setGovmapData(newGovmapData)
      setCurrentAddress(result.address.normalized)
      showMessage(`נמצא: ${result.address.normalized}`, 'success')

      // Display coordinates
      setWgs84Coords(`Lat: ${result.coordinates.wgs84.lat.toFixed(6)}\nLon: ${result.coordinates.wgs84.lon.toFixed(6)}`)
      setItmCoords(`E: ${result.coordinates.itm.easting}\nN: ${result.coordinates.itm.northing}`)

      // Load map image from GovMap iframe
      await loadMapImage(result.govmap.url)

    } catch (error) {
      showMessage(`שגיאה: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const loadMapImage = async (govmapUrl: string) => {
    showMessage('מציג מפה GovMap... נווטו במפה ואז נעלו אותה לציור', 'success')

    // Display the GovMap iframe (unlocked for navigation)
    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = govmapUrl
      iframe.style.display = 'block'
    }

    // Reset lock state
    setIsMapLocked(false)

    // Clear canvas for annotations
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    setMapImage(govmapUrl)
  }

  const saveMap = async () => {
    if (!govmapData) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasData = canvas.toDataURL()

    const addressMapData = {
      address_input: govmapData.displayAddress || `${streetInput} ${numberInput}, ${cityInput}`,
      address_normalized: govmapData.address.normalized,
      latitude: govmapData.coordinates.wgs84.lat,
      longitude: govmapData.coordinates.wgs84.lon,
      itm_easting: govmapData.coordinates.itm.easting,
      itm_northing: govmapData.coordinates.itm.northing,
      confidence: govmapData.confidence,
      address_details: govmapData.address.details,
      govmap_url: govmapData.govmap.url,
      govmap_url_with_tazea: govmapData.govmap.urlWithTazea,
      govmap_url_without_tazea: govmapData.govmap.urlWithoutTazea,
      govmap_iframe_html: govmapData.govmap.iframeHtml,
      annotations: annotations,
      annotation_canvas_data: canvasData,
      notes: notesInput || null,
      zoom_level: 15,
      show_tazea: false
    }

    showMessage('שומר...', 'info')

    try {
      const response = await fetch('/api/govmap-address-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressMapData)
      })

      const result = await response.json()

      if (result.success) {
        showMessage('המפה נשמרה בהצלחה!', 'success')
        setCurrentMapId(result.id)
        await loadSavedMaps()
      } else {
        showMessage(`שגיאה בשמירה: ${result.error}`, 'error')
      }

    } catch (error) {
      showMessage(`שגיאה: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const loadSavedMaps = async () => {
    try {
      const response = await fetch('/api/govmap-address-maps?limit=50')
      const maps = await response.json()
      setSavedMaps(maps)
    } catch (error) {
      console.error('Error loading saved maps:', error)
    }
  }

  const loadMap = async (id: string) => {
    try {
      const response = await fetch(`/api/govmap-address-maps/${id}`)
      const map = await response.json()

      // Parse address back into components
      const parts = map.address_input.split(',')
      const streetAndNumber = (parts[0] || '').trim().split(' ')
      const number = streetAndNumber.pop() || ''
      const street = streetAndNumber.join(' ')
      const city = (parts[1] || '').trim()

      setStreetInput(street)
      setNumberInput(number)
      setCityInput(city)

      const newGovmapData = {
        address: {
          normalized: map.address_normalized,
          details: map.address_details
        },
        coordinates: {
          wgs84: { lat: map.latitude, lon: map.longitude },
          itm: { easting: map.itm_easting, northing: map.itm_northing }
        },
        govmap: {
          url: map.govmap_url,
          urlWithTazea: map.govmap_url_with_tazea,
          urlWithoutTazea: map.govmap_url_without_tazea,
          iframeHtml: map.govmap_iframe_html
        },
        confidence: map.confidence
      }

      setGovmapData(newGovmapData)
      setCurrentAddress(map.address_normalized)
      setAnnotations(map.annotations || [])
      setNotesInput(map.notes || '')
      setCurrentMapId(id)

      // Display coordinates
      setWgs84Coords(`Lat: ${map.latitude.toFixed(6)}\nLon: ${map.longitude.toFixed(6)}`)
      setItmCoords(`E: ${map.itm_easting}\nN: ${map.itm_northing}`)

      await loadMapImage(map.govmap_url)
      redraw()
      updateAnnotationsList()

      showMessage('מפה נטענה', 'success')

    } catch (error) {
      showMessage(`שגיאה בטעינת מפה: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  const clearAll = () => {
    if (annotations.length > 0 || govmapData) {
      if (!confirm('למחוק את כל הסימונים והמפה?')) return
    }

    setStreetInput('')
    setNumberInput('')
    setCityInput('')
    setNotesInput('')

    // Reset coordinate displays
    setWgs84Coords('--')
    setItmCoords('--')

    // Hide iframe and reset lock
    const iframe = iframeRef.current
    if (iframe) {
      iframe.style.display = 'none'
      iframe.src = ''
    }

    // Reset lock state
    setIsMapLocked(false)

    setGovmapData(null)
    setCurrentAddress(null)
    setAnnotations([])
    setMapImage(null)
    setCurrentMapId(null)

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    updateAnnotationsList()

    showMessage('נוקה', 'info')
  }

  const copyGovMapUrl = () => {
    if (govmapData?.govmap.url) {
      navigator.clipboard.writeText(govmapData.govmap.url).then(() => {
        showMessage('URL הועתק!', 'success')
      }).catch(err => {
        console.error('Failed to copy:', err)
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🗺️ מפות כתובות עם סימונים</h1>
          <p className="text-gray-600">חפשו כתובת, הוסיפו סימונים על המפה ושמרו לעיון מאוחר</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-200px)]">
          {/* Left Sidebar: Search & Tools */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-3 border-b-2 border-blue-500">חיפוש כתובת</h2>

            <div className="mb-6">
              <div className="mb-4">
                <label className="block mb-2 text-gray-600 font-semibold">רחוב</label>
                <input
                  type="text"
                  value={streetInput}
                  onChange={(e) => setStreetInput(e.target.value)}
                  placeholder="נורדאו / Nordau"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-gray-600 font-semibold">מספר בית</label>
                <input
                  type="text"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  placeholder="8"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-gray-600 font-semibold">עיר</label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="רעננה / Raanana"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                />
              </div>

              <button
                onClick={searchAddress}
                className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg"
              >
                🔍 חפש כתובת
              </button>

              {searchMessage && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  messageType === 'error' ? 'bg-red-100 text-red-700' :
                  messageType === 'success' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {searchMessage}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">קואורדינטות</h2>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 font-mono">
                <div className="mb-2">
                  <strong>WGS84 (GPS):</strong><br />
                  <span>{wgs84Coords}</span>
                </div>
                <div>
                  <strong>ITM (ישראל):</strong><br />
                  <span>{itmCoords}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">הערות</h2>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="הוסיפו הערות על המפה..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-right min-h-[60px] resize-y focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">סימונים</h2>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {annotations.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">אין סימונים</div>
                ) : (
                  annotations.map((annotation, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className="text-sm text-gray-700">
                          {getAnnotationName(annotation)}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        מחק
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={saveMap}
              disabled={!govmapData}
              className="w-full p-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              💾 שמור מפה
            </button>

            <button
              onClick={clearAll}
              className="w-full p-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
            >
              🗑️ נקה הכל
            </button>
          </div>

          {/* Center: Map Canvas */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex gap-3 flex-wrap items-center">
              <button
                onClick={toggleMapLock}
                className={`px-4 py-2 rounded-lg font-semibold ${
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
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    👆 בחירה
                  </button>
                  <button
                    onClick={() => setCurrentTool('freehand')}
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'freehand' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ✏️ ציור חופשי
                  </button>
                  <button
                    onClick={() => setCurrentTool('line')}
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ━ קו ישר
                  </button>
                  <button
                    onClick={() => setCurrentTool('rectangle')}
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ▭ מלבן
                  </button>
                  <button
                    onClick={() => setCurrentTool('circle')}
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ⚫ עיגול
                  </button>
                  <button
                    onClick={() => setCurrentTool('arrow')}
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'arrow' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ➡️ חץ
                  </button>
                  <button
                    onClick={() => setCurrentTool('text')}
                    className={`px-3 py-2 rounded text-sm ${
                      currentTool === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    📝 טקסט
                  </button>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    title="בחר צבע"
                  />
                  <button
                    onClick={undoLastAnnotation}
                    className="px-3 py-2 rounded text-sm bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    ↶ בטל
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                style={{ display: govmapData ? 'block' : 'none' }}
                allowFullScreen
              />
              <canvas
                ref={canvasRef}
                className={`absolute top-0 left-0 w-full h-full ${
                  isMapLocked ? 'pointer-events-auto' : 'pointer-events-none'
                } ${currentTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={() => setIsDrawing(false)}
              />
            </div>

            {govmapData && (
              <div className="p-3 bg-gray-50 border-t-2 border-gray-200 text-sm text-gray-600">
                <div className="mb-2 font-semibold text-right">🔗 GovMap URL:</div>
                <div className="bg-white p-2 rounded text-left font-mono text-xs max-h-20 overflow-y-auto break-all">
                  <a
                    href={govmapData.govmap.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {govmapData.govmap.url}
                  </a>
                </div>
                <button
                  onClick={copyGovMapUrl}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  📋 העתק URL
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar: Saved Maps */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">מפות שמורות</h2>
            <div className="space-y-2">
              {savedMaps.length === 0 ? (
                <div className="text-gray-500 text-center py-4">אין מפות שמורות</div>
              ) : (
                savedMaps.map((map) => (
                  <div
                    key={map.id}
                    onClick={() => loadMap(map.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      map.id === currentMapId
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-semibold text-gray-800">{map.address_input}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(map.created_at).toLocaleDateString('he-IL')}
                      {map.annotation_count > 0 && ` | ${map.annotation_count} סימונים`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
