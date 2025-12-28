'use client'

import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Building, 
  Edit3, 
  Save, 
  Loader2, 
  ChevronLeft, 
  RotateCcw, 
  History, 
  ChevronRightCircleIcon,
  Info,
  X,
  Trash2,
  Table
} from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import React, { useState, useEffect, useRef, useMemo } from 'react'

interface Step3ValidationProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
}

type ExtractedData = ValuationData['extractedData'] & {
  land_registry?: Record<string, any>
  building_permit?: Record<string, any>
  shared_building?: Record<string, any>
  interior_analysis?: Record<string, any>
  exterior_analysis?: Record<string, any>
  [key: string]: any
}

export type Step3DocumentFile = {
  type?: string
  name?: string
  url?: string
  file?: { type?: string }
}

export const filterPdfFiles = (files: Step3DocumentFile[]): Step3DocumentFile[] => {
  return files.filter((f) => {
    const name = (f.name || '').toLowerCase()
    const url = (f.url || '').toLowerCase()
    const rawType = (f.type || f.file?.type || '').toLowerCase()

    const isPdf =
      rawType === 'application/pdf' ||
      name.endsWith('.pdf') ||
      url.endsWith('.pdf') ||
      ['tabu', 'permit', 'building_permit', 'condo', 'planning'].includes(rawType)

    const isGarmushka = url.includes('garmushka') || name.includes('garmushka') || rawType.includes('garmushka')
    const isFromUploads =
      url.includes('/uploads/') ||
      url.includes('/api/files/') ||
      url.includes('vercel-storage')

    return isPdf && isFromUploads && !isGarmushka
  })
}

export const getStep3FileTypeLabel = (type: string): string => {
  const normalizedType = (type || '').toLowerCase()
  const labels: Record<string, string> = {
    tabu: 'נסח טאבו',
    permit: 'היתר בניה',
    building_permit: 'היתר בניה',
    condo: 'צו בית משותף',
    condominium_order: 'צו בית משותף',
    planning: 'מידע תכנוני',
    planning_sheet: 'מידע תכנוני'
  }
  return labels[normalizedType] || type
}

// Map field names to Hebrew display names
const getHebrewName = (fieldName: string): string => {
  const hebrewMap: Record<string, string> = {
    // Address fields
    street: 'רחוב',
    buildingNumber: 'מספר בניין',
    building_number: 'מספר בניין',
    city: 'עיר',
    neighborhood: 'שכונה',
    address: 'כתובת',
    
    // Land registry fields
    gush: 'גוש',
    parcel: 'חלקה',
    chelka: 'חלקה',
    subParcel: 'תת חלקה',
    sub_parcel: 'תת חלקה',
    subparcel: 'תת חלקה',
    registration_office: 'לשכת רישום',
    registrationOffice: 'שם הלשכה',
    registered_area: 'שטח רשום',
    registeredArea: 'שטח רשום',
    area: 'שטח',
    area_sqm: 'שטח (מ"ר)',
    parcelArea: 'שטח חלקה',
    parcel_area: 'שטח חלקה',
    fullAddress: 'כתובת מלאה',
    full_address: 'כתובת מלאה',
    bylaws: 'תקנון',
    bylaw: 'תקנון',
    unitDescription: 'תיאור דירה',
    unit_description: 'תיאור דירה',
    commonParts: 'חלק ברכוש המשותף',
    common_parts: 'חלק ברכוש המשותף',
    
    // Ownership fields
    ownership_type: 'סוג בעלות',
    ownershipType: 'סוג בעלות',
    owners: 'בעלים',
    owners_count: 'מספר בעלים',
    
    // Building permit fields
    permit_number: 'מספר היתר',
    permit_date: 'תאריך היתר',
    permitted_usage: 'שימוש מותר',
    permitted_description: 'תיאור היתר',
    
    // Shared building fields
    building_floors: 'מספר קומות',
    buildingFloors: 'מספר קומות',
    building_units: 'מספר יחידות',
    buildingUnits: 'מספר יחידות',
    building_sub_plots_count: 'מספר תת חלקות',
    total_sub_plots: 'סה"כ תת חלקות',
    numberOfBuildings: 'מספר בניינים',
    number_of_buildings: 'מספר בניינים',
    constructionYear: 'שנת הקמה',
    construction_year: 'שנת הקמה',
    
    // Property details
    rooms: 'חדרים',
    floor: 'קומה',
    floor_number: 'קומה',
    year_of_construction: 'שנת בניה',
    airDirections: 'כיווני אוויר',
    air_directions: 'כיווני אוויר',
    propertyEssence: 'מהות הנכס',
    property_essence: 'מהות הנכס',
    builtArea: 'שטח בנוי',
    built_area: 'שטח בנוי',
    balconyArea: 'שטח מרפסת',
    balcony_area: 'שטח מרפסת',
    parcelShape: 'צורת החלקה',
    parcel_shape: 'צורת החלקה',
    parcelSurface: 'פני הקרקע',
    parcel_surface: 'פני הקרקע',
    plotBoundaryNorth: 'גבול צפון',
    plot_boundary_north: 'גבול צפון',
    plotBoundarySouth: 'גבול דרום',
    plot_boundary_south: 'גבול דרום',
    plotBoundaryEast: 'גבול מזרח',
    plot_boundary_east: 'גבול מזרח',
    plotBoundaryWest: 'גבול מערב',
    plot_boundary_west: 'גבול מערב',
    environmentDescription: 'תיאור הסביבה',
    environment_description: 'תיאור הסביבה',
    finishStandard: 'סטנדרט גמר',
    finish_standard: 'סטנדרט גמר',
    finishDetails: 'פרטי גימור',
    finish_details: 'פרטי גימור',
    internal_layout: 'חלוקה פנימית',
    internalLayout: 'חלוקה פנימית',
    
    // Analysis fields
    property_analysis: 'ניתוח נכס',
    market_analysis: 'ניתוח שוק',
    gis_analysis: 'ניתוח GIS',
    
    // Common fields
    id: 'מזהה',
    session_id: 'מזהה סשן',
    created_at: 'תאריך יצירה',
    updated_at: 'תאריך עדכון',
    notes: 'הערות',
    description: 'תיאור',
    type: 'סוג',
    status: 'סטטוס',
    value: 'ערך',
    price: 'מחיר',
    valuation: 'שומה',
    
    // Nested object indicators
    land_registry: 'נסח טאבו',
    building_permit: 'היתר בניה',
    shared_building: 'צו בית משותף',
    interior_analysis: 'ניתוח פנים',
    exterior_analysis: 'ניתוח חוץ',
    extractedData: 'נתונים מחולצים',
    extracted_data: 'נתונים מחולצים'
  }
  
  // Check exact match first
  if (hebrewMap[fieldName]) {
    return hebrewMap[fieldName]
  }
  
  // Check lowercase match
  const lowerFieldName = fieldName.toLowerCase()
  if (hebrewMap[lowerFieldName]) {
    return hebrewMap[lowerFieldName]
  }
  
  // Check snake_case to camelCase conversion
  const camelCase = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  if (hebrewMap[camelCase]) {
    return hebrewMap[camelCase]
  }
  
  // Check camelCase to snake_case conversion
  const snakeCase = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  if (hebrewMap[snakeCase]) {
    return hebrewMap[snakeCase]
  }
  
  // Return original if no mapping found
  return fieldName
}

// Reusable Field Editor Component with Provenance Tooltip
function EditableField({
  field,
  label,
  value,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  dataSource,
  provenanceInfo,
  onNavigateToDocument,
  type = 'text',
  options
}: {
  field: string
  label: string
  value: string | number | undefined
  editingField: string | null
  tempValue: string
  onEdit: (field: string, value: string) => void
  onSave: (field: string) => void
  onCancel: () => void
  onValueChange: (value: string) => void
  dataSource: string
  provenanceInfo?: {
    documentName?: string
    pageNumber?: number
    confidence?: number
    extractionMethod?: string
  } | null
  onNavigateToDocument?: (documentName: string, pageNumber?: number) => void
  type?: 'text' | 'textarea' | 'select'
  options?: string[]
}) {
  const displayValue = value || 'לא נמצא'
  const isEditing = editingField === field
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipContent = provenanceInfo ? (
    <div className="text-sm space-y-1">
      {provenanceInfo.documentName && (
        <p><strong>מסמך:</strong> {provenanceInfo.documentName}</p>
      )}
      {provenanceInfo.pageNumber && (
        <p><strong>עמוד:</strong> {provenanceInfo.pageNumber}</p>
      )}
      {provenanceInfo.confidence !== undefined && (
        <p><strong>רמת ביטחון:</strong> {Math.round(provenanceInfo.confidence * 100)}%</p>
      )}
      {provenanceInfo.extractionMethod && (
        <p><strong>שיטת חילוץ:</strong> {provenanceInfo.extractionMethod === 'manual' ? 'ידני' : 'AI'}</p>
      )}
      {onNavigateToDocument && provenanceInfo.documentName && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigateToDocument(provenanceInfo.documentName!, provenanceInfo.pageNumber)
            setShowTooltip(false)
          }}
          className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          הצג במסמך
        </button>
      )}
    </div>
  ) : (
    <div className="text-sm text-gray-500">אין מידע מקור זמין</div>
  )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right flex items-center gap-2">
        <span className="flex-1">{label}</span>
        <span className="relative inline-block">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={(e) => {
              e.stopPropagation()
              setShowTooltip(!showTooltip)
              if (onNavigateToDocument && provenanceInfo?.documentName) {
                onNavigateToDocument(provenanceInfo.documentName, provenanceInfo.pageNumber)
              }
            }}
            className={`text-blue-500 hover:text-blue-700 transition-colors ${provenanceInfo ? 'cursor-pointer' : 'cursor-help opacity-50'}`}
            title={provenanceInfo ? 'מידע מקור זמין - לחץ להצגה' : 'אין מידע מקור זמין'}
          >
            <Info className="w-4 h-4" />
          </button>
          {(showTooltip && provenanceInfo) && (
            <div 
              className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 text-right"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="text-xs mb-1 font-semibold border-b border-gray-700 pb-1">מידע מקור</div>
              {tooltipContent}
              <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
          {(showTooltip && !provenanceInfo) && (
            <div 
              className="absolute right-0 bottom-full mb-2 w-64 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-50 text-right"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="text-xs mb-1 font-semibold border-b border-gray-700 pb-1">מידע מקור</div>
              <div className="text-sm text-gray-300">אין מידע מקור זמין לשדה זה</div>
              <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          )}
        </span>
      </label>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            {type === 'textarea' ? (
              <textarea
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[80px]"
                dir="rtl"
              />
            ) : type === 'select' && options ? (
              <select
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                dir="rtl"
              >
                {options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                dir="rtl"
              />
            )}
            <button
              onClick={() => onSave(field)}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-right">{String(displayValue)}</span>
            <button
              onClick={() => onEdit(field, String(value || ''))}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{dataSource}</p>
    </div>
  )
}

// Planning Information Section Component (Chapter 3)
function PlanningInformationSection({
  data,
  extractedData,
  updateData,
  sessionId,
  fieldValues,
  setFieldValues,
  originalFieldValues,
  setOriginalFieldValues,
  isSavingParams,
  setIsSavingParams,
  savingFieldKey,
  setSavingFieldKey,
  displayExtractedData,
  setExtractedData
}: {
  data: ValuationData
  extractedData: any
  updateData: (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => void
  sessionId?: string
  fieldValues: Record<string, string>
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  originalFieldValues: Record<string, string>
  setOriginalFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  isSavingParams: boolean
  setIsSavingParams: React.Dispatch<React.SetStateAction<boolean>>
  savingFieldKey: string | null
  setSavingFieldKey: React.Dispatch<React.SetStateAction<string | null>>
  displayExtractedData: ExtractedData
  setExtractedData: React.Dispatch<React.SetStateAction<ExtractedData>>
}) {
  // Planning Plans (3.1)
  const [planningPlans, setPlanningPlans] = useState<Array<{
    plan_number?: string
    plan_name?: string
    publication_date?: string
    status?: string
  }>>([])
  
  // Building Permits (3.3)
  const [buildingPermits, setBuildingPermits] = useState<Array<{
    permit_number?: string
    permit_date?: string
    permit_description?: string
  }>>([])
  
  const [completionCert, setCompletionCert] = useState<{
    date?: string
    address?: string
  } | null>(null)
  
  // Load initial data
  useEffect(() => {
    const plans = extractedData?.planning_plans || 
                  extractedData?.planningPlans || 
                  extractedData?.planning_information?.plans || 
                  extractedData?.planning_information?.schemes || 
                  []
    setPlanningPlans(Array.isArray(plans) ? plans : [])
    
    const permits = extractedData?.building_permit || []
    setBuildingPermits(Array.isArray(permits) ? permits : (permits ? [permits] : []))
    
    const cert = extractedData?.completion_certificate || 
                 extractedData?.completionCertificate || 
                 null
    setCompletionCert(cert)
  }, [extractedData])
  
  const savePlanningData = async () => {
    setIsSavingParams(true)
    try {
      const currentExtracted = displayExtractedData as any || {}
      const updatedExtractedData = JSON.parse(JSON.stringify(currentExtracted))
      
      // Save planning plans
      if (!updatedExtractedData.planning_information) {
        updatedExtractedData.planning_information = {}
      }
      updatedExtractedData.planning_information.plans = planningPlans
      updatedExtractedData.planning_plans = planningPlans
      
      // Save building permits
      updatedExtractedData.building_permit = buildingPermits.length === 1 ? buildingPermits[0] : buildingPermits
      
      // Save completion certificate
      if (completionCert) {
        updatedExtractedData.completion_certificate = completionCert
        updatedExtractedData.completionCertificate = completionCert
      } else {
        delete updatedExtractedData.completion_certificate
        delete updatedExtractedData.completionCertificate
      }
      
      setExtractedData(updatedExtractedData)
      updateData({ extractedData: updatedExtractedData })
      
      // Save to database
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { extractedData: updatedExtractedData } })
      })
      
      if (!response.ok) {
        throw new Error('שגיאה בשמירת הנתונים')
      }
      
      alert('✅ הנתונים נשמרו בהצלחה')
    } catch (error: any) {
      console.error('Error saving planning data:', error)
      alert(`שגיאה בשמירת הנתונים: ${error.message || 'נסה שוב'}`)
    } finally {
      setIsSavingParams(false)
    }
  }
  
  // Parse Excel/CSV paste data
  const parsePastedData = (pastedText: string): Array<{plan_number?: string, plan_name?: string, publication_date?: string, status?: string}> => {
    const lines = pastedText.trim().split('\n')
    const parsed: Array<{plan_number?: string, plan_name?: string, publication_date?: string, status?: string}> = []
    
    for (const line of lines) {
      // Try tab-separated first (Excel default), then comma-separated
      const cells = line.includes('\t') ? line.split('\t') : line.split(',').map(c => c.trim())
      
      if (cells.length >= 2) {
        const plan: {plan_number?: string, plan_name?: string, publication_date?: string, status?: string} = {
          plan_number: cells[0]?.trim() || '',
          plan_name: cells[1]?.trim() || '',
          publication_date: cells[2]?.trim() || '',
          status: cells[3]?.trim() || 'בתוקף'
        }
        
        // Try to parse date if it's in a different format
        if (plan.publication_date && !plan.publication_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Try to convert DD/MM/YYYY or DD.MM.YYYY to YYYY-MM-DD
          const dateMatch = plan.publication_date.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/)
          if (dateMatch) {
            const [, day, month, year] = dateMatch
            plan.publication_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
        
        parsed.push(plan)
      }
    }
    
    return parsed
  }
  
  const handlePasteFromExcel = () => {
    const pasteArea = document.createElement('textarea')
    pasteArea.style.position = 'fixed'
    pasteArea.style.opacity = '0'
    pasteArea.style.left = '-9999px'
    document.body.appendChild(pasteArea)
    pasteArea.focus()
    
    setTimeout(() => {
      const pastedText = pasteArea.value
      document.body.removeChild(pasteArea)
      
      if (pastedText) {
        const parsed = parsePastedData(pastedText)
        if (parsed.length > 0) {
          setPlanningPlans([...planningPlans, ...parsed])
          alert(`✅ הודבקו ${parsed.length} שורות בהצלחה`)
        } else {
          alert('⚠️ לא ניתן לפרס את הנתונים. אנא ודא שהפורמט הוא: מספר תכנית | שם תכנית | תאריך פרסום | סטטוס')
        }
      }
    }, 100)
  }
  
  const handleTablePaste = (e: React.ClipboardEvent<HTMLTableElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    if (pastedText) {
      const parsed = parsePastedData(pastedText)
      if (parsed.length > 0) {
        setPlanningPlans([...planningPlans, ...parsed])
      }
    }
  }
  
  return (
    <>
      {/* 3.1 Planning Plans Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 text-right">3.1 ריכוז תכניות בניין עיר רלוונטיות</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePasteFromExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2"
              title="הדבק נתונים מטבלת אקסל (Ctrl+V)"
            >
              <Table className="w-4 h-4" />
              הדבק מטבלת אקסל
            </button>
            <button
              onClick={() => {
                setPlanningPlans([...planningPlans, { plan_number: '', plan_name: '', publication_date: '', status: 'בתוקף' }])
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + הוסף תכנית
            </button>
          </div>
        </div>
        {planningPlans.length < 4 && (
          <p className="text-red-600 font-semibold mb-4 text-right">⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח</p>
        )}
        <p className="text-sm text-gray-600 mb-4 text-right">
          💡 טיפ: ניתן להדבק נתונים מטבלת אקסל ישירות בטבלה (Ctrl+V) או להשתמש בכפתור "הדבק מטבלת אקסל".<br/>
          הפורמט הנדרש: מספר תכנית | שם תכנית | תאריך פרסום (DD/MM/YYYY) | סטטוס
        </p>
        <div className="overflow-x-auto">
          <table 
            className="w-full border-collapse border border-gray-300"
            onPaste={handleTablePaste}
          >
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">מספר תכנית</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">שם תכנית</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">תאריך פרסום</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">סטטוס</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {planningPlans.map((plan, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={plan.plan_number || ''}
                      onChange={(e) => {
                        const updated = [...planningPlans]
                        updated[index] = { ...updated[index], plan_number: e.target.value }
                        setPlanningPlans(updated)
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="מספר תכנית"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={plan.plan_name || ''}
                      onChange={(e) => {
                        const updated = [...planningPlans]
                        updated[index] = { ...updated[index], plan_name: e.target.value }
                        setPlanningPlans(updated)
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="שם תכנית"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="date"
                      value={plan.publication_date || ''}
                      onChange={(e) => {
                        const updated = [...planningPlans]
                        updated[index] = { ...updated[index], publication_date: e.target.value }
                        setPlanningPlans(updated)
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="תאריך פרסום"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={plan.status || 'בתוקף'}
                      onChange={(e) => {
                        const updated = [...planningPlans]
                        updated[index] = { ...updated[index], status: e.target.value }
                        setPlanningPlans(updated)
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="בתוקף"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      onClick={() => {
                        setPlanningPlans(planningPlans.filter((_, i) => i !== index))
                      }}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {planningPlans.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-4 py-4 text-center text-gray-500">
                    אין תכניות. לחץ על "הוסף תכנית" כדי להוסיף או "הדבק מטבלת אקסל" להדבקת נתונים.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={savePlanningData}
            disabled={isSavingParams}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSavingParams ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור תכניות
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 3.3 Building Permits */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 text-right">3.3 רישוי בניה</h3>
          <button
            onClick={() => {
              setBuildingPermits([...buildingPermits, { permit_number: '', permit_date: '', permit_description: '' }])
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + הוסף היתר בנייה
          </button>
        </div>
        <p className="text-gray-700 mb-4 text-right">מעיון בקובצי ההיתר המילוליים אותרו המסמכים הבאים:</p>
        <div className="space-y-4 mb-4">
          {buildingPermits.map((permit, index) => (
            <div key={index} className="border border-gray-300 rounded p-4">
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מספר היתר</label>
                  <input
                    type="text"
                    value={permit.permit_number || ''}
                    onChange={(e) => {
                      const updated = [...buildingPermits]
                      updated[index] = { ...updated[index], permit_number: e.target.value }
                      setBuildingPermits(updated)
                    }}
                    className="w-full px-2 py-1 border rounded text-right"
                    placeholder="מספר היתר"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">תאריך היתר</label>
                  <input
                    type="date"
                    value={permit.permit_date || ''}
                    onChange={(e) => {
                      const updated = [...buildingPermits]
                      updated[index] = { ...updated[index], permit_date: e.target.value }
                      setBuildingPermits(updated)
                    }}
                    className="w-full px-2 py-1 border rounded text-right"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setBuildingPermits(buildingPermits.filter((_, i) => i !== index))
                    }}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">תיאור היתר</label>
                <textarea
                  value={permit.permit_description || ''}
                  onChange={(e) => {
                    const updated = [...buildingPermits]
                    updated[index] = { ...updated[index], permit_description: e.target.value }
                    setBuildingPermits(updated)
                  }}
                  className="w-full px-2 py-1 border rounded text-right"
                  rows={2}
                  placeholder="תיאור ההיתר"
                />
              </div>
            </div>
          ))}
          {buildingPermits.length === 0 && (
            <p className="text-gray-500 text-right">• לא אותרו היתרי בנייה.</p>
          )}
        </div>
        
        {/* Completion Certificate */}
        <div className="border border-gray-300 rounded p-4 mt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3 text-right">תעודת גמר</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">תאריך תעודת גמר</label>
              <input
                type="date"
                value={completionCert?.date || ''}
                onChange={(e) => {
                  setCompletionCert({ ...completionCert, date: e.target.value })
                }}
                className="w-full px-2 py-1 border rounded text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">כתובת</label>
              <input
                type="text"
                value={completionCert?.address || ''}
                onChange={(e) => {
                  setCompletionCert({ ...completionCert, address: e.target.value })
                }}
                className="w-full px-2 py-1 border rounded text-right"
                placeholder="כתובת הבניין"
              />
            </div>
          </div>
          {completionCert && (completionCert.date || completionCert.address) && (
            <button
              onClick={() => setCompletionCert(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              מחק תעודת גמר
            </button>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={savePlanningData}
            disabled={isSavingParams}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSavingParams ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור שינויים
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export function Step3Validation({ data, updateData, onValidationChange, sessionId }: Step3ValidationProps) {
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState<string>('')
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [allFiles, setAllFiles] = useState<Array<{
    type: string
    name: string
    preview?: string
    url?: string
    file?: File
    source?: string
  }>>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [provenanceData, setProvenanceData] = useState<Record<string, {
    documentName?: string
    pageNumber?: number
    confidence?: number
    extractionMethod?: string
    bbox?: { x: number; y: number; width: number; height: number }
    documentId?: string
  }>>({})
  const [pdfViewerPage, setPdfViewerPage] = useState<number>(1)
  
  // AI Extraction History
  const [aiExtractions, setAIExtractions] = useState<any[]>([])
  const [showAIHistory, setShowAIHistory] = useState(false)
  const [isRestoringAI, setIsRestoringAI] = useState(false)
  
  // Comprehensive Parameters Table - always show when there's data
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [originalFieldValues, setOriginalFieldValues] = useState<Record<string, string>>({})
  const [isSavingParams, setIsSavingParams] = useState(false)
  const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null)

  // Validation - always allow proceeding
  const validationCalledRef = useRef(false)
  useEffect(() => {
    if (!validationCalledRef.current) {
      onValidationChange(true)
      validationCalledRef.current = true
    }
  }, [onValidationChange])

  // Load session data and provenance
  useEffect(() => {
    const loadSessionData = async () => {
      if (!sessionId || Object.keys(extractedData).length > 0) return
      
      try {
        const [sessionResponse, provenanceResponse] = await Promise.all([
          fetch(`/api/session/${sessionId}`),
          fetch(`/api/provenance?sessionId=${sessionId}`).catch(() => null)
        ])
        
        if (!sessionResponse.ok) return

        const sessionData = await sessionResponse.json()
        
        // Load extracted data
        const extractedDataFromSession = sessionData.extractedData || sessionData.data?.extractedData
        if (extractedDataFromSession && Object.keys(extractedDataFromSession).length > 0) {
          setExtractedData(extractedDataFromSession)
        }
        
        // Load files
        if (sessionData.data?.uploads && Array.isArray(sessionData.data.uploads)) {
          const files = await getAllFilesFromSessionData(sessionData.data.uploads)
          setAllFiles(files)
        }
        
        // Load provenance data
        if (provenanceResponse && provenanceResponse.ok) {
          const provenanceResult = await provenanceResponse.json()
          const provenanceRecords = provenanceResult.provenance || []
          
          // Map provenance by field_path
          const provenanceMap: Record<string, {
            documentName?: string
            documentId?: string
            pageNumber?: number
            confidence?: number
            extractionMethod?: string
            bbox?: { x: number; y: number; width: number; height: number }
          }> = {}
          
          provenanceRecords.forEach((record: any) => {
            if (record.is_active && record.field_path) {
              // Take the first active record for each field
              if (!provenanceMap[record.field_path]) {
                let bbox = null
                if (record.bbox) {
                  try {
                    bbox = typeof record.bbox === 'string' ? JSON.parse(record.bbox) : record.bbox
                  } catch {
                    bbox = null
                  }
                }
                provenanceMap[record.field_path] = {
                  documentName: record.document_name,
                  documentId: record.document_id,
                  pageNumber: record.page_number,
                  confidence: parseFloat(record.confidence) || undefined,
                  extractionMethod: record.extraction_method === 'manual' ? 'manual' : 'ai',
                  bbox: bbox
                }
              }
            }
          })
          
          setProvenanceData(provenanceMap)
        }
        
        setFilesLoading(false)
      } catch (error) {
        console.error('Error loading session data:', error)
        setFilesLoading(false)
      }
    }

    loadSessionData()
  }, [sessionId, extractedData])
  
  // Function to navigate to a specific document/page
  const navigateToDocument = (documentName: string, pageNumber?: number) => {
    const fileIndex = allFiles.findIndex(f => f.name === documentName || f.name.includes(documentName))
    if (fileIndex !== -1) {
      setCurrentFileIndex(fileIndex)
      setPdfViewerPage(pageNumber || 1)
    }
  }
  
  // Function to select a field and highlight it
  const handleFieldClick = (fieldPath: string) => {
    const provenance = getProvenanceForField(fieldPath)
    if (provenance && provenance.pageNumber) {
      setPdfViewerPage(provenance.pageNumber)
      navigateToDocument(provenance.documentName || '', provenance.pageNumber)
    }
  }
  
  // Helper to get provenance info for a field (tries multiple field name variations)
  const getProvenanceForField = (fieldName: string) => {
    // Try exact match first
    if (provenanceData[fieldName]) {
      return provenanceData[fieldName]
    }
    
    // Try snake_case version
    const snakeCase = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()
    if (provenanceData[snakeCase]) {
      return provenanceData[snakeCase]
    }
    
    // Try with common prefixes
    const prefixes = ['land_registry.', 'building_permit.', 'shared_building.']
    for (const prefix of prefixes) {
      if (provenanceData[`${prefix}${fieldName}`]) {
        return provenanceData[`${prefix}${fieldName}`]
      }
      if (provenanceData[`${prefix}${snakeCase}`]) {
        return provenanceData[`${prefix}${snakeCase}`]
      }
    }
    
    return null
  }

  // Sync with props - MERGE instead of replace to preserve planning_rights and other fields
  useEffect(() => {
    if (data.extractedData && Object.keys(data.extractedData).length > 0) {
      setExtractedData(prev => {
        // Deep merge to preserve nested objects like planning_rights, planning_information
        const merged = { ...prev }
        
        for (const [key, value] of Object.entries(data.extractedData || {})) {
          if (value !== undefined && value !== null) {
            // If both are objects (not arrays), merge them
            if (
              typeof value === 'object' && 
              !Array.isArray(value) && 
              typeof merged[key] === 'object' && 
              !Array.isArray(merged[key])
            ) {
              merged[key] = { ...merged[key], ...value }
            } else {
              merged[key] = value
            }
          }
        }
        
        return merged
      })
    }
  }, [data.extractedData])

  const getAllFilesFromSessionData = async (sessionUploads: any[]) => {
    const files: Array<{
      type: string
      name: string
      preview?: string
      url?: string
      file?: File
    }> = []

    if (!Array.isArray(sessionUploads)) return files

    for (const upload of sessionUploads) {
      if (upload.status !== 'completed') continue

      const fileName = upload.name || upload.fileName || `${upload.type}_document`
      const fileType = upload.mimeType || 'application/octet-stream'
      const isPDF = fileType === 'application/pdf' || 
                   fileType.includes('pdf') || 
                   fileName.toLowerCase().endsWith('.pdf') ||
                   ['tabu', 'permit', 'condo'].includes(upload.type)

      if (isPDF && upload.url) {
        files.push({
          type: upload.type,
          name: fileName,
          preview: upload.url,
          url: upload.url,
          file: new File([], fileName, { type: 'application/pdf' })
        })
      }
    }

    return files
  }

  // Filter PDF files
  const pdfFiles = useMemo(() => filterPdfFiles(allFiles), [allFiles])

  const currentFile = pdfFiles[currentFileIndex]


  const handleFieldEdit = (field: string, currentValue: string) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  const handleFieldSave = (field: string) => {
    const newExtractedData = {
      ...extractedData,
      [field]: tempValue
    }
    
    setExtractedData(newExtractedData)
    updateData({ extractedData: newExtractedData })
    setEditingField(null)
    setTempValue('')
  }

  const handleFieldCancel = () => {
    setEditingField(null)
    setTempValue('')
  }

  const getDataSource = (field: string): string => {
    const sourceMap: Record<string, string> = {
      registrationOffice: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      gush: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      parcel: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      chelka: 'נשלף מתוך תעודת בעלות (עמוד 1)',
      ownershipType: 'נשלף מתוך תעודת בעלות (עמוד 2)',
      attachments: 'נשלף מתוך תעודת בעלות (עמוד 3)',
      sharedAreas: 'נשלף מתוך צו בית משותף (סעיף 2)',
      buildingYear: 'נשלף מתוך היתר בנייה',
      floor: 'נשלף מתוך צו בית משותף',
      builtArea: 'נשלף מתוך היתר בנייה (עמוד 2)',
      buildingDescription: 'נשלף מתוך צו בית משותף (סעיף 1)',
      propertyCondition: 'נקבע מתמונות הנכס',
      finishLevel: 'נקבע מתמונות הנכס',
      propertyLayoutDescription: 'נשלף מניתוח תמונות פנים',
      conditionAssessment: 'נשלף מניתוח תמונות פנים',
      buildingCondition: 'נשלף מניתוח תמונות חוץ',
      buildingFeatures: 'נשלף מניתוח תמונות חוץ',
      buildingType: 'נשלף מניתוח תמונות חוץ',
      overallAssessment: 'נשלף מניתוח תמונות חוץ',
      permittedUse: 'נשלף מתוך מידע תכנוני',
      averagePricePerSqm: 'חושב מתוך נכסים דומים',
      medianPricePerSqm: 'חושב מתוך נכסים דומים',
      adjustmentFactor: 'מבוסס על מאפייני הנכס'
    }
    return sourceMap[field] || 'נשלף מהמסמכים'
  }

  // Load AI extractions
  const loadAIExtractions = async () => {
    if (!sessionId) return
    try {
      const response = await fetch(`/api/session/${sessionId}/ai-extractions`)
      if (response.ok) {
        const { extractions } = await response.json()
        setAIExtractions(extractions || [])
      }
    } catch (error) {
      console.error('Error loading AI extractions:', error)
    }
  }

  useEffect(() => {
    if (sessionId && aiExtractions.length === 0) {
      loadAIExtractions()
    }
  }, [sessionId])

  const restoreAIExtraction = async (extractionId: number) => {
    if (!sessionId) return
    setIsRestoringAI(true)
    try {
      const response = await fetch(`/api/session/${sessionId}/ai-extractions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractionId, action: 'restore' })
      })
      
      if (response.ok) {
        const { restoredFields } = await response.json()
        const updatedExtractedData = { ...extractedData, ...restoredFields }
        setExtractedData(updatedExtractedData)
        updateData({ extractedData: updatedExtractedData })
        await loadAIExtractions()
        alert('✅ נתונים שוחזרו לגרסת הבינה המלאכותית המקורית')
      }
    } catch (error) {
      console.error('Error restoring AI extraction:', error)
      alert('❌ שגיאה בשחזור הנתונים')
    } finally {
      setIsRestoringAI(false)
    }
  }

  // Populate extractedData from data prop if extractedData is empty but data has values
  useEffect(() => {
    const currentExtractedData = data.extractedData || extractedData
    if (Object.keys(currentExtractedData).length === 0 && Object.keys(data).length > 0) {
      // Create extractedData structure from data prop
      const populatedExtractedData: any = {}
      
      // Map data fields to extractedData structure
      if (data.street || data.city || data.buildingNumber) {
        populatedExtractedData.address = {
          street: data.street,
          buildingNumber: data.buildingNumber,
          city: data.city,
          neighborhood: data.neighborhood,
          fullAddress: data.fullAddress
        }
      }
      
      if (data.gush || data.parcel || data.subParcel) {
        populatedExtractedData.land_registry = {
          gush: data.gush,
          parcel: data.parcel,
          sub_parcel: data.subParcel,
          registered_area: data.registeredArea,
          ownership_type: (data.extractedData as any)?.ownershipType || (data.extractedData as any)?.ownership_type || 'בעלות',
          attachments: data.attachments || (data.extractedData as any)?.attachments,
          attachments_description: data.attachments || (data.extractedData as any)?.attachments_description
        }
      }
      
      if (data.rooms || data.floor) {
        populatedExtractedData.property = {
          rooms: data.rooms,
          floor: data.floor,
          airDirections: data.airDirections,
          propertyEssence: data.propertyEssence
        }
      }
      
      if (data.buildingFloors || data.buildingUnits) {
        populatedExtractedData.shared_building = {
          building_floors: data.buildingFloors,
          building_units: data.buildingUnits,
          building_description: data.buildingDescription
        }
      }
      
      if (Object.keys(populatedExtractedData).length > 0) {
        setExtractedData(populatedExtractedData)
        updateData({ extractedData: populatedExtractedData }, { skipAutoSave: true })
      }
    }
  }, [data.street, data.city, data.gush, data.parcel, data.rooms, data.buildingFloors, data.attachments, data.extractedData])
  
  const displayExtractedData = data.extractedData || extractedData
  
  // Check if we have data in extractedData OR in the main data prop
  // This ensures tables show even when loading from database where extractedData might be empty
  const hasDataInExtractedData = Object.keys(displayExtractedData).length > 0
  const hasDataInMainData = Object.keys(data).length > 0 && (
    data.street || data.city || data.rooms || data.gush || data.parcel || 
    data.clientName || data.valuationDate || (data as any).finalValuation
  )
  const hasExtractedData = hasDataInExtractedData || hasDataInMainData

  // Initialize field values from extractedData when it changes
  useEffect(() => {
    if (hasExtractedData) {
      const extracted = displayExtractedData as any
      const initialValues: Record<string, string> = {}
      const initialOriginals: Record<string, string> = {}
      
      // Helper to get string value
      const getStringValue = (val: any): string => {
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') return JSON.stringify(val, null, 2)
        return String(val)
      }
      
      // Helper to get value from multiple paths
      const getValueFromPaths = (paths: string[]): any => {
        for (const path of paths) {
          const keys = path.split('.')
          let value = extracted
          for (const key of keys) {
            if (value && typeof value === 'object') {
              value = value[key]
            } else {
              value = undefined
              break
            }
          }
          if (value !== undefined && value !== null && value !== '') {
            return value
          }
          // Also check in data
          let dataValue = data as any
          for (const key of keys) {
            if (dataValue && typeof dataValue === 'object') {
              dataValue = dataValue[key]
            } else {
              dataValue = undefined
              break
            }
          }
          if (dataValue !== undefined && dataValue !== null && dataValue !== '') {
            return dataValue
          }
        }
        return undefined
      }
      
      // Initialize all field values - covering ALL fields from the tables
      const allFields = [
        // Legal Status fields
        { key: 'registrationOffice', value: getValueFromPaths(['registrationOffice', 'registry_office', 'land_registry.registry_office', 'land_registry.registrationOffice']) },
        { key: 'gush', value: getValueFromPaths(['gush', 'land_registry.gush']) },
        { key: 'chelka', value: getValueFromPaths(['chelka', 'parcel', 'land_registry.chelka', 'land_registry.parcel']) },
        { key: 'parcelArea', value: getValueFromPaths(['parcelArea', 'parcel_area', 'land_registry.parcelArea', 'land_registry.total_plot_area']) },
        { key: 'fullAddress', value: data.street && data.buildingNumber && data.city ? `${data.street} ${data.buildingNumber}, ${data.neighborhood ? `שכונת ${data.neighborhood}, ` : ''}${data.city}` : undefined },
        { key: 'bylaws', value: getValueFromPaths(['bylaws', 'bylaw', 'land_registry.bylaws', 'land_registry.bylaw']) },
        { key: 'subParcel', value: getValueFromPaths(['subParcel', 'sub_parcel', 'subparcel', 'land_registry.subParcel', 'land_registry.sub_parcel']) },
        { key: 'unitDescription', value: getValueFromPaths(['unitDescription', 'unit_description', 'land_registry.unitDescription', 'land_registry.unit_description']) },
        { key: 'registeredArea', value: getValueFromPaths(['registeredArea', 'registered_area', 'land_registry.registeredArea', 'land_registry.registered_area']) },
        { key: 'commonParts', value: getValueFromPaths(['commonParts', 'common_parts', 'land_registry.commonParts', 'land_registry.common_parts']) },
        { 
          key: 'attachments', 
          value: (() => {
            // Check data.attachments first, then extractedData paths
            const att = (data as any).attachments || getValueFromPaths(['attachments', 'land_registry.attachments', 'land_registry.attachments_description'])
            if (typeof att === 'string') return att
            if (Array.isArray(att) && att.length > 0) {
              return att.map((a: any) => {
                if (typeof a === 'string') return a
                return `${a.type || a.description || ''}${a.size ? ` (${a.size} מ"ר)` : ''}${a.symbol ? `, אות ${a.symbol}` : ''}${a.color ? `, צבע ${a.color}` : ''}`
              }).join(', ')
            }
            return ''
          })()
        },
        { key: 'ownershipType', value: getValueFromPaths(['ownershipType', 'ownership_type', 'land_registry.ownershipType', 'land_registry.ownership_type']) },
        { 
          key: 'owners', 
          value: (() => {
            const owners = getValueFromPaths(['owners', 'land_registry.owners'])
            if (Array.isArray(owners) && owners.length > 0) {
              return owners.map((o: any) => {
                if (typeof o === 'string') return o
                return `${o.name || ''}${o.idType ? `, ${o.idType}` : ''}${o.idNumber ? ` ${o.idNumber}` : ''}${o.share ? `, חלק ${o.share}` : ''}`
              }).join('; ')
            }
            return owners || ''
          })()
        },
        { key: 'notes', value: getValueFromPaths(['notes', 'land_registry.notes', 'land_registry.warnings']) },
        
        // Building Details fields
        { key: 'constructionYear', value: getValueFromPaths(['constructionYear', 'construction_year', 'year_of_construction', 'buildingYear', 'building_year', 'shared_building.constructionYear']) },
        { key: 'buildingFloors', value: getValueFromPaths(['buildingFloors', 'building_floors', 'floors', 'shared_building.buildingFloors', 'shared_building.floors']) },
        { key: 'buildingUnits', value: getValueFromPaths(['buildingUnits', 'building_units', 'units', 'shared_building.buildingUnits', 'shared_building.units']) },
        { key: 'numberOfBuildings', value: getValueFromPaths(['numberOfBuildings', 'number_of_buildings', 'buildings_count', 'shared_building.numberOfBuildings']) },
        { key: 'parcelShape', value: getValueFromPaths(['parcelShape', 'parcel_shape', 'land_registry.parcelShape']) },
        { key: 'parcelSurface', value: getValueFromPaths(['parcelSurface', 'parcel_surface', 'land_registry.parcelSurface']) },
        { key: 'plotBoundaryNorth', value: getValueFromPaths(['plotBoundaryNorth', 'plot_boundary_north', 'boundary_north', 'gis_analysis.boundary_north']) },
        { key: 'plotBoundarySouth', value: getValueFromPaths(['plotBoundarySouth', 'plot_boundary_south', 'boundary_south', 'gis_analysis.boundary_south']) },
        { key: 'plotBoundaryEast', value: getValueFromPaths(['plotBoundaryEast', 'plot_boundary_east', 'boundary_east', 'gis_analysis.boundary_east']) },
        { key: 'plotBoundaryWest', value: getValueFromPaths(['plotBoundaryWest', 'plot_boundary_west', 'boundary_west', 'gis_analysis.boundary_west']) },
        { key: 'floor', value: data.floor || extracted.floor },
        { key: 'builtArea', value: getValueFromPaths(['builtArea', 'built_area', 'land_registry.builtArea']) },
        { key: 'balconyArea', value: getValueFromPaths(['balconyArea', 'balcony_area', 'land_registry.balconyArea']) },
        { key: 'buildingDescription', value: getValueFromPaths(['buildingDescription', 'building_description', 'shared_building.buildingDescription']) },
        { key: 'permittedUse', value: getValueFromPaths(['permittedUse', 'permitted_use', 'building_permit.permittedUse']) },
        
        // Property Characteristics fields
        { key: 'rooms', value: data.rooms },
        { key: 'airDirections', value: data.airDirections },
        { key: 'propertyEssence', value: data.propertyEssence || (data.rooms ? `דירת מגורים בת ${data.rooms} חדרים` : 'דירת מגורים') },
        { key: 'propertyCondition', value: extracted.propertyCondition },
        { key: 'finishLevel', value: extracted.finishLevel || extracted.finish_standard },
        { key: 'finishDetails', value: extracted.finishDetails || extracted.finish_details },
        
        // Interior Analysis fields
        { key: 'propertyLayoutDescription', value: extracted.propertyLayoutDescription || extracted.internal_layout || data.internalLayout },
        { key: 'conditionAssessment', value: extracted.conditionAssessment },
        { 
          key: 'roomAnalysis', 
          value: extracted.roomAnalysis && Array.isArray(extracted.roomAnalysis) && extracted.roomAnalysis.length > 0
            ? JSON.stringify(extracted.roomAnalysis, null, 2)
            : '' 
        },
        { key: 'finishStandard', value: extracted.finishStandard || extracted.finish_standard },
        
        // Exterior Analysis fields
        { key: 'buildingCondition', value: extracted.buildingCondition },
        { key: 'buildingType', value: extracted.buildingType },
        { key: 'buildingFeatures', value: extracted.buildingFeatures },
        { key: 'overallAssessment', value: extracted.overallAssessment },
        { key: 'environmentDescription', value: extracted.environmentDescription || extracted.environment_description || (data as any).environmentDescription },
        
        // Planning Rights fields (Chapter 3.2)
        { key: 'planningRights.usage', value: getValueFromPaths(['planning_information.rights.usage', 'planning_rights.usage', 'planningRights.usage', 'planning_information.rights.yiud']) },
        { key: 'planningRights.minLotSize', value: getValueFromPaths(['planning_information.rights.minLotSize', 'planning_information.rights.min_lot_size', 'planning_rights.minLotSize', 'planning_rights.min_lot_size']) },
        { key: 'planningRights.buildPercentage', value: getValueFromPaths(['planning_information.rights.buildPercentage', 'planning_information.rights.build_percentage', 'planning_rights.buildPercentage', 'planning_rights.build_percentage']) },
        { key: 'planningRights.maxFloors', value: getValueFromPaths(['planning_information.rights.maxFloors', 'planning_information.rights.max_floors', 'planning_rights.maxFloors', 'planning_rights.max_floors']) },
        { key: 'planningRights.maxUnits', value: getValueFromPaths(['planning_information.rights.maxUnits', 'planning_information.rights.max_units', 'planning_rights.maxUnits', 'planning_rights.max_units']) },
        { key: 'planningRights.buildingLines', value: getValueFromPaths(['planning_information.rights.buildingLines', 'planning_information.rights.building_lines', 'planning_rights.buildingLines', 'planning_rights.building_lines']) }
      ]
      
      allFields.forEach(field => {
        const strValue = getStringValue(field.value)
        initialValues[field.key] = strValue
        initialOriginals[field.key] = strValue
      })
      
      setFieldValues(prev => {
        // Only update if values actually changed to avoid infinite loops
        const hasChanges = Object.keys(initialValues).some(key => 
          prev[key] !== initialValues[key]
        )
        return hasChanges ? { ...prev, ...initialValues } : prev
      })
      
      setOriginalFieldValues(prev => {
        const hasChanges = Object.keys(initialOriginals).some(key => 
          prev[key] !== initialOriginals[key]
        )
        return hasChanges ? { ...prev, ...initialOriginals } : prev
      })
    }
  }, [displayExtractedData, data.rooms, data.floor, hasExtractedData])

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900 text-right">
            תצוגת מסמכים ונתונים שחולצו
          </h2>
          <div className="flex items-center gap-3">
            {aiExtractions.length > 0 && (
              <button
                onClick={() => setShowAIHistory(!showAIHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">
                  היסטוריית AI ({aiExtractions.length})
                </span>
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 text-right">
          סקור את המסמכים שהועלו ואת הנתונים שחולצו מהם באמצעות AI
        </p>
      </div>

      {/* AI History Panel */}
      {showAIHistory && aiExtractions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6" dir="rtl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              גרסאות קודמות של חילוץ הנתונים
            </h3>
            <button
              onClick={() => setShowAIHistory(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {aiExtractions.map((extraction, index) => (
              <div key={extraction.id} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        גרסה #{aiExtractions.length - index}
                      </span>
                      {extraction.is_active && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                          🤖 גרסה נוכחית
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>תאריך: {new Date(extraction.extraction_date).toLocaleString('he-IL')}</p>
                      <p>{Object.keys(extraction.extracted_fields || {}).length} שדות</p>
                    </div>
                  </div>
                  <button
                    onClick={() => restoreAIExtraction(extraction.id)}
                    disabled={extraction.is_active || isRestoringAI}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRestoringAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>משחזר...</span>
                      </>
                    ) : (
                      <>
                    <RotateCcw className="w-4 h-4" />
                        <span>{extraction.is_active ? 'גרסה נוכחית' : 'שחזר גרסה זו'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-sm font-semibold text-green-900">עיבוד הושלם בהצלחה</h3>
            <p className="text-green-700 text-xs">
              הנתונים נחלצו מהמסמכים. ניתן לערוך ולאמת את הנתונים בטבלה למטה.
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-right">צפייה במסמכים</h3>
            
            {/* Document Tabs */}
            {pdfFiles.length > 0 && (
              <div className="flex space-x-reverse space-x-1 mb-4">
                {pdfFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentFileIndex(index)
                      setPdfViewerPage(1)
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentFileIndex === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getStep3FileTypeLabel(file.type || '')}
                  </button>
                ))}
              </div>
            )}

            {/* Document Display */}
            <div className="border border-gray-300 rounded-lg bg-gray-50">
              {filesLoading ? (
                <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-blue-800 font-medium text-lg">טוען מסמכים...</p>
                    <p className="text-blue-600 text-sm mt-2">מכין את המסמכים לתצוגה</p>
                  </div>
                </div>
              ) : currentFile?.url ? (
                <div className="relative">
                  <iframe
                    key={`${currentFile.url}#page=${pdfViewerPage}`}
                    src={`${currentFile.url}#page=${pdfViewerPage}&view=FitH`}
                    title={currentFile.name || 'מסמך PDF'}
                    className="w-full h-[700px] rounded-lg bg-white"
                    allow="fullscreen"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg">אין מסמכים להצגה</p>
                    <p className="text-sm">העלה מסמכים בשלב הקודם</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Navigation */}
            {pdfFiles.length > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => {
                    const nextIndex = Math.max(0, currentFileIndex - 1)
                    setCurrentFileIndex(nextIndex)
                    setPdfViewerPage(1)
                  }}
                  disabled={currentFileIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightCircleIcon className="w-4 h-4" />
                  <span>הקודם</span>
                </button>
                <div className="text-sm text-gray-600">
                  {currentFileIndex + 1} מתוך {pdfFiles.length}
                </div>
                <button
                  onClick={() => {
                    const nextIndex = Math.min(pdfFiles.length - 1, currentFileIndex + 1)
                    setCurrentFileIndex(nextIndex)
                    setPdfViewerPage(1)
                  }}
                  disabled={currentFileIndex >= pdfFiles.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>הבא</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
      </div>


      {/* Structured Data Tables - Separated by Category */}
      {hasExtractedData && (() => {
        const extracted = displayExtractedData as any
        
        // Helper function to render a table for a category
        const renderTable = (title: string, fields: Array<{key: string, label: string, value: any}>) => {
          return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">{title}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">שם שדה</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">ערך</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => {
                      const currentValue = fieldValues[field.key] || ''
                      const originalValue = originalFieldValues[field.key] || ''
                      const hasChanges = currentValue !== originalValue
                      const isSaving = savingFieldKey === field.key && isSavingParams
                      
                      return (
                        <tr key={field.key} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-700">
                            {field.label}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <textarea
                              value={currentValue}
                              onChange={(e) => {
                                setFieldValues(prev => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))
                              }}
                              className={`w-full px-2 py-1 border rounded text-right ${
                                hasChanges ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                              }`}
                              rows={typeof field.value === 'object' || currentValue.length > 50 ? 3 : 1}
                              placeholder="לא הוזן"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex items-center gap-2 justify-end">
                              {hasChanges ? (
                                <>
                                  <button
                                    onClick={async () => {
                                      setSavingFieldKey(field.key)
                                      setIsSavingParams(true)
                                      
                                      // Parse value if it's JSON
                                      let parsedValue: any = currentValue
                                      try {
                                        parsedValue = JSON.parse(currentValue)
                                      } catch {
                                        // Keep as string if not valid JSON
                                      }
                                      
                                      // Update extractedData - handle nested paths safely
                                      const currentExtracted = displayExtractedData as any || {}
                                      
                                      // Deep clone to avoid mutations - handle circular references
                                      let updatedExtractedData: any = {}
                                      try {
                                        updatedExtractedData = JSON.parse(JSON.stringify(currentExtracted))
                                      } catch (e) {
                                        // Fallback: manual copy if JSON.stringify fails
                                        updatedExtractedData = { ...currentExtracted }
                                      }
                      
                                      // Normalize parsedValue - handle empty strings and invalid values
                                      let normalizedValue: any = parsedValue
                                      if (normalizedValue === '' || normalizedValue === null || normalizedValue === undefined) {
                                        normalizedValue = null
                                      }
                                      // Ensure value can be serialized
                                      try {
                                        JSON.stringify(normalizedValue)
                                      } catch (e) {
                                        console.warn('Value cannot be serialized, converting to string:', field.key)
                                        normalizedValue = String(normalizedValue)
                                      }
                      
                                      // Map field keys to their storage paths in extracted_data
                                      // Save to root level first
                                      if (normalizedValue !== null) {
                                        updatedExtractedData[field.key] = normalizedValue
                                      } else {
                                        delete updatedExtractedData[field.key]
                                      }
                      
                                      // Also save to nested structures if needed
                                      if (['registrationOffice', 'gush', 'chelka', 'parcelArea', 'bylaws', 'subParcel', 'unitDescription', 'registeredArea', 'commonParts', 'ownershipType', 'attachments', 'owners', 'notes'].includes(field.key)) {
                                        if (!updatedExtractedData.land_registry) {
                                          updatedExtractedData.land_registry = {}
                                        }
                                        const landRegKey = field.key === 'registrationOffice' ? 'registry_office' :
                                                          field.key === 'parcelArea' ? 'parcel_area' :
                                                          field.key === 'subParcel' ? 'sub_parcel' :
                                                          field.key === 'unitDescription' ? 'unit_description' :
                                                          field.key === 'registeredArea' ? 'registered_area' :
                                                          field.key === 'commonParts' ? 'common_parts' :
                                                          field.key === 'ownershipType' ? 'ownership_type' :
                                                          field.key
                                        if (normalizedValue !== null) {
                                          updatedExtractedData.land_registry[landRegKey] = normalizedValue
                                        } else {
                                          delete updatedExtractedData.land_registry[landRegKey]
                                        }
                                      }
                      
                                      if (['constructionYear', 'buildingFloors', 'buildingUnits', 'numberOfBuildings', 'buildingDescription'].includes(field.key)) {
                                        if (!updatedExtractedData.shared_building) {
                                          updatedExtractedData.shared_building = {}
                                        }
                                        const sharedKey = field.key === 'constructionYear' ? 'construction_year' :
                                                         field.key === 'buildingFloors' ? 'building_floors' :
                                                         field.key === 'buildingUnits' ? 'building_units' :
                                                         field.key === 'numberOfBuildings' ? 'number_of_buildings' :
                                                         field.key === 'buildingDescription' ? 'building_description' :
                                                         field.key
                                        if (normalizedValue !== null) {
                                          updatedExtractedData.shared_building[sharedKey] = normalizedValue
                                        } else {
                                          delete updatedExtractedData.shared_building[sharedKey]
                                        }
                                      }
                      
                                      if (['plotBoundaryNorth', 'plotBoundarySouth', 'plotBoundaryEast', 'plotBoundaryWest'].includes(field.key)) {
                                        if (!updatedExtractedData.gis_analysis) {
                                          updatedExtractedData.gis_analysis = {}
                                        }
                                        const gisKey = field.key === 'plotBoundaryNorth' ? 'boundary_north' :
                                                      field.key === 'plotBoundarySouth' ? 'boundary_south' :
                                                      field.key === 'plotBoundaryEast' ? 'boundary_east' :
                                                      field.key === 'plotBoundaryWest' ? 'boundary_west' :
                                                      field.key
                                        if (normalizedValue !== null) {
                                          updatedExtractedData.gis_analysis[gisKey] = normalizedValue
                                        } else {
                                          delete updatedExtractedData.gis_analysis[gisKey]
                                        }
                                      }
                      
                                      // Also save to direct data fields if they exist in the main data object
                                      if (['rooms', 'airDirections', 'propertyEssence', 'floor'].includes(field.key)) {
                                        // These are saved directly to the main data object, not extracted_data
                                        updateData({ [field.key]: normalizedValue })
                                      }
                                      
                                      // Save planning rights (Chapter 3.2)
                                      if (field.key.startsWith('planningRights.')) {
                                        const rightsKey = field.key.replace('planningRights.', '')
                                        if (!updatedExtractedData.planning_information) {
                                          updatedExtractedData.planning_information = {}
                                        }
                                        if (!updatedExtractedData.planning_information.rights) {
                                          updatedExtractedData.planning_information.rights = {}
                                        }
                                        if (normalizedValue !== null) {
                                          updatedExtractedData.planning_information.rights[rightsKey] = normalizedValue
                                        } else {
                                          delete updatedExtractedData.planning_information.rights[rightsKey]
                                        }
                                        // Also save to root level for backward compatibility
                                        if (!updatedExtractedData.planning_rights) {
                                          updatedExtractedData.planning_rights = {}
                                        }
                                        if (normalizedValue !== null) {
                                          updatedExtractedData.planning_rights[rightsKey] = normalizedValue
                                        } else {
                                          delete updatedExtractedData.planning_rights[rightsKey]
                                        }
                                      }
                                      
                                      // Save land contamination (Chapter 3.4) - save to extractedData
                                      if (field.key === 'landContamination') {
                                        updatedExtractedData.landContamination = normalizedValue === 'כן' || normalizedValue === true || normalizedValue === 'true'
                                        // Also save to root level for document template
                                        updateData({ landContamination: normalizedValue === 'כן' || normalizedValue === true || normalizedValue === 'true' } as any)
                                      }
                                      if (field.key === 'landContaminationNote') {
                                        updatedExtractedData.landContaminationNote = normalizedValue
                                        // Also save to root level for document template
                                        updateData({ landContaminationNote: normalizedValue } as any)
                                      }
                      
                                      setExtractedData(updatedExtractedData)
                                      updateData({ extractedData: updatedExtractedData })
                                      
                                      // Save to database
                                      try {
                                        // Validate that extractedData can be serialized before sending
                                        let requestBody: { data: { extractedData: any } }
                                        try {
                                          // API expects { data: { extractedData: ... } }
                                          requestBody = { data: { extractedData: updatedExtractedData } }
                                          JSON.stringify(requestBody) // Validate it can be serialized
                                        } catch (serializeError) {
                                          console.error('Failed to serialize extractedData:', serializeError)
                                          throw new Error('הנתונים לא יכולים להישמר - יש בעיה בפורמט הנתונים')
                                        }
                                        
                                        const response = await fetch(`/api/session/${sessionId}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify(requestBody)
                                        })
                                        
                                        if (!response.ok) {
                                          let errorData: any = { error: 'Unknown error' }
                                          try {
                                            errorData = await response.json()
                                          } catch {
                                            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
                                          }
                                          throw new Error(errorData.error || `HTTP ${response.status}`)
                                        }
                                        
                                        const result = await response.json()
                                        
                                        if (result.error) {
                                          throw new Error(result.error)
                                        }
                                        
                                        // Update original value after successful save
                                        setOriginalFieldValues(prev => ({
                                          ...prev,
                                          [field.key]: currentValue
                                        }))
                                      } catch (error) {
                                        console.error('Error saving parameter:', error)
                                        const errorMessage = error instanceof Error ? error.message : 'שגיאה בשמירת הנתונים'
                                        alert(`שגיאה בשמירת הנתונים: ${errorMessage}`)
                                        // Revert the change on error
                                        setFieldValues(prev => ({
                                          ...prev,
                                          [field.key]: originalValue
                                        }))
                                        // Also revert extractedData
                                        setExtractedData(currentExtracted)
                                        updateData({ extractedData: currentExtracted })
                                      } finally {
                                        setIsSavingParams(false)
                                        setSavingFieldKey(null)
                                      }
                                    }}
                                    className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                    disabled={isSaving}
                                    title="שמור שינויים"
                                  >
                                    {isSaving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Revert to original value
                                      setFieldValues(prev => ({
                                        ...prev,
                                        [field.key]: originalValue
                                      }))
                                    }}
                                    className="p-1 text-orange-600 hover:text-orange-800"
                                    title="החזר לערך המקורי"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">נשמר</span>
                              )}
            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            </div>
    </div>
  )
}

        // Helper to get nested values
        const getNestedValue = (obj: any, path: string): any => {
          const keys = path.split('.')
          let value = obj
          for (const key of keys) {
            if (value && typeof value === 'object') {
              value = value[key]
            } else {
              return undefined
            }
          }
          return value
        }
        
        // Helper to get value from multiple possible paths
        const getValueFromPaths = (paths: string[]): any => {
          for (const path of paths) {
            const value = getNestedValue(extracted, path) || getNestedValue(data, path)
            if (value !== undefined && value !== null && value !== '') {
              return value
            }
          }
          return undefined
        }
        
        // Legal Status fields (פרק 2.1 - נסח רישום מקרקעין)
        const legalStatusFields = [
          { key: 'registrationOffice', label: 'שם הלשכה', value: getValueFromPaths(['registrationOffice', 'registry_office', 'land_registry.registry_office', 'land_registry.registrationOffice']) },
          { key: 'gush', label: 'מספר גוש', value: getValueFromPaths(['gush', 'land_registry.gush', 'data.gush']) },
          { key: 'chelka', label: 'מספר חלקה', value: getValueFromPaths(['chelka', 'parcel', 'land_registry.chelka', 'land_registry.parcel']) },
          { key: 'parcelArea', label: 'שטח חלקה (מ"ר)', value: getValueFromPaths(['parcelArea', 'parcel_area', 'land_registry.parcelArea', 'land_registry.total_plot_area']) },
          { key: 'fullAddress', label: 'כתובת מלאה', value: data.street && data.buildingNumber && data.city ? `${data.street} ${data.buildingNumber}, ${data.neighborhood ? `שכונת ${data.neighborhood}, ` : ''}${data.city}` : undefined },
          { key: 'bylaws', label: 'תקנון', value: getValueFromPaths(['bylaws', 'bylaw', 'land_registry.bylaws', 'land_registry.bylaw']) },
          { key: 'subParcel', label: 'תת חלקה', value: getValueFromPaths(['subParcel', 'sub_parcel', 'subparcel', 'land_registry.subParcel', 'land_registry.sub_parcel']) },
          { key: 'unitDescription', label: 'תיאור דירה', value: getValueFromPaths(['unitDescription', 'unit_description', 'land_registry.unitDescription', 'land_registry.unit_description']) },
          { key: 'registeredArea', label: 'שטח רשום (מ"ר)', value: getValueFromPaths(['registeredArea', 'registered_area', 'land_registry.registeredArea', 'land_registry.registered_area']) },
          { key: 'commonParts', label: 'חלק ברכוש המשותף', value: getValueFromPaths(['commonParts', 'common_parts', 'land_registry.commonParts', 'land_registry.common_parts']) },
          { 
            key: 'attachments', 
            label: 'הצמדות', 
            value: (() => {
              // Check data.attachments first, then extractedData paths
              const att = (data as any).attachments || getValueFromPaths(['attachments', 'land_registry.attachments', 'land_registry.attachments_description'])
              if (typeof att === 'string') return att
              if (Array.isArray(att) && att.length > 0) {
                return att.map((a: any) => {
                  if (typeof a === 'string') return a
                  return `${a.type || a.description || ''}${a.size ? ` (${a.size} מ"ר)` : ''}${a.symbol ? `, אות ${a.symbol}` : ''}${a.color ? `, צבע ${a.color}` : ''}`
                }).join(', ')
              }
              return undefined
            })()
          },
          { key: 'ownershipType', label: 'סוג בעלות', value: getValueFromPaths(['ownershipType', 'ownership_type', 'land_registry.ownershipType', 'land_registry.ownership_type']) },
          { key: 'owners', label: 'בעלים', value: (() => {
            const owners = getValueFromPaths(['owners', 'land_registry.owners'])
            if (Array.isArray(owners) && owners.length > 0) {
              return owners.map((o: any) => {
                if (typeof o === 'string') return o
                return `${o.name || ''}${o.idType ? `, ${o.idType}` : ''}${o.idNumber ? ` ${o.idNumber}` : ''}${o.share ? `, חלק ${o.share}` : ''}`
              }).join('; ')
            }
            return owners
          })() },
          { key: 'notes', label: 'הערות', value: getValueFromPaths(['notes', 'land_registry.notes', 'land_registry.warnings']) }
        ]
        
        // Building Details fields (פרק 1.2 - תיאור החלקה והבניין)
        const buildingDetailsFields = [
          { key: 'constructionYear', label: 'שנת הקמה', value: getValueFromPaths(['constructionYear', 'construction_year', 'year_of_construction', 'buildingYear', 'building_year', 'shared_building.constructionYear']) },
          { key: 'buildingFloors', label: 'מספר קומות', value: getValueFromPaths(['buildingFloors', 'building_floors', 'floors', 'shared_building.buildingFloors', 'shared_building.floors']) },
          { key: 'buildingUnits', label: 'מספר יחידות', value: getValueFromPaths(['buildingUnits', 'building_units', 'units', 'shared_building.buildingUnits', 'shared_building.units']) },
          { key: 'numberOfBuildings', label: 'מספר בניינים', value: getValueFromPaths(['numberOfBuildings', 'number_of_buildings', 'buildings_count', 'shared_building.numberOfBuildings']) },
          { key: 'parcelShape', label: 'צורת החלקה', value: getValueFromPaths(['parcelShape', 'parcel_shape', 'land_registry.parcelShape']) },
          { key: 'parcelSurface', label: 'פני הקרקע', value: getValueFromPaths(['parcelSurface', 'parcel_surface', 'land_registry.parcelSurface']) },
          { key: 'plotBoundaryNorth', label: 'גבול צפון', value: getValueFromPaths(['plotBoundaryNorth', 'plot_boundary_north', 'boundary_north', 'gis_analysis.boundary_north']) },
          { key: 'plotBoundarySouth', label: 'גבול דרום', value: getValueFromPaths(['plotBoundarySouth', 'plot_boundary_south', 'boundary_south', 'gis_analysis.boundary_south']) },
          { key: 'plotBoundaryEast', label: 'גבול מזרח', value: getValueFromPaths(['plotBoundaryEast', 'plot_boundary_east', 'boundary_east', 'gis_analysis.boundary_east']) },
          { key: 'plotBoundaryWest', label: 'גבול מערב', value: getValueFromPaths(['plotBoundaryWest', 'plot_boundary_west', 'boundary_west', 'gis_analysis.boundary_west']) },
          { key: 'floor', label: 'קומה', value: data.floor || extracted.floor },
          { key: 'builtArea', label: 'שטח בנוי (מ\'ר)', value: getValueFromPaths(['builtArea', 'built_area', 'land_registry.builtArea']) },
          { key: 'balconyArea', label: 'שטח מרפסת (מ\'ר)', value: getValueFromPaths(['balconyArea', 'balcony_area', 'land_registry.balconyArea']) },
          { key: 'buildingDescription', label: 'תיאור הבניין', value: getValueFromPaths(['buildingDescription', 'building_description', 'shared_building.buildingDescription']) },
          { key: 'permittedUse', label: 'שימוש מותר', value: getValueFromPaths(['permittedUse', 'permitted_use', 'building_permit.permittedUse']) }
        ]
        
        // Property Characteristics fields (פרק 1.3 - תיאור נשוא השומה)
        // Note: registeredArea is in Legal Status, builtArea is in Building Details - removed duplicates
        const propertyCharacteristicsFields = [
          { key: 'rooms', label: 'מספר חדרים', value: data.rooms },
          { key: 'airDirections', label: 'כיווני אוויר', value: data.airDirections },
          { key: 'propertyEssence', label: 'מהות הנכס', value: data.propertyEssence || (data.rooms ? `דירת מגורים בת ${data.rooms} חדרים` : 'דירת מגורים') },
          { key: 'propertyCondition', label: 'מצב הנכס', value: extracted.propertyCondition },
          { key: 'finishLevel', label: 'רמת גימור', value: extracted.finishLevel || extracted.finish_standard },
          { key: 'finishDetails', label: 'פרטי גימור', value: extracted.finishDetails || extracted.finish_details }
        ]
        
        // Interior Analysis fields (פרק 1.3 - חלוקה פנימית)
        const interiorAnalysisFields = [
          { key: 'propertyLayoutDescription', label: 'תיאור תכנון הנכס / חלוקה פנימית', value: extracted.propertyLayoutDescription || extracted.internal_layout || data.internalLayout },
          { key: 'conditionAssessment', label: 'הערכת מצב כללי', value: extracted.conditionAssessment },
          { 
            key: 'roomAnalysis', 
            label: 'ניתוח חדרים', 
            value: extracted.roomAnalysis && Array.isArray(extracted.roomAnalysis) && extracted.roomAnalysis.length > 0
              ? JSON.stringify(extracted.roomAnalysis, null, 2)
              : '' 
          },
          { key: 'finishStandard', label: 'סטנדרט גמר', value: extracted.finishStandard || extracted.finish_standard }
        ]
        
        // Exterior Analysis fields (פרק 1.3 - סטנדרט גמר)
        const exteriorAnalysisFields = [
          { key: 'buildingCondition', label: 'מצב הבניין', value: extracted.buildingCondition },
          { key: 'buildingType', label: 'סוג הבניין', value: extracted.buildingType },
          { key: 'buildingFeatures', label: 'תכונות הבניין', value: extracted.buildingFeatures },
          { key: 'overallAssessment', label: 'הערכה כללית', value: extracted.overallAssessment },
          { key: 'environmentDescription', label: 'תיאור הסביבה (AI)', value: extracted.environmentDescription || extracted.environment_description || (data as any).environmentDescription }
        ]
        
        // Chapter 3 - Planning Information fields
        const planningRightsFields = [
          { key: 'planningRights.usage', label: 'ייעוד', value: getValueFromPaths(['planning_information.rights.usage', 'planning_rights.usage', 'planningRights.usage', 'planning_information.rights.yiud']) },
          { key: 'planningRights.minLotSize', label: 'שטח מגרש מינימלי (מ"ר)', value: getValueFromPaths(['planning_information.rights.minLotSize', 'planning_information.rights.min_lot_size', 'planning_rights.minLotSize', 'planning_rights.min_lot_size']) },
          { key: 'planningRights.buildPercentage', label: 'אחוזי בנייה (%)', value: getValueFromPaths(['planning_information.rights.buildPercentage', 'planning_information.rights.build_percentage', 'planning_rights.buildPercentage', 'planning_rights.build_percentage']) },
          { key: 'planningRights.maxFloors', label: 'מספר קומות מותרות', value: getValueFromPaths(['planning_information.rights.maxFloors', 'planning_information.rights.max_floors', 'planning_rights.maxFloors', 'planning_rights.max_floors']) },
          { key: 'planningRights.maxUnits', label: 'מספר יחידות דיור', value: getValueFromPaths(['planning_information.rights.maxUnits', 'planning_information.rights.max_units', 'planning_rights.maxUnits', 'planning_rights.max_units']) },
          { key: 'planningRights.buildingLines', label: 'קווי בניין', value: getValueFromPaths(['planning_information.rights.buildingLines', 'planning_information.rights.building_lines', 'planning_rights.buildingLines', 'planning_rights.building_lines']) }
        ]
        
        // Land contamination field
        return (
          <>
            {renderTable('מצב משפטי', legalStatusFields)}
            {renderTable('פרטי הבניין', buildingDetailsFields)}
            {renderTable('מאפייני הנכס', propertyCharacteristicsFields)}
            {renderTable('ניתוח פנים הנכס', interiorAnalysisFields)}
            {renderTable('ניתוח חוץ הנכס', exteriorAnalysisFields)}
            {renderTable('זכויות בנייה (פרק 3.2)', planningRightsFields)}
            
            {/* Chapter 3 - Planning Information */}
            <PlanningInformationSection 
              data={data}
              extractedData={extracted}
              updateData={updateData}
              sessionId={sessionId}
              fieldValues={fieldValues}
              setFieldValues={setFieldValues}
              originalFieldValues={originalFieldValues}
              setOriginalFieldValues={setOriginalFieldValues}
              isSavingParams={isSavingParams}
              setIsSavingParams={setIsSavingParams}
              savingFieldKey={savingFieldKey}
              setSavingFieldKey={setSavingFieldKey}
              displayExtractedData={displayExtractedData}
              setExtractedData={setExtractedData}
            />
            
          </>
        )
      })()}

    </div>
  )
}