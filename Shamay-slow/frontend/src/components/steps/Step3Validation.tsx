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
  X,
  Plus,
  MapPin,
  ScrollText,
  FileCheck,
  Home
} from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import React, { useState, useEffect, useRef, useMemo } from 'react'

// Document tab types
type DocumentTab = 'tabu' | 'condo' | 'permit' | 'parcel'

const DOCUMENT_TABS: { id: DocumentTab; label: string; icon: React.ReactNode }[] = [
  { id: 'tabu', label: 'נסח טאבו', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'condo', label: 'צו בית משותף', icon: <Building className="w-4 h-4" /> },
  { id: 'permit', label: 'היתר בנייה', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'parcel', label: 'תיאור החלקה', icon: <MapPin className="w-4 h-4" /> },
]

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

// Section Header Component for visual dividers
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-300"></div>
      <h4 className="text-sm font-semibold text-gray-700 whitespace-nowrap">{title}</h4>
      <div className="flex-1 h-px bg-gray-300"></div>
    </div>
  )
}

// Document Info Note Component
function DocumentInfoNote({ documentType }: { documentType: string }) {
  const notes: Record<string, string> = {
    tabu: 'השדות המפורטים לעיל הם שדות אפשריים מנסח טאבו. לא בכל נסח מופיעים כל השדות, והיעדר שדה אינו מהווה חוסר נתון אלא מצב רישומי תקין.',
    condo: 'השדות המפורטים לעיל הם שדות אפשריים מצו בית משותף. לא בכל צו מופיעים כל השדות, והיעדר שדה אינו מהווה חוסר נתון.',
    permit: 'לכל נכס יכולים להיות 0, 1 או יותר היתרי בנייה. לא בכל היתר מופיעים כל השדות.',
    parcel: 'תיאור החלקה מבוסס על נתונים ידניים ומידע GIS.'
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6" dir="rtl">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">{notes[documentType]}</p>
      </div>
    </div>
  )
}

export function Step3Validation({ data, updateData, onValidationChange, sessionId }: Step3ValidationProps) {
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState<string>('')
  const [currentFileIndex, setCurrentFileIndex] = useState(0)

  // Document-based tab navigation
  const [selectedDocumentTab, setSelectedDocumentTab] = useState<DocumentTab>('tabu')
  const [selectedPermitIndex, setSelectedPermitIndex] = useState(0)
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

      {/* Split Layout: Fields Panel (Left) + PDF Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL - Document Fields */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 order-2 lg:order-1">
          {/* Document Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {DOCUMENT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDocumentTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedDocumentTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Document Info Note */}
          <DocumentInfoNote documentType={selectedDocumentTab} />

          {/* Tab Content */}
          <div className="space-y-4" dir="rtl">
            {/* TABU TAB */}
            {selectedDocumentTab === 'tabu' && (
              <div className="space-y-4">
                {/* זיהוי ורישום */}
                <SectionHeader title="זיהוי ורישום" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="gush" label="גוש" value={extractedData.gush} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('gush')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="chelka" label="חלקה" value={extractedData.chelka || extractedData.parcel} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('chelka')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="sub_chelka" label="תת־חלקה" value={extractedData.sub_chelka || extractedData.subChelka} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('sub_chelka')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="address_from_tabu" label="כתובת" value={extractedData.address_from_tabu || extractedData.addressFromTabu} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('address_from_tabu')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="registration_office" label="לשכת רישום מקרקעין" value={extractedData.registration_office || extractedData.registrationOffice} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('registration_office')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="tabu_extract_date" label="תאריך הפקת נסח" value={extractedData.tabu_extract_date || extractedData.issue_date} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('tabu_extract_date')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* מבנה וחלוקה */}
                <SectionHeader title="מבנה וחלוקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="buildings_count" label="מספר מבנים" value={extractedData.buildings_count || extractedData.buildingsCount} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('buildings_count')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="building_number" label="מספר מבנה / אגף" value={extractedData.building_number || extractedData.buildingNumber} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('building_number')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="sub_plots_count" label="מספר תתי־חלקות" value={extractedData.sub_plots_count || extractedData.subPlotsCount} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('sub_plots_count')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="registered_area" label="שטח קרקע כולל של החלקה" value={extractedData.registered_area || extractedData.registeredArea} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('registered_area')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* זכויות ובעלות */}
                <SectionHeader title="זכויות ובעלות" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="ownership_type" label="סוג הבעלות" value={extractedData.ownership_type || extractedData.ownershipType} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('ownership_type')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="rights" label="זכויות בנכס" value={extractedData.rights} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('rights')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="owners" label="בעלי זכויות" value={Array.isArray(extractedData.owners) ? extractedData.owners.map((o: any) => o.name || o).join(', ') : extractedData.owners} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('owners')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="shared_property" label="החלק ברכוש המשותף" value={extractedData.shared_property || extractedData.sharedProperty} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('shared_property')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* הצמדות */}
                <SectionHeader title="הצמדות" />
                <div className="grid grid-cols-1 gap-4">
                  <EditableField field="attachments" label="הצמדות" value={typeof extractedData.attachments === 'string' ? extractedData.attachments : Array.isArray(extractedData.attachments) ? (extractedData.attachments as any[]).map(a => `${a.description || a.type || ''} ${a.area ? `(${a.area} מ"ר)` : ''}`).join(', ') : ''} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('attachments')} onNavigateToDocument={navigateToDocument} type="textarea" />
                </div>

                {/* משכנתאות */}
                <SectionHeader title="משכנתאות" />
                <div className="grid grid-cols-1 gap-4">
                  <EditableField field="mortgages" label="משכנתאות" value={Array.isArray(extractedData.mortgages) ? extractedData.mortgages.map((m: any) => `${m.essence || ''} - ${m.amount || ''} (${m.rank || ''})`).join('; ') : extractedData.mortgages || extractedData.mortgage_essence} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('mortgages')} onNavigateToDocument={navigateToDocument} type="textarea" />
                </div>

                {/* הערות רישומיות – לכלל החלקה */}
                <SectionHeader title="הערות רישומיות – לכלל החלקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="plot_notes" label="הערות לחלקה" value={extractedData.plot_notes || extractedData.plotNotes} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('plot_notes')} onNavigateToDocument={navigateToDocument} type="textarea" />
                  <EditableField field="notes_action_type" label="מהות הפעולה" value={extractedData.notes_action_type || extractedData.notesActionType} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('notes_action_type')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="notes_beneficiary" label="שם המוטב" value={extractedData.notes_beneficiary || extractedData.notesBeneficiary} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('notes_beneficiary')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* הערות רישומיות – לתת־חלקה */}
                <SectionHeader title="הערות רישומיות – לתת־חלקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="sub_chelka_notes_action_type" label="מהות הפעולה (תת־חלקה)" value={extractedData.sub_chelka_notes_action_type} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('sub_chelka_notes_action_type')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="sub_chelka_notes_beneficiary" label="שם המוטב (תת־חלקה)" value={extractedData.sub_chelka_notes_beneficiary} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('sub_chelka_notes_beneficiary')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* זיקות הנאה – לכלל החלקה */}
                <SectionHeader title="זיקות הנאה – לכלל החלקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="easements_essence" label="מהות" value={extractedData.easements_essence || extractedData.easementsEssence} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('easements_essence')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="easements_description" label="תיאור" value={extractedData.easements_description || extractedData.easementsDescription} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('easements_description')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* זיקות הנאה – לתת־חלקה */}
                <SectionHeader title="זיקות הנאה – לתת־חלקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="sub_parcel_easements_essence" label="מהות (תת־חלקה)" value={extractedData.sub_parcel_easements_essence} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('sub_parcel_easements_essence')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="sub_parcel_easements_description" label="תיאור (תת־חלקה)" value={extractedData.sub_parcel_easements_description} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('sub_parcel_easements_description')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* נתוני יחידה */}
                <SectionHeader title="נתוני יחידה כפי שמופיעים בנסח" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="floor" label="קומה" value={extractedData.floor || data.floor} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('floor')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="apartment_registered_area" label="שטח דירה רשום" value={extractedData.apartment_registered_area || extractedData?.land_registry?.apartment_registered_area} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('apartment_registered_area')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="balcony_area" label="שטח מרפסת" value={extractedData.balcony_area || extractedData.balconyArea} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('balcony_area')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="additional_areas" label="שטחים נוספים" value={Array.isArray(extractedData.additional_areas) ? extractedData.additional_areas.join(', ') : extractedData.additional_areas} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('additional_areas')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="unit_description" label="תיאור הדירה" value={extractedData.unit_description || extractedData.unitDescription} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('unit_description')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* תקנון */}
                <SectionHeader title="תקנון" />
                <div className="grid grid-cols-1 gap-4">
                  <EditableField field="regulation_type" label="סוג התקנון" value={extractedData.regulation_type || extractedData.bylaws} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="נסח טאבו" provenanceInfo={getProvenanceForField('regulation_type')} onNavigateToDocument={navigateToDocument} />
                </div>
              </div>
            )}

            {/* CONDO TAB */}
            {selectedDocumentTab === 'condo' && (
              <div className="space-y-4">
                {/* זיהוי ומסמך */}
                <SectionHeader title="זיהוי ומסמך" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="order_issue_date" label="תאריך הפקת צו בית משותף" value={extractedData.order_issue_date || extractedData.orderIssueDate} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('order_issue_date')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* תיאור הבניין */}
                <SectionHeader title="תיאור הבניין" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="building_address" label="כתובת הבניין" value={extractedData.building_address || extractedData.buildingAddress} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('building_address')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="building_number" label="מספר מבנה" value={extractedData.building_number || extractedData.buildingNumber} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('building_number')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="building_floors" label="מספר קומות בבניין" value={extractedData.building_floors || extractedData.buildingFloors} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('building_floors')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="total_sub_plots" label="מספר תתי־חלקות כולל בבניין" value={extractedData.total_sub_plots || extractedData.totalSubPlots || extractedData.building_sub_plots_count} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('total_sub_plots')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* זיהוי תת־חלקה */}
                <SectionHeader title="זיהוי תת־חלקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="specific_sub_plot_number" label="מספר תת־חלקה" value={extractedData.specific_sub_plot?.number || extractedData.sub_chelka} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('specific_sub_plot')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="specific_sub_plot_floor" label="קומה של תת־החלקה" value={extractedData.specific_sub_plot?.floor || extractedData.floor} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('specific_sub_plot')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="specific_sub_plot_area" label="שטח תת־החלקה" value={extractedData.specific_sub_plot?.area} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('specific_sub_plot')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="specific_sub_plot_description" label="תיאור מילולי של תת־החלקה" value={extractedData.specific_sub_plot?.description} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('specific_sub_plot')} onNavigateToDocument={navigateToDocument} type="textarea" />
                </div>

                {/* רכוש משותף */}
                <SectionHeader title="רכוש משותף" />
                <div className="grid grid-cols-1 gap-4">
                  <EditableField field="shared_property_parts" label="חלקים ברכוש המשותף המיוחסים לתת־החלקה" value={extractedData.specific_sub_plot?.shared_property_parts || extractedData.shared_property} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('shared_property_parts')} onNavigateToDocument={navigateToDocument} />
                </div>

                {/* הצמדות לתת־חלקה */}
                <SectionHeader title="הצמדות לתת־חלקה" />
                <div className="grid grid-cols-1 gap-4">
                  <EditableField field="condo_attachments" label="הצמדות" value={Array.isArray(extractedData.specific_sub_plot?.attachments) ? extractedData.specific_sub_plot.attachments.map((a: any) => `${a.description || a.type || ''} ${a.area ? `(${a.area} מ"ר)` : ''}`).join(', ') : extractedData.specific_sub_plot?.attachments || ''} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="צו בית משותף" provenanceInfo={getProvenanceForField('condo_attachments')} onNavigateToDocument={navigateToDocument} type="textarea" />
                </div>
              </div>
            )}

            {/* PERMIT TAB */}
            {selectedDocumentTab === 'permit' && (
              <div className="space-y-4">
                {/* Permit Tabs - for multiple permits */}
                {(() => {
                  const permits = Array.isArray(extractedData.permits) ? extractedData.permits : (extractedData.permit_number ? [extractedData] : [])
                  return (
                    <>
                      {permits.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
                          {permits.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedPermitIndex(index)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                selectedPermitIndex === index
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              היתר {index + 1}
                            </button>
                          ))}
                          <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-50 text-gray-500 border border-dashed border-gray-300 hover:bg-gray-100">
                            <Plus className="w-4 h-4 inline" />
                          </button>
                        </div>
                      )}

                      {permits.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>לא הועלו היתרי בנייה</p>
                          <p className="text-sm">העלה היתר בנייה בשלב הקודם</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <EditableField field="permit_number" label="מספר היתר" value={permits[selectedPermitIndex]?.permit_number || permits[selectedPermitIndex]?.permitNumber} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="היתר בנייה" provenanceInfo={getProvenanceForField('permit_number')} onNavigateToDocument={navigateToDocument} />
                          <EditableField field="permit_date" label="תאריך היתר" value={permits[selectedPermitIndex]?.permit_date || permits[selectedPermitIndex]?.permitDate} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="היתר בנייה" provenanceInfo={getProvenanceForField('permit_date')} onNavigateToDocument={navigateToDocument} />
                          <EditableField field="permit_issue_date" label="תאריך הפקת היתר" value={permits[selectedPermitIndex]?.permit_issue_date || permits[selectedPermitIndex]?.permitIssueDate} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="היתר בנייה" provenanceInfo={getProvenanceForField('permit_issue_date')} onNavigateToDocument={navigateToDocument} />
                          <EditableField field="local_committee_name" label="שם הוועדה המקומית" value={permits[selectedPermitIndex]?.local_committee_name || permits[selectedPermitIndex]?.localCommitteeName} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="היתר בנייה" provenanceInfo={getProvenanceForField('local_committee_name')} onNavigateToDocument={navigateToDocument} />
                          <div className="md:col-span-2">
                            <EditableField field="permitted_usage" label="תיאור מותר (מילולי)" value={permits[selectedPermitIndex]?.permitted_usage || permits[selectedPermitIndex]?.permittedUsage || permits[selectedPermitIndex]?.permitted_description} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="היתר בנייה" provenanceInfo={getProvenanceForField('permitted_usage')} onNavigateToDocument={navigateToDocument} type="textarea" />
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* PARCEL TAB */}
            {selectedDocumentTab === 'parcel' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="parcelShape" label="צורת החלקה" value={extractedData.parcelShape || data.parcelShape} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="תיאור ידני / GIS" provenanceInfo={getProvenanceForField('parcelShape')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="parcelSurface" label="פני הקרקע" value={extractedData.parcelSurface || data.parcelSurface} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="תיאור ידני / GIS" provenanceInfo={getProvenanceForField('parcelSurface')} onNavigateToDocument={navigateToDocument} />
                </div>

                <SectionHeader title="גבולות החלקה" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField field="plotBoundaryNorth" label="גבול צפון" value={extractedData.plotBoundaryNorth || extractedData.boundary_north} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="תיאור ידני / GIS" provenanceInfo={getProvenanceForField('plotBoundaryNorth')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="plotBoundarySouth" label="גבול דרום" value={extractedData.plotBoundarySouth || extractedData.boundary_south} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="תיאור ידני / GIS" provenanceInfo={getProvenanceForField('plotBoundarySouth')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="plotBoundaryEast" label="גבול מזרח" value={extractedData.plotBoundaryEast || extractedData.boundary_east} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="תיאור ידני / GIS" provenanceInfo={getProvenanceForField('plotBoundaryEast')} onNavigateToDocument={navigateToDocument} />
                  <EditableField field="plotBoundaryWest" label="גבול מערב" value={extractedData.plotBoundaryWest || extractedData.boundary_west} editingField={editingField} tempValue={tempValue} onEdit={handleFieldEdit} onSave={handleFieldSave} onCancel={handleFieldCancel} onValueChange={setTempValue} dataSource="תיאור ידני / GIS" provenanceInfo={getProvenanceForField('plotBoundaryWest')} onNavigateToDocument={navigateToDocument} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - PDF Viewer */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 order-1 lg:order-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">צפייה במסמכים</h3>

          {/* PDF Document Tabs */}
          {pdfFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {pdfFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentFileIndex(index)
                    setPdfViewerPage(1)
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
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

          {/* PDF Display */}
          <div className="border border-gray-300 rounded-lg bg-gray-50">
            {filesLoading ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                  <p className="text-gray-600">טוען מסמכים...</p>
                </div>
              </div>
            ) : currentFile?.url ? (
              <iframe
                key={`${currentFile.url}#page=${pdfViewerPage}`}
                src={`${currentFile.url}#page=${pdfViewerPage}&view=FitH`}
                title={currentFile.name || 'מסמך PDF'}
                className="w-full h-[600px] rounded-lg bg-white"
                allow="fullscreen"
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] text-gray-500">
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
                  setCurrentFileIndex(Math.max(0, currentFileIndex - 1))
                  setPdfViewerPage(1)
                }}
                disabled={currentFileIndex === 0}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
              >
                <ChevronRightCircleIcon className="w-4 h-4" />
                <span>הקודם</span>
              </button>
              <span className="text-sm text-gray-600">{currentFileIndex + 1} / {pdfFiles.length}</span>
              <button
                onClick={() => {
                  setCurrentFileIndex(Math.min(pdfFiles.length - 1, currentFileIndex + 1))
                  setPdfViewerPage(1)
                }}
                disabled={currentFileIndex >= pdfFiles.length - 1}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
              >
                <span>הבא</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
