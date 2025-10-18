'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { formatCurrency, formatNumber, roundToThousand } from '../../lib/utils/hebrew'

interface ComparableData {
  id: string
  address: string
  city: string
  rooms: number
  floor: number
  area: number
  price: number
  price_per_sqm: number
  sale_date: string
  include: boolean
}

interface Step4ComparableDataProps {
  data: ComparableData[]
  onDataChange: (data: ComparableData[]) => void
  onCalculationsChange: (calculations: any) => void
}

export function Step4ComparableData({ data, onDataChange, onCalculationsChange }: Step4ComparableDataProps) {
  const [localData, setLocalData] = useState<ComparableData[]>(data)
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null)

  // Live statistics calculation
  const stats = useMemo(() => {
    const includedData = localData.filter(item => item.include)
    
    if (includedData.length === 0) {
      return {
        count: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        stdev: 0,
        outliers: []
      }
    }

    const prices = includedData.map(item => item.price_per_sqm).sort((a, b) => a - b)
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const median = prices.length % 2 === 0 
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]
    
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    
    // Standard deviation
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length
    const stdev = Math.sqrt(variance)
    
    // Outliers (±3σ)
    const outliers = includedData.filter(item => 
      Math.abs(item.price_per_sqm - average) > 3 * stdev
    )

    return {
      count: includedData.length,
      average: Math.round(average),
      median: Math.round(median),
      min: Math.round(min),
      max: Math.round(max),
      stdev: Math.round(stdev),
      outliers
    }
  }, [localData])

  // Update parent when data changes
  useEffect(() => {
    onDataChange(localData)
    
    // Calculate final valuation
    if (stats.count >= 3) {
      const adjustedPrice = stats.average // Could add market adjustments here
      const equivalentArea = 85 // This should come from property data
      const finalValuation = roundToThousand(adjustedPrice * equivalentArea)
      
      onCalculationsChange({
        averagePricePerSqm: stats.average,
        adjustedPrice,
        finalValuation,
        equivalentArea
      })
    }
  }, [localData, stats, onDataChange, onCalculationsChange])

  const handleIncludeToggle = (id: string) => {
    setLocalData(prev => 
      prev.map(item => 
        item.id === id ? { ...item, include: !item.include } : item
      )
    )
  }

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    setLocalData(prev => 
      prev.map((item, index) => 
        index === rowIndex ? { ...item, [field]: value } : item
      )
    )
  }

  const handleRemoveRow = (id: string) => {
    setLocalData(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          נתוני השוואה ותחשיב
        </h2>
        <p className="text-gray-600 text-right">
          בחר ובדוק את נתוני העסקאות להשוואה. יש לבחור לפחות 3 עסקאות
        </p>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">עסקאות נבחרות</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.count}</div>
          <div className="text-sm text-blue-700">
            {stats.count < 3 ? 'יש לבחור לפחות 3' : 'מספיק לחישוב'}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">מחיר ממוצע</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(stats.average)}
          </div>
          <div className="text-sm text-green-700">למ"ר</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">טווח מחירים</span>
          </div>
          <div className="text-lg font-bold text-purple-900">
            {formatCurrency(stats.min)} - {formatCurrency(stats.max)}
          </div>
          <div className="text-sm text-purple-700">למ"ר</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-900">חריגים</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">{stats.outliers.length}</div>
          <div className="text-sm text-orange-700">עסקאות חריגות</div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">כתובת</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">חדרים</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">קומה</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">שטח (מ"ר)</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">מחיר (₪)</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">מחיר למ"ר</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">תאריך מכירה</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">כלול</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {localData.map((item, index) => (
                <ComparableDataRow
                  key={item.id}
                  item={item}
                  index={index}
                  isOutlier={stats.outliers.some(outlier => outlier.id === item.id)}
                  onIncludeToggle={handleIncludeToggle}
                  onCellEdit={handleCellEdit}
                  onRemove={handleRemoveRow}
                  editingCell={editingCell}
                  onEditingCellChange={setEditingCell}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Message */}
      {stats.count < 3 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">יש לבחור לפחות 3 עסקאות להשוואה</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface ComparableDataRowProps {
  item: ComparableData
  index: number
  isOutlier: boolean
  onIncludeToggle: (id: string) => void
  onCellEdit: (rowIndex: number, field: string, value: any) => void
  onRemove: (id: string) => void
  editingCell: { row: number; field: string } | null
  onEditingCellChange: (cell: { row: number; field: string } | null) => void
}

function ComparableDataRow({
  item,
  index,
  isOutlier,
  onIncludeToggle,
  onCellEdit,
  onRemove,
  editingCell,
  onEditingCellChange
}: ComparableDataRowProps) {
  const isEditing = editingCell?.row === index

  const handleCellClick = (field: string) => {
    onEditingCellChange({ row: index, field })
  }

  const handleCellSave = (field: string, value: any) => {
    onCellEdit(index, field, value)
    onEditingCellChange(null)
  }

  return (
    <tr className={`hover:bg-gray-50 ${isOutlier ? 'bg-red-50' : ''}`}>
      <td className="px-4 py-3 text-right text-sm">
        <div className="font-medium text-gray-900">{item.address}</div>
        <div className="text-gray-500">{item.city}</div>
      </td>
      
      <td className="px-4 py-3 text-center text-sm">
        {isEditing && editingCell?.field === 'rooms' ? (
          <EditableCell
            value={item.rooms}
            type="number"
            onSave={(value) => handleCellSave('rooms', parseInt(value))}
            onCancel={() => onEditingCellChange(null)}
          />
        ) : (
          <span 
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => handleCellClick('rooms')}
          >
            {item.rooms}
          </span>
        )}
      </td>
      
      <td className="px-4 py-3 text-center text-sm">
        {isEditing && editingCell?.field === 'floor' ? (
          <EditableCell
            value={item.floor}
            type="number"
            onSave={(value) => handleCellSave('floor', parseInt(value))}
            onCancel={() => onEditingCellChange(null)}
          />
        ) : (
          <span 
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => handleCellClick('floor')}
          >
            {item.floor}
          </span>
        )}
      </td>
      
      <td className="px-4 py-3 text-center text-sm">
        {isEditing && editingCell?.field === 'area' ? (
          <EditableCell
            value={item.area}
            type="number"
            onSave={(value) => handleCellSave('area', parseFloat(value))}
            onCancel={() => onEditingCellChange(null)}
          />
        ) : (
          <span 
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => handleCellClick('area')}
          >
            {item.area}
          </span>
        )}
      </td>
      
      <td className="px-4 py-3 text-center text-sm">
        {isEditing && editingCell?.field === 'price' ? (
          <EditableCell
            value={item.price}
            type="number"
            onSave={(value) => handleCellSave('price', parseInt(value))}
            onCancel={() => onEditingCellChange(null)}
          />
        ) : (
          <span 
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => handleCellClick('price')}
          >
            {formatCurrency(item.price)}
          </span>
        )}
      </td>
      
      <td className="px-4 py-3 text-center text-sm">
        <span className="font-medium">{formatCurrency(item.price_per_sqm)}</span>
        {isOutlier && (
          <div className="text-xs text-red-600 mt-1">חריג</div>
        )}
      </td>
      
      <td className="px-4 py-3 text-center text-sm text-gray-500">
        {item.sale_date}
      </td>
      
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onIncludeToggle(item.id)}
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center
            ${item.include 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-300 hover:border-green-400'
            }
          `}
        >
          {item.include && <CheckCircle className="w-4 h-4" />}
        </button>
      </td>
      
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onRemove(item.id)}
          className="text-red-600 hover:text-red-800 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

interface EditableCellProps {
  value: any
  type: string
  onSave: (value: string) => void
  onCancel: () => void
}

function EditableCell({ value, type, onSave, onCancel }: EditableCellProps) {
  const [editValue, setEditValue] = useState(value.toString())

  const handleSave = () => {
    onSave(editValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="flex gap-1">
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyPress={handleKeyPress}
        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
        autoFocus
      />
      <button
        onClick={handleSave}
        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
      >
        ✓
      </button>
      <button
        onClick={onCancel}
        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
      >
        ✕
      </button>
    </div>
  )
}
