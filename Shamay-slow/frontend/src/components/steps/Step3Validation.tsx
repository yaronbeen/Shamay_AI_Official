'use client'

import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Building, 
  Edit3, 
  Save, 
  Loader2, 
  ChevronLeft, 
  RotateCcw, 
  History, 
  ChevronRightCircleIcon,
  Info,
  X
} from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import React, { useState, useEffect, useRef, useMemo } from 'react'

interface Step3ValidationProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
}

type ExtractedData = ValuationData['extractedData'] & {
  land_registry?: Record<string, any>
  building_permit?: Record<string, any>
  shared_building?: Record<string, any>
  interior_analysis?: Record<string, any>
  exterior_analysis?: Record<string, any>
  [key: string]: any
}

export type Step3DocumentFile = {
  type?: string
  name?: string
  url?: string
  file?: { type?: string }
}

export const filterPdfFiles = (files: Step3DocumentFile[]): Step3DocumentFile[] => {
  return files.filter((f) => {
    const name = (f.name || '').toLowerCase()
    const url = (f.url || '').toLowerCase()
    const rawType = (f.type || f.file?.type || '').toLowerCase()

    const isPdf =
      rawType === 'application/pdf' ||
      name.endsWith('.pdf') ||
      url.endsWith('.pdf') ||
      ['tabu', 'permit', 'building_permit', 'condo', 'planning'].includes(rawType)

    const isGarmushka = url.includes('garmushka') || name.includes('garmushka') || rawType.includes('garmushka')
    const isFromUploads =
      url.includes('/uploads/') ||
      url.includes('/api/files/') ||
      url.includes('vercel-storage')

    return isPdf && isFromUploads && !isGarmushka
  })
}

export const getStep3FileTypeLabel = (type: string): string => {
  const normalizedType = (type || '').toLowerCase()
  const labels: Record<string, string> = {
    tabu: 'נסח טאבו',
    permit: 'היתר בניה',
    building_permit: 'היתר בניה',
    condo: 'צו בית משותף',
    condominium_order: 'צו בית משותף',
    planning: 'מידע תכנוני',
    planning_sheet: 'מידע תכנוני'
  }
  return labels[normalizedType] || type
}

// Reusable Field Editor Component with Provenance Tooltip
function EditableField({
  field,
  label,
  value,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  dataSource,
  provenanceInfo,
  onNavigateToDocument,
  type = 'text',
  options
}: {
  field: string
  label: string
  value: string | number | undefined
  editingField: string | null
  tempValue: string
  onEdit: (field: string, value: string) => void
  onSave: (field: string) => void
  onCancel: () => void
  onValueChange: (value: string) => void
  dataSource: string
  provenanceInfo?: {
    documentName?: string
    pageNumber?: number
    confidence?: number
    extractionMethod?: string
  } | null
  onNavigateToDocument?: (documentName: string, pageNumber?: number) => void
  type?: 'text' | 'textarea' | 'select'
  options?: string[]
}) {
  const displayValue = value || 'לא נמצא'
  const isEditing = editingField === field
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipContent = provenanceInfo ? (
    <div className="text-sm space-y-1">
      {provenanceInfo.documentName && (
        <p><strong>מסמך:</strong> {provenanceInfo.documentName}</p>
      )}
      {provenanceInfo.pageNumber && (
        <p><strong>עמוד:</strong> {provenanceInfo.pageNumber}</p>
      )}
      {provenanceInfo.confidence !== undefined && (
        <p><strong>רמת ביטחון:</strong> {Math.round(provenanceInfo.confidence * 100)}%</p>
      )}
      {provenanceInfo.extractionMethod && (
        <p><strong>שיטת חילוץ:</strong> {provenanceInfo.extractionMethod === 'manual' ? 'ידני' : 'AI'}</p>
      )}
      {onNavigateToDocument && provenanceInfo.documentName && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigateToDocument(provenanceInfo.documentName!, provenanceInfo.pageNumber)
            setShowTooltip(false)
          }}
          className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          הצג במסמך
        </button>
      )}
    </div>
  ) : (
    <div className="text-sm text-gray-500">אין מידע מקור זמין</div>
  )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right flex items-center gap-2">
        <span className="flex-1">{label}</span>
        <span className="relative inline-block">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={(e) => {
              e.stopPropagation()
              setShowTooltip(!showTooltip)
              if (onNavigateToDocument && provenanceInfo?.documentName) {
                onNavigateToDocument(provenanceInfo.documentName, provenanceInfo.pageNumber)
              }
            }}
            className={`text-blue-500 hover:text-blue-700 transition-colors ${provenanceInfo ? 'cursor-pointer' : 'cursor-help opacity-50'}`}
            title={provenanceInfo ? 'מידע מקור זמין - לחץ להצגה' : 'אין מידע מקור זמין'}
          >
            <Info className="w-4 h-4" />
          </button>
          {(showTooltip && provenanceInfo) && (
            <div 
              className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 text-right"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="text-xs mb-1 font-semibold border-b border-gray-700 pb-1">מידע מקור</div>
              {tooltipContent}
              <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
          {(showTooltip && !provenanceInfo) && (
            <div 
              className="absolute right-0 bottom-full mb-2 w-64 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-50 text-right"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="text-xs mb-1 font-semibold border-b border-gray-700 pb-1">מידע מקור</div>
              <div className="text-sm text-gray-300">אין מידע מקור זמין לשדה זה</div>
              <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          )}
        </span>
      </label>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            {type === 'textarea' ? (
              <textarea
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[80px]"
                dir="rtl"
              />
            ) : type === 'select' && options ? (
              <select
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                dir="rtl"
              >
                {options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                dir="rtl"
              />
            )}
            <button
              onClick={() => onSave(field)}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-right">{String(displayValue)}</span>
            <button
              onClick={() => onEdit(field, String(value || ''))}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{dataSource}</p>
    </div>
  )
}

export function Step3Validation({ data, updateData, onValidationChange, sessionId }: Step3ValidationProps) {
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState<string>('')
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [allFiles, setAllFiles] = useState<Array<{
    type: string
    name: string
    preview?: string
    url?: string
    file?: File
    source?: string
  }>>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [provenanceData, setProvenanceData] = useState<Record<string, {
    documentName?: string
    pageNumber?: number
    confidence?: number
    extractionMethod?: string
    bbox?: { x: number; y: number; width: number; height: number }
    documentId?: string
  }>>({})
  const [pdfViewerPage, setPdfViewerPage] = useState<number>(1)
  
  // AI Extraction History
  const [aiExtractions, setAIExtractions] = useState<any[]>([])
  const [showAIHistory, setShowAIHistory] = useState(false)
  const [isRestoringAI, setIsRestoringAI] = useState(false)

  // Validation - always allow proceeding
  const validationCalledRef = useRef(false)
  useEffect(() => {
    if (!validationCalledRef.current) {
      onValidationChange(true)
      validationCalledRef.current = true
    }
  }, [onValidationChange])

  // Load session data and provenance
  useEffect(() => {
    const loadSessionData = async () => {
      if (!sessionId || Object.keys(extractedData).length > 0) return
      
      try {
        const [sessionResponse, provenanceResponse] = await Promise.all([
          fetch(`/api/session/${sessionId}`),
          fetch(`/api/provenance?sessionId=${sessionId}`).catch(() => null)
        ])
        
        if (!sessionResponse.ok) return

        const sessionData = await sessionResponse.json()
        
        // Load extracted data
        const extractedDataFromSession = sessionData.extractedData || sessionData.data?.extractedData
        if (extractedDataFromSession && Object.keys(extractedDataFromSession).length > 0) {
          setExtractedData(extractedDataFromSession)
        }
        
        // Load files
        if (sessionData.data?.uploads && Array.isArray(sessionData.data.uploads)) {
          const files = await getAllFilesFromSessionData(sessionData.data.uploads)
          setAllFiles(files)
        }
        
        // Load provenance data
        if (provenanceResponse && provenanceResponse.ok) {
          const provenanceResult = await provenanceResponse.json()
          const provenanceRecords = provenanceResult.provenance || []
          
          // Map provenance by field_path
          const provenanceMap: Record<string, {
            documentName?: string
            documentId?: string
            pageNumber?: number
            confidence?: number
            extractionMethod?: string
            bbox?: { x: number; y: number; width: number; height: number }
          }> = {}
          
          provenanceRecords.forEach((record: any) => {
            if (record.is_active && record.field_path) {
              // Take the first active record for each field
              if (!provenanceMap[record.field_path]) {
                let bbox = null
                if (record.bbox) {
                  try {
                    bbox = typeof record.bbox === 'string' ? JSON.parse(record.bbox) : record.bbox
                  } catch {
                    bbox = null
                  }
                }
                provenanceMap[record.field_path] = {
                  documentName: record.document_name,
                  documentId: record.document_id,
                  pageNumber: record.page_number,
                  confidence: parseFloat(record.confidence) || undefined,
                  extractionMethod: record.extraction_method === 'manual' ? 'manual' : 'ai',
                  bbox: bbox
                }
              }
            }
          })
          
          setProvenanceData(provenanceMap)
        }
        
        setFilesLoading(false)
      } catch (error) {
        console.error('Error loading session data:', error)
        setFilesLoading(false)
      }
    }

    loadSessionData()
  }, [sessionId, extractedData])
  
  // Function to navigate to a specific document/page
  const navigateToDocument = (documentName: string, pageNumber?: number) => {
    const fileIndex = allFiles.findIndex(f => f.name === documentName || f.name.includes(documentName))
    if (fileIndex !== -1) {
      setCurrentFileIndex(fileIndex)
      setPdfViewerPage(pageNumber || 1)
    }
  }
  
  // Function to select a field and highlight it
  const handleFieldClick = (fieldPath: string) => {
    const provenance = getProvenanceForField(fieldPath)
    if (provenance && provenance.pageNumber) {
      setPdfViewerPage(provenance.pageNumber)
      navigateToDocument(provenance.documentName || '', provenance.pageNumber)
    }
  }
  
  // Helper to get provenance info for a field (tries multiple field name variations)
  const getProvenanceForField = (fieldName: string) => {
    // Try exact match first
    if (provenanceData[fieldName]) {
      return provenanceData[fieldName]
    }
    
    // Try snake_case version
    const snakeCase = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()
    if (provenanceData[snakeCase]) {
      return provenanceData[snakeCase]
    }
    
    // Try with common prefixes
    const prefixes = ['land_registry.', 'building_permit.', 'shared_building.']
    for (const prefix of prefixes) {
      if (provenanceData[`${prefix}${fieldName}`]) {
        return provenanceData[`${prefix}${fieldName}`]
      }
      if (provenanceData[`${prefix}${snakeCase}`]) {
        return provenanceData[`${prefix}${snakeCase}`]
      }
    }
    
    return null
  }

  // Sync with props
  useEffect(() => {
    if (data.extractedData && Object.keys(data.extractedData).length > 0) {
      setExtractedData(data.extractedData)
    }
  }, [data.extractedData])

  const getAllFilesFromSessionData = async (sessionUploads: any[]) => {
    const files: Array<{
      type: string
      name: string
      preview?: string
      url?: string
      file?: File
    }> = []

    if (!Array.isArray(sessionUploads)) return files

    for (const upload of sessionUploads) {
      if (upload.status !== 'completed') continue

      const fileName = upload.name || upload.fileName || `${upload.type}_document`
      const fileType = upload.mimeType || 'application/octet-stream'
      const isPDF = fileType === 'application/pdf' || 
                   fileType.includes('pdf') || 
                   fileName.toLowerCase().endsWith('.pdf') ||
                   ['tabu', 'permit', 'condo'].includes(upload.type)

      if (isPDF && upload.url) {
        files.push({
          type: upload.type,
          name: fileName,
          preview: upload.url,
          url: upload.url,
          file: new File([], fileName, { type: 'application/pdf' })
        })
      }
    }

    return files
  }

  // Filter PDF files
  const pdfFiles = useMemo(() => filterPdfFiles(allFiles), [allFiles])

  const currentFile = pdfFiles[currentFileIndex]


  const handleFieldEdit = (field: string, currentValue: string) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  const handleFieldSave = (field: string) => {
    const newExtractedData = {
      ...extractedData,
      [field]: tempValue
    }
    
    setExtractedData(newExtractedData)
    updateData({ extractedData: newExtractedData })
    setEditingField(null)
    setTempValue('')
  }

  const handleFieldCancel = () => {
    setEditingField(null)
    setTempValue('')
  }

  const getDataSource = (field: string): string => {
    const sourceMap: Record<string, string> = {
      registrationOffice: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      gush: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      parcel: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      chelka: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      ownershipType: 'נשלף מתוך תעודת בעלות (עמוד 2)',
      attachments: 'נשלף מתוך תעודת בעלות (עמוד 3)',
      sharedAreas: 'נשלף מתוך צו בית משותף (סעיף 2)',
      buildingYear: 'נשלף מתוך היתר בנייה',
      floor: 'נשלף מתוך צו בית משותף',
      builtArea: 'נשלף מתוך היתר בנייה (עמוד 2)',
      buildingDescription: 'נשלף מתוך צו בית משותף (סעיף 1)',
      propertyCondition: 'נקבע מתמונות הנכס',
      finishLevel: 'נקבע מתמונות הנכס',
      propertyLayoutDescription: 'נשלף מניתוח תמונות פנים',
      conditionAssessment: 'נשלף מניתוח תמונות פנים',
      buildingCondition: 'נשלף מניתוח תמונות חוץ',
      buildingFeatures: 'נשלף מניתוח תמונות חוץ',
      buildingType: 'נשלף מניתוח תמונות חוץ',
      overallAssessment: 'נשלף מניתוח תמונות חוץ',
      permittedUse: 'נשלף מתוך מידע תכנוני',
      averagePricePerSqm: 'חושב מתוך נכסים דומים',
      medianPricePerSqm: 'חושב מתוך נכסים דומים',
      adjustmentFactor: 'מבוסס על מאפייני הנכס'
    }
    return sourceMap[field] || 'נשלף מהמסמכים'
  }

  // Load AI extractions
  const loadAIExtractions = async () => {
    if (!sessionId) return
    try {
      const response = await fetch(`/api/session/${sessionId}/ai-extractions`)
      if (response.ok) {
        const { extractions } = await response.json()
        setAIExtractions(extractions || [])
      }
    } catch (error) {
      console.error('Error loading AI extractions:', error)
    }
  }

  useEffect(() => {
    if (sessionId && aiExtractions.length === 0) {
      loadAIExtractions()
    }
  }, [sessionId])

  const restoreAIExtraction = async (extractionId: number) => {
    if (!sessionId) return
    setIsRestoringAI(true)
    try {
      const response = await fetch(`/api/session/${sessionId}/ai-extractions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractionId, action: 'restore' })
      })
      
      if (response.ok) {
        const { restoredFields } = await response.json()
        const updatedExtractedData = { ...extractedData, ...restoredFields }
        setExtractedData(updatedExtractedData)
        updateData({ extractedData: updatedExtractedData })
        await loadAIExtractions()
        alert('✅ נתונים שוחזרו לגרסת הבינה המלאכותית המקורית')
      }
    } catch (error) {
      console.error('Error restoring AI extraction:', error)
      alert('❌ שגיאה בשחזור הנתונים')
    } finally {
      setIsRestoringAI(false)
    }
  }

  const displayExtractedData = data.extractedData || extractedData
  const hasExtractedData = Object.keys(displayExtractedData).length > 0

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900 text-right">
            תצוגת מסמכים ונתונים שחולצו
          </h2>
          <div className="flex items-center gap-3">
            {aiExtractions.length > 0 && (
              <button
                onClick={() => setShowAIHistory(!showAIHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">
                  היסטוריית AI ({aiExtractions.length})
                </span>
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 text-right">
          סקור את המסמכים שהועלו ואת הנתונים שחולצו מהם באמצעות AI
        </p>
      </div>

      {/* AI History Panel */}
      {showAIHistory && aiExtractions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6" dir="rtl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              גרסאות קודמות של חילוץ הנתונים
            </h3>
            <button
              onClick={() => setShowAIHistory(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {aiExtractions.map((extraction, index) => (
              <div key={extraction.id} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        גרסה #{aiExtractions.length - index}
                      </span>
                      {extraction.is_active && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                          🤖 גרסה נוכחית
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>תאריך: {new Date(extraction.extraction_date).toLocaleString('he-IL')}</p>
                      <p>{Object.keys(extraction.extracted_fields || {}).length} שדות</p>
                    </div>
                  </div>
                  <button
                    onClick={() => restoreAIExtraction(extraction.id)}
                    disabled={extraction.is_active || isRestoringAI}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {extraction.is_active ? 'גרסה נוכחית' : 'שחזר גרסה זו'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-sm font-semibold text-green-900">עיבוד הושלם בהצלחה</h3>
            <p className="text-green-700 text-xs">
              הנתונים נחלצו מהמסמכים. ניתן לערוך ולאמת את הנתונים למטה.
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-right">צפייה במסמכים</h3>
            
            {/* Document Tabs */}
            {pdfFiles.length > 0 && (
              <div className="flex space-x-reverse space-x-1 mb-4">
                {pdfFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentFileIndex(index)
                      setPdfViewerPage(1)
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentFileIndex === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getStep3FileTypeLabel(file.type || '')}
                  </button>
                ))}
              </div>
            )}

            {/* Document Display */}
            <div className="border border-gray-300 rounded-lg bg-gray-50">
              {filesLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                    <p className="text-gray-600">טוען מסמכים...</p>
                  </div>
                </div>
              ) : currentFile?.url ? (
                <div className="relative">
                  <iframe
                    key={`${currentFile.url}#page=${pdfViewerPage}`}
                    src={`${currentFile.url}#page=${pdfViewerPage}&view=FitH`}
                    title={currentFile.name || 'מסמך PDF'}
                    className="w-full h-[700px] rounded-lg bg-white"
                    allow="fullscreen"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg">אין מסמכים להצגה</p>
                    <p className="text-sm">העלה מסמכים בשלב הקודם</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Navigation */}
            {pdfFiles.length > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => {
                    const nextIndex = Math.max(0, currentFileIndex - 1)
                    setCurrentFileIndex(nextIndex)
                    setPdfViewerPage(1)
                  }}
                  disabled={currentFileIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightCircleIcon className="w-4 h-4" />
                  <span>הקודם</span>
                </button>
                <div className="text-sm text-gray-600">
                  {currentFileIndex + 1} מתוך {pdfFiles.length}
                </div>
                <button
                  onClick={() => {
                    const nextIndex = Math.min(pdfFiles.length - 1, currentFileIndex + 1)
                    setCurrentFileIndex(nextIndex)
                    setPdfViewerPage(1)
                  }}
                  disabled={currentFileIndex >= pdfFiles.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>הבא</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
      </div>

      {/* Extraction Summary */}
      {hasExtractedData && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 text-right">סיכום חילוץ נתונים</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">מצב משפטי</h4>
              </div>
              <div className="text-sm text-gray-600">
                <p>גוש: {extractedData.gush || 'לא נמצא'}</p>
                <p>חלקה: {extractedData.chelka || extractedData.parcel || 'לא נמצא'}</p>
                <p>בעלות: {extractedData.ownershipType || 'לא נמצא'}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-gray-900">פרטי בנייה</h4>
              </div>
              <div className="text-sm text-gray-600">
                <p>שנה: {extractedData.buildingYear || 'לא נמצא'}</p>
                <p>שטח: {extractedData?.land_registry?.apartment_registered_area || 'לא נמצא'} מ"ר</p>
                <p>שימוש: {extractedData.permittedUse || 'לא נמצא'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legal Status Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">מצב משפטי</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <EditableField
                field="registrationOffice"
                label="משרד רישום מקרקעין"
                value={extractedData.registrationOffice}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('registrationOffice')}
                provenanceInfo={getProvenanceForField('registrationOffice')}
                onNavigateToDocument={navigateToDocument}
                type="select"
              />
              <EditableField
                field="gush"
                label="מספר גוש"
                value={extractedData.gush}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('gush')}
                provenanceInfo={getProvenanceForField('gush')}
                onNavigateToDocument={navigateToDocument}
              />
              <EditableField
                field="chelka"
                label="מספר חלקה"
                value={extractedData.chelka || extractedData.parcel}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('chelka')}
                provenanceInfo={getProvenanceForField('chelka') || getProvenanceForField('parcel')}
                onNavigateToDocument={navigateToDocument}
              />
            </div>
            <div className="space-y-4">
              <EditableField
                field="ownershipType"
                label="סוג בעלות"
                value={extractedData.ownershipType}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('ownershipType')}
                provenanceInfo={getProvenanceForField('ownershipType')}
                onNavigateToDocument={navigateToDocument}
                type="select"
              />
              <EditableField
                field="attachments"
                label="נספחים"
                value={typeof extractedData.attachments === 'string' 
                  ? extractedData.attachments 
                  : Array.isArray(extractedData.attachments) 
                    ? (extractedData.attachments as any[]).map(a => a.description || a.type).join(', ')
                    : ''}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('attachments')}
                provenanceInfo={getProvenanceForField('attachments')}
                onNavigateToDocument={navigateToDocument}
              />
              <EditableField
                field="sharedAreas"
                label="שטחים משותפים"
                value={extractedData.sharedAreas}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('sharedAreas')}
                provenanceInfo={getProvenanceForField('sharedAreas')}
                onNavigateToDocument={navigateToDocument}
              />
            </div>
          </div>
        </div>
      )}

      {/* Building Details Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">פרטי הבניין</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <EditableField
                field="buildingYear"
                label="שנת בנייה"
                value={extractedData.buildingYear}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('buildingYear')}
                provenanceInfo={getProvenanceForField('buildingYear')}
                onNavigateToDocument={navigateToDocument}
              />
              <EditableField
                field="floor"
                label="קומה"
                value={extractedData.floor || data.floor}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('floor')}
                provenanceInfo={getProvenanceForField('floor')}
                onNavigateToDocument={navigateToDocument}
              />
            </div>
            <div className="space-y-4">
              <EditableField
                field="builtArea"
                label="שטח בנוי (מ'ר)"
                value={extractedData.builtArea}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('builtArea')}
                provenanceInfo={getProvenanceForField('builtArea')}
                onNavigateToDocument={navigateToDocument}
              />
              <EditableField
                field="buildingDescription"
                label="תיאור הבניין"
                value={extractedData.buildingDescription}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('buildingDescription')}
                provenanceInfo={getProvenanceForField('buildingDescription')}
                onNavigateToDocument={navigateToDocument}
              />
              <EditableField
                field="permittedUse"
                label="שימוש מותר"
                value={extractedData.permittedUse}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('permittedUse')}
                provenanceInfo={getProvenanceForField('permittedUse')}
                onNavigateToDocument={navigateToDocument}
              />
            </div>
          </div>
        </div>
      )}

      {/* Property Characteristics */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">מאפייני הנכס</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  מספר חדרים
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-right">{data.rooms || '3'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">נשלף מנתוני המשתמש</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  קומה
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-right">{data.floor || '3'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">נשלף מנתוני המשתמש</p>
              </div>
            </div>
            <div className="space-y-4">
              <EditableField
                field="propertyCondition"
                label="מצב הנכס"
                value={extractedData.propertyCondition}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('propertyCondition')}
                provenanceInfo={getProvenanceForField('propertyCondition')}
                onNavigateToDocument={navigateToDocument}
                type="select"
                options={['מצוין', 'טוב', 'בינוני', 'גרוע', 'דורש שיפוץ']}
              />
              <EditableField
                field="finishLevel"
                label="רמת גימור"
                value={extractedData.finishLevel}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource={getDataSource('finishLevel')}
                provenanceInfo={getProvenanceForField('finishLevel')}
                onNavigateToDocument={navigateToDocument}
                type="select"
                options={['בסיסי', 'בינוני', 'גבוה', 'יוקרתי', 'לוקסוס']}
              />
            </div>
          </div>
        </div>
      )}

      {/* Interior Analysis */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">ניתוח פנים הנכס</h3>
          <div className="space-y-4">
            <EditableField
              field="propertyLayoutDescription"
              label="תיאור תכנון הנכס"
              value={extractedData.propertyLayoutDescription}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות פנים"
              provenanceInfo={getProvenanceForField('propertyLayoutDescription')}
              onNavigateToDocument={navigateToDocument}
              type="textarea"
            />
            <EditableField
              field="conditionAssessment"
              label="הערכת מצב כללי"
              value={extractedData.conditionAssessment}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות פנים"
              provenanceInfo={getProvenanceForField('conditionAssessment')}
              onNavigateToDocument={navigateToDocument}
              type="textarea"
            />
            {extractedData.roomAnalysis && extractedData.roomAnalysis.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  ניתוח חדרים
                </label>
                <div className="space-y-3">
                  {extractedData.roomAnalysis.map((room: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{room.room_type}</h4>
                        <span className="text-sm text-gray-600">{room.condition}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <p><strong>תכונות:</strong> {room.features}</p>
                        <p><strong>הערכת גודל:</strong> {room.size_estimate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exterior Analysis */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">ניתוח חוץ הנכס</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <EditableField
                field="buildingCondition"
                label="מצב הבניין"
                value={extractedData.buildingCondition}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource="נשלף מניתוח תמונות חוץ"
                provenanceInfo={getProvenanceForField('buildingCondition')}
                onNavigateToDocument={navigateToDocument}
                type="select"
                options={['מצוין', 'טוב', 'בינוני', 'גרוע', 'דורש שיפוץ']}
              />
              <EditableField
                field="buildingType"
                label="סוג הבניין"
                value={extractedData.buildingType}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource="נשלף מניתוח תמונות חוץ"
                provenanceInfo={getProvenanceForField('buildingType')}
                onNavigateToDocument={navigateToDocument}
                type="select"
                options={['מגדל מגורים', 'בניין מגורים נמוך', 'בית פרטי', 'דופלקס', 'נטהאוז', 'וילה', 'קוטג']}
              />
            </div>
            <div className="space-y-4">
              <EditableField
                field="buildingFeatures"
                label="תכונות הבניין"
                value={extractedData.buildingFeatures}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource="נשלף מניתוח תמונות חוץ"
                provenanceInfo={getProvenanceForField('buildingFeatures')}
                onNavigateToDocument={navigateToDocument}
              />
              <EditableField
                field="overallAssessment"
                label="הערכה כללית"
                value={extractedData.overallAssessment}
                editingField={editingField}
                tempValue={tempValue}
                onEdit={handleFieldEdit}
                onSave={handleFieldSave}
                onCancel={handleFieldCancel}
                onValueChange={setTempValue}
                dataSource="נשלף מניתוח תמונות חוץ"
                provenanceInfo={getProvenanceForField('overallAssessment')}
                onNavigateToDocument={navigateToDocument}
                type="textarea"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
