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
  address: string // From asset_details (street + house_number + city) OR settlement OR 'N/A'
  street?: string // From asset_details or 'N/A'
  house_number?: string // From asset_details or 'N/A'
  city?: string // From asset_details or settlement or 'N/A'
  settlement?: string // From properties table
  block_of_land?: string // From properties table
  rooms?: number // From properties table
  floor?: number // From properties table
  surface?: number // From properties table (square meters)
  year_of_constru?: number // From properties table (year_of_construction)
  sale_value_nis?: number // From properties table
  estimated_price_ils?: number // Alias for sale_value_nis
  price_per_sqm?: number // Calculated as sale_value_nis / surface
  asset_type?: string // From properties table
}

interface FilterState {
  blockNumber: string
  surfaceMin: number
  surfaceMax: number
  yearMin: number
  yearMax: number
  dateFrom: string // Sale date from (YYYY-MM-DD format)
  dateTo: string // Sale date to (YYYY-MM-DD format)
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
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(persistedState?.sortColumn || null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(persistedState?.sortDirection || 'desc')
  
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

  // Extract apartment and balcony areas separately (Section 5.2 calculation logic)
  const apartmentSqm = useMemo(() => {
    // Net apartment area (built area)
    return (data as any).builtArea || (data as any).area || (data as any).registered_area_sqm || 
           (data.extractedData as any)?.builtArea || (data.extractedData as any)?.apartment_registered_area || 0
  }, [data])
  
  const balconySqm = useMemo(() => {
    // Balcony area (if exists)
    return (data as any).balconyArea || (data as any).balcony_area || 
           (data.extractedData as any)?.balconyArea || (data.extractedData as any)?.balcony_area || 0
  }, [data])
  
  // Property area for backward compatibility (used in filters)
  const propertyArea = useMemo(() => {
    return apartmentSqm || 0
  }, [apartmentSqm])

  const propertyYear = useMemo(() => {
    // Try to extract construction year from permit or land registry
    const year = (data as any).year_built || (data as any).construction_year || (data as any).year_of_construction
    return year ? parseInt(String(year), 10) : new Date().getFullYear()
  }, [data])

  // Filter state with defaults based on property data
  // Filters: גוש (Block), מ"ר (Surface), שנת בנייה (Year), תאריך מכירה (Sale Date)
  const [filters, setFilters] = useState<FilterState>(
    persistedState?.filters || {
      blockNumber: propertyBlock,
      surfaceMin: Math.max(0, propertyArea - 15),
      surfaceMax: propertyArea + 15,
      yearMin: Math.max(1900, propertyYear - 10),
      yearMax: Math.min(new Date().getFullYear() + 5, propertyYear + 10),
      dateFrom: '', // No default - user can set if needed
      dateTo: '' // No default - user can set if needed
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
      sortColumn,
      sortDirection,
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
    sortColumn,
    sortDirection,
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

      // Filters: גוש (Block), מ"ר (Surface), שנת בנייה (Year), תאריך מכירה (Sale Date)
      if (filters.blockNumber) params.append('block_number', filters.blockNumber)
      if (filters.surfaceMin > 0) params.append('surface_min', String(filters.surfaceMin))
      if (filters.surfaceMax > 0) params.append('surface_max', String(filters.surfaceMax))
      if (filters.yearMin) params.append('year_min', String(filters.yearMin))
      if (filters.yearMax) params.append('year_max', String(filters.yearMax))
      if (filters.dateFrom) params.append('sale_date_from', filters.dateFrom)
      if (filters.dateTo) params.append('sale_date_to', filters.dateTo)

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
          propertyArea, // For backward compatibility
          apartmentSqm: apartmentSqm || null, // Net apartment area
          balconySqm: balconySqm || null, // Balcony area (if exists)
          balconyCoef: 0.5 // Default coefficient (can be changed in Section 5.2)
        })
      })

      const result = await response.json()

      if (result.success) {
        setAnalysisResult(result)
        // Parse numeric values safely (handles strings from backend)
        const avgPricePerSqm = typeof result.averagePricePerSqm === 'string' 
          ? parseFloat(result.averagePricePerSqm.trim()) 
          : (typeof result.averagePricePerSqm === 'number' ? result.averagePricePerSqm : null)
        const medPricePerSqm = typeof result.medianPricePerSqm === 'string'
          ? parseFloat(result.medianPricePerSqm.trim())
          : (typeof result.medianPricePerSqm === 'number' ? result.medianPricePerSqm : null)
        setFinalPricePerSqm(avgPricePerSqm || medPricePerSqm || null)
        
        // Parse estimatedValue (finalValue) safely
        const estimatedValue = typeof result.estimatedValue === 'string'
          ? parseFloat(result.estimatedValue.trim())
          : (typeof result.estimatedValue === 'number' ? result.estimatedValue : null)
        
        // Ensure estimatedValue is included in the result passed to parent
        const resultWithFinalValue = {
          ...result,
          estimatedValue: estimatedValue || result.estimatedValue || null,
          finalValue: estimatedValue || result.estimatedValue || null // Also include as finalValue for compatibility
        }

        if (onAnalysisComplete) {
          onAnalysisComplete(resultWithFinalValue)
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
        yearMax: Math.min(new Date().getFullYear() + 5, propertyYear + 10),
        dateFrom: '',
        dateTo: ''
      })
      setSortColumn(null)
      setSortDirection('desc')
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

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to descending
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sort transactions based on current sort state
  const sortedTransactions = useMemo(() => {
    if (!sortColumn) return transactions

    const sorted = [...transactions].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof ComparableTransaction]
      let bValue: any = b[sortColumn as keyof ComparableTransaction]

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      // Special handling for different column types
      switch (sortColumn) {
        case 'sale_day':
          // Sort by date
          const aDate = aValue ? new Date(aValue).getTime() : 0
          const bDate = bValue ? new Date(bValue).getTime() : 0
          return sortDirection === 'asc' ? aDate - bDate : bDate - aDate

        case 'price_per_sqm':
        case 'sale_value_nis':
        case 'estimated_price_ils':
        case 'surface':
        case 'rooms':
        case 'floor':
        case 'year_of_constru':
          // Sort by number
          const aNum = typeof aValue === 'string' ? parseFloat(aValue) || 0 : (aValue || 0)
          const bNum = typeof bValue === 'string' ? parseFloat(bValue) || 0 : (bValue || 0)
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum

        case 'address':
        case 'city':
        case 'settlement':
        case 'street':
        case 'asset_type':
        case 'block_of_land':
          // Sort by string (case-insensitive)
          const aStr = String(aValue || '').toLowerCase()
          const bStr = String(bValue || '').toLowerCase()
          if (sortDirection === 'asc') {
            return aStr.localeCompare(bStr, 'he')
          } else {
            return bStr.localeCompare(aStr, 'he')
          }

        default:
          // Default string comparison
          const aDefault = String(aValue || '').toLowerCase()
          const bDefault = String(bValue || '').toLowerCase()
          if (sortDirection === 'asc') {
            return aDefault.localeCompare(bDefault, 'he')
          } else {
            return bDefault.localeCompare(aDefault, 'he')
          }
      }
    })

    return sorted
  }, [transactions, sortColumn, sortDirection])

  // Render sort indicator icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400 text-xs">↕</span>
    }
    return sortDirection === 'asc' ? (
      <span className="text-blue-600 text-xs">↑</span>
    ) : (
      <span className="text-blue-600 text-xs">↓</span>
    )
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
              // Ensure estimatedValue/finalValue is preserved when section52 completes
              // Priority: section52.asset_value_nis > analysisResult.estimatedValue > analysisResult.finalValue
              const finalValue = valuation.asset_value_nis || analysisResult?.estimatedValue || analysisResult?.finalValue
              onAnalysisComplete({
                ...analysisResult,
                estimatedValue: finalValue,
                finalValue: finalValue, // Also include as finalValue for compatibility
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

      {/* Filter Bar - Filters: גוש, מ"ר, שנת בנייה, תאריך מכירה */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Filter 4: תאריך מכירה (Sale Date Range) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טווח תאריך מכירה
            </label>
            <div className="flex flex-col gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  מתאריך
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  עד תאריך
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
              </div>

        <div className="mt-3 text-xs text-gray-600">
          💡 המערכת תחפש עסקאות דומות בגוש, בטווח שטח, שנת בנייה ותאריך מכירה שהוגדרו
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
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('sale_day')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        יום מכירה
                        {renderSortIcon('sale_day')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('address')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        כתובת
                        {renderSortIcon('address')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('block_of_land')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        גוש/חלקה
                        {renderSortIcon('block_of_land')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('rooms')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        חדרים
                        {renderSortIcon('rooms')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('floor')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        קומה
                        {renderSortIcon('floor')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('surface')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        שטח (מ"ר)
                        {renderSortIcon('surface')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('year_of_constru')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        שנת בנייה
                        {renderSortIcon('year_of_constru')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('sale_value_nis')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        מחיר (₪)
                        {renderSortIcon('sale_value_nis')}
                      </div>
                    </th>
                    <th 
                      className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('price_per_sqm')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        מחיר למ"ר
                        {renderSortIcon('price_per_sqm')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => {
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
