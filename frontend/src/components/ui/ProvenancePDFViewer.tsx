/**
 * Provenance PDF Viewer
 * Enhanced PDF viewer with bounding box highlighting for provenance
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X
} from 'lucide-react'
import { BoundingBox, ProvenanceRecord } from '@/hooks/useProvenance'

interface FileInfo {
  type: string
  name: string
  url?: string
  preview?: string
  file?: File
  id?: string
}

interface ProvenancePDFViewerProps {
  files: FileInfo[]
  className?: string
  // Provenance props
  provenanceRecords?: ProvenanceRecord[]
  selectedFieldPath?: string | null
  selectedSourceIndex?: number
  highlightAll?: boolean
  // Callbacks
  onPageChange?: (documentIndex: number, pageNumber: number) => void
  onHighlightClick?: (fieldPath: string, sourceIndex: number) => void
  onManualBboxDraw?: (fieldPath: string, bbox: BoundingBox, pageNumber: number, documentIndex: number) => void
  // Manual drawing mode
  manualDrawMode?: {
    fieldPath: string
    onComplete: (bbox: BoundingBox, pageNumber: number) => void
    onCancel: () => void
  }
}

interface PageDimensions {
  width: number
  height: number
}

export function ProvenancePDFViewer({ 
  files,
  className = '',
  provenanceRecords = [],
  selectedFieldPath = null,
  selectedSourceIndex = 0,
  highlightAll = false,
  onPageChange,
  onHighlightClick,
  onManualBboxDraw,
  manualDrawMode
}: ProvenancePDFViewerProps) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageDimensions, setPageDimensions] = useState<PageDimensions>({ width: 0, height: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null)
  const [drawEnd, setDrawEnd] = useState<{ x: number, y: number } | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Filter only PDF files
  const pdfFiles = files.filter(file => 
    file.type === 'tabu' || 
    file.type === 'permit' || 
    file.type === 'condo' ||
    file.name.toLowerCase().endsWith('.pdf') ||
    (file.file && file.file.type === 'application/pdf')
  )

  const currentFile = pdfFiles[currentFileIndex]

  // Find provenance records for current document and page
  const currentDocumentId = currentFile?.id || currentFile?.name
  const currentPageProvenance = provenanceRecords.filter(record => 
    record.documentId === currentDocumentId || 
    record.documentName === currentFile?.name
  ).filter(record => record.pageNumber === currentPage)

  // Get selected provenance record
  const selectedProvenance = currentPageProvenance.find((record, index) => 
    record.fieldPath === selectedFieldPath && 
    index === selectedSourceIndex
  )

  // Switch to document containing the selected field
  useEffect(() => {
    if (selectedFieldPath && provenanceRecords.length > 0) {
      const matchingRecord = provenanceRecords.find(r => r.fieldPath === selectedFieldPath)
      if (matchingRecord) {
        // Find document index
        const docIndex = pdfFiles.findIndex(f => 
          f.id === matchingRecord.documentId || 
          f.name === matchingRecord.documentName
        )
        if (docIndex >= 0 && docIndex !== currentFileIndex) {
          setCurrentFileIndex(docIndex)
        }
        // Set page number
        if (matchingRecord.pageNumber !== currentPage) {
          setCurrentPage(matchingRecord.pageNumber)
          onPageChange?.(docIndex >= 0 ? docIndex : currentFileIndex, matchingRecord.pageNumber)
        }
      }
    }
  }, [selectedFieldPath, provenanceRecords, pdfFiles, currentFileIndex, currentPage, onPageChange])

  // Handle manual drawing
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!manualDrawMode || !containerRef.current) return
    
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    setIsDrawing(true)
    setDrawStart({ x, y })
    setDrawEnd({ x, y })
  }, [manualDrawMode, zoom])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !containerRef.current) return
    
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    setDrawEnd({ x, y })
  }, [isDrawing, drawStart, zoom])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawEnd || !manualDrawMode) {
      setIsDrawing(false)
      setDrawStart(null)
      setDrawEnd(null)
      return
    }

    const bbox: BoundingBox = {
      x: Math.min(drawStart.x, drawEnd.x),
      y: Math.min(drawStart.y, drawEnd.y),
      width: Math.abs(drawEnd.x - drawStart.x),
      height: Math.abs(drawEnd.y - drawStart.y)
    }

    // Only complete if bbox has minimum size
    if (bbox.width > 10 && bbox.height > 10) {
      manualDrawMode.onComplete(bbox, currentPage)
    } else {
      manualDrawMode.onCancel()
    }

    setIsDrawing(false)
    setDrawStart(null)
    setDrawEnd(null)
  }, [isDrawing, drawStart, drawEnd, manualDrawMode, currentPage])

  const goToPrevFile = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1)
      setCurrentPage(1)
      setIsLoading(true)
      onPageChange?.(currentFileIndex - 1, 1)
    }
  }

  const goToNextFile = () => {
    if (currentFileIndex < pdfFiles.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1)
      setCurrentPage(1)
      setIsLoading(true)
      onPageChange?.(currentFileIndex + 1, 1)
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
    
    // Try to get PDF page dimensions from iframe
    // Note: This is approximate; real PDF.js integration would be better
    if (iframeRef.current?.contentWindow) {
      // Set default dimensions (A4 at 72 DPI)
      setPageDimensions({ width: 612, height: 792 })
    }
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('שגיאה בטעינת המסמך')
  }

  // Calculate bbox overlay position
  const calculateBboxOverlay = (bbox: BoundingBox) => {
    return {
      left: `${(bbox.x / pageDimensions.width) * 100}%`,
      top: `${(bbox.y / pageDimensions.height) * 100}%`,
      width: `${(bbox.width / pageDimensions.width) * 100}%`,
      height: `${(bbox.height / pageDimensions.height) * 100}%`
    }
  }

  if (pdfFiles.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">אין מסמכי PDF להצגה</h3>
        <p className="text-gray-500">
          העלה מסמכי PDF (טאבו, היתר בנייה, צו בית משותף) כדי לראות אותם כאן
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{currentFile?.name}</h3>
            <p className="text-sm text-gray-500">
              מסמך {currentFileIndex + 1} מתוך {pdfFiles.length} • עמוד {currentPage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="הקטן"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="הגדל"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* File navigation */}
          <button
            onClick={goToPrevFile}
            disabled={currentFileIndex === 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="מסמך קודם"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            {currentFileIndex + 1}/{pdfFiles.length}
          </span>
          <button
            onClick={goToNextFile}
            disabled={currentFileIndex === pdfFiles.length - 1}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="מסמך הבא"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? 'צא ממסך מלא' : 'מסך מלא'}
          >
            {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download */}
          <button
            onClick={() => {
              if (currentFile?.url) {
                const link = document.createElement('a')
                link.href = currentFile.url
                link.download = currentFile.name
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="הורד מסמך"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Viewer with bbox overlays */}
      <div 
        ref={containerRef}
        className="relative bg-gray-50 min-h-[400px] flex items-center justify-center overflow-auto"
        onMouseDown={manualDrawMode ? handleMouseDown : undefined}
        onMouseMove={manualDrawMode ? handleMouseMove : undefined}
        onMouseUp={manualDrawMode ? handleMouseUp : undefined}
        onMouseLeave={manualDrawMode ? handleMouseUp : undefined}
        style={{ cursor: manualDrawMode ? 'crosshair' : 'default' }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">טוען מסמך...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center p-8">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <p className="text-gray-500 text-sm">
              לא ניתן לטעון את המסמך. בדוק שהקובץ תקין ונסה שוב.
            </p>
            {currentFile?.url && (
              <a 
                href={currentFile.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                פתח קובץ בחלון חדש
              </a>
            )}
          </div>
        )}

        {currentFile && !error && (
          <div className="relative w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <iframe
              ref={iframeRef}
              key={`pdf-${currentFile.url}-${currentFileIndex}-${currentPage}`}
              src={`${currentFile.url}#page=${currentPage}`}
              className="w-full h-full rounded border"
              title={currentFile.name}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ minHeight: '400px' }}
            />
            
            {/* Bbox Overlays */}
            {(highlightAll || selectedFieldPath) && currentPageProvenance.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ 
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`
              }}>
                {currentPageProvenance.map((record, index) => {
                  const isSelected = record.fieldPath === selectedFieldPath && index === selectedSourceIndex
                  const bboxStyle = calculateBboxOverlay(record.bbox)
                  
                  return (
                    <div
                      key={`${record.id}-${index}`}
                      className={`absolute border-2 transition-all pointer-events-auto cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-200 bg-opacity-30 shadow-lg z-10'
                          : 'border-blue-400 bg-blue-100 bg-opacity-20'
                      } ${
                        record.confidence < 0.7 ? 'border-yellow-500 bg-yellow-100 bg-opacity-20' : ''
                      }`}
                      style={bboxStyle}
                      onClick={() => onHighlightClick?.(record.fieldPath, index)}
                      title={`${record.fieldPath}: ${record.fieldValue || ''} (דיוק: ${Math.round(record.confidence * 100)}%)`}
                    >
                      {isSelected && (
                        <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {record.fieldPath}: {record.fieldValue || ''}
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Manual drawing rectangle */}
                {isDrawing && drawStart && drawEnd && manualDrawMode && (
                  <div
                    className="absolute border-2 border-dashed border-red-500 bg-red-100 bg-opacity-30"
                    style={{
                      left: `${Math.min(drawStart.x, drawEnd.x)}px`,
                      top: `${Math.min(drawStart.y, drawEnd.y)}px`,
                      width: `${Math.abs(drawEnd.x - drawStart.x)}px`,
                      height: `${Math.abs(drawEnd.y - drawStart.y)}px`
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual draw mode indicator */}
      {manualDrawMode && (
        <div className="p-3 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">
              לחץ וגרור כדי לצייר מקור חדש לשדה: {manualDrawMode.fieldPath}
            </span>
            <button
              onClick={manualDrawMode.onCancel}
              className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">סוג מסמך:</span> 
            <span className="mr-2">
              {currentFile?.type === 'tabu' && 'טאבו'}
              {currentFile?.type === 'permit' && 'היתר בנייה'}
              {currentFile?.type === 'condo' && 'צו בית משותף'}
              {!['tabu', 'permit', 'condo'].includes(currentFile?.type || '') && 'מסמך PDF'}
            </span>
          </div>
          <div>
            <span className="font-medium">מקורות:</span> 
            <span className="mr-2">
              {currentPageProvenance.length} מוצגים בעמוד זה
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

