'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface Step1InitialDataProps {
  data: any
  updateData: (updates: Partial<any>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean, missingFields?: string[]) => void
}

// Field labels for user-friendly messages
const FIELD_LABELS: Record<string, string> = {
  valuationType: 'סוג השומה',
  clientName: 'שם מזמין',
  street: 'רחוב',
  buildingNumber: 'מספר בניין',
  city: 'עיר',
  rooms: 'מספר חדרים',
  floor: 'קומה',
  shamayName: 'שם השמאי',
  shamaySerialNumber: 'מספר רישיון שמאי'
}

const DATE_FIELDS = new Set(['valuationDate', 'valuationEffectiveDate'])

const normalizeDateToISO = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return ''
  
  // Handle Date objects
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear()
    const month = String(dateInput.getMonth() + 1).padStart(2, '0')
    const day = String(dateInput.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Handle strings
  const dateStr = String(dateInput)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Handle ISO date strings with time (YYYY-MM-DDTHH:mm:ss)
  const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) {
    return isoMatch[1]
  }
  
  const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotMatch) {
    const [, day, month, year] = dotMatch
    return `${year}-${month}-${day}`
  }
  
  const slashMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month}-${day}`
  }
  
  return ''
}

const formatDateForDisplay = (dateStr: string) => {
  const iso = normalizeDateToISO(dateStr)
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

const LAST_ADDRESS_KEY = 'shamay_last_address'

export function Step1InitialData({ data, updateData, onValidationChange }: Step1InitialDataProps) {
  const isInitialLoad = useRef(true)
  const [formData, setFormData] = useState({
    // סוג שומה ומועד כתיבתה
    valuationType: data.valuationType || '',
    valuationDate: normalizeDateToISO(data.valuationDate) || '',
    
    // זהות מזמין השומה והקשר שלו לנכס
    clientName: data.clientName || '',
    clientTitle: (data as any).clientTitle || '',
    clientNote: (data as any).clientNote || '',
    clientRelation: data.clientRelation || '',
    
    // המועד הקובע לשומה
    valuationEffectiveDate: normalizeDateToISO(data.valuationEffectiveDate) || '',
    
    // זיהוי הנכס
    street: data.street || '',
    buildingNumber: data.buildingNumber || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    
    // תיאור הנכס והסביבה (basic info only - detailed analysis will be done by AI in Step 3)
    rooms: (data.rooms !== null && data.rooms !== undefined && data.rooms !== 0 && data.rooms !== '') ? data.rooms : '',
    floor: (data.floor !== null && data.floor !== undefined && data.floor !== 0 && data.floor !== '') ? data.floor : '',
    airDirections: data.airDirections || '',
    area: (data.area !== null && data.area !== undefined && data.area !== 0 && data.area !== '') ? data.area : '',
    
    // זיהום קרקע
    landContamination: (data as any).landContamination || false,
    landContaminationNote: (data as any).landContaminationNote || '',
    
    // פרטי שמאי
    shamayName: data.shamayName || '',
    shamaySerialNumber: data.shamaySerialNumber || ''
  })

  // פונקציה לפרסור כתובת מלאה לחלקים
  function parseAddress(address: string): { street: string; buildingNumber: string; neighborhood: string; city: string } {
    // נסה לפרק כתובת ישראלית טיפוסית
    // פורמטים נפוצים: "רחוב הרצל 15, תל אביב" או "הרצל 15 תל אביב"
    const parts = {
      street: '',
      buildingNumber: '',
      neighborhood: '',
      city: ''
    }
    
    // חיפוש מספר בניין
    const buildingMatch = address.match(/(\d+)/)
    if (buildingMatch) {
      parts.buildingNumber = buildingMatch[1]
      const beforeNumber = address.substring(0, buildingMatch.index).trim()
      parts.street = beforeNumber.replace(/^רחוב\s*/i, '').trim()
    } else {
      // אין מספר בניין, הכל זה רחוב
      parts.street = address.split(',')[0].trim().replace(/^רחוב\s*/i, '')
    }
    
    // חיפוש עיר (אחרי פסיק או בסוף)
    const cityMatch = address.match(/,\s*([^,]+)$/) || address.match(/\s+([א-ת]+)$/)
    if (cityMatch) {
      parts.city = cityMatch[1].trim()
    }
    
    return parts
  }

  // טען כתובת אחרונה רק אם אין נתונים מהדיבי (רק פעם אחת)
  // CRITICAL: רק אם אין נתונים מהדיבי - לא לטעון מ-localStorage אם יש נתונים מהדיבי
  useEffect(() => {
    // בדוק אם יש נתונים מהדיבי - אם יש, אל תטען מ-localStorage
    const hasDataFromDB = data.street || data.city || data.buildingNumber || data.neighborhood
    if (!hasDataFromDB && typeof window !== 'undefined') {
      const lastAddress = localStorage.getItem(LAST_ADDRESS_KEY)
      if (lastAddress) {
        // נסה לפרק את הכתובת לחלקים
        const addressParts = parseAddress(lastAddress)
        if (addressParts.street || addressParts.city) {
          // עדכן את formData ישירות
          setFormData(prev => ({
            ...prev,
            street: addressParts.street || prev.street,
            city: addressParts.city || prev.city,
            buildingNumber: addressParts.buildingNumber || prev.buildingNumber,
            neighborhood: addressParts.neighborhood || prev.neighborhood
          }))
          // עדכן גם את data דרך updateData
          updateData({
            street: addressParts.street || '',
            city: addressParts.city || '',
            buildingNumber: addressParts.buildingNumber || '',
            neighborhood: addressParts.neighborhood || ''
          } as any, { skipAutoSave: true } as any)
        }
      }
    }
  }, []) // רק פעם אחת בטעינה ראשונית

  // שמור כתובת כשמשתנה
  useEffect(() => {
    if (formData.street && formData.city && typeof window !== 'undefined') {
      const fullAddress = `${formData.street} ${formData.buildingNumber || ''} ${formData.neighborhood || ''} ${formData.city}`.trim()
      if (fullAddress) {
        localStorage.setItem(LAST_ADDRESS_KEY, fullAddress)
      }
    }
  }, [formData.street, formData.city, formData.buildingNumber, formData.neighborhood])

  // Sync local formData with incoming data prop when data changes
  // OPTIMIZATION: Only update formData when Step1-specific fields change, not all data changes
  // Use ref to track previous values and only update changed fields
  const prevDataRef = useRef<Partial<any>>({})
  
  useEffect(() => {
    // Only update if Step1-specific fields actually changed
    const step1Fields = [
      'valuationType', 'valuationDate', 'valuationEffectiveDate',
      'clientName', 'clientTitle', 'clientNote', 'clientRelation',
      'street', 'buildingNumber', 'neighborhood', 'city',
      'rooms', 'floor', 'airDirections', 'area',
      'landContamination', 'landContaminationNote',
      'shamayName', 'shamaySerialNumber'
    ]
    
    // Check if any Step1 field changed
    const hasChanges = step1Fields.some(field => {
      const currentValue = field === 'valuationDate' || field === 'valuationEffectiveDate' 
        ? normalizeDateToISO((data as any)[field])
        : (data as any)[field]
      const prevValue = prevDataRef.current[field]
      
      // Handle special cases for numbers and booleans
      if (field === 'rooms' || field === 'floor') {
        const current = currentValue !== null && currentValue !== undefined && currentValue !== 0 && currentValue !== '' ? currentValue : ''
        const prev = prevValue !== null && prevValue !== undefined && prevValue !== 0 && prevValue !== '' ? prevValue : ''
        return current !== prev
      }
      
      return currentValue !== prevValue
    })
    
    if (!hasChanges) {
      return // No changes to Step1 fields, skip update
    }
    
    // Check if data has meaningful values (not just empty strings)
    const hasData = data.valuationType || data.clientName || data.street || data.city || 
                    (data as any).clientTitle || data.valuationDate || data.valuationEffectiveDate
    
    if (hasData) {
      // Update only changed fields using functional update to avoid unnecessary re-renders
      setFormData(prev => {
        const updated = {
          // סוג שומה ומועד כתיבתה
          valuationType: data.valuationType ?? prev.valuationType ?? '',
          valuationDate: normalizeDateToISO(data.valuationDate) || prev.valuationDate || '',
          
          // זהות מזמין השומה והקשר שלו לנכס
          clientName: data.clientName || prev.clientName || '',
          clientTitle: (data as any).clientTitle ?? prev.clientTitle ?? '',
          clientNote: (data as any).clientNote ?? prev.clientNote ?? '',
          clientRelation: data.clientRelation ?? prev.clientRelation ?? '',
          
          // המועד הקובע לשומה
          valuationEffectiveDate: normalizeDateToISO(data.valuationEffectiveDate) || prev.valuationEffectiveDate || '',
          
          // זיהוי הנכס
          street: data.street || prev.street || '',
          buildingNumber: data.buildingNumber || prev.buildingNumber || '',
          neighborhood: data.neighborhood || prev.neighborhood || '',
          city: data.city || prev.city || '',
          
          // תיאור הנכס והסביבה
          rooms: (data.rooms !== null && data.rooms !== undefined && data.rooms !== 0 && data.rooms !== '') ? data.rooms : (prev.rooms || ''),
          floor: (data.floor !== null && data.floor !== undefined && data.floor !== 0 && data.floor !== '') ? data.floor : (prev.floor || ''),
          airDirections: data.airDirections || prev.airDirections || '',
          area: (data.area !== null && data.area !== undefined && data.area !== 0 && data.area !== '') ? data.area : (prev.area || ''),
          
          // זיהום קרקע
          landContamination: (data as any).landContamination ?? prev.landContamination ?? false,
          landContaminationNote: (data as any).landContaminationNote ?? prev.landContaminationNote ?? '',
          
          // פרטי שמאי
          shamayName: data.shamayName || prev.shamayName || '',
          shamaySerialNumber: data.shamaySerialNumber || prev.shamaySerialNumber || ''
        }
        
        // Update ref with current values
        step1Fields.forEach(field => {
          prevDataRef.current[field] = (data as any)[field]
        })
        
        return updated
      })
      isInitialLoad.current = false
    }
  }, [
    data.valuationType,
    data.valuationDate,
    data.valuationEffectiveDate,
    data.clientName,
    (data as any).clientTitle,
    (data as any).clientNote,
    data.clientRelation,
    data.street,
    data.buildingNumber,
    data.neighborhood,
    data.city,
    data.rooms,
    data.floor,
    data.airDirections,
    data.area,
    (data as any).landContamination,
    (data as any).landContaminationNote,
    data.shamayName,
    data.shamaySerialNumber
  ])

  const validateForm = useCallback((): { isValid: boolean; missingFields: string[] } => {
    const missing: string[] = []

    if (!formData.valuationType?.trim()) missing.push(FIELD_LABELS.valuationType)
    if (!formData.clientName?.trim()) missing.push(FIELD_LABELS.clientName)
    if (!formData.street?.trim()) missing.push(FIELD_LABELS.street)
    if (!formData.buildingNumber?.trim()) missing.push(FIELD_LABELS.buildingNumber)
    if (!formData.city?.trim()) missing.push(FIELD_LABELS.city)
    if (!(formData.rooms > 0)) missing.push(FIELD_LABELS.rooms)
    if (!(formData.floor > 0)) missing.push(FIELD_LABELS.floor)
    // שטח יבוא מהטאבו - לא נדרש כאן
    if (!formData.shamayName?.trim()) missing.push(FIELD_LABELS.shamayName)
    if (!formData.shamaySerialNumber?.trim()) missing.push(FIELD_LABELS.shamaySerialNumber)

    return { isValid: missing.length === 0, missingFields: missing }
  }, [formData])

  // CRITICAL: Use ref to prevent infinite loops - track last validation state
  const lastValidationStateRef = useRef<boolean | null>(null)
  const lastMissingFieldsRef = useRef<string[]>([])

  // Validate only when formData changes and update validation if it changed
  useEffect(() => {
    const { isValid, missingFields } = validateForm()
    // Only call onValidationChange if validation state or missing fields actually changed
    const missingFieldsChanged = JSON.stringify(lastMissingFieldsRef.current) !== JSON.stringify(missingFields)
    if (lastValidationStateRef.current !== isValid || missingFieldsChanged) {
      onValidationChange(isValid, missingFields)
      lastValidationStateRef.current = isValid
      lastMissingFieldsRef.current = missingFields
    }
  }, [formData]) // Only depend on formData, not onValidationChange or validateForm

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // Ensure all Step1 fields are included, even if empty
      const payload: Record<string, any> = {
        ...newData,
        valuationType: newData.valuationType ?? '',
        clientTitle: newData.clientTitle ?? '',
        clientNote: newData.clientNote ?? '',
        clientRelation: newData.clientRelation ?? '',
        valuationEffectiveDate: newData.valuationEffectiveDate ?? ''
      }
      
      // Critical fields that should save immediately:
      // - valuationType, valuationDate, valuationEffectiveDate (required for document generation)
      const criticalFields = ['valuationType', 'valuationDate', 'valuationEffectiveDate']
      const shouldSaveImmediately = criticalFields.includes(field)
      
      // Skip auto-save for text inputs - only save on step navigation or explicit save
      // BUT save immediately for critical fields
      updateData(payload as any, { skipAutoSave: !shouldSaveImmediately } as any)
      
      return newData
    })
  }, [updateData])

  // Helper to compute input class with visual feedback for unfilled required fields
  // Note: Classes written explicitly for Tailwind JIT to find them
  const inputBaseClass = "w-full px-4 py-3 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const inputUnfilledClass = "w-full px-4 py-3 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent border-orange-300 bg-orange-50"
  const inputFilledClass = "w-full px-4 py-3 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"

  const getInputClass = (fieldName: string, isFilled: boolean) => {
    return isFilled ? inputFilledClass : inputUnfilledClass
  }

  // Check if required fields are filled
  const isFieldFilled = {
    valuationType: !!formData.valuationType?.trim(),
    clientName: !!formData.clientName?.trim(),
    street: !!formData.street?.trim(),
    buildingNumber: !!formData.buildingNumber?.trim(),
    city: !!formData.city?.trim(),
    rooms: formData.rooms > 0,
    floor: formData.floor > 0,
    shamayName: !!formData.shamayName?.trim(),
    shamaySerialNumber: !!formData.shamaySerialNumber?.trim()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          פרטי הנכס והזמנת השומה
        </h2>
        <p className="text-gray-600 text-right">
          הזן את כל הפרטים הנדרשים לשומה מקיפה
        </p>
      </div>

      <div className="space-y-8">
        {/* סוג שומה ומועד כתיבתה */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">סוג שומה ומועד כתיבתה</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                סוג השומה *
              </label>
              <select
                name="valuationType"
                value={formData.valuationType || ''}
                onChange={(e) => updateField('valuationType', e.target.value)}
                className={getInputClass('valuationType', isFieldFilled.valuationType)}
                dir="rtl"
              >
                <option value="">בחר סוג שומה</option>
                <option value="שומת מקרקעין">שומת מקרקעין</option>
                <option value="שווי שוק">שווי שוק</option>
                <option value="שווי השקעה">שווי השקעה</option>
                <option value="שווי ביטוח">שווי ביטוח</option>
                <option value="שווי מס">שווי מס</option>
                <option value="שווי הפקעה">שווי הפקעה</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מועד כתיבת השומה *
              </label>
              <input
                type="date"
                name="valuationDate"
                autoComplete="off"
                value={formData.valuationDate || ''}
                onChange={(e) => updateField('valuationDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* זהות מזמין השומה והקשר שלו לנכס */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">זהות מזמין השומה והקשר שלו לנכס</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                תואר (אופציונלי)
              </label>
              <input
                type="text"
                name="clientTitle"
                value={(formData as any).clientTitle || ''}
                onChange={(e) => updateField('clientTitle', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="למשל: עו&quot;ד, כונס נכסים"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שם מלא *
              </label>
              <input
                type="text"
                name="clientName"
                autoComplete="name"
                value={formData.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
                className={getInputClass('clientName', isFieldFilled.clientName)}
                placeholder="הזן שם מלא"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                הערה נוספת (אופציונלי)
              </label>
              <input
                type="text"
                name="clientNote"
                value={(formData as any).clientNote || ''}
                onChange={(e) => updateField('clientNote', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="למשל: א.נ."
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                הקשר לנכס
              </label>
              <select
                name="clientRelation"
                value={formData.clientRelation || ''}
                onChange={(e) => updateField('clientRelation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              >
                <option value="">בחר הקשר לנכס</option>
                <option value="בעלים">בעלים</option>
                <option value="לקוח">לקוח</option>
                <option value="רוכש פוטנציאלי">רוכש פוטנציאלי</option>
                <option value="מוכר">מוכר</option>
                <option value="בנק">בנק</option>
                <option value="בית משפט">בית משפט</option>
                <option value="אחר">אחר</option>
              </select>
            </div>
          </div>
        </div>


        {/* המועד הקובע לשומה */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">המועד הקובע לשומה</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              המועד הקובע לשומה *
            </label>
            <input
              type="date"
              name="valuationEffectiveDate"
              autoComplete="off"
              value={formData.valuationEffectiveDate || ''}
              onChange={(e) => updateField('valuationEffectiveDate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* זיהוי הנכס */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">זיהוי הנכס</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                רחוב *
              </label>
              <input
                type="text"
                name="street"
                autoComplete="address-line1"
                value={formData.street}
                onChange={(e) => updateField('street', e.target.value)}
                className={getInputClass('street', isFieldFilled.street)}
                placeholder="הזן שם רחוב"
                dir="rtl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר בניין *
              </label>
              <input
                type="text"
                name="buildingNumber"
                autoComplete="address-line2"
                value={formData.buildingNumber}
                onChange={(e) => updateField('buildingNumber', e.target.value)}
                className={getInputClass('buildingNumber', isFieldFilled.buildingNumber)}
                placeholder="הזן מספר בניין"
                dir="rtl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שכונה (אופציונלי)
              </label>
              <input
                type="text"
                name="neighborhood"
                autoComplete="address-level2"
                value={formData.neighborhood}
                onChange={(e) => updateField('neighborhood', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם שכונה (אופציונלי)"
                dir="rtl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                עיר *
              </label>
              <input
                type="text"
                name="city"
                autoComplete="address-level1"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={getInputClass('city', isFieldFilled.city)}
                placeholder="הזן שם עיר"
                dir="rtl"
              />
            </div>

          </div>
          
          {/* גוש, חלקה ותת-חלקה - מוצגים אם נשלפו מטאבו */}
          {(data.gush || data.parcel || data.subParcel) && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-3 text-right">
                📋 פרטי רישום מקרקעין (נשלף מטאבו)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.gush && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1 text-right">
                      גוש
                    </label>
                    <div className="px-3 py-2 bg-white border border-blue-200 rounded text-right text-sm text-gray-700">
                      {data.gush}
                    </div>
                  </div>
                )}
                {data.parcel && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1 text-right">
                      חלקה
                    </label>
                    <div className="px-3 py-2 bg-white border border-blue-200 rounded text-right text-sm text-gray-700">
                      {data.parcel}
                    </div>
                  </div>
                )}
                {data.subParcel && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1 text-right">
                      תת-חלקה
                    </label>
                    <div className="px-3 py-2 bg-white border border-blue-200 rounded text-right text-sm text-gray-700">
                      {data.subParcel}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* תיאור הנכס והסביבה */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">תיאור הנכס והסביבה</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר חדרים *
              </label>
              <input
                type="number"
                name="rooms"
                autoComplete="off"
                min="0"
                max="99"
                value={formData.rooms === '' || formData.rooms === 0 ? '' : formData.rooms}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value)
                  updateField('rooms', val)
                }}
                className={getInputClass('rooms', isFieldFilled.rooms)}
                placeholder="הזן מספר חדרים"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                קומה *
              </label>
              <input
                type="number"
                name="floor"
                autoComplete="off"
                min="0"
                max="99"
                value={formData.floor === '' || formData.floor === 0 ? '' : formData.floor}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value)
                  updateField('floor', val)
                }}
                className={getInputClass('floor', isFieldFilled.floor)}
                placeholder="הזן מספר קומה"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                כיווני אוויר (אופציונלי)
              </label>
              <input
                type="number"
                name="airDirections"
                autoComplete="off"
                min="1"
                max="4"
                value={(formData as any).airDirections === '' || (formData as any).airDirections === 0 ? '' : (formData as any).airDirections}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value)
                  updateField('airDirections', val)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="למשל: 3"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">מספר כיווני האוויר (1-4)</p>
            </div>
            
          </div>
          
          {/* הודעה על שטח אם נשלף מטאבו */}
          {/* {data.area && data.area > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 text-right">
                📋 שטח הנכס: <strong>{data.area} מ"ר</strong> (נשלף מטאבו)
              </p>
            </div>
          )} */}
        </div>

        {/* זיהום קרקע */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">זיהום קרקע</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="landContamination"
                checked={(formData as any).landContamination || false}
                onChange={(e) => {
                  updateField('landContamination', e.target.checked)
                  if (!e.target.checked) {
                    updateField('landContaminationNote', '')
                  }
                }}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="landContamination" className="text-sm font-medium text-gray-700 text-right flex-1">
                הובאה לידיעתך סיבה לחשד לקיומם של חומרים מסוכנים או מזהמים?
              </label>
            </div>
            
            {(formData as any).landContamination && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  פרט את החשד או המידע שהובא לידיעתך *
                </label>
                <textarea
                  name="landContaminationNote"
                  value={(formData as any).landContaminationNote || ''}
                  onChange={(e) => updateField('landContaminationNote', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הזן פרטים על החשד או המידע שהובא לידיעתך"
                  dir="rtl"
                  required={(formData as any).landContamination}
                />
              </div>
            )}
          </div>
        </div>

        {/* פרטי שמאי */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי שמאי</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שם השמאי *
              </label>
              <input
                type="text"
                name="shamayName"
                autoComplete="name"
                value={formData.shamayName}
                onChange={(e) => updateField('shamayName', e.target.value)}
                className={getInputClass('shamayName', isFieldFilled.shamayName)}
                placeholder="הזן שם מלא של השמאי"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר רישיון שמאי *
              </label>
              <input
                type="text"
                name="shamaySerialNumber"
                autoComplete="off"
                value={formData.shamaySerialNumber}
                onChange={(e) => updateField('shamaySerialNumber', e.target.value)}
                className={getInputClass('shamaySerialNumber', isFieldFilled.shamaySerialNumber)}
                placeholder="הזן מספר רישיון"
                dir="rtl"
              />
            </div>

          </div>
        </div>

        {/* Note about signature */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>חתימת שמאי:</strong> ניתן להעלות חתימת שמאי קבועה בהגדרות הארגון. החתימה תופיע בכל הדוחות שיוצאו.
          </p>
        </div>
      </div>
    </div>
  )
}