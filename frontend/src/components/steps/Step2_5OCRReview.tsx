'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, FileText, Eye, Edit3 } from 'lucide-react'
import { DataSource } from '../ui/DataSource'

interface OCRResult {
  field: string
  extractedValue: string
  confidence: number
  source: string
  pageNumber?: number
}

interface OCRReviewProps {
  tabuData: OCRResult[]
  permitData: OCRResult[]
  condoData: OCRResult[]
  onAccept: (field: string, value: string) => void
  onOverride: (field: string, value: string) => void
  onNext: () => void
}

export function Step2_5OCRReview({ 
  tabuData, 
  permitData, 
  condoData, 
  onAccept, 
  onOverride, 
  onNext 
}: OCRReviewProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [allAccepted, setAllAccepted] = useState(false)

  const allData = [...tabuData, ...permitData, ...condoData]

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="w-4 h-4" />
    if (confidence >= 0.7) return <AlertTriangle className="w-4 h-4" />
    return <XCircle className="w-4 h-4" />
  }

  const handleOverride = (field: string, value: string) => {
    setOverrides(prev => ({ ...prev, [field]: value }))
    onOverride(field, value)
  }

  const handleAccept = (field: string, value: string) => {
    setOverrides(prev => {
      const newOverrides = { ...prev }
      delete newOverrides[field]
      return newOverrides
    })
    onAccept(field, value)
  }

  useEffect(() => {
    setAllAccepted(allData.every(item => !overrides[item.field]))
  }, [allData, overrides])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          אישור נתוני OCR
        </h2>
        <p className="text-gray-600 text-right">
          בדוק ואשר את הנתונים שנשלפו מהמסמכים. ניתן לערוך ערכים בעלי רמת ביטחון נמוכה
        </p>
      </div>

      <div className="space-y-8">
        {/* Tabu Data */}
        {tabuData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">נתונים מנסח טאבו</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tabuData.map((item, index) => (
                <OCRFieldReview
                  key={index}
                  item={item}
                  onAccept={handleAccept}
                  onOverride={handleOverride}
                  isOverridden={!!overrides[item.field]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Building Permit Data */}
        {permitData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">נתונים מהיתר בניה</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permitData.map((item, index) => (
                <OCRFieldReview
                  key={index}
                  item={item}
                  onAccept={handleAccept}
                  onOverride={handleOverride}
                  isOverridden={!!overrides[item.field]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Condominium Data */}
        {condoData.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">נתונים מצו בית משותף</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {condoData.map((item, index) => (
                <OCRFieldReview
                  key={index}
                  item={item}
                  onAccept={handleAccept}
                  onOverride={handleOverride}
                  isOverridden={!!overrides[item.field]}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">סיכום אישור נתונים</h4>
            <p className="text-sm text-gray-600">
              {allData.length} שדות נסרקו • {Object.keys(overrides).length} ערכים שונו ידנית
            </p>
          </div>
          
          <button
            onClick={onNext}
            disabled={!allAccepted}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all
              ${
                allAccepted
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            המשך לשלב הבא
          </button>
        </div>
      </div>
    </div>
  )
}

interface OCRFieldReviewProps {
  item: OCRResult
  onAccept: (field: string, value: string) => void
  onOverride: (field: string, value: string) => void
  isOverridden: boolean
}

function OCRFieldReview({ item, onAccept, onOverride, isOverridden }: OCRFieldReviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.extractedValue)

  const handleSave = () => {
    onOverride(item.field, editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(item.extractedValue)
    setIsEditing(false)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{item.field}</span>
        <div className="flex items-center gap-2">
          {getConfidenceIcon(item.confidence)}
          <span className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
            {Math.round(item.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="mb-3">
        <DataSource source={item.source as any} details={item.pageNumber ? `עמוד ${item.pageNumber}` : undefined} />
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-right"
            dir="rtl"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              שמור
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-gray-50 p-3 rounded text-right">
            {isOverridden ? (
              <span className="text-blue-600 font-medium">{overrides[item.field]}</span>
            ) : (
              <span>{item.extractedValue}</span>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isOverridden && (
              <button
                onClick={() => onAccept(item.field, item.extractedValue)}
                className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
              >
                <CheckCircle className="w-3 h-3" />
                אשר
              </button>
            )}
            
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
            >
              <Edit3 className="w-3 h-3" />
              ערוך
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
