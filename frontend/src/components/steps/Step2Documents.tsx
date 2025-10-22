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
    color: 'green',
    required: false
  },
  condo: {
    label: 'צו בית משותף',
    description: 'צו בית משותף',
    icon: FileText,
    color: 'purple',
    required: false
  },
  planning: {
    label: 'מידע תכנוני',
    description: 'מידע תכנוני נוסף',
    icon: FileText,
    color: 'orange',
    required: false
  },
  building_image: {
    label: 'תמונת חזית הבניין',
    description: 'תמונת החזית/שער הכניסה (תוצג בראש הדוח)',
    icon: Image,
    color: 'indigo',
    required: false
  },
  interior_image: {
    label: 'תמונות פנים הדירה',
    description: 'תמונות פנים הדירה (עד 3 תמונות)',
    icon: Image,
    color: 'pink',
    required: false
  }
}

export function Step2Documents({ data, updateData, onValidationChange, sessionId }: Step2DocumentsProps) {
  const [uploads, setUploads] = useState<DocumentUpload[]>([])
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<any>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

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

  const getUploadsByType = (type: string) => {
    return uploads.filter(upload => upload.type === type)
  }

  // Process documents using AI services
  const processDocuments = async () => {
    if (!sessionId) return
    
    setIsProcessing(true)
    
    try {
      // Check which document types were uploaded
      const uploadedTypes = new Set(data.uploads?.map((upload: any) => upload.type) || [])
      console.log('📋 Uploaded document types:', Array.from(uploadedTypes))
      
      // Only call APIs for uploaded document types
      const apiCalls: Promise<any>[] = []
      
      if (uploadedTypes.has('tabu')) {
        console.log('🏛️ Calling land registry analysis API')
        apiCalls.push(extractLandRegistryData())
      }
      
      if (uploadedTypes.has('permit')) {
        console.log('🏗️ Calling building permit analysis API')
        apiCalls.push(extractBuildingPermitData())
      }
      
      if (uploadedTypes.has('condo')) {
        console.log('🏢 Calling shared building analysis API')
        apiCalls.push(extractSharedBuildingData())
      }
      
      if (uploadedTypes.has('building_image') || uploadedTypes.has('interior_image')) {
        console.log('📸 Calling image analysis API')
        apiCalls.push(extractImageAnalysisData())
      }
      
      // If no relevant documents uploaded, show message
      if (apiCalls.length === 0) {
        console.log('⚠️ No relevant documents found for AI analysis')
        setExtractedData({})
        updateData({ extractedData: {} })
        setIsProcessing(false)
        return
      }
      
      console.log(`🚀 Processing ${apiCalls.length} document types with AI...`)
      
      // Call only the relevant APIs
      const results = await Promise.allSettled(apiCalls)
      
      // Combine results
      const combinedData: any = {}
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          Object.assign(combinedData, result.value)
        }
      })
      
      setExtractedData(combinedData)
      
      // Update parent data - only update extractedData to avoid overwriting other data
      console.log('📊 About to update parent data with extracted data:', combinedData)
      updateData({
        extractedData: combinedData
      })
      console.log('📊 Updated parent data with extracted data:', combinedData)
      
      // Save extracted data to session
      if (sessionId) {
        try {
          const response = await fetch(`/api/session/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: {
                extractedData: combinedData
              }
            })
          })
          
          if (response.ok) {
            console.log('✅ Extracted data saved to session:', combinedData)
          } else {
            console.error('❌ Failed to save extracted data to session')
          }
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

  const extractBuildingPermitData = async (): Promise<any> => {
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

  const extractSharedBuildingData = async (): Promise<any> => {
    try {
      const response = await fetch(`/api/session/${sessionId}/shared-building-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        return {
          sharedAreas: result.common_areas || 'לא נמצא',
          buildingDescription: result.building_description || 'לא נמצא'
        }
      }
    } catch (error) {
      console.error('Shared building extraction failed:', error)
    }
    
    return {
      sharedAreas: 'לא נמצא',
      buildingDescription: 'לא נמצא'
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
      
      // Update uploads state to mark first image as selected
      setUploads(prev => prev.map(u => 
        (u.type === 'building_image' || u.type === 'interior_image') && u.status === 'completed' && u.id === imageUploads[0].id
          ? { ...u, isSelected: true }
          : { ...u, isSelected: false }
      ))
    }
    
    const selectedImage = imageData.find(img => img.isSelected)
    
    console.log('Updating image data:', { imageData, selectedImage, selectedImagePreview: selectedImage?.preview })
    
      updateData({
      propertyImages: imageData,
      selectedImagePreview: selectedImage?.preview || imageData[0]?.preview
    })
  }

  const handleRemoveUpload = async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId)
    
    // Delete from session if it has a session ID
    if (sessionId && upload) {
      try {
        console.log(`🗑️ Deleting upload ${uploadId} from session ${sessionId}`)
        const response = await fetch(`/api/session/${sessionId}/upload/${uploadId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          console.log(`✅ Upload ${uploadId} deleted from session`)
        } else {
          console.error(`❌ Failed to delete upload ${uploadId} from session`)
        }
      } catch (error) {
        console.error(`❌ Error deleting upload ${uploadId} from session:`, error)
      }
    }
    
    // Update local state
    setUploads(prev => {
      const remaining = prev.filter(u => u.id !== uploadId)
      
      if (upload?.type === 'building_image' || upload?.type === 'interior_image') {
        const remainingImages = remaining.filter(u => (u.type === 'building_image' || u.type === 'interior_image') && u.status === 'completed')
        const selectedImage = remainingImages.find(u => u.isSelected)
        
        updateData({ 
          propertyImages: remainingImages.map(u => ({
            name: u.file.name,
            preview: u.preview,
            isSelected: u.isSelected || false
          })),
          selectedImagePreview: selectedImage?.preview || remainingImages[0]?.preview
        })
      }
      return remaining
    })
  }

  const handleSelectImage = (uploadId: string) => {
    setUploads(prev => {
      const updated = prev.map(upload => ({
        ...upload,
        isSelected: upload.id === uploadId && (upload.type === 'building_image' || upload.type === 'interior_image')
      }))
      
      // Update data immediately
      const imageUploads = updated.filter(u => (u.type === 'building_image' || u.type === 'interior_image') && u.status === 'completed')
      const selectedImage = imageUploads.find(u => u.isSelected)
      
      console.log('Selecting image:', { uploadId, selectedImage, preview: selectedImage?.preview })
      
      updateData({ 
        propertyImages: imageUploads.map(u => ({
          name: u.file.name,
          preview: u.preview,
          isSelected: u.isSelected || false
        })),
        selectedImagePreview: selectedImage?.preview
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
    const requiredTypes = Object.entries(DOCUMENT_TYPES)
      .filter(([_, config]) => config.required)
      .map(([type]) => type)
    
    const uploadedTypes = uploads
      .filter(upload => upload.status === 'completed')
      .map(upload => upload.type)
    
    const hasAllRequired = requiredTypes.every(type => uploadedTypes.includes(type as any))
    onValidationChange(hasAllRequired)
    
    return hasAllRequired
  }, [uploads, onValidationChange])

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
        name: upload.name,
        fileName: upload.fileName,
        path: upload.path,
        size: upload.size,
        mimeType: upload.mimeType,
        status: upload.status,
        error: upload.error, // Include error message if any
        url: upload.url,
        uploadedAt: upload.uploadedAt,
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
          {!isProcessing && Object.keys(extractedData).length === 0 && (
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
                  onClick={processDocuments}
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

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h4 className="font-semibold mb-2">Debug Info:</h4>
        <p>Selected Image Preview: {data.selectedImagePreview ? 'Present' : 'Missing'}</p>
        <p>Property Images: {data.propertyImages?.length || 0}</p>
        <p>Uploads: {uploads.filter(u => u.type === 'building_image' || u.type === 'interior_image').length}</p>
        <p>Current Data: {JSON.stringify({ selectedImagePreview: data.selectedImagePreview, propertyImages: data.propertyImages }, null, 2)}</p>
      </div>

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