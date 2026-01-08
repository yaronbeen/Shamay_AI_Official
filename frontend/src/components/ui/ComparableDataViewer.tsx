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
  // NEW FIELDS from asset_details (25 additional fields)
  entrance?: number // כניסה
  apartment_number?: number // דירה
  arnona_area_sqm?: number // שטח ברוטו (ארנונה)
  registered_area_sqm?: number // שטח נטו (רשום)
  shares?: string // חלק מהמקרקעין
  plot?: number // מגרש (1/0)
  roof?: number // גג (1/0)
  storage?: number // מחסן (1/0)
  yard?: number // חצר (1/0)
  gallery?: number // גלריה (1/0)
  parking_spaces?: number // חניות
  elevator?: string // מעליות
  total_floors?: number // מספר קומות
  apartments_in_building?: number // דירות בבנין
  building_function?: string // תפקוד בנין
  unit_function?: string // תפקוד יחידה
  transaction_type?: string // סוג עסקה
  declared_price_ils?: number // מחיר מוצהר
  declared_price_usd?: number // מחיר מוצהר בדולר
  estimated_price_usd?: number // מחיר מוערך בדולר
  price_per_room?: number // מחיר לחדר
  rights?: string // מהות הזכות
  zoning_plan?: string // תב"ע
}

interface FilterState {
  // Search type
  searchType: 'block' | 'blockRange' | 'street' | 'city'

  // Block search (existing + enhanced)
  blockNumber: string
  blockNumbers: string[] // Array for multiple blocks
  blockRangeFrom: string
  blockRangeTo: string

  // Street/City search (new)
  streetName: string
  cityName: string

  // Parcel range (new)
  parcelFrom: string
  parcelTo: string

  // Sale value range (new)
  saleValueMin: number | null
  saleValueMax: number | null

  // Sale date preset (new)
  saleDatePreset: 'all' | 'lastYear' | 'last2Years' | 'last5Years' | 'custom'

  // Property type (new)
  propertyType: string // 'all' or specific type

  // Rooms (new)
  rooms: string // 'all' or specific number

  // Existing fields
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

  // Extract property data from ValuationData - try multiple sources
  const propertyBlock = useMemo(() => {
    // Try multiple sources for gush (block number)
    // 1. Direct from data.gush
    if (data.gush) return String(data.gush).trim()
    
    // 2. From extractedData
    const extractedData = (data as any).extractedData
    if (extractedData?.gush) return String(extractedData.gush).trim()
    
    // 3. From land registry object
    const landRegistry = (data as any).landRegistry
    if (landRegistry?.gush) return String(landRegistry.gush).trim()
    
    // 4. From land_registry nested object
    const landRegistryNested = (data as any).land_registry
    if (landRegistryNested?.gush) return String(landRegistryNested.gush).trim()
    
    return ''
  }, [data])
  
  // Extract parcel (chelka) from ValuationData - try multiple sources
  const propertyParcel = useMemo(() => {
    // Try multiple sources for parcel (chelka)
    // 1. Direct from data.parcel
    if (data.parcel) return String(data.parcel).trim()
    
    // 2. From extractedData
    const extractedData = (data as any).extractedData
    if (extractedData?.parcel) return String(extractedData.parcel).trim()
    if (extractedData?.chelka) return String(extractedData.chelka).trim()
    
    // 3. From land registry object
    const landRegistry = (data as any).landRegistry
    if (landRegistry?.parcel) return String(landRegistry.parcel).trim()
    if (landRegistry?.chelka) return String(landRegistry.chelka).trim()
    
    // 4. From land_registry nested object
    const landRegistryNested = (data as any).land_registry
    if (landRegistryNested?.parcel) return String(landRegistryNested.parcel).trim()
    if (landRegistryNested?.chelka) return String(landRegistryNested.chelka).trim()
    
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
  const [filters, setFilters] = useState<FilterState>(
    persistedState?.filters || {
      // Search type
      searchType: 'block',

      // Block search
      blockNumber: propertyBlock,
      blockNumbers: [],
      blockRangeFrom: '',
      blockRangeTo: '',

      // Street/City search
      streetName: '',
      cityName: '',

      // Parcel range
      parcelFrom: '',
      parcelTo: '',

      // Sale value range
      saleValueMin: null,
      saleValueMax: null,

      // Sale date preset
      saleDatePreset: 'all',

      // Property type and rooms
      propertyType: 'all',
      rooms: 'all',

      // Existing fields
      surfaceMin: Math.max(0, propertyArea - 15),
      surfaceMax: propertyArea + 15,
      yearMin: Math.max(1900, propertyYear - 10),
      yearMax: Math.min(new Date().getFullYear() + 5, propertyYear + 10),
      dateFrom: '',
      dateTo: ''
    }
  )

  // State for property types (loaded from API)
  const [propertyTypes, setPropertyTypes] = useState<string[]>([])

  // Load property types on mount
  useEffect(() => {
    const loadPropertyTypes = async () => {
      try {
        const response = await fetch('/api/asset-details/property-types')
        const result = await response.json()
        if (result.success) {
          setPropertyTypes(result.types || [])
        }
      } catch (err) {
        console.error('Failed to load property types:', err)
      }
    }
    loadPropertyTypes()
  }, [])

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

  // Helper to calculate date range based on preset
  const getDateRangeFromPreset = (preset: string): { from: string; to: string } => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    switch (preset) {
      case 'lastYear': {
        const yearAgo = new Date(today)
        yearAgo.setFullYear(today.getFullYear() - 1)
        return { from: formatDate(yearAgo), to: formatDate(today) }
      }
      case 'last2Years': {
        const twoYearsAgo = new Date(today)
        twoYearsAgo.setFullYear(today.getFullYear() - 2)
        return { from: formatDate(twoYearsAgo), to: formatDate(today) }
      }
      case 'last5Years': {
        const fiveYearsAgo = new Date(today)
        fiveYearsAgo.setFullYear(today.getFullYear() - 5)
        return { from: formatDate(fiveYearsAgo), to: formatDate(today) }
      }
      default:
        return { from: '', to: '' }
    }
  }

  // Debounced search function
  const searchTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize)
      })

      // Primary search filters based on search type
      switch (filters.searchType) {
        case 'block':
          if (filters.blockNumber) params.append('block_number', filters.blockNumber)
          break
        case 'blockRange':
          if (filters.blockRangeFrom) params.append('block_range_from', filters.blockRangeFrom)
          if (filters.blockRangeTo) params.append('block_range_to', filters.blockRangeTo)
          break
        case 'street':
          if (filters.streetName) params.append('street', filters.streetName)
          break
        case 'city':
          if (filters.cityName) params.append('city', filters.cityName)
          break
      }

      // Multiple block numbers (for chips)
      if (filters.blockNumbers && filters.blockNumbers.length > 0) {
        params.append('block_numbers', filters.blockNumbers.join(','))
      }

      // Surface area range
      if (filters.surfaceMin > 0) params.append('surface_min', String(filters.surfaceMin))
      if (filters.surfaceMax > 0) params.append('surface_max', String(filters.surfaceMax))

      // Construction year range
      if (filters.yearMin) params.append('year_min', String(filters.yearMin))
      if (filters.yearMax) params.append('year_max', String(filters.yearMax))

      // Sale date - use preset or custom dates
      if (filters.saleDatePreset !== 'all' && filters.saleDatePreset !== 'custom') {
        const { from, to } = getDateRangeFromPreset(filters.saleDatePreset)
        if (from) params.append('sale_date_from', from)
        if (to) params.append('sale_date_to', to)
      } else if (filters.saleDatePreset === 'custom') {
        if (filters.dateFrom) params.append('sale_date_from', filters.dateFrom)
        if (filters.dateTo) params.append('sale_date_to', filters.dateTo)
      }

      // Sale value range
      if (filters.saleValueMin !== null && filters.saleValueMin > 0) {
        params.append('sale_value_min', String(filters.saleValueMin))
      }
      if (filters.saleValueMax !== null && filters.saleValueMax > 0) {
        params.append('sale_value_max', String(filters.saleValueMax))
      }

      // Property type
      if (filters.propertyType && filters.propertyType !== 'all') {
        params.append('asset_type', filters.propertyType)
      }

      // Rooms
      if (filters.rooms && filters.rooms !== 'all') {
        params.append('rooms', filters.rooms)
      }

      // Parcel range
      if (filters.parcelFrom) params.append('parcel_from', filters.parcelFrom)
      if (filters.parcelTo) params.append('parcel_to', filters.parcelTo)

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

  // Initial load based on property data - update filters when data changes
  useEffect(() => {
    if (propertyBlock) {
      setFilters(prev => {
        // Only update if the block number is different and not empty
        if (prev.blockNumber !== propertyBlock && propertyBlock.trim() !== '') {
          return { ...prev, blockNumber: propertyBlock }
        }
        return prev
      })
    }
  }, [propertyBlock])
  
  // Also update when component mounts or data changes significantly
  useEffect(() => {
    // If filters are empty and we have data, populate them
    if (!filters.blockNumber && propertyBlock) {
      setFilters(prev => ({ ...prev, blockNumber: propertyBlock }))
    }
  }, []) // Run once on mount

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
        searchType: 'block',
        blockNumber: propertyBlock,
        blockNumbers: [],
        blockRangeFrom: '',
        blockRangeTo: '',
        streetName: '',
        cityName: '',
        parcelFrom: '',
        parcelTo: '',
        saleValueMin: null,
        saleValueMax: null,
        saleDatePreset: 'all',
        propertyType: 'all',
        rooms: 'all',
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

  // Format sub-chelka from block_of_land "006770-0049-014-00" -> "14"
  const formatSubChelka = (parcelId: string | null | undefined): string => {
    if (!parcelId) return '-'
    try {
      const parts = parcelId.split('-')
      if (parts.length < 3) return '-'
      const subChelka = parseInt(parts[2], 10)
      return isNaN(subChelka) || subChelka === 0 ? '-' : String(subChelka)
    } catch {
      return '-'
    }
  }

  // Format boolean fields (1/0 or true/false) to כן/לא
  const formatBoolean = (value: number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return value === 1 || value === true ? 'כן' : 'לא'
  }

  // Format USD price
  const formatPriceUSD = (price: number | string | null | undefined): string => {
    if (price === null || price === undefined || price === '') return '-'
    let numPrice: number
    if (typeof price === 'string') {
      const trimmed = price.trim()
      if (trimmed === '' || trimmed.toLowerCase() === 'null') return '-'
      numPrice = parseFloat(trimmed)
    } else {
      numPrice = price
    }
    if (!Number.isFinite(numPrice) || numPrice <= 0 || isNaN(numPrice)) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numPrice)
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

      {/* Enhanced Filter Bar */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
        {/* Search Type Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חיפוש נוסף
            </label>
            <select
              value={filters.searchType}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                searchType: e.target.value as FilterState['searchType'],
                // Clear search fields when changing type
                blockNumber: e.target.value === 'block' ? prev.blockNumber : '',
                blockRangeFrom: '',
                blockRangeTo: '',
                streetName: '',
                cityName: ''
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="block">לפי גוש</option>
              <option value="blockRange">לפי טווח גושים</option>
              <option value="street">לפי רחוב</option>
              <option value="city">לפי יישוב</option>
            </select>
          </div>

          {/* Dynamic Search Input based on type */}
          <div className="flex-1 min-w-[200px]">
            {filters.searchType === 'block' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> גוש
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filters.blockNumber || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, blockNumber: e.target.value }))}
                    placeholder={propertyBlock ? `מספר גוש (${propertyBlock})` : "מספר גוש"}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (filters.blockNumber && !filters.blockNumbers.includes(filters.blockNumber)) {
                        setFilters(prev => ({
                          ...prev,
                          blockNumbers: [...prev.blockNumbers, prev.blockNumber],
                          blockNumber: ''
                        }))
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    + הוסף
                  </button>
                </div>
                {propertyBlock && !filters.blockNumber && filters.blockNumbers.length === 0 && (
                  <p className="text-xs text-blue-600 mt-1">📋 נשלף מהדיבי: {propertyBlock}</p>
                )}
              </div>
            )}

            {filters.searchType === 'blockRange' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> טווח גושים
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={filters.blockRangeFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, blockRangeFrom: e.target.value }))}
                    placeholder="מגוש"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500">עד</span>
                  <input
                    type="text"
                    value={filters.blockRangeTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, blockRangeTo: e.target.value }))}
                    placeholder="עד גוש"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {filters.searchType === 'street' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> רחוב
                </label>
                <input
                  type="text"
                  value={filters.streetName}
                  onChange={(e) => setFilters(prev => ({ ...prev, streetName: e.target.value }))}
                  placeholder="שם הרחוב"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {filters.searchType === 'city' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> יישוב
                </label>
                <input
                  type="text"
                  value={filters.cityName}
                  onChange={(e) => setFilters(prev => ({ ...prev, cityName: e.target.value }))}
                  placeholder="שם היישוב"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Block Chips (for multiple blocks) */}
        {filters.blockNumbers.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-white rounded-md border border-gray-200">
            <span className="text-sm text-gray-600">גושים:</span>
            {filters.blockNumbers.map((block, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
              >
                {block}
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    blockNumbers: prev.blockNumbers.filter((_, i) => i !== index)
                  }))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* תאריך מכירה (Sale Date) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך מכירה
            </label>
            <select
              value={filters.saleDatePreset}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                saleDatePreset: e.target.value as FilterState['saleDatePreset'],
                dateFrom: e.target.value === 'custom' ? prev.dateFrom : '',
                dateTo: e.target.value === 'custom' ? prev.dateTo : ''
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">הכל</option>
              <option value="lastYear">שנה אחרונה</option>
              <option value="last2Years">שנתיים אחרונות</option>
              <option value="last5Years">5 שנים אחרונות</option>
              <option value="custom">טווח מותאם</option>
            </select>
            {filters.saleDatePreset === 'custom' && (
              <div className="flex gap-2 mt-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="מתאריך"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="עד תאריך"
                />
              </div>
            )}
          </div>

          {/* שווי מכירה (Sale Value) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שווי מכירה (₪)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.saleValueMin || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, saleValueMin: e.target.value ? parseFloat(e.target.value) : null }))}
                placeholder="מ"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.saleValueMax || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, saleValueMax: e.target.value ? parseFloat(e.target.value) : null }))}
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* סוג נכס (Property Type) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סוג נכס
            </label>
            <select
              value={filters.propertyType}
              onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">הכל</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* מספר חדרים (Rooms) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מספר חדרים
            </label>
            <select
              value={filters.rooms}
              onChange={(e) => setFilters(prev => ({ ...prev, rooms: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">הכל</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* חלקה (Parcel Range) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חלקה
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={filters.parcelFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, parcelFrom: e.target.value }))}
                placeholder="מחלקה"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="text"
                value={filters.parcelTo}
                onChange={(e) => setFilters(prev => ({ ...prev, parcelTo: e.target.value }))}
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* שטח (Surface Area) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שטח (מ"ר)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.surfaceMin}
                onChange={(e) => setFilters(prev => ({ ...prev, surfaceMin: parseFloat(e.target.value) || 0 }))}
                placeholder="מ"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.surfaceMax}
                onChange={(e) => setFilters(prev => ({ ...prev, surfaceMax: parseFloat(e.target.value) || 0 }))}
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* שנת בנייה (Construction Year) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שנת בנייה
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.yearMin}
                onChange={(e) => setFilters(prev => ({ ...prev, yearMin: parseInt(e.target.value, 10) || 1900 }))}
                placeholder="מ"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.yearMax}
                onChange={(e) => setFilters(prev => ({ ...prev, yearMax: parseInt(e.target.value, 10) || new Date().getFullYear() }))}
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          💡 המערכת תחפש עסקאות דומות לפי הפילטרים שהוגדרו
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
            <div className="max-h-96 overflow-auto">
              <table className="min-w-max text-sm" dir="rtl">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-right whitespace-nowrap">
                    <th className="p-2 w-12 sticky right-0 bg-gray-100 z-20">בחירה</th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('sale_day')}>
                      <div className="flex items-center justify-end gap-1">יום מכירה{renderSortIcon('sale_day')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('address')}>
                      <div className="flex items-center justify-end gap-1">כתובת{renderSortIcon('address')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('entrance')}>
                      <div className="flex items-center justify-end gap-1">כניסה{renderSortIcon('entrance')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('apartment_number')}>
                      <div className="flex items-center justify-end gap-1">דירה{renderSortIcon('apartment_number')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('block_of_land')}>
                      <div className="flex items-center justify-end gap-1">גוש/חלקה{renderSortIcon('block_of_land')}</div>
                    </th>
                    <th className="p-2">תת חלקה</th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('rooms')}>
                      <div className="flex items-center justify-end gap-1">חדרים{renderSortIcon('rooms')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('floor')}>
                      <div className="flex items-center justify-end gap-1">קומה{renderSortIcon('floor')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('total_floors')}>
                      <div className="flex items-center justify-end gap-1">קומות בבניין{renderSortIcon('total_floors')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('arnona_area_sqm')}>
                      <div className="flex items-center justify-end gap-1">שטח ברוטו{renderSortIcon('arnona_area_sqm')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('registered_area_sqm')}>
                      <div className="flex items-center justify-end gap-1">שטח נטו{renderSortIcon('registered_area_sqm')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('surface')}>
                      <div className="flex items-center justify-end gap-1">שטח (מ"ר){renderSortIcon('surface')}</div>
                    </th>
                    <th className="p-2">חלק מקרקעין</th>
                    <th className="p-2">מגרש</th>
                    <th className="p-2">גג</th>
                    <th className="p-2">מחסן</th>
                    <th className="p-2">חצר</th>
                    <th className="p-2">גלריה</th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('parking_spaces')}>
                      <div className="flex items-center justify-end gap-1">חניות{renderSortIcon('parking_spaces')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('apartments_in_building')}>
                      <div className="flex items-center justify-end gap-1">דירות בבניין{renderSortIcon('apartments_in_building')}</div>
                    </th>
                    <th className="p-2">מעלית</th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('year_of_constru')}>
                      <div className="flex items-center justify-end gap-1">שנת בנייה{renderSortIcon('year_of_constru')}</div>
                    </th>
                    <th className="p-2">תפקוד בניין</th>
                    <th className="p-2">תפקוד יחידה</th>
                    <th className="p-2">סוג עסקה</th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('sale_value_nis')}>
                      <div className="flex items-center justify-end gap-1">מחיר מכירה{renderSortIcon('sale_value_nis')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('declared_price_ils')}>
                      <div className="flex items-center justify-end gap-1">מחיר מוצהר{renderSortIcon('declared_price_ils')}</div>
                    </th>
                    <th className="p-2">מחיר מוצהר $</th>
                    <th className="p-2">מחיר מוערך $</th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort('price_per_room')}>
                      <div className="flex items-center justify-end gap-1">מחיר לחדר{renderSortIcon('price_per_room')}</div>
                    </th>
                    <th className="p-2 cursor-pointer hover:bg-gray-200 select-none bg-green-100" onClick={() => handleSort('price_per_sqm')}>
                      <div className="flex items-center justify-end gap-1">מחיר למ"ר{renderSortIcon('price_per_sqm')}</div>
                    </th>
                    <th className="p-2">מהות זכות</th>
                    <th className="p-2">תב"ע</th>
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
