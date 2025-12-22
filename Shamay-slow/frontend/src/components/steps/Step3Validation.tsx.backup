'use client'

import { CheckCircle, XCircle, AlertTriangle, FileText, Building, Users, MapPin, Eye, Edit3, Save, Loader2, ChevronLeft, ChevronRight, Download, Maximize2, X, RotateCcw, History, ChevronRightCircleIcon } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import { useState, useEffect } from 'react'
import { DataSource } from '../ui/DataSource'

interface Step3ValidationProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
}

interface ExtractedData {
  // Land Registry Data (from Tabu) - as object not array
  land_registry?: {
    registration_office?: string
    gush?: number | string
    chelka?: number | string
    sub_chelka?: string
    ownership_type?: string
    attachments?: string
    owners?: Array<any>
    owners_count?: number
    registered_area?: number | string
    apartment_registered_area?: number | string
    balcony_area?: number | string
    confidence?: number
    [key: string]: any
  }
  
  // Building Permit Data
  building_permit?: {
    permit_number?: string
    permit_date?: string
    permitted_usage?: string
    local_committee_name?: string
    building_description?: string
    building_floors?: number | string
    building_units?: number | string
    confidence?: number
    [key: string]: any
  }
  
  // Shared Building Order Data (Beit Meshutaf)
  shared_building?: {
    order_issue_date?: string
    building_description?: string
    building_floors?: number | string
    building_address?: string
    total_sub_plots?: number | string
    sub_plots?: Array<any>
    confidence?: number
    [key: string]: any
  }
  
  // Image Analysis - Interior
  interior_analysis?: {
    property_layout_description?: string
    room_analysis?: Array<{
      room_type: string
      size_estimate: string
      features: string
      condition: string
    }>
    condition_assessment?: string
    interior_features?: string
    finish_level?: string
    [key: string]: any
  }
  
  // Image Analysis - Exterior  
  exterior_analysis?: {
    building_condition?: string
    building_features?: string
    building_type?: string
    exterior_assessment?: string
    building_year?: string
    [key: string]: any
  }
  
  // Legacy flat fields for backward compatibility
  parcel?: string
  ownershipType?: string
  attachments?: string
  sharedAreas?: string
  buildingRights?: string
  permittedUse?: string
  buildingYear?: string
  floor?: string
  builtArea?: string
  buildingDescription?: string
  rooms?: string
  propertyCondition?: string
  finishLevel?: string
  propertyLayoutDescription?: string
  roomAnalysis?: Array<any>
  conditionAssessment?: string
  buildingCondition?: string
  buildingFeatures?: string
  buildingType?: string
  overallAssessment?: string
  averagePricePerSqm?: string
  medianPricePerSqm?: string
  adjustmentFactor?: string
  
  [key: string]: any
}

export function Step3Validation({ data, updateData, onValidationChange, sessionId }: Step3ValidationProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState<string>('')
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [allFiles, setAllFiles] = useState<Array<{type: string, name: string, preview?: string, url?: string, file?: File}>>([])
  const [filesLoading, setFilesLoading] = useState(true)
  
  // AI Extraction History
  const [aiExtractions, setAIExtractions] = useState<any[]>([])
  const [showAIHistory, setShowAIHistory] = useState(false)
  const [isRestoringAI, setIsRestoringAI] = useState(false)

  // Step 3 is optional - always allow proceeding
  useEffect(() => {
    onValidationChange(true)
  }, [onValidationChange])

  // Processing is now handled in Step 2 - just display the results here

  // Load extracted data and uploads from session on mount
  useEffect(() => {
    const loadSessionData = async () => {
      if (sessionId && Object.keys(extractedData).length === 0) {
        try {
          const response = await fetch(`/api/session/${sessionId}`)
          if (response.ok) {
            const sessionData = await response.json()
            
            // Load extracted data - check both possible locations
            const extractedDataFromSession = sessionData.extractedData || sessionData.data?.extractedData
            if (extractedDataFromSession && Object.keys(extractedDataFromSession).length > 0) {
              console.log('📊 Loading extracted data from session:', extractedDataFromSession)
              setExtractedData(extractedDataFromSession)
            } else {
              console.log('📊 No extracted data found in session')
            }
            
            // Load uploads
            if (sessionData.data.uploads && Array.isArray(sessionData.data.uploads)) {
              console.log('📁 Loading uploads from session:', sessionData.data.uploads)
              
              // Convert session uploads to the format expected by getAllFiles
              const sessionUploads = sessionData.data.uploads.map((upload: any) => ({
                type: upload.type,
                name: upload.name,
                preview: upload.url, // Use URL as preview for images
                url: upload.url,
                file: {
                  name: upload.name,
                  type: upload.mimeType
                } as File
              }))
              
              // DON'T update parent data - the wizard already has this data from the database
              // Just use it locally in Step 3 for display purposes
              console.log('📁 Using session data locally (not updating parent to avoid unnecessary saves)')
              console.log('📁 Session uploaded files:', sessionUploads.length)
              console.log('📁 Session extracted data:', Object.keys(sessionData.extractedData || {}).length, 'fields')
              
              // Load files directly from session data
              const files = await getAllFilesFromSessionData(sessionData.data.uploads || [])
              console.log('📁 Files returned from getAllFilesFromSessionData:', files)
              setAllFiles(files)
              setFilesLoading(false)
            } else {
              // No uploads, but we still have local extracted data from props
              console.log('📁 No uploads in session, using extracted data from props')
              setFilesLoading(false)
            }
          }
        } catch (error) {
          console.error('❌ Error loading session data:', error)
          setFilesLoading(false)
        }
      }
    }
    
    loadSessionData()
  }, [sessionId, extractedData, updateData])

  // Sync local extractedData state with props data
  useEffect(() => {
    if (data.extractedData && Object.keys(data.extractedData).length > 0) {
      console.log('📊 Syncing local extractedData with props data:', data.extractedData)
      setExtractedData(data.extractedData)
    }
  }, [data.extractedData])

  // Remove the problematic useEffect that was causing infinite loops

  // Track currentFileIndex changes (simplified logging)
  useEffect(() => {
    if (allFiles.length > 0) {
      console.log('🔄 File changed to index:', currentFileIndex, 'of', allFiles.length)
    }
  }, [currentFileIndex, allFiles])

  const updateExtractedData = async (field: string, value: string) => {
    const newExtractedData = {
      ...extractedData,
      [field]: value
    }
    
    setExtractedData(newExtractedData)
    
    // Update parent data - this will trigger auto-save via the wizard's updateData
    // No need to manually save here, let the wizard handle it
    updateData({
      extractedData: newExtractedData
    })
    
    console.log('✅ Step3 - Updated extracted data field:', field)
  }

  // Load AI extraction history
  const loadAIExtractions = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/session/${sessionId}/ai-extractions`)
      if (response.ok) {
        const { extractions } = await response.json()
        setAIExtractions(extractions || [])
        console.log('📚 Loaded AI extraction history:', extractions?.length || 0, 'versions')
      }
    } catch (error) {
      console.error('❌ Error loading AI extractions:', error)
    }
  }

  // Restore AI extraction (revert to original AI values)
  const restoreAIExtraction = async (extractionId: number) => {
    if (!sessionId) return
    
    setIsRestoringAI(true)
    try {
      const response = await fetch(`/api/session/${sessionId}/ai-extractions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId,
          action: 'restore'
        })
      })
      
      if (response.ok) {
        const { restoredFields } = await response.json()
        console.log('✅ Restored AI extraction:', restoredFields)
        
        // Create the complete updated extracted data
        const updatedExtractedData = { ...extractedData, ...restoredFields }
        
        // Update local state
        setExtractedData(updatedExtractedData)
        
        // Update parent data with complete extracted data object
        updateData({
          extractedData: updatedExtractedData
        })
        
        // Reload AI extraction history
        await loadAIExtractions()
        
        alert('✅ נתונים שוחזרו לגרסת הבינה המלאכותית המקורית')
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to restore AI extraction:', errorData)
        alert(`❌ שגיאה בשחזור הנתונים: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error restoring AI extraction:', error)
      alert('❌ שגיאה בשחזור הנתונים')
    } finally {
      setIsRestoringAI(false)
    }
  }

  // Load AI extractions on mount
  useEffect(() => {
    if (sessionId && aiExtractions.length === 0) {
      loadAIExtractions()
    }
  }, [sessionId])

  const extractLandRegistryData = async (): Promise<Partial<ExtractedData>> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/land-registry-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        return {
          registrationOffice: result.registration_office || 'לא נמצא',
          gush: result.gush || 'לא נמצא',
          parcel: result.chelka || 'לא נמצא',
          ownershipType: result.ownership_type || 'לא נמצא',
          attachments: result.attachments || 'לא נמצא'
        }
      }
    } catch (error) {
      console.error('Land registry extraction failed:', error)
    }
    
    return {
      registrationOffice: 'לא נמצא',
      gush: 'לא נמצא',
      parcel: 'לא נמצא',
      ownershipType: 'לא נמצא',
      attachments: 'לא נמצא'
    }
  }

  const extractBuildingPermitData = async (): Promise<Partial<ExtractedData>> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/building-permit-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        return {
          buildingYear: result.building_year || 'לא נמצא',
          buildingRights: result.permitted_description || 'לא נמצא',
          permittedUse: result.permitted_use || 'לא נמצא',
          builtArea: result.built_area || 'לא נמצא',
          buildingDescription: result.building_description || 'לא נמצא'
        }
      }
    } catch (error) {
      console.error('Building permit extraction failed:', error)
    }
    
    return {
      buildingYear: 'לא נמצא',
      buildingRights: 'לא נמצא',
      permittedUse: 'לא נמצא',
      builtArea: 'לא נמצא',
      buildingDescription: 'לא נמצא'
    }
  }

  const extractImageAnalysisData = async (): Promise<Partial<ExtractedData>> => {
    try {
      // Call both interior and exterior analysis APIs
      const [interiorResponse, exteriorResponse] = await Promise.allSettled([
        fetch(`/api/session/${sessionId}/interior-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/session/${sessionId}/exterior-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      ])
      
      const result: Partial<ExtractedData> = {}
      
      // Process interior analysis results
      if (interiorResponse.status === 'fulfilled' && interiorResponse.value.ok) {
        const interiorData = await interiorResponse.value.json()
        if (interiorData.success && interiorData.extractedData) {
          result.propertyLayoutDescription = interiorData.extractedData.property_layout_description || 'לא נמצא'
          result.roomAnalysis = interiorData.extractedData.room_analysis || []
          result.conditionAssessment = interiorData.extractedData.condition_assessment || 'לא נמצא'
        }
      }
      
      // Process exterior analysis results
      if (exteriorResponse.status === 'fulfilled' && exteriorResponse.value.ok) {
        const exteriorData = await exteriorResponse.value.json()
        if (exteriorData.success && exteriorData.extractedData) {
          result.buildingCondition = exteriorData.extractedData.building_condition || 'לא נמצא'
          result.buildingFeatures = exteriorData.extractedData.building_features || 'לא נמצא'
          result.buildingType = exteriorData.extractedData.building_type || 'לא נמצא'
          result.overallAssessment = exteriorData.extractedData.overall_assessment || 'לא נמצא'
        }
      }
      
      return result
    } catch (error) {
      console.error('Image analysis failed:', error)
    }
    
    return {
      propertyLayoutDescription: 'לא נמצא',
      roomAnalysis: [],
      conditionAssessment: 'לא נמצא',
      buildingCondition: 'לא נמצא',
      buildingFeatures: 'לא נמצא',
      buildingType: 'לא נמצא',
      overallAssessment: 'לא נמצא'
    }
  }

  const extractComparableData = async (): Promise<Partial<ExtractedData>> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/comparable-data?city=${encodeURIComponent(data.city)}&rooms=${data.rooms}&area=${data.area}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          const prices = result.data.map((item: any) => parseFloat(item.price_per_sqm))
          const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
          const medianPrice = prices.sort((a: number, b: number) => a - b)[Math.floor(prices.length / 2)]
          
          return {
            averagePricePerSqm: `₪${Math.round(avgPrice).toLocaleString()}`,
            medianPricePerSqm: `₪${Math.round(medianPrice).toLocaleString()}`,
            adjustmentFactor: 'מבוסס על מאפייני הנכס'
          }
        }
      }
    } catch (error) {
      console.error('Comparable data extraction failed:', error)
    }
    
    return {
      averagePricePerSqm: 'לא נמצא',
      medianPricePerSqm: 'לא נמצא',
      adjustmentFactor: 'לא נמצא'
    }
  }

  const handleFieldEdit = (field: string, currentValue: string) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  const handleFieldSave = (field: string) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: tempValue
    }))
    
    updateData({
      extractedData: {
        ...extractedData,
        [field]: tempValue
      }
    })
    
    setEditingField(null)
    setTempValue('')
  }

  const handleFieldCancel = () => {
    setEditingField(null)
    setTempValue('')
  }

  const getDataSource = (field: string): string => {
    const sourceMap: { [key: string]: string } = {
      registrationOffice: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      gush: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      parcel: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      ownershipType: 'נשלף מתוך תעודת בעלות (עמוד 2)',
      attachments: 'נשלף מתוך תעודת בעלות (עמוד 3)',
      sharedAreas: 'נשלף מתוך צו בית משותף (סעיף 2)',
      buildingRights: 'נשלף מתוך מידע תכנוני (סעיף 1)',
      permittedUse: 'נשלף מתוך מידע תכנוני (סעיף 1)',
      buildingYear: 'נשלף מתוך היתר בנייה (מס\' 4567/21)',
      floor: 'נשלף מתוך צו בית משותף',
      builtArea: 'נשלף מתוך היתר בנייה (עמוד 2)',
      buildingDescription: 'נשלף מתוך צו בית משותף (סעיף 1)',
      propertyCondition: 'נקבע מתמונות הנכס',
      finishLevel: 'נקבע מתמונות הנכס',
      // Interior Analysis
      propertyLayoutDescription: 'נשלף מניתוח תמונות פנים',
      conditionAssessment: 'נשלף מניתוח תמונות פנים',
      // Exterior Analysis
      buildingCondition: 'נשלף מניתוח תמונות חוץ',
      buildingFeatures: 'נשלף מניתוח תמונות חוץ',
      buildingType: 'נשלף מניתוח תמונות חוץ',
      overallAssessment: 'נשלף מניתוח תמונות חוץ',
      // Comparable Sales
      averagePricePerSqm: 'חושב מתוך נכסים דומים',
      medianPricePerSqm: 'חושב מתוך נכסים דומים',
      adjustmentFactor: 'מבוסס על מאפייני הנכס'
    }
    
    return sourceMap[field] || 'נשלף מהמסמכים'
  }

  // Get all uploaded files from session data directly
  const getAllFilesFromSessionData = async (sessionUploads: any[]) => {
    const files: Array<{type: string, name: string, preview?: string, url?: string, file?: File}> = []
    
    console.log('🔍 getAllFilesFromSessionData called with:', sessionUploads)
    
    if (!sessionUploads || !Array.isArray(sessionUploads)) {
      console.warn('⚠️ sessionUploads is not an array or is undefined:', sessionUploads)
      return files
    }
    
    for (const upload of sessionUploads) {
      try {
        console.log('🔍 Processing upload:', upload)
        console.log('🔍 Upload details:', {
          id: upload.id,
          type: upload.type,
          name: upload.name,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          url: upload.url,
          status: upload.status
        })
        
        // Skip if upload is not completed
        if (upload.status !== 'completed') {
          console.log('⏭️ Skipping incomplete upload:', upload.id, 'status:', upload.status)
          continue
        }
        
        let preview = upload.url
        let url = upload.url
        let fileName = upload.name || upload.fileName || `${upload.type}_document`
        let fileType = upload.mimeType || 'application/octet-stream'
        
        // Check if it's a PDF by file extension or MIME type
        const isPDF = fileType === 'application/pdf' || 
                     fileType.includes('pdf') || 
                     fileName.toLowerCase().endsWith('.pdf') ||
                     upload.type === 'tabu' || 
                     upload.type === 'permit' || 
                     upload.type === 'condo'
        
        console.log('🔍 PDF check for:', fileName, {
          fileType,
          fileName,
          uploadType: upload.type,
          isPDF,
          url
        })
        
        // Process PDFs and documents, skip images
        if (isPDF) {
          if (url) {
            // Use the server URL for PDFs
            files.push({
              type: upload.type,
              name: fileName,
              preview: preview,
              url: url,
              file: new File([], fileName, { type: 'application/pdf' })
            })
            console.log('📄 Added PDF file:', fileName, url, 'type:', fileType)
          } else {
            console.warn('⚠️ PDF file has no URL:', fileName)
          }
        } else if (fileType.includes('image')) {
          // Skip images for document processing
          console.log('⏭️ Skipping image file:', fileName, 'type:', fileType)
        } else {
          // Process other document types
          if (url) {
            files.push({
              type: upload.type,
              name: fileName,
              preview: preview,
              url: url,
              file: new File([], fileName, { type: fileType })
            })
            console.log('📄 Added document file:', fileName, url, 'type:', fileType)
          } else {
            console.warn('⚠️ Document file has no URL:', fileName)
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error processing upload ${upload.id || 'unknown'}:`, error)
      }
    }
    
    console.log('📁 getAllFilesFromSessionData returning:', files.length, 'files')
    return files
  }

  // Removed getAllFiles function to prevent infinite loops

  const currentFile = allFiles[currentFileIndex]

  const navigateFile = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentFileIndex(prev => prev > 0 ? prev - 1 : allFiles.length - 1)
    } else {
      setCurrentFileIndex(prev => prev < allFiles.length - 1 ? prev + 1 : 0)
    }
  }

  const getFileTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'tabu': 'תעודת בעלות',
      'building_permit': 'היתר בנייה',
      'permit': 'היתר בנייה',
      'condominium_order': 'צו בית משותף',
      'planning_sheet': 'תכנית בניין עיר',
      'interior_image': 'תמונה פנים',
      'building_front': 'תמונת חזית'
    }
    return labels[type] || type
  }

  // Generate PDF preview
  const generatePDFPreview = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // Create a more realistic PDF preview
      const svgContent = `
        <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pdfGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="300" height="400" fill="url(#pdfGradient)" stroke="#1976d2" stroke-width="2" rx="8"/>
          <rect x="20" y="20" width="260" height="30" fill="#1976d2" rx="4"/>
          <text x="150" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">
            PDF Document
          </text>
          <rect x="20" y="60" width="260" height="200" fill="white" stroke="#ddd" stroke-width="1" rx="4"/>
          <text x="30" y="80" font-family="Arial, sans-serif" font-size="12" fill="#333">
            Document Type: ${getFileTypeLabel(file.name.includes('tabu') ? 'tabu' : file.name.includes('permit') ? 'building_permit' : 'condominium_order')}
          </text>
          <text x="30" y="100" font-family="Arial, sans-serif" font-size="10" fill="#666">
            File: ${file.name}
          </text>
          <text x="30" y="120" font-family="Arial, sans-serif" font-size="10" fill="#666">
            Size: ${(file.size / 1024 / 1024).toFixed(2)} MB
          </text>
          <text x="30" y="140" font-family="Arial, sans-serif" font-size="10" fill="#666">
            Status: Processed
          </text>
          <rect x="20" y="280" width="260" height="80" fill="#f5f5f5" stroke="#ddd" stroke-width="1" rx="4"/>
          <text x="30" y="300" font-family="Arial, sans-serif" font-size="10" fill="#666">
            Data extracted:
          </text>
          <text x="30" y="315" font-family="Arial, sans-serif" font-size="9" fill="#888">
            • Property details
          </text>
          <text x="30" y="330" font-family="Arial, sans-serif" font-size="9" fill="#888">
            • Legal information
          </text>
          <text x="30" y="345" font-family="Arial, sans-serif" font-size="9" fill="#888">
            • Building specifications
          </text>
        </svg>
      `
      resolve('data:image/svg+xml;base64,' + btoa(svgContent))
    })
  }

  if (isProcessing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">מעבד מסמכים...</h2>
          <p className="text-gray-600">מנתח מסמכים ומחלץ נתונים באמצעות AI</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>⏱️ זה עשוי לקחת מספר דקות</p>
            <p>💰 עלות: ~$0.50-2.00 למסמך</p>
          </div>
        </div>
      </div>
    )
  }

  // Use props data as fallback if local state is empty
  const displayExtractedData = data.extractedData || {}
  const hasExtractedData = Object.keys(displayExtractedData).length > 0

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900 text-right">
            תצוגת מסמכים ונתונים שחולצו
          </h2>
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
        <p className="text-gray-600 text-right">
          סקור את המסמכים שהועלו ואת הנתונים שחולצו מהם באמצעות AI
        </p>
      </div>

      {/* AI Extraction History Panel */}
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
          <p className="text-sm text-blue-700 mb-4">
            ניתן לשחזר גרסה קודמת של הנתונים שחולצו על ידי הבינה המלאכותית
          </p>
          <div className="space-y-3">
            {aiExtractions.map((extraction, index) => (
              <div
                key={extraction.id}
                className="bg-white rounded-lg p-4 border border-blue-200"
              >
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
                      {!extraction.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          ✏️ נערך ידנית
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        תאריך: {new Date(extraction.extraction_date).toLocaleString('he-IL')}
                      </p>
                      <p>
                        סוג: {extraction.extraction_type === 'combined' ? 'משולב' : extraction.extraction_type}
                      </p>
                      {extraction.ai_model && (
                        <p>מודל AI: {extraction.ai_model}</p>
                      )}
                      <p className="text-gray-500 mt-2">
                        {Object.keys(extraction.extracted_fields || {}).length} שדות
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => restoreAIExtraction(extraction.id)}
                    disabled={extraction.is_active || isRestoringAI}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Processing Status - Show if data was processed in Step 2 */}
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

      {/* Document Viewer and Data Validation */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 mb-6">
        {/* Left Panel - Document Viewer */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-right">צפייה במסמכים</h3>
          
          {/* Document Tabs */}
          <div className="flex space-x-reverse space-x-1 mb-4">
            {allFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => setCurrentFileIndex(index)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentFileIndex === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getFileTypeLabel(file.type)}
              </button>
            ))}
          </div>

          {/* Document Display Area */}
          <div className="border border-gray-300 rounded-lg h-96 bg-gray-50 flex items-center justify-center">
            {filesLoading ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-gray-600">טוען מסמכים...</p>
              </div>
            ) : allFiles.length > 0 ? (
              <div className="text-center w-full h-full flex items-center justify-center">
                {(() => {
                  const currentFile = allFiles[currentFileIndex]
                  // Check file type from the file object or determine from URL/name
                  const fileType = currentFile?.file?.type || (currentFile?.name?.endsWith('.pdf') ? 'application/pdf' : 'application/pdf')
                  const isPDF = fileType === 'application/pdf'
                  
                  if (isPDF && currentFile?.url) {
                    // Display PDF in iframe
                    console.log('📄 Displaying PDF:', currentFile.name)
                    return (
                      <div className="relative w-full h-full">
                        <iframe
                          key={`pdf-${currentFile.url}-${currentFileIndex}`}
                          src={currentFile.url}
                          className="w-full h-full rounded border"
                          title={getFileTypeLabel(currentFile.type)}
                          onError={(e) => {
                            console.error('❌ PDF iframe error:', currentFile.name)
                          }}
                          onLoad={() => {
                            console.log('✅ PDF loaded successfully:', currentFile.name)
                          }}
                          onAbort={() => {
                            console.warn('⚠️ PDF iframe aborted:', currentFile.url)
                          }}
                        />
                        <button
                          onClick={() => setIsFullscreen(true)}
                          className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-opacity"
                          title="צפייה במסך מלא"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  } else if (currentFile?.preview) {
                    // Fallback to preview
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={currentFile.preview} 
                          alt={getFileTypeLabel(currentFile.type)}
                          className="max-w-full max-h-80 object-contain rounded border shadow-lg"
                        />
                        <button
                          onClick={() => setIsFullscreen(true)}
                          className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-opacity"
                          title="צפייה במסך מלא"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  } else {
                    // No preview available
                    return (
                      <div className="text-gray-500">
                        <FileText className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-lg">קובץ לא נמצא</p>
                        <p className="text-sm">לא ניתן להציג תצוגה מקדימה</p>
                        {currentFile?.url && (
                          <a 
                            href={currentFile.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                          >
                            פתח קובץ
                          </a>
                        )}
                      </div>
                    )
                  }
                })()}
              </div>
            ) : (
              <div className="text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg">אין מסמכים להצגה</p>
                <p className="text-sm">העלה מסמכים בשלב הקודם</p>
              </div>
            )}
          </div>

          {/* File Navigation */}
          {allFiles.length > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentFileIndex(Math.max(0, currentFileIndex - 1))}
                disabled={currentFileIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightCircleIcon className="w-4 h-4" />
                <span>הקודם</span>
              </button>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  {currentFileIndex + 1} מתוך {allFiles.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentFile?.name}
                </div>
              </div>
              
              <button
                onClick={() => setCurrentFileIndex(Math.min(allFiles.length - 1, currentFileIndex + 1))}
                disabled={currentFileIndex === allFiles.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>הבא</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Extracted Data Summary */}
          {/* {Object.keys(extractedData).length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-3">סיכום נתונים שחולצו</h4>
              <div className="space-y-2 text-sm">
                {extractedData.land_registry?.registration_office && (
                  <p><strong>משרד רישום מקרקעין:</strong> {extractedData.land_registry.registration_office}</p>
                )}
                {extractedData.land_registry?.gush && (
                  <p><strong>גוש:</strong> {extractedData.land_registry.gush} | <strong>חלקה:</strong> {extractedData.land_registry.chelka}</p>
                )}
                {extractedData.land_registry?.ownership_type && (
                  <p><strong>סוג בעלות:</strong> {extractedData.land_registry.ownership_type}</p>
                )}
                {extractedData.attachments && (
                  <p><strong>נספחים:</strong> {typeof extractedData.attachments === 'string' ? extractedData.attachments : Array.isArray(extractedData.attachments) ? extractedData.attachments.map((a: any) => a.description || a.type).join(', ') : 'לא נמצא'}</p>
                )}
                {extractedData.builtArea && (
                  <p><strong>שטח רשום:</strong> {extractedData.builtArea} מ"ר</p>
                )}
              </div>
            </div> */}
        </div>
        </div>

        {/* Right Panel - Data Validation Form */}
        {/* <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">אימות נתונים</h3>
          <p className="text-gray-600 text-sm mb-6 text-right">
            סקור ואמת את הנתונים שחולצו. בצע תיקונים נחוצים.
          </p>

          Legal Status Section
      <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4 text-right">מצב משפטי</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  משרד רישום מקרקעין
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingField === 'registrationOffice' ? tempValue : (extractedData.land_registry?.registration_office || '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('registrationOffice')
                      setTempValue(extractedData.land_registry?.registration_office || '')
                    }}
                    onBlur={async () => {
                      if (editingField === 'registrationOffice') {
                        await updateExtractedData('registrationOffice', tempValue)
                        setEditingField(null)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    placeholder="הזן משרד רישום מקרקעין"
                  />
                  <DataSource 
                    source="tabu" 
                    details="נשלף מתוך תעודת בעלות (עמוד 1)"
                    className="absolute left-2 top-2"
                  />
                </div>
      </div>

              <div className="grid grid-cols-2 gap-4">
          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    מספר גוש
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editingField === 'gush' ? tempValue : (extractedData.land_registry?.gush?.toString() || '')}
                      onChange={(e) => setTempValue(e.target.value)}
                      onFocus={() => {
                        setEditingField('gush')
                        setTempValue(extractedData.land_registry?.gush?.toString() || '')
                      }}
                      onBlur={async () => {
                        if (editingField === 'gush') {
                          await updateExtractedData('gush', tempValue)
                          setEditingField(null)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="הזן מספר גוש"
                    />
                    <DataSource 
                      source="tabu" 
                      details="נשלף מתוך תעודת בעלות (עמוד 1)"
                      className="absolute left-2 top-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    מספר חלקה
                  </label>
                  <div className="relative">
                  <input
                    type="text"
                      value={editingField === 'parcel' ? tempValue : (extractedData.land_registry?.chelka?.toString() || '')}
                      onChange={(e) => setTempValue(e.target.value)}
                      onFocus={() => {
                        setEditingField('parcel')
                        setTempValue(extractedData.land_registry?.chelka?.toString() || '')
                      }}
                      onBlur={async () => {
                        if (editingField === 'parcel') {
                          await updateExtractedData('parcel', tempValue)
                          setEditingField(null)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="הזן מספר חלקה"
                    />
                    <DataSource 
                      source="tabu" 
                      details="נשלף מתוך תעודת בעלות (עמוד 1)"
                      className="absolute left-2 top-2"
                    />
                  </div>
                </div>
                </div>
                
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  סוג בעלות
                </label>
                <div className="relative">
                  <select
                    value={editingField === 'ownershipType' ? tempValue : (extractedData.ownershipType || '')}
                    onChange={async (e) => {
                      setTempValue(e.target.value)
                      await updateExtractedData('ownershipType', e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  >
                    <option value="">בחר סוג בעלות</option>
                    <option value="בעלות פרטית">בעלות פרטית</option>
                    <option value="בעלות משותפת">בעלות משותפת</option>
                    <option value="חכירה">חכירה</option>
                    <option value="שכירות">שכירות</option>
                  </select>
                  <DataSource 
                    source="tabu" 
                    details="נשלף מתוך תעודת בעלות (עמוד 2)"
                    className="absolute left-2 top-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  נספחים
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingField === 'attachments' ? tempValue : (typeof extractedData.attachments === 'string' ? extractedData.attachments : Array.isArray(extractedData.attachments) ? extractedData.attachments.map((a: any) => a.description || a.type).join(', ') : '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('attachments')
                      setTempValue(typeof extractedData.attachments === 'string' ? extractedData.attachments : Array.isArray(extractedData.attachments) ? extractedData.attachments.map((a: any) => a.description || a.type).join(', ') : '')
                    }}
                    onBlur={async () => {
                      if (editingField === 'attachments') {
                        await updateExtractedData('attachments', tempValue)
                        setEditingField(null)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    placeholder="הזן נספחים"
                  />
                  <DataSource 
                    source="tabu" 
                    details="נשלף מתוך תעודת בעלות (עמוד 3)"
                    className="absolute left-2 top-2"
                  />
                </div>
              </div>
                </div>
                
                
          {/* Building Details Section */}
          {/* <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4 text-right">פרטי בנייה</h4>
            
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  שטחים משותפים
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingField === 'sharedAreas' ? tempValue : (extractedData.sharedAreas || '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('sharedAreas')
                      setTempValue(extractedData.sharedAreas || '')
                    }}
                    onBlur={async () => {
                      if (editingField === 'sharedAreas') {
                        await updateExtractedData('sharedAreas', tempValue)
                        setEditingField(null)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    placeholder="הזן שטחים משותפים"
                  />
                  <DataSource 
                    source="condo" 
                    details="נשלף מתוך צו בית משותף (סעיף 2)"
                    className="absolute left-2 top-2"
                  />
                </div>
              </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  זכויות בנייה
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingField === 'buildingRights' ? tempValue : (extractedData.buildingRights || '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('buildingRights')
                      setTempValue(extractedData.buildingRights || '')
                    }}
                    onBlur={async () => {
                      if (editingField === 'buildingRights') {
                        await updateExtractedData('buildingRights', tempValue)
                        setEditingField(null)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    placeholder="הזן זכויות בנייה"
                  />
                  <DataSource 
                    source="permit" 
                    details="נשלף מתוך מידע תכנוני (סעיף 1)"
                    className="absolute left-2 top-2"
                  />
                </div>
                </div>
                
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  שימוש מותר
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingField === 'permittedUse' ? tempValue : (extractedData.permittedUse || '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('permittedUse')
                      setTempValue(extractedData.permittedUse || '')
                    }}
                    onBlur={async () => {
                      if (editingField === 'permittedUse') {
                        await updateExtractedData('permittedUse', tempValue)
                        setEditingField(null)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    placeholder="הזן שימוש מותר"
                  />
                  <DataSource 
                    source="permit" 
                    details="נשלף מתוך מידע תכנוני (סעיף 1)"
                    className="absolute left-2 top-2"
                  />
                </div>
              </div>
            </div>
          </div>
                </div>
              </div>

      {/* Extraction Results Summary - Only show if data has been processed */}
      {hasExtractedData && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 text-right">סיכום חילוץ נתונים</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">מצב משפטי</h4>
                      </div>
              <div className="text-sm text-gray-600">
                <p>גוש: {extractedData.gush || 'לא נמצא'}</p>
                <p>חלקה: {extractedData.parcel || 'לא נמצא'}</p>
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
                <p>שטח: {extractedData.builtArea || 'לא נמצא'} מ"ר</p>
                <p>שימוש: {extractedData.permittedUse || 'לא נמצא'}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-gray-900">ניתוח תמונות</h4>
              </div>
              <div className="text-sm text-gray-600">
                <p>פנים: {extractedData.propertyLayoutDescription ? '✓' : '✗'}</p>
                <p>חוץ: {extractedData.buildingCondition ? '✓' : '✗'}</p>
                <p>חדרים: {extractedData.roomAnalysis?.length || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <h4 className="font-medium text-gray-900">מכירות דומות</h4>
              </div>
              <div className="text-sm text-gray-600">
                <p>ממוצע: {extractedData.averagePricePerSqm || 'לא נמצא'}</p>
                <p>חציוני: {extractedData.medianPricePerSqm || 'לא נמצא'}</p>
                <p>התאמה: {extractedData.adjustmentFactor || 'לא נמצא'}</p>
              </div>
            </div>
                  </div>
                </div>
      )}


      {/* Legal Status Section - Only show if data has been processed */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">מצב משפטי</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                משרד רישום מקרקעין
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'registrationOffice' ? (
                  <div className="flex-1 flex items-center gap-2">
                    <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('registrationOffice')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
              </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.registrationOffice || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('registrationOffice', extractedData.registrationOffice || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
            </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('registrationOffice')}</p>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר גוש
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'gush' ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('gush')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.gush || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('gush', extractedData.gush || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('gush')}</p>
            </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר חלקה
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'parcel' ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('parcel')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.parcel || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('parcel', extractedData.parcel || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('parcel')}</p>
            </div>
          </div>

          <div className="space-y-4">
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                סוג בעלות
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'ownershipType' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('ownershipType')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.ownershipType || 'בעלות פרטית'}</span>
                    <button
                      onClick={() => handleFieldEdit('ownershipType', extractedData.ownershipType || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('ownershipType')}</p>
                </div>
                
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                נספחים
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'attachments' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('attachments')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{typeof extractedData.attachments === 'string' ? extractedData.attachments : Array.isArray(extractedData.attachments) ? (extractedData.attachments as any[]).map((a: any) => a.description || a.type).join(', ') : 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('attachments', typeof extractedData.attachments === 'string' ? extractedData.attachments : Array.isArray(extractedData.attachments) ? (extractedData.attachments as any[]).map((a: any) => a.description || a.type).join(', ') : '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('attachments')}</p>
                </div>
                
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שטחים משותפים
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'sharedAreas' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('sharedAreas')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.sharedAreas || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('sharedAreas', extractedData.sharedAreas || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('sharedAreas')}</p>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Building Details Section - Only show if data has been processed */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">פרטי הבניין</h3>
        
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שנת בנייה
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'buildingYear' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('buildingYear')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.buildingYear || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('buildingYear', extractedData.buildingYear || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('buildingYear')}</p>
                </div>
                
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                קומה
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'floor' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('floor')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.floor || data.floor || '3'}</span>
                    <button
                      onClick={() => handleFieldEdit('floor', extractedData.floor || data.floor?.toString() || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('floor')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שטח בנוי (מ"ר)
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'builtArea' ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('builtArea')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.builtArea || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('builtArea', extractedData.builtArea || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('builtArea')}</p>
                      </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                תיאור הבניין
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'buildingDescription' ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('buildingDescription')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.buildingDescription || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('buildingDescription', extractedData.buildingDescription || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('buildingDescription')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שימוש מותר
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'permittedUse' ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    />
                    <button
                      onClick={() => handleFieldSave('permittedUse')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.permittedUse || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('permittedUse', extractedData.permittedUse || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('permittedUse')}</p>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Property Characteristics Section - Only show if data has been processed */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">מאפייני הנכס</h3>
        
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מצב הנכס
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'propertyCondition' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    >
                      <option value="">בחר מצב נכס</option>
                      <option value="מצוין">מצוין</option>
                      <option value="טוב">טוב</option>
                      <option value="בינוני">בינוני</option>
                      <option value="גרוע">גרוע</option>
                      <option value="דורש שיפוץ">דורש שיפוץ</option>
                    </select>
                    <button
                      onClick={() => handleFieldSave('propertyCondition')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.propertyCondition || 'מצוין'}</span>
                    <button
                      onClick={() => handleFieldEdit('propertyCondition', extractedData.propertyCondition || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('propertyCondition')}</p>
                </div>
                
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                רמת גימור
              </label>
              <div className="flex items-center gap-2">
                {editingField === 'finishLevel' ? (
                  <div className="flex-1 flex items-center gap-2">
                  <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                      dir="rtl"
                    >
                      <option value="">בחר רמת גימור</option>
                      <option value="בסיסי">בסיסי</option>
                      <option value="בינוני">בינוני</option>
                      <option value="גבוה">גבוה</option>
                      <option value="יוקרתי">יוקרתי</option>
                      <option value="לוקסוס">לוקסוס</option>
                    </select>
                    <button
                      onClick={() => handleFieldSave('finishLevel')}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFieldCancel}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                  <>
                    <span className="flex-1 text-right">{extractedData.finishLevel || 'בסיסי'}</span>
                    <button
                      onClick={() => handleFieldEdit('finishLevel', extractedData.finishLevel || '')}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getDataSource('finishLevel')}</p>
            </div>
              </div>
            </div>
          </div>
        )}

      {/* Interior Analysis Section - Only show if data has been processed */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">ניתוח פנים הנכס</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            תיאור תכנון הנכס
          </label>
          <div className="flex items-center gap-2">
            {editingField === 'propertyLayoutDescription' ? (
              <div className="flex-1 flex items-center gap-2">
                <textarea
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[80px]"
                  dir="rtl"
                />
                <button
                  onClick={() => handleFieldSave('propertyLayoutDescription')}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFieldCancel}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
        </div>
            ) : (
              <>
                <span className="flex-1 text-right">{extractedData.propertyLayoutDescription || 'לא נמצא'}</span>
                <button
                  onClick={() => handleFieldEdit('propertyLayoutDescription', extractedData.propertyLayoutDescription || '')}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
      )}
    </div>
          <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות פנים</p>
        </div>

              <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            הערכת מצב כללי
          </label>
          <div className="flex items-center gap-2">
            {editingField === 'conditionAssessment' ? (
              <div className="flex-1 flex items-center gap-2">
                <textarea
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[80px]"
                  dir="rtl"
                />
                <button
                  onClick={() => handleFieldSave('conditionAssessment')}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFieldCancel}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-right">{extractedData.conditionAssessment || 'לא נמצא'}</span>
                <button
                  onClick={() => handleFieldEdit('conditionAssessment', extractedData.conditionAssessment || '')}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות פנים</p>
        </div>

        {/* Room Analysis */}
        {extractedData.roomAnalysis && extractedData.roomAnalysis.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              ניתוח חדרים
            </label>
            <div className="space-y-3">
              {extractedData.roomAnalysis.map((room, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{room.room_type}</h4>
                    <span className="text-sm text-gray-600">{room.condition}</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>תכונות:</strong> {room.features}
                  </div>
                  <div className="text-sm text-gray-700">
                    <strong>הערכת גודל:</strong> {room.size_estimate}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות פנים</p>
          </div>
        )}
      </div>
      </div>
    )}

    {/* Exterior Analysis Section - Only show if data has been processed */}
    {hasExtractedData && (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">ניתוח חוץ הנכס</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              מצב הבניין
            </label>
            <div className="flex items-center gap-2">
              {editingField === 'buildingCondition' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                    dir="rtl"
                  >
                    <option value="">בחר מצב בניין</option>
                    <option value="מצוין">מצוין</option>
                    <option value="טוב">טוב</option>
                    <option value="בינוני">בינוני</option>
                    <option value="גרוע">גרוע</option>
                    <option value="דורש שיפוץ">דורש שיפוץ</option>
                  </select>
                  <button
                    onClick={() => handleFieldSave('buildingCondition')}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFieldCancel}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-right">{extractedData.buildingCondition || 'לא נמצא'}</span>
                  <button
                    onClick={() => handleFieldEdit('buildingCondition', extractedData.buildingCondition || '')}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות חוץ</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              סוג הבניין
            </label>
            <div className="flex items-center gap-2">
              {editingField === 'buildingType' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                    dir="rtl"
                  >
                    <option value="">בחר סוג בניין</option>
                    <option value="מגדל מגורים">מגדל מגורים</option>
                    <option value="בניין מגורים נמוך">בניין מגורים נמוך</option>
                    <option value="בית פרטי">בית פרטי</option>
                    <option value="דופלקס">דופלקס</option>
                    <option value="נטהאוז">נטהאוז</option>
                    <option value="וילה">וילה</option>
                    <option value="קוטג'">קוטג'</option>
                  </select>
                  <button
                    onClick={() => handleFieldSave('buildingType')}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFieldCancel}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-right">{extractedData.buildingType || 'לא נמצא'}</span>
                  <button
                    onClick={() => handleFieldEdit('buildingType', extractedData.buildingType || '')}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות חוץ</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              תכונות הבניין
            </label>
            <div className="flex items-center gap-2">
              {editingField === 'buildingFeatures' ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                    dir="rtl"
                  />
                  <button
                    onClick={() => handleFieldSave('buildingFeatures')}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFieldCancel}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-right">{extractedData.buildingFeatures || 'לא נמצא'}</span>
                  <button
                    onClick={() => handleFieldEdit('buildingFeatures', extractedData.buildingFeatures || '')}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות חוץ</p>
                </div>
                
                <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              הערכה כללית
            </label>
            <div className="flex items-center gap-2">
              {editingField === 'overallAssessment' ? (
                <div className="flex-1 flex items-center gap-2">
                  <textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[80px]"
                    dir="rtl"
                  />
                  <button
                    onClick={() => handleFieldSave('overallAssessment')}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFieldCancel}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-right">{extractedData.overallAssessment || 'לא נמצא'}</span>
                  <button
                    onClick={() => handleFieldEdit('overallAssessment', extractedData.overallAssessment || '')}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות חוץ</p>
          </div>
        </div>
      </div>
      </div>
    )}

    {/* Comparable Sales Section - Only show if data has been processed */}
    {hasExtractedData && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">מכירות דומות</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            מחיר ממוצע למ"ר
          </label>
          <div className="flex items-center gap-2">
            {editingField === 'averagePricePerSqm' ? (
              <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                  dir="rtl"
                />
                <button
                  onClick={() => handleFieldSave('averagePricePerSqm')}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFieldCancel}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
                </div>
            ) : (
              <>
                <span className="flex-1 text-right">{extractedData.averagePricePerSqm || 'לא נמצא'}</span>
                <button
                  onClick={() => handleFieldEdit('averagePricePerSqm', extractedData.averagePricePerSqm || '')}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
              </div>
          <p className="text-xs text-gray-500 mt-1">{getDataSource('averagePricePerSqm')}</p>
            </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            מחיר חציוני למ"ר
          </label>
          <div className="flex items-center gap-2">
            {editingField === 'medianPricePerSqm' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                  dir="rtl"
                />
                <button
                  onClick={() => handleFieldSave('medianPricePerSqm')}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFieldCancel}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
          </div>
            ) : (
              <>
                <span className="flex-1 text-right">{extractedData.medianPricePerSqm || 'לא נמצא'}</span>
                <button
                  onClick={() => handleFieldEdit('medianPricePerSqm', extractedData.medianPricePerSqm || '')}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{getDataSource('medianPricePerSqm')}</p>
              </div>
              
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            גורם התאמה
          </label>
          <div className="flex items-center gap-2">
            {editingField === 'adjustmentFactor' ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                  dir="rtl"
                />
                <button
                  onClick={() => handleFieldSave('adjustmentFactor')}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFieldCancel}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <XCircle className="w-4 h-4" />
                </button>
          </div>
            ) : (
              <>
                <span className="flex-1 text-right">{extractedData.adjustmentFactor || 'לא נמצא'}</span>
                <button
                  onClick={() => handleFieldEdit('adjustmentFactor', extractedData.adjustmentFactor || '')}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
        )}
      </div>
          <p className="text-xs text-gray-500 mt-1">{getDataSource('adjustmentFactor')}</p>
        </div>
        </div>
      </div>
    )}

    </div>
  )
}
