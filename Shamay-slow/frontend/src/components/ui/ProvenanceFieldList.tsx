/**
 * Provenance Field List Component
 * Displays extracted fields with provenance information
 */

'use client'

import React, { useMemo } from 'react'
import { Edit3, Eye, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react'
import { ProvenanceRecord, BoundingBox } from '@/hooks/useProvenance'

interface FieldInfo {
  path: string
  label: string
  value: any
  provenance?: ProvenanceRecord[]
}

interface ProvenanceFieldListProps {
  fields: FieldInfo[]
  selectedFieldPath?: string | null
  selectedSourceIndex: Record<string, number>
  onFieldClick: (fieldPath: string, sourceIndex?: number) => void
  onSourceCycle: (fieldPath: string, direction: 1 | -1) => void
  onEditSource: (fieldPath: string) => void
  onFieldEdit?: (fieldPath: string, value: any) => void
}

export function ProvenanceFieldList({
  fields,
  selectedFieldPath,
  selectedSourceIndex,
  onFieldClick,
  onSourceCycle,
  onEditSource,
  onFieldEdit
}: ProvenanceFieldListProps) {
  
  const getStatusIcon = (field: FieldInfo) => {
    const provenance = field.provenance || []
    const hasSource = provenance.length > 0
    const activeProvenance = provenance.find(p => p.isActive) || provenance[0]
    const confidence = activeProvenance?.confidence || 0
    
    if (!hasSource) {
      return <XCircle className="w-4 h-4 text-red-600" />
    }
    if (confidence < 0.7) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    }
    return <CheckCircle className="w-4 h-4 text-green-600" />
  }

  const getStatusColor = (field: FieldInfo) => {
    const provenance = field.provenance || []
    const hasSource = provenance.length > 0
    const activeProvenance = provenance.find(p => p.isActive) || provenance[0]
    const confidence = activeProvenance?.confidence || 0
    
    if (!hasSource) {
      return 'border-red-200 bg-red-50'
    }
    if (confidence < 0.7) {
      return 'border-yellow-200 bg-yellow-50'
    }
    return 'border-green-200 bg-green-50'
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'לא נמצא'
    if (typeof value === 'boolean') return value ? 'כן' : 'לא'
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${value.length} פריטים` : 'אין פריטים'
      }
      return JSON.stringify(value)
    }
    return String(value)
  }

  const getSourceInfo = (field: FieldInfo) => {
    const provenance = field.provenance || []
    if (provenance.length === 0) return null
    
    const currentIndex = selectedSourceIndex[field.path] || 0
    const currentSource = provenance[currentIndex] || provenance[0]
    
    return {
      currentIndex,
      totalSources: provenance.length,
      source: currentSource,
      documentName: currentSource.documentName || 'מסמך לא ידוע',
      pageNumber: currentSource.pageNumber,
      confidence: currentSource.confidence,
      extractionMethod: currentSource.extractionMethod
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">שדות מחולצים</h3>
      
      <div className="flex-1 overflow-y-auto space-y-3">
        {fields.map((field) => {
          const isSelected = field.path === selectedFieldPath
          const sourceInfo = getSourceInfo(field)
          const provenance = field.provenance || []
          
          return (
            <div
              key={field.path}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : getStatusColor(field)
              }`}
              onClick={() => onFieldClick(field.path, selectedSourceIndex[field.path] || 0)}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(field)}
                  <span className="text-sm font-medium text-gray-900">{field.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {provenance.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {(selectedSourceIndex[field.path] || 0) + 1}/{provenance.length}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditSource(field.path)
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    title="ערוך מקור"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Field Value */}
              <div className="text-sm text-gray-700 mb-2 text-right" dir="ltr">
                {formatValue(field.value)}
              </div>
              
              {/* Source Information */}
              {sourceInfo ? (
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    {provenance.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSourceCycle(field.path, -1)
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          disabled={sourceInfo.currentIndex === 0}
                          title="מקור קודם"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSourceCycle(field.path, 1)
                          }}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          disabled={sourceInfo.currentIndex === provenance.length - 1}
                          title="מקור הבא"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{sourceInfo.documentName}</span>
                    </div>
                    <div className="text-gray-500">
                      עמוד {sourceInfo.pageNumber} • דיוק: {Math.round(sourceInfo.confidence * 100)}%
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-500">אין מקור</span>
              )}
            </div>
          )
        })}
        
        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>לא נמצאו שדות</p>
          </div>
        )}
      </div>
    </div>
  )
}

