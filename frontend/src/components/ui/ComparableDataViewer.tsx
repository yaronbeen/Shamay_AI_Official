'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Loader2, AlertCircle, CheckCircle, X, SlidersHorizontal } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import FinalAssetValuation from '../valuation/FinalAssetValuation'

interface ComparableDataViewerProps {
  data: ValuationData
  sessionId?: string
  onAnalysisComplete?: (analysis: any) => void
}

interface ComparableTransaction {
  id: number
  sale_day: string
  address: string
  street?: string
  house_number?: string
  city?: string
  block_of_land?: string
  rooms?: number
  floor?: number
  surface?: number
  year_of_constru?: number
  sale_value_nis?: number
  estimated_price_ils?: number
  price_per_sqm?: number
  asset_type?: string
}

interface FilterState {
  blockNumber: string
  surfaceMin: number
  surfaceMax: number
  yearMin: number
  yearMax: number
}

export default function ComparableDataViewer({ 
  data, 
  sessionId,
  onAnalysisComplete 
}: ComparableDataViewerProps) {
  // Generate storage key based on sessionId
  const storageKey = `comparable-data-${sessionId || 'default'}`
  
  // Helper to load persisted state
  const loadPersistedState = () => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      console.error('Failed to load persisted state:', err)
      return null
    }
  }

  // Initialize state from localStorage if available
  const persistedState = loadPersistedState()
  
  // State management
  const [transactions, setTransactions] = useState<ComparableTransaction[]>(
    persistedState?.transactions || []
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(persistedState?.selectedIds || [])
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(
    persistedState?.analysisResult || null
  )
  const [showSection52, setShowSection52] = useState(
    persistedState?.showSection52 || false
  )
  const [finalPricePerSqm, setFinalPricePerSqm] = useState<number | null>(
    persistedState?.finalPricePerSqm || null
  )
  
  // Pagination
  const [page, setPage] = useState(persistedState?.page || 0)
  const [pageSize] = useState(50)
  const [hasMore, setHasMore] = useState(persistedState?.hasMore || false)
  
  // Track if data was restored from storage
  const [wasRestored, setWasRestored] = useState(!!persistedState)
  
  // Hide restored message after a few seconds
  useEffect(() => {
    if (wasRestored) {
      const timer = setTimeout(() => setWasRestored(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [wasRestored])

  // Extract property data from ValuationData
  const propertyBlock = useMemo(() => {
    // Try to extract block number from land registry data
    const landRegistry = (data as any).landRegistry
    if (landRegistry?.gush) return String(landRegistry.gush)
    return ''
  }, [data])

  const propertyArea = useMemo(() => {
    // Try to extract area from measurement or permit
    const area = (data as any).area || (data as any).registered_area_sqm
    return area ? parseFloat(String(area)) : 0
  }, [data])

  const propertyYear = useMemo(() => {
    // Try to extract construction year from permit
    const year = (data as any).year_built || (data as any).construction_year
    return year ? parseInt(String(year), 10) : new Date().getFullYear()
  }, [data])

  // Filter state with defaults based on property data
  // Only 3 filters: גוש (Block), מ"ר (Surface), שנת בנייה (Year)
  const [filters, setFilters] = useState<FilterState>(
    persistedState?.filters || {
      blockNumber: propertyBlock,
      surfaceMin: Math.max(0, propertyArea - 15),
      surfaceMax: propertyArea + 15,
      yearMin: Math.max(1900, propertyYear - 10),
      yearMax: Math.min(new Date().getFullYear() + 5, propertyYear + 10)
    }
  )

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stateToSave = {
      transactions,
      selectedIds: Array.from(selectedIds),
      analysisResult,
      showSection52,
      finalPricePerSqm,
      page,
      hasMore,
      filters,
      timestamp: new Date().toISOString()
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
      console.log('💾 State persisted to localStorage')
    } catch (err) {
      console.error('Failed to persist state:', err)
    }
  }, [
    transactions,
    selectedIds,
    analysisResult,
    showSection52,
    finalPricePerSqm,
    page,
    hasMore,
    filters,
    storageKey
  ])

  // Debounced search function
  const searchTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize)
      })

      // Only 3 filters: גוש (Block), מ"ר (Surface), שנת בנייה (Year)
      if (filters.blockNumber) params.append('block_number', filters.blockNumber)
      if (filters.surfaceMin > 0) params.append('surface_min', String(filters.surfaceMin))
      if (filters.surfaceMax > 0) params.append('surface_max', String(filters.surfaceMax))
      if (filters.yearMin) params.append('year_min', String(filters.yearMin))
      if (filters.yearMax) params.append('year_max', String(filters.yearMax))

      console.log('🔍 Searching with params:', Object.fromEntries(params))

      const response = await fetch(`/api/asset-details/search?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        // Debug: Log first transaction to inspect data structure
        if (result.data && result.data.length > 0) {
          console.log('🔍 First transaction data:', result.data[0])
          console.log('💰 Price fields:', {
            estimated_price_ils: result.data[0].estimated_price_ils,
            sale_value_nis: result.data[0].sale_value_nis,
            price_per_sqm: result.data[0].price_per_sqm
          })
        }
        setTransactions(result.data || [])
        setHasMore(result.pagination?.hasMore || false)
        
        if (result.data.length === 0) {
          setError('לא נמצאו עסקאות בגוש זה. ניתן להרחיב את טווח השטח או שנת הבנייה.')
        }
      } else {
        setError(result.error || 'שגיאה בטעינת הנתונים')
      }
    } catch (err) {
      console.error('❌ Search failed:', err)
      setError('שגיאה בחיפוש עסקאות')
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, pageSize])

  // Debounce search (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTransactions()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTransactions])

  // Initial load based on property data
  useEffect(() => {
    if (propertyBlock) {
      setFilters(prev => ({ ...prev, blockNumber: propertyBlock }))
    }
  }, [propertyBlock])

  // Toggle selection
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

  // Select/deselect all
  const selectAll = () => {
    const allIds = transactions.map(t => t.id)
    setSelectedIds(new Set(allIds))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // Calculate median
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }

  // Analyze selected transactions
  const analyzeSelected = async () => {
    if (selectedIds.size === 0) {
      setError('נא לבחור לפחות עסקה אחת לניתוח')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/asset-details/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIds: Array.from(selectedIds),
          propertyArea
        })
      })

      const result = await response.json()

      if (result.success) {
        setAnalysisResult(result)
        setFinalPricePerSqm(result.averagePricePerSqm || result.medianPricePerSqm)

    if (onAnalysisComplete) {
          onAnalysisComplete(result)
        }
      } else {
        setError(result.error || 'שגיאה בניתוח הנתונים')
      }
    } catch (err) {
      console.error('❌ Analysis failed:', err)
      setError('שגיאה בניתוח העסקאות')
    } finally {
      setIsLoading(false)
    }
  }

  // Proceed to Section 5.2
  const proceedToSection52 = () => {
    if (!finalPricePerSqm) {
      setError('נא לבצע ניתוח תחילה')
      return
    }
    setShowSection52(true)
  }

  // Clear persisted state and reset
  const clearPersistedData = () => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(storageKey)
      console.log('🗑️ Persisted state cleared')
      
      // Reset all state to defaults
      setTransactions([])
      setSelectedIds(new Set())
      setAnalysisResult(null)
      setShowSection52(false)
      setFinalPricePerSqm(null)
      setPage(0)
      setHasMore(false)
      setFilters({
        blockNumber: propertyBlock,
        surfaceMin: Math.max(0, propertyArea - 15),
        surfaceMax: propertyArea + 15,
        yearMin: Math.max(1900, propertyYear - 10),
        yearMax: Math.min(new Date().getFullYear() + 5, propertyYear + 10)
      })
      setError(null)
      setWasRestored(false)
    } catch (err) {
      console.error('Failed to clear persisted state:', err)
    }
  }

  // Format price
  const formatPrice = (price: number | string | null | undefined): string => {
    // Handle null/undefined/empty string
    if (price === null || price === undefined || price === '') {
      console.debug('🔍 formatPrice: null/undefined/empty', price)
      return 'N/A'
    }
    
    // Convert string to number if needed (handles "0", "null", etc.)
    let numPrice: number
    if (typeof price === 'string') {
      const trimmed = price.trim()
      if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
        console.debug('🔍 formatPrice: invalid string', price)
        return 'N/A'
      }
      numPrice = parseFloat(trimmed)
    } else {
      numPrice = price
    }
    
    // Check if valid number
    if (!Number.isFinite(numPrice) || numPrice <= 0 || isNaN(numPrice)) {
      console.debug('🔍 formatPrice: invalid number', { price, numPrice, isFinite: Number.isFinite(numPrice) })
      return 'N/A'
    }
    
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numPrice)
  }

  // Format date
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A'
    try {
      return new Date(date).toLocaleDateString('he-IL')
    } catch {
      return date
    }
  }

  // Format parcel ID (block_of_land) from "006770-0049-014-00" to "6770/49"
  const formatParcelId = (parcelId: string | null | undefined): string => {
    if (!parcelId) return 'N/A'
    
    try {
      // Split by "-" to get parts: [006770, 0049, 014, 00]
      const parts = parcelId.split('-')
      if (parts.length < 2) return parcelId // Return original if format is unexpected
      
      // First part is block (gush): remove leading zeros
      const block = parseInt(parts[0], 10)
      // Second part is parcel (helka): remove leading zeros
      const parcel = parseInt(parts[1], 10)
      
      // Return formatted as "6770/49"
      if (isNaN(block) || isNaN(parcel)) return parcelId
      return `${block}/${parcel}`
    } catch {
      return parcelId
    }
  }

  // If showing Section 5.2, render that instead
  if (showSection52 && finalPricePerSqm) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setShowSection52(false)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← חזרה לנתוני השוואה
        </button>
        
        <FinalAssetValuation
          finalPricePerSqm={finalPricePerSqm}
          apartmentSqm={propertyArea}
          balconySqm={(data as any).balcony_area || 0}
          propertyDescription={(data as any).address || 'נכס נשוא השומה'}
          onValuationComplete={(valuation) => {
            console.log('✅ Section 5.2 complete:', valuation)
            if (onAnalysisComplete) {
              onAnalysisComplete({
                ...analysisResult,
                section52: valuation
              })
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          נתוני השוואה מהמאגר
      </h3>

        {(transactions.length > 0 || analysisResult) && (
            <button
            onClick={clearPersistedData}
            className="text-xs px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 flex items-center gap-1"
            title="אפס נתונים והתחל מחדש"
          >
            <X className="w-3 h-3" />
            התחל מחדש
            </button>
        )}
        </div>

      {/* Restored Data Indicator */}
      {wasRestored && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>הנתונים שוחזרו בהצלחה מהשמירה הקודמת</span>
          </div>
        )}

      {/* Filter Bar - Only 3 Filters: גוש, מ"ר, שנת בנייה */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filter 1: גוש (Block Number) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="text-red-600">*</span> גוש (חובה)
            </label>
            <input
              type="text"
              value={filters.blockNumber}
              onChange={(e) => setFilters(prev => ({ ...prev, blockNumber: e.target.value }))}
              placeholder="מספר גוש"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            </div>

          {/* Filter 2: מ"ר (Surface Area) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טווח שטח (מ"ר)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.surfaceMin}
                onChange={(e) => setFilters(prev => ({ ...prev, surfaceMin: parseFloat(e.target.value) || 0 }))}
                placeholder="מינימום"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.surfaceMax}
                onChange={(e) => setFilters(prev => ({ ...prev, surfaceMax: parseFloat(e.target.value) || 0 }))}
                placeholder="מקסימום"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
          </div>
      </div>

          {/* Filter 3: שנת בנייה (Construction Year) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טווח שנת בנייה
                </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.yearMin}
                onChange={(e) => setFilters(prev => ({ ...prev, yearMin: parseInt(e.target.value, 10) || 1900 }))}
                placeholder="מ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.yearMax}
                onChange={(e) => setFilters(prev => ({ ...prev, yearMax: parseInt(e.target.value, 10) || new Date().getFullYear() }))}
                placeholder="עד"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              </div>
              </div>
              </div>

        <div className="mt-3 text-xs text-gray-600">
          💡 המערכת תחפש עסקאות דומות בגוש, בטווח שטח ושנת בנייה שהוגדרו
              </div>
              </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
              </div>
                <button
            onClick={() => setError(null)}
            className="text-yellow-500 hover:text-yellow-700"
          >
            <X className="w-4 h-4" />
                </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="mr-2 text-sm text-gray-600">טוען עסקאות...</span>
            </div>
      )}

      {/* Results Table */}
      {!isLoading && transactions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">
              נמצאו {transactions.length} עסקאות{hasMore ? '+' : ''}
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
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-right">
                    <th className="p-2 w-12">בחירה</th>
                    <th className="p-2">יום מכירה</th>
                    <th className="p-2">כתובת</th>
                    <th className="p-2">גוש/חלקה</th>
                    <th className="p-2">חדרים</th>
                    <th className="p-2">קומה</th>
                    <th className="p-2">שטח (מ"ר)</th>
                    <th className="p-2">שנת בנייה</th>
                    <th className="p-2">מחיר (₪)</th>
                    <th className="p-2">מחיר למ"ר</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const isSelected = selectedIds.has(transaction.id)
                    return (
                      <tr
                        key={transaction.id}
                        className={`border-t cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleSelection(transaction.id)}
                      >
                        <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                            onChange={() => toggleSelection(transaction.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 cursor-pointer"
                            />
                        </td>
                        <td className="p-2">{formatDate(transaction.sale_day)}</td>
                        <td className="p-2">{transaction.address || 'N/A'}</td>
                        <td className="p-2">{formatParcelId(transaction.block_of_land)}</td>
                        <td className="p-2">{transaction.rooms || 'N/A'}</td>
                        <td className="p-2">{transaction.floor ?? 'N/A'}</td>
                        <td className="p-2">{transaction.surface ? Math.round(transaction.surface) : 'N/A'}</td>
                        <td className="p-2">{transaction.year_of_constru || 'N/A'}</td>
                        <td className="p-2 font-semibold">
                          {(() => {
                            const price = transaction.estimated_price_ils ?? transaction.sale_value_nis
                            // Debug: Log price value for troubleshooting
                            if (price !== null && price !== undefined && typeof price !== 'number') {
                              console.warn('⚠️ Price is not a number:', { 
                                id: transaction.id, 
                                price, 
                                type: typeof price,
                                estimated_price_ils: transaction.estimated_price_ils,
                                sale_value_nis: transaction.sale_value_nis
                              })
                            }
                            return formatPrice(price)
                          })()}
                                  </td>
                        <td className="p-2 text-green-700 font-medium">{formatPrice(transaction.price_per_sqm)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            נבחרו: {selectedIds.size} מתוך {transactions.length}
            </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && transactions.length > 0 && (
        <div className="flex gap-3 justify-end">
              <button
            onClick={analyzeSelected}
                disabled={selectedIds.size === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium ${
                  selectedIds.size === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
            נתח עסקאות נבחרות
              </button>

          {analysisResult && finalPricePerSqm && (
            <button
              onClick={proceedToSection52}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              אשר והמשך לעיבוד נתונים
            </button>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">
            תוצאות ניתוח ({analysisResult.totalComparables} עסקאות)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">מחיר ממוצע:</span>
              <div className="font-bold text-blue-900">{formatPrice(analysisResult.averagePrice)}</div>
              </div>
              <div>
                <span className="text-blue-700">מחיר חציוני:</span>
              <div className="font-bold text-blue-900">{formatPrice(analysisResult.medianPrice)}</div>
              </div>
              <div>
                <span className="text-blue-700">ממוצע למ"ר:</span>
              <div className="font-bold text-blue-900">{formatPrice(analysisResult.averagePricePerSqm)}</div>
              </div>
              <div>
                <span className="text-blue-700">חציון למ"ר:</span>
              <div className="font-bold text-blue-900">{formatPrice(analysisResult.medianPricePerSqm)}</div>
                </div>
              </div>
            {analysisResult.estimatedValue && (
            <div className="mt-4 pt-4 border-t border-blue-300 text-center">
              <span className="text-blue-700 text-sm block mb-1">הערכת שווי:</span>
              <div className="text-2xl font-bold text-blue-900">{formatPrice(analysisResult.estimatedValue)}</div>
                  {analysisResult.estimatedRange && (
                    <div className="text-xs text-blue-600 mt-1">
                      טווח: {formatPrice(analysisResult.estimatedRange.low)} - {formatPrice(analysisResult.estimatedRange.high)}
                    </div>
                  )}
              </div>
            )}
        </div>
      )}
    </div>
  )
}
