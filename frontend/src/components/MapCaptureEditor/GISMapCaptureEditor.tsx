'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Camera, Edit3, Save, AlertCircle, CheckCircle } from 'lucide-react'
import AddressSearchPanel from './AddressSearchPanel'
import MapViewerIFrame from './MapViewerIFrame'
import ImageEditorModal from './ImageEditorModal'
import type {
  MapCaptureEditorProps,
  GISData,
  AddressData,
  CapturedImage,
  DrawingAnnotation,
  CropArea,
  CaptureStatus
} from './types'

/**
 * GISMapCaptureEditor - Main orchestrator component
 * 
 * Workflow:
 * 1. Search address → Updates Step 1 form + displays map
 * 2. Capture screenshot from iframe (client-side)
 * 3. Edit captured image (draw + crop)
 * 4. Save final image to app state
 */
const GISMapCaptureEditor: React.FC<MapCaptureEditorProps> = ({
  sessionId,
  initialAddress,
  initialGISData,
  onAddressUpdate,
  onImageEdited,
  onError
}) => {
  // === State Management ===
  const [gisData, setGisData] = useState<GISData | null>(initialGISData || null)
  const [currentAddress, setCurrentAddress] = useState<AddressData | null>(null)
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    isCapturing: false,
    method: null,
    error: null,
    progress: 0
  })
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null)

  const mapViewerRef = useRef<{ captureScreenshot: () => Promise<Blob | null> }>(null)

  // === Message Helper ===
  const showMessage = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }, [])

  // === 1. Address Search Handler ===
  const handleAddressSearch = useCallback(async (address: AddressData, gis: GISData) => {
    console.log('📍 Address search result:', address)
    
    // Update local state
    setCurrentAddress(address)
    setGisData(gis)
    
    // Update Step 1 form (override previous address)
    onAddressUpdate(address, gis)
    
    showMessage(`נמצא: ${address.normalized}`, 'success')
  }, [onAddressUpdate, showMessage])

  // === 2. Screenshot Capture Handler ===
  const handleCaptureScreenshot = useCallback(async () => {
    if (!gisData) {
      showMessage('נא לחפש כתובת תחילה', 'error')
      return
    }

    setCaptureStatus({
      isCapturing: true,
      method: 'iframe',
      error: null,
      progress: 0
    })

    try {
      console.log('📸 Starting iframe capture...')
      
      // Attempt client-side iframe capture
      const blob = await mapViewerRef.current?.captureScreenshot()
      
      if (!blob) {
        throw new Error('Failed to capture screenshot from iframe')
      }

      console.log('✅ Screenshot captured:', blob.size, 'bytes')

      // Convert to data URL for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()
        img.onload = () => {
          const captured: CapturedImage = {
            blob,
            dataUrl,
            width: img.width,
            height: img.height,
            capturedAt: new Date().toISOString()
          }
          
          setCapturedImage(captured)
          setCaptureStatus({
            isCapturing: false,
            method: 'iframe',
            error: null,
            progress: 100
          })
          
          // Auto-open editor
          setShowEditor(true)
          showMessage('צילום הושלם בהצלחה', 'success')
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(blob)

    } catch (error) {
      console.error('❌ Screenshot capture failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setCaptureStatus({
        isCapturing: false,
        method: null,
        error: errorMessage,
        progress: 0
      })
      
      showMessage(`שגיאה בצילום: ${errorMessage}`, 'error')
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [gisData, showMessage, onError])

  // === 3. Image Editor Save Handler ===
  const handleImageEdited = useCallback((
    editedBlob: Blob,
    annotations: DrawingAnnotation[],
    cropArea?: CropArea
  ) => {
    console.log('💾 Image edited:', {
      size: editedBlob.size,
      annotationsCount: annotations.length,
      hasCrop: !!cropArea
    })

    // Close editor
    setShowEditor(false)

    // Pass to parent component for upload/storage
    onImageEdited(editedBlob, annotations, cropArea)

    showMessage('התמונה נשמרה בהצלחה', 'success')
  }, [onImageEdited, showMessage])

  // === 4. Manual Upload Fallback ===
  const handleManualUpload = useCallback((file: File) => {
    console.log('📁 Manual upload:', file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const captured: CapturedImage = {
          blob: file,
          dataUrl,
          width: img.width,
          height: img.height,
          capturedAt: new Date().toISOString()
        }
        
        setCapturedImage(captured)
        setShowEditor(true)
        showMessage('קובץ הועלה בהצלחה', 'success')
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [showMessage])

  // === Render ===
  return (
    <div className="space-y-6">
      {/* Status Message Banner */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* 1. Address Search Panel */}
      <AddressSearchPanel
        sessionId={sessionId}
        initialAddress={initialAddress}
        initialStreet={initialAddress?.split(' ')[0]} // Extract street from address if available
        initialCity={initialAddress?.split(',').pop()?.trim()} // Extract city from address if available
        onAddressFound={handleAddressSearch}
        onError={(error) => {
          showMessage(error.message, 'error')
          if (onError) onError(error)
        }}
      />

      {/* 2. Map Viewer & Capture */}
      {gisData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">מפה</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCaptureScreenshot}
                disabled={captureStatus.isCapturing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Camera className="w-4 h-4" />
                {captureStatus.isCapturing ? 'מצלם...' : 'צלם מסך'}
              </button>
              
              {capturedImage && (
                <button
                  onClick={() => setShowEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  ערוך תמונה
                </button>
              )}
            </div>
          </div>

          {/* Map Viewer Component */}
          <MapViewerIFrame
            ref={mapViewerRef}
            gisData={gisData}
            sessionId={sessionId}
          />

          {/* Capture Progress */}
          {captureStatus.isCapturing && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-900">מצלם מפה...</span>
              </div>
            </div>
          )}

          {/* Capture Error with Fallback */}
          {captureStatus.error && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">
                  צילום אוטומטי נכשל
                </span>
              </div>
              <p className="text-sm text-yellow-800 mb-3">
                {captureStatus.error}
              </p>
              <label className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 cursor-pointer transition-colors inline-flex">
                <Camera className="w-4 h-4" />
                העלה תמונה ידנית
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleManualUpload(file)
                  }}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* 3. Image Editor Modal */}
      {showEditor && capturedImage && (
        <ImageEditorModal
          image={capturedImage}
          onSave={handleImageEdited}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}

export default GISMapCaptureEditor

