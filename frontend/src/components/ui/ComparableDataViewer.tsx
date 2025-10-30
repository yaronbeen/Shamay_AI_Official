'use client'

import React, { useState, useEffect } from 'react'
import { Upload, BarChart3, Loader2, FileText, AlertCircle, CheckCircle, X, Check } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'

interface ComparableDataViewerProps {
  data: ValuationData
  sessionId?: string
  onAnalysisComplete?: (analysis: any) => void
}

interface ComparableRecord {
  id?: number
  address?: string
  rooms?: number
  floor_number?: string | number
  area?: number
  price?: number
  price_per_sqm?: number
  verified_price_per_sqm?: number
  sale_date?: string
  city?: string
  street_name?: string
  house_number?: string
  gush?: number
  chelka?: number
  sub_chelka?: number
}

interface AnalysisResult {
  success: boolean
  message?: string
  totalComparables: number
  averagePrice: number
  medianPrice: number
  averagePricePerSqm: number
  medianPricePerSqm: number
  estimatedValue?: number
  estimatedRange?: {
    low: number
    high: number
  }
  comparables: ComparableRecord[]
}

export default function ComparableDataViewer({ 
  data, 
  sessionId,
  onAnalysisComplete 
}: ComparableDataViewerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [allData, setAllData] = useState<ComparableRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)

  // Load persisted analysis on mount
  useEffect(() => {
    if (sessionId) {
      const storageKey = `comparable_analysis:${sessionId}`
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setAnalysisResult(parsed.analysis)
          setAllData(parsed.allData || [])
          setSelectedIds(new Set(parsed.selectedIds || []))
          console.log('✅ Restored comparable analysis from sessionStorage')
        } catch (err) {
          console.warn('Failed to restore analysis:', err)
        }
      }
    }
  }, [sessionId])

  // Load all data from database
  const loadAllData = async () => {
    setIsLoadingData(true)
    setUploadError(null)

    try {
      // Fetch all data without filters
      const response = await fetch('/api/comparable-data/search')
      const result = await response.json()
      
      if (result.success && result.data) {
        setAllData(result.data)
        setUploadSuccess(`נטענו ${result.data.length} רשומות מהמאגר`)
      } else {
        setUploadError('לא נמצאו נתונים במאגר')
      }
    } catch (error) {
      console.error('❌ Load data error:', error)
      setUploadError('שגיאה בטעינת הנתונים')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setUploadError('נא להעלות קובץ CSV בלבד')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append('csvFile', file)
      if (sessionId) {
        formData.append('userId', sessionId)
      }

      const response = await fetch('/api/comparable-data/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        let message = `הקובץ הועלה בהצלחה! ${result.successful} רשומות נוספו`
        if (result.failed > 0) {
          message += `, ${result.failed} רשומות נדחו (כפולות או שגיאות)`
        }
        setUploadSuccess(message)
        // Load all data after successful upload
        setTimeout(() => {
          loadAllData()
        }, 500)
      } else {
        setUploadError(result.error || 'העלאת הקובץ נכשלה')
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      setUploadError('שגיאה בהעלאת הקובץ')
    } finally {
      setIsUploading(false)
      if (fileInputRef) {
        fileInputRef.value = ''
      }
    }
  }

  // Toggle row selection
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Select/Deselect all
  const selectAll = () => {
    setSelectedIds(new Set(allData.filter(d => d.id).map(d => d.id!)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // Calculate median
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  // Analyze selected data (local calculation, no API)
  const analyzeSelectedData = () => {
    setAnalysisResult(null)
    
    const selectedData = allData.filter(d => d.id && selectedIds.has(d.id))
    
    if (selectedData.length === 0) {
      setUploadError('נא לבחור לפחות רשומה אחת לניתוח')
      return
    }

    console.log('📊 Selected data for analysis:', selectedData)
    console.log('📊 Sample row:', selectedData[0])

    // Extract prices
    const prices = selectedData
      .map(d => d.price)
      .filter((p): p is number => p !== null && p !== undefined && p > 0)

    console.log('📊 Extracted prices:', prices)

    // Extract prices per sqm
    const pricesPerSqm = selectedData
      .map(d => d.verified_price_per_sqm)
      .filter((p): p is number => p !== null && p !== undefined && p > 0)

    console.log('📊 Extracted pricesPerSqm:', pricesPerSqm)

    const analysis: AnalysisResult = {
      success: true,
      totalComparables: selectedData.length,
      averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : 0,
      medianPrice: calculateMedian(prices),
      averagePricePerSqm: pricesPerSqm.length > 0 ? pricesPerSqm.reduce((a, b) => a + b) / pricesPerSqm.length : 0,
      medianPricePerSqm: calculateMedian(pricesPerSqm),
      comparables: selectedData
    }

    // Estimate value if property area is provided
    if (data.area && analysis.averagePricePerSqm > 0) {
      analysis.estimatedValue = Math.round(analysis.averagePricePerSqm * data.area)
      analysis.estimatedRange = {
        low: Math.round(analysis.estimatedValue * 0.9),
        high: Math.round(analysis.estimatedValue * 1.1)
      }
    }

    setAnalysisResult(analysis)
    
    // Persist to sessionStorage
    if (sessionId) {
      const storageKey = `comparable_analysis:${sessionId}`
      sessionStorage.setItem(storageKey, JSON.stringify({
        analysis,
        allData,
        selectedIds: Array.from(selectedIds),
        timestamp: new Date().toISOString()
      }))
      console.log('✅ Saved comparable analysis to sessionStorage')
      
      // Also save to database
      fetch('/api/comparable-data/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          propertyData: { area: data.area },
          sessionId
        })
      }).catch(err => console.error('Failed to save analysis:', err))
    }

    if (onAnalysisComplete) {
      onAnalysisComplete(analysis)
    }
  }

  const formatPrice = (price: number | null | undefined): string => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        נתוני השוואה
      </h3>

      {/* Upload Section */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium mb-2">העלה קובץ CSV</h4>
          <p className="text-gray-600 mb-4 text-sm">
            העלה קובץ CSV עם נתוני מכירות להשוואה
            <br />
            <span className="text-xs text-gray-500">
              פורמט צפוי: יום מכירה, כתובת, גו"ח, חדרים, קומה, שטח דירה במ"ר, מחיר מוצהר, מחיר למ"ר
            </span>
          </p>
          <div className="flex gap-3 justify-center">
            <input
              ref={(ref) => setFileInputRef(ref)}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="csv-upload-input"
            />
            <label
              htmlFor="csv-upload-input"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                isUploading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  העלה CSV
                </>
              )}
            </label>
            <button
              onClick={loadAllData}
              disabled={isLoadingData}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                isLoadingData
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isLoadingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  טוען...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  טען נתונים קיימים
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{uploadSuccess}</span>
            </div>
            <button
              onClick={() => setUploadSuccess(null)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Data Table with Selection */}
      {allData.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">
              כל הנתונים ({allData.length} רשומות)
            </h4>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                בחר הכל
              </button>
              <button
                onClick={deselectAll}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                בטל הכל
              </button>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr className="text-right">
                    <th className="p-2 w-10"></th>
                    <th className="p-2">כתובת</th>
                    <th className="p-2">חדרים</th>
                    <th className="p-2">שטח (מ"ר)</th>
                    <th className="p-2">קומה</th>
                    <th className="p-2">מחיר</th>
                    <th className="p-2">מחיר למ"ר</th>
                  </tr>
                </thead>
                <tbody>
                  {allData.map((record) => {
                    if (!record.id) return null
                    const isSelected = selectedIds.has(record.id)
                    return (
                      <tr
                        key={record.id}
                        className={`border-t cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleSelection(record.id!)}
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(record.id!)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-2" dir="rtl">{record.address || 'N/A'}</td>
                        <td className="p-2">{record.rooms || 'N/A'}</td>
                        <td className="p-2">{record.area || 'N/A'}</td>
                        <td className="p-2">{record.floor_number ?? 'N/A'}</td>
                        <td className="p-2 font-semibold">{formatPrice(record.price)}</td>
                        <td className="p-2 text-gray-600">{formatPrice(record.verified_price_per_sqm)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              נבחרו: {selectedIds.size} מתוך {allData.length}
            </div>
            <button
              onClick={analyzeSelectedData}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                selectedIds.size === 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              נתח נתונים נבחרים
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mt-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">
              תוצאות ניתוח ({analysisResult.totalComparables} נכסים)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">מחיר ממוצע:</span>
                <div className="font-bold text-blue-900">
                  {formatPrice(analysisResult.averagePrice)}
                </div>
              </div>
              <div>
                <span className="text-blue-700">מחיר חציוני:</span>
                <div className="font-bold text-blue-900">
                  {formatPrice(analysisResult.medianPrice)}
                </div>
              </div>
              <div>
                <span className="text-blue-700">ממוצע למ"ר:</span>
                <div className="font-bold text-blue-900">
                  {formatPrice(analysisResult.averagePricePerSqm)}
                </div>
              </div>
              <div>
                <span className="text-blue-700">חציון למ"ר:</span>
                <div className="font-bold text-blue-900">
                  {formatPrice(analysisResult.medianPricePerSqm)}
                </div>
              </div>
            </div>
            {analysisResult.totalComparables && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                <div className="text-sm text-blue-700">
                  <strong>מגמת שוק:</strong> {(analysisResult as any).market_trends || 'יציב'}
                </div>
                {(analysisResult as any).price_range && (
                  <div className="text-xs text-blue-600 mt-1">
                    טווח מחירים: {formatPrice((analysisResult as any).price_range.min)} - {formatPrice((analysisResult as any).price_range.max)}
                  </div>
                )}
              </div>
            )}
            {analysisResult.estimatedValue && (
              <div className="mt-4 pt-4 border-t border-blue-300">
                <div className="text-center">
                  <span className="text-blue-700 text-sm block mb-1">הערכת שווי הנכס שלך:</span>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatPrice(analysisResult.estimatedValue)}
                  </div>
                  {analysisResult.estimatedRange && (
                    <div className="text-xs text-blue-600 mt-1">
                      טווח: {formatPrice(analysisResult.estimatedRange.low)} - {formatPrice(analysisResult.estimatedRange.high)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

