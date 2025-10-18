'use client'

import { CheckCircle, XCircle, AlertTriangle, FileText, Building, Users, MapPin, Eye, Edit3, Save, Loader2, ChevronLeft, ChevronRight, Download, Maximize2, X } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import { useState, useEffect } from 'react'
import { DataSource } from '../ui/DataSource'

interface Step3ValidationProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
}

interface ExtractedData {
  // Legal Status
  registrationOffice?: string
  gush?: string
  parcel?: string
  ownershipType?: string
  attachments?: string
  sharedAreas?: string
  buildingRights?: string
  permittedUse?: string
  
  // Building Details
  buildingYear?: string
  floor?: string
  builtArea?: string
  buildingDescription?: string
  
  // Property Characteristics
  rooms?: string
  propertyCondition?: string
  finishLevel?: string
  
  // Image Analysis - Interior
  propertyLayoutDescription?: string
  roomAnalysis?: Array<{
    room_type: string
    size_estimate: string
    features: string
    condition: string
  }>
  conditionAssessment?: string
  
  // Image Analysis - Exterior
  buildingCondition?: string
  buildingFeatures?: string
  buildingType?: string
  overallAssessment?: string
  
  // Comparable Sales
  averagePricePerSqm?: string
  medianPricePerSqm?: string
  adjustmentFactor?: string
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

  // Processing is now handled in Step 2 - just display the results here

  // Load extracted data and uploads from session on mount
  useEffect(() => {
    const loadSessionData = async () => {
      if (sessionId && Object.keys(extractedData).length === 0) {
        try {
          const response = await fetch(`/api/session/${sessionId}`)
          if (response.ok) {
            const sessionData = await response.json()
            
            // Load extracted data
            if (sessionData.extractedData) {
              console.log('📊 Loading extracted data from session:', sessionData.extractedData)
              setExtractedData(sessionData.extractedData)
            }
            
            // Load uploads
            if (sessionData.uploads && Array.isArray(sessionData.uploads)) {
              console.log('📁 Loading uploads from session:', sessionData.uploads)
              
              // Convert session uploads to the format expected by getAllFiles
              const sessionUploads = sessionData.uploads.map((upload: any) => ({
                type: upload.type,
                name: upload.name,
                preview: upload.url, // Use URL as preview for images
                url: upload.url,
                file: {
                  name: upload.name,
                  type: upload.mimeType
                } as File
              }))
              
              // Update parent data with uploads
              console.log('📁 Setting uploads to parent data:', sessionUploads)
              updateData({
                extractedData: sessionData.extractedData,
                uploads: sessionUploads
              })
              
              // Load files directly from session data
              console.log('📁 Loading files directly from session data')
              const files = await getAllFilesFromSessionData(sessionData.uploads)
              setAllFiles(files)
              setFilesLoading(false)
              console.log('📁 Files loaded from session:', files.length)
            } else {
              // Update parent data with just extracted data
              updateData({
                extractedData: sessionData.extractedData
              })
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
    
    // Update parent data
    updateData({
      extractedData: newExtractedData
    })
    
    // Save to session
    if (sessionId) {
      try {
        const response = await fetch(`/api/session/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            extractedData: newExtractedData
          })
        })
        
        if (response.ok) {
          console.log('✅ Extracted data field updated in session:', field, value)
        } else {
          console.error('❌ Failed to update extracted data in session')
        }
      } catch (error) {
        console.error('❌ Error updating extracted data in session:', error)
      }
    }
  }

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
    
    for (const upload of sessionUploads) {
      try {
        console.log('🔍 Processing upload:', upload)
        console.log('🔍 Upload details:', {
          type: upload.type,
          name: upload.name,
          mimeType: upload.mimeType,
          url: upload.url
        })
        
        let preview = upload.url
        let url = upload.url
        let fileName = upload.name || `${upload.type}_document`
        let fileType = upload.mimeType
        
        // Only process PDFs and documents, skip images
        if (fileType === 'application/pdf') {
          if (url) {
            // Use the server URL for PDFs
            files.push({
              type: upload.type,
              name: fileName,
              preview: preview,
              url: url,
              file: new File([], fileName, { type: fileType })
            })
            console.log('📄 Added PDF file:', fileName, url, 'type:', fileType)
          }
        } else {
          // Skip non-PDF files (images, etc.)
          console.log('⏭️ Skipping non-PDF file:', fileName, 'type:', fileType)
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          תצוגת מסמכים ונתונים שחולצו
        </h2>
        <p className="text-gray-600 text-right">
          סקור את המסמכים שהועלו ואת הנתונים שחולצו מהם באמצעות AI
        </p>
      </div>

      {/* Processing Status - Show if data was processed in Step 2 */}
      {Object.keys(extractedData).length > 0 && (
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
      )}

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
                <ChevronRight className="w-4 h-4" />
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
                {extractedData.registrationOffice && (
                  <p><strong>משרד רישום מקרקעין:</strong> {extractedData.registrationOffice}</p>
                )}
                {extractedData.gush && (
                  <p><strong>גוש:</strong> {extractedData.gush} | <strong>חלקה:</strong> {extractedData.parcel}</p>
                )}
                {extractedData.ownershipType && (
                  <p><strong>סוג בעלות:</strong> {extractedData.ownershipType}</p>
                )}
                {extractedData.attachments && (
                  <p><strong>נספחים:</strong> {extractedData.attachments}</p>
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
                    value={editingField === 'registrationOffice' ? tempValue : (extractedData.registrationOffice || '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('registrationOffice')
                      setTempValue(extractedData.registrationOffice || '')
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
                      value={editingField === 'gush' ? tempValue : (extractedData.gush || '')}
                      onChange={(e) => setTempValue(e.target.value)}
                      onFocus={() => {
                        setEditingField('gush')
                        setTempValue(extractedData.gush || '')
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
                      value={editingField === 'parcel' ? tempValue : (extractedData.parcel || '')}
                      onChange={(e) => setTempValue(e.target.value)}
                      onFocus={() => {
                        setEditingField('parcel')
                        setTempValue(extractedData.parcel || '')
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
                    value={editingField === 'attachments' ? tempValue : (extractedData.attachments || '')}
                    onChange={(e) => setTempValue(e.target.value)}
                    onFocus={() => {
                      setEditingField('attachments')
                      setTempValue(extractedData.attachments || '')
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
      {Object.keys(extractedData).length > 0 && (
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
      {Object.keys(extractedData).length > 0 && (
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
                    <span className="flex-1 text-right">{extractedData.attachments || 'לא נמצא'}</span>
                    <button
                      onClick={() => handleFieldEdit('attachments', extractedData.attachments || '')}
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
      {Object.keys(extractedData).length > 0 && (
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
      {Object.keys(extractedData).length > 0 && (
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
      {Object.keys(extractedData).length > 0 && (
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
    {Object.keys(extractedData).length > 0 && (
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
    {Object.keys(extractedData).length > 0 && (
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
