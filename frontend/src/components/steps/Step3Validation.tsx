'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { History, RotateCcw, X, FileText, Building2, CheckCircle } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import { Step3FieldsPanel } from './Step3FieldsPanel'
import { Step3PDFPanel, PDFFile } from './Step3PDFPanel'
import { PlanningInformationSection } from './PlanningInformationSection'
import { CollapsibleDrawer } from '../ui/CollapsibleDrawer'
import { cn } from '@/lib/utils'

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

interface Step3Section {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  active: boolean
}

export function Step3Validation({ data, updateData, onValidationChange, sessionId }: Step3ValidationProps) {
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [allFiles, setAllFiles] = useState<PDFFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [provenanceData, setProvenanceData] = useState<Record<string, any>>({})
  const [activeSection, setActiveSection] = useState<string>('fields_validation')

  // AI Extraction History
  const [aiExtractions, setAIExtractions] = useState<any[]>([])
  const [showAIHistory, setShowAIHistory] = useState(false)
  const [isRestoringAI, setIsRestoringAI] = useState(false)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)

  const sections: Step3Section[] = [
    {
      id: 'fields_validation',
      title: 'בדיקת שדות',
      description: 'אימות ועריכה של כל השדות שחולצו מהמסמכים',
      icon: FileText,
      active: true
    },
    {
      id: 'planning_information',
      title: 'מידע תכנוני',
      description: 'תכניות בנייה, היתרי בנייה ותעודת גמר',
      icon: Building2,
      active: true
    }
  ]

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

          const provenanceMap: Record<string, any> = {}
          provenanceRecords.forEach((record: any) => {
            if (record.is_active && record.field_path) {
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

  // Sync with props
  useEffect(() => {
    if (data.extractedData && Object.keys(data.extractedData).length > 0) {
      setExtractedData(data.extractedData)
    }
  }, [data.extractedData])

  const getAllFilesFromSessionData = async (sessionUploads: any[]): Promise<PDFFile[]> => {
    const files: PDFFile[] = []

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
  const pdfFiles = useMemo(() => {
    const filtered = filterPdfFiles(allFiles) as PDFFile[]
    console.log('📁 [Step3] All files:', allFiles.length, 'PDF files:', filtered.length)
    console.log('📁 [Step3] PDF files URLs:', filtered.map(f => f.url))
    return filtered
  }, [allFiles])

  const currentFile = pdfFiles[currentFileIndex]
  console.log('📁 [Step3] Current file:', currentFile?.url, 'Loading:', filesLoading)

  // Track field edit for analytics
  const trackFieldEdit = useCallback(async (fieldKey: string, oldValue: string | undefined, newValue: string) => {
    if (!sessionId) return

    try {
      await fetch('/api/field-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fieldKey,
          oldValue: oldValue || '',
          newValue,
          timestamp: new Date().toISOString(),
        })
      })
    } catch (error) {
      // Don't block on tracking errors
      console.error('Error tracking field edit:', error)
    }
  }, [sessionId])

  // Handle field save with edit tracking
  const handleFieldSave = useCallback((field: string, value: string) => {
    const oldValue = extractedData[field]

    // Track the edit for analytics (fire and forget)
    if (oldValue !== value) {
      trackFieldEdit(field, oldValue, value)
    }

    const newExtractedData = {
      ...extractedData,
      [field]: value
    }

    setExtractedData(newExtractedData)
    updateData({ extractedData: newExtractedData })
  }, [extractedData, updateData, trackFieldEdit])

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
      }
    } catch (error) {
      console.error('Error restoring AI extraction:', error)
    } finally {
      setIsRestoringAI(false)
    }
  }

  const displayExtractedData = data.extractedData || extractedData

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* AI History Panel (collapsible) */}
      {showAIHistory && aiExtractions.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-4" dir="rtl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-blue-900">
              גרסאות קודמות של חילוץ הנתונים
            </h3>
            <button
              onClick={() => setShowAIHistory(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {aiExtractions.map((extraction, index) => (
              <div key={extraction.id} className="flex-shrink-0 bg-white rounded-lg p-3 border border-blue-200 min-w-[200px]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-900">
                      גרסה #{aiExtractions.length - index}
                    </span>
                    {extraction.is_active && (
                      <span className="mr-2 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                        נוכחית
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {new Date(extraction.extraction_date).toLocaleDateString('he-IL')}
                </div>
                <button
                  onClick={() => restoreAIExtraction(extraction.id)}
                  disabled={extraction.is_active || isRestoringAI}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3 h-3" />
                  {extraction.is_active ? 'פעיל' : 'שחזר'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between" dir="rtl">
        <h2 className="text-lg font-semibold text-gray-900">אימות נתונים</h2>
        <div className="flex items-center gap-2">
          {aiExtractions.length > 0 && (
            <button
              onClick={() => setShowAIHistory(!showAIHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>היסטוריית AI ({aiExtractions.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Toggles */}
      <div className="bg-white border-b px-4 py-3">
        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  activeSection === section.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Icon className={`w-8 h-8 ${
                    activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      {section.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {section.description}
                    </p>
                  </div>
                  {activeSection === section.id && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {activeSection === 'fields_validation' ? (
          /* Split Layout for Fields Validation */
          <>
            {/* Left Panel - Fields (Collapsible Drawer) */}
            <CollapsibleDrawer
              isOpen={isDrawerOpen}
              onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
              width="w-1/2"
            >
              <div className="overflow-y-auto border-l bg-white p-4 h-full">
                <Step3FieldsPanel
                  data={data}
                  extractedData={displayExtractedData}
                  onFieldSave={handleFieldSave}
                  provenanceData={provenanceData}
                  updateData={updateData}
                  sessionId={sessionId}
                />
              </div>
            </CollapsibleDrawer>

            {/* Right Panel - PDF (expands when drawer closed) */}
            <div className={cn(
              'relative transition-all duration-300',
              isDrawerOpen ? 'flex-1' : 'w-full'
            )}>
              <Step3PDFPanel
                files={pdfFiles}
                currentIndex={currentFileIndex}
                onIndexChange={setCurrentFileIndex}
                loading={filesLoading}
                sessionId={sessionId}
              />
            </div>
          </>
        ) : (
          /* Full Width Layout for Planning Information */
          <div className="w-full h-full overflow-y-auto bg-white p-6">
            {sessionId && updateData && (
              <PlanningInformationSection
                data={data}
                extractedData={displayExtractedData}
                updateData={updateData}
                sessionId={sessionId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
