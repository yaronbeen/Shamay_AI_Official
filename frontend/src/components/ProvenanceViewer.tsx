'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react'

// Types
interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface Source {
  page: number
  bbox: [number, number, number, number] // [x, y, width, height]
  conf: number
}

interface Field {
  id: string
  label: string
  value: string
  sources: Source[]
  status: 'ok' | 'missing' | 'low_conf' | 'manual'
}

interface Page {
  page: number
  width: number
  height: number
  imageUrl: string
}

interface ProvenanceData {
  doc: {
    pages: Page[]
  }
  fields: Field[]
  meta: {
    units: string
    direction: 'rtl' | 'ltr'
  }
}

// Hook for navigation state and zoom calculations
function useProvenanceNavigation(data: ProvenanceData) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [selectedSourceIdxByField, setSelectedSourceIdxByField] = useState<Record<string, number>>({})
  const [selectedPage, setSelectedPage] = useState<number>(1)
  const [zoom, setZoom] = useState<number>(1)
  const [fitMode, setFitMode] = useState<'fitWidth' | 'fitHeight' | 'custom'>('fitWidth')
  const [showAllHighlights, setShowAllHighlights] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low_conf' | 'missing' | 'manual'>('all')

  // Calculate scale for current page
  const currentPage = data?.doc?.pages?.find(p => p.page === selectedPage) || null
  const getScale = useCallback((containerWidth: number, containerHeight: number) => {
    if (!currentPage) return 1
    
    if (fitMode === 'fitWidth') {
      return containerWidth / currentPage.width
    } else if (fitMode === 'fitHeight') {
      return containerHeight / currentPage.height
    }
    return zoom
  }, [currentPage, fitMode, zoom])

  // Transform bbox coordinates to screen coordinates
  const transformBbox = useCallback((bbox: [number, number, number, number], scale: number) => {
    return {
      x: bbox[0] * scale,
      y: bbox[1] * scale,
      width: bbox[2] * scale,
      height: bbox[3] * scale
    }
  }, [])

  // Navigation functions
  const selectField = useCallback((fieldId: string) => {
    setSelectedFieldId(fieldId)
    const field = data?.fields?.find(f => f.id === fieldId)
    if (field && field.sources.length > 0) {
      const firstSource = field.sources[0]
      setSelectedPage(firstSource.page)
      setSelectedSourceIdxByField(prev => ({ ...prev, [fieldId]: 0 }))
    }
  }, [data?.fields])

  const cycleSource = useCallback((fieldId: string, direction: number) => {
    const field = data?.fields?.find(f => f.id === fieldId)
    if (!field) return

    const currentIdx = selectedSourceIdxByField[fieldId] || 0
    const newIdx = Math.max(0, Math.min(field.sources.length - 1, currentIdx + direction))
    
    setSelectedSourceIdxByField(prev => ({ ...prev, [fieldId]: newIdx }))
    
    const newSource = field.sources[newIdx]
    if (newSource) {
      setSelectedPage(newSource.page)
    }
  }, [selectedSourceIdxByField, data?.fields])

  const selectHighlight = useCallback((fieldId: string, sourceIdx: number) => {
    setSelectedFieldId(fieldId)
    setSelectedSourceIdxByField(prev => ({ ...prev, [fieldId]: sourceIdx }))
    
    const field = data?.fields?.find(f => f.id === fieldId)
    if (field && field.sources[sourceIdx]) {
      setSelectedPage(field.sources[sourceIdx].page)
    }
  }, [data?.fields])

  return {
    selectedFieldId,
    selectedSourceIdxByField,
    selectedPage,
    zoom,
    fitMode,
    showAllHighlights,
    searchTerm,
    filterStatus,
    setSelectedFieldId,
    setSelectedPage,
    setZoom,
    setFitMode,
    setShowAllHighlights,
    setSearchTerm,
    setFilterStatus,
    getScale,
    transformBbox,
    selectField,
    cycleSource,
    selectHighlight
  }
}

// Document Pane Component
function DocumentPane({ 
  data, 
  navigation, 
  onManualSource 
}: { 
  data: ProvenanceData
  navigation: ReturnType<typeof useProvenanceNavigation>
  onManualSource: (fieldId: string, source: { page: number, bbox: [number, number, number, number] }) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null)
  const [drawEnd, setDrawEnd] = useState<{ x: number, y: number } | null>(null)
  const [manualFieldId, setManualFieldId] = useState<string | null>(null)

  const currentPage = data?.doc?.pages?.find(p => p.page === navigation.selectedPage) || null
  const selectedField = data?.fields?.find(f => f.id === navigation.selectedFieldId) || null
  const currentSourceIdx = navigation.selectedSourceIdxByField[navigation.selectedFieldId || ''] || 0

  // Handle mouse events for manual source drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!manualFieldId || !currentPage) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const scale = navigation.getScale(rect.width, rect.height)
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    
    setIsDrawing(true)
    setDrawStart({ x, y })
    setDrawEnd({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const scale = navigation.getScale(rect.width, rect.height)
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    
    setDrawEnd({ x, y })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawEnd || !manualFieldId || !currentPage) {
      setIsDrawing(false)
      setDrawStart(null)
      setDrawEnd(null)
      return
    }

    const bbox: [number, number, number, number] = [
      Math.min(drawStart.x, drawEnd.x),
      Math.min(drawStart.y, drawEnd.y),
      Math.abs(drawEnd.x - drawStart.x),
      Math.abs(drawEnd.y - drawStart.y)
    ]

    onManualSource(manualFieldId, { page: currentPage.page, bbox })
    
    setIsDrawing(false)
    setDrawStart(null)
    setDrawEnd(null)
    setManualFieldId(null)
  }

  const startManualSource = (fieldId: string) => {
    setManualFieldId(fieldId)
  }

  const cancelManualSource = () => {
    setManualFieldId(null)
    setIsDrawing(false)
    setDrawStart(null)
    setDrawEnd(null)
  }

  if (!currentPage) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">מסמך מקור</h3>
          <span className="text-sm text-gray-500">עמוד {currentPage.page}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => navigation.setZoom(Math.max(0.25, navigation.zoom - 0.25))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="הקטן"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(navigation.zoom * 100)}%
          </span>
          <button
            onClick={() => navigation.setZoom(Math.min(3, navigation.zoom + 0.25))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="הגדל"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          {/* Fit controls */}
          <button
            onClick={() => navigation.setFitMode('fitWidth')}
            className={`px-3 py-1 text-xs rounded ${
              navigation.fitMode === 'fitWidth' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            רוחב
          </button>
          <button
            onClick={() => navigation.setFitMode('fitHeight')}
            className={`px-3 py-1 text-xs rounded ${
              navigation.fitMode === 'fitHeight' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            גובה
          </button>
          
          {/* Show all highlights toggle */}
          <button
            onClick={() => navigation.setShowAllHighlights(!navigation.showAllHighlights)}
            className={`p-2 rounded-lg transition-colors ${
              navigation.showAllHighlights ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="הצג כל ההדגשות"
          >
            {navigation.showAllHighlights ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Page thumbnails */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {data?.doc?.pages?.map(page => (
          <button
            key={page.page}
            onClick={() => navigation.setSelectedPage(page.page)}
            className={`flex-shrink-0 w-16 h-20 rounded border-2 transition-colors ${
              page.page === navigation.selectedPage 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <img
              src={page.imageUrl}
              alt={`עמוד ${page.page}`}
              className="w-full h-full object-cover rounded"
            />
          </button>
        ))}
      </div>

      {/* Main document viewer */}
      <div className="flex-1 relative overflow-auto bg-gray-50 rounded-lg">
        {currentPage?.imageUrl && (
          <div
            ref={canvasRef}
            className="relative w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Check if it's a PDF (based on URL or type) */}
            {currentPage.imageUrl.toLowerCase().endsWith('.pdf') || 
             currentPage.imageUrl.includes('.pdf') || 
             currentPage.imageUrl.includes('/api/files/') ? (
              /* PDF Document - Use iframe */
              <iframe
                key={`pdf-${currentPage.imageUrl}-${currentPage.page}`}
                src={`${currentPage.imageUrl}${currentPage.imageUrl.includes('#') ? '' : '#page=' + currentPage.page}`}
                className="w-full h-full rounded border"
                title={`עמוד ${currentPage.page}`}
                style={{ minHeight: '500px' }}
              />
            ) : (
              /* Image - Use img tag */
              <img
                src={currentPage.imageUrl}
                alt={`עמוד ${currentPage.page}`}
                className="block"
                style={{
                  transform: `scale(${navigation.getScale(800, 600)})`,
                  transformOrigin: 'top left'
                }}
              />
            )}
          
          {/* Highlight overlays - Only for images, not PDFs (iframe doesn't support overlays easily) */}
          {!currentPage?.imageUrl?.toLowerCase().endsWith('.pdf') && 
           !currentPage?.imageUrl?.includes('.pdf') && 
           !currentPage?.imageUrl?.includes('/api/files/') && (
            <div
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                transform: `scale(${navigation.getScale(800, 600)})`,
                transformOrigin: 'top left',
                width: currentPage.width,
                height: currentPage.height
              }}
            >
              {data?.fields?.map(field => {
                const sourceIdx = navigation.selectedSourceIdxByField[field.id] || 0
                const source = field.sources[sourceIdx]
                
                if (!source || source.page !== currentPage.page) return null
                if (!navigation.showAllHighlights && field.id !== navigation.selectedFieldId) return null
                
                const isSelected = field.id === navigation.selectedFieldId
                const bbox = navigation.transformBbox(source.bbox, 1)
                
                return (
                  <div
                    key={`${field.id}-${sourceIdx}`}
                    className={`absolute border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-200 shadow-lg' 
                        : 'border-blue-400 bg-blue-100'
                    } ${
                      field.status === 'low_conf' ? 'border-yellow-500 bg-yellow-100' : ''
                    }`}
                    style={{
                      left: bbox.x,
                      top: bbox.y,
                      width: bbox.width,
                      height: bbox.height,
                      pointerEvents: 'auto'
                    }}
                    onClick={() => navigation.selectHighlight(field.id, sourceIdx)}
                    title={`${field.label}: ${field.value} (דיוק: ${Math.round(source.conf * 100)}%)`}
                  >
                    {isSelected && (
                      <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {field.label}: {field.value}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {/* Manual drawing rectangle */}
              {isDrawing && drawStart && drawEnd && currentPage && (
                <div
                  className="absolute border-2 border-dashed border-red-500 bg-red-100"
                  style={{
                    left: Math.min(drawStart.x, drawEnd.x),
                    top: Math.min(drawStart.y, drawEnd.y),
                    width: Math.abs(drawEnd.x - drawStart.x),
                    height: Math.abs(drawEnd.y - drawStart.y)
                  }}
                />
              )}
            </div>
          )}
          </div>
        )}
      </div>

      {/* Manual source controls */}
      {manualFieldId && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">
              לחץ וגרור כדי לצייר מקור חדש לשדה: {data?.fields?.find(f => f.id === manualFieldId)?.label}
            </span>
            <button
              onClick={cancelManualSource}
              className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Field Pane Component
function FieldPane({ 
  data, 
  navigation, 
  onManualSource 
}: { 
  data: ProvenanceData
  navigation: ReturnType<typeof useProvenanceNavigation>
  onManualSource: (fieldId: string, source: { page: number, bbox: [number, number, number, number] }) => void
}) {
  const filteredFields = (data?.fields || []).filter(field => {
    // Search filter
    if (navigation.searchTerm && !field.label.toLowerCase().includes(navigation.searchTerm.toLowerCase()) && 
        !field.value.toLowerCase().includes(navigation.searchTerm.toLowerCase())) {
      return false
    }
    
    // Status filter
    if (navigation.filterStatus !== 'all' && field.status !== navigation.filterStatus) {
      return false
    }
    
    return true
  })

  const getStatusIcon = (status: Field['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'low_conf': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'missing': return <XCircle className="w-4 h-4 text-red-600" />
      case 'manual': return <Edit3 className="w-4 h-4 text-blue-600" />
    }
  }

  const getStatusColor = (status: Field['status']) => {
    switch (status) {
      case 'ok': return 'border-green-200 bg-green-50'
      case 'low_conf': return 'border-yellow-200 bg-yellow-50'
      case 'missing': return 'border-red-200 bg-red-50'
      case 'manual': return 'border-blue-200 bg-blue-50'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-right">שדות מחולצים</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש שדות..."
            value={navigation.searchTerm}
            onChange={(e) => navigation.setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            dir="rtl"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'low_conf', 'missing', 'manual'] as const).map(status => (
            <button
              key={status}
              onClick={() => navigation.setFilterStatus(status)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                navigation.filterStatus === status 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'הכל' : 
               status === 'low_conf' ? 'דיוק נמוך' :
               status === 'missing' ? 'חסר' : 'ידני'}
            </button>
          ))}
        </div>
      </div>

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredFields.map(field => {
          const isSelected = field.id === navigation.selectedFieldId
          const currentSourceIdx = navigation.selectedSourceIdxByField[field.id] || 0
          const hasSources = field.sources.length > 0
          
          return (
            <div
              key={field.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : getStatusColor(field.status)
              }`}
              onClick={() => navigation.selectField(field.id)}
            >
              {/* Field header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(field.status)}
                  <span className="text-sm font-medium text-gray-900">{field.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasSources && (
                    <span className="text-xs text-gray-500">
                      {currentSourceIdx + 1}/{field.sources.length}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onManualSource(field.id, { page: 1, bbox: [0, 0, 100, 100] })
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    title="ערוך מקור"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Field value */}
              <div className="text-sm text-gray-700 mb-2" dir="ltr">
                {field.value || 'לא נמצא'}
              </div>
              
              {/* Sources */}
              {hasSources ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigation.cycleSource(field.id, -1)
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    disabled={currentSourceIdx === 0}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-gray-500">
                    עמוד {field.sources[currentSourceIdx].page} 
                    (דיוק: {Math.round(field.sources[currentSourceIdx].conf * 100)}%)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigation.cycleSource(field.id, 1)
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    disabled={currentSourceIdx === field.sources.length - 1}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500">אין מקור</span>
              )}
            </div>
          )
        })}
        
        {filteredFields.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>לא נמצאו שדות</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Main ProvenanceViewer Component
export function ProvenanceViewer({ 
  data, 
  onChange 
}: { 
  data: ProvenanceData
  onChange?: (data: ProvenanceData) => void
}) {
  const navigation = useProvenanceNavigation(data)

  const handleManualSource = useCallback((fieldId: string, source: { page: number, bbox: [number, number, number, number] }) => {
    if (!data?.fields) return
    
    const updatedData = {
      ...data,
      fields: data.fields.map(field => 
        field.id === fieldId 
          ? {
              ...field,
              status: 'manual' as const,
              sources: [...field.sources, { ...source, conf: 1.0 }]
            }
          : field
      )
    }
    
    onChange?.(updatedData)
    
    // Log telemetry
    console.log('Manual source added:', { fieldId, source, action: 'manual_override' })
  }, [data, onChange])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-900 text-right">מציג מקורות נתונים</h1>
        <p className="text-sm text-gray-600 text-right mt-1">
          לחץ על שדה כדי לראות את מקורו במסמך, או לחץ על הדגשה כדי לבחור שדה
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Document Pane */}
        <DocumentPane 
          data={data} 
          navigation={navigation}
          onManualSource={handleManualSource}
        />
        
        {/* Field Pane */}
        <FieldPane 
          data={data} 
          navigation={navigation}
          onManualSource={handleManualSource}
        />
      </div>
    </div>
  )
}

// Sample fixture data
export const sampleProvenanceData: ProvenanceData = {
  doc: {
    pages: [
      { page: 1, width: 2480, height: 3508, imageUrl: '/docs/sample_1.png' },
      { page: 2, width: 2480, height: 3508, imageUrl: '/docs/sample_2.png' }
    ]
  },
  fields: [
    {
      id: 'owner_name',
      label: 'שם בעלים',
      value: 'לי גולן',
      sources: [
        { page: 2, bbox: [820, 1460, 540, 90], conf: 0.92 }
      ],
      status: 'ok'
    },
    {
      id: 'parcel',
      label: 'חלקה',
      value: '42',
      sources: [
        { page: 1, bbox: [320, 980, 220, 80], conf: 0.71 },
        { page: 1, bbox: [320, 1260, 220, 80], conf: 0.55 }
      ],
      status: 'low_conf'
    },
    {
      id: 'gush',
      label: 'גוש',
      value: '9905',
      sources: [
        { page: 1, bbox: [120, 980, 180, 80], conf: 0.95 }
      ],
      status: 'ok'
    },
    {
      id: 'missing_field',
      label: 'שדה חסר',
      value: '',
      sources: [],
      status: 'missing'
    }
  ],
  meta: {
    units: 'px',
    direction: 'rtl'
  }
}
