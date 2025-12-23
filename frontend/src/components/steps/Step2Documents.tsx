'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, Image, CheckCircle, AlertCircle, X, Eye, Star, Loader2, AlertTriangle, Brain } from 'lucide-react'
import { DataSource } from '../ui/DataSource'

interface DocumentUpload {
  id: string
  file: File
  type: 'tabu' | 'permit' | 'condo' | 'planning' | 'building_image' | 'interior_image'
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  extractedData?: any
  error?: string
  preview?: string
  url?: string
  path?: string
  isSelected?: boolean
  previewReady?: boolean
}

interface Step2DocumentsProps {
  data: any
  updateData: (updates: any) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
}

const DOCUMENT_TYPES = {
  tabu: {
    label: 'נסח טאבו',
    description: 'נסח רישום מקרקעין',
    icon: FileText,
    color: 'blue',
    required: false
  },
  permit: {
    label: 'היתר בניה',
    description: 'היתר בניה ותשריט',
    icon: FileText,
    color: 'blue',
    required: false
  },
  condo: {
    label: 'צו בית משותף',
    description: 'צו בית משותף',
    icon: FileText,
    color: 'blue',
    required: false
  },
  planning: {
    label: 'מידע תכנוני',
    description: 'מידע תכנוני נוסף',
    icon: FileText,
    color: 'blue',
    required: false
  },
  building_image: {
    label: 'תמונת חזית הבניין',
    description: 'תמונת החזית/שער הכניסה (תוצג בראש הדוח)',
    icon: Image,
    color: 'blue',
    required: false
  },
  interior_image: {
    label: 'תמונות פנים הדירה',
    description: 'תמונות פנים הדירה (עד 6 תמונות)',
    icon: Image,
    color: 'blue',
    required: false
  }
}

export function Step2Documents({ data, updateData, onValidationChange, sessionId }: Step2DocumentsProps) {
  const [uploads, setUploads] = useState<DocumentUpload[]>([])
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  
  // AI Extraction state
  const [existingAIExtraction, setExistingAIExtraction] = useState<any>(null)
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false)
  const [selectiveReprocess, setSelectiveReprocess] = useState({
    tabu: false,
    permit: false,
    condo: false,
    images: false
  })

  // Load uploads from session on mount
  useEffect(() => {
    const loadUploadsFromSession = async () => {
      if (sessionId) {
        try {
          const response = await fetch(`/api/session/${sessionId}`)
          if (response.ok) {
            const sessionData = await response.json()
            console.log('📁 Session data received:', sessionData)

            // The uploads are nested under sessionData.data.uploads
            const uploads = sessionData.data?.uploads || sessionData.uploads || []
            if (Array.isArray(uploads) && uploads.length > 0) {
              console.log('📁 Loading uploads from session:', uploads)
              
              // Convert session uploads to DocumentUpload format
              const sessionUploads: DocumentUpload[] = await Promise.all(uploads.map(async (upload: any) => {
                // Handle incomplete upload data (from before the fix)
                const fileName = upload.fileName || upload.extractedData?.fileName || 'unknown_file'
                let fileSize = upload.size || 0
                const mimeType = upload.mimeType || 'application/octet-stream'
                const uploadName = upload.name || fileName
                const uploadPath = upload.path || upload.extractedData?.filePath || ''
                const uploadDate = upload.uploadedAt || new Date().toISOString()
                const uploadUrl = upload.url || upload.preview || ''
                
                // If file size is not in database, try to get it from the file
                if (fileSize === 0 && uploadUrl) {
                  try {
                    const response = await fetch(uploadUrl, { method: 'HEAD' })
                    if (response.ok) {
                      const contentLength = response.headers.get('content-length')
                      if (contentLength) {
                        fileSize = parseInt(contentLength)
                        console.log(`📁 Got file size from HTTP headers: ${fileSize} bytes`)
                      }
                    }
                  } catch (error) {
                    console.warn('⚠️ Could not get file size from HTTP headers:', error)
                  }
                }
                
                // Create a file object with the correct size from the database
                const fileBlob = new Blob([], { type: mimeType })
                const file = new File([fileBlob], uploadName, { 
                  type: mimeType,
                  lastModified: new Date(uploadDate).getTime()
                })
                
                // Override the size property to use the database value
                Object.defineProperty(file, 'size', {
                  value: fileSize,
                  writable: false
                })
                
                // CRITICAL FIX: For images, set preview and previewReady from URL
                // This ensures images show up after page refresh
                const isImageType = upload.type === 'building_image' || upload.type === 'interior_image'
                const hasValidUrl = uploadUrl && uploadUrl.trim().length > 0 && uploadUrl !== 'data:,'
                
                console.log(`📁 Loading upload ${upload.id}: type=${upload.type}, hasValidUrl=${hasValidUrl}, url=${uploadUrl?.substring(0, 50)}...`)
                
                return {
                  id: upload.id,
                  file: file,
                  type: upload.type as any,
                  status: upload.status || 'completed' as const, // Use status from DB, fallback to 'completed'
                  progress: upload.status === 'processing' ? 50 : (upload.status === 'uploading' ? 25 : 100),
                  url: uploadUrl,
                  // CRITICAL: Set preview and previewReady for images so they display after refresh
                  preview: isImageType && hasValidUrl ? uploadUrl : undefined,
                  previewReady: isImageType && hasValidUrl ? true : false,
                  extractedData: upload.extractedData || {},
                  error: upload.error,
                  isSelected: upload.isSelected || false,
                  // Preserve original upload data (with fallbacks)
                  name: uploadName,
                  fileName: fileName,
                  path: uploadPath,
                  size: fileSize,
                  mimeType: mimeType,
                  uploadedAt: uploadDate
                }
              }))
              
              console.log(`📁 Loaded ${sessionUploads.length} uploads from session`)
              console.log(`📁 Image uploads:`, sessionUploads.filter(u => u.type === 'building_image' || u.type === 'interior_image').map(u => ({
                id: u.id,
                type: u.type,
                hasPreview: !!u.preview,
                previewReady: u.previewReady,
                url: u.url?.substring(0, 50)
              })))
              
              setUploads(sessionUploads)
              
              // CRITICAL: Initialize image data after loading from session
              // Use setTimeout to ensure state is updated before calling updateImageData
              setTimeout(() => {
                console.log('📁 Initializing image data from session uploads...')
                updateImageData(sessionUploads)
              }, 100)
            } else {
              console.log('📁 No uploads found in session data')
            }
          }
        } catch (error) {
          console.error('❌ Error loading uploads from session:', error)
        }
      }
    }
    
    loadUploadsFromSession()
  }, [sessionId, updateData])

  // Load existing AI extractions
  useEffect(() => {
    const checkExistingAIExtraction = async () => {
      if (!sessionId) return
      
      try {
        const response = await fetch(`/api/session/${sessionId}/ai-extractions?type=combined`)
        if (response.ok) {
          const { extractions } = await response.json()
          if (extractions && extractions.length > 0) {
            const latestExtraction = extractions[0]
            setExistingAIExtraction(latestExtraction)
            console.log('📚 Found existing AI extraction:', latestExtraction)
          }
        }
      } catch (error) {
        console.error('❌ Error checking for existing AI extractions:', error)
      }
    }
    
    checkExistingAIExtraction()
  }, [sessionId])

  const getUploadsByType = (type: string) => {
    return uploads.filter(upload => upload.type === type)
  }

  // Process documents using AI services
  const processDocuments = async (reprocessSelection?: typeof selectiveReprocess) => {
    if (!sessionId) return
    
    setIsProcessing(true)
    setProcessingProgress(8)
    setProcessingStage('מכין את המסמכים לעיבוד')
    setShowReprocessConfirm(false)
    
    try {
      // Check which document types were uploaded
      const uploadedTypes = new Set(data.uploads?.map((upload: any) => upload.type) || [])
      console.log('📋 Uploaded document types:', Array.from(uploadedTypes))
      
      // If reprocessSelection is provided, only process selected types
      // Otherwise, process all uploaded types
      const shouldProcess = reprocessSelection || {
        tabu: uploadedTypes.has('tabu'),
        permit: uploadedTypes.has('permit'),
        condo: uploadedTypes.has('condo'),
        images: uploadedTypes.has('building_image') || uploadedTypes.has('interior_image')
      }
      
      console.log('🔄 Reprocessing selection:', shouldProcess)
      
      // Only call APIs for selected document types
      type ProcessingTask = {
        type: 'tabu' | 'permit' | 'condo' | 'images'
        label: string
        run: () => Promise<any>
      }

      const tasks: ProcessingTask[] = []
      
      if (uploadedTypes.has('tabu') && shouldProcess.tabu) {
        console.log('🏛️ Enqueue land registry analysis task')
        tasks.push({
          type: 'tabu',
          label: 'חילוץ נתוני טאבו',
          run: extractLandRegistryData
        })
      }
      
      if (uploadedTypes.has('permit') && shouldProcess.permit) {
        console.log('🏗️ Enqueue building permit analysis task')
        tasks.push({
          type: 'permit',
          label: 'חילוץ נתוני היתר בנייה',
          run: extractBuildingPermitData
        })
      }
      
      if (uploadedTypes.has('condo') && shouldProcess.condo) {
        console.log('🏢 Enqueue shared building analysis task')
        tasks.push({
          type: 'condo',
          label: 'חילוץ נתוני צו בית משותף',
          run: extractSharedBuildingData
        })
      }
      
      if ((uploadedTypes.has('building_image') || uploadedTypes.has('interior_image')) && shouldProcess.images) {
        console.log('📸 Enqueue image analysis task')
        tasks.push({
          type: 'images',
          label: 'ניתוח חזית ותמונות פנים',
          run: extractImageAnalysisData
        })
      }
      
      // If no relevant documents selected for processing, show message
      if (tasks.length === 0) {
        console.log('⚠️ No documents selected for AI analysis')
        setIsProcessing(false)
        setProcessingProgress(0)
        setProcessingStage(null)
        return
      }
      
      console.log(`🚀 Processing ${tasks.length} document types with AI...`)
      setProcessingStage('שולח מסמכים לניתוח AI')
      setProcessingProgress(12)
      
      // If reprocessing selectively, fetch latest data from database first
      let baseData = {}
      if (reprocessSelection) {
        console.log('🔄 Selective reprocess - fetching latest data from database first...')
        try {
          const sessionResponse = await fetch(`/api/session/${sessionId}`)
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            baseData = sessionData.data?.extractedData || sessionData.extractedData || {}
            console.log('✅ Loaded base data from database:', Object.keys(baseData))
          }
        } catch (error) {
          console.error('❌ Failed to load base data, using local state:', error)
          baseData = { ...extractedData }
        }
      }
      
      // Execute tasks sequentially to provide granular progress feedback
      const results: Array<{
        type: ProcessingTask['type']
        status: 'fulfilled' | 'rejected'
        value?: any
        reason?: any
      }> = []

      const totalTasks = tasks.length
      let completedTasks = 0
      const progressAllocation = totalTasks > 0 ? 60 / totalTasks : 0

      for (const task of tasks) {
        setProcessingStage(task.label)
        setProcessingProgress(prev => {
          const baseProgress = 15
          const currentTaskProgress = completedTasks * progressAllocation
          return Math.min(75, Math.round(baseProgress + currentTaskProgress))
        })
        
        try {
          const value = await task.run()
          results.push({ type: task.type, status: 'fulfilled', value })
          console.log(`✅ Task ${task.type} completed successfully`)
        } catch (error) {
          console.error(`❌ Task ${task.type} failed:`, error)
          results.push({ type: task.type, status: 'rejected', reason: error })
        }
        completedTasks += 1
        setProcessingProgress(prev => {
          const next = 15 + completedTasks * progressAllocation
          return next > prev ? Math.min(80, Math.round(next)) : prev
        })
      }
      
      // Start with base data (from DB if selective, empty if full reprocess)
      const combinedData: any = { ...baseData }
      
      console.log('🔄 Starting with base data:', reprocessSelection ? 'FROM DATABASE (selective)' : 'EMPTY (full process)')
      console.log('🔄 Base data keys:', Object.keys(combinedData))
      
      setProcessingStage('מאחד תוצאות מהמקורות השונים')
      setProcessingProgress(prev => Math.max(prev, 82))
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`📦 Merging result for ${result.type}:`, result.value)
          Object.assign(combinedData, result.value)
        } else if (result.status === 'rejected') {
          console.error(`❌ Task ${result.type} failed:`, result.reason)
        }
      })
      
      console.log('📦 Final combined data after merging all results:', combinedData)
      console.log('📦 Combined data keys:', Object.keys(combinedData))
      
      setExtractedData(combinedData)
      
      // Update parent data - only update extractedData to avoid overwriting other data
      console.log('📊 About to update parent data with extracted data:', JSON.stringify(combinedData, null, 2))
      updateData({
        extractedData: combinedData
      })
      console.log('📊 Updated parent data with extracted data')
      console.log('📊 Extracted data keys in combinedData:', Object.keys(combinedData))

      setProcessingStage('שומר נתונים לסשן')
      setProcessingProgress(prev => Math.max(prev, 90))
      
      // Save extracted data to session AND save original AI extractions separately
      if (sessionId) {
        try {
          const savePayload = {
            data: {
              extractedData: combinedData
            }
          }
          console.log('💾 Saving to session API. Payload:', JSON.stringify(savePayload, null, 2))
          
          const response = await fetch(`/api/session/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload)
          })
          
          if (response.ok) {
            const savedData = await response.json()
            console.log('✅ Extracted data saved to session successfully')
            console.log('✅ Server response:', savedData)
            console.log('✅ Keys that were saved:', Object.keys(combinedData))
          } else {
            const errorText = await response.text()
            console.error('❌ Failed to save extracted data to session:', response.status, errorText)
          }
          
          // Also save original AI extractions for potential revert
          console.log('💾 Saving original AI extractions for future revert...')
          await fetch(`/api/session/${sessionId}/ai-extractions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              extractionType: 'combined',
              extractedFields: combinedData,
              metadata: {
                extractionDate: new Date().toISOString(),
                documentTypes: Array.from(uploadedTypes)
              }
            })
          })
          console.log('✅ Original AI extractions saved for revert capability')
        } catch (error) {
          console.error('❌ Error saving extracted data to session:', error)
        }
      }

      setProcessingStage('העיבוד הושלם בהצלחה')
      setProcessingProgress(100)
      
    } catch (error) {
      console.error('Error processing documents:', error)
      setProcessingStage('אירעה שגיאה במהלך עיבוד המסמכים')
    } finally {
      setIsProcessing(false)
      setTimeout(() => {
        setProcessingProgress(0)
        setProcessingStage(null)
      }, 800)
      
      // Add a small delay to ensure extracted data is saved before uploads useEffect runs
      setTimeout(() => {
        console.log('✅ Processing complete, extracted data should be saved')
      }, 1000)
    }
  }

  const extractLandRegistryData = async (): Promise<any> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/land-registry-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('🏛️ Land registry API response:', result)
        
        if (result.success && result.extractedData) {
          const data = result.extractedData
          // Return ALL fields from API - both structured and flat
          return {
            land_registry: data,
            // Flat fields for UI compatibility
            registrationOffice: data.registration_office || data.registrationOffice || 'לא נמצא',
            gush: data.gush || 'לא נמצא',
            parcel: data.chelka || data.parcel || 'לא נמצא',
            subParcel: data.subParcel || data.sub_parcel || data.sub_chelka || null,
            ownershipType: data.ownership_type || data.ownershipType || 'לא נמצא',
            attachments: data.attachments_description || (Array.isArray(data.attachments) ? data.attachments.map((a: any) => a.description || a.type).join(', ') : data.attachments) || 'לא נמצא',
            balconyArea: data.balcony_area || data.balconyArea || 0,
            buildingNumber: data.building_number || data.buildingNumber || '',
            registeredArea: data.registered_area || data.apartment_registered_area || data.registeredArea || data.apartmentArea || 0,
            builtArea: data.built_area || data.builtArea || 'לא נמצא',
            finishLevel: data.finish_standard || data.finishStandard || 'לא נמצא',
            sharedAreas: data.shared_areas || data.shared_property || data.sharedAreas || data.sharedProperty || 'לא נמצא',
            constructionYear: data.construction_year || data.constructionYear || 'לא נמצא',
            propertyCondition: data.property_condition || data.propertyCondition || 'לא נמצא',
            floor: data.floor || null,
            unitDescription: data.unit_description || data.unitDescription || null,
            owners: data.owners || [],
            mortgages: data.mortgages || [],
            easementsEssence: data.easements_essence || data.easementsEssence || null,
            easementsDescription: data.easements_description || data.easementsDescription || null
          }
        }
      }
    } catch (error) {
      console.error('Land registry extraction failed:', error)
    }
    
    return {
      land_registry: null,
      registrationOffice: 'לא נמצא',
      gush: 'לא נמצא',
      parcel: 'לא נמצא',
      ownershipType: 'לא נמצא',
      attachments: 'לא נמצא',
      balconyArea: 0,
      buildingNumber: '',
      registeredArea: 0,
      builtArea: 'לא נמצא',
      finishLevel: 'לא נמצא',
      sharedAreas: 'לא נמצא',
      constructionYear: 'לא נמצא',
      propertyCondition: 'לא נמצא'
    }
  }

  const extractBuildingPermitData = async (): Promise<any> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/building-permit-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('🏗️ Building permit API response:', result)
        
        if (result.success && result.extractedData) {
          const data = result.extractedData
          // Extract year from permit date if available
          let buildingYear = 'לא נמצא'
          if (data.permit_date) {
            const dateMatch = data.permit_date.match(/(\d{4})/)
            if (dateMatch) {
              buildingYear = dateMatch[1]
            }
          }
          
          // Return ALL fields from API - both structured and flat
          return {
            building_permit: data,
            // Flat fields for UI compatibility
            buildingYear: buildingYear !== 'לא נמצא' ? buildingYear : (data.building_year || 'לא נמצא'),
            buildingRights: data.permitted_usage || data.permitted_description || data.building_description || data.permittedUsage || data.permittedDescription || 'לא נמצא',
            permittedUse: data.permitted_usage || data.permitted_description || data.permittedUsage || data.permittedDescription || 'לא נמצא',
            buildingDescription: data.building_description || data.buildingDescription || 'לא נמצא',
            buildingPermitNumber: data.permit_number || data.permitNumber || 'לא נמצא',
            buildingPermitDate: data.permit_date || data.permitDate || 'לא נמצא',
            permitIssueDate: data.permit_issue_date || data.permitIssueDate || null,
            localCommitteeName: data.local_committee_name || data.localCommitteeName || null,
            propertyAddress: data.property_address || data.propertyAddress || null,
            gush: data.gush || null,
            chelka: data.chelka || null,
            subParcel: data.subParcel || data.sub_parcel || data.sub_chelka || null,
            buildingType: 'לא מזוהה' // Not in permit - will be filled from exterior analysis
          }
        }
      }
    } catch (error) {
      console.error('Building permit extraction failed:', error)
    }
    
    return {
      building_permit: null,
      buildingYear: 'לא נמצא',
      buildingRights: 'לא נמצא',
      permittedUse: 'לא נמצא',
      buildingDescription: 'לא נמצא',
      buildingPermitNumber: 'לא נמצא',
      buildingPermitDate: 'לא נמצא',
      buildingType: 'לא מזוהה'
    }
  }

  const extractSharedBuildingData = async (): Promise<any> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/shared-building-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('🏢 Shared building API response:', result)
        
        if (result.success && result.extractedData) {
          const data = result.extractedData
          // Return ALL fields from API - both structured and flat
          return {
            shared_building: data,
            // Flat fields for UI compatibility
            buildingDescription: data.building_description || data.buildingDescription || 'לא נמצא',
            buildingFloors: data.building_floors || data.buildingFloors || 'לא נמצא',
            buildingUnits: data.building_sub_plots_count || data.total_sub_plots || data.buildingSubPlotsCount || data.totalSubPlots || 'לא נמצא',
            buildingAddress: data.building_address || data.buildingAddress || null,
            orderIssueDate: data.order_issue_date || data.orderIssueDate || null,
            totalSubPlots: data.total_sub_plots || data.totalSubPlots || null,
            buildingsInfo: data.buildings_info || data.buildingsInfo || [],
            subPlots: data.sub_plots || data.subPlots || []
          }
        }
      }
    } catch (error) {
      console.error('Shared building extraction failed:', error)
    }
    
    return {
      shared_building: null,
      buildingDescription: 'לא נמצא',
      buildingFloors: 'לא נמצא',
      buildingUnits: 'לא נמצא'
    }
  }

  const extractImageAnalysisData = async (): Promise<any> => {
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
      
      const result: any = {}
      
      // Process interior analysis results
      if (interiorResponse.status === 'fulfilled' && interiorResponse.value.ok) {
        const interiorData = await interiorResponse.value.json()
        console.log('📸 Interior API response:', interiorData)
        
        if (interiorData.success) {
          // Handle both nested and flat extractedData structure
          const extracted = interiorData.extractedData || interiorData
          
          // Store structured data for Step 3
          result.interior_analysis = {
            description: extracted.description,
            property_layout_description: extracted.property_layout_description,
            room_analysis: extracted.room_analysis || [],
            condition_assessment: extracted.condition_assessment,
            interior_features: extracted.interior_features,
            finish_level: extracted.finish_level
          }
          
          // Also include flat fields for backward compatibility
          result.propertyLayoutDescription = extracted.description || extracted.property_layout_description || 'לא נמצא'
          result.roomAnalysis = extracted.room_analysis || []
          result.conditionAssessment = extracted.condition_assessment || 'לא נמצא'
          result.interiorFeatures = extracted.interior_features || 'לא נמצא'
          result.finishLevel = extracted.finish_level || 'לא נמצא'
        }
      }
      
      // Process exterior analysis results
      if (exteriorResponse.status === 'fulfilled' && exteriorResponse.value.ok) {
        const exteriorData = await exteriorResponse.value.json()
        console.log('📸 Exterior API response:', exteriorData)
        
        if (exteriorData.success) {
          // Handle both nested and flat extractedData structure
          const extracted = exteriorData.extractedData || exteriorData
          result.buildingCondition = extracted.building_condition || 'לא נמצא'
          result.buildingFeatures = extracted.building_features || 'לא נמצא'
          result.buildingType = extracted.building_type || 'לא נמצא'
          result.overallAssessment = extracted.overall_assessment || extracted.exterior_assessment || 'לא נמצא'
          result.buildingYear = extracted.building_year || 'לא נמצא'
        }
      }
      
      console.log('📸 Combined image analysis result:', result)
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

  const handleFileSelect = async (type: string, files: FileList | null) => {
    if (!files) return

    // Limit interior images to 3
    if (type === 'interior_image') {
      const currentInteriorCount = getUploadsByType('interior_image').length
      const maxFiles = Math.min(files.length, 6 - currentInteriorCount)
      if (maxFiles <= 0) {
        alert('ניתן להעלות עד 6 תמונות פנים בלבד')
        return
      }
      // Create a new FileList with limited files
      const limitedFiles = Array.from(files).slice(0, maxFiles)
      files = limitedFiles as any
    }

    const newUploads: DocumentUpload[] = []
    
    for (let i = 0; i < files!.length; i++) {
      const file = files![i]
      const uploadId = `${type}_${Date.now()}_${i}`
      
      const upload: DocumentUpload = {
        id: uploadId,
        file,
        type: type as 'tabu' | 'permit' | 'condo' | 'planning' | 'building_image' | 'interior_image',
        status: 'uploading' as const,
        progress: 0,
        previewReady: false
      }

      // Create preview for images immediately
      if ((type === 'building_image' || type === 'interior_image') && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setUploads(prev => {
            const updated = prev.map(u => 
              u.id === uploadId
                ? { ...u, preview: base64, previewReady: true }
                : u
            )
            const processed = updateImageData(updated)
            if (type === 'building_image' && i === 0) {
              updateData({ selectedImagePreview: base64 })
            }
            return processed || updated
          })
        }
        reader.readAsDataURL(file)
      }

      newUploads.push(upload)
    }

    setUploads(prev => [...prev, ...newUploads])

    // Simulate upload process
    for (const upload of newUploads) {
      await simulateUpload(upload)
    }
  }

  const simulateUpload = async (upload: DocumentUpload) => {
    if (!sessionId) {
      console.error('❌ No session ID for upload')
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'error' as const, error: 'No session ID' } : u
      ))
      return
    }

    try {
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, progress } : u
        ))
      }

      // Actually upload the file
      const formData = new FormData()
      formData.append('file', upload.file)
      formData.append('type', upload.type)

      console.log(`🚀 Uploading ${upload.type} file: ${upload.file.name}`)

      const response = await fetch(`/api/session/${sessionId}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`✅ Upload successful:`, result)
      
      // Use the complete upload entry from the API response (it has the correct URL)
      const uploadEntry = result.uploadEntry || {}
      
      // Mark as completed with all metadata from API - no need to generate URL ourselves
      setUploads(prev => {
        const updated = prev.map(u => {
          if (u.id === upload.id) {
            const actualUrl = uploadEntry.url
            const isImageType = upload.type === 'building_image' || upload.type === 'interior_image'
            
            console.log(`✅ Marking upload as completed:`, {
              id: u.id,
              type: upload.type,
              isImageType,
              uploadEntryUrl: uploadEntry.url,
              actualUrl,
              previousPreview: u.preview?.substring(0, 50)
            })
            
            return {
              ...u, 
              status: uploadEntry.status || 'completed' as const,
              url: actualUrl,
              // CRITICAL: For images, update preview to use the real URL (not base64)
              preview: isImageType ? actualUrl : u.preview,
              previewReady: isImageType ? true : u.previewReady,
              // Add all metadata from the API response
              name: uploadEntry.name || u.file.name,
              fileName: uploadEntry.fileName || u.file.name,
              path: uploadEntry.path || '',
              size: uploadEntry.size || u.file.size,
              mimeType: uploadEntry.mimeType || u.file.type,
              uploadedAt: uploadEntry.uploadedAt || new Date().toISOString(),
              extractedData: uploadEntry.extractedData || result.extractedData || { extracted: true }
            }
          }
          return u
        })
        
        // Update image data after completion
        if (upload.type === 'building_image' || upload.type === 'interior_image') {
          console.log('🖼️ Calling updateImageData after upload completion')
          const processedUploads = updateImageData(updated)
          if (processedUploads) {
            console.log('🖼️ updateImageData returned processed uploads')
            return processedUploads
          } else {
            console.log('🖼️ updateImageData returned nothing, using updated')
          }
        }
        
        return updated
      })

    } catch (error) {
      console.error('❌ Upload failed:', error)
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { 
          ...u, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : u
      ))
    }
  }

  const updateImageData = (currentUploads?: DocumentUpload[]): DocumentUpload[] | undefined => {
    const uploadsToUse = currentUploads || uploads
    
    console.log('🖼️ updateImageData called with', uploadsToUse.length, 'uploads')
    const imageUploads = uploadsToUse.filter(u => u.type === 'building_image' || u.type === 'interior_image')
    console.log('🖼️ Found', imageUploads.length, 'image uploads:', imageUploads.map(u => ({
      id: u.id,
      type: u.type,
      status: u.status,
      previewReady: u.previewReady,
      hasPreview: !!u.preview,
      previewIsData: u.preview?.startsWith('data:'),
      previewStart: u.preview?.substring(0, 50)
    })))
    
    // STRICT FILTER: Only include images with valid previews AND completed status
    const completedImages = uploadsToUse.filter((u) => {
      const isImageType = u.type === 'building_image' || u.type === 'interior_image'
      const hasPreviewReady = u.previewReady === true
      const hasValidPreview = typeof u.preview === 'string' && u.preview.trim().length > 0
      const isCompleted = u.status === 'completed'
      
      return isImageType && hasPreviewReady && hasValidPreview && isCompleted
    })
    
    console.log('🖼️ After filter:', completedImages.length, 'completed images')

    if (completedImages.length === 0) {
      console.log('🖼️ No completed images, clearing image data')
      updateData({ propertyImages: [], selectedImagePreview: null, interiorImages: [] })
      return currentUploads
    }

    // Double-check: filter again to ensure no empty strings or base64-only slip through
    const validUploads = completedImages.filter(
      (u) => typeof u.preview === 'string' && u.preview.trim().length > 0 && u.preview !== 'data:,'
    )
    
    console.log('🖼️ After validation:', validUploads.length, 'valid uploads')

    if (validUploads.length === 0) {
      console.log('🖼️ No valid uploads after validation')
      updateData({ propertyImages: [], selectedImagePreview: null, interiorImages: [] })
      return currentUploads
    }

    const nextUploads = currentUploads
      ? currentUploads.map((upload) => ({ ...upload }))
      : undefined

    // Construct image data with strict validation
    let imageData = validUploads
      .map((u) => {
        const preview = (u.preview as string).trim()
        // Skip if preview is empty or invalid
        if (!preview || preview === 'data:,') {
          return null
        }
        return {
          name: u.file.name,
          preview: preview,
          isSelected: u.isSelected || false,
          type: u.type,
          url: u.url,
          path: u.path
        }
      })
      .filter((img): img is NonNullable<typeof img> => img !== null)

    const hasSelectedBuilding = imageData.some(
      (img) => img.type === 'building_image' && img.isSelected
    )

    let primaryUpload = validUploads.find(
      (u) => u.type === 'building_image' && u.isSelected
    )

    if (!primaryUpload) {
      primaryUpload = validUploads.find((u) => u.type === 'building_image')
    }

    if (primaryUpload && primaryUpload.type === 'building_image' && !hasSelectedBuilding) {
      const primaryPreview = (primaryUpload.preview as string).trim()
      imageData = imageData.map((img) =>
        img.type === 'building_image'
          ? { ...img, isSelected: img.preview === primaryPreview }
          : img
      )

      if (nextUploads) {
        for (let i = 0; i < nextUploads.length; i += 1) {
          const upload = nextUploads[i]
          if (upload.type === 'building_image' && upload.status === 'completed') {
            nextUploads[i] = {
              ...upload,
              isSelected: upload.id === primaryUpload.id
            }
          }
        }
      }
    }

    const selectedBuilding = imageData.find(
      (img) => img.type === 'building_image' && img.isSelected
    )

    const fallbackBuilding = selectedBuilding || imageData.find((img) => img.type === 'building_image')
    const selectedPreview = fallbackBuilding?.preview?.trim()
    
    // STRICT VALIDATION: Ensure selected preview is not empty
    const validSelectedPreview = selectedPreview && selectedPreview !== 'data:,' ? selectedPreview : null

    // STRICT VALIDATION: Filter interior photos more aggressively
    const interiorPhotos = validUploads
      .filter((u) => u.type === 'interior_image')
      .map((u) => (u.preview as string).trim())
      .filter((preview) => {
        // Ensure preview is valid, not empty, and not a blank data URL
        return preview && preview.length > 0 && preview !== 'data:,'
      })
      .slice(0, 6)

    updateData({
      propertyImages: imageData,
      selectedImagePreview: validSelectedPreview,
      interiorImages: interiorPhotos
    })

    return nextUploads || currentUploads
  }

  const handleRemoveUpload = async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId)
    
    if (!upload) return
    
    console.log(`🗑️ Removing upload ${uploadId} (${upload.type})`)
    
    // Call the API to delete from DB, blob storage, and images table in parallel
    try {
      const response = await fetch(`/api/session/${sessionId}/upload/${uploadId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ Failed to delete upload:`, errorData)
        throw new Error(errorData.error || 'Failed to delete upload')
      }
      
      const result = await response.json()
      console.log(`✅ Upload deleted successfully:`, result)
      
      // Update local state after successful deletion
      setUploads(prev => {
        const remaining = prev.filter(u => u.id !== uploadId)
        
        // Handle image types
        if (upload.type === 'building_image' || upload.type === 'interior_image') {
          // STRICT FILTER: Only keep images with valid previews and completed status
          const remainingImages = remaining.filter((u) => {
            const isImageType = u.type === 'building_image' || u.type === 'interior_image'
            const hasPreviewReady = u.previewReady === true
            const hasValidPreview = typeof u.preview === 'string' && u.preview.trim().length > 0 && u.preview !== 'data:,'
            const isCompleted = u.status === 'completed'
            
            return isImageType && hasPreviewReady && hasValidPreview && isCompleted
          })
          const validRemainingImages = remainingImages
          
          // Handle interior images - remove from interiorImages array
          if (upload.type === 'interior_image') {
            const remainingInteriorImages = remaining
              .filter(u => {
                return u.type === 'interior_image' && 
                       u.previewReady === true && 
                       u.status === 'completed' &&
                       typeof u.preview === 'string' && 
                       u.preview.trim().length > 0 &&
                       u.preview !== 'data:,'
              })
              .map(u => (u.preview as string).trim())
              .slice(0, 6)
            
            console.log('🖼️ Updating interior images:', {
              removed: upload.preview,
              remaining: remainingInteriorImages.length
            })
            
            updateData({ 
              interiorImages: remainingInteriorImages,
              propertyImages: validRemainingImages
                .map(u => {
                  const preview = (u.preview as string).trim()
                  // Skip if preview is invalid
                  if (!preview || preview === 'data:,') return null
                  
                  return {
                    name: u.file.name,
                    preview: preview,
                    isSelected: u.isSelected || false,
                    type: u.type,
                    url: u.url,
                    path: u.path
                  }
                })
                .filter((img): img is NonNullable<typeof img> => img !== null)
            })
          } else if (upload.type === 'building_image') {
            // Handle building images - update selectedImagePreview
            const buildingImages = validRemainingImages.filter(u => u.type === 'building_image')
            const selectedBuildingImage = buildingImages.find(u => u.isSelected) || buildingImages[0]
            const selectedPreview = selectedBuildingImage?.preview?.trim()
            const validSelectedPreview = selectedPreview && selectedPreview !== 'data:,' ? selectedPreview : null
            
            console.log('🏢 Updating building images:', {
              removed: upload.preview,
              remaining: buildingImages.length,
              newSelected: validSelectedPreview
            })
            
            updateData({ 
              propertyImages: validRemainingImages
                .map(u => {
                  const preview = (u.preview as string).trim()
                  // Skip if preview is invalid
                  if (!preview || preview === 'data:,') return null
                  
                  return {
                    name: u.file.name,
                    preview: preview,
                    isSelected: u.isSelected || false,
                    type: u.type,
                    url: u.url,
                    path: u.path
                  }
                })
                .filter((img): img is NonNullable<typeof img> => img !== null),
              selectedImagePreview: validSelectedPreview
            })
          }
        }
        
        return remaining
      })
    } catch (error) {
      console.error(`❌ Error deleting upload:`, error)
      alert(`שגיאה במחיקת הקובץ: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSelectImage = (uploadId: string) => {
    setUploads(prev => {
      const updated = prev.map(upload => ({
        ...upload,
        isSelected: upload.id === uploadId && (upload.type === 'building_image' || upload.type === 'interior_image')
      }))
      
      // STRICT FILTER: Only use completed images with valid previews
      const imageUploads = updated.filter((u) => {
        const isImageType = u.type === 'building_image' || u.type === 'interior_image'
        const isCompleted = u.status === 'completed'
        const hasValidPreview = typeof u.preview === 'string' && u.preview.trim().length > 0 && u.preview !== 'data:,'
        
        return isImageType && isCompleted && hasValidPreview
      })
      
      const buildingImages = imageUploads.filter((u) => u.type === 'building_image')
      const selectedBuildingImage = buildingImages.find(u => u.isSelected) || buildingImages[0]
      const selectedPreview = selectedBuildingImage?.preview?.trim()
      const validSelectedPreview = selectedPreview && selectedPreview !== 'data:,' ? selectedPreview : null
      
      console.log('Selecting image:', { uploadId, selectedBuildingImage, preview: validSelectedPreview })
      
      updateData({ 
        propertyImages: imageUploads
          .map(u => {
            const preview = (u.preview as string).trim()
            // Skip if preview is invalid
            if (!preview || preview === 'data:,') return null
            
            return {
              name: u.file.name,
              preview: preview,
              isSelected: u.isSelected || false,
              type: u.type,
              url: u.url,
              path: u.path
            }
          })
          .filter((img): img is NonNullable<typeof img> => img !== null),
        selectedImagePreview: validSelectedPreview
      })
      
      return updated
    })
  }

  const handleDragOver = (e: React.DragEvent, type: string) => {
    e.preventDefault()
    setDragOver(type)
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent, type: string) => {
    e.preventDefault()
    setDragOver(null)
    handleFileSelect(type, e.dataTransfer.files)
  }

  const validation = useCallback(() => {
    // Step 2 is optional - always allow proceeding to next step
    // Users can skip document uploads if they want
    console.log('Step 2 validation: Always valid (optional step)')
    return true
  }, [])

  // CRITICAL: Use ref to prevent infinite loops - only call onValidationChange once on mount
  const validationCalledRef = useRef(false)
  useEffect(() => {
    if (!validationCalledRef.current) {
      onValidationChange(true)
      validationCalledRef.current = true
    }
  }, []) // Empty dependency array - only run once on mount

  // Save uploads to session data whenever uploads change
  useEffect(() => {
    console.log('🔄 Uploads useEffect triggered, isProcessing:', isProcessing, 'uploads.length:', uploads.length)
    
    // Don't save uploads during processing to avoid overwriting extracted data
    if (isProcessing) {
      console.log('⏸️ Skipping upload save during processing to preserve extracted data')
      return
    }
    
    if (uploads.length > 0) {
      console.log('💾 Saving uploads to session:', uploads.length, 'uploads')
      
      // Filter out UI-only fields before saving to database
      const uploadsForDB = uploads.map(upload => {
        // CRITICAL: Get the real URL, not base64 preview
        const uploadUrl = (upload as any).url
        const uploadPreview = upload.preview
        
        // NEVER save base64 previews to database - they're huge and temporary
        let finalUrl = uploadUrl
        if (!finalUrl && uploadPreview && !uploadPreview.startsWith('data:')) {
          // Only use preview if it's a real URL, not a base64 string
          finalUrl = uploadPreview
        }
        
        console.log(`💾 Saving upload ${upload.id}:`, {
          type: upload.type,
          hasUrl: !!uploadUrl,
          hasPreview: !!uploadPreview,
          previewIsBase64: uploadPreview?.startsWith('data:'),
          finalUrl: finalUrl?.substring(0, 80)
        })
        
        return {
          id: upload.id,
          type: upload.type,
          name: upload.file?.name || (upload as any).name,
          fileName: (upload as any).fileName || upload.file?.name,
          path: (upload as any).path || '',
          size: (upload as any).size || upload.file?.size || 0,
          mimeType: (upload as any).mimeType || upload.file?.type,
          status: upload.status,
          error: upload.error,
          url: finalUrl, // CRITICAL: Only save real URLs, never base64
          uploadedAt: (upload as any).uploadedAt || new Date().toISOString(),
          extractedData: upload.extractedData,
          isSelected: upload.isSelected || false
        }
      })
      
      // Only update uploads, preserve other data like extractedData
      console.log('💾 Updating parent data with uploads only, preserving extractedData')
      console.log('💾 Uploads being saved (with status field):', JSON.stringify(uploadsForDB.map(u => ({ id: u.id, type: u.type, status: u.status }))))
      updateData({ uploads: uploadsForDB })
    } else {
      // Clear uploads from parent data when no uploads remain
      updateData({ uploads: [] })
    }
  }, [uploads, updateData, isProcessing])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      default:
        return <Upload className="w-5 h-5 text-gray-400" />
    }
  }

    return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 overflow-hidden">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-right truncate">
          העלאת מסמכים
        </h2>
        <p className="text-sm sm:text-base text-gray-600 text-right break-words">
          העלה את המסמכים הנדרשים לשומה. המערכת תעבד ותחלץ נתונים אוטומטית
        </p>
        </div>
        
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const Icon = config.icon
          const typeUploads = getUploadsByType(type)
          const isDragOver = dragOver === type
          const hasUploads = typeUploads.length > 0

          return (
            <div
              key={type}
          className={`
                border-2 border-dashed rounded-lg p-4 sm:p-6 transition-all overflow-hidden
                ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${config.required && !hasUploads ? 'border-red-300 bg-red-50' : ''}
              `}
              onDragOver={(e) => handleDragOver(e, type)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, type)}
            >
              <div className="text-center">
                <Icon className={`w-12 h-12 mx-auto mb-4 text-${config.color}-600`} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {config.label}
                  {config.required && <span className="text-red-500 mr-1">*</span>}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{config.description}</p>

                {/* Upload Area */}
                <div className="space-y-4">
          <input
                    ref={(el) => { fileInputRefs.current[type] = el }}
            type="file"
                    accept={type === 'building_image' || type === 'interior_image' ? 'image/*' : '.pdf,.doc,.docx'}
                    multiple={type === 'building_image' || type === 'interior_image'}
                    onChange={(e) => handleFileSelect(type, e.target.files)}
            className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRefs.current[type]?.click()}
                    className={`
                      w-full px-4 py-3 rounded-lg font-medium transition-all
                      bg-${config.color}-600 text-white hover:bg-${config.color}-700
                    `}
                  >
                    בחר קובץ{(type === 'building_image' || type === 'interior_image') ? 'ים' : ''}
                  </button>

                  <p className="text-xs text-gray-500">
                    גרור ושחרר קבצים כאן
              </p>
            </div>

                {/* Upload List */}
                {typeUploads.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {typeUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center justify-between p-3 bg-white rounded border gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getStatusIcon(upload.status)}
                          <div className="text-right min-w-0 flex-1">
                            <div 
                              className="text-sm font-medium text-gray-900 truncate max-w-full"
                              title={upload.file.name}
                            >
                              {upload.file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {upload.preview && (
                            <button
                              onClick={() => window.open(upload.preview, '_blank')}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Image Selection Button */}
                          {(type === 'building_image' || type === 'interior_image') && upload.status === 'completed' && (
                            <button
                              onClick={() => handleSelectImage(upload.id)}
                              className={`p-1 rounded ${
                                upload.isSelected 
                                  ? 'text-yellow-500 bg-yellow-100' 
                                  : 'text-gray-400 hover:text-yellow-500'
                              }`}
                              title={upload.isSelected ? 'תמונה נבחרת' : 'בחר כתמונה ראשית'}
                            >
                              <Star className={`w-4 h-4 ${upload.isSelected ? 'fill-current' : ''}`} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleRemoveUpload(upload.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
        </div>

                        {/* Progress Bar */}
                        {upload.status === 'uploading' && (
                          <div className="w-full mt-2">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${upload.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {upload.status === 'error' && upload.error && (
                          <div className="w-full mt-2 text-xs text-red-600 truncate" title={upload.error}>
                            {upload.error}
                          </div>
                        )}
              </div>
            ))}
          </div>
        )}

                {/* Data Source Info */}
                {typeUploads.some(u => u.status === 'completed') && (
                  <div className="mt-4">
                    <DataSource 
                      source={type as any} 
                      details="נשלף אוטומטית מהמסמך"
                    />
                  </div>
                )}
            </div>
      </div>
    )
        })}
      </div>

      {/* Process Documents Section */}
      {uploads.some(u => u.status === 'completed') && (
        <div className="mt-8">
          {/* Show existing AI extraction info */}
          {existingAIExtraction && !isProcessing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6" dir="rtl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">נתונים כבר חולצו באמצעות AI</h3>
                    <p className="text-green-700 text-sm">
                      תאריך חילוץ: {new Date(existingAIExtraction.extraction_date).toLocaleString('he-IL')}
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      {Object.keys(existingAIExtraction.extracted_fields || {}).length} שדות חולצו
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReprocessConfirm(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  עבד מחדש
                </button>
              </div>
            </div>
          )}

          {/* Reprocess confirmation dialog */}
          {showReprocessConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
              <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">עיבוד מחדש של המסמכים?</h3>
                <p className="text-gray-700 text-sm mb-4">
                  בחר אילו מסמכים לעבד מחדש. נתונים ממסמכים שלא נבחרו יישמרו כפי שהם.
                </p>
                
                {/* Selective reprocess checkboxes */}
                <div className="space-y-3 mb-4 bg-gray-50 rounded-lg p-4">
                  {data.uploads?.some((u: any) => u.type === 'tabu') && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.tabu}
                        onChange={(e) => setSelectiveReprocess(prev => ({ ...prev, tabu: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">טאבו (לשכת רישום מקרקעין)</p>
                        <p className="text-xs text-gray-600">גוש, חלקה, בעלים, שטח רשום</p>
                      </div>
                    </label>
                  )}
                  
                  {data.uploads?.some((u: any) => u.type === 'permit') && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.permit}
                        onChange={(e) => setSelectiveReprocess(prev => ({ ...prev, permit: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">היתר בנייה</p>
                        <p className="text-xs text-gray-600">שנת בנייה, שימוש מותר, שטח בנוי</p>
                      </div>
                    </label>
                  )}
                  
                  {data.uploads?.some((u: any) => u.type === 'condo') && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.condo}
                        onChange={(e) => setSelectiveReprocess(prev => ({ ...prev, condo: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">תקנון בית משותף</p>
                        <p className="text-xs text-gray-600">קומות, יחידות, שטחים משותפים</p>
                      </div>
                    </label>
                  )}
                  
                  {data.uploads?.some((u: any) => u.type === 'building_image' || u.type === 'interior_image') && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.images}
                        onChange={(e) => setSelectiveReprocess(prev => ({ ...prev, images: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">תמונות</p>
                        <p className="text-xs text-gray-600">ניתוח חזית ופנים הנכס</p>
                      </div>
                    </label>
                  )}
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-xs">
                    💰 עלות משוערת: $0.50-2.00 למסמך נבחר
                  </p>
                  <p className="text-blue-800 text-xs mt-1">
                    ℹ️ נתונים ממסמכים שלא נבחרו יישמרו
                  </p>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowReprocessConfirm(false)
                      setSelectiveReprocess({ tabu: false, permit: false, condo: false, images: false })
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => {
                      const hasSelection = Object.values(selectiveReprocess).some(v => v)
                      if (!hasSelection) {
                        alert('אנא בחר לפחות מסמך אחד לעיבוד')
                        return
                      }
                      processDocuments(selectiveReprocess)
                      setSelectiveReprocess({ tabu: false, permit: false, condo: false, images: false })
                    }}
                    disabled={!Object.values(selectiveReprocess).some(v => v)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    עבד מחדש מסמכים נבחרים
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isProcessing && !existingAIExtraction && Object.keys(extractedData).length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900">עיבוד מסמכים נדרש</h3>
                    <p className="text-yellow-700 text-sm">
                      לחץ על "עבד מסמכים" כדי לחלץ נתונים מהמסמכים שהועלו באמצעות AI
                    </p>
                    <div className="mt-2 text-xs text-yellow-600">
                      <p> 💰 עלות משוערת: $0.50-2.00 למסמך</p>
                      {(() => {
                        const uploadedTypes = new Set(data.uploads?.map((upload: any) => upload.type) || [])
                        const processableTypes = []
                        if (uploadedTypes.has('tabu')) processableTypes.push('תעודת בעלות')
                        if (uploadedTypes.has('permit')) processableTypes.push('היתר בנייה')
                        if (uploadedTypes.has('condo')) processableTypes.push('תקנון בית משותף')
                        if (uploadedTypes.has('building_image') || uploadedTypes.has('interior_image')) processableTypes.push('תמונות')
                        
                        return processableTypes.length > 0 ? (
                          <p className="mt-1">📋 יועברו לעיבוד: {processableTypes.join(', ')}</p>
                        ) : (
                          <p className="mt-1 text-red-600">⚠️ לא נמצאו מסמכים רלוונטיים לעיבוד</p>
                        )
                      })()}
          </div>
        </div>
      </div>
                <button
                  onClick={() => processDocuments()}
                  disabled={!sessionId}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Loader2 className="w-4 h-4" />
                  עבד מסמכים
                </button>
              </div>
            </div>
          )}
          
          {/* Processing State - Enhanced Spinner */}
          {isProcessing && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-8 shadow-lg">
              <div className="text-center">
                {/* Animated Spinner */}
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-blue-900 mb-3">מעבד מסמכים עם AI...</h3>
                <p className="text-blue-800 text-base font-medium mb-6">
                  {processingStage || 'מנתח מסמכים ומחלץ נתונים באמצעות AI'}
                </p>
                
                {/* Enhanced Progress Bar */}
                <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden shadow-inner mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: `${Math.min(100, Math.max(0, processingProgress))}%` }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                  </div>
                </div>
                
                {/* Progress Percentage */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="text-2xl font-bold text-blue-700">
                    {Math.min(100, Math.max(0, Math.round(processingProgress)))}
                  </div>
                  <div className="text-sm text-blue-600">%</div>
                </div>
                
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/70 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">⏱️ זה עשוי לקחת מספר דקות</span>
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">💰 עלות: ~$0.50-2.00 למסמך</span>
                    </div>
                  </div>
                </div>
                
                {/* Tips */}
                <div className="mt-6 pt-6 border-t border-blue-200">
                  <p className="text-xs text-blue-600 italic">
                    💡 טיפ: תוכל להמשיך לעבוד על שומות אחרות בזמן שהעיבוד מתבצע
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Processing Complete Success */}
          {!isProcessing && Object.keys(extractedData).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900">עיבוד הושלם בהצלחה</h3>
                  <p className="text-green-700 text-xs">
                    הנתונים נחלצו מהמסמכים. ניתן לעבור לשלב הבא כדי לערוך ולאמת את הנתונים.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Validation Summary */}
      <div className="mt-8">
        {!validation() && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">
                יש להעלות את כל המסמכים הנדרשים
              </span>
          </div>
            <ul className="text-red-700 text-sm mt-2 space-y-1">
              {Object.entries(DOCUMENT_TYPES)
                .filter(([_, config]) => config.required)
                .filter(([type, _]) => {
                  if (type === 'building_image' || type === 'interior_image') {
                    return !getUploadsByType(type).some(u => u.status === 'completed')
                  }
                  return !getUploadsByType(type).some(u => u.status === 'completed')
                })
                .map(([type, config]) => (
                  <li key={type}>• {config.label}</li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}