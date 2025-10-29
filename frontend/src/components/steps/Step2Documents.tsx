'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, Image, CheckCircle, AlertCircle, X, Eye, Star, Loader2, AlertTriangle } from 'lucide-react'
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
  isSelected?: boolean
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
    description: 'תמונות פנים הדירה (עד 3 תמונות)',
    icon: Image,
    color: 'blue',
    required: false
  }
}

export function Step2Documents({ data, updateData, onValidationChange, sessionId }: Step2DocumentsProps) {
  const [uploads, setUploads] = useState<DocumentUpload[]>([])
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
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
                
                // If file size is not in database, try to get it from the file
                if (fileSize === 0 && uploadPath) {
                  try {
                    const response = await fetch(upload.url)
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
                
                return {
                  id: upload.id,
                  file: file,
                  type: upload.type as any,
                  status: upload.status || 'completed' as const, // Use status from DB, fallback to 'completed'
                  progress: upload.status === 'processing' ? 50 : (upload.status === 'uploading' ? 25 : 100),
                  url: upload.url,
                  extractedData: upload.extractedData || {},
                  error: upload.error,
                  // Preserve original upload data (with fallbacks)
                  name: uploadName,
                  fileName: fileName,
                  path: uploadPath,
                  size: fileSize,
                  mimeType: mimeType,
                  uploadedAt: uploadDate
                }
              }))
              
              setUploads(sessionUploads)
              updateData({ uploads: sessionUploads })
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
      const apiCalls: Promise<any>[] = []
      const apiTypes: string[] = []
      
      if (uploadedTypes.has('tabu') && shouldProcess.tabu) {
        console.log('🏛️ Calling land registry analysis API')
        apiCalls.push(extractLandRegistryData())
        apiTypes.push('tabu')
      }
      
      if (uploadedTypes.has('permit') && shouldProcess.permit) {
        console.log('🏗️ Calling building permit analysis API')
        apiCalls.push(extractBuildingPermitData())
        apiTypes.push('permit')
      }
      
      if (uploadedTypes.has('condo') && shouldProcess.condo) {
        console.log('🏢 Calling shared building analysis API')
        apiCalls.push(extractSharedBuildingData())
        apiTypes.push('condo')
      }
      
      if ((uploadedTypes.has('building_image') || uploadedTypes.has('interior_image')) && shouldProcess.images) {
        console.log('📸 Calling image analysis API')
        apiCalls.push(extractImageAnalysisData())
        apiTypes.push('images')
      }
      
      // If no relevant documents selected for processing, show message
      if (apiCalls.length === 0) {
        console.log('⚠️ No documents selected for AI analysis')
        setIsProcessing(false)
        return
      }
      
      console.log(`🚀 Processing ${apiCalls.length} document types with AI...`)
      
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
      
      // Call only the relevant APIs
      const results = await Promise.allSettled(apiCalls)
      
      // Start with base data (from DB if selective, empty if full reprocess)
      const combinedData: any = { ...baseData }
      
      console.log('🔄 Starting with base data:', reprocessSelection ? 'FROM DATABASE (selective)' : 'EMPTY (full process)')
      console.log('🔄 Base data keys:', Object.keys(combinedData))
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`📦 Merging result ${index} (${apiTypes[index]}):`, result.value)
          Object.assign(combinedData, result.value)
        } else if (result.status === 'rejected') {
          console.error(`❌ API call ${index} (${apiTypes[index]}) failed:`, result.reason)
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
      
    } catch (error) {
      console.error('Error processing documents:', error)
    } finally {
      setIsProcessing(false)
      
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
            registrationOffice: data.registration_office || 'לא נמצא',
            gush: data.gush || 'לא נמצא',
            parcel: data.chelka || 'לא נמצא',
            ownershipType: data.ownership_type || 'לא נמצא',
            attachments: data.attachments_description || (Array.isArray(data.attachments) ? data.attachments.map((a: any) => a.description || a.type).join(', ') : data.attachments) || 'לא נמצא',
            balconyArea: data.balcony_area || 0,
            buildingNumber: data.building_number || '',
            registeredArea: data.registered_area || data.apartment_registered_area || 0,
            builtArea: data.registered_area || data.apartment_registered_area || 'לא נמצא',
            finishLevel: 'לא נמצא' // Not in tabu
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
      finishLevel: 'לא נמצא'
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
          // Return ALL fields from API - both structured and flat
          return {
            building_permit: data,
            // Flat fields for UI compatibility
            buildingYear: data.building_year || 'לא נמצא',
            buildingRights: data.permitted_usage || data.permitted_description || data.building_description || 'לא נמצא',
            permittedUse: data.permitted_usage || data.permitted_description || 'לא נמצא',
            builtArea: data.built_area || 'לא נמצא',
            buildingDescription: data.building_description || 'לא נמצא',
            buildingPermitNumber: data.permit_number || 'לא נמצא',
            buildingPermitDate: data.permit_date || 'לא נמצא',
            buildingFloors: data.building_floors || 'לא נמצא',
            buildingUnits: data.building_units || 'לא נמצא',
            buildingDetails: data.building_details || '',
            buildingType: 'לא מזוהה' // Not in permit
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
      builtArea: 'לא נמצא',
      buildingDescription: 'לא נמצא',
      buildingPermitNumber: 'לא נמצא',
      buildingPermitDate: 'לא נמצא',
      buildingFloors: 'לא נמצא',
      buildingUnits: 'לא נמצא',
      buildingDetails: '',
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
            sharedAreas: data.common_areas || 'לא נמצא',
            buildingDescription: data.building_description || 'לא נמצא',
            buildingFloors: data.building_floors || 'לא נמצא',
            buildingUnits: data.building_sub_plots_count || data.total_sub_plots || 'לא נמצא'
          }
        }
      }
    } catch (error) {
      console.error('Shared building extraction failed:', error)
    }
    
    return {
      shared_building: null,
      sharedAreas: 'לא נמצא',
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
      const maxFiles = Math.min(files.length, 3 - currentInteriorCount)
      if (maxFiles <= 0) {
        alert('ניתן להעלות עד 3 תמונות פנים בלבד')
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
        progress: 0
      }

      // Create preview for images immediately
      if ((type === 'building_image' || type === 'interior_image') && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setUploads(prev => prev.map(u => 
            u.id === uploadId ? { ...u, preview: base64 } : u
          ))
          
          // Update data immediately for building image (first one)
          if (type === 'building_image' && i === 0) {
            updateData({ selectedImagePreview: base64 })
          }
          
          // Handle interior images (up to 3)
          if (type === 'interior_image') {
            const currentInteriorImages = data.interiorImages || []
            if (currentInteriorImages.length < 3) {
              updateData({ 
                interiorImages: [...currentInteriorImages, base64]
              })
            }
          }
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

      // Generate file URL for document viewer
      const fileUrl = `/api/files/${sessionId}/${result.file?.fileName || upload.file.name}`
      
      // Use the complete upload entry from the API response if available
      const uploadEntry = result.uploadEntry || {}
      
      // Mark as completed with file URL and all metadata from API
      setUploads(prev => {
        const updated = prev.map(u => 
          u.id === upload.id ? { 
            ...u, 
            status: uploadEntry.status || 'completed' as const,
            url: uploadEntry.url || fileUrl,
            // Add all metadata from the API response
            name: uploadEntry.name || u.file.name,
            fileName: uploadEntry.fileName || u.file.name,
            path: uploadEntry.path || '',
            size: uploadEntry.size || u.file.size,
            mimeType: uploadEntry.mimeType || u.file.type,
            uploadedAt: uploadEntry.uploadedAt || new Date().toISOString(),
            extractedData: uploadEntry.extractedData || result.extractedData || { extracted: true }
          } : u
        )
        
        // Update image data after completion
        if (upload.type === 'building_image' || upload.type === 'interior_image') {
          updateImageData(updated)
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

  const updateImageData = (currentUploads?: DocumentUpload[]) => {
    const uploadsToUse = currentUploads || uploads
    const imageUploads = uploadsToUse.filter(u => (u.type === 'building_image' || u.type === 'interior_image') && u.status === 'completed')
    
    if (imageUploads.length === 0) return
    
    const imageData = imageUploads.map(u => ({
      name: u.file.name,
      preview: u.preview,
      isSelected: u.isSelected || false
    }))
    
    // Set first image as selected if none is selected
    const hasSelected = imageData.some(img => img.isSelected)
    if (!hasSelected && imageData.length > 0) {
      imageData[0].isSelected = true
      
      // Update uploads state to mark first BUILDING image as selected (not interior)
      setUploads(prev => prev.map(u => 
        u.type === 'building_image' && u.status === 'completed' && u.id === imageUploads[0].id
          ? { ...u, isSelected: true }
          : { ...u, isSelected: false }
      ))
    }
    
    // Find selected image - prioritize building_image type only
    const selectedImage = imageData.find(img => img.isSelected && img.type === 'building_image') 
                       || imageData.find(img => img.type === 'building_image')
    
    console.log('Updating image data:', { imageData, selectedImage, selectedImagePreview: selectedImage?.preview })
    
      updateData({
      propertyImages: imageData,
      selectedImagePreview: selectedImage?.preview || null
    })
  }

  const handleRemoveUpload = async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId)
    
    if (!upload) return
    
    console.log(`🗑️ Removing upload ${uploadId} (${upload.type})`)
    
    // Update local state first
    setUploads(prev => {
      const remaining = prev.filter(u => u.id !== uploadId)
      
      // Handle image types
      if (upload.type === 'building_image' || upload.type === 'interior_image') {
        const remainingImages = remaining.filter(u => (u.type === 'building_image' || u.type === 'interior_image') && u.status === 'completed')
        
        // Handle interior images - remove from interiorImages array
        if (upload.type === 'interior_image') {
          const remainingInteriorImages = remaining
            .filter(u => u.type === 'interior_image' && u.status === 'completed')
            .map(u => u.preview)
            .filter(Boolean)
          
          console.log('🖼️ Updating interior images:', {
            removed: upload.preview,
            remaining: remainingInteriorImages.length
          })
          
          updateData({ 
            interiorImages: remainingInteriorImages,
            propertyImages: remainingImages.map(u => ({
              name: u.file.name,
              preview: u.preview,
              isSelected: u.isSelected || false
            }))
          })
        } else if (upload.type === 'building_image') {
          // Handle building images - update selectedImagePreview
          const buildingImages = remainingImages.filter(u => u.type === 'building_image')
          const selectedBuildingImage = buildingImages.find(u => u.isSelected) || buildingImages[0]
          
          console.log('🏢 Updating building images:', {
            removed: upload.preview,
            remaining: buildingImages.length,
            newSelected: selectedBuildingImage?.preview
          })
          
          updateData({ 
            propertyImages: remainingImages.map(u => ({
              name: u.file.name,
              preview: u.preview,
              isSelected: u.isSelected || false
            })),
            selectedImagePreview: selectedBuildingImage?.preview || null
          })
        }
      }
      
      return remaining
    })
    
    // Delete from blob storage if it has a URL
    if (upload.url) {
      try {
        console.log(`🗑️ Deleting file from blob storage: ${upload.url}`)
        const response = await fetch(upload.url, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          console.log(`✅ File deleted from blob storage`)
        } else {
          console.warn(`⚠️ Could not delete file from blob storage (status: ${response.status})`)
        }
      } catch (error) {
        console.error(`❌ Error deleting file from blob storage:`, error)
      }
    }
  }

  const handleSelectImage = (uploadId: string) => {
    setUploads(prev => {
      const updated = prev.map(upload => ({
        ...upload,
        isSelected: upload.id === uploadId && (upload.type === 'building_image' || upload.type === 'interior_image')
      }))
      
      // Update data immediately - but only use building_image for document preview
      const imageUploads = updated.filter(u => (u.type === 'building_image' || u.type === 'interior_image') && u.status === 'completed')
      const buildingImages = updated.filter(u => u.type === 'building_image' && u.status === 'completed')
      const selectedBuildingImage = buildingImages.find(u => u.isSelected) || buildingImages[0]
      
      console.log('Selecting image:', { uploadId, selectedBuildingImage, preview: selectedBuildingImage?.preview })
      
      updateData({ 
        propertyImages: imageUploads.map(u => ({
          name: u.file.name,
          preview: u.preview,
          isSelected: u.isSelected || false
        })),
        selectedImagePreview: selectedBuildingImage?.preview || null
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
    onValidationChange(true)
    return true
  }, [onValidationChange])

  // Update validation when uploads change
  useEffect(() => {
    validation()
  }, [validation])

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
      const uploadsForDB = uploads.map(upload => ({
        id: upload.id,
        type: upload.type,
        name: upload.file?.name || (upload as any).name,
        fileName: (upload as any).fileName || upload.file?.name,
        path: (upload as any).path || '',
        size: (upload as any).size || upload.file?.size || 0,
        mimeType: (upload as any).mimeType || upload.file?.type,
        status: upload.status,
        error: upload.error, // Include error message if any
        url: (upload as any).url || upload.preview,
        uploadedAt: (upload as any).uploadedAt || new Date().toISOString(),
        extractedData: upload.extractedData
      }))
      
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          העלאת מסמכים
        </h2>
        <p className="text-gray-600 text-right">
          העלה את המסמכים הנדרשים לשומה. המערכת תעבד ותחלץ נתונים אוטומטית
        </p>
        </div>
        
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const Icon = config.icon
          const typeUploads = getUploadsByType(type)
          const isDragOver = dragOver === type
          const hasUploads = typeUploads.length > 0

          return (
            <div
              key={type}
          className={`
                border-2 border-dashed rounded-lg p-6 transition-all
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
                        className="flex items-center justify-between p-3 bg-white rounded border"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(upload.status)}
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
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
                          <div className="w-full mt-2 text-xs text-red-600">
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
          
          {/* Processing State */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">מעבד מסמכים...</h3>
                <p className="text-blue-700 text-sm">מנתח מסמכים ומחלץ נתונים באמצעות AI</p>
                <div className="mt-4 text-sm text-blue-600">
                  <p>⏱️ זה עשוי לקחת מספר דקות</p>
                  <p>💰 עלות: ~$0.50-2.00 למסמך</p>
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