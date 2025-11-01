'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Upload, BarChart3, Loader2, FileText, AlertCircle, CheckCircle, X, Check, Edit2, Trash2, EyeOff } from 'lucide-react'
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

// CRITICAL: Hebrew header mapping for database field names
// Maps English database column names to Hebrew display names
const HEBREW_HEADER_MAP: Record<string, string> = {
  // Address fields
  'address': 'כתובת',
  'address_input': 'כתובת',
  'city': 'עיר',
  'street_name': 'שם רחוב',
  'house_number': 'מספר בית',
  
  // Property details
  'rooms': 'חדרים',
  'floor_number': 'קומה',
  'floor': 'קומה',
  'area': 'שטח (מ"ר)',
  'apartment_area_sqm': 'שטח דירה (מ"ר)',
  'parking_spaces': 'חניות',
  'construction_year': 'שנת בנייה',
  'building_year': 'שנת בנייה',
  
  // Price fields
  'price': 'מחיר',
  'declared_price': 'מחיר מוצהר',
  'price_per_sqm': 'מחיר למ"ר',
  'verified_price_per_sqm': 'מחיר למ"ר (מאומת)',
  'price_per_sqm_rounded': 'מחיר למ"ר',
  
  // Date fields
  'sale_date': 'יום מכירה',
  
  // Gush/Chelka fields
  'gush_chelka_sub': 'גו"ח',
  'gush': 'גוש',
  'chelka': 'חלקה',
  'sub_chelka': 'תת חלקה',
  
  // Quality/Status fields
  'data_quality_score': 'איכות נתונים',
  'is_valid': 'תקף',
  'status': 'סטטוס',
  
  // Other fields
  'row_number': 'מספר שורה',
  'csv_filename': 'קובץ מקור',
  'created_at': 'נוצר ב'
}

// CRITICAL: Reverse mapping - Hebrew CSV headers to English database field names
// This is used when CSV headers are already in Hebrew and we need to access data
const HEBREW_TO_ENGLISH_MAP: Record<string, string> = {
  // Address fields
  'כתובת': 'address',
  'עיר': 'city',
  'שם רחוב': 'street_name',
  'מספר בית': 'house_number',
  
  // Property details
  'חדרים': 'rooms',
  'קומה': 'floor_number',
  'שטח (מ"ר)': 'area',
  'שטח דירה (מ"ר)': 'apartment_area_sqm',
  'שטח דירה במ"ר': 'apartment_area_sqm',
  'שטח דירה במר': 'apartment_area_sqm',
  'חניות': 'parking_spaces',
  'שנת בנייה': 'construction_year',
  'שנת בניה': 'construction_year',
  
  // Price fields
  'מחיר': 'price',
  'מחיר מוצהר': 'declared_price',
  'מחיר למ"ר': 'price_per_sqm',
  'מחיר למ"ר (מאומת)': 'verified_price_per_sqm',
  'מחיר למ"ר, במעוגל': 'price_per_sqm_rounded',
  'מחיר למר במעוגל': 'price_per_sqm_rounded',
  
  // Date fields
  'יום מכירה': 'sale_date',
  
  // Gush/Chelka fields
  'גו"ח': 'gush_chelka_sub',
  'גוח': 'gush_chelka_sub',
  'גוש': 'gush',
  'חלקה': 'chelka',
  'תת חלקה': 'sub_chelka',
  
  // Quality/Status fields
  'איכות נתונים': 'data_quality_score',
  'תקף': 'is_valid',
  'סטטוס': 'status',
  
  // Other fields
  'מספר שורה': 'row_number',
  'קובץ מקור': 'csv_filename',
  'נוצר ב': 'created_at'
}

// Helper function to convert English field name to Hebrew header
const getHebrewHeader = (fieldName: string): string => {
  // If already Hebrew (contains Hebrew characters), return as-is
  if (/[\u0590-\u05FF]/.test(fieldName)) {
    return fieldName
  }
  // Otherwise, map to Hebrew using the mapping
  return HEBREW_HEADER_MAP[fieldName] || fieldName
}

// Helper function to convert Hebrew CSV header to English field name
const getEnglishFieldName = (hebrewHeader: string): string => {
  // If already English (no Hebrew characters), return as-is
  if (!/[\u0590-\u05FF]/.test(hebrewHeader)) {
    return hebrewHeader
  }
  // Otherwise, map to English using the reverse mapping
  return HEBREW_TO_ENGLISH_MAP[hebrewHeader] || hebrewHeader
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
  // CRITICAL: Store CSV headers dynamically (not hardcoded)
  // Store Hebrew display headers
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  // Store mapping between Hebrew headers and original field names for data access
  const [headerToFieldMap, setHeaderToFieldMap] = useState<Map<string, string>>(new Map())
  // Track which cells are being edited: { recordId: { fieldName: true } }
  const [editingCell, setEditingCell] = useState<{ recordId: number; fieldName: string } | null>(null)
  // Track edited cell values during editing: { recordId: { fieldName: value } }
  const [cellEditValues, setCellEditValues] = useState<Record<number, Record<string, any>>>({})
  // Track hidden columns (Hebrew headers that are hidden)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  // Filter state for table data
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterRooms, setFilterRooms] = useState<string>('')
  const [filterConstructionYear, setFilterConstructionYear] = useState<string>('')

  // CRITICAL: Load all data from database
  // CRITICAL: Wrap in useCallback to prevent infinite loops
  const loadAllData = useCallback(async () => {
    setIsLoadingData(true)
    setUploadError(null)

    try {
      // CRITICAL: Fetch all data for current user/organization (filtered by API)
      // The API route will automatically filter by organization_id and user_id from session
      const response = await fetch('/api/session/' + (sessionId || 'default') + '/comparable-data')
      const result = await response.json()
      
      if (result.success && result.data && result.data.length > 0) {
        setAllData(result.data)
        // CRITICAL: Extract headers from first data record (keys from CSV)
        const firstRecord = result.data[0]
        const fieldNames = Object.keys(firstRecord).filter(key => 
          key !== 'id' // Exclude internal ID field
        )
        // CRITICAL: Convert English field names to Hebrew headers for display
        const hebrewHeaders = fieldNames.map(fieldName => getHebrewHeader(fieldName))
        
        // Create mapping: Hebrew header -> original field name (for data access)
        const mapping = new Map<string, string>()
        fieldNames.forEach((fieldName, index) => {
          mapping.set(hebrewHeaders[index], fieldName)
        })
        
        setCsvHeaders(hebrewHeaders) // Store Hebrew headers for display
        setHeaderToFieldMap(mapping) // Store mapping for data access
        console.log('📊 Extracted field names from data:', fieldNames)
        console.log('📊 Hebrew headers for display:', hebrewHeaders)
        console.log('📊 Header to field mapping:', Object.fromEntries(mapping))
        setUploadSuccess(`נטענו ${result.data.length} רשומות מהמאגר`)
      } else {
        setUploadError('לא נמצאו נתונים במאגר')
        setCsvHeaders([]) // Clear headers if no data
      }
    } catch (error) {
      console.error('❌ Load data error:', error)
      setUploadError('שגיאה בטעינת הנתונים')
    } finally {
      setIsLoadingData(false)
    }
  }, [sessionId]) // CRITICAL: Include sessionId in dependency array

  // CRITICAL: Load persisted data on mount - shows data immediately
  // Split into two effects to prevent infinite loops:
  // 1. Restore from sessionStorage (runs once on mount)
  // 2. Load from database (runs only if no data restored)
  
  // Effect 1: Restore from sessionStorage (runs once per sessionId change)
  useEffect(() => {
    if (!sessionId) return
    
    const storageKey = `comparable_analysis:${sessionId}`
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return
    
    try {
      const parsed = JSON.parse(stored)
      setAnalysisResult(parsed.analysis)
      setAllData(parsed.allData || [])
      setSelectedIds(new Set(parsed.selectedIds || []))
      // CRITICAL: Restore CSV headers if stored
      if (parsed.csvHeaders && parsed.csvHeaders.length > 0) {
        setCsvHeaders(parsed.csvHeaders)
        // Restore header mapping if available
        if (parsed.headerToFieldMap) {
          setHeaderToFieldMap(new Map(Object.entries(parsed.headerToFieldMap)))
        } else if (parsed.allData && parsed.allData.length > 0) {
          // Recreate mapping from data
          const firstRecord = parsed.allData[0]
          const fieldNames = Object.keys(firstRecord).filter(key => key !== 'id')
          const hebrewHeaders = fieldNames.map(fn => getHebrewHeader(fn))
          const mapping = new Map<string, string>()
          fieldNames.forEach((fieldName, index) => {
            mapping.set(hebrewHeaders[index], fieldName)
          })
          setHeaderToFieldMap(mapping)
        }
        console.log('✅ Restored CSV headers from sessionStorage:', parsed.csvHeaders)
      } else if (parsed.allData && parsed.allData.length > 0) {
        // Extract headers from first record if not stored
        const firstRecord = parsed.allData[0]
        const fieldNames = Object.keys(firstRecord).filter(key => key !== 'id')
        const hebrewHeaders = fieldNames.map(fn => getHebrewHeader(fn))
        const mapping = new Map<string, string>()
        fieldNames.forEach((fieldName, index) => {
          mapping.set(hebrewHeaders[index], fieldName)
        })
        setCsvHeaders(hebrewHeaders)
        setHeaderToFieldMap(mapping)
        console.log('✅ Extracted CSV headers from restored data:', hebrewHeaders)
      }
      console.log(`✅ Restored ${parsed.allData?.length || 0} records from sessionStorage`)
    } catch (err) {
      console.warn('Failed to restore analysis:', err)
    }
  }, [sessionId]) // CRITICAL: Only depends on sessionId, no function dependencies
  
  // Effect 2: Load from database if no data restored (runs once per sessionId, only if allData is empty)
  useEffect(() => {
    if (!sessionId) return
    if (allData.length > 0) return // Skip if data already loaded (from sessionStorage)
    
    // Load from database
    loadAllData().catch(err => console.error('Failed to load data:', err))
  }, [sessionId, allData.length, loadAllData]) // CRITICAL: Depends on loadAllData (now stable via useCallback)

  // CRITICAL: Calculate filtered data count using useMemo at component top level (not in JSX)
  // This prevents "Rendered more hooks than during the previous render" error
  const filteredDataCount = useMemo(() => {
    const filteredData = allData.filter((record) => {
      // City filter
      if (filterCity) {
        const recordCity = (record as any).city
        if (!recordCity || String(recordCity).toLowerCase() !== filterCity.toLowerCase()) {
          return false
        }
      }
      // Rooms filter
      if (filterRooms) {
        const recordRooms = (record as any).rooms
        if (!recordRooms) return false
        const numRooms = typeof recordRooms === 'string' ? parseFloat(recordRooms) : recordRooms
        const roundedRooms = Math.round(numRooms).toString()
        if (roundedRooms !== filterRooms) {
          return false
        }
      }
      // Construction year filter
      if (filterConstructionYear) {
        const recordYear = (record as any).construction_year || (record as any).building_year
        if (!recordYear) return false
        const numYear = typeof recordYear === 'string' ? parseInt(recordYear, 10) : recordYear
        if (numYear.toString() !== filterConstructionYear) {
          return false
        }
      }
      return true
    })
    return filteredData.length
  }, [allData, filterCity, filterRooms, filterConstructionYear])

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
      // CRITICAL: Read CSV file to extract headers BEFORE uploading
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length > 0) {
        // Extract headers from first line (CSV header row)
        const headerLine = lines[0]
        // Handle both comma and semicolon delimiters, and handle BOM if present
        const extractedHeaders = headerLine
          .replace(/^\uFEFF/, '') // Remove BOM
          .split(/[,;]/)
          .map(h => h.trim())
          .filter(h => h.length > 0)
        
        // CRITICAL: CSV headers from file are in Hebrew (per backend parsing)
        // Keep them as Hebrew for display, but create mapping to English field names for data access
        // The backend maps Hebrew CSV headers to English DB columns during import
        const hebrewHeaders = extractedHeaders.map(header => getHebrewHeader(header)) // Ensure Hebrew
        setCsvHeaders(hebrewHeaders)
        
        // Create mapping: Hebrew header -> English field name (for data access)
        const mapping = new Map<string, string>()
        extractedHeaders.forEach((csvHeader, index) => {
          // CSV header might be Hebrew - convert to English field name
          const hebrewHeader = getHebrewHeader(csvHeader) // Ensure it's Hebrew
          const englishFieldName = getEnglishFieldName(hebrewHeader) // Convert to English
          mapping.set(hebrewHeader, englishFieldName)
        })
        setHeaderToFieldMap(mapping)
        console.log('📊 Extracted CSV headers from file:', extractedHeaders)
        console.log('📊 Hebrew headers for display:', hebrewHeaders)
        console.log('📊 Hebrew -> English mapping:', Object.fromEntries(mapping))
      }

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
        // Load all data after successful upload (will also update headers from data)
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
    // CRITICAL: Ensure ID is always a number for Set comparison
    const numericId = typeof id === 'string' ? parseInt(String(id), 10) : id
    
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(numericId)) {
        newSet.delete(numericId)
      } else {
        newSet.add(numericId)
      }
      console.log('🔍 Toggled selection:', { id, numericId, newSet: Array.from(newSet) })
      return newSet
    })
  }

  // Select/Deselect all
  const selectAll = () => {
    // CRITICAL: Ensure all IDs are numbers for Set comparison
    const allIds = allData
      .filter(d => d.id)
      .map(d => {
        const id = d.id!
        return typeof id === 'string' ? parseInt(id, 10) : id
      })
    setSelectedIds(new Set(allIds))
    console.log('🔍 Selected all:', allIds)
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
    
    // CRITICAL: Debug selection state
    console.log('🔍 Analyzing selected data:')
    console.log('  selectedIds:', Array.from(selectedIds))
    console.log('  selectedIds type:', Array.from(selectedIds).map(id => typeof id))
    console.log('  allData length:', allData.length)
    console.log('  allData IDs:', allData.map(d => ({ id: d.id, idType: typeof d.id })))
    
    // CRITICAL: Filter selected data, ensuring ID comparison works correctly
    // Handle both number and string IDs (convert to number for Set comparison)
    const selectedData = allData.filter(d => {
      if (!d.id) return false
      // Ensure ID is a number for Set.has() comparison
      const recordId = typeof d.id === 'string' ? parseInt(d.id, 10) : d.id
      const isSelected = selectedIds.has(recordId) || selectedIds.has(d.id as any)
      return isSelected
    })
    
    console.log('  selectedData length:', selectedData.length)
    console.log('  selectedData:', selectedData)
    
    if (selectedData.length === 0) {
      setUploadError('נא לבחור לפחות רשומה אחת לניתוח')
      console.error('❌ No data selected! selectedIds:', selectedIds, 'allData IDs:', allData.map(d => d.id))
      return
    }

    console.log('📊 Selected data for analysis:', selectedData)
    console.log('📊 Sample row:', selectedData[0])

    // CRITICAL: Extract prices and convert strings to numbers
    // Backend returns: declared_price as price, price_per_sqm_rounded as price_per_sqm
    const prices = selectedData
      .map(d => {
        // Try multiple field names for price (total price)
        const priceValue = (d as any).price || (d as any).declared_price
        if (priceValue === null || priceValue === undefined || priceValue === '') {
          return null
        }
        // Convert string to number if needed
        if (typeof priceValue === 'string') {
          const parsed = parseFloat(priceValue)
          return isNaN(parsed) ? null : parsed
        }
        return typeof priceValue === 'number' ? priceValue : null
      })
      .filter((p): p is number => p !== null && p > 0)

    console.log('📊 Extracted prices:', prices)

    // CRITICAL: Extract prices per sqm - try multiple field names
    // Backend returns: price_per_sqm_rounded as price_per_sqm
    const pricesPerSqm = selectedData
      .map(d => {
        // Try multiple field names for price per sqm
        const sqmPrice = (d as any).price_per_sqm || 
                        (d as any).price_per_sqm_rounded || 
                        (d as any).verified_price_per_sqm
        if (sqmPrice === null || sqmPrice === undefined || sqmPrice === '') {
          return null
        }
        // Convert string to number if needed
        if (typeof sqmPrice === 'string') {
          const parsed = parseFloat(sqmPrice)
          return isNaN(parsed) ? null : parsed
        }
        return typeof sqmPrice === 'number' ? sqmPrice : null
      })
      .filter((p): p is number => p !== null && p > 0)

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
        csvHeaders, // CRITICAL: Save Hebrew headers for persistence
        headerToFieldMap: Object.fromEntries(headerToFieldMap), // CRITICAL: Save mapping for persistence
        timestamp: new Date().toISOString()
      }))
      console.log('✅ Saved comparable analysis to sessionStorage (including headers)')
      
      // Also save to database
      // CRITICAL: Backend expects propertyData (the property being evaluated), not comparableData
      // The backend will search for comparables based on propertyData criteria
      fetch('/api/comparable-data/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyData: {
            city: (data as any).city || '',
            rooms: (data as any).rooms ? parseFloat(String((data as any).rooms)) : null,
            area: (data as any).area ? parseFloat(String((data as any).area)) : null,
            // Include other property fields if available
            address: (data as any).address || '',
            neighborhood: (data as any).neighborhood || ''
          },
          sessionId: sessionId || null
          // Note: Backend will search for comparables, we don't send selectedData
          // The selected data is used for local analysis only
        })
      }).then(response => response.json())
        .then(result => {
          console.log('✅ Comparable data analysis saved to database:', result)
          // Note: Backend analysis might differ from local analysis
          // We use local analysis (analysis variable) for display
        })
        .catch(error => {
          console.error('❌ Failed to save analysis to database:', error)
          // Don't fail the whole process if backend save fails
        })
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

  // Handle cell edit start
  const handleCellEditStart = (recordId: number, fieldName: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row selection
    const record = allData.find(r => r.id === recordId)
    if (!record) return
    
    const currentValue = (record as any)[fieldName]
    setEditingCell({ recordId, fieldName })
    setCellEditValues(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        [fieldName]: currentValue
      }
    }))
  }

  // Handle cell edit save
  const handleCellEditSave = async (recordId: number, fieldName: string) => {
    const editedValue = cellEditValues[recordId]?.[fieldName]
    if (editedValue === undefined) {
      setEditingCell(null)
      return
    }

    // Update local state
    setAllData(prev => prev.map(record => {
      if (record.id === recordId) {
        return {
          ...record,
          [fieldName]: editedValue
        }
      }
      return record
    }))

    // TODO: Save to database if API endpoint exists
    // For now, just update local state
    console.log(`💾 Updated cell: recordId=${recordId}, fieldName=${fieldName}, value=${editedValue}`)
    
    setEditingCell(null)
    setCellEditValues(prev => {
      const newValues = { ...prev }
      if (newValues[recordId]) {
        delete newValues[recordId][fieldName]
        if (Object.keys(newValues[recordId]).length === 0) {
          delete newValues[recordId]
        }
      }
      return newValues
    })
  }

  // Handle cell edit cancel
  const handleCellEditCancel = () => {
    setEditingCell(null)
    setCellEditValues({})
  }

  // Handle row delete - OPTIMISTIC UPDATE: Remove immediately from UI
  const handleRowDelete = async (recordId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row selection
    
    if (!confirm('האם אתה בטוח שברצונך למחוק רשומה זו?')) {
      return
    }

    // CRITICAL: Update local state IMMEDIATELY (optimistic update)
    // User sees the change right away, before API call completes
    setAllData(prev => prev.filter(record => record.id !== recordId))
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(recordId)
      return newSet
    })

    // TODO: Delete from database if API endpoint exists
    // For now, update happens immediately in UI
    console.log(`🗑️ Deleted row: recordId=${recordId}`)
  }

  // Handle delete all selected rows
  const handleDeleteAll = () => {
    if (selectedIds.size === 0) {
      setUploadError('נא לבחור רשומות למחיקה')
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedIds.size} רשומות?`)) {
      return
    }

    // CRITICAL: Update local state IMMEDIATELY (optimistic update)
    const idsToDelete = Array.from(selectedIds)
    setAllData(prev => prev.filter(record => !record.id || !selectedIds.has(record.id)))
    setSelectedIds(new Set())

    // TODO: Delete from database if API endpoint exists
    console.log(`🗑️ Deleted ${idsToDelete.length} rows:`, idsToDelete)
  }

  // Handle delete all rows (regardless of selection)
  const handleDeleteAllRows = () => {
    if (allData.length === 0) {
      setUploadError('אין רשומות למחיקה')
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את כל הרשומות (${allData.length})?`)) {
      return
    }

    // CRITICAL: Update local state IMMEDIATELY (optimistic update)
    const totalRows = allData.length
    setAllData([])
    setSelectedIds(new Set())
    setCsvHeaders([])
    setHeaderToFieldMap(new Map())

    // TODO: Delete from database if API endpoint exists
    console.log(`🗑️ Deleted all ${totalRows} rows`)
    setUploadSuccess(`נמחקו ${totalRows} רשומות`)
  }

  // Handle column hide/remove
  const handleColumnHide = (hebrewHeader: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent header click
    
    if (!confirm(`האם אתה בטוח שברצונך להסתיר את העמודה "${hebrewHeader}"?`)) {
      return
    }

    setHiddenColumns(prev => new Set(prev).add(hebrewHeader))
    console.log(`👁️ Hidden column: ${hebrewHeader}`)
  }

  // Handle column show (if needed)
  const handleColumnShow = (hebrewHeader: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev)
      newSet.delete(hebrewHeader)
      return newSet
    })
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
          {/* Filter Controls */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  עיר:
                </label>
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
                >
                  <option value="">הכל</option>
                  {Array.from(new Set(allData.map(d => (d as any).city).filter(Boolean))).sort().map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  חדרים:
                </label>
                <select
                  value={filterRooms}
                  onChange={(e) => setFilterRooms(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                >
                  <option value="">הכל</option>
                  {Array.from(new Set(
                    allData
                      .map(d => {
                        const rooms = (d as any).rooms
                        if (!rooms) return null
                        // Convert to number and round for display
                        const numRooms = typeof rooms === 'string' ? parseFloat(rooms) : rooms
                        return isNaN(numRooms) ? null : Math.round(numRooms).toString()
                      })
                      .filter(Boolean)
                  )).sort((a, b) => parseFloat(a || '0') - parseFloat(b || '0')).map((rooms) => (
                    <option key={rooms || ''} value={rooms || ''}>{rooms}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  שנת בניה:
                </label>
                <select
                  value={filterConstructionYear}
                  onChange={(e) => setFilterConstructionYear(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                >
                  <option value="">הכל</option>
                  {Array.from(new Set(
                    allData
                      .map(d => {
                        const year = (d as any).construction_year || (d as any).building_year
                        if (!year) return null
                        // Convert to number for display
                        const numYear = typeof year === 'string' ? parseInt(year, 10) : year
                        return isNaN(numYear) ? null : numYear.toString()
                      })
                      .filter(Boolean)
                  )).sort((a, b) => parseInt(b || '0', 10) - parseInt(a || '0', 10)).map((year) => (
                    <option key={year || ''} value={year || ''}>{year}</option>
                  ))}
                </select>
              </div>
              {(filterCity || filterRooms || filterConstructionYear) && (
                <button
                  onClick={() => {
                    setFilterCity('')
                    setFilterRooms('')
                    setFilterConstructionYear('')
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
                  title="נקה מסננים"
                >
                  <X className="w-3 h-3" />
                  נקה מסננים
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="font-semibold text-gray-900">
              {`כל הנתונים (${filteredDataCount} מתוך ${allData.length} רשומות)`}
            </h4>
            <div className="flex gap-2 flex-wrap">
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
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                  title="מחק נבחרים"
                >
                  <Trash2 className="w-3 h-3" />
                  מחק נבחרים ({selectedIds.size})
                </button>
              )}
              <button
                onClick={handleDeleteAllRows}
                className="text-xs px-3 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 flex items-center gap-1"
                title="מחק הכל"
              >
                <Trash2 className="w-3 h-3" />
                מחק הכל
              </button>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr className="text-right border-b border-gray-300">
                    <th className="p-2 w-20 bg-gray-100">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs">בחירה</span>
                      </div>
                    </th>
                    {/* CRITICAL: Dynamic headers from CSV - not hardcoded */}
                    {csvHeaders.length > 0 ? (
                      csvHeaders
                        .filter(header => !hiddenColumns.has(header)) // Filter out hidden columns
                        .map((header) => (
                          <th key={header} className="p-2 relative group bg-gray-100" title={header}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-1">{header}</span>
                              <button
                                onClick={(e) => handleColumnHide(header, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                title="הסתר עמודה"
                              >
                                <EyeOff className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          </th>
                        ))
                    ) : (
                      // Fallback to default headers if no CSV headers loaded yet
                      <>
                        <th className="p-2 bg-gray-100">כתובת</th>
                        <th className="p-2 bg-gray-100">חדרים</th>
                        <th className="p-2 bg-gray-100">שטח (מ"ר)</th>
                        <th className="p-2 bg-gray-100">קומה</th>
                        <th className="p-2 bg-gray-100">מחיר</th>
                        <th className="p-2 bg-gray-100">מחיר למ"ר</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {allData.filter((record) => {
                    // Apply filters
                    // City filter
                    if (filterCity) {
                      const recordCity = (record as any).city
                      if (!recordCity || String(recordCity).toLowerCase() !== filterCity.toLowerCase()) {
                        return false
                      }
                    }
                    // Rooms filter
                    if (filterRooms) {
                      const recordRooms = (record as any).rooms
                      if (!recordRooms) return false
                      const numRooms = typeof recordRooms === 'string' ? parseFloat(recordRooms) : recordRooms
                      const roundedRooms = Math.round(numRooms).toString()
                      if (roundedRooms !== filterRooms) {
                        return false
                      }
                    }
                    // Construction year filter
                    if (filterConstructionYear) {
                      const recordYear = (record as any).construction_year || (record as any).building_year
                      if (!recordYear) return false
                      const numYear = typeof recordYear === 'string' ? parseInt(recordYear, 10) : recordYear
                      if (numYear.toString() !== filterConstructionYear) {
                        return false
                      }
                    }
                    return true
                  }).map((record) => {
                    if (!record.id) return null
                    const isSelected = selectedIds.has(record.id)
                    return (
                      <tr
                        key={record.id}
                        className={`border-t hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="p-2 text-center" onClick={(e) => {
                          // Don't toggle selection if clicking delete button
                          if ((e.target as HTMLElement).closest('button')) {
                            e.stopPropagation()
                            return
                          }
                          toggleSelection(record.id!)
                        }}>
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(record.id!)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowDelete(record.id!, e)
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="מחק שורה"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {/* CRITICAL: Dynamic cells based on CSV headers */}
                        {csvHeaders.length > 0 ? (
                          csvHeaders
                            .filter(header => !hiddenColumns.has(header)) // Filter out hidden columns
                            .map((hebrewHeader) => {
                            // Get original field name from mapping for data access
                            const fieldName = headerToFieldMap.get(hebrewHeader) || hebrewHeader
                            const isEditing = editingCell?.recordId === record.id && editingCell?.fieldName === fieldName
                            const editValue = cellEditValues[record.id!]?.[fieldName]
                            
                            // CRITICAL: Try multiple field name variations to access the data
                            // Backend returns: declared_price as price, price_per_sqm_rounded as price_per_sqm
                            // But also check for original field names in case mapping is different
                            let displayValue = editValue
                            if (displayValue === undefined) {
                              // Try the mapped field name first
                              displayValue = (record as any)[fieldName]
                              
                              // If not found, try alternative field names based on Hebrew header
                              if (displayValue === undefined || displayValue === null) {
                                // For price fields, try common variations
                                if (hebrewHeader.includes('מחיר')) {
                                  if (hebrewHeader.includes('למ') || hebrewHeader.includes('למ"ר')) {
                                    // Price per sqm - try multiple variations
                                    displayValue = (record as any).price_per_sqm || 
                                                  (record as any).price_per_sqm_rounded ||
                                                  (record as any).verified_price_per_sqm ||
                                                  (record as any)['price_per_sqm'] ||
                                                  (record as any)['price_per_sqm_rounded']
                                  } else {
                                    // Total price - try multiple variations
                                    displayValue = (record as any).price || 
                                                  (record as any).declared_price ||
                                                  (record as any)['price'] ||
                                                  (record as any)['declared_price']
                                  }
                                }
                              }
                            }
                            
                            // Format price fields if detected (check both Hebrew and English)
                            if (hebrewHeader.toLowerCase().includes('מחיר') || fieldName.toLowerCase().includes('price')) {
                              // CRITICAL: Convert string prices to numbers for formatPrice
                              let priceValue: number | null = null
                              if (displayValue !== null && displayValue !== undefined && displayValue !== '') {
                                if (typeof displayValue === 'string') {
                                  const parsed = parseFloat(displayValue)
                                  priceValue = isNaN(parsed) ? null : parsed
                                } else if (typeof displayValue === 'number') {
                                  priceValue = displayValue
                                }
                              }
                              
                              if (isEditing) {
                                return (
                                  <td key={hebrewHeader} className="p-1" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={editValue !== null && editValue !== undefined ? editValue : ''}
                                        onChange={(e) => {
                                          const numValue = parseFloat(e.target.value) || 0
                                          setCellEditValues(prev => ({
                                            ...prev,
                                            [record.id!]: {
                                              ...(prev[record.id!] || {}),
                                              [fieldName]: numValue
                                            }
                                          }))
                                        }}
                                        onBlur={() => handleCellEditSave(record.id!, fieldName)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleCellEditSave(record.id!, fieldName)
                                          } else if (e.key === 'Escape') {
                                            handleCellEditCancel()
                                          }
                                        }}
                                        className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleCellEditSave(record.id!, fieldName)}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        title="שמור"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={handleCellEditCancel}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        title="בטל"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                )
                              }
                              return (
                                <td 
                                  key={hebrewHeader} 
                                  className="p-2 relative group cursor-pointer"
                                  onDoubleClick={(e) => handleCellEditStart(record.id!, fieldName, e)}
                                  title="לחץ כפול לעריכה"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>{formatPrice(priceValue)}</span>
                                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 text-gray-400" />
                                  </div>
                                </td>
                              )
                            }
                            
                            // Default formatting for non-price fields
                            if (isEditing) {
                              return (
                                <td key={hebrewHeader} className="p-1" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editValue !== null && editValue !== undefined ? String(editValue) : ''}
                                      onChange={(e) => {
                                        setCellEditValues(prev => ({
                                          ...prev,
                                          [record.id!]: {
                                            ...(prev[record.id!] || {}),
                                            [fieldName]: e.target.value
                                          }
                                        }))
                                      }}
                                      onBlur={() => handleCellEditSave(record.id!, fieldName)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCellEditSave(record.id!, fieldName)
                                        } else if (e.key === 'Escape') {
                                          handleCellEditCancel()
                                        }
                                      }}
                                      className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
                                      dir={typeof editValue === 'string' && /[\u0590-\u05FF]/.test(String(editValue)) ? 'rtl' : 'ltr'}
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleCellEditSave(record.id!, fieldName)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                      title="שמור"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={handleCellEditCancel}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                      title="בטל"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              )
                            }
                            
                            return (
                              <td 
                                key={hebrewHeader} 
                                className="p-2 relative group cursor-pointer"
                                dir={typeof displayValue === 'string' && /[\u0590-\u05FF]/.test(String(displayValue)) ? 'rtl' : 'ltr'}
                                onDoubleClick={(e) => handleCellEditStart(record.id!, fieldName, e)}
                                title="לחץ כפול לעריכה"
                              >
                                <div className="flex items-center gap-1">
                                  <span>{displayValue !== null && displayValue !== undefined ? String(displayValue) : 'N/A'}</span>
                                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 text-gray-400" />
                                </div>
                              </td>
                            )
                          })
                        ) : (
                          // Fallback to hardcoded cells if no headers
                          <>
                            <td className="p-2" dir="rtl">{record.address || 'N/A'}</td>
                            <td className="p-2">{record.rooms || 'N/A'}</td>
                            <td className="p-2">{record.area || 'N/A'}</td>
                            <td className="p-2">{record.floor_number ?? 'N/A'}</td>
                            <td className="p-2 font-semibold">{formatPrice(record.price)}</td>
                            <td className="p-2 text-gray-600">{formatPrice(record.verified_price_per_sqm)}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-gray-600">
              נבחרו: {selectedIds.size} מתוך {allData.length}
              {hiddenColumns.size > 0 && (
                <span className="mr-3 text-xs text-gray-500">
                  (עמודות מוסתרות: {hiddenColumns.size})
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Show hidden columns button */}
              {hiddenColumns.size > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`האם אתה בטוח שברצונך להציג מחדש את כל העמודות המוסתרות?`)) {
                      setHiddenColumns(new Set())
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white hover:bg-gray-600"
                >
                  <EyeOff className="w-4 h-4" />
                  הצג עמודות מוסתרות
                </button>
              )}
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

