'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Loader2, FileText, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react'

// Load PDF.js from CDN (reusing pattern from GarmushkaMeasurementViewer)
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

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface Highlight {
  fieldPath: string
  pageNumber: number
  bbox: BoundingBox
  confidence?: number
  isSelected?: boolean
}

interface PDFViewerWithHighlightsProps {
  pdfUrl: string
  currentPage?: number
  highlights?: Highlight[]
  selectedFieldPath?: string | null
  onPageChange?: (page: number) => void
  className?: string
}

export function PDFViewerWithHighlights({
  pdfUrl,
  currentPage = 1,
  highlights = [],
  selectedFieldPath = null,
  onPageChange,
  className = ''
}: PDFViewerWithHighlightsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(currentPage)
  const [scale, setScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<'width' | 'height' | 'page'>('width')
  const [flipHorizontal, setFlipHorizontal] = useState(false) // For Hebrew/RTL documents
  const [useIframeFallback, setUseIframeFallback] = useState(true) // Default to iframe for Hebrew text quality
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfUrl) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const pdfjsLib = await loadPdfJs()
        
        // Configure PDF.js for better Hebrew text rendering
        if (!pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions = {}
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js'
        
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
          // Enable font face loading for better Hebrew font rendering
          fontExtraProperties: true,
          // Improve text rendering quality
          disableFontFace: false,
          // Better text extraction for rendering
          verbosity: 0,
          // Enable native font loading for Hebrew fonts
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/web/cmaps/',
          // Use higher quality rendering
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/web/cmaps/',
          cMapPacked: true
        })
        const pdfDoc = await loadingTask.promise
        setPdf(pdfDoc)
        setNumPages(pdfDoc.numPages)
      } catch (err: any) {
        console.error('Error loading PDF:', err)
        setError(err.message || 'Failed to load PDF')
      } finally {
        setIsLoading(false)
      }
    }

    loadPDF()
  }, [pdfUrl])

  // Render page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current || !containerRef.current) return

      // Cancel any existing render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null
      }

      try {
        const pageNum = currentPage || page
        const pdfPage = await pdf.getPage(pageNum)
        
        const container = containerRef.current
        if (!container) return
        
        const containerWidth = container.clientWidth - 40 // padding
        const containerHeight = container.clientHeight - 40
        
        // Get base viewport - for Hebrew documents, we may need to check rotation
        // Try to get page rotation to handle RTL documents properly
        const rotation = pdfPage.rotate || 0
        const baseViewport = pdfPage.getViewport({ scale: 1, rotation: rotation })
        
        // Calculate scale based on fit mode
        let calculatedScale = 1
        if (fitMode === 'width') {
          calculatedScale = containerWidth / baseViewport.width
        } else if (fitMode === 'height') {
          calculatedScale = containerHeight / baseViewport.height
        } else {
          // Fit to page (both width and height)
          const widthScale = containerWidth / baseViewport.width
          const heightScale = containerHeight / baseViewport.height
          calculatedScale = Math.min(widthScale, heightScale)
        }
        
        // Apply zoom
        const finalScale = calculatedScale * zoom
        const scaledViewport = pdfPage.getViewport({ scale: finalScale, rotation: rotation })
        
        setScale(finalScale)
        setPageDimensions({ width: scaledViewport.width, height: scaledViewport.height })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        // Use maximum DPI for Hebrew text - critical for character spacing
        // Higher DPI ensures individual characters don't merge together
        const dpr = Math.min(window.devicePixelRatio || 1, 4) // Maximum for Hebrew text clarity
        const displayWidth = scaledViewport.width
        const displayHeight = scaledViewport.height

        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        // Scale context for high DPI
        context.scale(dpr, dpr)
        
        // Improve rendering quality - critical for Hebrew text
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        
        // Set font rendering hints for better character spacing (if supported)
        if ('fontKerning' in context) {
          (context as any).fontKerning = 'normal'
        }
        context.textBaseline = 'alphabetic'
        context.textAlign = 'right' // RTL default

        // Clear the canvas first
        context.clearRect(0, 0, displayWidth, displayHeight)

        // For RTL/Hebrew documents, flip horizontally if needed
        context.save()
        
        if (flipHorizontal) {
          // Flip horizontally for RTL viewing
          context.translate(displayWidth, 0)
          context.scale(-1, 1)
        }
        
        // For Hebrew documents, PDF.js canvas rendering has known issues with character spacing
        // Try rendering with transformMatrix to ensure proper scaling
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        }

        // Start render and store task reference
        const renderTask = pdfPage.render(renderContext)
        renderTaskRef.current = renderTask
        
        await renderTask.promise
        context.restore()
        renderTaskRef.current = null
      } catch (err: any) {
        // Ignore cancellation errors
        if (err.name === 'RenderingCancelledException' || err.message?.includes('cancelled')) {
          return
        }
        console.error('Error rendering PDF page:', err)
        setError(err.message || 'Failed to render PDF page')
        renderTaskRef.current = null
      }
    }

    renderPage()

    // Cleanup: cancel render on unmount or dependency change
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null
      }
    }
  }, [pdf, currentPage, page, zoom, fitMode, flipHorizontal])

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > numPages) return
    setPage(newPage)
    if (onPageChange) {
      onPageChange(newPage)
    }
  }

  // Zoom functions
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
    setFitMode('page') // Switch to page mode when zooming
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
    setFitMode('page') // Switch to page mode when zooming
  }

  const handleZoomReset = () => {
    setZoom(1)
    setFitMode('width')
  }

  const handleFitModeChange = (mode: 'width' | 'height' | 'page') => {
    setFitMode(mode)
    if (mode !== 'page') {
      setZoom(1) // Reset zoom when using fit modes
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">טוען PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center text-red-600">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg">שגיאה בטעינת PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const pageNum = currentPage || page
  const pageHighlights = highlights.filter(h => h.pageNumber === pageNum)

  return (
    <div className={`bg-gray-50 rounded-lg overflow-auto ${className}`} dir="rtl" style={{ minHeight: '500px' }}>
      <div ref={containerRef} className="relative p-4 flex flex-col items-center">
        {/* Controls Bar */}
        <div className="w-full mb-4 flex items-center justify-between flex-wrap gap-4 bg-white rounded-lg p-3 shadow-sm" dir="rtl">
          {/* Fit Mode Controls - Left side in RTL */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFitModeChange('width')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center ${
                fitMode === 'width' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="התאם לרוחב"
            >
              <span className="mr-1">רוחב</span>
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleFitModeChange('height')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center ${
                fitMode === 'height' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="התאם לגובה"
            >
              <span className="mr-1">גובה</span>
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleFitModeChange('page')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                fitMode === 'page' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="התאם לעמוד"
            >
              עמוד
            </button>
          </div>

          {/* Zoom Controls - Center */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="הקטן"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 px-2 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="הגדל"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              title="איפוס"
            >
              איפוס
            </button>
            <button
              onClick={() => setFlipHorizontal(!flipHorizontal)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                flipHorizontal
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="היפוך אופקי (עברית)"
            >
              {flipHorizontal ? '✓ היפוך' : 'היפוך'}
            </button>
            <button
              onClick={() => setUseIframeFallback(!useIframeFallback)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                useIframeFallback
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="מצב iframe (עברית - איכות טובה יותר, מומלץ)"
            >
              {useIframeFallback ? '✓ iframe' : 'canvas'}
            </button>
          </div>

          {/* Page Navigation - Right side in RTL */}
          {numPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pageNum - 1)}
                disabled={pageNum <= 1}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ← קודם
              </button>
              <span className="text-sm text-gray-600 px-2">
                עמוד {pageNum} מתוך {numPages}
              </span>
              <button
                onClick={() => handlePageChange(pageNum + 1)}
                disabled={pageNum >= numPages}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                הבא →
              </button>
            </div>
          )}
        </div>

        {/* PDF Canvas or Iframe Fallback */}
        <div 
          ref={canvasContainerRef}
          className="relative inline-block" 
          dir="rtl"
          style={{ 
            position: 'relative', 
            display: 'inline-block', 
            maxWidth: '100%',
            direction: 'rtl'
          }}
        >
          {useIframeFallback ? (
            <iframe
              src={`${pdfUrl}#page=${pageNum}`}
              className="border border-gray-300 shadow-lg bg-white"
              style={{ 
                width: '100%',
                minHeight: '600px',
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
              title={`PDF Page ${pageNum}`}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="border border-gray-300 shadow-lg bg-white"
              dir="rtl"
              style={{ 
                display: 'block', 
                maxWidth: '100%', 
                height: 'auto',
                direction: 'rtl'
              }}
            />
          )}
          
          {/* Highlight overlays - only show when using canvas */}
          {!useIframeFallback && pageDimensions && pageHighlights.map((highlight, index) => {
            const isSelected = selectedFieldPath === highlight.fieldPath
            const bbox = highlight.bbox
            
            // Scale the bounding box to match the rendered canvas scale
            const canvasWidth = pageDimensions.width
            const scaledX = (bbox.x * scale)
            const scaledY = (bbox.y * scale)
            const scaledWidth = (bbox.width * scale)
            const scaledHeight = (bbox.height * scale)
            
            // Calculate position based on flip state
            // If flipped, the canvas is mirrored, so highlights need to be positioned from the right
            let positionX = scaledX
            if (flipHorizontal) {
              // When flipped, calculate from right side (mirrored)
              positionX = canvasWidth - scaledX - scaledWidth
            }
            
            return (
              <div
                key={`${highlight.fieldPath}-${index}`}
                className={`absolute border-2 pointer-events-none ${
                  isSelected
                    ? 'border-blue-600 bg-blue-200 bg-opacity-30 shadow-lg'
                    : 'border-blue-400 bg-blue-100 bg-opacity-20'
                } ${highlight.confidence && highlight.confidence < 0.7 ? 'border-yellow-500 bg-yellow-100 bg-opacity-30' : ''}`}
                dir="rtl"
                style={{
                  [flipHorizontal ? 'right' : 'left']: `${positionX}px`,
                  top: `${scaledY}px`,
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                  zIndex: isSelected ? 10 : 5
                }}
                title={`${highlight.fieldPath} (דיוק: ${highlight.confidence ? Math.round(highlight.confidence * 100) : 'N/A'}%)`}
              >
                {isSelected && (
                  <div 
                    className="absolute -top-6 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap" 
                    dir="rtl"
                    style={{
                      [flipHorizontal ? 'right' : 'left']: '0'
                    }}
                  >
                    {highlight.fieldPath}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

