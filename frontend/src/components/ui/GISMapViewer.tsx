'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Image, CheckCircle, ExternalLink } from 'lucide-react'

// Screenshot types for document injection:
// - wideArea: Large environment map for Section 1.1
// - zoomedNoTazea: Close-up without תצ"א for Section 1.2 (left)
// - zoomedWithTazea: Close-up with תצ"א for Section 1.2 (right)
export type ScreenshotType = 'wideArea' | 'zoomedNoTazea' | 'zoomedWithTazea'

export interface GISScreenshots {
  wideArea?: string
  zoomedNoTazea?: string
  zoomedWithTazea?: string
  // Legacy fields for backward compatibility
  cropMode0?: string
  cropMode1?: string
}

interface GISMapViewerProps {
  sessionId?: string
  data?: any
  initialScreenshots?: GISScreenshots
  onScreenshotsUpdated?: (screenshots: GISScreenshots) => void
}

const screenshotTypeConfig: Record<ScreenshotType, {
  title: string
  description: string
  section: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  wideArea: {
    title: 'מפת סביבה',
    description: 'מפה רחבה של האזור - תוצג בסעיף 1.1',
    section: 'סעיף 1.1',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  zoomedNoTazea: {
    title: 'תשריט חלקות',
    description: 'תקריב עם גבולות חלקות - תוצג בסעיף 1.2 (שמאל)',
    section: 'סעיף 1.2',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  zoomedWithTazea: {
    title: 'תצ״א (תמונת אוויר)',
    description: 'תקריב עם תמונת לוויין - תוצג בסעיף 1.2 (ימין)',
    section: 'סעיף 1.2',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
}

export default function GISMapViewer({ sessionId, data, initialScreenshots, onScreenshotsUpdated }: GISMapViewerProps) {
  const [screenshots, setScreenshots] = useState<GISScreenshots>({})
  const [uploading, setUploading] = useState<ScreenshotType | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const fileInputRefs = {
    wideArea: useRef<HTMLInputElement>(null),
    zoomedNoTazea: useRef<HTMLInputElement>(null),
    zoomedWithTazea: useRef<HTMLInputElement>(null)
  }

  // Load initial screenshots
  useEffect(() => {
    if (initialScreenshots) {
      setScreenshots(initialScreenshots)
    }
  }, [initialScreenshots])

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  // Handle file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, screenshotType: ScreenshotType) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showMessage('נא להעלות קובץ תמונה בלבד', 'error')
      return
    }

    if (!sessionId) {
      showMessage('שגיאה: לא נמצא session ID', 'error')
      return
    }

    setUploading(screenshotType)
    showMessage(`מעלה ${screenshotTypeConfig[screenshotType].title}...`, 'info')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', `gis-screenshot-${screenshotType}`)

      const response = await fetch(`/api/session/${sessionId}/upload`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success && result.uploadEntry?.url) {
        // Create preview from file
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64Data = e.target?.result as string
          const updatedScreenshots = {
            ...screenshots,
            [screenshotType]: base64Data
          }
          setScreenshots(updatedScreenshots)
        }
        reader.readAsDataURL(file)

        // Save to session gisScreenshots
        await saveToSession(result.uploadEntry.url, screenshotType)

        // Notify parent
        if (onScreenshotsUpdated) {
          onScreenshotsUpdated({
            ...screenshots,
            [screenshotType]: result.uploadEntry.url
          })
        }

        showMessage(`${screenshotTypeConfig[screenshotType].title} הועלה בהצלחה!`, 'success')
      } else {
        showMessage(`שגיאה בהעלאה: ${result.error || 'Unknown error'}`, 'error')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      showMessage(`שגיאה בהעלאה: ${error.message}`, 'error')
    } finally {
      setUploading(null)
      event.target.value = ''
    }
  }

  // Save screenshot URL to session
  const saveToSession = async (url: string, screenshotType: ScreenshotType) => {
    if (!sessionId) return

    try {
      // Load current session data
      const loadResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'load_from_db',
          sessionId
        })
      })

      const loadResult = await loadResponse.json()
      const currentGisScreenshots = loadResult.valuationData?.gisScreenshots || {}

      // Update with new screenshot
      const updatedScreenshots = {
        ...currentGisScreenshots,
        [screenshotType]: url
      }

      // Save back
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_gis_data',
          sessionId,
          gisData: updatedScreenshots
        })
      })

      console.log(`✅ Saved ${screenshotType} to session:`, url)
    } catch (error) {
      console.error('Error saving to session:', error)
    }
  }

  // Handle delete
  const handleDelete = async (screenshotType: ScreenshotType) => {
    if (!confirm(`האם למחוק את ${screenshotTypeConfig[screenshotType].title}?`)) return

    try {
      if (sessionId) {
        await fetch(`/api/session/${sessionId}/gis-screenshot/delete?screenshotType=${screenshotType}`, {
          method: 'DELETE'
        })
      }

      const updatedScreenshots = { ...screenshots }
      delete updatedScreenshots[screenshotType]
      setScreenshots(updatedScreenshots)

      if (onScreenshotsUpdated) {
        onScreenshotsUpdated(updatedScreenshots)
      }

      showMessage(`${screenshotTypeConfig[screenshotType].title} נמחק`, 'success')
    } catch (error: any) {
      showMessage(`שגיאה במחיקה: ${error.message}`, 'error')
    }
  }

  const screenshotTypes: ScreenshotType[] = ['wideArea', 'zoomedNoTazea', 'zoomedWithTazea']
  const uploadedCount = screenshotTypes.filter(type => screenshots[type]).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🗺️ העלאת מפות GIS</h2>
        <p className="text-sm text-gray-600">
          העלו צילומי מסך ממפת GovMap לשילוב במסמך הסופי
        </p>
        <a
          href="https://www.govmap.gov.il/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="w-4 h-4" />
          פתח את GovMap
        </a>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-center ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
          message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
          'bg-blue-100 text-blue-800 border border-blue-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
          <span className="text-sm font-medium text-gray-700">
            {uploadedCount}/3 מפות הועלו
          </span>
          {uploadedCount === 3 && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {screenshotTypes.map((type) => {
          const config = screenshotTypeConfig[type]
          const hasImage = !!screenshots[type]
          const isUploading = uploading === type

          return (
            <div
              key={type}
              className={`rounded-lg border-2 p-4 transition-all ${
                hasImage
                  ? `${config.borderColor} ${config.bgColor}`
                  : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
            >
              {/* Card Header */}
              <div className="text-center mb-3">
                <h3 className={`font-semibold ${hasImage ? config.color : 'text-gray-700'}`}>
                  {config.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                  hasImage ? 'bg-white/50' : 'bg-gray-100'
                } text-gray-600`}>
                  {config.section}
                </span>
              </div>

              {/* Image Preview or Upload Area */}
              {hasImage ? (
                <div className="relative group">
                  <img
                    src={screenshots[type]}
                    alt={config.title}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <label className="p-2 bg-white rounded-full cursor-pointer hover:bg-gray-100">
                      <Upload className="w-5 h-5 text-gray-700" />
                      <input
                        ref={fileInputRefs[type]}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e, type)}
                      />
                    </label>
                    <button
                      onClick={() => handleDelete(type)}
                      className="p-2 bg-white rounded-full hover:bg-red-100"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-6 h-6 text-green-500 bg-white rounded-full" />
                  </div>
                </div>
              ) : (
                <label className={`block cursor-pointer ${isUploading ? 'pointer-events-none' : ''}`}>
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full mb-2" />
                        <span className="text-sm text-gray-500">מעלה...</span>
                      </div>
                    ) : (
                      <>
                        <Image className="w-10 h-10 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">לחץ להעלאת תמונה</span>
                        <span className="text-xs text-gray-400 mt-1">או גרור לכאן</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRefs[type]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e, type)}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-800 mb-2">📋 הוראות:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>פתחו את <a href="https://www.govmap.gov.il/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GovMap</a> בחלון נפרד</li>
          <li>חפשו את הכתובת הרצויה</li>
          <li>בחרו את התצוגה המתאימה (חלקות / תצ״א / סביבה)</li>
          <li>צלמו מסך (Ctrl+Shift+S או Print Screen)</li>
          <li>העלו את התמונה לתיבה המתאימה</li>
        </ol>
      </div>
    </div>
  )
}
